import { useCallback, useState } from "react";
import DropZone from "./components/DropZone";
import ConfigPanel from "./components/ConfigPanel";
import Progress from "./components/Progress";
import Result from "./components/Result";
import { extractFrames, type ExtractionResult } from "./lib/extractor";

type AppState = "upload" | "configure" | "processing" | "done";

export default function App() {
  const [state, setState] = useState<AppState>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [duration, setDuration] = useState(0);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [result, setResult] = useState<ExtractionResult | null>(null);

  const handleFileAccepted = useCallback((f: File, dur: number) => {
    setFile(f);
    setDuration(dur);
    setState("configure");
  }, []);

  const handleExtract = useCallback(
    async (interval: number) => {
      if (!file) return;
      const total = Math.ceil(duration / interval);
      setProgress({ current: 0, total });
      setState("processing");

      try {
        const res = await extractFrames(file, interval, (cur, tot) => {
          setProgress({ current: cur, total: tot });
        });
        setResult(res);
        setState("done");
      } catch (err) {
        console.error("Extraction failed:", err);
        setState("configure");
      }
    },
    [file, duration]
  );

  const handleReset = useCallback(() => {
    if (result) {
      result.frames.forEach((url) => URL.revokeObjectURL(url));
    }
    setFile(null);
    setDuration(0);
    setResult(null);
    setProgress({ current: 0, total: 0 });
    setState("upload");
  }, [result]);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="py-6 text-center">
        <h1 className="text-2xl font-bold tracking-tight">
          <span className="text-accent">Frame</span>Grab
        </h1>
        <p className="text-sm text-text-muted mt-1">
          Extract frames from video for AI tools
        </p>
      </header>

      {/* Main content */}
      <main className="flex-1 flex items-center justify-center px-4 pb-12">
        {state === "upload" && (
          <DropZone onFileAccepted={handleFileAccepted} />
        )}

        {state === "configure" && file && (
          <ConfigPanel
            file={file}
            duration={duration}
            onExtract={handleExtract}
          />
        )}

        {state === "processing" && (
          <Progress current={progress.current} total={progress.total} />
        )}

        {state === "done" && result && (
          <Result result={result} onReset={handleReset} />
        )}
      </main>
    </div>
  );
}
