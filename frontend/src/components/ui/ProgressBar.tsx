interface ProgressBarProps {
  current: number;
  total: number;
  color?: string;
}

export function ProgressBar({
  current,
  total,
  color = "bg-green-500",
}: ProgressBarProps) {
  const pct = Math.min((current / total) * 100, 100);
  return (
    <div className="w-full bg-gray-700 rounded-full h-4 overflow-hidden">
      <div
        className={`${color} h-full rounded-full transition-all duration-500`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
