export interface PreparedOcrVariant {
  id: string;
  label: string;
  canvas: HTMLCanvasElement;
}

export interface PreparedOcrSuite {
  variants: PreparedOcrVariant[];
  rotatedFallbacks: PreparedOcrVariant[];
  cleanup: () => void;
}

const MAX_DIMENSION = 2200;
const MIN_UPSCALE_DIMENSION = 1400;

async function loadOrientedBitmap(
  file: File
): Promise<{ width: number; height: number; draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void; dispose: () => void }> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
      return {
        width: bitmap.width,
        height: bitmap.height,
        draw: (ctx, w, h) => ctx.drawImage(bitmap, 0, 0, w, h),
        dispose: () => bitmap.close(),
      };
    } catch {
      // Fallback to HTMLImageElement if imageOrientation option is unsupported
    }
  }

  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Failed to decode image"));
      el.src = url;
    });
    return {
      width: img.naturalWidth || img.width,
      height: img.naturalHeight || img.height,
      draw: (ctx, w, h) => ctx.drawImage(img, 0, 0, w, h),
      dispose: () => URL.revokeObjectURL(url),
    };
  } catch (err) {
    URL.revokeObjectURL(url);
    throw err;
  }
}

function createCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  return canvas;
}

function computeScaledDimensions(width: number, height: number): { width: number; height: number } {
  const maxSide = Math.max(width, height);
  if (maxSide <= 0) return { width: 1, height: 1 };

  let scale = 1;
  if (maxSide < MIN_UPSCALE_DIMENSION) {
    scale = Math.min(2.5, MIN_UPSCALE_DIMENSION / maxSide);
  } else if (maxSide > MAX_DIMENSION) {
    scale = MAX_DIMENSION / maxSide;
  }

  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

/**
 * Generates an enhanced grayscale canvas:
 * 1. Luminance grayscale
 * 2. Percentile contrast stretch (2nd..98th percentile -> 0..255) for low-light & glare
 * 3. Mild 3x3 sharpening pass for slightly blurred mobile photos
 */
function buildEnhancedGrayscaleCanvas(source: HTMLCanvasElement): HTMLCanvasElement {
  const { width, height } = source;
  const out = createCanvas(width, height);
  const srcCtx = source.getContext("2d", { willReadFrequently: true });
  const outCtx = out.getContext("2d", { willReadFrequently: true });
  if (!srcCtx || !outCtx) return out;

  const srcData = srcCtx.getImageData(0, 0, width, height);
  const pixels = srcData.data;
  const total = width * height;
  const gray = new Uint8Array(total);
  const hist = new Uint32Array(256);

  for (let i = 0; i < total; i++) {
    const p = i * 4;
    const lum = Math.round(0.299 * pixels[p] + 0.587 * pixels[p + 1] + 0.114 * pixels[p + 2]);
    gray[i] = lum;
    hist[lum]++;
  }

  // Find 2% and 98% brightness percentiles to normalize lighting & glare
  const lowCut = Math.floor(total * 0.02);
  const highCut = Math.floor(total * 0.98);
  let cumulative = 0;
  let minVal = 0;
  let maxVal = 255;

  for (let i = 0; i < 256; i++) {
    cumulative += hist[i];
    if (cumulative >= lowCut) {
      minVal = i;
      break;
    }
  }
  cumulative = 0;
  for (let i = 255; i >= 0; i--) {
    cumulative += hist[i];
    if (total - cumulative <= highCut) {
      maxVal = i;
      break;
    }
  }

  const range = Math.max(24, maxVal - minVal);
  const stretched = new Uint8ClampedArray(total);
  for (let i = 0; i < total; i++) {
    stretched[i] = Math.min(255, Math.max(0, Math.round(((gray[i] - minVal) * 255) / range)));
  }

  // Mild unsharp/sharpen filter (blended 45% sharpened + 55% stretched)
  const outImg = outCtx.createImageData(width, height);
  const dst = outImg.data;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      let val = stretched[idx];
      if (x > 0 && x < width - 1 && y > 0 && y < height - 1) {
        const sharp =
          5 * stretched[idx] -
          stretched[idx - 1] -
          stretched[idx + 1] -
          stretched[idx - width] -
          stretched[idx + width];
        val = Math.min(255, Math.max(0, Math.round(val * 0.55 + sharp * 0.45)));
      }
      const p = idx * 4;
      dst[p] = val;
      dst[p + 1] = val;
      dst[p + 2] = val;
      dst[p + 3] = 255;
    }
  }

  outCtx.putImageData(outImg, 0, 0);
  return out;
}

/**
 * Generates an adaptive black-and-white thresholded canvas using a fast
 * Bradley integral image (handles uneven shadows and flash glare cleanly).
 */
