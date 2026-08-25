'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  GripVertical,
  Trash2,
  Copy,
  Plus,
  X,
  Type,
  AlignLeft,
  List,
  CheckSquare,
  ChevronDown,
  MoreHorizontal,
  Star,
  Calendar,
  Clock,
  Heading
} from 'lucide-react';
import { FormQuestion } from '@/lib/firebase/feedbackForms';

const QUESTION_TYPES = [
  { value: 'short_text', label: 'Short Answer', icon: Type },
  { value: 'long_text', label: 'Paragraph', icon: AlignLeft },
  { value: 'multiple_choice', label: 'Multiple Choice', icon: List },
  { value: 'checkboxes', label: 'Checkboxes', icon: CheckSquare },
  { value: 'dropdown', label: 'Dropdown', icon: ChevronDown },
  { value: 'linear_scale', label: 'Linear Scale', icon: MoreHorizontal },
  { value: 'star_rating', label: 'Star Rating', icon: Star },
  { value: 'date', label: 'Date', icon: Calendar },
  { value: 'time', label: 'Time', icon: Clock },
  { value: 'section_header', label: 'Section Header', icon: Heading }
];

interface QuestionCardProps {
  question: FormQuestion;
  onUpdate: (id: string, updates: Partial<FormQuestion>) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  dragHandleProps?: any;
}

