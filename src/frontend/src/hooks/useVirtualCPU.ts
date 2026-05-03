import type { VirtualCPUState } from "@/types/player";
import { useEffect, useRef, useState } from "react";

export interface UseVirtualCPUReturn {
  state: VirtualCPUState;
  registerTask: (key: string, fn: () => void) => void;
  unregisterTask: (key: string) => void;
}

export function useVirtualCPU(): UseVirtualCPUReturn {
  const tasksRef = useRef<Map<string, () => void>>(new Map());
  const rafRef = useRef<number | null>(null);
  const [state] = useState<VirtualCPUState>({ active: true, chipCount: 25 });

  useEffect(() => {
    const loop = () => {
      for (const fn of tasksRef.current.values()) {
        try {
          fn();
        } catch {}
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const registerTask = (key: string, fn: () => void) => {
    tasksRef.current.set(key, fn);
  };
  const unregisterTask = (key: string) => {
    tasksRef.current.delete(key);
  };

  return { state, registerTask, unregisterTask };
}
