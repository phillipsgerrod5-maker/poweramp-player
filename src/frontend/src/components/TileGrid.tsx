import type { ReactNode } from "react";

interface TileGridProps {
  children: ReactNode;
}

export function TileGrid({ children }: TileGridProps) {
  return (
    <div className="px-3 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
      {children}
    </div>
  );
}
