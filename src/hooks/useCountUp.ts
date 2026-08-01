import { useEffect, useRef, useState } from 'react';

const EASE_OUT = (t: number) => 1 - Math.pow(1 - t, 3);

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Animates a number from its previous value to `value`.
 *
 * Returns the in-flight value; render it with `.num` so the tabular figures
 * stop the layout from twitching while it counts. Respects reduced motion by
 * jumping straight to the target.
 */
export function useCountUp(value: number, duration = 750): number {
  const [display, setDisplay] = useState(value);
  const from = useRef(value);
  const frame = useRef<number | null>(null);

  useEffect(() => {
    if (!Number.isFinite(value)) {
      setDisplay(0);
      return;
    }

    if (prefersReducedMotion() || from.current === value) {
      from.current = value;
      setDisplay(value);
      return;
    }

    const start = performance.now();
    const origin = from.current;
    const delta = value - origin;

    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      setDisplay(origin + delta * EASE_OUT(t));
      if (t < 1) {
        frame.current = requestAnimationFrame(tick);
      } else {
        from.current = value;
        frame.current = null;
      }
    };

    frame.current = requestAnimationFrame(tick);

    return () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
      from.current = value;
    };
  }, [value, duration]);

  return display;
}
