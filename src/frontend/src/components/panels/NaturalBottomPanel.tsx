import { PanelShell } from "./PanelShell";

interface Props {
  onClose: () => void;
}

export function NaturalBottomPanel({ onClose }: Props) {
  return (
    <PanelShell
      title="NATURAL BOTTOM"
      subtitle="Always present · 60Hz shelf +2dB"
      onClose={onClose}
      data-ocid="naturalbottom.dialog"
    >
      <div className="smd-meter text-center">
        ALWAYS ON · NEVER A TOGGLE · +2dB SHELF
      </div>
      <div className="slot-panel flex flex-col gap-2">
        <div className="flex justify-between">
          <span className="text-xs font-mono text-foreground/70">
            FREQUENCY
          </span>
          <span className="text-xs font-mono text-orange-400">60Hz</span>
        </div>
        <div className="flex justify-between">
          <span className="text-xs font-mono text-foreground/70">TYPE</span>
          <span className="text-xs font-mono text-orange-400">Low Shelf</span>
        </div>
        <div className="flex justify-between">
          <span className="text-xs font-mono text-foreground/70">GAIN</span>
          <span className="text-xs font-mono text-green-400">+2dB (fixed)</span>
        </div>
        <div className="flex justify-between">
          <span className="text-xs font-mono text-foreground/70">STATE</span>
          <span className="text-xs font-mono text-green-400">
            ✓ ALWAYS ACTIVE
          </span>
        </div>
      </div>
      <div className="text-xs text-foreground/40 text-center font-mono">
        Natural Bottom is the foundation that never goes away.
        <br />
        Bass has soul even when other features are off.
      </div>
    </PanelShell>
  );
}
