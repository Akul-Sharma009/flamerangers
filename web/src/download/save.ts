import type { Figure } from "./figure";

export type PictureFormat = "png" | "svg";
const SCALE = 2;

export function svgBlob(fig: Figure): Blob {
  return new Blob([fig.svg], { type: "image/svg+xml;charset=utf-8" });
}

/** Draws the SVG on a canvas at twice its size. Rejects if the browser cannot decode it. */
export function pngBlob(fig: Figure): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = fig.width * SCALE;
      canvas.height = fig.height * SCALE;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("no canvas"));
      ctx.scale(SCALE, SCALE);
      ctx.drawImage(img, 0, 0, fig.width, fig.height);
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("no png"))), "image/png");
    };
    img.onerror = () => reject(new Error("image decode failed"));
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(fig.svg)}`;
  });
}

export function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function downloadFigure(fig: Figure, format: PictureFormat, base: string): Promise<void> {
  saveBlob(format === "svg" ? svgBlob(fig) : await pngBlob(fig), `${base}.${format}`);
}
