"use client";

import { db } from "@/lib/firebase/config";
import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  increment,
  writeBatch,
  Timestamp,
} from "firebase/firestore";

// ─── Types ──────────────────────────────────────────────────────────────

export type QuestionType =
  | "short_text"
  | "long_text"
  | "multiple_choice"
  | "checkboxes"
  | "dropdown"
  | "linear_scale"
  | "star_rating"
  | "date"
  | "time"
  | "section_header";

export interface FormQuestion {
  id: string;
  type: QuestionType;
  label: string;
  description?: string;
  required: boolean;
  options?: string[];
  scaleMin?: number;
  scaleMax?: number;
  scaleMinLabel?: string;
  scaleMaxLabel?: string;
  maxStars?: number;
}

export interface FormSection {
  id: string;
  title?: string;
  description?: string;
  questions: FormQuestion[];
}

export interface FeedbackForm {
  id: string;
  title: string;
  description: string;
  eventId?: string;
  headerImage?: string;
  themeColor: string;
  createdBy: string;
  createdAt: any;
  updatedAt: any;
  status: "draft" | "published" | "closed";
  requireLogin: boolean;
  collectRollNo: boolean;
  allowMultipleResponses: boolean;
  showProgressBar: boolean;
  confirmationMessage: string;
  responsesCount: number;
  sections: FormSection[];
}

export interface FeedbackResponse {
  id: string;
  formId: string;
  userId?: string;
  userName?: string;
  userEmail?: string;
  userRollNo?: string;
  submittedAt: any;
  answers: Record<string, string | string[] | number>;
}

// ─── Helper: generate a short unique ID ─────────────────────────────────

export function generateId(): string {
  return Math.random().toString(36).substring(2, 10);
}

// ─── Default new form ───────────────────────────────────────────────────

export function createDefaultForm(): Omit<FeedbackForm, "id" | "createdAt" | "updatedAt" | "createdBy"> {
  return {
    title: "Untitled Form",
    description: "",
    themeColor: "#0066FF",
    status: "draft",
    requireLogin: false,
    collectRollNo: true,
    allowMultipleResponses: false,
    showProgressBar: true,
    confirmationMessage: "🎉 Thank you for your feedback! Your response has been recorded.",
    responsesCount: 0,
    sections: [
      {
        id: generateId(),
        questions: [
          {
            id: generateId(),
            type: "short_text",
            label: "",
            required: false,
          },
        ],
      },
    ],
  };
}

// ─── CRUD: Forms ────────────────────────────────────────────────────────

export async function createFeedbackForm(
  data: Omit<FeedbackForm, "id" | "createdAt" | "updatedAt">,
): Promise<string> {
  const ref = await addDoc(collection(db, "feedback_forms"), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateFeedbackForm(
  id: string,
  data: Partial<Omit<FeedbackForm, "id" | "createdAt">>,
): Promise<void> {
  await updateDoc(doc(db, "feedback_forms", id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteFeedbackForm(id: string): Promise<void> {
  // Delete all responses first
  const responsesSnap = await getDocs(
    query(collection(db, "feedback_responses"), where("formId", "==", id)),
  );
  const batch = writeBatch(db);
  responsesSnap.docs.forEach((d) => batch.delete(d.ref));
  batch.delete(doc(db, "feedback_forms", id));
  await batch.commit();
}

export async function getFeedbackForm(id: string): Promise<FeedbackForm | null> {
  const snap = await getDoc(doc(db, "feedback_forms", id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as FeedbackForm;
}

export async function getAllFeedbackForms(): Promise<FeedbackForm[]> {
  const snap = await getDocs(
    query(collection(db, "feedback_forms"), orderBy("createdAt", "desc")),
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as FeedbackForm);
}

export async function publishFeedbackForm(id: string): Promise<void> {
  await updateFeedbackForm(id, { status: "published" });
}

export async function closeFeedbackForm(id: string): Promise<void> {
  await updateFeedbackForm(id, { status: "closed" });
}

// ─── CRUD: Responses ────────────────────────────────────────────────────

export async function submitFeedbackResponse(
  formId: string,
  answers: Record<string, string | string[] | number>,
  user?: { uid?: string; name?: string; email?: string; rollNo?: string },
): Promise<string> {
  const ref = await addDoc(collection(db, "feedback_responses"), {
    formId,
    userId: user?.uid || null,
    userName: user?.name || null,
    userEmail: user?.email || null,
    userRollNo: user?.rollNo || null,
    answers,
    submittedAt: serverTimestamp(),
  });

  // Increment response count on the form
  await updateDoc(doc(db, "feedback_forms", formId), {
    responsesCount: increment(1),
  });

  return ref.id;
}

export async function getFeedbackResponses(formId: string): Promise<FeedbackResponse[]> {
  const snap = await getDocs(
    query(
      collection(db, "feedback_responses"),
      where("formId", "==", formId),
      orderBy("submittedAt", "desc"),
    ),
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as FeedbackResponse);
}

export async function deleteResponse(responseId: string, formId: string): Promise<void> {
  await deleteDoc(doc(db, "feedback_responses", responseId));
  await updateDoc(doc(db, "feedback_forms", formId), {
    responsesCount: increment(-1),
  });
}

// ─── Export CSV ──────────────────────────────────────────────────────────

export function generateCSV(form: FeedbackForm, responses: FeedbackResponse[]): string {
  const allQuestions = form.sections.flatMap((s) =>
    s.questions.filter((q) => q.type !== "section_header"),
  );

  const headers = [
    "Submitted At",
    "Roll No",
    "Name",
    "Email",
    ...allQuestions.map((q) => q.label || "Untitled Question"),
  ];

  const rows = responses.map((r) => {
    const submittedAt = r.submittedAt instanceof Timestamp
      ? r.submittedAt.toDate().toLocaleString()
      : r.submittedAt || "";

    return [
      submittedAt,
      r.userRollNo || "",
      r.userName || "",
      r.userEmail || "",
      ...allQuestions.map((q) => {
        const answer = r.answers[q.id];
        if (Array.isArray(answer)) return answer.join("; ");
        return String(answer ?? "");
      }),
    ];
  });

  const escape = (v: string) => `"${String(v).replace(/"/g, '""')}"`;
  return [headers.map(escape).join(","), ...rows.map((r) => r.map(escape).join(","))].join("\n");
}
