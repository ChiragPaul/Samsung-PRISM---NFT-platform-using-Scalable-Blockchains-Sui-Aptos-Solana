import { useCallback, useRef } from 'react';

/**
 * 3D hover-tilt: the element rotates toward the cursor with a subtle lift and a
 * moving glossy highlight (set via the `--mx`/`--my` CSS vars). Returns props to
 * spread onto the element. Disabled when the user prefers reduced motion.
 */
export function useTilt(maxDeg = 8) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  const onMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (reduce) return;
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width; // 0..1
      const py = (e.clientY - rect.top) / rect.height; // 0..1
      const rotY = (px - 0.5) * 2 * maxDeg;
      const rotX = -(py - 0.5) * 2 * maxDeg;
      el.style.setProperty('--rx', `${rotX.toFixed(2)}deg`);
      el.style.setProperty('--ry', `${rotY.toFixed(2)}deg`);
      el.style.setProperty('--mx', `${(px * 100).toFixed(1)}%`);
      el.style.setProperty('--my', `${(py * 100).toFixed(1)}%`);
    },
    [maxDeg, reduce],
  );

  const onMouseLeave = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty('--rx', '0deg');
    el.style.setProperty('--ry', '0deg');
  }, []);

  return { ref, onMouseMove, onMouseLeave, enabled: !reduce };
}
