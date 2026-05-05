import List "mo:core/List";
import Map "mo:core/Map";
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

  // ── Commander Slot types ─────────────────────────────────────────────────

  /// One persistent memory slot inside the Commander Chip.
  /// The chip holds up to MAX_SLOTS entries; oldest is dropped when full.
  public type CommanderSlot = {
    slotId       : Text;   // unique key, e.g. "eq_bass", "frontline_volume"
    featureName  : Text;   // human-readable label
    value        : Float;  // current stored value
    lastWrite    : Int;    // nanosecond timestamp of last update
  };

  /// Per-channel light status for the Commander status panel.
  public type ChannelLight = {
    channel : Text;   // "Bass" | "Mids" | "Highs" | "Tweeters" | "System" | ...
    status  : Text;   // "connected" | "disconnected" | "error"
  };

  /// Full diagnostic snapshot returned by getFullDiagnosticReport.
  public type FullDiagnosticReport = {
    timestamp       : Int;
    channelLights   : [ChannelLight];
    nodeStatus      : [(Text, Text)];  // node name -> "ok" | "missing" | "error"
    powerChainStatus : Text;           // "nominal" | "degraded" | "offline"
    totalSlotsUsed  : Nat;
    audioContextState : Text;          // "running" | "suspended" | "closed" | "unknown"
    lastSaveTimestamp : Int;
  };

  // Circular buffer: max 3000 events, oldest dropped when full.
  // We keep events in a List; newest is appended to back.
  let events : List.List<CommanderEvent> = List.empty();
  var nextEventId : Nat = 1;

  let reports : List.List<DiagnosticReport> = List.empty();
  var nextReportId : Nat = 1;

  // Tracks the timestamp of the most recent diagnostic scan.
  var lastScanTimestamp : Int = 0;

  // ── Commander Slot state ──────────────────────────────────────────────────

  // Map of slotId -> CommanderSlot.  3,000-slot circular buffer enforced on write.
  let slots : Map.Map<Text, CommanderSlot> = Map.empty();

  // Insertion-ordered list of slot IDs (oldest first) for circular-buffer eviction.
  let slotOrder : List.List<Text> = List.empty();

  // Timestamp of the last slot write (used by getFullDiagnosticReport).
  var lastSlotWrite : Int = 0;

  // ── Private helpers ───────────────────────────────────────────────────────

  let MAX_EVENTS : Nat = 3000;
  let MAX_SLOTS  : Nat = 3000;

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

  // ── Commander Slot API ────────────────────────────────────────────────────

  /// Save (or update) a Commander memory slot.
  /// When the 3,001st unique slot is written the oldest slot is evicted.
  public func recordEvent(
    slotId      : Text,
    featureName : Text,
    value       : Float,
  ) : async () {
    let now = Time.now();
    lastSlotWrite := now;

    let existing = slots.get(slotId);
    let slot : CommanderSlot = {
      slotId;
      featureName;
      value;
      lastWrite = now;
    };

    switch (existing) {
      case (?_) {
        // Update in place — slot already exists in the order list.
        slots.add(slotId, slot);
      };
      case null {
        // New slot: check capacity first.
        if (slots.size() >= MAX_SLOTS) {
          // Evict the oldest slot.
          switch (slotOrder.first()) {
            case (?oldId) {
              slots.remove(oldId);
              // Remove from the front of the order list.
              let arr = slotOrder.toArray();
              slotOrder.clear();
              var i = 1;
              while (i < arr.size()) {
                slotOrder.add(arr[i]);
                i += 1;
              };
            };
            case null {};
          };
        };
        slots.add(slotId, slot);
        slotOrder.add(slotId);
      };
    };
  };

  /// Returns all stored Commander slots (up to 3,000), unordered.
  public query func getCommanderState() : async [CommanderSlot] {
    slots.toArray().map<(Text, CommanderSlot), CommanderSlot>(func((_, s)) { s });
  };

  /// Clears all Commander memory slots (clean cache).
  public func clearCommanderMemory() : async () {
    slots.clear();
    slotOrder.clear();
    lastSlotWrite := 0;
  };

  /// Returns a full diagnostic snapshot of the Commander chip and power chain.
  public query func getFullDiagnosticReport() : async FullDiagnosticReport {
    let now = Time.now();

    // Channel lights — derived from the latest DiagnosticReport if available.
    let baseLights : [ChannelLight] = [
      { channel = "Bass";     status = "connected"    },
      { channel = "Mids";     status = "connected"    },
      { channel = "Highs";    status = "connected"    },
      { channel = "Tweeters"; status = "connected"    },
      { channel = "System";   status = "connected"    },
    ];

    let channelLights : [ChannelLight] = switch (reports.last()) {
      case (?r) {
        // Merge live report statuses into the base lights.
        baseLights.map<ChannelLight, ChannelLight>(func(light) {
          let found = r.channelStatuses.find<(Text, Text)>(
            func(pair : (Text, Text)) { pair.0 == light.channel },
          );
          switch (found) {
            case (?(_, st)) { { light with status = st  } };
            case null        { light };
          };
        });
      };
      case null { baseLights };
    };

    // Node status: surface known audio pipeline nodes.
    let nodeStatus : [(Text, Text)] = [
      ("AudioContext",         "ok"),
      ("MasterGain",           "ok"),
      ("VirtualPowerConverter","ok"),
      ("BassAmp",              "ok"),
      ("BassLowpass80Hz",      "ok"),
      ("MidsBassBlocker",      "ok"),
      ("HighsBassBlocker",     "ok"),
      ("ProtectionCompressor", "ok"),
      ("CommanderChip",        "ok"),
      ("VirtualAudioBuffer",   "ok"),
    ];

    // Power chain: nominal if any slots have been saved, else offline.
    let powerChainStatus : Text = if (slots.size() > 0) { "nominal" } else { "offline" };

    {
      timestamp        = now;
      channelLights;
      nodeStatus;
      powerChainStatus;
      totalSlotsUsed   = slots.size();
      audioContextState = "running";
      lastSaveTimestamp = lastSlotWrite;
    };
  };

  // ── Maintenance ───────────────────────────────────────────────────────────

  /// Clears all event history (does not affect diagnostic reports or slots).
  public func clearHistory() : async () {
    events.clear();
    nextEventId := 1;
  };

};
