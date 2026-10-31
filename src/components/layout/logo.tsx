/** Marca MIRA: círculo concêntrico discreto (sem simbologia mística carregada). */
export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <circle cx="24" cy="24" r="22" fill="#e1ebe2" />
      <circle cx="24" cy="24" r="14" fill="none" stroke="#5f8a68" strokeWidth="2" />
      <circle cx="24" cy="24" r="6" fill="#7a6fa8" opacity="0.85" />
      <line x1="24" y1="2" x2="24" y2="12" stroke="#5f8a68" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
