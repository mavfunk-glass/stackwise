type Props = {
  step: number;
  totalSteps?: number;
};

export default function ProgressBar({ step, totalSteps = 6 }: Props) {
  const clamped = Math.max(1, Math.min(step, totalSteps));
  const pct = (clamped / totalSteps) * 100;
  return (
    <div className="progress-bar-track">
      <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
    </div>
  );
}

