'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Loader2, Star, AlertCircle } from 'lucide-react';
import { getFeedbackForm, submitFeedbackResponse, FeedbackForm, FormSection, FormQuestion } from '@/lib/firebase/feedbackForms';
import { useAuth } from '@/lib/contexts/AuthContext';

type Answers = Record<string, any>;

export default function FeedbackFormPage() {
  const { id } = useParams() as { id: string };
  const { user, profile } = useAuth();

  const [form, setForm] = useState<FeedbackForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [answers, setAnswers] = useState<Answers>({});
  const [rollNo, setRollNo] = useState('');
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    async function loadForm() {
      try {
        const formData = await getFeedbackForm(id);
        if (!formData) {
          setError('Form not found');
        } else if (formData.status !== 'published') {
          setError('closed');
        } else {
          setForm(formData);
          // Check localStorage for previous submission
          if (!formData.allowMultipleResponses) {
            const hasSubmitted = localStorage.getItem(`feedback_${id}_submitted`);
            if (hasSubmitted) {
              setSubmitted(true);
            }
          }
        }
      } catch (err: any) {
        setError('Failed to load form');
      } finally {
        setLoading(false);
      }
    }
    loadForm();
  }, [id]);

  useEffect(() => {
    if (profile?.rollNo && !rollNo) {
      setRollNo(profile.rollNo);
    }
  }, [profile, rollNo]);

  const handleAnswerChange = (questionId: string, value: any) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
    if (validationErrors[questionId]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[questionId];
        return newErrors;
      });
    }
  };

  const validateForm = () => {
    if (!form) return false;
    const errors: Record<string, string> = {};
    if (!rollNo.trim()) {
      errors['rollNo'] = 'Roll Number is required';
    }

    form.sections.forEach(section => {
      section.questions.forEach(q => {
        if (q.required) {
          const val = answers[q.id];
          if (val === undefined || val === null || val === '' || (Array.isArray(val) && val.length === 0)) {
            errors[q.id] = 'This question is required';
          }
        }
      });
    });

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    if (!validateForm()) {
      // scroll to first error
      const firstError = Object.keys(validationErrors)[0];
      const el = document.getElementById(`field-${firstError}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    setSubmitting(true);
    try {
      await submitFeedbackResponse(id, answers, {
        uid: user?.uid,
        name: profile?.name || user?.displayName || undefined,
        email: user?.email || undefined,
        rollNo: rollNo.trim(),
      });
      localStorage.setItem(`feedback_${id}_submitted`, 'true');
      setSubmitted(true);
    } catch (err: any) {
      alert('Failed to submit response. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderQuestion = (q: FormQuestion) => {
    const value = answers[q.id];
    const isError = !!validationErrors[q.id];
    const themeColor = form?.themeColor || '#8B5CF6';

    const inputClasses = `w-full bg-white/5 border rounded-xl px-4 py-3 text-white transition-all focus:outline-none focus:ring-2 ${
      isError ? 'border-red-500 focus:ring-red-500/50' : 'border-white/10'
    }`;

    switch (q.type) {
      case 'short_text':
        return (
          <input
            type="text"
            className={inputClasses}
            style={{ '--tw-ring-color': themeColor } as any}
            placeholder="Your answer"
            value={value || ''}
            onChange={e => handleAnswerChange(q.id, e.target.value)}
          />
        );
      case 'long_text':
        return (
          <textarea
            className={`${inputClasses} min-h-[100px] resize-y`}
            style={{ '--tw-ring-color': themeColor } as any}
            placeholder="Your answer"
            value={value || ''}
            onChange={e => handleAnswerChange(q.id, e.target.value)}
          />
        );
      case 'multiple_choice':
        return (
          <div className="space-y-2">
            {q.options?.map((opt, i) => (
              <label key={i} className="flex items-center space-x-3 p-3 rounded-xl hover:bg-white/5 cursor-pointer border border-transparent transition-colors">
                <input
                  type="radio"
                  name={`q-${q.id}`}
                  value={opt}
                  checked={value === opt}
                  onChange={e => handleAnswerChange(q.id, e.target.value)}
                  className="w-5 h-5 text-primary border-white/20 bg-white/5 focus:ring-primary focus:ring-offset-0 [color-scheme:dark] cursor-pointer"
                  style={{ color: themeColor, accentColor: themeColor }}
                />
                <span className="text-white/80">{opt}</span>
              </label>
            ))}
          </div>
        );
      case 'checkboxes':
        const checkedValues = Array.isArray(value) ? value : [];
        return (
          <div className="space-y-2">
            {q.options?.map((opt, i) => (
              <label key={i} className="flex items-center space-x-3 p-3 rounded-xl hover:bg-white/5 cursor-pointer border border-transparent transition-colors">
                <input
                  type="checkbox"
                  value={opt}
                  checked={checkedValues.includes(opt)}
                  onChange={e => {
                    if (e.target.checked) {
                      handleAnswerChange(q.id, [...checkedValues, opt]);
                    } else {
                      handleAnswerChange(q.id, checkedValues.filter(v => v !== opt));
                    }
                  }}
                  className="w-5 h-5 rounded border-white/20 bg-white/5 text-primary focus:ring-primary focus:ring-offset-0 [color-scheme:dark] cursor-pointer"
                  style={{ color: themeColor, accentColor: themeColor }}
                />
                <span className="text-white/80">{opt}</span>
              </label>
            ))}
          </div>
        );
      case 'dropdown':
        return (
          <select
            className={`${inputClasses} [color-scheme:dark]`}
            style={{ '--tw-ring-color': themeColor } as any}
            value={value || ''}
            onChange={e => handleAnswerChange(q.id, e.target.value)}
          >
            <option value="" disabled className="bg-[#1a1a24]">Select an option</option>
            {q.options?.map((opt, i) => (
              <option key={i} value={opt} className="bg-[#1a1a24]">{opt}</option>
            ))}
          </select>
        );
      case 'linear_scale':
        const min = q.scaleMin || 1;
        const max = q.scaleMax || 5;
        const range = Array.from({ length: max - min + 1 }, (_, i) => min + i);
        return (
          <div className="flex flex-col space-y-4 pt-2">
            <div className="flex justify-between w-full max-w-md mx-auto items-center px-2 gap-4">
              <span className="text-sm font-medium text-white/70 text-right flex-1">{q.scaleMinLabel}</span>
              <div className="flex space-x-2 justify-center flex-none">
                {range.map(num => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => handleAnswerChange(q.id, num)}
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                      value === num
                        ? 'bg-primary text-white font-medium scale-110 shadow-lg'
                        : 'bg-white/5 text-white/70 hover:bg-white/15 border border-white/10'
                    }`}
                    style={value === num ? { backgroundColor: themeColor } : {}}
                  >
                    {num}
                  </button>
                ))}
              </div>
              <span className="text-sm font-medium text-white/70 text-left flex-1">{q.scaleMaxLabel}</span>
            </div>
          </div>
        );
      case 'star_rating':
        const starMax = q.scaleMax || 5;
        const stars = Array.from({ length: starMax }, (_, i) => i + 1);
        return (
          <div className="flex space-x-2 items-center">
            {stars.map(num => (
              <button
                key={num}
                type="button"
                onClick={() => handleAnswerChange(q.id, num)}
                className="focus:outline-none transition-transform hover:scale-110 p-1"
                onMouseEnter={(e) => {
                  const parent = e.currentTarget.parentElement;
                  if (parent) {
                    const children = Array.from(parent.children);
                    children.forEach((child, i) => {
                      const icon = child.querySelector('svg');
                      if (icon) {
                        if (i < num) {
                          icon.style.color = themeColor;
                          icon.style.fill = themeColor;
                        } else {
                          icon.style.color = 'rgba(255,255,255,0.2)';
                          icon.style.fill = 'transparent';
                        }
                      }
                    });
                  }
                }}
                onMouseLeave={(e) => {
                  const parent = e.currentTarget.parentElement;
                  if (parent) {
                    const children = Array.from(parent.children);
                    children.forEach((child, i) => {
                      const icon = child.querySelector('svg');
                      if (icon) {
                        const val = value || 0;
                        if (i < val) {
                          icon.style.color = themeColor;
                          icon.style.fill = themeColor;
                        } else {
                          icon.style.color = 'rgba(255,255,255,0.2)';
                          icon.style.fill = 'transparent';
                        }
                      }
                    });
                  }
                }}
              >
                <Star
                  className={`w-8 h-8 transition-colors`}
                  style={{
                    color: (value || 0) >= num ? themeColor : 'rgba(255,255,255,0.2)',
                    fill: (value || 0) >= num ? themeColor : 'transparent',
                  }}
                />
              </button>
            ))}
          </div>
        );
      case 'date':
        return (
          <input
            type="date"
            className={`${inputClasses} max-w-sm [color-scheme:dark]`}
            style={{ '--tw-ring-color': themeColor } as any}
            value={value || ''}
            onChange={e => handleAnswerChange(q.id, e.target.value)}
          />
        );
      case 'time':
        return (
          <input
            type="time"
            className={`${inputClasses} max-w-sm [color-scheme:dark]`}
            style={{ '--tw-ring-color': themeColor } as any}
            value={value || ''}
            onChange={e => handleAnswerChange(q.id, e.target.value)}
          />
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (error === 'closed') {
    return (
      <div className="max-w-2xl mx-auto flex flex-col items-center justify-center min-h-[50vh] text-center p-6">
        <AlertCircle className="w-16 h-16 text-white/20 mb-6" />
        <h1 className="text-2xl font-semibold text-white mb-2">Form Closed</h1>
        <p className="text-white/60">This form is no longer accepting responses.</p>
      </div>
    );
  }

  if (error || !form) {
    return (
      <div className="max-w-2xl mx-auto flex flex-col items-center justify-center min-h-[50vh] text-center p-6">
        <h1 className="text-2xl font-semibold text-white mb-2">Form Not Found</h1>
        <p className="text-white/60">The feedback form you are looking for doesn't exist or was removed.</p>
      </div>
    );
  }

  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl mx-auto mt-12 bg-[#0C0C0E] border border-white/[0.06] rounded-2xl p-10 text-center shadow-xl"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", bounce: 0.5, delay: 0.2 }}
          className="w-20 h-20 mx-auto bg-green-500/10 rounded-full flex items-center justify-center mb-6"
        >
          <CheckCircle2 className="w-10 h-10 text-green-500" />
        </motion.div>
        <h2 className="text-2xl font-semibold text-white mb-4">Response Submitted</h2>
        <p className="text-white/70 text-lg">{form.confirmationMessage || 'Thank you for your feedback!'}</p>
      </motion.div>
    );
  }

  const allQuestions = form.sections.flatMap(s => s.questions.filter(q => q.type !== 'section_header'));
  const answeredQuestions = allQuestions.filter(q => {
    const val = answers[q.id];
    return val !== undefined && val !== null && val !== '' && !(Array.isArray(val) && val.length === 0);
  });
  const progress = form.showProgressBar && allQuestions.length > 0 
    ? (answeredQuestions.length / allQuestions.length) * 100 
    : null;

  return (
    <div className="max-w-3xl mx-auto pb-20">
      {progress !== null && (
        <div className="fixed top-0 left-0 w-full h-1 bg-white/5 z-50">
          <div 
            className="h-full bg-primary transition-all duration-300 ease-out" 
            style={{ width: `${progress}%`, backgroundColor: form.themeColor || '#8B5CF6' }}
          />
        </div>
      )}

      <div className="bg-[#0C0C0E] border border-white/[0.06] rounded-2xl overflow-hidden shadow-xl mb-6">
        <div 
          className="h-3 w-full"
          style={{ backgroundColor: form.themeColor || '#8B5CF6' }}
        />
        <div className="p-8 sm:p-10">
          <h1 className="text-3xl font-bold text-white mb-3">{form.title}</h1>
          {form.description && (
            <p className="text-white/70 text-lg leading-relaxed whitespace-pre-wrap">{form.description}</p>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Roll Number Field */}
        <div id="field-rollNo" className="bg-[#0C0C0E] border border-white/[0.06] rounded-2xl p-8 sm:p-10 shadow-lg">
          <label className="block mb-4">
            <span className="text-lg font-medium text-white flex items-center">
              Roll Number <span className="text-red-500 ml-1">*</span>
            </span>
          </label>
          <input
            type="text"
            className={`w-full bg-white/5 border rounded-xl px-4 py-3 text-white transition-all focus:outline-none focus:ring-2 ${
              validationErrors['rollNo'] ? 'border-red-500 focus:ring-red-500/50' : 'border-white/10'
            }`}
            style={{ '--tw-ring-color': form.themeColor || '#8B5CF6' } as any}
            placeholder="e.g. 1602-XX-XXX-XXX"
            value={rollNo}
            onChange={e => {
              setRollNo(e.target.value);
              setValidationErrors(prev => {
                const err = { ...prev };
                delete err['rollNo'];
                return err;
              });
            }}
          />
          {validationErrors['rollNo'] && (
            <p className="mt-2 text-sm text-red-500 flex items-center">
              <AlertCircle className="w-4 h-4 mr-1" /> {validationErrors['rollNo']}
            </p>
          )}
        </div>

        {form.sections.map((section, sIdx) => (
          <div key={section.id} className="space-y-6">
            {section.questions.map((q) => {
              if (q.type === 'section_header') {
                return (
                  <div key={q.id} className="pt-8 pb-2">
                    <h2 className="text-2xl font-semibold text-white">{q.label}</h2>
                    {q.description && <p className="mt-2 text-white/60">{q.description}</p>}
                    <div className="h-px w-full bg-white/10 mt-4" />
                  </div>
                );
              }

              return (
                <div 
                  key={q.id} 
                  id={`field-${q.id}`}
                  className="bg-[#0C0C0E] border border-white/[0.06] rounded-2xl p-8 sm:p-10 shadow-lg"
                >
                  <label className="block mb-4">
                    <span className="text-lg font-medium text-white flex flex-wrap items-start">
                      {q.label} 
                      {q.required && <span className="text-red-500 ml-1 mt-0.5">*</span>}
                    </span>
                    {q.description && (
                      <span className="block mt-1.5 text-sm text-white/60">{q.description}</span>
                    )}
                  </label>
                  
                  {renderQuestion(q)}

                  <AnimatePresence>
                    {validationErrors[q.id] && (
                      <motion.p
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-3 text-sm text-red-500 flex items-center"
                      >
                        <AlertCircle className="w-4 h-4 mr-1" /> {validationErrors[q.id]}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        ))}

        <div className="flex items-center justify-between pt-6">
          <p className="text-sm text-white/40 flex-1">
            Never submit passwords through Connect Club Forms.
          </p>
          <button
            type="submit"
            disabled={submitting}
            className="px-8 py-3 rounded-xl bg-primary text-white font-medium hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center shadow-lg"
            style={{ backgroundColor: form.themeColor || '#8B5CF6' }}
          >
            {submitting ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit Response'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
