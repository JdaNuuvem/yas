interface ProgressBarProps {
  current: number;
  total: number;
}

export function ProgressBar({ current, total }: ProgressBarProps) {
  const pct = Math.min((current / total) * 100, 100);
  return (
    <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-1000 ease-out animate-shimmer"
        style={{
          width: `${pct}%`,
          background:
            "linear-gradient(90deg, #2d6a4f, #40916c, #2d6a4f, #40916c)",
          backgroundSize: "200% 100%",
        }}
      />
    </div>
  );
}
