import { useMemo } from 'react';
import type { PricePoint } from '../types';

/** Dependency-free SVG sparkline of observed price points. */
export function PriceSparkline({ points, height = 60 }: { points: PricePoint[]; height?: number }) {
  const path = useMemo(() => {
    if (points.length < 2) return null;
    const prices = points.map((p) => p.priceSol);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const range = max - min || 1;
    const width = 100;
    const step = width / (points.length - 1);
    const d = points
      .map((p, i) => {
        const x = i * step;
        const y = height - ((p.priceSol - min) / range) * (height - 8) - 4;
        return `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`;
      })
      .join(' ');
    return { d, min, max };
  }, [points, height]);

  if (!path) {
    return (
      <p className="py-4 text-center text-xs text-zinc-400">
        Not enough price data yet — history accumulates from live changes this session.
      </p>
    );
  }

  return (
    <div>
      <svg
        viewBox={`0 0 100 ${height}`}
        preserveAspectRatio="none"
        className="h-16 w-full"
        role="img"
        aria-label="Price history sparkline"
      >
        <path d={path.d} fill="none" stroke="#9945FF" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="flex justify-between text-[10px] text-zinc-400">
        <span>min {path.min} SOL</span>
        <span>max {path.max} SOL</span>
      </div>
    </div>
  );
}
