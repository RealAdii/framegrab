import { useCallback, useRef, useState } from "react";

const ACCEPTED = ".mp4,.webm,.mov,.avi,.mkv";
const MAX_DURATION = 60;

interface Props {
  onFileAccepted: (file: File, duration: number) => void;
}

export default function DropZone({ onFileAccepted }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const validateVideo = useCallback(
    (file: File) => {
      setError(null);
      setLoading(true);

      const url = URL.createObjectURL(file);
      const video = document.createElement("video");
      video.preload = "metadata";
      video.src = url;

      video.onloadedmetadata = () => {
        URL.revokeObjectURL(url);
        setLoading(false);
        if (video.duration > MAX_DURATION) {
          setError(`Video is ${Math.round(video.duration)}s — max ${MAX_DURATION}s allowed.`);
          return;
        }
        if (video.duration === 0 || isNaN(video.duration)) {
          setError("Could not read video duration.");
          return;
        }
        onFileAccepted(file, video.duration);
      };

      video.onerror = () => {
        URL.revokeObjectURL(url);
        setLoading(false);
        setError("Unsupported video format.");
      };
    },
    [onFileAccepted]
  );

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files?.length) return;
      validateVideo(files[0]);
    },
    [validateVideo]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-lg mx-auto">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`
          w-full rounded-2xl border-2 border-dashed p-12 text-center
          cursor-pointer transition-all duration-200
          ${
            dragging
              ? "border-accent bg-accent/10 scale-[1.02]"
              : "border-border hover:border-accent/50 hover:bg-surface-hover"
          }
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED}
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />

        <div className="flex flex-col items-center gap-3">
          <svg
            className="w-12 h-12 text-text-muted"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
          {loading ? (
            <p className="text-text-muted">Loading video...</p>
          ) : (
            <>
              <p className="text-lg font-medium">
                Drop a video here or{" "}
                <span className="text-accent">browse</span>
              </p>
              <p className="text-sm text-text-muted">
                MP4, WebM, MOV, AVI, MKV — up to 60 seconds
              </p>
            </>
          )}
        </div>
      </div>

      {error && (
        <p className="text-red-400 text-sm text-center">{error}</p>
      )}
    </div>
  );
}
