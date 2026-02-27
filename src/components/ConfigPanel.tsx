import { useMemo, useState } from "react";

interface Props {
  file: File;
  duration: number;
  onExtract: (interval: number) => void;
}

function formatDuration(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.round(s % 60);
  return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
}

export default function ConfigPanel({ file, duration, onExtract }: Props) {
  const [interval, setInterval] = useState(1);
  const videoUrl = useMemo(() => URL.createObjectURL(file), [file]);

  const frameCount = Math.ceil(duration / interval);

  return (
    <div className="flex flex-col items-center gap-8 w-full max-w-lg mx-auto">
      {/* Video preview */}
      <video
        src={videoUrl}
        controls
        className="w-full rounded-xl border border-border max-h-64 object-contain bg-black"
      />

      {/* File info */}
      <div className="text-center">
        <p className="font-medium truncate max-w-md">{file.name}</p>
        <p className="text-sm text-text-muted">{formatDuration(duration)}</p>
      </div>

      {/* Interval slider */}
      <div className="w-full space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-text-muted">Extract a frame every</span>
          <span className="font-mono font-medium text-accent">
            {interval}s
          </span>
        </div>
        <input
          type="range"
          min={0.5}
          max={Math.min(5, duration)}
          step={0.5}
          value={interval}
          onChange={(e) => setInterval(parseFloat(e.target.value))}
          className="w-full accent-accent cursor-pointer"
        />
        <div className="flex justify-between text-xs text-text-muted">
          <span>0.5s</span>
          <span>{Math.min(5, Math.floor(duration))}s</span>
        </div>
      </div>

      {/* Frame estimate */}
      <p className="text-sm text-text-muted">
        ~<span className="text-text font-medium">{frameCount}</span> frames
      </p>

      {/* Extract button */}
      <button
        onClick={() => onExtract(interval)}
        className="
          w-full py-3.5 rounded-xl font-semibold text-lg
          bg-accent hover:bg-accent-hover text-white
          transition-colors duration-200 cursor-pointer
        "
      >
        Extract Frames
      </button>
    </div>
  );
}
