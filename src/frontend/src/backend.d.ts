import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface ChannelLight {
    status: string;
    channel: string;
}
export interface FullDiagnosticReport {
    nodeStatus: Array<[string, string]>;
    powerChainStatus: string;
    totalSlotsUsed: bigint;
    timestamp: bigint;
    audioContextState: string;
    lastSaveTimestamp: bigint;
    channelLights: Array<ChannelLight>;
}
export interface DiagnosticReport {
    id: bigint;
    problemsFound: Array<string>;
    fixesApplied: Array<string>;
    timestamp: bigint;
    overallHealth: string;
    channelStatuses: Array<[string, string]>;
}
export interface CommanderEvent {
    id: bigint;
    action: string;
    feature: string;
    value: string;
    signalState: string;
    previousValue: string;
    timestamp: bigint;
    channel: string;
    autoFixed: boolean;
    eventType: string;
}
export interface CommanderSlot {
    lastWrite: bigint;
    value: number;
    slotId: string;
    featureName: string;
}
export interface backendInterface {
    /**
     * / Clears all Commander memory slots (clean cache).
     */
    clearCommanderMemory(): Promise<void>;
    /**
     * / Clears all event history (does not affect diagnostic reports or slots).
     */
    clearHistory(): Promise<void>;
    /**
     * / Returns all unresolved error events (eventType == "error" and not autoFixed).
     */
    getActiveProblems(): Promise<Array<CommanderEvent>>;
    /**
     * / Returns all stored Commander slots (up to 3,000), unordered.
     */
    getCommanderState(): Promise<Array<CommanderSlot>>;
    /**
     * / Returns the most recent diagnostic reports, newest first.
     */
    getDiagnosticReports(limit: bigint): Promise<Array<DiagnosticReport>>;
    /**
     * / Returns a full diagnostic snapshot of the Commander chip and power chain.
     */
    getFullDiagnosticReport(): Promise<FullDiagnosticReport>;
    /**
     * / Returns paginated history, newest first.
     * / offset=0 means start from the most recent event.
     */
    getHistory(limit: bigint, offset: bigint): Promise<Array<CommanderEvent>>;
    /**
     * / Returns the most recent events for a specific channel, newest first.
     */
    getHistoryByChannel(channel: string, limit: bigint): Promise<Array<CommanderEvent>>;
    /**
     * / Returns the most recent events for a specific feature, newest first.
     */
    getHistoryByFeature(feature: string, limit: bigint): Promise<Array<CommanderEvent>>;
    /**
     * / Returns the single most recent diagnostic report.
     */
    getLatestDiagnosticReport(): Promise<DiagnosticReport | null>;
    getStats(): Promise<{
        channelHealth: Array<[string, string]>;
        totalEvents: bigint;
        lastScanTimestamp: bigint;
        activeProblems: bigint;
    }>;
    /**
     * / Logs a full diagnostic report and returns its ID.
     */
    logDiagnosticReport(channelStatuses: Array<[string, string]>, problemsFound: Array<string>, fixesApplied: Array<string>, overallHealth: string): Promise<bigint>;
    /**
     * / Log a Commander event. Returns the new event's ID.
     * / When the 1001st event is added the oldest is automatically dropped.
     */
    logEvent(eventType: string, feature: string, channel: string, action: string, value: string, previousValue: string, signalState: string, autoFixed: boolean): Promise<bigint>;
    /**
     * / Save (or update) a Commander memory slot.
     * / When the 3,001st unique slot is written the oldest slot is evicted.
     */
    recordEvent(slotId: string, featureName: string, value: number): Promise<void>;
}
