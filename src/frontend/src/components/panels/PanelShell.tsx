// Shared slider component for all panels
import type React from "react";

interface Props {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  color?: string;
  onChange: (v: number) => void;
  readOnly?: boolean;
  "data-ocid"?: string;
}

export function AmpSlider({
  label,
  value,
  min,
  max,
  step = 1,
  unit = "",
  color = "#00d5ff",
  onChange,
  readOnly,
  ...rest
}: Props) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between items-center">
        <span className="text-xs font-mono text-foreground/70 tracking-wider uppercase">
          {label}
        </span>
        <span className="text-xs font-mono" style={{ color }}>
          {value.toFixed(step < 1 ? 1 : 0)}
          {unit}
        </span>
      </div>
      <input
        type="range"
        className="blue-slider w-full"
        min={min}
        max={max}
        step={step}
        value={value}
        readOnly={readOnly}
        onChange={
          readOnly ? undefined : (e) => onChange(Number(e.target.value))
        }
        data-ocid={rest["data-ocid"]}
        aria-label={label}
        style={{ "--slider-color": color } as React.CSSProperties}
      />
    </div>
  );
}

interface ToggleProps {
  label: string;
  enabled: boolean;
  onToggle: (v: boolean) => void;
  "data-ocid"?: string;
}
export function AmpToggle({ label, enabled, onToggle, ...rest }: ToggleProps) {
  return (
    <button
      type="button"
      onClick={() => onToggle(!enabled)}
      data-ocid={rest["data-ocid"]}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-mono tracking-wider uppercase transition-all ${
        enabled
          ? "bg-primary/20 border border-primary/60 text-primary"
          : "bg-muted/30 border border-border/40 text-foreground/50"
      }`}
    >
      <span
        className={`w-2 h-2 rounded-full flex-shrink-0 ${enabled ? "bg-green-400" : "bg-muted-foreground/40"}`}
      />
      {label}: <span className="font-bold">{enabled ? "ON" : "OFF"}</span>
    </button>
  );
}

interface PanelProps {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  "data-ocid"?: string;
}
export function PanelShell({
  title,
  subtitle,
  onClose,
  children,
  ...rest
}: PanelProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: "rgba(0,5,20,0.85)", backdropFilter: "blur(6px)" }}
      data-ocid={rest["data-ocid"]}
    >
      <div
        className="w-full max-w-lg panel-bg rounded-t-2xl p-5 pb-8 animate-fade-in"
        style={{ maxHeight: "85dvh", overflowY: "auto" }}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2
              className="text-sm font-mono font-bold tracking-widest uppercase text-glow"
              style={{ color: "#00d5ff" }}
            >
              {title}
            </h2>
            {subtitle && (
              <p className="text-xs text-foreground/50 mt-0.5">{subtitle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            data-ocid="panel.close_button"
            className="w-8 h-8 rounded-full flex items-center justify-center text-foreground/60 hover:text-foreground border border-border/40 hover:border-border transition-colors"
            aria-label="Close panel"
          >
            ✕
          </button>
        </div>
        <div className="gauge-wire active mb-4" />
        <div className="flex flex-col gap-4">{children}</div>
      </div>
    </div>
  );
}
