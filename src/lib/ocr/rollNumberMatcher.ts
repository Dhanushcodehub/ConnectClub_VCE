export interface OcrPassInput {
  passName: string;
  text: string;
  confidence: number;
}

export interface CandidateScore {
  raw: string;
  normalized: string;
  passesMatched: number;
  maxConfidence: number;
  avgConfidence: number;
  matchesTarget: boolean;
  isExactTarget: boolean;
  score: number;
}

export interface RollEvaluationResult {
  verified: boolean;
  ambiguous: boolean;
  matchedRoll: string | null;
  bestCandidate: string | null;
  reason: "matched" | "ambiguous" | "mismatch" | "not_found";
  candidates: CandidateScore[];
}

const DIGIT_CONFUSION_MAP: Record<string, string> = {
  O: "0",
  Q: "0",
  D: "0",
  I: "1",
  L: "1",
  T: "1",
  Z: "2",
  S: "5",
  G: "6",
  B: "8",
};

const LETTER_CONFUSION_MAP: Record<string, string> = {
  "0": "O",
  "1": "I",
  "2": "Z",
  "4": "A",
  "5": "S",
  "6": "G",
  "8": "B",
};

/**
 * Strips whitespace, line breaks, and punctuation, uppercasing everything.
 */
export function normalize(s: string): string {
  return s.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
}

/**
 * Normalizes characters most commonly misread by OCR in alphanumeric roll numbers:
 * O/Q->0, I/L->1, S->5, B->8, Z->2.
 */
export function ocrNormalize(s: string): string {
  return normalize(s)
    .replace(/O/g, "0")
    .replace(/Q/g, "0")
    .replace(/I/g, "1")
    .replace(/L/g, "1")
    .replace(/S/g, "5")
    .replace(/B/g, "8")
    .replace(/Z/g, "2");
}

/**
 * Applies position-guided OCR correction using the target roll number's
 * expected digit vs. letter positions. Never alters a different digit into
 * another digit (e.g., 6 never becomes 5) so distinct roll numbers stay distinct.
 */
export function positionGuidedNormalize(candidate: string, target: string): string {
  const normCand = normalize(candidate);
  const normTarget = normalize(target);
  if (normCand.length !== normTarget.length) return normCand;

  let out = "";
  for (let i = 0; i < normCand.length; i++) {
    const ch = normCand[i];
    const tgt = normTarget[i];

    if (/[0-9]/.test(tgt)) {
      out += /[0-9]/.test(ch) ? ch : (DIGIT_CONFUSION_MAP[ch] ?? ch);
    } else if (/[A-Z]/.test(tgt)) {
      out += /[A-Z]/.test(ch) ? ch : (LETTER_CONFUSION_MAP[ch] ?? ch);
    } else {
      out += ch;
    }
  }
  return out;
}

/**
 * Checks whether a detected candidate reliably matches the target roll number
 * without unrestricted fuzzy matching:
 * 1. Exact normalized match
 * 2. Safe OCR-confusion normalized match (equal length, character-by-character)
 * 3. Position-guided correction using the target's digit/letter layout
 */
export function rollsMatch(detected: string, target: string): boolean {
  const a = normalize(detected);
  const b = normalize(target);
  if (!a || !b || a.length !== b.length) return false;
  if (a === b) return true;
  if (ocrNormalize(a) === ocrNormalize(b)) return true;
  if (positionGuidedNormalize(a, b) === b) return true;
  return false;
}

function digitCountAfterOcr(token: string): number {
  const norm = ocrNormalize(token);
  let count = 0;
  for (let i = 0; i < norm.length; i++) {
    if (norm[i] >= "0" && norm[i] <= "9") count++;
  }
  return count;
}

function isPlausibleRollToken(token: string, targetLength?: number): boolean {
  if (token.length < 8 || token.length > 14) return false;
  // Every college roll number carries several numeric digits; rejects plain words like VARDHAMAN
  if (digitCountAfterOcr(token) < 4) return false;
  if (targetLength && Math.abs(token.length - targetLength) > 2 && token.length < 9) {
    return false;
  }
  return true;
}

/**
 * Extracts candidate roll numbers from OCR text, handling:
 * - Standard contiguous JNTUH/VCE, OU, and college alphanumeric formats
 * - Roll numbers split across spaces, punctuation, or adjacent line breaks
 * - Target-length character windows inside collapsed lines when spaced/formatted
 */
