import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  normalize,
  ocrNormalize,
  positionGuidedNormalize,
  rollsMatch,
  extractRollNumbers,
  evaluateOcrPasses,
  type OcrPassInput,
} from "../rollNumberMatcher";

describe("normalize & ocrNormalize", () => {
  it("strips separators and uppercases", () => {
    assert.equal(normalize(" 2488-1a.05:01 "), "24881A0501");
    assert.equal(normalize("2288/1A_05 12"), "22881A0512");
  });

  it("maps common OCR confusions conservatively", () => {
    assert.equal(ocrNormalize("24B81AO5OI"), "24881A0501");
    assert.equal(ocrNormalize("Z4BBIA050S"), "24881A0505");
  });
});

describe("positionGuidedNormalize", () => {
  it("guides letter vs digit positions using the target roll format", () => {
    // Letter 'A' misread as '4' or 'S' at alpha index 5, digits misread as O/I/B/S/Z
    assert.equal(
      positionGuidedNormalize("24B81405O1", "24881A0501"),
      "24881A0501"
    );
    assert.equal(
      positionGuidedNormalize("22B8IA05FC", "22881A05FC"),
      "22881A05FC"
    );
    // Does not mutate unrelated genuinely different roll numbers into matching
    assert.notEqual(
      positionGuidedNormalize("24881A0599", "24881A0501"),
      "24881A0501"
    );
  });
});

describe("rollsMatch (security & confusion handling)", () => {
  it("matches exact and OCR-confused variants of the same roll number", () => {
    assert.equal(rollsMatch("24881A0501", "24881A0501"), true);
    assert.equal(rollsMatch("24B81AO5O1", "24881A0501"), true);
    assert.equal(rollsMatch("2488 1A 0501", "24881A0501"), true);
    assert.equal(rollsMatch("160Z23733OO1", "160223733001"), true);
  });

  it("rejects different students' roll numbers even when 1 digit differs", () => {
    assert.equal(rollsMatch("24881A0502", "24881A0501"), false);
    assert.equal(rollsMatch("24881A0510", "24881A0501"), false);
    assert.equal(rollsMatch("23881A0501", "24881A0501"), false);
    assert.equal(rollsMatch("24881A0401", "24881A0501"), false);
    assert.equal(rollsMatch("160223733002", "160223733001"), false);
  });

  it("rejects empty or wrong-length strings", () => {
    assert.equal(rollsMatch("", "24881A0501"), false);
    assert.equal(rollsMatch("24881A05", "24881A0501"), false);
  });
});

describe("extractRollNumbers", () => {
  it("extracts roll numbers from realistic ID text without plain-word false positives", () => {
    const sample = `
      VARDHAMAN COLLEGE OF ENGINEERING
      STUDENT IDENTITY CARD
      NAME: RUDRA PRASAD
      ROLL NO: 24881A0512
      DEPARTMENT OF CSE
    `;
    const found = extractRollNumbers(sample, "24881A0512");
    assert.ok(found.includes("24881A0512"));
    assert.ok(!found.includes("VARDHAMAN"));
    assert.ok(!found.includes("DEPARTMENT"));
  });

  it("merges roll numbers split across spaces, punctuation, and line breaks", () => {
    const splitSpace = "HT NO : 2488 1A 05 45\nB TECH";
    assert.ok(extractRollNumbers(splitSpace, "24881A0545").includes("24881A0545"));

    const splitLine = "ROLL NO\n24881A\n0545\nCSE";
    assert.ok(extractRollNumbers(splitLine, "24881A0545").includes("24881A0545"));
  });

  it("handles OU 12-digit roll numbers split by spaces", () => {
    const ouText = "HALL TICKET 1602 23 733 001";
    assert.ok(
      extractRollNumbers(ouText, "160223733001").includes("160223733001")
    );
  });
});

describe("evaluateOcrPasses across real-world OCR conditions", () => {
  it("verifies clear card supported across passes", () => {
    const passes: OcrPassInput[] = [
      {
        passName: "gray:SINGLE_BLOCK",
        text: "VARDHAMAN COLLEGE\nROLL NO 24881A0501\nCSE",
        confidence: 88,
      },
      {
        passName: "threshold:SINGLE_BLOCK",
        text: "VARDHAMAN COLLEGE\nROLL NO 24881A0501",
        confidence: 84,
      },
    ];
    const res = evaluateOcrPasses(passes, "24881A0501");
    assert.equal(res.verified, true);
    assert.equal(res.ambiguous, false);
    assert.equal(res.matchedRoll, "24881A0501");
  });

  it("recovers roll number from later crop/threshold pass when initial blurry/low-light pass misses", () => {
    const passes: OcrPassInput[] = [
      {
        passName: "gray:SINGLE_BLOCK",
        text: "VCE STUDENT ID",
        confidence: 42,
      },
      {
        passName: "threshold:SINGLE_BLOCK",
        text: "24B8 1AO5 12",
        confidence: 63,
      },
      {
        passName: "crop-center:SINGLE_LINE",
        text: "24881A0512",
        confidence: 71,
      },
    ];
    const res = evaluateOcrPasses(passes, "24881A0512");
    assert.equal(res.verified, true);
    assert.equal(res.ambiguous, false);
  });

  it("rejects mismatched student ID card cleanly and surfaces detected roll", () => {
    const passes: OcrPassInput[] = [
      {
        passName: "gray:SINGLE_BLOCK",
        text: "ROLL NO 24881A0599",
        confidence: 85,
      },
      {
        passName: "threshold:SINGLE_BLOCK",
        text: "24881A0599",
        confidence: 82,
      },
    ];
    const res = evaluateOcrPasses(passes, "24881A0501");
    assert.equal(res.verified, false);
    assert.equal(res.reason, "mismatch");
    assert.equal(res.bestCandidate, "24881A0599");
  });

  it("flags ambiguous scans when a competing mismatched roll clearly dominates or conflicts", () => {
    const passes: OcrPassInput[] = [
      {
        passName: "gray:SINGLE_BLOCK",
        text: "24881A0599",
        confidence: 92,
      },
      {
        passName: "threshold:SINGLE_BLOCK",
        text: "24881A0599",
        confidence: 91,
      },
      {
        passName: "crop-lower:SPARSE_TEXT",
        text: "24881A0599",
        confidence: 88,
      },
      {
        passName: "crop-upper:SINGLE_BLOCK",
        text: "24881A0501",
        confidence: 45,
      },
    ];
    const res = evaluateOcrPasses(passes, "24881A0501");
    assert.equal(res.verified, false);
    assert.equal(res.ambiguous, true);
    assert.equal(res.reason, "ambiguous");
  });

  it("returns not_found when text contains no roll number", () => {
    const passes: OcrPassInput[] = [
      {
        passName: "gray:SINGLE_BLOCK",
        text: "VARDHAMAN COLLEGE OF ENGINEERING HYDERABAD",
        confidence: 65,
      },
    ];
    const res = evaluateOcrPasses(passes, "24881A0501");
    assert.equal(res.verified, false);
    assert.equal(res.reason, "not_found");
    assert.equal(res.bestCandidate, null);
  });
});
