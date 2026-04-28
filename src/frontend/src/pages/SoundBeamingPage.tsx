/**
 * SoundBeamingPage — Sound Beaming + VR Bubble control interface
 * Everything is hidden inside the Stabilizer. Volume follows the main player.
 * Bass: omnidirectional. Mids + Highs: HRTF beam per listener. 360° bubble.
 */

import type { DepthZone } from "@/hooks/useSoundBeaming";
import { useSoundBeaming } from "@/hooks/useSoundBeaming";
import { Radio, Wifi, Zap } from "lucide-react";

// ─── Toggle switch ─────────────────────────────────────────────────────────────

interface BeamToggleProps {
  label: string;
  value: boolean;
  onToggle: () => void;
  ocid: string;
  glow?: boolean;
}

function BeamToggle({ label, value, onToggle, ocid, glow }: BeamToggleProps) {
  return (
    <button
      type="button"
      data-ocid={ocid}
      onClick={onToggle}
      className="flex items-center justify-between w-full px-3 py-2 rounded-sm transition-all duration-200"
      style={{
        background: value ? "rgba(0,40,120,0.35)" : "rgba(0,8,28,0.6)",
        border: value
          ? "1px solid rgba(0,180,255,0.5)"
          : "1px solid rgba(0,60,150,0.2)",
        boxShadow: value && glow ? "0 0 14px rgba(0,160,255,0.25)" : "none",
      }}
      aria-pressed={value}
    >
      <span
        className="text-[9px] font-mono tracking-[0.25em] uppercase"
        style={{
          color: value ? "rgba(0,220,255,0.95)" : "rgba(100,140,200,0.5)",
        }}
      >
        {label}
      </span>
      <div
        className="w-10 h-5 rounded-full relative transition-all duration-200 shrink-0"
        style={{
          background: value ? "rgba(0,160,255,0.35)" : "rgba(0,20,60,0.6)",
          border: value
            ? "1px solid rgba(0,200,255,0.55)"
            : "1px solid rgba(0,50,120,0.3)",
        }}
      >
        <div
          className="absolute top-0.5 w-4 h-4 rounded-full transition-all duration-200"
          style={{
            left: value ? "calc(100% - 18px)" : "2px",
            background: value ? "rgba(0,213,255,0.95)" : "rgba(50,80,130,0.6)",
            boxShadow: value ? "0 0 8px rgba(0,213,255,0.7)" : "none",
          }}
        />
      </div>
    </button>
  );
}

// ─── Slider ───────────────────────────────────────────────────────────────────

interface BeamSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  ocid: string;
  unit?: string;
  color?: string;
}

function BeamSlider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  ocid,
  unit = "",
  color = "rgba(0,180,255,0.85)",
}: BeamSliderProps) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span
          className="text-[8px] font-mono tracking-[0.2em] uppercase"
          style={{ color: "rgba(140,170,220,0.65)" }}
        >
          {label}
        </span>
        <span className="text-[9px] font-mono font-bold" style={{ color }}>
          {value}
          {unit}
        </span>
      </div>
      <input
        type="range"
        data-ocid={ocid}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1 rounded-full appearance-none cursor-pointer"
        style={{
          background: `linear-gradient(to right, ${color} ${pct}%, rgba(0,30,80,0.5) ${pct}%)`,
          outline: "none",
        }}
      />
    </div>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({
  title,
  subtitle,
}: { title: string; subtitle?: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div
        className="flex-1 h-px"
        style={{ background: "rgba(0,100,200,0.25)" }}
      />
      <div className="flex flex-col items-center">
        <span
          className="text-[8px] font-mono tracking-[0.3em] uppercase font-bold"
          style={{ color: "rgba(0,180,255,0.7)" }}
        >
          {title}
        </span>
        {subtitle && (
          <span
            className="text-[7px] font-mono tracking-[0.15em]"
            style={{ color: "rgba(0,130,200,0.45)" }}
          >
            {subtitle}
          </span>
        )}
      </div>
      <div
        className="flex-1 h-px"
        style={{ background: "rgba(0,100,200,0.25)" }}
      />
    </div>
  );
}

// ─── Body scan bars ───────────────────────────────────────────────────────────

function ScanBar({
  label,
  value,
  color,
}: { label: string; value: number; color: string }) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return (
    <div className="flex items-center gap-1.5">
      <span
        className="text-[7px] font-mono w-12 shrink-0 text-right"
        style={{ color: "rgba(120,150,200,0.5)" }}
      >
        {label}
      </span>
      <div
        className="flex-1 h-1.5 rounded-full overflow-hidden"
        style={{ background: "rgba(0,20,60,0.5)" }}
      >
        <div
          className="h-full rounded-full transition-all duration-150"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <span
        className="text-[7px] font-mono w-7 shrink-0"
        style={{ color: "rgba(100,140,200,0.45)" }}
      >
        {pct}%
      </span>
    </div>
  );
}

