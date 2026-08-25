"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/contexts/AuthContext";
import { motion } from "framer-motion";
import {
  Plus,
  Save,
  Send,
  ArrowLeft,
  Eye,
  EyeOff,
  Settings2,
  GripVertical,
  Trash2,
  Copy,
  Type,
  AlignLeft,
  CircleDot,
  CheckSquare,
  ChevronDown,
  SlidersHorizontal,
  Star,
  CalendarDays,
  Clock,
  Heading,
} from "lucide-react";
import Link from "next/link";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import {
  type FeedbackForm,
  type FormQuestion,
  type QuestionType,
  createDefaultForm,
  createFeedbackForm,
  generateId,
} from "@/lib/firebase/feedbackForms";

// ─── Question Type Metadata ────────────────────────────────────────────

const QUESTION_TYPES: { type: QuestionType; label: string; icon: any }[] = [
  { type: "short_text", label: "Short Answer", icon: Type },
  { type: "long_text", label: "Paragraph", icon: AlignLeft },
  { type: "multiple_choice", label: "Multiple Choice", icon: CircleDot },
  { type: "checkboxes", label: "Checkboxes", icon: CheckSquare },
  { type: "dropdown", label: "Dropdown", icon: ChevronDown },
  { type: "linear_scale", label: "Linear Scale", icon: SlidersHorizontal },
  { type: "star_rating", label: "Star Rating", icon: Star },
  { type: "date", label: "Date", icon: CalendarDays },
  { type: "time", label: "Time", icon: Clock },
  { type: "section_header", label: "Section Header", icon: Heading },
];

function getTypeLabel(type: QuestionType): string {
  return QUESTION_TYPES.find((t) => t.type === type)?.label || type;
}

// ─── Sortable Question Item ────────────────────────────────────────────

