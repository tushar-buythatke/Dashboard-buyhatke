import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Pin, PinOff, Repeat } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export interface CreativeItem {
  adId: string | number;
  name: string;
  url: string;
}

const isVideo = (u: string) => /\.(mp4|webm|ogg|mov)(\?|$)/i.test(u) || u.includes('video');
const pinKey = (id: string | number) => `campaign_cover_${id}`;

function readPin(id: string | number) {
  try { return localStorage.getItem(pinKey(id)); } catch { return null; }
}
function writePin(id: string | number, adId: string | null) {
  try {
    if (adId === null) localStorage.removeItem(pinKey(id));
    else localStorage.setItem(pinKey(id), adId);
  } catch { /* storage blocked: pin just won't persist */ }
}

function Media({ url, className }: { url: string; className?: string }) {
  return isVideo(url) ? (
    <video src={url} muted autoPlay loop playsInline className={cn('h-full w-full object-cover', className)} />
  ) : (
    <img src={url} alt="" loading="lazy" draggable={false} className={cn('h-full w-full object-cover', className)} />
  );
}

interface CreativeCoverProps {
  campaignId: string | number;
  name: string;
  creatives: CreativeItem[];
  className?: string;
  interval?: number;
  // Lets the viewer pin one ad's creative or rotate through all of them.
  pickable?: boolean;
}

export function CreativeCover({ campaignId, name, creatives, className, interval = 2800, pickable = true }: CreativeCoverProps) {
  const [pinned, setPinned] = useState<string | null>(() => readPin(campaignId));
  const [i, setI] = useState(0);

  const pinnedItem = pinned ? creatives.find((c) => String(c.adId) === pinned) : undefined;
  const rotating = !pinnedItem && creatives.length > 1;

  useEffect(() => {
    if (!rotating) return;
    // Stagger start so a full list doesn't flip in lockstep.
    const offset = (Number(String(campaignId).replace(/\D/g, '')) || 0) % 7 * 220;
    let id: number;
    const t = window.setTimeout(() => {
      id = window.setInterval(() => setI((n) => (n + 1) % creatives.length), interval);
    }, offset);
    return () => { clearTimeout(t); clearInterval(id); };
  }, [rotating, creatives.length, interval, campaignId]);

  const current = pinnedItem ?? creatives[i % Math.max(creatives.length, 1)];

  const pin = (adId: string | null) => {
    writePin(campaignId, adId);
    setPinned(adId);
  };

  const face = (
    <span className={cn('relative block overflow-hidden bg-[var(--h-surface-3)]', pickable && creatives.length > 0 ? 'h-full w-full' : className)}>
      {current ? (
        <AnimatePresence initial={false} mode="popLayout">
          <motion.span
            key={current.url}
            initial={{ opacity: 0, scale: 1.08 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0"
          >
            <Media url={current.url} />
          </motion.span>
        </AnimatePresence>
      ) : (
        <span className="absolute inset-0 flex items-center justify-center bg-[var(--e-ink-pill)] font-[var(--h-font-display)] text-[1.4em] font-medium text-[var(--h-canvas)]">
          {name.trim().charAt(0).toUpperCase() || '?'}
        </span>
      )}
      {rotating && (
        <span className="absolute bottom-1.5 left-1/2 flex -translate-x-1/2 gap-[3px]">
          {creatives.slice(0, 6).map((c, n) => (
            <span
              key={String(c.adId)}
              className={cn('h-[3px] rounded-full bg-white/90 shadow transition-all', n === i % creatives.length ? 'w-3' : 'w-[3px] opacity-60')}
            />
          ))}
        </span>
      )}
      {pinnedItem && (
        <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-black/60 text-white">
          <Pin className="h-2.5 w-2.5" />
        </span>
      )}
    </span>
  );

  if (!pickable || creatives.length === 0) return face;

  return (
    <Popover>
      <PopoverTrigger asChild onClick={(e) => e.stopPropagation()}>
        <button type="button" title="Choose cover" className={cn('block overflow-hidden transition-transform duration-300 hover:scale-[1.03] active:scale-95', className)}>
          {face}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" side="bottom" sideOffset={8} collisionPadding={16} className="z-[100001] w-[320px] rounded-[22px] p-3" onClick={(e) => e.stopPropagation()}>
        <p className="px-1 pb-2 text-[12px] text-[var(--h-ink-3)]">Campaign cover · {creatives.length} creatives</p>
        <button
          onClick={() => pin(null)}
          className={cn(
            'mb-2 flex w-full items-center gap-2 rounded-full px-3 py-2 text-[12.5px] font-bold transition-colors',
            !pinnedItem ? 'bg-[var(--e-ink-pill)] text-[var(--h-canvas)]' : 'bg-[var(--h-surface-3)] text-[var(--h-ink)] hover:bg-[var(--h-surface-2)]'
          )}
        >
          <Repeat className="h-3.5 w-3.5" /> Rotate all creatives
        </button>
        <div className="grid max-h-[min(260px,40vh)] grid-cols-3 gap-2 overflow-y-auto">
          {creatives.map((c) => {
            const active = pinnedItem?.adId === c.adId;
            return (
              <button
                key={String(c.adId)}
                title={c.name}
                onClick={() => pin(active ? null : String(c.adId))}
                className={cn(
                  'group relative aspect-square overflow-hidden rounded-[14px] bg-[var(--h-surface-3)] transition-all',
                  active ? 'ring-2 ring-[var(--h-iris-500)] ring-offset-2 ring-offset-[var(--h-surface)]' : 'hover:opacity-85'
                )}
              >
                <Media url={c.url} />
                <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/70 to-transparent px-1.5 pb-1 pt-3 text-left text-[10px] font-medium text-white">
                  {c.name}
                </span>
                {active && (
                  <span className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--h-iris-500)] text-white">
                    <PinOff className="h-3 w-3" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
