import { NextResponse } from "next/server";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import fs from "fs";
import path from "path";
import JSZip from "jszip";

export const dynamic = "force-dynamic";

function buildTopText(para1: string, para2: string): string {
  return `
    <w:p><w:pPr><w:spacing w:after="240"/><w:jc w:val="both"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:sz w:val="26"/></w:rPr><w:t>${escapeXml(para1)}</w:t></w:r></w:p>
    <w:p><w:pPr><w:spacing w:after="240"/><w:jc w:val="both"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:sz w:val="26"/></w:rPr><w:t>${escapeXml(para2)}</w:t></w:r></w:p>
  `;
}

function buildHeading(label: string, year: string): string {
  const headingText = `${label.replace("CSE – ", "CSE - ")} - ${year}`.toUpperCase();
  return `
    <w:p><w:pPr><w:spacing w:before="240" w:after="240"/><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:b/><w:sz w:val="32"/></w:rPr><w:t>${escapeXml(headingText)}</w:t></w:r></w:p>
  `;
}

function buildSignatureBlock(): string {
  return `
    <w:p><w:pPr><w:spacing w:before="800"/></w:pPr></w:p>
    <w:tbl>
      <w:tblPr>
        <w:tblW w:w="9000" w:type="dxa"/>
        <w:tblLayout w:type="fixed"/>
        <w:tblBorders>
          <w:top w:val="none" w:sz="0" w:space="0" w:color="auto"/>
          <w:left w:val="none" w:sz="0" w:space="0" w:color="auto"/>
          <w:bottom w:val="none" w:sz="0" w:space="0" w:color="auto"/>
          <w:right w:val="none" w:sz="0" w:space="0" w:color="auto"/>
          <w:insideH w:val="none" w:sz="0" w:space="0" w:color="auto"/>
          <w:insideV w:val="none" w:sz="0" w:space="0" w:color="auto"/>
        </w:tblBorders>
      </w:tblPr>
      <w:tr>
        <w:tc>
          <w:tcPr><w:tcW w:w="3000" w:type="dxa"/></w:tcPr>
          <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:b/><w:sz w:val="22"/></w:rPr><w:t>Signature of Dean (SAC)</w:t></w:r></w:p>
        </w:tc>
        <w:tc>
          <w:tcPr><w:tcW w:w="3000" w:type="dxa"/></w:tcPr>
          <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:b/><w:sz w:val="22"/></w:rPr><w:t>Signature of Secretary (Connect Club)</w:t></w:r></w:p>
        </w:tc>
        <w:tc>
          <w:tcPr><w:tcW w:w="3000" w:type="dxa"/></w:tcPr>
          <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:b/><w:sz w:val="22"/></w:rPr><w:t>Signature of HOD</w:t></w:r></w:p>
        </w:tc>
      </w:tr>
    </w:tbl>
  `;
}

function buildTable(rows: any[], columns: Record<string, boolean>): any {
  const activeHeaders = [];
  if (columns.sno) activeHeaders.push("S.NO");
  if (columns.name) activeHeaders.push("STUDENT NAME");
  if (columns.branch) activeHeaders.push("DEPARTMENT");
  if (columns.year) activeHeaders.push("YEAR");
  if (columns.section) activeHeaders.push("SECTION");
  if (columns.rollNo) activeHeaders.push("ROLL NUMBER");
  if (columns.signature) activeHeaders.push("SIGNATURE");

  // Build a OOXML table that matches the template styling
  const headerRow = `
    <w:tr>
      <w:trPr><w:tblHeader/><w:trHeight w:val="400"/></w:trPr>
      ${activeHeaders
        .map(
          (h) => `
        <w:tc>
          <w:tcPr><w:tcBorders>
            <w:top w:val="single" w:sz="4" w:color="000000"/>
            <w:left w:val="single" w:sz="4" w:color="000000"/>
            <w:bottom w:val="single" w:sz="4" w:color="000000"/>
            <w:right w:val="single" w:sz="4" w:color="000000"/>
          </w:tcBorders></w:tcPr>
          <w:p><w:pPr><w:jc w:val="center"/></w:pPr>
            <w:r><w:rPr><w:b/><w:sz w:val="18"/></w:rPr><w:t>${h}</w:t></w:r>
          </w:p>
        </w:tc>`
        )
        .join("")}
    </w:tr>`;

  const dataRows = rows
    .map(
      (row, i) => {
        const activeCells = [];
        if (columns.sno) activeCells.push(String(i + 1));
        if (columns.name) activeCells.push(row.name);
        if (columns.branch) activeCells.push(row.branch);
        if (columns.year) activeCells.push(row.year);
        if (columns.section) activeCells.push(row.section);
        if (columns.rollNo) activeCells.push(row.rollNo);
        if (columns.signature) activeCells.push("");
        
        return `
    <w:tr>
      ${activeCells
        .map(
          (cell) => `
        <w:tc>
          <w:tcPr><w:tcBorders>
            <w:top w:val="single" w:sz="4" w:color="000000"/>
            <w:left w:val="single" w:sz="4" w:color="000000"/>
            <w:bottom w:val="single" w:sz="4" w:color="000000"/>
            <w:right w:val="single" w:sz="4" w:color="000000"/>
          </w:tcBorders></w:tcPr>
          <w:p><w:pPr><w:jc w:val="center"/></w:pPr>
            <w:r><w:rPr><w:sz w:val="18"/></w:rPr><w:t xml:space="preserve">${escapeXml(cell)}</w:t></w:r>
          </w:p>
        </w:tc>`
        )
        .join("")}
    </w:tr>`;
      }
    )
    .join("");

  return `<w:tbl>
    <w:tblPr>
      <w:tblStyle w:val="TableGrid"/>
      <w:tblW w:w="9000" w:type="dxa"/>
      <w:tblBorders>
        <w:top w:val="single" w:sz="4" w:color="000000"/>
        <w:left w:val="single" w:sz="4" w:color="000000"/>
        <w:bottom w:val="single" w:sz="4" w:color="000000"/>
        <w:right w:val="single" w:sz="4" w:color="000000"/>
        <w:insideH w:val="single" w:sz="4" w:color="000000"/>
        <w:insideV w:val="single" w:sz="4" w:color="000000"/>
      </w:tblBorders>
    </w:tblPr>
    ${headerRow}
    ${dataRows}
  </w:tbl>`;
}

