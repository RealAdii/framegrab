import JSZip from "jszip";

export interface ExtractionResult {
  zip: Blob;
  frameCount: number;
  frames: string[]; // object URLs for preview
}

function formatTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, "0")}m${String(s).padStart(2, "0")}s`;
}

function seekTo(video: HTMLVideoElement, time: number): Promise<void> {
  return new Promise((resolve) => {
    const onSeeked = () => {
      video.removeEventListener("seeked", onSeeked);
      resolve();
    };
    video.addEventListener("seeked", onSeeked);
    video.currentTime = time;
  });
}

function captureFrame(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Failed to capture frame"));
      },
      "image/png"
    );
  });
}

export async function extractFrames(
  file: File,
  intervalSeconds: number,
  onProgress: (current: number, total: number) => void
): Promise<ExtractionResult> {
  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  video.src = url;

  await new Promise<void>((resolve, reject) => {
    video.onloadedmetadata = () => resolve();
    video.onerror = () => reject(new Error("Failed to load video"));
  });

  // Force decode by playing briefly then pausing
  video.currentTime = 0;
  await new Promise<void>((resolve) => {
    const onSeeked = () => {
      video.removeEventListener("seeked", onSeeked);
      resolve();
    };
    video.addEventListener("seeked", onSeeked);
  });

  const duration = video.duration;
  const timestamps: number[] = [];
  for (let t = 0; t < duration; t += intervalSeconds) {
    timestamps.push(t);
  }

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;

  const zip = new JSZip();
  const frameUrls: string[] = [];

  for (let i = 0; i < timestamps.length; i++) {
    await seekTo(video, timestamps[i]);
    const blob = await captureFrame(video, canvas, ctx);
    const idx = String(i + 1).padStart(3, "0");
    const ts = formatTimestamp(timestamps[i]);
    zip.file(`frame_${idx}_${ts}.png`, blob);
    frameUrls.push(URL.createObjectURL(blob));
    onProgress(i + 1, timestamps.length);
  }

  const zipBlob = await zip.generateAsync({ type: "blob" });

  URL.revokeObjectURL(url);

  return {
    zip: zipBlob,
    frameCount: timestamps.length,
    frames: frameUrls,
  };
}
