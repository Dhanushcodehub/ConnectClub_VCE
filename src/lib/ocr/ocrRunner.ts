import type { Worker, PSM } from "tesseract.js";
import {
  prepareOcrImageSuite,
  type PreparedOcrSuite,
  type PreparedOcrVariant,
} from "./imagePreprocess";
import {
  evaluateOcrPasses,
  type OcrPassInput,
  type RollEvaluationResult,
} from "./rollNumberMatcher";

export interface OcrScanProgress {
  progress: number;
  statusText: string;
  passIndex: number;
  totalPasses: number;
}

export interface RunOcrPipelineOptions {
  file: File;
  targetRollNo: string;
  onProgress?: (info: OcrScanProgress) => void;
  isCancelled?: () => boolean;
}

interface PassSpec {
  variantId: string;
  psmKey: "SINGLE_BLOCK" | "SINGLE_LINE" | "SPARSE_TEXT";
  label: string;
  rotateAuto: boolean;
}

const PRIMARY_PASSES: PassSpec[] = [
  {
    variantId: "gray",
    psmKey: "SINGLE_BLOCK",
    label: "Scanning enhanced contrast view...",
    rotateAuto: true,
  },
  {
    variantId: "threshold",
    psmKey: "SINGLE_BLOCK",
    label: "Scanning high-contrast B&W layer...",
    rotateAuto: true,
  },
  {
    variantId: "original",
    psmKey: "SPARSE_TEXT",
    label: "Scanning sparse card layout...",
    rotateAuto: true,
  },
  {
    variantId: "crop-center",
    psmKey: "SINGLE_BLOCK",
    label: "Focusing on center text region...",
    rotateAuto: false,
  },
  {
    variantId: "crop-center",
    psmKey: "SINGLE_LINE",
    label: "Isolating single-line roll tokens...",
    rotateAuto: false,
  },
  {
    variantId: "crop-lower",
    psmKey: "SPARSE_TEXT",
    label: "Checking lower ID band...",
    rotateAuto: false,
  },
  {
    variantId: "crop-upper",
    psmKey: "SINGLE_BLOCK",
    label: "Checking upper ID band...",
    rotateAuto: false,
  },
];

const ROTATED_FALLBACK_PASSES: PassSpec[] = [
  {
    variantId: "rot-90",
    psmKey: "SINGLE_BLOCK",
    label: "Checking 90° rotated orientation...",
    rotateAuto: false,
  },
  {
    variantId: "rot-270",
    psmKey: "SINGLE_BLOCK",
    label: "Checking 270° rotated orientation...",
    rotateAuto: false,
  },
  {
    variantId: "rot-180",
    psmKey: "SINGLE_BLOCK",
    label: "Checking 180° inverted orientation...",
    rotateAuto: false,
  },
];

const ROLL_CHAR_WHITELIST = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

function findVariant(
  variants: PreparedOcrVariant[],
  id: string
): PreparedOcrVariant | undefined {
  return variants.find((v) => v.id === id);
}

/**
 * Runs client-side image preprocessing followed by a multi-pass Tesseract OCR
 * pipeline reusing a single worker and terminating all resources cleanly.
 */
