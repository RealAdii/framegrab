import { useCallback, useRef, useState } from "react";

const ACCEPTED = ".mp4,.webm,.mov,.avi,.mkv";
const MAX_DURATION = 60;

interface Props {
  onFileAccepted: (file: File, duration: number) => void;
}

function isYouTubeUrl(url: string): boolean {
  return /^https?:\/\/(www\.)?(youtube\.com\/(watch|shorts|embed)|youtu\.be\/)/.test(url);
}

export default function DropZone({ onFileAccepted }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // YouTube state
  const [ytUrl, setYtUrl] = useState("");
  const [ytLoading, setYtLoading] = useState(false);
  const [ytStatus, setYtStatus] = useState("");
  const [ytProgress, setYtProgress] = useState(0);

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

  const handleYouTube = useCallback(async () => {
    const url = ytUrl.trim();
    if (!url) return;
    if (!isYouTubeUrl(url)) {
      setError("Please enter a valid YouTube URL.");
      return;
    }

    setError(null);
    setYtLoading(true);
    setYtStatus("Fetching video info...");
    setYtProgress(0);

    try {
      const infoRes = await fetch(`/api/youtube/info?url=${encodeURIComponent(url)}`);
      if (!infoRes.ok) {
        const data = await infoRes.json().catch(() => ({}));
        throw new Error(data.error || "Failed to fetch video info");
      }
      const info = await infoRes.json();

      if (info.duration > MAX_DURATION) {
        throw new Error(`Video is ${info.duration}s — max ${MAX_DURATION}s allowed.`);
      }
      if (info.duration === 0) {
        throw new Error("Live streams are not supported.");
      }

      setYtStatus(`Downloading "${info.title}"...`);

      const streamParams = new URLSearchParams({ url });
      if (info.instance) streamParams.set("instance", info.instance);
      if (info.itag) streamParams.set("itag", String(info.itag));
      const streamRes = await fetch(`/api/youtube/stream?${streamParams}`);
      if (!streamRes.ok) throw new Error("Failed to download video");

      const contentLength = streamRes.headers.get("Content-Length");
      const total = contentLength ? parseInt(contentLength) : 0;
      const reader = streamRes.body!.getReader();
      const chunks: BlobPart[] = [];
      let received = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        received += value.length;
        if (total > 0) {
          setYtProgress(Math.round((received / total) * 100));
        }
      }

      const blob = new Blob(chunks, { type: "video/mp4" });
      const safeName = info.title.replace(/[^a-zA-Z0-9\-_ ]/g, "").slice(0, 80);
      const file = new File([blob], `${safeName}.mp4`, { type: "video/mp4" });

      onFileAccepted(file, info.duration);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "YouTube download failed";
      setError(message);
    } finally {
      setYtLoading(false);
      setYtStatus("");
      setYtProgress(0);
    }
  }, [ytUrl, onFileAccepted]);

  const busy = loading || ytLoading;

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-lg mx-auto">
      {/* YouTube loading overlay */}
      {ytLoading ? (
        <div className="w-full rounded-2xl border border-border bg-surface p-10 text-center space-y-4">
          <div className="w-10 h-10 mx-auto border-4 border-border border-t-accent rounded-full animate-spin" />
          <p className="text-sm text-text-muted">{ytStatus}</p>
          {ytProgress > 0 && (
            <div className="w-full bg-bg rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-accent rounded-full transition-all duration-300"
                style={{ width: `${ytProgress}%` }}
              />
            </div>
          )}
          {ytProgress > 0 && (
            <p className="text-xs text-text-muted">{ytProgress}%</p>
          )}
        </div>
      ) : (
        <>
          {/* File drop zone */}
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

          {/* Divider */}
          <div className="flex items-center gap-4 w-full">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-text-muted uppercase tracking-widest">or</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* YouTube URL input */}
          <div className="w-full flex gap-2">
            <input
              type="text"
              value={ytUrl}
              onChange={(e) => {
                setYtUrl(e.target.value);
                setError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !busy) handleYouTube();
              }}
              placeholder="Paste a YouTube URL"
              className="
                flex-1 px-4 py-3 rounded-xl bg-surface border border-border
                text-text placeholder:text-text-muted text-sm
                focus:outline-none focus:border-accent/50 transition-colors
              "
            />
            <button
              onClick={handleYouTube}
              disabled={busy || !ytUrl.trim()}
              className="
                px-5 py-3 rounded-xl font-medium text-sm
                bg-accent hover:bg-accent-hover text-white
                disabled:opacity-40 disabled:cursor-not-allowed
                transition-colors cursor-pointer
              "
            >
              Go
            </button>
          </div>
        </>
      )}

      {error && (
        <p className="text-red-400 text-sm text-center">{error}</p>
      )}
    </div>
  );
}
