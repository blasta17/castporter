export function StatusPill({ status }: { status: string }) {
  const label = status.toLowerCase().replaceAll('_', ' ');
  return <span className={`status status-${label.replaceAll(' ', '-')}`}>{label}</span>;
}
