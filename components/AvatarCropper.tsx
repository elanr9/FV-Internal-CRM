"use client";

import { useCallback, useEffect, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { Loader2, X, ZoomIn, ZoomOut } from "lucide-react";

type Props = {
  src: string;
  onCancel: () => void;
  onConfirm: (blob: Blob) => Promise<void> | void;
};

export default function AvatarCropper({ src, onCancel, onConfirm }: Props) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [areaPixels, setAreaPixels] = useState<Area | null>(null);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setAreaPixels(pixels);
  }, []);

  useEffect(() => {
    setLoaded(false);
    setLoadError(false);
    const probe = new Image();
    probe.onload = () => setLoaded(true);
    probe.onerror = () => setLoadError(true);
    probe.src = src;
  }, [src]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  async function confirm() {
    if (!areaPixels) return;
    setSaving(true);
    try {
      const blob = await cropToBlob(src, areaPixels);
      await onConfirm(blob);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-ink-900/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-pop">
        <header className="flex items-center justify-between border-b border-ink-100 px-5 py-3">
          <div className="text-sm font-semibold text-ink-700">Position your photo</div>
          <button onClick={onCancel} className="rounded-full p-1.5 hover:bg-ink-100">
            <X className="h-4 w-4 text-ink-500" />
          </button>
        </header>

        <div className="relative w-full bg-ink-900" style={{ height: 400 }}>
          {loadError && (
            <div className="absolute inset-0 z-10 flex items-center justify-center p-6 text-center text-sm text-white">
              Could not read this image. Try a different file.
            </div>
          )}
          {!loaded && !loadError && (
            <div className="absolute inset-0 z-10 flex items-center justify-center text-white/70">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          )}
          {loaded && (
            <Cropper
              image={src}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="round"
              showGrid={false}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
              objectFit="cover"
              style={{
                containerStyle: { background: "#0B1220" }
              }}
            />
          )}
        </div>

        <div className="flex items-center gap-3 px-5 py-4">
          <ZoomOut className="h-4 w-4 text-ink-400" />
          <input
            type="range"
            min={1}
            max={4}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="flex-1 accent-brand-600"
          />
          <ZoomIn className="h-4 w-4 text-ink-400" />
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-ink-100 px-5 py-3.5">
          <button onClick={onCancel} className="btn-secondary">
            Cancel
          </button>
          <button onClick={confirm} disabled={saving || !areaPixels} className="btn-primary">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Use photo
          </button>
        </footer>
      </div>
    </div>
  );
}

async function cropToBlob(src: string, area: Area): Promise<Blob> {
  const img = await loadImage(src);
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No 2d context");
  ctx.drawImage(img, area.x, area.y, area.width, area.height, 0, 0, size, size);
  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Canvas export failed"))),
      "image/jpeg",
      0.9
    );
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
