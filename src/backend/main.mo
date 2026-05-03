import List "mo:core/List";
import Time "mo:core/Time";
import Array "mo:core/Array";

actor {

  // ── Migration: accept old stable vars from previous version ─────────────────────────────────
  // Previous build had stable var diagnosticLog : List.List<...> and stable var nextId : Nat.
  // Re-declare with matching List type so M0170 is satisfied, then ignore on upgrade.
  public type _DiagnosticEntry = {
    id : Nat;
    timestamp : Int;
    channel : Text;
    fix : Text;
    problem : Text;
    resolved : Bool;
  };
  stable var diagnosticLog : List.List<_DiagnosticEntry> = List.empty<_DiagnosticEntry>();
  stable var nextId : Nat = 0;

  // ── Types ─────────────────────────────────────────────────────────────────

  public type CommanderEvent = {
    id            : Nat;
    timestamp     : Int;
    eventType     : Text;  // "slider_change" | "toggle" | "song_change" | "diagnostic" | "error" | "fix" | "channel_status"
    feature       : Text;  // e.g. "EQ Bass", "Epicenter", "Cheater Beater"
    channel       : Text;  // "Bass" | "Mids" | "Highs" | "Tweeters" | "System" | "All"
    action        : Text;  // description of what happened
    value         : Text;  // new value as string, e.g. "0.75", "ON", "OFF"
    previousValue : Text;  // old value
    signalState   : Text;  // "clean" | "distorted" | "clipped" | "silent" | "nominal"
    autoFixed     : Bool;
  };

  public type DiagnosticReport = {
    id             : Nat;
    timestamp      : Int;
    channelStatuses : [(Text, Text)];  // channel name -> "active" | "standby" | "error"
    problemsFound  : [Text];
    fixesApplied   : [Text];
    overallHealth  : Text;  // "green" | "yellow" | "red"
  };

  // ── State ─────────────────────────────────────────────────────────────────

  // Circular buffer: max 1000 events, oldest dropped when full.
  // We keep events in a List; newest is appended to back.
  let events : List.List<CommanderEvent> = List.empty();
  var nextEventId : Nat = 1;

  let reports : List.List<DiagnosticReport> = List.empty();
  var nextReportId : Nat = 1;

  // Tracks the timestamp of the most recent diagnostic scan.
  var lastScanTimestamp : Int = 0;

  // ── Private helpers ───────────────────────────────────────────────────────

  let MAX_EVENTS : Nat = 1000;

  // Build the snapshot array for queries (newest first).
  func eventsNewestFirst() : [CommanderEvent] {
    events.toArray().reverse();
  };

  // ── Event logging ─────────────────────────────────────────────────────────

  /// Log a Commander event. Returns the new event's ID.
  /// When the 1001st event is added the oldest is automatically dropped.
  public func logEvent(
    eventType     : Text,
    feature       : Text,
    channel       : Text,
    action        : Text,
    value         : Text,
    previousValue : Text,
    signalState   : Text,
    autoFixed     : Bool,
  ) : async Nat {
    let id = nextEventId;
    nextEventId += 1;

    let ev : CommanderEvent = {
      id;
      timestamp     = Time.now();
      eventType;
      feature;
      channel;
      action;
      value;
      previousValue;
      signalState;
      autoFixed;
    };

    events.add(ev);

    // Drop oldest if we exceed 1000.
    if (events.size() > MAX_EVENTS) {
      // The list is ordered oldest→newest (add appends to back).
      // removeLast removes from the back (newest), which is wrong.
      // We need to drop from the front. Since List has no popFront,
      // we rebuild from index 1 onward.
      let arr = events.toArray();
      events.clear();
      var i = 1;
      while (i < arr.size()) {
        events.add(arr[i]);
        i += 1;
      };
    };

    id;
  };

  // ── History queries ───────────────────────────────────────────────────────

  /// Returns paginated history, newest first.
  /// offset=0 means start from the most recent event.
  public query func getHistory(limit : Nat, offset : Nat) : async [CommanderEvent] {
    let all = eventsNewestFirst();
    let total = all.size();
    if (offset >= total) { return [] };
    let start = offset;
    let stop = if (start + limit > total) { total } else { start + limit };
    all.sliceToArray(start, stop);
  };

  /// Returns the most recent events for a specific channel, newest first.
  public query func getHistoryByChannel(channel : Text, limit : Nat) : async [CommanderEvent] {
    let all = eventsNewestFirst();
    let matched = all.filter(func(e : CommanderEvent) : Bool { e.channel == channel });
    if (limit == 0 or matched.size() <= limit) { matched } else { matched.sliceToArray(0, limit) };
  };

  /// Returns the most recent events for a specific feature, newest first.
  public query func getHistoryByFeature(feature : Text, limit : Nat) : async [CommanderEvent] {
    let all = eventsNewestFirst();
    let matched = all.filter(func(e : CommanderEvent) : Bool { e.feature == feature });
    if (limit == 0 or matched.size() <= limit) { matched } else { matched.sliceToArray(0, limit) };
  };

  /// Returns all unresolved error events (eventType == "error" and not autoFixed).
  public query func getActiveProblems() : async [CommanderEvent] {
    eventsNewestFirst().filter(
      func(e : CommanderEvent) : Bool {
        e.eventType == "error" and not e.autoFixed
      }
    );
  };

  // ── Diagnostic reports ────────────────────────────────────────────────────

  /// Logs a full diagnostic report and returns its ID.
  public func logDiagnosticReport(
    channelStatuses : [(Text, Text)],
    problemsFound   : [Text],
    fixesApplied    : [Text],
    overallHealth   : Text,
  ) : async Nat {
    let id = nextReportId;
    nextReportId += 1;
    lastScanTimestamp := Time.now();

    let report : DiagnosticReport = {
      id;
      timestamp      = lastScanTimestamp;
      channelStatuses;
      problemsFound;
      fixesApplied;
      overallHealth;
    };

    reports.add(report);
    id;
  };

  /// Returns the most recent diagnostic reports, newest first.
  public query func getDiagnosticReports(limit : Nat) : async [DiagnosticReport] {
    let arr = reports.toArray().reverse();
    if (limit == 0 or arr.size() <= limit) { arr } else { arr.sliceToArray(0, limit) };
  };

  /// Returns the single most recent diagnostic report.
  public query func getLatestDiagnosticReport() : async ?DiagnosticReport {
    reports.last();
  };

  // ── Stats ─────────────────────────────────────────────────────────────────

  public query func getStats() : async {
    totalEvents     : Nat;
    activeProblems  : Nat;
    lastScanTimestamp : Int;
    channelHealth   : [(Text, Text)];
  } {
    let totalEvents = events.size();
    let activeProblems = events.filter(
      func(e : CommanderEvent) : Bool { e.eventType == "error" and not e.autoFixed }
    ).size();

    // Derive channel health from the latest diagnostic report if available.
    let channelHealth : [(Text, Text)] = switch (reports.last()) {
      case (?r) { r.channelStatuses };
      case null { [] };
    };

    { totalEvents; activeProblems; lastScanTimestamp; channelHealth };
  };

  // ── Maintenance ───────────────────────────────────────────────────────────

  /// Clears all event history (does not affect diagnostic reports).
  public func clearHistory() : async () {
    events.clear();
    nextEventId := 1;
  };

};
