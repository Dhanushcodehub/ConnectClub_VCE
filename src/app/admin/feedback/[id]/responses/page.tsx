"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Download,
  Trash2,
  ArrowLeft,
  BarChart3,
  User,
  FileSpreadsheet,
} from "lucide-react";
import {
  FeedbackForm,
  FeedbackResponse,
  getFeedbackForm,
  getFeedbackResponses,
  generateCSV,
  deleteResponse,
} from "@/lib/firebase/feedbackForms";
import ResponseChart from "../../_components/ResponseChart";
import Link from "next/link";

type Tab = "summary" | "individual" | "export";

export default function ResponseAnalyticsPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [form, setForm] = useState<FeedbackForm | null>(null);
  const [responses, setResponses] = useState<FeedbackResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("summary");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        if (!id) return;
        const [formData, responseData] = await Promise.all([
          getFeedbackForm(id),
          getFeedbackResponses(id),
        ]);
        if (formData) setForm(formData);
        setResponses(responseData);
      } catch (error) {
        console.error("Failed to fetch responses", error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id]);

  const handleDelete = async (responseId: string) => {
    if (!confirm("Are you sure you want to delete this response?")) return;
    try {
      setDeletingId(responseId);
      await deleteResponse(responseId, id);
      setResponses((prev) => prev.filter((r) => r.id !== responseId));
    } catch (error) {
      console.error("Failed to delete response", error);
      alert("Failed to delete response");
    } finally {
      setDeletingId(null);
    }
  };

  const handleDownloadCSV = () => {
    if (!form) return;
    try {
      const csvString = generateCSV(form, responses);
      const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `${form.title}_responses.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Failed to generate CSV", error);
      alert("Failed to generate CSV");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0C0C0E] bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:32px_32px] p-6 lg:p-10 text-white flex flex-col gap-6">
        <div className="h-10 w-48 bg-white/5 animate-pulse rounded-md" />
        <div className="h-12 w-full max-w-sm bg-white/5 animate-pulse rounded-xl" />
        <div className="h-64 w-full bg-white/5 animate-pulse rounded-xl" />
      </div>
    );
  }

  if (!form) {
    return (
      <div className="min-h-screen bg-[#0C0C0E] p-6 text-white flex items-center justify-center">
        <p>Form not found.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0C0C0E] bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:32px_32px] text-white">
      <div className="max-w-5xl mx-auto p-6 lg:p-10 space-y-8">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link
            href="/admin/feedback"
            className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/70 hover:text-white"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">{form.title}</h1>
            <p className="text-white/60 text-sm mt-1">{responses.length} responses</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 p-1 bg-white/5 rounded-xl w-fit">
          <button
            onClick={() => setActiveTab("summary")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "summary"
                ? "bg-white/10 text-white"
                : "text-white/60 hover:text-white/90 hover:bg-white/5"
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Summary
          </button>
          <button
            onClick={() => setActiveTab("individual")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "individual"
                ? "bg-white/10 text-white"
                : "text-white/60 hover:text-white/90 hover:bg-white/5"
            }`}
          >
            <User className="w-4 h-4" />
            Individual
          </button>
          <button
            onClick={() => setActiveTab("export")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "export"
                ? "bg-white/10 text-white"
                : "text-white/60 hover:text-white/90 hover:bg-white/5"
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            Export
          </button>
        </div>

        {/* Content */}
        <div className="mt-8">
          <AnimatePresence mode="wait">
            {activeTab === "summary" && (
              <motion.div
                key="summary"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="bg-[#111113] border border-white/[0.08] rounded-xl p-8 text-center max-w-sm">
                  <h2 className="text-5xl font-bold text-white mb-2">
                    {responses.length}
                  </h2>
                  <p className="text-white/60">Total Responses</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {form.sections.map((section) =>
                    section.questions
                      .filter((q) => q.type !== "section_header")
                      .map((question) => (
                        <ResponseChart
                          key={question.id}
                          question={question}
                          responses={responses}
                        />
                      ))
                  )}
                </div>
                
                {responses.length === 0 && (
                  <div className="text-center py-12 text-white/50">
                    No responses yet.
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === "individual" && (
              <motion.div
                key="individual"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                {responses.length === 0 ? (
                  <div className="text-center py-12 text-white/50">
                    No responses yet.
                  </div>
                ) : (
                  <div className="space-y-6">
                    {responses.map((response) => (
                      <div
                        key={response.id}
                        className="bg-[#111113] border border-white/[0.08] rounded-xl p-6 relative group"
                      >
                        <button
                          onClick={() => handleDelete(response.id)}
                          disabled={deletingId === response.id}
                          className="absolute top-4 right-4 p-2 text-white/40 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                          title="Delete Response"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        
                        <div className="flex flex-wrap gap-x-6 gap-y-2 mb-6 pb-4 border-b border-white/5 text-sm">
                          {response.submittedAt && (
                            <div className="text-white/50">
                              Date:{" "}
                              <span className="text-white/90">
                                {new Date(
                                  response.submittedAt.seconds * 1000
                                ).toLocaleString()}
                              </span>
                            </div>
                          )}
                          {response.userName && (
                            <div className="text-white/50">
                              Name:{" "}
                              <span className="text-white/90">
                                {response.userName}
                              </span>
                            </div>
                          )}
                          {response.userEmail && (
                            <div className="text-white/50">
                              Email:{" "}
                              <span className="text-white/90">
                                {response.userEmail}
                              </span>
                            </div>
                          )}
                          {response.userRollNo && (
                            <div className="text-white/50">
                              Roll No:{" "}
                              <span className="text-white/90">
                                {response.userRollNo}
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="space-y-6">
                          {form.sections.map((section) =>
                            section.questions
                              .filter((q) => q.type !== "section_header")
                              .map((q) => {
                                const ans = response.answers?.[q.id];
                                const displayAns = Array.isArray(ans)
                                  ? ans.join(", ")
                                  : ans !== undefined
                                  ? String(ans)
                                  : "-";
                                return (
                                  <div key={q.id}>
                                    <div className="text-sm font-medium text-white/70 mb-1">
                                      {q.label}
                                    </div>
                                    <div className="text-white/90">
                                      {displayAns}
                                    </div>
                                  </div>
                                );
                              })
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === "export" && (
              <motion.div
                key="export"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="max-w-lg"
              >
                <div className="bg-[#111113] border border-white/[0.08] rounded-xl p-8 text-center space-y-6">
                  <div className="mx-auto w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mb-4">
                    <Download className="w-8 h-8 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white mb-2">
                      Export Data
                    </h3>
                    <p className="text-white/60 text-sm">
                      Download all {responses.length} responses for{" "}
                      <span className="text-white/90 font-medium">
                        {form.title}
                      </span>{" "}
                      as a CSV file.
                    </p>
                  </div>
                  <button
                    onClick={handleDownloadCSV}
                    disabled={responses.length === 0}
                    className="w-full py-3 px-4 bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-medium flex items-center justify-center gap-2 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Download CSV
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
