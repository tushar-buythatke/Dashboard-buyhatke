import { useCallback, useRef } from 'react';

/**
 * Cursor-follow spotlight for `.halo-spotlight` surfaces.
 *
 * Writes the pointer position to the `--mx` / `--my` custom properties the
 * class reads. Updates are batched into a single rAF so a grid of cards
 * costs one style write per frame, not one per pointer event.
 *
 * Usage:
 *   const spotlight = useSpotlight();
 *   <div className="halo-card halo-spotlight" {...spotlight} />
 */
export function useSpotlight() {
  const frame = useRef<number | null>(null);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLElement>) => {
    const el = e.currentTarget;
    const { clientX, clientY } = e;

    if (frame.current !== null) return;

    frame.current = requestAnimationFrame(() => {
      frame.current = null;
      const rect = el.getBoundingClientRect();
      el.style.setProperty('--mx', `${clientX - rect.left}px`);
      el.style.setProperty('--my', `${clientY - rect.top}px`);
    });
  }, []);

  const onPointerLeave = useCallback((e: React.PointerEvent<HTMLElement>) => {
    if (frame.current !== null) {
      cancelAnimationFrame(frame.current);
      frame.current = null;
    }
    e.currentTarget.style.removeProperty('--mx');
    e.currentTarget.style.removeProperty('--my');
  }, []);

  return { onPointerMove, onPointerLeave };
}
