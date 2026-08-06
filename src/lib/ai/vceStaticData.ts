export interface VceDepartment {
  code: string;
  name: string;
  fullName: string;
}

export const vceStaticData = {
  college: {
    name: "Vardhaman College of Engineering (VCE)",
    shortName: "VCE",
    established: 1999,
    society: "Vardhaman Educational Society",
    affiliation: "Jawaharlal Nehru Technological University Hyderabad (JNTUH)",
    approval: "Approved by AICTE (All India Council for Technical Education)",
    accreditation:
      "NAAC 'A++' grade accredited institution; eligible B.Tech programmes are NBA accredited.",
    address: "Vardhaman College of Engineering, Kacharam, Shamshabad, Hyderabad, Telangana - 501218, India.",
    location: "Located in Kacharam, near Shamshabad, Hyderabad, Telangana (close to Rajiv Gandhi International Airport, Shamshabad).",
  },
  overview: [
    "Vardhaman College of Engineering was established in 1999 by the Vardhaman Educational Society.",
    "It is a private engineering college affiliated to Jawaharlal Nehru Technological University Hyderabad (JNTUH) and approved by AICTE.",
    "The college offers undergraduate (B.Tech) and postgraduate (M.Tech, MBA, MCA) programmes across engineering, technology, and management.",
    "VCE is accredited by NAAC with 'A++' grade and its eligible B.Tech programmes are NBA accredited.",
  ],
  vision:
    "To evolve into a premier institute of engineering education that nurtures technically competent, socially responsible, and innovative engineers of global standards.",
  mission: [
    "To impart quality technical education through a dynamic curriculum and state-of-the-art infrastructure.",
    "To foster research, innovation, and industry collaboration.",
    "To develop professional ethics, leadership, and social responsibility among students.",
  ],
  departments: [
    { code: "CSE", name: "Computer Science and Engineering", fullName: "B.Tech Computer Science and Engineering" },
    { code: "CSM", name: "Computer Science and Engineering (AI & ML)", fullName: "B.Tech CSE (Artificial Intelligence & Machine Learning)" },
    { code: "CSD", name: "Computer Science and Engineering (Data Science)", fullName: "B.Tech CSE (Data Science)" },
    { code: "IT", name: "Information Technology", fullName: "B.Tech Information Technology" },
    { code: "ECE", name: "Electronics and Communication Engineering", fullName: "B.Tech Electronics and Communication Engineering" },
    { code: "EEE", name: "Electrical and Electronics Engineering", fullName: "B.Tech Electrical and Electronics Engineering" },
    { code: "ME", name: "Mechanical Engineering", fullName: "B.Tech Mechanical Engineering" },
    { code: "CE", name: "Civil Engineering", fullName: "B.Tech Civil Engineering" },
  ] as VceDepartment[],
  postGraduate: [
    "M.Tech in Computer Science and Engineering",
    "M.Tech in VLSI System Design",
    "M.Tech in Machine Design",
    "Master of Business Administration (MBA)",
    "Master of Computer Applications (MCA)",
  ],
  campusFacilities: [
    "Central library with digital resources, e-journals, and reading halls.",
    "Well-equipped computer labs, electronics, mechanical, and civil engineering laboratories.",
    "Smart classrooms and seminar halls.",
    "Sports grounds and indoor sports facilities.",
    "Hostel facilities for boys and girls with mess and recreation.",
    "Transport facilities covering Hyderabad and nearby areas.",
    "Cafeteria, bank/ATM facilities, and a dedicated placement & training cell.",
  ],
  clubsEcosystem: [
    "Connect Club - the student-led technology community focused on events, projects, hackathons, and skill development.",
    "Additional student clubs and technical chapters across coding, robotics, arts, and cultural activities.",
  ],
  placements: [
    "A dedicated Training & Placement Cell organizes campus drives, mock interviews, and soft-skill training.",
    "Students receive internships and placement offers across IT, product, and service companies.",
  ],
  administration: [
    "The college is headed by a Chairman and managed by the Vardhaman Educational Society.",
    "The Principal heads academics; department heads (HODs) manage individual departments.",
  ],
} as const;

export function vceStaticContextText(): string {
  const d = vceStaticData;
  const lines: string[] = [];

  lines.push(`College: ${d.college.name}`);
  lines.push(`Established: ${d.college.established} by ${d.college.society}`);
  lines.push(`Affiliation: ${d.college.affiliation}`);
  lines.push(`Approval: ${d.college.approval}`);
  lines.push(`Accreditation: ${d.college.accreditation}`);
  lines.push(`Address: ${d.college.address}`);
  lines.push(`Location: ${d.college.location}`);
  lines.push("");

  lines.push("Overview:");
  d.overview.forEach((o) => lines.push(`- ${o}`));
  lines.push("");

  lines.push("Vision:");
  lines.push(`- ${d.vision}`);
  lines.push("");

  lines.push("Mission:");
  d.mission.forEach((m) => lines.push(`- ${m}`));
  lines.push("");

  lines.push("Departments:");
  d.departments.forEach((dep) => lines.push(`- ${dep.code}: ${dep.name}`));
  lines.push("");

  lines.push("Post-Graduate Programmes:");
  d.postGraduate.forEach((p) => lines.push(`- ${p}`));
  lines.push("");

  lines.push("Campus Facilities:");
  d.campusFacilities.forEach((f) => lines.push(`- ${f}`));
  lines.push("");

  lines.push("Clubs Ecosystem:");
  d.clubsEcosystem.forEach((c) => lines.push(`- ${c}`));
  lines.push("");

  lines.push("Placements:");
  d.placements.forEach((p) => lines.push(`- ${p}`));
  lines.push("");

  lines.push("Administration:");
  d.administration.forEach((a) => lines.push(`- ${a}`));

  return lines.join("\n");
}