export async function runRollNumberOcrPipeline({
  file,
  targetRollNo,
  onProgress,
  isCancelled,
}: RunOcrPipelineOptions): Promise<RollEvaluationResult> {
  const cancelled = () => Boolean(isCancelled?.());

  onProgress?.({
    progress: 5,
    statusText: "Enhancing image clarity & orientation...",
    passIndex: 0,
    totalPasses: PRIMARY_PASSES.length,
  });

  let suite: PreparedOcrSuite | null = null;
  let worker: Worker | null = null;

  try {
    suite = await prepareOcrImageSuite(file);
    if (cancelled()) {
      throw new Error("OCR scan cancelled.");
    }

    const totalPlanned = PRIMARY_PASSES.length + ROTATED_FALLBACK_PASSES.length;
    let activePassIndex = 0;
    let activeStatusText = "Initializing local OCR engine...";

    onProgress?.({
      progress: 10,
      statusText: activeStatusText,
      passIndex: 0,
      totalPasses: PRIMARY_PASSES.length,
    });

    const Tesseract = await import("tesseract.js");
    if (cancelled()) {
      throw new Error("OCR scan cancelled.");
    }

    worker = await Tesseract.createWorker("eng", Tesseract.OEM.LSTM_ONLY, {
      logger: (info: { status: string; progress: number }) => {
        if (cancelled()) return;
        if (info.status === "recognizing text" && activePassIndex > 0) {
          const baseProgress = 12 + ((activePassIndex - 1) / totalPlanned) * 84;
          const passSpan = 84 / totalPlanned;
          const computed = Math.min(
            97,
            Math.round(baseProgress + info.progress * passSpan)
          );
          onProgress?.({
            progress: computed,
            statusText: activeStatusText,
            passIndex: activePassIndex,
            totalPasses: PRIMARY_PASSES.length,
          });
        }
      },
    });

    if (cancelled()) {
      throw new Error("OCR scan cancelled.");
    }

    const psmMap: Record<PassSpec["psmKey"], PSM> = {
      SINGLE_BLOCK: Tesseract.PSM.SINGLE_BLOCK,
      SINGLE_LINE: Tesseract.PSM.SINGLE_LINE,
      SPARSE_TEXT: Tesseract.PSM.SPARSE_TEXT,
    };

    const collectedPasses: OcrPassInput[] = [];
    let latestEval: RollEvaluationResult = evaluateOcrPasses([], targetRollNo);

    const executePass = async (
      spec: PassSpec,
      pool: PreparedOcrVariant[]
    ): Promise<boolean> => {
      if (cancelled() || !worker) return false;
      const variant = findVariant(pool, spec.variantId);
      if (!variant) return false;

      activePassIndex += 1;
      activeStatusText = spec.label;

      const baseProgress = Math.min(
        95,
        Math.round(12 + ((activePassIndex - 1) / totalPlanned) * 84)
      );
      onProgress?.({
        progress: baseProgress,
        statusText: activeStatusText,
        passIndex: activePassIndex,
        totalPasses: PRIMARY_PASSES.length,
      });

      await worker.setParameters({
        tessedit_pageseg_mode: psmMap[spec.psmKey],
        tessedit_char_whitelist: ROLL_CHAR_WHITELIST,
        preserve_interword_spaces: "1",
        user_defined_dpi: "300",
      });

      const {
        data: { text, confidence },
      } = await worker.recognize(variant.canvas, {
        rotateAuto: spec.rotateAuto,
      });

      if (cancelled()) return false;

      collectedPasses.push({
        passName: `${spec.variantId}:${spec.psmKey}`,
        text: text ?? "",
        confidence: typeof confidence === "number" ? confidence : 0,
      });

      latestEval = evaluateOcrPasses(collectedPasses, targetRollNo);

      // Require at least two corroborating passes before early-exiting so an
      // ambiguous card with multiple distinct roll numbers is not rubber-stamped.
      return collectedPasses.length >= 2 && latestEval.verified;
    };

    for (const spec of PRIMARY_PASSES) {
      if (cancelled()) {
        throw new Error("OCR scan cancelled.");
      }
      const shouldStopEarly = await executePass(spec, suite.variants);
      if (shouldStopEarly) {
        onProgress?.({
          progress: 100,
          statusText: "Roll number verified.",
          passIndex: activePassIndex,
          totalPasses: PRIMARY_PASSES.length,
        });
        return latestEval;
      }
    }

    // Only try 90°/270°/180° rotated passes if primary orientation didn't verify cleanly
    if (!latestEval.verified && !latestEval.ambiguous) {
      for (const spec of ROTATED_FALLBACK_PASSES) {
        if (cancelled()) {
          throw new Error("OCR scan cancelled.");
        }
        const shouldStopEarly = await executePass(spec, suite.rotatedFallbacks);
        if (shouldStopEarly) {
          onProgress?.({
            progress: 100,
            statusText: "Roll number verified.",
            passIndex: activePassIndex,
            totalPasses: totalPlanned,
          });
          return latestEval;
        }
      }
    }

    onProgress?.({
      progress: 100,
      statusText: latestEval.verified
        ? "Roll number verified."
        : "Scan complete.",
      passIndex: activePassIndex,
      totalPasses: activePassIndex,
    });

    return latestEval;
  } finally {
    if (worker) {
      try {
        await worker.terminate();
      } catch {
        // Ignore worker termination errors during teardown.
      }
    }
    if (suite) {
      suite.cleanup();
    }
  }
}
