import { ReactNode } from 'react';
import { VortexTwist } from '@/components/effects/vortex-twist';
import { HorizonGlow } from '@/components/effects/horizon-glow';
import { SolarFlare } from '@/components/effects/solar-flare';
import { cn } from '@/lib/utils';

interface VelvetShellProps {
  children: ReactNode;
  className?: string;
  /** Show full-page vortex (hero pages) */
  vortex?: boolean;
  /** Subtle horizon wave at bottom */
  horizon?: boolean;
  /** Radial solar flare accent (hero) */
  flare?: boolean;
}

export function VelvetShell({
  children,
  className,
  vortex = false,
  horizon = false,
  flare = false,
}: VelvetShellProps) {
  return (
    <div className={cn('relative min-h-full overflow-hidden', className)}>
      {/* Ambient velvet glow — restrained, single source */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 70% 45% at 50% -8%, rgba(124, 111, 235, 0.1), transparent 65%),
            var(--bg-canvas)
          `,
        }}
      />

      {vortex && (
        <VortexTwist
          intensity={0.14}
          speed={0.25}
          colorR={0.55}
          colorG={0.25}
          colorB={0.75}
          backgroundColor="transparent"
          className="opacity-60 mix-blend-screen"
        />
      )}
      {horizon && (
        <HorizonGlow
          intensity={0.12}
          amplitude={0.2}
          backgroundColor="transparent"
          className="bottom-0 top-auto h-1/2 opacity-40 mix-blend-screen"
        />
      )}
      {flare && (
        <SolarFlare
          intensity={0.18}
          speed={0.28}
          colorR={0.55}
          colorG={0.28}
          colorB={0.82}
          backgroundColor="transparent"
          className="top-0 h-[55%] opacity-50 mix-blend-screen"
        />
      )}

      {/* Fine grain — the velvet texture */}
      <div className="velvet-grain pointer-events-none absolute inset-0 opacity-[0.025]" />

      <div className="relative z-[1]">{children}</div>
    </div>
  );
}
