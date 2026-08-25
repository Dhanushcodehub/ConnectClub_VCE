'use client';

import React from 'react';
import { Star, Calendar, Clock, ChevronDown } from 'lucide-react';
import { FeedbackForm, FormQuestion } from '@/lib/firebase/feedbackForms';

interface FormPreviewProps {
  form: FeedbackForm;
}

export default function FormPreview({ form }: FormPreviewProps) {
  const themeColor = form.themeColor || '#8b5cf6'; // Default primary color

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6 pb-12">
      {/* Form Header */}
      <div 
        className="bg-[#0C0C0E] border border-white/[0.06] rounded-2xl overflow-hidden relative"
      >
        <div className="h-3 w-full" style={{ backgroundColor: themeColor }} />
        <div className="p-8">
          <h1 className="text-3xl font-bold text-white mb-3">
            {form.title || 'Untitled Form'}
          </h1>
          {form.description && (
            <p className="text-white/60 whitespace-pre-wrap">
              {form.description}
            </p>
          )}
        </div>
      </div>

      {/* Form Questions */}
      {form.sections?.flatMap((section) => section.questions)?.map((question) => (
        <PreviewQuestionCard 
          key={question.id} 
          question={question} 
          themeColor={themeColor} 
        />
      ))}

      {/* Submit Button Preview */}
      {(form.sections?.flatMap((s) => s.questions)?.length ?? 0) > 0 && (
        <div className="flex justify-end pt-4">
          <button 
            disabled
            className="px-6 py-2.5 rounded-xl font-medium text-white/90 disabled:opacity-50 transition-opacity"
            style={{ backgroundColor: themeColor }}
          >
            Submit
          </button>
        </div>
      )}
    </div>
  );
}

function PreviewQuestionCard({ question, themeColor }: { question: FormQuestion, themeColor: string }) {
  if (question.type === 'section_header') {
    return (
      <div className="pt-6 pb-2 border-b border-white/[0.06]">
        <h2 className="text-xl font-semibold text-white">
          {question.label || 'Section Title'}
        </h2>
        {question.description && (
          <p className="text-sm text-white/50 mt-1">
            {question.description}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="bg-[#0C0C0E] border border-white/[0.06] rounded-2xl p-6 sm:p-8 space-y-4">
      <div className="space-y-1">
        <label className="text-base sm:text-lg font-medium text-white flex gap-1">
          {question.label || 'Question Title'}
          {question.required && <span className="text-red-400">*</span>}
        </label>
        {question.description && (
          <p className="text-sm text-white/50">{question.description}</p>
        )}
      </div>

      <div className="pt-2 pointer-events-none opacity-80">
        <QuestionInputPreview question={question} themeColor={themeColor} />
      </div>
    </div>
  );
}

function QuestionInputPreview({ question, themeColor }: { question: FormQuestion, themeColor: string }) {
  switch (question.type) {
    case 'short_text':
      return (
        <input
          type="text"
          placeholder="Your answer"
          disabled
          className="w-full sm:w-2/3 bg-transparent border-b border-white/20 pb-2 text-white/70 placeholder-white/30 focus:outline-none"
        />
      );

    case 'long_text':
      return (
        <textarea
          placeholder="Your answer"
          disabled
          rows={3}
          className="w-full bg-transparent border-b border-white/20 pb-2 text-white/70 placeholder-white/30 focus:outline-none resize-none"
        />
      );

    case 'multiple_choice':
      return (
        <div className="space-y-3">
          {(question.options || ['Option 1']).map((option, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-full border-2 border-white/30" />
              <span className="text-white/80">{option}</span>
            </div>
          ))}
        </div>
      );

    case 'checkboxes':
      return (
        <div className="space-y-3">
          {(question.options || ['Option 1']).map((option, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-5 h-5 rounded border-2 border-white/30" />
              <span className="text-white/80">{option}</span>
            </div>
          ))}
        </div>
      );

    case 'dropdown':
      return (
        <div className="relative w-full sm:w-2/3">
          <div className="w-full bg-[#1C1C20] border border-white/10 rounded-xl px-4 py-3 text-white/50 flex justify-between items-center">
            <span>Choose</span>
            <ChevronDown size={18} className="text-white/40" />
          </div>
        </div>
      );

    case 'linear_scale':
      const min = question.scaleMin || 1;
      const max = question.scaleMax || 5;
      const range = Array.from({ length: max - min + 1 }, (_, i) => min + i);
      
      return (
        <div className="flex flex-col space-y-4 pt-2">
          <div className="flex justify-between w-full max-w-md items-center gap-4">
            <span className="text-sm font-medium text-white/70 text-right flex-1">{question.scaleMinLabel}</span>
            <div className="flex space-x-2 justify-center flex-none">
              {range.map(num => (
                <button
                  key={num}
                  type="button"
                  disabled
                  className="w-10 h-10 rounded-full flex items-center justify-center transition-all bg-white/5 text-white/70 border border-white/10"
                >
                  {num}
                </button>
              ))}
            </div>
            <span className="text-sm font-medium text-white/70 text-left flex-1">{question.scaleMaxLabel}</span>
          </div>
        </div>
      );

    case 'star_rating':
      const stars = question.maxStars || 5;
      return (
        <div className="flex items-center gap-2">
          {Array.from({ length: stars }).map((_, i) => (
            <Star key={i} size={32} className="text-white/20" strokeWidth={1.5} />
          ))}
        </div>
      );

    case 'date':
      return (
        <div className="inline-flex items-center gap-3 border-b border-white/20 pb-2 text-white/30 w-auto pr-4">
          <span className="text-white/50">mm/dd/yyyy</span>
          <Calendar size={20} className="text-white/40" />
        </div>
      );

    case 'time':
      return (
        <div className="inline-flex items-center gap-3 border-b border-white/20 pb-2 text-white/30 w-auto pr-4">
          <span className="text-white/50">--:-- --</span>
          <Clock size={20} className="text-white/40" />
        </div>
      );

    default:
      return null;
  }
}