// ─── Main page component ──────────────────────────────────────────────────────

export function SoundBeamingPage() {
  const beam = useSoundBeaming();

  const depthZones: DepthZone[] = ["near", "mid", "far"];
  const depthLabels: Record<DepthZone, string> = {
    near: "NEAR  0-3ft",
    mid: "MID   3-10ft",
    far: "FAR   10-20ft",
  };

  return (
    <div
      className="min-h-full flex flex-col"
      style={{
        background:
          "linear-gradient(to bottom, rgba(0,4,18,0.99), rgba(0,8,28,0.98))",
      }}
    >
      {/* ── HEADER ── */}
      <div
        className="px-4 pt-4 pb-3 shrink-0"
        style={{
          background: "rgba(0,6,22,0.98)",
          borderBottom: "1px solid rgba(0,100,220,0.2)",
          boxShadow: "0 1px 16px rgba(0,60,180,0.12)",
        }}
      >
        <div className="flex items-center gap-3 mb-1">
          <div
            className="w-8 h-8 rounded-sm flex items-center justify-center shrink-0"
            style={{
              background: beam.beamActive
                ? "rgba(0,40,120,0.6)"
                : "rgba(0,10,40,0.5)",
              border: beam.beamActive
                ? "1px solid rgba(0,200,255,0.5)"
                : "1px solid rgba(0,60,150,0.2)",
              boxShadow: beam.beamActive
                ? "0 0 16px rgba(0,180,255,0.3)"
                : "none",
            }}
          >
            <Radio
              className="w-4 h-4"
              style={{
                color: beam.beamActive
                  ? "rgba(0,220,255,0.9)"
                  : "rgba(0,80,160,0.5)",
              }}
            />
          </div>
          <div>
            <h1
              className="text-sm font-display font-bold tracking-[0.15em] uppercase"
              style={{
                color: "rgba(0,213,255,0.95)",
                textShadow: beam.beamActive
                  ? "0 0 14px rgba(0,180,255,0.5)"
                  : "none",
              }}
            >
              Sound Beaming + VR
            </h1>
            <p
              className="text-[8px] font-mono tracking-[0.2em] uppercase"
              style={{ color: "rgba(100,160,220,0.55)" }}
            >
              Bass · Mids · Highs · All Listeners
            </p>
          </div>
          {/* Engine 1 power badge */}
          <div
            className="ml-auto flex items-center gap-1 px-2 py-1 rounded-sm shrink-0"
            style={{
              background: "rgba(0,15,50,0.7)",
              border: "1px solid rgba(153,69,255,0.3)",
            }}
          >
            <Zap
              className="w-2.5 h-2.5"
              style={{ color: "rgba(153,69,255,0.8)" }}
            />
            <span
              className="text-[7px] font-mono tracking-wide"
              style={{ color: "rgba(153,69,255,0.7)" }}
            >
              ENG1
            </span>
          </div>
        </div>

        {/* Bubble status bar */}
        <div
          className="mt-2 flex items-center justify-between px-2 py-1 rounded-sm"
          style={{
            background: beam.beamActive
              ? "rgba(0,30,90,0.4)"
              : "rgba(0,5,20,0.4)",
            border: beam.beamActive
              ? "1px solid rgba(0,160,255,0.25)"
              : "1px solid rgba(0,30,80,0.15)",
          }}
        >
          <span
            className="text-[7px] font-mono tracking-[0.2em] uppercase"
            style={{ color: "rgba(100,140,200,0.55)" }}
          >
            Personal Bubble:
          </span>
          <span
            className="text-[8px] font-mono font-bold tracking-[0.2em]"
            style={{
              color: beam.beamActive
                ? "rgba(0,255,150,0.9)"
                : "rgba(100,130,180,0.45)",
            }}
          >
            {beam.bubbleStatus}
          </span>
        </div>
      </div>

      {/* ── SCROLLABLE CONTENT ── */}
      <div
        className="flex-1 overflow-y-auto px-4 pb-8"
        style={{
          scrollbarWidth: "thin",
          scrollbarColor: "rgba(0,100,255,0.2) transparent",
        }}
      >
        {/* ── MASTER CONTROLS ── */}
        <div className="mt-4">
          <SectionHeader title="Master Controls" />
          <div className="flex flex-col gap-1.5">
            <BeamToggle
              label="BEAM ON / OFF"
              value={beam.beamActive}
              onToggle={beam.toggleBeam}
              ocid="beam.toggle"
              glow
            />
            <BeamToggle
              label="GROUP MODE — All Listeners"
              value={beam.groupMode}
              onToggle={beam.toggleGroupMode}
              ocid="beam.group_mode_toggle"
            />
            <BeamToggle
              label="WALL MAPPING — Front Room"
              value={beam.wallMapping}
              onToggle={beam.toggleWallMapping}
              ocid="beam.wall_mapping_toggle"
            />
            <BeamToggle
              label="VR MODE — Fly-Past Effects"
              value={beam.vrMode}
              onToggle={beam.toggleVrMode}
              ocid="beam.vr_mode_toggle"
            />
            <BeamToggle
              label="PHONE SPEAKER MODE"
              value={beam.phoneSpeakerMode}
              onToggle={beam.togglePhoneSpeaker}
              ocid="beam.phone_speaker_toggle"
            />
          </div>
        </div>

        {/* ── POWER SUPPLY ── */}
        <div className="mt-5">
          <SectionHeader title="Power Supply — Engine 1" />
          <div
            className="p-3 rounded-sm"
            style={{
              background: "rgba(0,6,22,0.8)",
              border: "1px solid rgba(153,69,255,0.2)",
            }}
          >
            {[
              {
                label: "ENGINE 1",
                val: "80,000 × per channel · 12 channels",
                color: "rgba(153,69,255,0.85)",
              },
              {
                label: "BASS",
                val: "Omnidirectional fill · 14-80Hz",
                color: "rgba(0,213,255,0.75)",
              },
              {
                label: "MIDS",
                val: "HRTF beam → each listener",
                color: "rgba(0,200,180,0.75)",
              },
              {
                label: "HIGHS",
                val: "HRTF beam → each listener",
                color: "rgba(0,240,200,0.75)",
              },
              {
                label: "PROTECTION",
                val: "Signal clean · Zero distortion",
                color: "rgba(0,255,120,0.65)",
              },
            ].map(({ label, val, color }) => (
              <div
                key={label}
                className="flex items-center justify-between py-1.5"
                style={{ borderBottom: "1px solid rgba(0,40,120,0.15)" }}
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{
                      background: beam.beamActive
                        ? color
                        : "rgba(255,255,255,0.1)",
                      boxShadow: beam.beamActive ? `0 0 5px ${color}` : "none",
                    }}
                  />
                  <span
                    className="text-[8px] font-mono tracking-[0.2em] uppercase"
                    style={{ color: "rgba(140,170,220,0.55)" }}
                  >
                    {label}
                  </span>
                </div>
                <span
                  className="text-[8px] font-mono"
                  style={{
                    color: beam.beamActive
                      ? color.replace(/[\d.]+\)$/, "0.8)")
                      : "rgba(80,100,160,0.3)",
                  }}
                >
                  {val}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── BUBBLE + ROOM MAPPING ── */}
        <div className="mt-5">
          <SectionHeader title="Bubble + Room Mapping" />
          <div className="flex flex-col gap-3">
            <div
              className="px-3 py-2 rounded-sm flex items-center justify-between"
              style={{
                background: beam.beamActive
                  ? "rgba(0,30,90,0.4)"
                  : "rgba(0,5,20,0.4)",
                border: beam.beamActive
                  ? "1px solid rgba(0,160,255,0.3)"
                  : "1px solid rgba(0,30,80,0.15)",
              }}
            >
              <div>
                <p
                  className="text-[8px] font-mono tracking-[0.2em] uppercase font-bold"
                  style={{
                    color: beam.beamActive
                      ? "rgba(0,220,255,0.9)"
                      : "rgba(80,100,160,0.5)",
                  }}
                >
                  360° Sealed Bubble
                </p>
                <p
                  className="text-[7px] font-mono mt-0.5"
                  style={{ color: "rgba(100,130,200,0.45)" }}
                >
                  Above · Below · All Sides · No gaps
                </p>
              </div>
              <Wifi
                className="w-5 h-5 shrink-0"
                style={{
                  color: beam.beamActive
                    ? "rgba(0,200,255,0.7)"
                    : "rgba(0,60,120,0.3)",
                }}
              />
            </div>

            <div
              className="flex flex-col gap-1 px-2 py-1.5 rounded-sm"
              style={{
                background: "rgba(0,6,20,0.5)",
                border: "1px solid rgba(0,60,150,0.15)",
              }}
            >
              <span
                className="text-[7px] font-mono tracking-[0.2em] uppercase"
                style={{ color: "rgba(100,140,200,0.45)" }}
              >
                PHONE = ROOM CENTER — Beam radiates outward
              </span>
            </div>

            <BeamSlider
              label="Room Width"
              value={beam.roomWidth}
              min={5}
              max={20}
              onChange={beam.setRoomWidth}
              ocid="beam.room_width_slider"
              unit="ft"
            />
            <BeamSlider
              label="Listener Height"
              value={beam.heightFt}
              min={5}
              max={7}
              step={0.5}
              onChange={beam.setHeightFt}
              ocid="beam.height_slider"
              unit="ft"
            />
          </div>
        </div>

        {/* ── VR CONTROLS (when VR on) ── */}
        {beam.vrMode && (
          <div className="mt-5">
            <SectionHeader
              title="VR Controls"
              subtitle="Fly-Past · Sweep L-R · From Behind · From Above"
            />
            <div className="flex flex-col gap-3">
              <BeamSlider
                label="Beam Strength"
                value={beam.beamStrength}
                min={0}
                max={100}
                onChange={beam.setBeamStrength}
                ocid="beam.strength_slider"
                unit="%"
                color="rgba(153,69,255,0.85)"
              />

              <div>
                <p
                  className="text-[8px] font-mono tracking-[0.2em] uppercase mb-2"
                  style={{ color: "rgba(140,170,220,0.55)" }}
                >
                  VR Depth Zone
                </p>
                <div className="grid grid-cols-3 gap-1">
                  {depthZones.map((zone) => (
                    <button
                      key={zone}
                      type="button"
                      data-ocid={`beam.vr_depth.${zone}`}
                      onClick={() => beam.setVrDepth(zone)}
                      className="py-2 rounded-sm text-center transition-all duration-200"
                      style={{
                        background:
                          beam.vrDepth === zone
                            ? "rgba(153,69,255,0.2)"
                            : "rgba(0,8,28,0.5)",
                        border:
                          beam.vrDepth === zone
                            ? "1px solid rgba(153,69,255,0.55)"
                            : "1px solid rgba(0,40,100,0.2)",
                        boxShadow:
                          beam.vrDepth === zone
                            ? "0 0 10px rgba(153,69,255,0.2)"
                            : "none",
                      }}
                      aria-pressed={beam.vrDepth === zone}
                    >
                      <span
                        className="text-[7px] font-mono tracking-wide"
                        style={{
                          color:
                            beam.vrDepth === zone
                              ? "rgba(200,150,255,0.9)"
                              : "rgba(80,100,160,0.45)",
                        }}
                      >
                        {depthLabels[zone]}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div
                className="px-3 py-2 rounded-sm"
                style={{
                  background: "rgba(153,69,255,0.06)",
                  border: "1px solid rgba(153,69,255,0.15)",
                }}
              >
                <p
                  className="text-[7px] font-mono tracking-[0.15em]"
                  style={{ color: "rgba(180,130,255,0.6)" }}
                >
                  VR ACTIVE — Sounds fly past · Frequencies beam bass/mids/highs
                  to bubbles · Bass fills room naturally · Highs beam sharp
                  above listener head
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── LISTENER GRID ── */}
        <div className="mt-5">
          <SectionHeader
            title="Listener Grid"
            subtitle="10 Listener Slots — Bubble per person"
          />
          <div
            className="grid grid-cols-2 gap-1.5"
            data-ocid="beam.listener_grid"
          >
            {beam.listeners.map((l, i) => (
              <div
                key={l.id}
                data-ocid={`beam.listener.${i + 1}`}
                className="px-2 py-1.5 rounded-sm"
                style={{
                  background:
                    l.active && beam.beamActive
                      ? "rgba(0,25,80,0.5)"
                      : "rgba(0,5,20,0.4)",
                  border:
                    l.active && beam.beamActive
                      ? "1px solid rgba(0,160,255,0.3)"
                      : "1px solid rgba(0,30,80,0.12)",
                }}
              >
                <div className="flex items-center justify-between mb-0.5">
                  <span
                    className="text-[8px] font-mono font-bold"
                    style={{
                      color:
                        l.active && beam.beamActive
                          ? "rgba(0,213,255,0.85)"
                          : "rgba(60,80,140,0.4)",
                    }}
                  >
                    {l.label}
                  </span>
                  <div
                    className="w-1.5 h-1.5 rounded-full"
                    style={{
                      background:
                        l.active && beam.beamActive
                          ? "rgba(0,255,150,0.9)"
                          : "rgba(50,70,120,0.3)",
                      boxShadow:
                        l.active && beam.beamActive
                          ? "0 0 5px rgba(0,255,150,0.6)"
                          : "none",
                    }}
                  />
                </div>
                <div
                  className="text-[6.5px] font-mono"
                  style={{ color: "rgba(80,100,160,0.45)" }}
                >
                  {l.x.toFixed(0)},{l.z.toFixed(0)}ft · R{l.bubbleRadius}m
                </div>
                <div
                  className="text-[6.5px] font-mono"
                  style={{
                    color:
                      l.active && beam.beamActive
                        ? "rgba(0,200,255,0.5)"
                        : "rgba(40,60,110,0.35)",
                  }}
                >
                  {l.active && beam.beamActive ? "● BUBBLE" : "○ STBY"}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── BODY SCAN SENSORS ── */}
        <div className="mt-5">
          <SectionHeader title="Body Scan — 20 Sensors" />
          <div
            className="flex flex-col gap-1.5"
            data-ocid="beam.body_scan_panel"
          >
            <ScanBar
              label="HEAD"
              value={0.5 + beam.bodyScan.headAngle * 0.5}
              color="rgba(0,213,255,0.7)"
            />
            <ScanBar
              label="EAR L"
              value={beam.bodyScan.earL}
              color="rgba(0,200,180,0.7)"
            />
            <ScanBar
              label="EAR R"
              value={beam.bodyScan.earR}
              color="rgba(0,200,180,0.7)"
            />
            <ScanBar
              label="SHOULDER"
              value={beam.bodyScan.shoulderWidth}
              color="rgba(0,180,255,0.6)"
            />
            <ScanBar
              label="HEIGHT"
              value={(beam.bodyScan.heightFt - 5) / 2}
              color="rgba(100,180,255,0.6)"
            />
            <ScanBar
              label="CHEST"
              value={beam.bodyScan.chestEnergy}
              color="rgba(153,69,255,0.7)"
            />
            <ScanBar
              label="HANDS"
              value={beam.bodyScan.handsEnergy}
              color="rgba(153,69,255,0.6)"
            />
            <ScanBar
              label="ENERGY"
              value={beam.sensorEnergy}
              color="rgba(0,255,150,0.7)"
            />
          </div>
        </div>

        {/* ── STATUS BLOCK ── */}
        <div className="mt-5">
          <SectionHeader title="System Status" />
          <div
            className="p-3 rounded-sm"
            style={{
              background: "rgba(0,6,22,0.8)",
              border: "1px solid rgba(0,80,180,0.18)",
            }}
          >
            {[
              {
                label: "STABILIZER",
                val: "ENGINE HIDDEN INSIDE — ACTIVE",
                color: "rgba(0,200,255,0.75)",
              },
              {
                label: "SIGNAL BOOSTER",
                val: "STABILIZER HIDDEN INSIDE",
                color: "rgba(0,220,180,0.75)",
              },
              {
                label: "CREDITS",
                val: "DO NOT SEE THIS — HIDDEN",
                color: "rgba(100,140,200,0.4)",
              },
              {
                label: "STORY",
                val: "ENGINE VISIBLE TO STORY",
                color: "rgba(153,69,255,0.7)",
              },
              {
                label: "BASS PATH",
                val: "OMNI · 14-80Hz · Fills room",
                color: "rgba(255,180,0,0.7)",
              },
              {
                label: "MIDS+HIGHS",
                val: `HRTF BEAM · ${beam.beamActive ? "ACTIVE" : "STANDBY"}`,
                color: beam.beamActive
                  ? "rgba(0,255,150,0.8)"
                  : "rgba(60,80,140,0.4)",
              },
              {
                label: "VR LAYER",
                val: beam.vrMode ? "FLY-PAST · SWEEP ACTIVE" : "STANDBY",
                color: beam.vrMode
                  ? "rgba(153,69,255,0.85)"
                  : "rgba(60,80,140,0.35)",
              },
            ].map(({ label, val, color }) => (
              <div
                key={label}
                className="flex items-center justify-between py-1.5"
                style={{ borderBottom: "1px solid rgba(0,30,80,0.12)" }}
              >
                <span
                  className="text-[7.5px] font-mono tracking-[0.2em] uppercase"
                  style={{ color: "rgba(120,150,200,0.5)" }}
                >
                  {label}
                </span>
                <span className="text-[7.5px] font-mono" style={{ color }}>
                  {val}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