export default function QuestionCard({
  question,
  onUpdate,
  onDelete,
  onDuplicate,
  dragHandleProps
}: QuestionCardProps) {
  const isOptionsType = ['multiple_choice', 'checkboxes', 'dropdown'].includes(question.type);

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...(question.options || [])];
    newOptions[index] = value;
    onUpdate(question.id, { options: newOptions });
  };

  const handleAddOption = () => {
    const newOptions = [...(question.options || []), `Option ${(question.options?.length || 0) + 1}`];
    onUpdate(question.id, { options: newOptions });
  };

  const handleRemoveOption = (index: number) => {
    const newOptions = question.options?.filter((_, i) => i !== index);
    onUpdate(question.id, { options: newOptions });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="group relative bg-[#111113] border border-white/[0.08] rounded-2xl p-6 flex gap-4 transition-all hover:border-white/[0.15]"
    >
      {/* Drag Handle */}
      <div
        className="mt-2 text-white/30 hover:text-white/70 cursor-grab active:cursor-grabbing transition-colors"
        {...dragHandleProps}
      >
        <GripVertical size={20} />
      </div>

      <div className="flex-1 space-y-4">
        {/* Header: Label & Type */}
        <div className="flex gap-4 items-start">
          <div className="flex-1">
            <input
              type="text"
              value={question.label}
              onChange={(e) => onUpdate(question.id, { label: e.target.value })}
              placeholder={question.type === 'section_header' ? 'Section Title' : 'Question Label'}
              className="w-full bg-transparent text-white text-lg font-medium placeholder-white/40 border-b border-transparent hover:border-white/20 focus:border-primary focus:outline-none transition-colors pb-1"
            />
          </div>
          
          <select
            value={question.type}
            onChange={(e) => onUpdate(question.id, { type: e.target.value as any })}
            className="bg-[#1C1C20] text-sm text-white/90 border border-white/10 rounded-lg px-3 py-2 outline-none focus:border-primary/50 transition-colors"
          >
            {QUESTION_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        {/* Description */}
        <div>
          <input
            type="text"
            value={question.description || ''}
            onChange={(e) => onUpdate(question.id, { description: e.target.value })}
            placeholder="Description (optional)"
            className="w-full bg-transparent text-white/60 text-sm placeholder-white/30 border-b border-transparent hover:border-white/20 focus:border-primary/50 focus:outline-none transition-colors pb-1"
          />
        </div>

        {/* Options Editor */}
        {isOptionsType && (
          <div className="space-y-3 mt-4">
            {question.options?.map((option, index) => (
              <div key={index} className="flex items-center gap-3">
                {question.type === 'multiple_choice' && <div className="w-4 h-4 rounded-full border border-white/30" />}
                {question.type === 'checkboxes' && <div className="w-4 h-4 rounded border border-white/30" />}
                {question.type === 'dropdown' && <span className="text-white/40 text-sm">{index + 1}.</span>}
                
                <input
                  type="text"
                  value={option}
                  onChange={(e) => handleOptionChange(index, e.target.value)}
                  className="flex-1 bg-transparent text-white/90 text-sm border-b border-transparent hover:border-white/20 focus:border-primary focus:outline-none pb-1 transition-colors"
                />
                <button
                  onClick={() => handleRemoveOption(index)}
                  className="text-white/30 hover:text-red-400 transition-colors p-1"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
            <button
              onClick={handleAddOption}
              className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors mt-2"
            >
              <Plus size={16} /> Add Option
            </button>
          </div>
        )}

        {/* Linear Scale Editor */}
        {question.type === 'linear_scale' && (
          <div className="space-y-4 mt-4 bg-white/[0.02] p-4 rounded-xl border border-white/[0.04]">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-white/60">
                <span>Scale:</span>
                <select
                  value={question.scaleMin || 1}
                  onChange={(e) => onUpdate(question.id, { scaleMin: parseInt(e.target.value) })}
                  className="bg-[#1C1C20] border border-white/10 rounded px-2 py-1 outline-none"
                >
                  <option value={0}>0</option>
                  <option value={1}>1</option>
                </select>
                <span>to</span>
                <select
                  value={question.scaleMax || 5}
                  onChange={(e) => onUpdate(question.id, { scaleMax: parseInt(e.target.value) })}
                  className="bg-[#1C1C20] border border-white/10 rounded px-2 py-1 outline-none"
                >
                  {[2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs text-white/50">Min Label</label>
                <input
                  type="text"
                  value={question.scaleMinLabel || ''}
                  onChange={(e) => onUpdate(question.id, { scaleMinLabel: e.target.value })}
                  placeholder="e.g. Strongly Disagree"
                  className="w-full bg-[#1C1C20] text-sm text-white rounded-lg px-3 py-2 border border-white/10 focus:border-primary outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-white/50">Max Label</label>
                <input
                  type="text"
                  value={question.scaleMaxLabel || ''}
                  onChange={(e) => onUpdate(question.id, { scaleMaxLabel: e.target.value })}
                  placeholder="e.g. Strongly Agree"
                  className="w-full bg-[#1C1C20] text-sm text-white rounded-lg px-3 py-2 border border-white/10 focus:border-primary outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* Star Rating Editor */}
        {question.type === 'star_rating' && (
          <div className="flex items-center gap-4 mt-4 bg-white/[0.02] p-4 rounded-xl border border-white/[0.04]">
            <span className="text-sm text-white/60">Maximum Stars:</span>
            <select
              value={question.maxStars || 5}
              onChange={(e) => onUpdate(question.id, { maxStars: parseInt(e.target.value) })}
              className="bg-[#1C1C20] text-sm text-white border border-white/10 rounded-lg px-3 py-2 outline-none"
            >
              {[3, 4, 5, 7, 10].map(n => (
                <option key={n} value={n}>{n} Stars</option>
              ))}
            </select>
          </div>
        )}

        {/* Footer actions */}
        <div className="flex items-center justify-end gap-6 pt-4 mt-4 border-t border-white/10">
          {question.type !== 'section_header' && (
            <label className="flex items-center gap-2 cursor-pointer">
              <span className="text-sm text-white/70">Required</span>
              <div className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer"
                  checked={question.required || false}
                  onChange={(e) => onUpdate(question.id, { required: e.target.checked })}
                />
                <div className="w-9 h-5 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
              </div>
            </label>
          )}

          <div className="h-5 w-px bg-white/10" />

          <div className="flex items-center gap-2">
            <button
              onClick={() => onDuplicate(question.id)}
              className="p-2 text-white/40 hover:text-white hover:bg-white/5 rounded-lg transition-all"
              title="Duplicate"
            >
              <Copy size={18} />
            </button>
            <button
              onClick={() => onDelete(question.id)}
              className="p-2 text-white/40 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
              title="Delete"
            >
              <Trash2 size={18} />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
