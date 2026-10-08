import { NextResponse } from "next/server";
import PizZip from "pizzip";
import fs from "fs";
import path from "path";
import { requireStaffRequest } from "@/lib/firebase/requestAuth";

export const dynamic = "force-dynamic";

function escapeXml(str: string): string {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function buildParagraph(text: string, size = "24", bold = false, align = "both"): string {
  if (!text.trim()) return "";
  const lines = text.split("\n");
  let xml = "";
  for (const line of lines) {
    if (!line.trim()) {
      xml += `<w:p><w:pPr><w:spacing w:after="120"/></w:pPr></w:p>`;
      continue;
    }
    xml += `
      <w:p>
        <w:pPr><w:spacing w:after="120"/><w:jc w:val="${align}"/></w:pPr>
        <w:r>
          <w:rPr>
            <w:rFonts w:ascii="Arial" w:hAnsi="Arial"/>
            <w:sz w:val="${size}"/>
            ${bold ? "<w:b/>" : ""}
          </w:rPr>
          <w:t>${escapeXml(line)}</w:t>
        </w:r>
      </w:p>
    `;
  }
  return xml;
}

export async function POST(request: Request) {
  try {
    await requireStaffRequest(request);

    const body = await request.json();
    const { toAddress, subject, salutation, content, signOff, date } = body;

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

    const zip = new PizZip(templateBuffer);
    let docXml = zip.file("word/document.xml")!.asText();

    // Construct OOXML for the letter
    let letterXml = "";
    

    letterXml += buildParagraph("To\n" + toAddress, "24", false, "left");
    letterXml += `<w:p><w:pPr><w:spacing w:after="240"/></w:pPr></w:p>`;
    
    if (date) {
      letterXml += `<w:p><w:pPr><w:jc w:val="left"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:sz w:val="24"/><w:b/></w:rPr><w:t>Date: ${escapeXml(date)}</w:t></w:r></w:p>`;
      letterXml += `<w:p><w:pPr><w:spacing w:after="240"/></w:pPr></w:p>`;
    }
    
    if (subject) {
      letterXml += `<w:p><w:pPr><w:jc w:val="left"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:sz w:val="24"/><w:b/></w:rPr><w:t>Subject: ${escapeXml(subject)}</w:t></w:r></w:p>`;
      letterXml += `<w:p><w:pPr><w:spacing w:after="240"/></w:pPr></w:p>`;
    }
    
    if (salutation) {
      letterXml += buildParagraph(salutation, "24", false, "left");
    }
    
    letterXml += buildParagraph(content, "24", false, "both");
    letterXml += `<w:p><w:pPr><w:spacing w:after="240"/></w:pPr></w:p>`;
    
    if (signOff) {
      letterXml += buildParagraph(signOff, "24", false, "left");
    }

    if (docXml.includes("{{TABLE}}")) {
      docXml = docXml.replace(/\{\{TABLE\}\}/, letterXml);
    } else {
      docXml = docXml.replace(/<\/w:body>/, `${letterXml}</w:body>`);
    }

    zip.file("word/document.xml", docXml);
    const docBuffer = zip.generate({ type: "nodebuffer", compression: "DEFLATE" });

    return new NextResponse(docBuffer as any, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="letter.docx"`,
      },
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