export function extractRollNumbers(text: string, targetRollNo?: string): string[] {
  const matches = new Set<string>();
  const normTarget = targetRollNo ? normalize(targetRollNo) : "";
  const targetLen = normTarget.length || undefined;

  const patterns = [
    // JNTUH / VCE (e.g. 22881A0501, 22881A05FC, 23885A0412) and OCR-confused variants
    /\b([0-9OQILSBZG]{2,5}[A-Z0-9]{1,2}[0-9OQILSBZG]{2}[A-Z0-9]{2,4})\b/gi,
    // OU / numeric 10-12 digits
    /\b(\d{10,12})\b/g,
    // General 9-12 char alphanumeric tokens
    /\b([0-9A-Za-z]{9,12})\b/g,
  ];

  // 1. Direct pattern extraction on punctuation-cleaned text
  const cleaned = text.replace(/[^A-Za-z0-9\r\n]+/g, " ");
  for (const re of patterns) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(cleaned)) !== null) {
      const token = m[1].toUpperCase();
      if (isPlausibleRollToken(token, targetLen)) {
        matches.add(token);
      }
    }
  }

  // 2. Per-line collapsed scan (handles spaces/hyphens/dots inside a single line, e.g. "2288 1A 05FC")
  const lines = text.split(/\r?\n/);
  for (const rawLine of lines) {
    const lineTokens = rawLine
      .replace(/[^A-Za-z0-9]+/g, " ")
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((t) => t.toUpperCase());

    // Merge 2..4 adjacent tokens on the same line
    for (let i = 0; i < lineTokens.length; i++) {
      let merged = "";
      for (let span = 0; span < 4 && i + span < lineTokens.length; span++) {
        merged += lineTokens[i + span];
        if (merged.length >= 8 && merged.length <= 13 && isPlausibleRollToken(merged, targetLen)) {
          if (
            /\d{2,5}[A-Z0-9]{1,2}\d{2}[A-Z0-9]{2,4}/.test(ocrNormalize(merged)) ||
            /^\d{10,12}$/.test(merged) ||
            (targetLen && merged.length === targetLen)
          ) {
            matches.add(merged);
          }
        }
      }
    }

    // If a labeled line has target-length match inside collapsed text (e.g. "ROLLNO22881A05FC")
    if (normTarget.length >= 8) {
      const collapsedLine = normalize(rawLine);
      if (collapsedLine.length >= normTarget.length) {
        for (let idx = 0; idx <= collapsedLine.length - normTarget.length; idx++) {
          const slice = collapsedLine.slice(idx, idx + normTarget.length);
          if (rollsMatch(slice, normTarget)) {
            matches.add(slice);
          }
        }
      }
    }
  }

  // 3. Adjacent-token merges across line breaks (e.g. "22881A\n05FC")
  const allTokens = text
    .replace(/[^A-Za-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((t) => t.toUpperCase());

  for (let i = 0; i < allTokens.length; i++) {
    let merged = "";
    for (let span = 0; span < 3 && i + span < allTokens.length; span++) {
      merged += allTokens[i + span];
      if (span > 0 && merged.length >= 9 && merged.length <= 12 && isPlausibleRollToken(merged, targetLen)) {
        if (
          /^\d{2,5}[A-Z0-9]{1,2}\d{2}[A-Z0-9]{2,4}$/.test(ocrNormalize(merged)) ||
          /^\d{10,12}$/.test(merged) ||
          (targetLen && merged.length === targetLen)
        ) {
          matches.add(merged);
        }
      }
    }
  }

  return Array.from(matches);
}

/**
 * Evaluates candidates collected across multiple OCR passes and decides whether
 * the scan reliably verifies the target roll number, is ambiguous, mismatches,
 * or found no roll number.
 */
export function evaluateOcrPasses(
  passes: OcrPassInput[],
  targetRollNo: string
): RollEvaluationResult {
  const normTarget = normalize(targetRollNo);
  const candidateMap = new Map<
    string,
    {
      raw: string;
      normalized: string;
      passNames: Set<string>;
      confidences: number[];
      matchesTarget: boolean;
      isExactTarget: boolean;
    }
  >();

  for (const pass of passes) {
    if (!pass.text.trim()) continue;
    const found = extractRollNumbers(pass.text, targetRollNo);
    const seenInPass = new Set<string>();

    for (const rawCand of found) {
      const normCand = normalize(rawCand);
      const matchesTarget = rollsMatch(normCand, normTarget);
      const key = matchesTarget ? normTarget : normCand;

      if (seenInPass.has(key)) continue;
      seenInPass.add(key);

      const existing = candidateMap.get(key);
      const safeConf = Number.isFinite(pass.confidence) ? Math.max(0, Math.min(100, pass.confidence)) : 0;

      if (existing) {
        existing.passNames.add(pass.passName);
        existing.confidences.push(safeConf);
        if (normCand === normTarget) {
          existing.isExactTarget = true;
          existing.raw = rawCand;
        }
      } else {
        candidateMap.set(key, {
          raw: rawCand,
          normalized: key,
          passNames: new Set([pass.passName]),
          confidences: [safeConf],
          matchesTarget,
          isExactTarget: normCand === normTarget,
        });
      }
    }
  }

  const candidates: CandidateScore[] = Array.from(candidateMap.values())
    .map((entry) => {
      const passesMatched = entry.passNames.size;
      const maxConfidence = Math.max(...entry.confidences);
      const avgConfidence =
        entry.confidences.reduce((sum, c) => sum + c, 0) / entry.confidences.length;
      const formatBonus = entry.normalized.length === normTarget.length ? 12 : 0;
      const exactBonus = entry.isExactTarget ? 15 : 0;
      const score = passesMatched * 30 + maxConfidence * 0.6 + avgConfidence * 0.3 + formatBonus + exactBonus;

      return {
        raw: entry.raw,
        normalized: entry.normalized,
        passesMatched,
        maxConfidence: Math.round(maxConfidence),
        avgConfidence: Math.round(avgConfidence),
        matchesTarget: entry.matchesTarget,
        isExactTarget: entry.isExactTarget,
        score,
      };
    })
    .sort((a, b) => b.score - a.score);

  if (candidates.length === 0) {
    return {
      verified: false,
      ambiguous: false,
      matchedRoll: null,
      bestCandidate: null,
      reason: "not_found",
      candidates: [],
    };
  }

  const targetCandidate = candidates.find((c) => c.matchesTarget);
  const targetIsNumeric = /^\d+$/.test(normTarget);
  const conflictingSameLen = candidates.filter(
    (c) =>
      !c.matchesTarget &&
      c.normalized.length === normTarget.length &&
      (/^\d{2,5}[A-Z]{1,2}\d{2}[A-Z0-9]{2,4}$/.test(c.normalized) ||
        (targetIsNumeric && /^\d{10,12}$/.test(c.normalized)))
  );

  if (targetCandidate) {
    // Ambiguity check: if another genuine-looking roll number of the same format
    // strongly outweighs the target across passes/confidence, refuse to auto-verify.
    const strongerConflict = conflictingSameLen.find(
      (conflict) =>
        (conflict.passesMatched > targetCandidate.passesMatched &&
          conflict.maxConfidence >= targetCandidate.maxConfidence + 10 &&
          conflict.score > targetCandidate.score + 15) ||
        (!targetCandidate.isExactTarget &&
          conflict.passesMatched >= targetCandidate.passesMatched &&
          conflict.score > targetCandidate.score)
    );

    if (strongerConflict) {
      return {
        verified: false,
        ambiguous: true,
        matchedRoll: null,
        bestCandidate: strongerConflict.raw,
        reason: "ambiguous",
        candidates,
      };
    }

    // Require either exact match, multi-pass agreement, or reasonable single-pass confidence
    const reliable =
      targetCandidate.isExactTarget ||
      targetCandidate.passesMatched >= 2 ||
      targetCandidate.maxConfidence >= 45;

    if (reliable) {
      return {
        verified: true,
        ambiguous: false,
        matchedRoll: normTarget,
        bestCandidate: targetCandidate.raw,
        reason: "matched",
        candidates,
      };
    }

    return {
      verified: false,
      ambiguous: true,
      matchedRoll: null,
      bestCandidate: targetCandidate.raw,
      reason: "ambiguous",
      candidates,
    };
  }

  const bestNonMatch = conflictingSameLen[0] ?? candidates[0];
  return {
    verified: false,
    ambiguous: false,
    matchedRoll: null,
    bestCandidate: bestNonMatch.raw,
    reason: "mismatch",
    candidates,
  };
}
