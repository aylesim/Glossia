"use client";

import type { ReactNode } from "react";
import { getNodeTypeChromeColors } from "@/lib/node-chrome";

type NodeTypeFrameProps = {
  typeId: string;
  className?: string;
  title?: string;
  children: ReactNode;
};

export default function NodeTypeFrame({ typeId, className = "", title, children }: NodeTypeFrameProps) {
  const { accent, tint } = getNodeTypeChromeColors(typeId);
  return (
    <div
      title={title}
      className={`flex flex-col overflow-hidden rounded-md border border-[var(--border)] transition-[border-color,box-shadow] ${className}`}
      style={{ backgroundColor: tint }}
    >
      <div className="h-2 w-full shrink-0" style={{ backgroundColor: accent }} aria-hidden />
      {children}
    </div>
  );
}
