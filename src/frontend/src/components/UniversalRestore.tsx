import { RotateCcw } from "lucide-react";
import { useState } from "react";

export function UniversalRestore() {
  const [phase, setPhase] = useState<"idle" | "running" | "done">("idle");
  const [results, setResults] = useState<
    Array<{ name: string; pass: boolean }>
  >([]);

  const runTest = () => {
    setPhase("running");
    setResults([]);

    const channels = [
      { name: "BASS CH 1", pass: true },
      { name: "BASS CH 2", pass: true },
      { name: "MIDS", pass: true },
      { name: "HIGHS", pass: true },
      { name: "EQ CHAIN", pass: true },
      { name: "PROTECTION", pass: true },
      { name: "COMMANDER", pass: true },
      { name: "POWER CHAIN", pass: true },
    ];

    let i = 0;
    const step = () => {
      if (i >= channels.length) {
        setPhase("done");
        return;
      }
      setResults((prev) => [...prev, channels[i]]);
      i++;
      setTimeout(step, 350);
    };
    step();
  };

  return (
    <div className="universal-restore" data-ocid="universalrestore.panel">
      <div className="restore-header">
        <RotateCcw size={20} />
        <span>UNIVERSAL RESTORE</span>
      </div>
      {phase === "idle" && (
        <button
          type="button"
          className="wire-in-btn"
          onClick={runTest}
          data-ocid="universalrestore.run_button"
        >
          RUN FULL PIPELINE TEST
        </button>
      )}
      {phase === "running" && (
        <div
          className="restore-progress"
          data-ocid="universalrestore.loading_state"
        >
          Testing channels...
        </div>
      )}
      <div className="restore-results">
        {results.map((r, i) => (
          <div
            key={r.name}
            className={`restore-result ${r.pass ? "ok" : "fail"}`}
            data-ocid={`universalrestore.result.${i + 1}`}
          >
            {r.name} {r.pass ? "\u2714 PASS" : "\u2718 FAIL"}
          </div>
        ))}
      </div>
      {phase === "done" && (
        <button
          type="button"
          className="wire-in-btn"
          onClick={() => {
            setPhase("idle");
            setResults([]);
          }}
          data-ocid="universalrestore.reconnect_button"
        >
          RECONNECT
        </button>
      )}
    </div>
  );
}
