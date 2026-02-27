interface Props {
  current: number;
  total: number;
}

export default function Progress({ current, total }: Props) {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-lg mx-auto">
      {/* Spinner */}
      <div className="w-12 h-12 border-4 border-border border-t-accent rounded-full animate-spin" />

      <p className="text-lg font-medium">
        Extracting frame {current} of {total}...
      </p>

      {/* Progress bar */}
      <div className="w-full bg-surface rounded-full h-3 overflow-hidden">
        <div
          className="h-full bg-accent rounded-full transition-all duration-300 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>

      <p className="text-sm text-text-muted">{pct}%</p>
    </div>
  );
}
