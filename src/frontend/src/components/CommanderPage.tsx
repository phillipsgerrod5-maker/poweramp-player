import { CheckCircle, Cpu, XCircle, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { MemoryCommanderChip } from "../audio/MemoryCommanderChip";
import { ThunderBattery } from "../audio/thunderBattery";

export function CommanderPage() {
  const commander = MemoryCommanderChip.getInstance();
  const battery = ThunderBattery.getInstance();

  const [lights, setLights] = useState(commander.getAllLights());
  const [activity, setActivity] = useState(commander.getRecentActivity());
  const [slotEntries, setSlotEntries] = useState(commander.getSlotEntries());
  const [systemPower, setSystemPower] = useState(commander.getSystemPower());
  const [usedSlots, setUsedSlots] = useState(commander.getUsedSlots());

  // Refresh every 500ms
  useEffect(() => {
    const id = setInterval(() => {
      setLights(commander.getAllLights());
      setActivity(commander.getRecentActivity());
      setSlotEntries(commander.getSlotEntries());
      setSystemPower(commander.getSystemPower());
      setUsedSlots(commander.getUsedSlots());
    }, 500);
    return () => clearInterval(id);
  }, [commander]);

  const handleSystemPower = (v: number) => {
    commander.setSystemPower(v);
    setSystemPower(v);
  };

  const lightConfig = [
    { key: "audioCtx" as const, label: "AUDIO CTX" },
    { key: "powerChain" as const, label: "POWER CHAIN" },
    { key: "commander" as const, label: "COMMANDER" },
    { key: "vpc120kw" as const, label: "120kW VPC" },
    { key: "bassCh1" as const, label: "BASS CH 1" },
    { key: "bassCh2" as const, label: "BASS CH 2" },
    { key: "mids" as const, label: "MIDS" },
    { key: "highs" as const, label: "HIGHS" },
  ];

  const channels = battery.getAllChannels();

  return (
    <div className="commander-page" data-ocid="commander.page">
      {/* Title */}
      <div className="commander-title">
        <Cpu size={28} className="commander-icon" />
        <div>
          <h1 className="commander-heading">MEMORY COMMANDER CHIP</h1>
          <p className="commander-sub">
            Supreme Authority — 3,000 Slot Virtual Battery
          </p>
        </div>
      </div>

      {/* STATUS LIGHTS — own section */}
      <section
        className="commander-section"
        data-ocid="commander.lights_section"
      >
        <h2 className="section-title">STATUS LIGHTS</h2>
        <div className="lights-grid">
          {lightConfig.map(({ key, label }) => (
            <div
              key={key}
              className={`commander-light ${lights[key] ? "light-active" : "light-inactive"}`}
              data-ocid={`commander.light.${key}`}
            >
              {lights[key] ? (
                <CheckCircle size={18} className="light-icon-on" />
              ) : (
                <XCircle size={18} className="light-icon-off" />
              )}
              <span>{label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* SYSTEM POWER SLIDER — own section, NOT covering lights */}
      <section
        className="commander-section"
        data-ocid="commander.power_section"
      >
        <h2 className="section-title">SYSTEM POWER SLIDER</h2>
        <p className="section-sub">
          Virtual power delivered to the Power Chain (1–20)
        </p>
        <div className="power-slider-row">
          <span className="power-label">1</span>
          <input
            type="range"
            min={1}
            max={20}
            step={1}
            value={systemPower}
            className="commander-slider"
            onChange={(e) => handleSystemPower(Number(e.target.value))}
            data-ocid="commander.system_power.input"
          />
          <span className="power-label">20</span>
          <span className="power-current">{systemPower}</span>
        </div>
      </section>

      {/* MEMORY SLOTS */}
      <section
        className="commander-section"
        data-ocid="commander.memory_section"
      >
        <h2 className="section-title">MEMORY SLOTS</h2>
        <div className="slots-header">
          <span className="slots-capacity">3,000 CAPACITY</span>
          <span className="slots-used">{usedSlots} USED</span>
          <button
            type="button"
            className="clear-btn"
            onClick={() => {
              commander.clearAll();
              setSlotEntries([]);
            }}
            data-ocid="commander.clear_memory.button"
          >
            CLEAR
          </button>
        </div>
        <div className="slots-list" data-ocid="commander.slots_list">
          {slotEntries.length === 0 && (
            <div
              className="slots-empty"
              data-ocid="commander.slots_empty_state"
            >
              No saved values yet — start the player and adjust controls
            </div>
          )}
          {slotEntries.map((entry, i) => (
            <div
              key={entry.key}
              className="slot-entry"
              data-ocid={`commander.slot.${i + 1}`}
            >
              <span className="slot-key">{entry.key}</span>
              <span className="slot-value">
                {typeof entry.value === "number"
                  ? entry.value.toFixed(3)
                  : entry.value}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* THUNDER BATTERY */}
      <section
        className="commander-section"
        data-ocid="commander.battery_section"
      >
        <h2 className="section-title">
          <Zap size={16} style={{ display: "inline", marginRight: 6 }} />
          THUNDER BATTERY
        </h2>
        <div className="battery-stats">
          <div className="battery-main">
            <span className="battery-watts">
              {battery.getOutputWatts().toLocaleString()}W
            </span>
            <span
              className={`battery-stable ${battery.isStable() ? "stable-on" : "stable-off"}`}
            >
              {battery.isStable() ? "\u2714 STABLE" : "\u26a0 UNSTABLE"}
            </span>
          </div>
          <div className="battery-channels">
            <div className="ch-entry">
              <span>Bass Amp</span>
              <span>{channels.bass.toLocaleString()}W</span>
            </div>
            <div className="ch-entry">
              <span>Mids Layer</span>
              <span>{channels.mids.toLocaleString()}W</span>
            </div>
            <div className="ch-entry">
              <span>Highs Layer</span>
              <span>{channels.highs.toLocaleString()}W</span>
            </div>
            <div className="ch-entry">
              <span>Commander Chip</span>
              <span>{channels.commander.toLocaleString()}W</span>
            </div>
            <div className="ch-entry reserve">
              <span>Reserve</span>
              <span>{channels.reserve.toLocaleString()}W</span>
            </div>
          </div>
        </div>
      </section>

      {/* ACTIVITY LOG */}
      <section
        className="commander-section"
        data-ocid="commander.activity_section"
      >
        <h2 className="section-title">ACTIVITY LOG</h2>
        <div className="activity-log" data-ocid="commander.activity_log">
          {activity.length === 0 && (
            <div className="activity-empty">No activity yet</div>
          )}
          {activity.map((entry) => (
            <div
              key={entry}
              className="activity-entry"
              data-ocid="commander.activity"
            >
              {entry}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
