"use client";

import React, { useMemo } from "react";
import { FormQuestion, FeedbackResponse } from "@/lib/firebase/feedbackForms";
import { Star } from "lucide-react";

interface ResponseChartProps {
  question: FormQuestion;
  responses: FeedbackResponse[];
}

export default function ResponseChart({ question, responses }: ResponseChartProps) {
  const data = useMemo(() => {
    const totalResponses = responses.filter(
      (r) => r.answers && r.answers[question.id] !== undefined
    ).length;

    if (totalResponses === 0) return { options: [], total: 0 };

    const counts: Record<string, number> = {};

    if (
      question.type === "multiple_choice" ||
      question.type === "dropdown" ||
      question.type === "checkboxes"
    ) {
      question.options?.forEach((opt) => (counts[opt] = 0));

      responses.forEach((r) => {
        const ans = r.answers?.[question.id];
        if (ans !== undefined) {
          if (Array.isArray(ans)) {
            ans.forEach((val) => {
              if (counts[val] !== undefined) counts[val]++;
              else counts[val] = 1;
            });
          } else {
            const val = String(ans);
            if (counts[val] !== undefined) counts[val]++;
            else counts[val] = 1;
          }
        }
      });
    } else if (question.type === "linear_scale") {
      const min = question.scaleMin ?? 1;
      const max = question.scaleMax ?? 5;
      for (let i = min; i <= max; i++) {
        counts[String(i)] = 0;
      }
      responses.forEach((r) => {
        const ans = r.answers?.[question.id];
        if (ans !== undefined) {
          counts[String(ans)]++;
        }
      });
    } else if (question.type === "star_rating") {
      const maxStars = question.maxStars ?? 5;
      for (let i = 1; i <= maxStars; i++) {
        counts[String(i)] = 0;
      }
      responses.forEach((r) => {
        const ans = r.answers?.[question.id];
        if (ans !== undefined) {
          counts[String(ans)]++;
        }
      });
    }

    const optionsData = Object.entries(counts).map(([label, count]) => ({
      label,
      count,
      percentage: totalResponses > 0 ? (count / totalResponses) * 100 : 0,
    }));

    return { options: optionsData, total: totalResponses };
  }, [question, responses]);

  if (
    question.type === "short_text" ||
    question.type === "long_text" ||
    question.type === "date" ||
    question.type === "time"
  ) {
    return (
      <div className="bg-[#111113] border border-white/[0.08] rounded-xl p-6">
        <h3 className="text-lg font-medium text-white mb-2">{question.label}</h3>
        <p className="text-white/60 text-sm">
          Text responses - see individual tab
        </p>
      </div>
    );
  }

  if (question.type === "section_header") return null;

  return (
    <div className="bg-[#111113] border border-white/[0.08] rounded-xl p-6">
      <div className="mb-6">
        <h3 className="text-lg font-medium text-white mb-1">{question.label}</h3>
        <p className="text-sm text-white/50">{data.total} responses</p>
      </div>

      <div className="space-y-4">
        {data.options.map((opt, i) => (
          <div key={i} className="relative">
            <div className="flex justify-between items-end mb-1 text-sm">
              <span className="text-white/90 flex items-center gap-1">
                {question.type === "star_rating" && (
                  <Star className="w-4 h-4 text-primary fill-primary" />
                )}
                {opt.label}
              </span>
              <span className="text-white/50">
                {opt.count} ({opt.percentage.toFixed(1)}%)
              </span>
            </div>
            <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: `${opt.percentage}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