function SortableQuestion({
  question,
  onUpdate,
  onDelete,
  onDuplicate,
}: {
  question: FormQuestion;
  onUpdate: (updated: FormQuestion) => void;
  onDelete: () => void;
  onDuplicate: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: question.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const [showTypeDropdown, setShowTypeDropdown] = useState(false);

  const updateField = (field: string, value: any) => {
    onUpdate({ ...question, [field]: value });
  };

  const addOption = () => {
    const options = [...(question.options || []), `Option ${(question.options?.length || 0) + 1}`];
    onUpdate({ ...question, options });
  };

  const updateOption = (index: number, value: string) => {
    const options = [...(question.options || [])];
    options[index] = value;
    onUpdate({ ...question, options });
  };

  const removeOption = (index: number) => {
    const options = (question.options || []).filter((_, i) => i !== index);
    onUpdate({ ...question, options });
  };

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#111113] border border-white/[0.08] rounded-2xl p-6 group relative"
    >
      {/* Drag Handle + Actions Row */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-1 text-white/20 hover:text-white/50 transition-colors"
          >
            <GripVertical className="w-5 h-5" />
          </button>

          {/* Type Selector */}
          <div className="relative">
            <button
              onClick={() => setShowTypeDropdown(!showTypeDropdown)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-sm text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            >
              {(() => {
                const TypeIcon = QUESTION_TYPES.find((t) => t.type === question.type)?.icon || Type;
                return <TypeIcon className="w-4 h-4" />;
              })()}
              {getTypeLabel(question.type)}
              <ChevronDown className="w-3 h-3" />
            </button>
            {showTypeDropdown && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowTypeDropdown(false)} />
                <div className="absolute top-full left-0 mt-2 w-56 bg-[#1a1a1e] border border-white/10 rounded-xl shadow-2xl z-50 py-2 max-h-80 overflow-y-auto">
                  {QUESTION_TYPES.map((qt) => (
                    <button
                      key={qt.type}
                      onClick={() => {
                        const defaults: Partial<FormQuestion> = {};
                        if (["multiple_choice", "checkboxes", "dropdown"].includes(qt.type)) {
                          defaults.options = question.options?.length ? question.options : ["Option 1", "Option 2"];
                        }
                        if (qt.type === "linear_scale") {
                          defaults.scaleMin = question.scaleMin ?? 1;
                          defaults.scaleMax = question.scaleMax ?? 5;
                          defaults.scaleMinLabel = question.scaleMinLabel ?? "";
                          defaults.scaleMaxLabel = question.scaleMaxLabel ?? "";
                        }
                        if (qt.type === "star_rating") {
                          defaults.maxStars = question.maxStars ?? 5;
                        }
                        onUpdate({ ...question, ...defaults, type: qt.type });
                        setShowTypeDropdown(false);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                        question.type === qt.type
                          ? "text-primary bg-primary/10"
                          : "text-white/70 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      <qt.icon className="w-4 h-4" />
                      {qt.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Required Toggle */}
          {question.type !== "section_header" && (
            <label className="flex items-center gap-2 cursor-pointer text-sm text-white/50">
              <span>Required</span>
              <button
                onClick={() => updateField("required", !question.required)}
                className={`w-10 h-6 rounded-full transition-colors relative ${
                  question.required ? "bg-primary" : "bg-white/10"
                }`}
              >
                <div
                  className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                    question.required ? "translate-x-5" : "translate-x-1"
                  }`}
                />
              </button>
            </label>
          )}
          <button onClick={onDuplicate} className="p-2 text-white/30 hover:text-white/70 transition-colors" title="Duplicate">
            <Copy className="w-4 h-4" />
          </button>
          <button onClick={onDelete} className="p-2 text-white/30 hover:text-red-400 transition-colors" title="Delete">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Question Label */}
      <input
        type="text"
        value={question.label}
        onChange={(e) => updateField("label", e.target.value)}
        placeholder={question.type === "section_header" ? "Section title..." : "Question text..."}
        className="w-full bg-transparent text-white text-lg font-medium placeholder:text-white/20 outline-none mb-2 border-b border-transparent focus:border-white/20 pb-2 transition-colors"
      />

      {/* Description */}
      <input
        type="text"
        value={question.description || ""}
        onChange={(e) => updateField("description", e.target.value)}
        placeholder="Description (optional)"
        className="w-full bg-transparent text-white/40 text-sm placeholder:text-white/15 outline-none mb-4"
      />

      {/* Type-specific editors */}
      {["multiple_choice", "checkboxes", "dropdown"].includes(question.type) && (
        <div className="space-y-2 mt-4 pl-2">
          {(question.options || []).map((opt, i) => (
            <div key={i} className="flex items-center gap-3">
              {question.type === "multiple_choice" && (
                <div className="w-4 h-4 rounded-full border-2 border-white/20 shrink-0" />
              )}
              {question.type === "checkboxes" && (
                <div className="w-4 h-4 rounded border-2 border-white/20 shrink-0" />
              )}
              {question.type === "dropdown" && (
                <span className="text-white/30 text-sm w-6 shrink-0">{i + 1}.</span>
              )}
              <input
                type="text"
                value={opt}
                onChange={(e) => updateOption(i, e.target.value)}
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-primary/50 transition-colors"
              />
              <button onClick={() => removeOption(i)} className="p-1 text-white/20 hover:text-red-400 transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          <button
            onClick={addOption}
            className="flex items-center gap-2 text-sm text-primary/70 hover:text-primary transition-colors mt-2 pl-7"
          >
            <Plus className="w-4 h-4" /> Add option
          </button>
        </div>
      )}

      {question.type === "linear_scale" && (
        <div className="grid grid-cols-2 gap-4 mt-4">
          <div>
            <label className="text-xs text-white/40 mb-1 block">Min value</label>
            <input
              type="number"
              value={question.scaleMin ?? 1}
              onChange={(e) => updateField("scaleMin", parseInt(e.target.value) || 0)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-primary/50"
            />
          </div>
          <div>
            <label className="text-xs text-white/40 mb-1 block">Max value</label>
            <input
              type="number"
              value={question.scaleMax ?? 5}
              onChange={(e) => updateField("scaleMax", parseInt(e.target.value) || 5)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-primary/50"
            />
          </div>
          <div>
            <label className="text-xs text-white/40 mb-1 block">Min label</label>
            <input
              type="text"
              value={question.scaleMinLabel || ""}
              onChange={(e) => updateField("scaleMinLabel", e.target.value)}
              placeholder="e.g. Not satisfied"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-primary/50 placeholder:text-white/20"
            />
          </div>
          <div>
            <label className="text-xs text-white/40 mb-1 block">Max label</label>
            <input
              type="text"
              value={question.scaleMaxLabel || ""}
              onChange={(e) => updateField("scaleMaxLabel", e.target.value)}
              placeholder="e.g. Very satisfied"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-primary/50 placeholder:text-white/20"
            />
          </div>
        </div>
      )}

      {question.type === "star_rating" && (
        <div className="mt-4">
          <label className="text-xs text-white/40 mb-2 block">Number of stars</label>
          <div className="flex gap-2">
            {[3, 4, 5, 7, 10].map((n) => (
              <button
                key={n}
                onClick={() => updateField("maxStars", n)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  (question.maxStars || 5) === n
                    ? "bg-primary text-white"
                    : "bg-white/5 text-white/50 hover:bg-white/10"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}

// ─── Main Create Page ──────────────────────────────────────────────────

export default function CreateFeedbackFormPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const defaultForm = createDefaultForm();
  const [title, setTitle] = useState(defaultForm.title);
  const [description, setDescription] = useState(defaultForm.description);
  const [themeColor, setThemeColor] = useState(defaultForm.themeColor);
  const [requireLogin, setRequireLogin] = useState(defaultForm.requireLogin);
  const [collectRollNo, setCollectRollNo] = useState(defaultForm.collectRollNo);
  const [allowMultiple, setAllowMultiple] = useState(defaultForm.allowMultipleResponses);
  const [showProgressBar, setShowProgressBar] = useState(defaultForm.showProgressBar);
  const [confirmationMessage, setConfirmationMessage] = useState(defaultForm.confirmationMessage);
  const [questions, setQuestions] = useState<FormQuestion[]>(defaultForm.sections[0].questions);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setQuestions((items) => {
        const oldIndex = items.findIndex((q) => q.id === active.id);
        const newIndex = items.findIndex((q) => q.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const addQuestion = (type: QuestionType = "short_text") => {
    const newQ: FormQuestion = {
      id: generateId(),
      type,
      label: "",
      required: false,
      ...(["multiple_choice", "checkboxes", "dropdown"].includes(type)
        ? { options: ["Option 1", "Option 2"] }
        : {}),
      ...(type === "linear_scale" ? { scaleMin: 1, scaleMax: 5 } : {}),
      ...(type === "star_rating" ? { maxStars: 5 } : {}),
    };
    setQuestions([...questions, newQ]);
  };

  const updateQuestion = (index: number, updated: FormQuestion) => {
    const copy = [...questions];
    copy[index] = updated;
    setQuestions(copy);
  };

  const deleteQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const duplicateQuestion = (index: number) => {
    const copy = { ...questions[index], id: generateId() };
    const newQuestions = [...questions];
    newQuestions.splice(index + 1, 0, copy);
    setQuestions(newQuestions);
  };

  const handleSave = async (status: "draft" | "published") => {
    if (!user) return;
    setSaving(true);
    try {
      const formData = {
        title,
        description,
        themeColor,
        status,
        requireLogin,
        collectRollNo,
        allowMultipleResponses: allowMultiple,
        showProgressBar,
        confirmationMessage,
        responsesCount: 0,
        createdBy: user.uid,
        sections: [{ id: generateId(), questions }],
      };
      const id = await createFeedbackForm(formData);
      router.push("/admin/feedback");
    } catch (error) {
      console.error("Error creating form:", error);
    } finally {
      setSaving(false);
    }
  };

  const THEME_COLORS = ["#0066FF", "#8B5CF6", "#10B981", "#F59E0B", "#EF4444", "#EC4899", "#06B6D4", "#F97316"];

  return (
    <div className="min-h-screen bg-[#050505] bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:32px_32px]">
      {/* Top Bar */}
      <div className="sticky top-0 z-30 bg-background border-b border-white/5">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/admin/feedback"
              className="p-2 rounded-lg text-white/50 hover:text-white hover:bg-white/5 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-lg font-bold text-white">Create Feedback Form</h1>
              <p className="text-xs text-white/40">Design your custom form</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`p-2.5 rounded-xl transition-colors ${
                showSettings ? "bg-primary text-white" : "bg-white/5 text-white/50 hover:text-white"
              }`}
              title="Form Settings"
            >
              <Settings2 className="w-5 h-5" />
            </button>
            <button
              onClick={() => handleSave("draft")}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/70 hover:text-white hover:bg-white/10 transition-colors text-sm font-medium disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              Save Draft
            </button>
            <button
              onClick={() => handleSave("published")}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white hover:bg-primary/90 transition-colors text-sm font-bold disabled:opacity-50 shadow-lg shadow-primary/20"
            >
              <Send className="w-4 h-4" />
              Publish
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex gap-8">
          {/* Main Editor */}
          <div className="flex-1 space-y-6">
            {/* Form Header Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[#0C0C0E] border border-white/[0.06] rounded-2xl overflow-hidden"
            >
              <div className="h-3 w-full" style={{ backgroundColor: themeColor }} />
              <div className="p-8">
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Form Title"
                  className="w-full bg-transparent text-3xl font-display font-bold text-white placeholder:text-white/20 outline-none mb-4 border-b-2 border-transparent focus:border-primary/50 pb-3 transition-colors"
                />
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Form description (optional)"
                  rows={2}
                  className="w-full bg-transparent text-white/50 placeholder:text-white/20 outline-none resize-none text-base"
                />
              </div>
            </motion.div>

            {/* Questions */}
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={questions.map((q) => q.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-4">
                  {questions.map((q, i) => (
                    <SortableQuestion
                      key={q.id}
                      question={q}
                      onUpdate={(updated) => updateQuestion(i, updated)}
                      onDelete={() => deleteQuestion(i)}
                      onDuplicate={() => duplicateQuestion(i)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>

            {/* Add Question Bar */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-wrap items-center gap-2 p-4 bg-[#0C0C0E] border border-white/[0.06] rounded-2xl"
            >
              <span className="text-sm text-white/40 mr-2">Add:</span>
              {QUESTION_TYPES.map((qt) => (
                <button
                  key={qt.type}
                  onClick={() => addQuestion(qt.type)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/5 text-white/50 hover:text-white hover:bg-white/10 transition-colors text-xs font-medium"
                  title={qt.label}
                >
                  <qt.icon className="w-3.5 h-3.5" />
                  {qt.label}
                </button>
              ))}
            </motion.div>
          </div>

          {/* Settings Panel */}
          {showSettings && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="w-80 shrink-0"
            >
              <div className="sticky top-24 bg-[#0C0C0E] border border-white/[0.06] rounded-2xl p-6 space-y-6">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Settings2 className="w-5 h-5 text-primary" /> Settings
                </h3>

                {/* Theme Color */}
                <div>
                  <label className="text-xs font-bold text-white/40 uppercase tracking-wider mb-3 block">
                    Theme Color
                  </label>
                  <div className="flex gap-2 flex-wrap">
                    {THEME_COLORS.map((c) => (
                      <button
                        key={c}
                        onClick={() => setThemeColor(c)}
                        className={`w-8 h-8 rounded-lg transition-all ${
                          themeColor === c ? "ring-2 ring-white ring-offset-2 ring-offset-[#0C0C0E] scale-110" : "hover:scale-110"
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>

                {/* Toggles */}
                {[
                  { label: "Require Login", value: requireLogin, setter: setRequireLogin, desc: "Users must log in to submit" },
                  { label: "Collect Roll No", value: collectRollNo, setter: setCollectRollNo, desc: "Ask for roll number" },
                  { label: "Allow Multiple Responses", value: allowMultiple, setter: setAllowMultiple, desc: "Users can submit more than once" },
                  { label: "Show Progress Bar", value: showProgressBar, setter: setShowProgressBar, desc: "Show completion progress" },
                ].map((toggle) => (
                  <div key={toggle.label} className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-white font-medium">{toggle.label}</div>
                      <div className="text-xs text-white/30">{toggle.desc}</div>
                    </div>
                    <button
                      onClick={() => toggle.setter(!toggle.value)}
                      className={`w-10 h-6 rounded-full transition-colors relative shrink-0 ${
                        toggle.value ? "bg-primary" : "bg-white/10"
                      }`}
                    >
                      <div
                        className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                          toggle.value ? "translate-x-5" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>
                ))}

                {/* Confirmation Message */}
                <div>
                  <label className="text-xs font-bold text-white/40 uppercase tracking-wider mb-2 block">
                    Confirmation Message
                  </label>
                  <textarea
                    value={confirmationMessage}
                    onChange={(e) => setConfirmationMessage(e.target.value)}
                    rows={3}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-primary/50 transition-colors resize-none placeholder:text-white/20"
                    placeholder="Thank you for your feedback!"
                  />
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
