import { saveAs } from "file-saver";
import type { ExtractionResult } from "../lib/extractor";

interface Props {
  result: ExtractionResult;
  onReset: () => void;
}

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function Result({ result, onReset }: Props) {
  const handleDownload = () => {
    saveAs(result.zip, "framegrab.zip");
  };

  return (
    <div className="flex flex-col items-center gap-8 w-full max-w-2xl mx-auto">
      {/* Success icon */}
      <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center">
        <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>

      <div className="text-center">
        <p className="text-xl font-semibold">
          {result.frameCount} frames extracted
        </p>
        <p className="text-sm text-text-muted mt-1">
          ZIP size: {formatSize(result.zip.size)}
        </p>
      </div>

      {/* Download button */}
      <button
        onClick={handleDownload}
        className="
          w-full max-w-sm py-3.5 rounded-xl font-semibold text-lg
          bg-accent hover:bg-accent-hover text-white
          transition-colors duration-200 cursor-pointer
        "
      >
        Download ZIP
      </button>

      {/* Frame grid */}
      {result.frames.length > 0 && (
        <div className="w-full">
          <p className="text-sm text-text-muted mb-3">Preview</p>
          <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2">
            {result.frames.map((url, i) => (
              <img
                key={i}
                src={url}
                alt={`Frame ${i + 1}`}
                className="rounded-lg border border-border w-full aspect-video object-cover"
              />
            ))}
          </div>
        </div>
      )}

      {/* Start over */}
      <button
        onClick={onReset}
        className="
          text-text-muted hover:text-text text-sm underline underline-offset-4
          transition-colors cursor-pointer
        "
      >
        Start Over
      </button>
    </div>
  );
}