function buildAdaptiveThresholdCanvas(graySource: HTMLCanvasElement): HTMLCanvasElement {
  const { width, height } = graySource;
  const out = createCanvas(width, height);
  const srcCtx = graySource.getContext("2d", { willReadFrequently: true });
  const outCtx = out.getContext("2d", { willReadFrequently: true });
  if (!srcCtx || !outCtx) return out;

  const src = srcCtx.getImageData(0, 0, width, height).data;
  const total = width * height;
  const integral = new Float64Array(total);

  for (let y = 0; y < height; y++) {
    let rowSum = 0;
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      rowSum += src[idx * 4];
      integral[idx] = (y > 0 ? integral[idx - width] : 0) + rowSum;
    }
  }

  const radius = Math.max(12, Math.floor(Math.min(width, height) / 18));
  const tRatio = 0.86;
  const outImg = outCtx.createImageData(width, height);
  const dst = outImg.data;

  for (let y = 0; y < height; y++) {
    const y1 = Math.max(0, y - radius);
    const y2 = Math.min(height - 1, y + radius);
    for (let x = 0; x < width; x++) {
      const x1 = Math.max(0, x - radius);
      const x2 = Math.min(width - 1, x + radius);
      const count = (x2 - x1 + 1) * (y2 - y1 + 1);

      const br = integral[y2 * width + x2];
      const bl = x1 > 0 ? integral[y2 * width + (x1 - 1)] : 0;
      const tr = y1 > 0 ? integral[(y1 - 1) * width + x2] : 0;
      const tl = x1 > 0 && y1 > 0 ? integral[(y1 - 1) * width + (x1 - 1)] : 0;
      const sum = br - bl - tr + tl;

      const idx = y * width + x;
      const lum = src[idx * 4];
      const bin = lum * count < sum * tRatio ? 0 : 255;

      const p = idx * 4;
      dst[p] = bin;
      dst[p + 1] = bin;
      dst[p + 2] = bin;
      dst[p + 3] = 255;
    }
  }

  outCtx.putImageData(outImg, 0, 0);
  return out;
}

function cropCanvas(
  source: HTMLCanvasElement,
  rx: number,
  ry: number,
  rw: number,
  rh: number
): HTMLCanvasElement {
  const sx = Math.max(0, Math.round(source.width * rx));
  const sy = Math.max(0, Math.round(source.height * ry));
  const sw = Math.max(1, Math.min(source.width - sx, Math.round(source.width * rw)));
  const sh = Math.max(1, Math.min(source.height - sy, Math.round(source.height * rh)));

  const out = createCanvas(sw, sh);
  const ctx = out.getContext("2d");
  if (ctx) {
    ctx.drawImage(source, sx, sy, sw, sh, 0, 0, sw, sh);
  }
  return out;
}

function rotateCanvas(source: HTMLCanvasElement, degrees: 90 | 180 | 270): HTMLCanvasElement {
  const swap = degrees === 90 || degrees === 270;
  const out = createCanvas(swap ? source.height : source.width, swap ? source.width : source.height);
  const ctx = out.getContext("2d");
  if (!ctx) return out;

  ctx.translate(out.width / 2, out.height / 2);
  ctx.rotate((degrees * Math.PI) / 180);
  ctx.drawImage(source, -source.width / 2, -source.height / 2);
  return out;
}

function yieldToUi(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

/**
 * Builds preprocessed Canvas variants and supplementary text-bearing crops
 * completely client-side, plus a cleanup callback to free canvas memory.
 */
export async function prepareOcrImageSuite(file: File): Promise<PreparedOcrSuite> {
  const source = await loadOrientedBitmap(file);
  const allCanvases: HTMLCanvasElement[] = [];

  try {
    const { width, height } = computeScaledDimensions(source.width, source.height);
    const originalCanvas = createCanvas(width, height);
    allCanvases.push(originalCanvas);

    const origCtx = originalCanvas.getContext("2d", { willReadFrequently: true });
    if (origCtx) {
      origCtx.imageSmoothingEnabled = true;
      origCtx.imageSmoothingQuality = "high";
      source.draw(origCtx, width, height);
    }
    source.dispose();

    await yieldToUi();
    const grayCanvas = buildEnhancedGrayscaleCanvas(originalCanvas);
    allCanvases.push(grayCanvas);

    await yieldToUi();
    const thresholdCanvas = buildAdaptiveThresholdCanvas(grayCanvas);
    allCanvases.push(thresholdCanvas);

    await yieldToUi();
    // Overlapping crops so no single fixed crop can slice off the roll number
    const cropCenterGray = cropCanvas(grayCanvas, 0.04, 0.22, 0.92, 0.56);
    const cropLowerThresh = cropCanvas(thresholdCanvas, 0.04, 0.44, 0.92, 0.52);
    const cropUpperGray = cropCanvas(grayCanvas, 0.04, 0.12, 0.92, 0.48);
    allCanvases.push(cropCenterGray, cropLowerThresh, cropUpperGray);

    const rot90 = rotateCanvas(grayCanvas, 90);
    const rot270 = rotateCanvas(grayCanvas, 270);
    const rot180 = rotateCanvas(grayCanvas, 180);
    allCanvases.push(rot90, rot270, rot180);

    return {
      variants: [
        { id: "gray", label: "Scanning enhanced grayscale ID", canvas: grayCanvas },
        { id: "threshold", label: "Scanning adaptive black & white", canvas: thresholdCanvas },
        { id: "original", label: "Scanning original color photo", canvas: originalCanvas },
        { id: "crop-center", label: "Scanning center text region", canvas: cropCenterGray },
        { id: "crop-lower", label: "Scanning lower card region", canvas: cropLowerThresh },
        { id: "crop-upper", label: "Scanning upper card region", canvas: cropUpperGray },
      ],
      rotatedFallbacks: [
        { id: "rot-90", label: "Checking rotated orientation (90°)", canvas: rot90 },
        { id: "rot-270", label: "Checking rotated orientation (270°)", canvas: rot270 },
        { id: "rot-180", label: "Checking rotated orientation (180°)", canvas: rot180 },
      ],
      cleanup: () => {
        for (const c of allCanvases) {
          c.width = 0;
          c.height = 0;
        }
      },
    };
  } catch (err) {
    source.dispose();
    for (const c of allCanvases) {
      c.width = 0;
      c.height = 0;
    }
    throw err;
  }
}
