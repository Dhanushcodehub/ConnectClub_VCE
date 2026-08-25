import { NextResponse } from "next/server";
import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import { getAdminApp } from "@/lib/firebase/admin";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import fs from "fs";
import path from "path";
import JSZip from "jszip";

export const dynamic = "force-dynamic";

// CSE cluster definitions
const CSE_CLUSTERS: Record<string, string[]> = {
  "Cluster 1": ["A", "B", "C"],
  "Cluster 2": ["D", "E", "F"],
  "Cluster 3": ["G", "H", "I"],
};

function getCSECluster(section: string): string | null {
  for (const [cluster, sections] of Object.entries(CSE_CLUSTERS)) {
    if (sections.includes(section.toUpperCase())) return cluster;
  }
  return null;
}

function buildTable(rows: any[]): any {
  // Build a OOXML table that matches the template styling
  const headerRow = `
    <w:tr>
      <w:trPr><w:tblHeader/><w:trHeight w:val="400"/></w:trPr>
      ${["S.NO", "STUDENT NAME", "DEPARTMENT", "YEAR", "SECTION", "ROLL NUMBER"]
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
      (row, i) => `
    <w:tr>
      ${[
        String(i + 1),
        row.name,
        row.branch,
        row.year,
        row.section,
        row.rollNo,
      ]
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
    </w:tr>`
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
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

async function generateDocx(
  rows: any[],
  groupName: string,
  templateBuffer: Buffer
): Promise<Buffer> {
  const zip = new PizZip(templateBuffer);
  
  // Inject table into document.xml by replacing {{TABLE}} placeholder
  let docXml = zip.file("word/document.xml")!.asText();
  
  // Replace the placeholder paragraph containing {{TABLE}}
  const tableXml = buildTable(rows);
  
  // Try to replace {{TABLE}} placeholder if it exists
  if (docXml.includes("{{TABLE}}")) {
    docXml = docXml.replace(/\{\{TABLE\}\}/, tableXml);
  } else {
    // Find the last paragraph before </w:body> and inject after it
    docXml = docXml.replace(/<\/w:body>/, `${tableXml}</w:body>`);
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
    const {
      branches = [],
      year,
      sections,
      rollNumbers,
      sortBy = "rollNo",
    } = body;

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

    // 2. Fetch registrations from InspireX
    const projectId = process.env.INSPIREX_FIREBASE_PROJECT_ID;
    const clientEmail = process.env.INSPIREX_FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.INSPIREX_FIREBASE_PRIVATE_KEY?.replace(
      /\\n/g,
      "\n"
    );

    if (!projectId || !clientEmail || !privateKey) {
      return NextResponse.json(
        { error: "Missing InspireX Firebase credentials." },
        { status: 500 }
      );
    }

    const appName = "inspirex-admin";
    let inspirexApp: admin.app.App;
    const existingApp = admin.apps.find((app) => app && app.name === appName);
    if (existingApp) {
      inspirexApp = existingApp;
    } else {
      inspirexApp = admin.initializeApp(
        {
          credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
        },
        appName
      );
    }

    const db = getFirestore(inspirexApp);
    const snapshot = await db.collection("registrations").get();
    
    let allRegistrations = snapshot.docs.map((doc) => {
      const d = doc.data();
      return {
        id: doc.id,
        name: d.name || d.fullName || "Unknown",
        branch: (d.branch || "Unknown").toUpperCase().trim(),
        rollNo: (d.rollNo || "Unknown").toUpperCase().trim(),
        year: d.year || "Unknown",
        section: (d.section || "").toUpperCase().trim() || "–",
        email: d.email || "",
      };
    });

    // 3. Filter by roll numbers if provided (exact roster)
    const notFoundRolls: string[] = [];
    if (rollNumbers && rollNumbers.length > 0) {
      const normalizedList = [...new Set(rollNumbers.map((r: string) => r.toUpperCase().trim()))];
      const foundSet = new Set(allRegistrations.map((r) => r.rollNo));
      normalizedList.forEach((r) => { if (!foundSet.has(r)) notFoundRolls.push(r); });
      allRegistrations = allRegistrations.filter((r) => normalizedList.includes(r.rollNo));
    }

    // 4. Filter by year
    if (year && year !== "All") {
      allRegistrations = allRegistrations.filter((r) => r.year === year);
    }

    // 5. Filter by sections
    if (sections && sections.length > 0) {
      allRegistrations = allRegistrations.filter((r) =>
        sections.includes(r.section)
      );
    }

    // 6. Filter by branches
    const targetBranches = branches.length > 0
      ? branches.map((b: string) => b.toUpperCase().trim())
      : [...new Set(allRegistrations.map((r) => r.branch))];

    allRegistrations = allRegistrations.filter((r) =>
      targetBranches.includes(r.branch)
    );

    // 7. Sort
    const sorted = [...allRegistrations].sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      return a.rollNo.localeCompare(b.rollNo);
    });

    // 8. Group by branch and CSE cluster
    const groups: Record<string, { label: string; rows: typeof sorted; filename: string }> = {};

    for (const reg of sorted) {
      if (reg.branch === "CSE" || reg.branch.includes("CSE")) {
        const cluster = getCSECluster(reg.section);
        const key = cluster ? `CSE_${cluster}` : "CSE_Unknown";
        const label = cluster ? `CSE – ${cluster}` : "CSE – Unknown Section";
        const clusterNum = cluster ? cluster.replace("Cluster ", "") : "X";
        const sections = cluster ? CSE_CLUSTERS[cluster].join("") : "X";
        if (!groups[key]) {
          groups[key] = {
            label,
            rows: [],
            filename: `CSE_CLUSTER_${clusterNum}_${sections}_LIST.docx`,
          };
        }
        groups[key].rows.push(reg);
      } else {
        const key = reg.branch;
        if (!groups[key]) {
          groups[key] = {
            label: reg.branch,
            rows: [],
            filename: `${reg.branch}_LIST.docx`,
          };
        }
        groups[key].rows.push(reg);
      }
    }

    const groupList = Object.entries(groups).map(([key, g]) => ({
      key,
      label: g.label,
      rowCount: g.rows.length,
      filename: g.filename,
      preview: g.rows.slice(0, 5).map((r, i) => ({
        sno: i + 1,
        name: r.name,
        branch: r.branch,
        year: r.year,
        section: r.section,
        rollNo: r.rollNo,
      })),
    }));

    // 9. If preview=true, return just the preview
    const url = new URL(request.url);
    if (url.searchParams.get("preview") === "true") {
      return NextResponse.json({
        success: true,
        groups: groupList,
        total: sorted.length,
        notFound: notFoundRolls,
      });
    }

    // 10. Generate .docx per group and zip
    const outputZip = new JSZip();
    let hasFiles = false;

    for (const [key, group] of Object.entries(groups)) {
      if (group.rows.length === 0) continue;
      const docBuffer = await generateDocx(group.rows, group.label, templateBuffer);
      outputZip.file(group.filename, docBuffer);
      hasFiles = true;
    }

    if (!hasFiles) {
      return NextResponse.json(
        { error: "No matching registrations found for selected filters." },
        { status: 400 }
      );
    }

    const zipBuffer = await outputZip.generateAsync({ type: "nodebuffer" });

    return new NextResponse(zipBuffer, {
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
