import type { SeparationSectionsState } from "@/types/player";

// ─── Props ────────────────────────────────────────────────────────────────────

interface SeparationSectionsPanelProps {
  state: SeparationSectionsState;
}

const STATUS_CONFIG = {
  ok: { color: "rgba(0,255,120,0.9)", label: "OK", bg: "rgba(0,80,40,0.15)" },
  monitoring: {
    color: "rgba(0,180,255,0.9)",
    label: "MON",
    bg: "rgba(0,60,120,0.15)",
  },
  correcting: {
    color: "rgba(255,200,0,0.9)",
    label: "FIX",
    bg: "rgba(80,60,0,0.2)",
  },
};

// ─── Component ────────────────────────────────────────────────────────────────

export function SeparationSectionsPanel({
  state,
}: SeparationSectionsPanelProps) {
  return (
    <div
      className="mx-4 my-3 rounded-sm overflow-hidden"
      data-ocid="separation_sections.panel"
      style={{
        background:
          "linear-gradient(135deg, rgba(0,6,25,0.97), rgba(0,12,40,0.96))",
        border: "1px solid rgba(0,130,255,0.28)",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2"
        style={{
          background: "rgba(0,4,18,0.65)",
          borderBottom: "1px solid rgba(0,80,200,0.18)",
        }}
      >
        <div>
          <span
            className="text-[9px] font-mono tracking-[0.25em] font-bold uppercase"
            style={{ color: "rgba(0,200,255,0.9)" }}
          >
            20-30 × 86 SECTIONS
          </span>
          <p
            className="text-[6.5px] font-mono tracking-widest mt-0.5"
            style={{ color: "rgba(0,120,200,0.5)" }}
          >
            EACH PROBLEM — ITS OWN DEDICATED SLOT — NOTHING STACKED
          </p>
        </div>
        <span
          className="text-[8px] font-mono font-bold tracking-widest"
          style={{ color: "rgba(0,200,255,0.7)" }}
        >
          {state.totalSections} SLOTS
        </span>
      </div>

      {/* Sections grid */}
      <div className="p-3 grid grid-cols-1 gap-2">
        {state.sections.map((section) => {
          const cfg = STATUS_CONFIG[section.status];
          return (
            <div
              key={section.id}
              className="flex items-center gap-3 rounded-sm px-3 py-2"
              data-ocid={`separation_sections.section.${section.id}`}
              style={{
                background: cfg.bg,
                border: `1px solid ${cfg.color.replace(/[\d.]+\)$/, "0.25)")}`,
              }}
            >
              {/* Section number */}
              <div
                className="w-7 h-7 rounded-sm flex items-center justify-center shrink-0 text-[10px] font-mono font-black"
                style={{
                  background: cfg.color.replace(/[\d.]+\)$/, "0.12)"),
                  border: `1px solid ${cfg.color.replace(/[\d.]+\)$/, "0.3)")}`,
                  color: cfg.color,
                }}
              >
                {section.id}
              </div>

              {/* Section info */}
              <div className="flex-1 min-w-0">
                <p
                  className="text-[7.5px] font-mono tracking-[0.18em] uppercase font-bold truncate"
                  style={{ color: "rgba(200,220,255,0.85)" }}
                >
                  {section.name}
                </p>
                <p
                  className="text-[6px] font-mono tracking-widest mt-0.5"
                  style={{ color: "rgba(130,150,200,0.45)" }}
                >
                  STRENGTH: {section.strength}
                </p>
              </div>

              {/* Status LED + label */}
              <div className="flex items-center gap-1.5 shrink-0">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{
                    background: cfg.color,
                    boxShadow: `0 0 6px ${cfg.color}`,
                    animation:
                      section.status === "correcting"
                        ? "pulse 0.8s ease-in-out infinite"
                        : section.status === "monitoring"
                          ? "pulse 2s ease-in-out infinite"
                          : "none",
                  }}
                />
                <span
                  className="text-[7px] font-mono tracking-widest font-bold"
                  style={{ color: cfg.color }}
                >
                  {cfg.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Everything plays nice footer */}
      <div
        className="px-3 py-1.5 flex items-center gap-2"
        style={{
          background: "rgba(0,3,14,0.5)",
          borderTop: "1px solid rgba(0,60,150,0.15)",
        }}
      >
        <div
          className="w-1.5 h-1.5 rounded-full"
          style={{
            background: "rgba(0,255,120,0.7)",
            boxShadow: "0 0 4px rgba(0,255,120,0.5)",
          }}
        />
        <span
          className="text-[6.5px] font-mono tracking-widest uppercase"
          style={{ color: "rgba(0,180,80,0.5)" }}
        >
          ALL SECTIONS PLAY NICE — ZERO STACKING — EACH SLOT INDEPENDENT
        </span>
      </div>
    </div>
  );
}
