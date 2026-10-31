import type { GpsView } from '@/domain/gps';
import { cn } from '@/lib/cn';

/** GPS MIRA: progresso pelas 12 etapas + trilha da dimensão atual. */
export function GpsBar({ gps, compact = false }: { gps: GpsView; compact?: boolean }) {
  return (
    <div aria-label="GPS MIRA" className="space-y-2">
      <div className="flex items-center gap-1" role="list">
        {gps.stages.map((s) => (
          <div
            key={s.key}
            role="listitem"
            title={s.label}
            aria-current={s.status === 'atual' ? 'step' : undefined}
            className={cn('h-1.5 flex-1 rounded-full', s.status === 'feito' ? 'bg-sage-500' : s.status === 'atual' ? 'bg-lavender-500' : 'bg-sand-200')}
          />
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
        <span className="font-semibold uppercase tracking-wide text-lavender-700">{gps.stages[gps.stageIndex]?.label}</span>
        {!compact && gps.breadcrumb.length > 0 && <span className="text-ink-300">·</span>}
        {!compact && gps.breadcrumb.map((b, i) => (
          <span key={i} className="text-ink-500">
            {i > 0 && <span className="mr-2 text-ink-300">›</span>}
            {b}
          </span>
        ))}
      </div>
    </div>
  );
}
