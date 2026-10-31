import { Badge } from '@/components/ui/misc';
import { PHASE_LABELS } from '@/domain/session-machine';
import type { SessionPhase } from '@/domain/types';

export function PhaseBadge({ phase }: { phase: SessionPhase }) {
  const tone = phase === 'encerrada' ? 'sage' : phase === 'cancelada' ? 'neutral' : phase === 'registro' ? 'amber' : 'lavender';
  return <Badge tone={tone}>{PHASE_LABELS[phase]}</Badge>;
}
