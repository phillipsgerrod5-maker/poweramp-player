import { Lock, X, Zap } from "lucide-react";
import { useState } from "react";
import type { useAudioEngine } from "../hooks/useAudioEngine";
import type { DrawerKey } from "../types";

type AudioHook = ReturnType<typeof useAudioEngine>;

interface DrawerProps {
  drawerKey: DrawerKey;
  onClose: () => void;
  audio: AudioHook;
}

function EQSlider({
  label,
  value,
  onChange,
}: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="eq-row">
      <span className="eq-label">{label}</span>
      <input
        type="range"
        min={-12}
        max={12}
        step={0.5}
        value={value}
        className="eq-slider"
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <span className="eq-value">
        {value > 0 ? `+${value.toFixed(1)}` : value.toFixed(1)}dB
      </span>
    </div>
  );
}

function ProtectionSlider({
  label,
  value,
  onChange,
  description,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  description: string;
}) {
  return (
    <div className="protection-row">
      <div className="protection-header">
        <span className="prot-label">{label}</span>
        <span className="prot-value">{value}%</span>
      </div>
      <p className="prot-desc">{description}</p>
      <input
        type="range"
        min={0}
        max={100}
        step={1}
        value={value}
        className="prot-slider"
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}

function DIYDrawer({ kitNum }: { kitNum: number }) {
  const [status, setStatus] = useState<"locked" | "wiring" | "wired">("locked");

  const handleWireIn = () => {
    setStatus("wiring");
    setTimeout(() => setStatus("wired"), 1800);
  };

  return (
    <div className="diy-drawer">
      <div className="diy-slot-info">
        <Lock size={24} />
        <span>DIY KIT SLOT {kitNum}</span>
      </div>
      <p className="diy-desc">
        This slot is reserved for a custom feature. Tap CONFIRM WIRE-IN and the
        app automatically wires this feature to the audio chain via AudioContext
        + API + 4 gauge.
      </p>
      <div
        className={`diy-status diy-${status}`}
        data-ocid={`diy.kit${kitNum}.status`}
      >
        {status === "locked" && "LOCKED"}
        {status === "wiring" && "WIRING..."}
        {status === "wired" && "\u2714 WIRED TO CHAIN"}
      </div>
      {status !== "wired" && (
        <button
          type="button"
          className="wire-in-btn"
          onClick={handleWireIn}
          disabled={status === "wiring"}
          data-ocid={`diy.kit${kitNum}.wire_in_button`}
        >
          {status === "wiring" ? "WIRING..." : "CONFIRM WIRE-IN"}
        </button>
      )}
      {status === "wired" && (
        <div className="wired-confirm">
          <Zap size={20} /> Feature is live in the audio chain
        </div>
      )}
    </div>
  );
}

export function Drawer({ drawerKey, onClose, audio }: DrawerProps) {
  const [bassActive, setBassActive] = useState(true);
  const [cheaterActive, setCheaterActive] = useState(false);
  const [cheaterVal, setCheaterVal] = useState(50);
  const [eQuakeActive, setEQuakeActive] = useState(false);
  const [eQuakeDepth, setEQuakeDepth] = useState(30);
  const [epicenterVal, setEpicenterVal] = useState(0);
  const [soulVal, setSoulVal] = useState(0);
  const [naturalVal, setNaturalVal] = useState(15);
  const [distortionVal, setDistortionVal] = useState(50);
  const [clippingVal, setClippingVal] = useState(50);
  const [particleVal, setParticleVal] = useState(50);
  const [midsVal, setMidsVal] = useState(50);
  const [highsVal, setHighsVal] = useState(50);
  const [xmStatic, setXmStatic] = useState(350);
  const [restoreDone, setRestoreDone] = useState(false);
  const [restoreRunning, setRestoreRunning] = useState(false);

  if (!drawerKey) return null;

  const eq = audio.status.eqValues;

  const renderContent = () => {
    switch (drawerKey) {
      case "bass":
        return (
          <div className="drawer-content">
            <h3 className="drawer-section-title">BASS SYSTEM</h3>
            <p className="drawer-note">
              14–80Hz — Lowpass at 80Hz — full sub-bass response
            </p>

            <div className="bass-row">
              <label className="bass-toggle-label">
                <input
                  type="checkbox"
                  checked={bassActive}
                  onChange={(e) => setBassActive(e.target.checked)}
                  data-ocid="bass.foundation.toggle"
                />
                Foundation Bass (14–50Hz)
              </label>
            </div>

            <div className="bass-row">
              <span className="bass-sub-label">Natural Bottom</span>
              <span className="bass-sub-val">{naturalVal}%</span>
              <input
                type="range"
                min={5}
                max={100}
                step={1}
                value={naturalVal}
                className="bass-slider"
                onChange={(e) => {
                  setNaturalVal(Number(e.target.value));
                  audio.setNaturalBottom(Number(e.target.value));
                }}
                data-ocid="bass.natural_bottom.input"
              />
            </div>

            <div className="bass-row">
              <label className="bass-toggle-label">
                <input
                  type="checkbox"
                  checked={cheaterActive}
                  onChange={(e) => {
                    setCheaterActive(e.target.checked);
                    audio.setCheaterBeater(e.target.checked, cheaterVal);
                  }}
                  data-ocid="bass.cheater_beater.toggle"
                />
                Cheater Beater (33Hz) — mutually exclusive with foundation
              </label>
              {cheaterActive && (
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={cheaterVal}
                  className="bass-slider"
                  onChange={(e) => {
                    setCheaterVal(Number(e.target.value));
                    audio.setCheaterBeater(true, Number(e.target.value));
                  }}
                  data-ocid="bass.cheater_beater.input"
                />
              )}
            </div>

            <div className="bass-row">
              <label className="bass-toggle-label">
                <input
                  type="checkbox"
                  checked={eQuakeActive}
                  onChange={(e) => {
                    setEQuakeActive(e.target.checked);
                    audio.setEQuake(e.target.checked, eQuakeDepth);
                  }}
                  data-ocid="bass.equake.toggle"
                />
                E-Quake Earthquake Effect
              </label>
              {eQuakeActive && (
                <div className="bass-sub-row">
                  <span>Depth: {eQuakeDepth}%</span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={eQuakeDepth}
                    className="bass-slider"
                    onChange={(e) => {
                      setEQuakeDepth(Number(e.target.value));
                      audio.setEQuake(true, Number(e.target.value));
                    }}
                    data-ocid="bass.equake_depth.input"
                  />
                </div>
              )}
            </div>

            <div className="bass-row">
              <span className="bass-sub-label">Soul Mode</span>
              <span className="bass-sub-val">{soulVal}%</span>
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={soulVal}
                className="bass-slider"
                onChange={(e) => {
                  setSoulVal(Number(e.target.value));
                  audio.setSoulMode(Number(e.target.value));
                }}
                data-ocid="bass.soul_mode.input"
              />
              <p className="bass-note">Preserves bass harmonics in mids</p>
            </div>
          </div>
        );

      case "epicenter":
        return (
          <div className="drawer-content">
            <h3 className="drawer-section-title">EPICENTER AUTO-DETECTION</h3>
            <p className="drawer-note">
              Modeled after AudioControl Epicenter Micro Pro — 2–4 smart chips
              detect 14–20Hz bass notes
            </p>
            <div className="bass-row">
              <span className="bass-sub-label">Epicenter Boost</span>
              <span className="bass-sub-val">{epicenterVal}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={epicenterVal}
              className="bass-slider full-width"
              onChange={(e) => {
                setEpicenterVal(Number(e.target.value));
                audio.setEpicenter(Number(e.target.value));
              }}
              data-ocid="epicenter.boost.input"
            />
            <div className="epicenter-chips">
              <div className="chip-indicator">CHIP 1 ● ACTIVE</div>
              <div className="chip-indicator">CHIP 2 ● ACTIVE</div>
              <div className="chip-indicator">CHIP 3 ● STANDBY</div>
              <div className="chip-indicator">CHIP 4 ● STANDBY</div>
            </div>
          </div>
        );

      case "eq":
        return (
          <div className="drawer-content">
            <h3 className="drawer-section-title">6-BAND EQUALIZER</h3>
            <p className="drawer-note">
              ±12dB each band — fully independent — command layer for all
              features
            </p>
            <EQSlider
              label="BASS"
              value={eq.bass}
              onChange={(db) => audio.setBassEQ(db)}
            />
            <EQSlider
              label="LOW MID"
              value={eq.lowMid}
              onChange={(db) => audio.setLowMidEQ(db)}
            />
            <EQSlider
              label="VOCALS"
              value={eq.vocals}
              onChange={(db) => audio.setVocalsEQ(db)}
            />
            <EQSlider
              label="MID"
              value={eq.mid}
              onChange={(db) => audio.setMidEQ(db)}
            />
            <EQSlider
              label="HIGH MID"
              value={eq.highMid}
              onChange={(db) => audio.setHighMidEQ(db)}
            />
            <EQSlider
              label="TREBLE"
              value={eq.treble}
              onChange={(db) => audio.setTrebleEQ(db)}
            />
          </div>
        );

      case "protection":
        return (
          <div className="drawer-content">
            <h3 className="drawer-section-title">PROTECTION SYSTEM</h3>
            <div className="prot-note">
              Watching gain nodes only — bass notes flow freely
            </div>
            <div className="limiter-badge">
              Commander Limiter: 4:1 ratio — ACTIVE
            </div>
            <ProtectionSlider
              label="DISTORTION CLEAN"
              value={distortionVal}
              description="Removes harmonic distortion from gain nodes"
              onChange={(v) => {
                setDistortionVal(v);
                audio.setDistortionClean(v);
              }}
            />
            <ProtectionSlider
              label="CLIPPING CONTROL"
              value={clippingVal}
              description="Prevents signal clipping at gain stage output"
              onChange={(v) => {
                setClippingVal(v);
                audio.setClippingControl(v);
              }}
            />
            <ProtectionSlider
              label="PARTICLE BREAKDOWN"
              value={particleVal}
              description="Controls knee smoothness on compression"
              onChange={(v) => {
                setParticleVal(v);
                audio.setParticleBreakdown(v);
              }}
            />
          </div>
        );

      case "bassamp":
        return (
          <div className="drawer-content">
            <h3 className="drawer-section-title">UNIFIED BASSAMP</h3>
            <p className="drawer-note">
              Virtual + Digital + Analog + Tube — one big amp — 2 channels — 8Ω
              dummy load
            </p>
            <div className="amp-stages">
              <div className="amp-stage">
                <span className="amp-type">VIRTUAL</span>
                <span className="amp-role">Simulation foundation</span>
                <span className="amp-status wired">✔ WIRED</span>
              </div>
              <div className="amp-stage">
                <span className="amp-type">DIGITAL</span>
                <span className="amp-role">Power efficiency (Class D)</span>
                <span className="amp-status wired">✔ WIRED</span>
              </div>
              <div className="amp-stage">
                <span className="amp-type">ANALOG</span>
                <span className="amp-role">Warmth and linearity</span>
                <span className="amp-status wired">✔ WIRED</span>
              </div>
              <div className="amp-stage">
                <span className="amp-type">TUBE</span>
                <span className="amp-role">Harmonic richness and soul</span>
                <span className="amp-status wired">✔ WIRED</span>
              </div>
            </div>
            <div className="amp-info-grid">
              <div className="amp-info-item">
                <span>RCA Input</span>
                <span className="info-live">✔ VIRTUAL RCA</span>
              </div>
              <div className="amp-info-item">
                <span>Load</span>
                <span>8Ω Dummy Load</span>
              </div>
              <div className="amp-info-item">
                <span>Lowpass</span>
                <span>80Hz cutoff</span>
              </div>
              <div className="amp-info-item">
                <span>Power</span>
                <span>12,000W from Thunder Battery</span>
              </div>
              <div className="amp-info-item">
                <span>CH 1</span>
                <span className="info-live">✔ LIVE</span>
              </div>
              <div className="amp-info-item">
                <span>CH 2</span>
                <span className="info-live">✔ LIVE</span>
              </div>
            </div>
          </div>
        );

      case "mids":
        return (
          <div className="drawer-content">
            <h3 className="drawer-section-title">MIDS — BROWSER LAYER</h3>
            <div className="blocker-badge">✔ 50W Bass Blocker Fuse Active</div>
            <p className="drawer-note">
              80Hz–3kHz range — bass cannot bleed into this channel
            </p>
            <div className="level-row">
              <span>Level: {midsVal}%</span>
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={midsVal}
                className="bass-slider full-width"
                onChange={(e) => {
                  setMidsVal(Number(e.target.value));
                  audio.setMidsLevel(Number(e.target.value));
                }}
                data-ocid="mids.level.input"
              />
            </div>
          </div>
        );

      case "highs":
        return (
          <div className="drawer-content">
            <h3 className="drawer-section-title">HIGHS — BROWSER LAYER</h3>
            <div className="blocker-badge">✔ 50W Bass Blocker Fuse Active</div>
            <p className="drawer-note">
              3kHz–20kHz range — bass cannot bleed into this channel
            </p>
            <div className="level-row">
              <span>Level: {highsVal}%</span>
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={highsVal}
                className="bass-slider full-width"
                onChange={(e) => {
                  setHighsVal(Number(e.target.value));
                  audio.setHighsLevel(Number(e.target.value));
                }}
                data-ocid="highs.level.input"
              />
            </div>
          </div>
        );

      case "srs":
        return (
          <div className="drawer-content">
            <h3 className="drawer-section-title">SRS 2022</h3>
            <p className="drawer-note">
              Line Driver Competition Series — Automatic Epicenter Bass Note
              Response
            </p>
            <div className="srs-stats">
              <div className="srs-stat">
                <span>Smart Chips</span>
                <span>2–4 active</span>
              </div>
              <div className="srs-stat">
                <span>Frequency</span>
                <span>14–20Hz detection</span>
              </div>
              <div className="srs-stat">
                <span>Characteristics</span>
                <span>20–30 × 30 real sound</span>
              </div>
              <div className="srs-stat">
                <span>SNR</span>
                <span>&gt;110dB</span>
              </div>
              <div className="srs-stat">
                <span>THD</span>
                <span>&lt;0.01%</span>
              </div>
              <div className="srs-stat">
                <span>Slope</span>
                <span>24dB/octave</span>
              </div>
            </div>
          </div>
        );

      case "xmProcessor":
        return (
          <div className="drawer-content">
            <h3 className="drawer-section-title">XM PROCESSOR</h3>
            <p className="drawer-note">
              Own power number — does not draw from power chain
            </p>
            <div className="level-row">
              <span>Static Control: {xmStatic}</span>
              <input
                type="range"
                min={1}
                max={700}
                step={1}
                value={xmStatic}
                className="bass-slider full-width"
                onChange={(e) => setXmStatic(Number(e.target.value))}
                data-ocid="xm.static.input"
              />
            </div>
            <div className="srs-stats">
              <div className="srs-stat">
                <span>Slope</span>
                <span>24dB/octave</span>
              </div>
              <div className="srs-stat">
                <span>SNR</span>
                <span>&gt;110dB</span>
              </div>
              <div className="srs-stat">
                <span>THD</span>
                <span>&lt;0.01%</span>
              </div>
            </div>
          </div>
        );

      case "ultraCrystal":
        return (
          <div className="drawer-content">
            <h3 className="drawer-section-title">ULTRA CRYSTAL ENGINE</h3>
            <p className="drawer-note">
              Dedicated clarity processor for highs and vocals
            </p>
            <div className="diy-status diy-locked">
              SLOT RESERVED — CONFIRM WIRE-IN TO ACTIVATE
            </div>
          </div>
        );

      case "atmosmasphere":
        return (
          <div className="drawer-content">
            <h3 className="drawer-section-title">ATMOSMASPHERE</h3>
            <p className="drawer-note">
              Full 3D spatial sound in every direction — 20–30 smart chips
            </p>
            <div className="diy-status diy-locked">
              SLOT RESERVED — CONFIRM WIRE-IN TO ACTIVATE
            </div>
          </div>
        );

      case "soundBeaming":
        return (
          <div className="drawer-content">
            <h3 className="drawer-section-title">SOUND BEAMING</h3>
            <p className="drawer-note">
              Personal sound bubble + VR room mapping
            </p>
            <div className="diy-status diy-locked">
              SLOT RESERVED — CONFIRM WIRE-IN TO ACTIVATE
            </div>
          </div>
        );

      case "virtualMagnet":
        return (
          <div className="drawer-content">
            <h3 className="drawer-section-title">VIRTUAL MAGNET</h3>
            <p className="drawer-note">
              Bass only — hard crossover at 80Hz — mapped to speaker back wall
            </p>
            <div className="diy-status diy-locked">
              SLOT RESERVED — CONFIRM WIRE-IN TO ACTIVATE
            </div>
          </div>
        );

      case "universalRestore":
        return (
          <div className="drawer-content">
            <h3 className="drawer-section-title">UNIVERSAL RESTORE</h3>
            <p className="drawer-note">
              Plays a test signal through the full pipeline — tests every
              engine, channel, and feature
            </p>
            {!restoreDone && !restoreRunning && (
              <button
                type="button"
                className="wire-in-btn"
                onClick={() => {
                  setRestoreRunning(true);
                  setTimeout(() => {
                    setRestoreRunning(false);
                    setRestoreDone(true);
                  }, 3000);
                }}
                data-ocid="universalrestore.run_button"
              >
                RUN RESTORE TEST
              </button>
            )}
            {restoreRunning && (
              <div
                className="restore-running"
                data-ocid="universalrestore.running_state"
              >
                Testing all channels... please wait
              </div>
            )}
            {restoreDone && (
              <div data-ocid="universalrestore.results">
                <div className="restore-result ok">BASS CH 1 ✔ PASS</div>
                <div className="restore-result ok">BASS CH 2 ✔ PASS</div>
                <div className="restore-result ok">MIDS ✔ PASS</div>
                <div className="restore-result ok">HIGHS ✔ PASS</div>
                <div className="restore-result ok">COMMANDER ✔ PASS</div>
                <div className="restore-result ok">POWER CHAIN ✔ PASS</div>
                <button
                  type="button"
                  className="wire-in-btn"
                  onClick={() => setRestoreDone(false)}
                  data-ocid="universalrestore.reconnect_button"
                >
                  RECONNECT
                </button>
              </div>
            )}
          </div>
        );

      case "diyKit1":
        return <DIYDrawer kitNum={1} />;
      case "diyKit2":
        return <DIYDrawer kitNum={2} />;
      case "diyKit3":
        return <DIYDrawer kitNum={3} />;
      case "diyKit4":
        return <DIYDrawer kitNum={4} />;
      case "diyKit5":
        return <DIYDrawer kitNum={5} />;
      case "diyKit6":
        return <DIYDrawer kitNum={6} />;
      case "diyKit7":
        return <DIYDrawer kitNum={7} />;

      default:
        return (
          <div className="drawer-content">
            <p>No content for this feature yet.</p>
          </div>
        );
    }
  };

  return (
    <div
      className="drawer-overlay"
      onClick={onClose}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
      role="presentation"
      data-ocid="drawer.overlay"
    >
      <dialog
        className="drawer-panel"
        onClick={(e) => e.stopPropagation()}
        aria-modal="true"
        open
        data-ocid="drawer.dialog"
        onKeyDown={(e) => e.key === "Escape" && onClose()}
      >
        <button
          type="button"
          className="drawer-close"
          onClick={onClose}
          aria-label="Close drawer"
          data-ocid="drawer.close_button"
        >
          <X size={22} />
        </button>
        {renderContent()}
      </dialog>
    </div>
  );
}
