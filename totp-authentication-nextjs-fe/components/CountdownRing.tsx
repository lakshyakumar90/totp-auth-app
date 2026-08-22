"use client";

import { useMemo } from "react";

const SIZE = 46;
const STROKE = 4;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

interface Props {
  seconds: number; // seconds remaining in the current window
  max?: number; // window length (seconds)
}

/**
 * Circular countdown ring. Color shifts from indigo -> amber -> red and the
 * ring pulses as it approaches 0.
 */
export default function CountdownRing({ seconds, max = 30 }: Props) {
  const clamped = Math.max(0, Math.min(max, seconds));
  const fraction = clamped / max;
  const progress = 1 - fraction;

  const { stroke, className, fill } = useMemo(() => {
    if (clamped <= 5) {
      return {
        stroke: "#f43f5e",
        className: "ring-pulse",
        fill: "#f43f5e",
      };
    }
    if (clamped <= 10) {
      return { stroke: "#f59e0b", className: "", fill: "#f59e0b" };
    }
    return { stroke: "#8b5cf6", className: "", fill: "#a78bfa" };
  }, [clamped]);

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg
        width={SIZE}
        height={SIZE}
        className="rotate-[-90deg]"
        viewBox={`0 0 ${SIZE} ${SIZE}`}
      >
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="#26262a"
          strokeWidth={STROKE}
        />
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke={stroke}
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE * progress}
          className={className}
          style={{ transition: "stroke-dashoffset 1s linear" }}
        />
      </svg>
      <span
        className="absolute font-mono text-[11px] font-semibold"
        style={{ color: fill }}
      >
        {clamped}
      </span>
    </div>
  );
}