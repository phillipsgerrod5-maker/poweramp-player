import type { AtmosChipStatus, AtmosState } from "@/hooks/useAtmosmasphere";

// ─── Engine 1 Wired indicator ─────────────────────────────────────────────────
function Engine1WiredBadge({ wired }: { wired: boolean }) {
  return (
    <div
      className="flex items-center gap-1.5 px-2 py-1 rounded-sm"
      style={{
        background: wired ? "rgba(0,255,120,0.07)" : "rgba(255,80,80,0.07)",
        border: `1px solid ${wired ? "rgba(0,255,120,0.4)" : "rgba(255,80,80,0.3)"}`,
        boxShadow: wired ? "0 0 8px rgba(0,255,120,0.2)" : "none",
      }}
      data-ocid="atmosmasphere.engine1_wired_indicator"
    >
      <div
        className={`w-2 h-2 rounded-full shrink-0 ${wired ? "animate-pulse" : ""}`}
        style={{
          background: wired ? "rgba(0,255,120,0.9)" : "rgba(255,80,80,0.7)",
          boxShadow: wired ? "0 0 6px rgba(0,255,120,0.8)" : "none",
        }}
      />
      <span
        className="text-[8px] font-mono font-bold tracking-widest"
        style={{
          color: wired ? "rgba(0,255,120,0.95)" : "rgba(255,100,100,0.8)",
        }}
      >
        {wired ? "✓ WIRED TO ENGINE 1" : "NOT WIRED"}
      </span>
      {wired && (
        <span
          className="text-[7px] font-mono tracking-widest"
          style={{ color: "rgba(0,200,100,0.55)" }}
        >
          CH8 — 80,000W
        </span>
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function EnergyBar({
  value,
  label,
  color,
}: {
  value: number;
  label: string;
  color: string;
}) {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100);
  return (
    <div className="flex items-center gap-2">
      <span
        className="text-[7px] font-mono tracking-wide w-[76px] shrink-0 truncate"
        style={{ color: "rgba(160,185,255,0.55)" }}
      >
        {label}
      </span>
      <div
        className="flex-1 h-1.5 rounded-full overflow-hidden"
        style={{ background: "rgba(255,255,255,0.06)" }}
      >
        <div
          className="h-full rounded-full transition-all duration-75"
          style={{
            width: `${pct}%`,
            background: color,
            boxShadow: pct > 10 ? `0 0 4px ${color}` : "none",
          }}
        />
      </div>
      <span
        className="text-[7px] font-mono font-bold w-6 text-right shrink-0 tabular-nums"
        style={{ color }}
      >
        {pct}
      </span>
    </div>
  );
}

function BoolSensor({
  label,
  value,
  trueLabel,
  falseLabel,
}: {
  label: string;
  value: boolean;
  trueLabel: string;
  falseLabel: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span
        className="text-[7px] font-mono tracking-wide w-[76px] shrink-0 truncate"
        style={{ color: "rgba(160,185,255,0.55)" }}
      >
        {label}
      </span>
      <div
        className="flex-1 flex items-center gap-1 px-1.5 py-0.5 rounded-sm"
        style={{
          background: value ? "rgba(0,255,120,0.06)" : "rgba(255,180,0,0.06)",
          border: `1px solid ${value ? "rgba(0,255,120,0.25)" : "rgba(255,180,0,0.25)"}`,
        }}
      >
        <div
          className={`w-1 h-1 rounded-full ${value ? "animate-pulse" : ""}`}
          style={{
            background: value ? "rgba(0,255,120,0.9)" : "rgba(255,180,0,0.9)",
          }}
        />
        <span
          className="text-[7px] font-mono tracking-widest font-bold"
          style={{
            color: value ? "rgba(0,255,120,0.9)" : "rgba(255,180,0,0.9)",
          }}
        >
          {value ? trueLabel : falseLabel}
        </span>
      </div>
    </div>
  );
}

function ChipDot({ chip }: { chip: AtmosChipStatus }) {
  return (
    <div
      className="flex flex-col items-center gap-0.5 p-1 rounded-sm"
      style={{
        background: chip.active
          ? "rgba(0,120,255,0.08)"
          : "rgba(255,255,255,0.02)",
        border: chip.active
          ? "1px solid rgba(0,180,255,0.25)"
          : "1px solid rgba(255,255,255,0.07)",
      }}
    >
      <div
        className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${chip.active ? "animate-pulse" : ""}`}
        style={{
          background: chip.active
            ? "rgba(0,213,255,0.95)"
            : "rgba(255,255,255,0.15)",
          boxShadow: chip.active ? "0 0 5px rgba(0,213,255,0.7)" : "none",
        }}
      />
      <span
        className="text-[6px] font-mono tracking-wide leading-none text-center"
        style={{
          color: chip.active
            ? "rgba(0,213,255,0.75)"
            : "rgba(255,255,255,0.22)",
        }}
      >
        C{chip.id}
      </span>
      <span
        className="text-[5.5px] font-mono leading-none text-center"
        style={{
          color: chip.active
            ? "rgba(0,180,255,0.55)"
            : "rgba(255,255,255,0.15)",
        }}
      >
        {chip.shortName}
      </span>
    </div>
  );
}

// ─── Connection Status Row ─────────────────────────────────────────────────────

function ConnectionStatusRow({
  label,
  connected,
}: {
  label: string;
  connected: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <span
        className="text-[8px] font-mono tracking-widest"
        style={{ color: "rgba(0,150,255,0.55)" }}
      >
        {label}
      </span>
      <div className="flex items-center gap-1.5">
        <div
          className="w-1.5 h-1.5 rounded-full"
          style={{
            background: connected
              ? "rgba(0,255,120,0.9)"
              : "rgba(255,60,60,0.9)",
            boxShadow: connected
              ? "0 0 5px rgba(0,255,120,0.7)"
              : "0 0 5px rgba(255,60,60,0.5)",
          }}
        />
        <span
          className="text-[8px] font-mono font-bold tracking-widest"
          style={{
            color: connected ? "rgba(0,255,120,0.9)" : "rgba(255,80,80,0.85)",
          }}
        >
          {connected ? "✓ CONNECTED" : "DISCONNECTED"}
        </span>
      </div>
    </div>
  );
}

// ─── Spatial Field Visualizer ────────────────────────────────────────────────

function SpatialFieldVisualizer({
  sensorData,
}: {
  sensorData: AtmosState["sensorData"];
}) {
  const {
    leftEnergy,
    rightEnergy,
    forwardEnergy,
    backEnergy,
    aboveEnergy,
    belowEnergy,
    spatialEnergy,
  } = sensorData;
  const centerGlow = Math.round(spatialEnergy * 100);

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ height: "110px" }}
    >
      {/* Background rings */}
      <div
        className="absolute rounded-full"
        style={{
          width: "90px",
          height: "90px",
          border: "1px solid rgba(0,100,255,0.15)",
        }}
      />
      <div
        className="absolute rounded-full"
        style={{
          width: "60px",
          height: "60px",
          border: "1px solid rgba(0,130,255,0.2)",
        }}
      />

      {/* Center listener circle */}
      <div
        className="absolute rounded-full flex items-center justify-center transition-all duration-150"
        style={{
          width: "28px",
          height: "28px",
          background: `rgba(0,${80 + centerGlow},255,${0.15 + spatialEnergy * 0.25})`,
          border: `2px solid rgba(0,180,255,${0.3 + spatialEnergy * 0.5})`,
          boxShadow:
            centerGlow > 5
              ? `0 0 ${8 + centerGlow / 5}px rgba(0,180,255,${0.3 + spatialEnergy * 0.4})`
              : "none",
        }}
      >
        <span style={{ fontSize: "9px" }}>👤</span>
      </div>

      {/* LEFT */}
      <div
        className="absolute left-0 flex flex-col items-center gap-0.5 transition-all duration-150"
        style={{ opacity: 0.3 + leftEnergy * 0.7 }}
      >
        <div
          className="w-1 h-1 rounded-full"
          style={{
            background: `rgba(0,180,255,${0.4 + leftEnergy * 0.6})`,
            boxShadow:
              leftEnergy > 0.1
                ? `0 0 ${4 + leftEnergy * 8}px rgba(0,180,255,0.6)`
                : "none",
          }}
        />
        <span
          className="text-[7px] font-mono tracking-widest font-bold"
          style={{
            color: `rgba(0,${150 + Math.round(leftEnergy * 63)},255,0.9)`,
          }}
        >
          L
        </span>
      </div>

      {/* RIGHT */}
      <div
        className="absolute right-0 flex flex-col items-center gap-0.5 transition-all duration-150"
        style={{ opacity: 0.3 + rightEnergy * 0.7 }}
      >
        <div
          className="w-1 h-1 rounded-full"
          style={{ background: `rgba(100,100,255,${0.4 + rightEnergy * 0.6})` }}
        />
        <span
          className="text-[7px] font-mono tracking-widest font-bold"
          style={{
            color: `rgba(${100 + Math.round(rightEnergy * 55)},100,255,0.9)`,
          }}
        >
          R
        </span>
      </div>

      {/* FORWARD (top) */}
      <div
        className="absolute top-0 flex flex-col items-center gap-0.5 transition-all duration-150"
        style={{ opacity: 0.3 + forwardEnergy * 0.7 }}
      >
        <span
          className="text-[7px] font-mono font-bold"
          style={{ color: `rgba(180,80,255,${0.5 + forwardEnergy * 0.5})` }}
        >
          FWD
        </span>
        <div
          className="w-1 h-1 rounded-full"
          style={{
            background: `rgba(180,80,255,${0.4 + forwardEnergy * 0.6})`,
          }}
        />
      </div>

      {/* BACK (bottom-ish) */}
      <div
        className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-0.5 transition-all duration-150"
        style={{ opacity: 0.3 + backEnergy * 0.7 }}
      >
        <div
          className="w-1 h-1 rounded-full"
          style={{ background: `rgba(100,180,100,${0.4 + backEnergy * 0.6})` }}
        />
        <span
          className="text-[6px] font-mono"
          style={{ color: "rgba(100,200,100,0.6)" }}
        >
          BCK
        </span>
      </div>

      {/* ABOVE / BELOW corner indicators */}
      <div
        className="absolute top-0 right-1 flex flex-col items-center"
        style={{ opacity: 0.35 + aboveEnergy * 0.5 }}
      >
        <span
          className="text-[6px] font-mono"
          style={{ color: "rgba(0,200,255,0.55)" }}
        >
          ↑
        </span>
      </div>
      <div
        className="absolute bottom-0 right-1 flex flex-col items-center"
        style={{ opacity: 0.35 + belowEnergy * 0.5 }}
      >
        <span
          className="text-[6px] font-mono"
          style={{ color: "rgba(0,255,120,0.55)" }}
        >
          ↓
        </span>
      </div>
    </div>
  );
}

// ─── Speaker Follow Indicator ─────────────────────────────────────────────────

function SpeakerFollowIndicator() {
  return (
    <div
      className="flex items-center gap-2 px-2 py-1.5 rounded-sm"
      style={{
        background: "rgba(0,50,150,0.12)",
        border: "1px solid rgba(0,130,255,0.25)",
      }}
    >
      <div className="relative shrink-0 flex items-center justify-center w-6 h-6">
        <div
          className="absolute w-6 h-6 rounded-full animate-ping"
          style={{
            border: "1px solid rgba(0,180,255,0.3)",
            animationDuration: "2s",
          }}
        />
        <div
          className="absolute w-4 h-4 rounded-full animate-ping"
          style={{
            border: "1px solid rgba(0,213,255,0.4)",
            animationDuration: "2s",
            animationDelay: "0.5s",
          }}
        />
        <span style={{ fontSize: "11px", position: "relative", zIndex: 1 }}>
          🔈
        </span>
      </div>
      <div className="flex flex-col min-w-0">
        <span
          className="text-[8px] font-mono tracking-widest font-bold"
          style={{ color: "rgba(0,213,255,0.85)" }}
        >
          FOLLOWING QFX BT-15SP
        </span>
        <span
          className="text-[7px] font-mono tracking-widest"
          style={{ color: "rgba(0,150,255,0.5)" }}
        >
          SPATIAL FIELD ACTIVE — MOVES WITH SPEAKER
        </span>
      </div>
      <div
        className="shrink-0 w-1.5 h-1.5 rounded-full animate-pulse ml-auto"
        style={{
          background: "rgba(0,255,120,0.9)",
          boxShadow: "0 0 6px rgba(0,255,120,0.6)",
        }}
      />
    </div>
  );
}

// ─── Main Panel ───────────────────────────────────────────────────────────────

interface AtmosmashereProps {
  atmosState: AtmosState;
  wiredToEngine1?: boolean;
}

export function AtmosmasherePanel({
  atmosState,
  wiredToEngine1 = true,
}: AtmosmashereProps) {
  const { chips, sensorData, strengthNumber } = atmosState;
  const activeCount = chips.filter((c) => c.active).length;
  const allConnected = wiredToEngine1;

  return (
    <div
      className="slot-panel flex flex-col gap-3"
      data-ocid="atmosmasphere.panel"
      style={{
        background:
          "linear-gradient(135deg, rgba(0,8,30,0.98), rgba(0,5,22,0.97))",
        border: "1px solid rgba(0,100,255,0.3)",
        boxShadow: "0 0 20px rgba(0,80,255,0.08)",
      }}
    >
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-1.5">
            <div
              className="w-2 h-2 rounded-full animate-pulse shrink-0"
              style={{
                background: "rgba(0,213,255,0.95)",
                boxShadow: "0 0 8px rgba(0,213,255,0.7)",
              }}
            />
            <h3
              className="text-[11px] font-mono tracking-[0.2em] uppercase font-black"
              style={{
                color: "rgba(0,213,255,0.98)",
                textShadow: "0 0 12px rgba(0,213,255,0.5)",
              }}
            >
              ATMOSMASPHERE ENGINE — CONNECTED
            </h3>
          </div>
          <p
            className="text-[7px] font-mono tracking-[0.15em] uppercase ml-3.5"
            style={{ color: "rgba(0,150,255,0.5)" }}
          >
            20 Smart Chips + Sensors | Full 3D Spatial | Automatic | HRTF + Room
            Acoustics
          </p>
        </div>
        <span
          className="shrink-0 px-1.5 py-0.5 rounded-sm text-[8px] font-mono tracking-widest font-bold"
          style={{
            background: "rgba(0,255,120,0.1)",
            border: "1px solid rgba(0,255,120,0.45)",
            color: "rgba(0,255,120,0.95)",
            boxShadow: "0 0 8px rgba(0,255,120,0.25)",
          }}
          data-ocid="atmosmasphere.active_badge"
        >
          ACTIVE — AUTO
        </span>
      </div>

      {/* ── ENGINE 1 WIRED INDICATOR ── */}
      <Engine1WiredBadge wired={wiredToEngine1} />

      {/* ── CONNECTION STATUS — 3 required connections ── */}
      <div
        className="rounded-sm px-3 py-2 flex flex-col gap-1"
        style={{
          background: "rgba(0,255,120,0.04)",
          border: "1px solid rgba(0,255,120,0.2)",
        }}
        data-ocid="atmosmasphere.connection_status"
      >
        <p
          className="text-[8px] font-mono tracking-[0.2em] uppercase mb-0.5"
          style={{ color: "rgba(0,200,100,0.65)" }}
        >
          CONNECTION STATUS
        </p>
        <ConnectionStatusRow label="ENGINE 1 POWER" connected={allConnected} />
        <ConnectionStatusRow
          label="API/HTML/CHAINBLOCK → ENGINE 1"
          connected={allConnected}
        />
        <ConnectionStatusRow
          label="BROWSER SENSOR CHAIN"
          connected={allConnected}
        />
      </div>

      {/* ── Strength + power source ── */}
      <div
        className="flex items-center justify-between px-2 py-1.5 rounded-sm"
        style={{
          background: "rgba(0,30,90,0.2)",
          border: "1px solid rgba(0,100,255,0.2)",
        }}
      >
        <div className="flex flex-col gap-0.5">
          <span
            className="text-[10px] font-mono font-black tracking-widest"
            style={{
              color: "rgba(0,213,255,0.98)",
              textShadow: "0 0 10px rgba(0,213,255,0.6)",
            }}
            data-ocid="atmosmasphere.strength_number"
          >
            {strengthNumber}
          </span>
          <span
            className="text-[7px] font-mono tracking-widest"
            style={{ color: "rgba(0,130,255,0.45)" }}
          >
            {atmosState.powerSource}
          </span>
        </div>
        <div className="flex flex-col items-end gap-0.5">
          <span
            className="text-[7px] font-mono tracking-widest"
            style={{ color: "rgba(153,69,255,0.65)" }}
          >
            ⚡ Commander Protected
          </span>
          <span
            className="text-[6.5px] font-mono tracking-widest"
            style={{ color: "rgba(0,130,255,0.4)" }}
          >
            50,000,000,000 × 86 authority
          </span>
        </div>
      </div>

      {/* ── Spatial Field Visualizer ── */}
      <div
        className="rounded-sm p-2"
        style={{
          background: "rgba(0,5,20,0.6)",
          border: "1px solid rgba(0,80,200,0.2)",
        }}
        data-ocid="atmosmasphere.spatial_visualizer"
      >
        <p
          className="text-[8px] font-mono tracking-[0.2em] uppercase mb-1"
          style={{ color: "rgba(0,150,255,0.5)" }}
        >
          SPATIAL FIELD — 360°
        </p>
        <SpatialFieldVisualizer sensorData={sensorData} />
      </div>

      {/* ── 20 Live Sensor Readings ── */}
      <div
        className="rounded-sm p-2 flex flex-col gap-1"
        style={{
          background: "rgba(0,8,28,0.7)",
          border: "1px solid rgba(0,80,200,0.18)",
        }}
        data-ocid="atmosmasphere.sensor_bars"
      >
        <p
          className="text-[8px] font-mono tracking-[0.2em] uppercase mb-0.5"
          style={{ color: "rgba(0,150,255,0.5)" }}
        >
          20 LIVE SENSOR READINGS
        </p>
        {/* Directional (6) */}
        <p
          className="text-[6px] font-mono tracking-widest uppercase"
          style={{ color: "rgba(0,100,200,0.4)" }}
        >
          DIRECTIONAL SENSORS
        </p>
        <EnergyBar
          value={sensorData.leftEnergy}
          label="LEFT FIELD"
          color="rgba(0,180,255,0.9)"
        />
        <EnergyBar
          value={sensorData.rightEnergy}
          label="RIGHT FIELD"
          color="rgba(80,130,255,0.9)"
        />
        <EnergyBar
          value={sensorData.forwardEnergy}
          label="FORWARD"
          color="rgba(160,80,255,0.9)"
        />
        <EnergyBar
          value={sensorData.backEnergy}
          label="BACK"
          color="rgba(100,180,100,0.9)"
        />
        <EnergyBar
          value={sensorData.aboveEnergy}
          label="ABOVE"
          color="rgba(0,220,200,0.9)"
        />
        <EnergyBar
          value={sensorData.belowEnergy}
          label="BELOW"
          color="rgba(100,255,150,0.9)"
        />
        {/* Frequency bands (7) */}
        <p
          className="text-[6px] font-mono tracking-widest uppercase mt-0.5"
          style={{ color: "rgba(0,100,200,0.4)" }}
        >
          FREQUENCY BAND SENSORS
        </p>
        <EnergyBar
          value={sensorData.subBassEnergy}
          label="SUB BASS"
          color="rgba(153,69,255,0.9)"
        />
        <EnergyBar
          value={sensorData.bassEnergy}
          label="BASS"
          color="rgba(180,50,255,0.9)"
        />
        <EnergyBar
          value={sensorData.midBassEnergy}
          label="MID BASS"
          color="rgba(0,150,255,0.9)"
        />
        <EnergyBar
          value={sensorData.midEnergy}
          label="MID"
          color="rgba(0,213,255,0.9)"
        />
        <EnergyBar
          value={sensorData.highMidEnergy}
          label="HIGH MID"
          color="rgba(0,200,180,0.9)"
        />
        <EnergyBar
          value={sensorData.highEnergy}
          label="HIGHS"
          color="rgba(0,230,255,0.9)"
        />
        <EnergyBar
          value={sensorData.airEnergy}
          label="AIR/PRESENCE"
          color="rgba(200,240,255,0.8)"
        />
        {/* Spatial measurements (6) */}
        <p
          className="text-[6px] font-mono tracking-widest uppercase mt-0.5"
          style={{ color: "rgba(0,100,200,0.4)" }}
        >
          SPATIAL MEASUREMENTS
        </p>
        <EnergyBar
          value={sensorData.spatialEnergy}
          label="SPATIAL ENERGY"
          color="rgba(0,213,255,0.95)"
        />
        <EnergyBar
          value={sensorData.roomReflection}
          label="ROOM REFLECT"
          color="rgba(150,120,255,0.9)"
        />
        <EnergyBar
          value={sensorData.stereoWidth}
          label="STEREO WIDTH"
          color="rgba(255,120,180,0.9)"
        />
        <EnergyBar
          value={sensorData.phaseCoherence}
          label="PHASE COHERENCE"
          color="rgba(0,255,200,0.9)"
        />
        <EnergyBar
          value={sensorData.dynamicRange}
          label="DYNAMIC RANGE"
          color="rgba(255,180,0,0.9)"
        />
        <EnergyBar
          value={sensorData.transientEnergy}
          label="TRANSIENTS"
          color="rgba(255,80,80,0.9)"
        />
        {/* Bass grounded (1 bool) */}
        <BoolSensor
          label="BASS FLOOR"
          value={sensorData.bassGrounded}
          trueLabel="GROUNDED"
          falseLabel="FLOATING"
        />
      </div>

      {/* ── 20 Chip Status Grid — all ACTIVE when engine is on ── */}
      <div
        className="rounded-sm p-2"
        style={{
          background: "rgba(0,5,20,0.6)",
          border: "1px solid rgba(0,80,200,0.18)",
        }}
        data-ocid="atmosmasphere.chip_grid"
      >
        <div className="flex items-center justify-between mb-1.5">
          <p
            className="text-[8px] font-mono tracking-[0.2em] uppercase"
            style={{ color: "rgba(0,150,255,0.5)" }}
          >
            20 SMART CHIPS
          </p>
          <span
            className="text-[8px] font-mono font-bold"
            style={{
              color:
                activeCount === 20
                  ? "rgba(0,255,120,0.9)"
                  : "rgba(255,180,0,0.8)",
            }}
          >
            {activeCount}/20 {activeCount === 20 ? "ACTIVE" : "WARMING UP"}
          </span>
        </div>
        <div
          className="grid gap-1"
          style={{ gridTemplateColumns: "repeat(5, 1fr)" }}
        >
          {chips.map((chip) => (
            <ChipDot key={chip.id} chip={chip} />
          ))}
        </div>
      </div>

      {/* ── Speaker Follow Indicator ── */}
      <SpeakerFollowIndicator />

      {/* ── Notes ── */}
      <div
        className="rounded-sm px-2 py-1.5 flex flex-col gap-0.5"
        style={{
          background: "rgba(0,30,80,0.12)",
          border: "1px solid rgba(0,80,180,0.15)",
        }}
      >
        {[
          "ENGINE 1 POWER — DIRECT WIRE — ALWAYS ACTIVE",
          "Sounds FULL and THICK in every direction",
          "Nothing spaced out — nothing thinned",
          "Sound projects from the room, not from the speaker",
          "HRTF spatial model + Room Acoustics ConvolverNode active",
        ].map((note) => (
          <div key={note} className="flex items-center gap-1.5">
            <div
              className="w-0.5 h-0.5 rounded-full shrink-0"
              style={{ background: "rgba(0,150,255,0.5)" }}
            />
            <span
              className="text-[7px] font-mono tracking-widest"
              style={{ color: "rgba(0,130,255,0.45)" }}
            >
              {note}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