function escapeXml(str: string): string {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

async function generateDocx(
  rows: any[],
  columns: Record<string, boolean>,
  label: string,
  para1: string,
  para2: string,
  templateBuffer: Buffer
): Promise<Buffer> {
  const zip = new PizZip(templateBuffer);
  
  // Inject table into document.xml by replacing {{TABLE}} placeholder
  let docXml = zip.file("word/document.xml")!.asText();
  
  // Build the complete content: top text + table + signature
  const topTextXml = buildTopText(para1, para2);
  const sigXml = buildSignatureBlock();
  
  const years = ["1st Year", "2nd Year", "3rd Year", "4th Year", "Unknown"];
  let tablesXml = "";
  
  for (const year of years) {
    const yearRows = rows.filter(r => (r.year || "Unknown") === year);
    if (yearRows.length === 0) continue;
    
    tablesXml += buildHeading(label, year);
    tablesXml += buildTable(yearRows, columns);
    // Add empty paragraph between tables for spacing
    tablesXml += `<w:p><w:pPr><w:spacing w:after="240"/></w:pPr></w:p>`;
  }
  
  const fullContent = `${topTextXml}${tablesXml}${sigXml}`;
  
  // Try to replace {{TABLE}} placeholder if it exists
  if (docXml.includes("{{TABLE}}")) {
    docXml = docXml.replace(/\{\{TABLE\}\}/, fullContent);
  } else {
    // Find the last paragraph before </w:body> and inject after it
    docXml = docXml.replace(/<\/w:body>/, `${fullContent}</w:body>`);
  }
  
  zip.file("word/document.xml", docXml);
  
  const out = zip.generate({
    type: "nodebuffer",
    compression: "DEFLATE",
  });
  
  return out;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { documents, columns, para1, para2 } = body;

    if (!documents || !Array.isArray(documents) || documents.length === 0) {
       return NextResponse.json(
        { error: "No documents provided to generate." },
        { status: 400 }
      );
    }
    
    // Default columns if not provided
    const cols = columns || { sno: true, rollNo: true, name: true, branch: true, year: true, section: true, signature: false };
    const p1 = para1 || "";
    const p2 = para2 || "";

    // 1. Load template
    const templatePath = path.join(
      process.cwd(),
      "src/lib/data/Template (lock).docx"
    );
    
    if (!fs.existsSync(templatePath)) {
      return NextResponse.json(
        { error: "Template file not found." },
        { status: 404 }
      );
    }
    const templateBuffer = fs.readFileSync(templatePath);

    // 2. Generate .docx per document group
    // If only one document, we can just return that .docx file directly
    if (documents.length === 1) {
       const doc = documents[0];
       const docBuffer = await generateDocx(doc.rows, cols, doc.label || "", p1, p2, templateBuffer);
       
       return new NextResponse(docBuffer as any, {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "Content-Disposition": `attachment; filename=${doc.filename}`,
        },
      });
    }

    // 3. Multiple documents, return a zip
    const outputZip = new JSZip();

    for (const doc of documents) {
      if (!doc.rows || doc.rows.length === 0) continue;
      const docBuffer = await generateDocx(doc.rows, cols, doc.label || "", p1, p2, templateBuffer);
      outputZip.file(doc.filename, docBuffer);
    }

    const zipBuffer = await outputZip.generateAsync({ type: "nodebuffer" });

    return new NextResponse(zipBuffer as any, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": "attachment; filename=member_lists.zip",
      },
    });
  } catch (error: any) {
    console.error("Error generating member list:", error);
    return NextResponse.json(
      { error: "Failed to generate documents.", details: error.message },
      { status: 500 }
    );
  }
}
