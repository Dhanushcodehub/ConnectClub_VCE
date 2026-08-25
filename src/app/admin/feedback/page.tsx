'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  Pencil, 
  BarChart3, 
  Link as LinkIcon, 
  Trash2, 
  FileText,
  AlertCircle,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { 
  getAllFeedbackForms, 
  deleteFeedbackForm, 
  publishFeedbackForm, 
  closeFeedbackForm,
  type FeedbackForm 
} from '@/lib/firebase/feedbackForms';

export default function FeedbackFormsPage() {
  const [forms, setForms] = useState<FeedbackForm[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => {
    fetchForms();
  }, []);

  const fetchForms = async () => {
    setIsLoading(true);
    try {
      const data = await getAllFeedbackForms();
      setForms(data);
    } catch (error) {
      console.error('Error fetching forms:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 2000);
  };

  const handleCopyLink = (id: string) => {
    const url = `${window.location.origin}/feedback/${id}`;
    navigator.clipboard.writeText(url);
    showToast('Link copied to clipboard!');
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteFeedbackForm(id);
      setForms(forms.filter(f => f.id !== id));
      setDeleteConfirmId(null);
      showToast('Form deleted successfully');
    } catch (error) {
      console.error('Error deleting form:', error);
      showToast('Failed to delete form');
    }
  };

  const handleStatusChange = async (id: string, currentStatus: string) => {
    try {
      if (currentStatus === 'published') {
        await closeFeedbackForm(id);
        setForms(forms.map(f => f.id === id ? { ...f, status: 'closed' } : f));
        showToast('Form closed');
      } else {
        await publishFeedbackForm(id);
        setForms(forms.map(f => f.id === id ? { ...f, status: 'published' } : f));
        showToast('Form published');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      showToast('Failed to update status');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'published':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Published
          </span>
        );
      case 'closed':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20">
            <XCircle className="w-3.5 h-3.5" />
            Closed
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
            <AlertCircle className="w-3.5 h-3.5" />
            Draft
          </span>
        );
    }
  };

  const formatDate = (date: any) => {
    if (!date) return '';
    const d = date.toDate ? date.toDate() : new Date(date);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(d);
  };

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Feedback Forms</h1>
            <p className="text-gray-400 mt-1">Manage and track your feedback collection forms.</p>
          </div>
          <Link
            href="/admin/feedback/create"
            className="inline-flex items-center gap-2 px-4 py-2 text-black bg-white hover:bg-gray-100 rounded-xl font-medium transition-colors"
          >
            <Plus className="w-5 h-5" />
            Create New Form
          </Link>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-[200px] bg-[#0C0C0E] border border-white/[0.06] rounded-2xl animate-pulse"></div>
            ))}
          </div>
        ) : forms.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4 bg-[#0C0C0E] border border-white/[0.06] rounded-2xl text-center">
            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
              <FileText className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">No feedback forms yet</h3>
            <p className="text-gray-400 mb-6 max-w-sm">Create your first feedback form to start collecting responses from your community.</p>
            <Link
              href="/admin/feedback/create"
              className="inline-flex items-center gap-2 px-4 py-2 bg-white text-black hover:bg-gray-100 rounded-xl font-medium transition-colors"
            >
              <Plus className="w-5 h-5" />
              Create Form
            </Link>
          </div>
        ) : (
          <motion.div 
            variants={container}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {forms.map((form) => (
              <motion.div
                key={form.id}
                variants={item}
                className="bg-[#0C0C0E] border border-white/[0.06] rounded-2xl overflow-hidden flex flex-col hover:border-white/[0.12] transition-colors"
              >
                <div className="p-6 flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-4">
                    {getStatusBadge(form.status || 'draft')}
                    <span className="text-xs text-gray-500 font-medium">
                      {formatDate(form.createdAt)}
                    </span>
                  </div>
                  
                  <h3 className="text-lg font-semibold text-white mb-2 line-clamp-2">
                    {form.title}
                  </h3>
                  <p className="text-sm text-gray-400 mb-4 line-clamp-2 flex-1">
                    {form.description || 'No description provided.'}
                  </p>

                  <div className="flex items-center gap-2 text-sm text-gray-400 mt-auto bg-white/[0.02] p-3 rounded-xl border border-white/[0.04]">
                    <BarChart3 className="w-4 h-4 text-white" />
                    <span className="font-medium text-white">{form.responsesCount || 0}</span>
                    <span>responses</span>
                  </div>
                </div>

                <div className="px-6 py-4 border-t border-white/[0.06] flex items-center justify-between gap-2 bg-white/[0.01]">
                  <div className="flex gap-2">
                    <Link
                      href={`/admin/feedback/${form.id}/edit`}
                      className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
                      title="Edit Form"
                    >
                      <Pencil className="w-4 h-4" />
                    </Link>
                    <Link
                      href={`/admin/feedback/${form.id}/responses`}
                      className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
                      title="View Responses"
                    >
                      <BarChart3 className="w-4 h-4" />
                    </Link>
                    <button
                      onClick={() => handleCopyLink(form.id as string)}
                      className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
                      title="Copy Link"
                    >
                      <LinkIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleStatusChange(form.id as string, form.status || 'draft')}
                      className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
                      title={form.status === 'published' ? 'Close Form' : 'Publish Form'}
                    >
                      {form.status === 'published' ? <XCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                    </button>
                  </div>

                  {deleteConfirmId === form.id ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleDelete(form.id as string)}
                        className="text-xs px-3 py-1.5 bg-red-500/20 text-red-500 rounded-lg hover:bg-red-500/30 transition-colors font-medium"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(null)}
                        className="text-xs px-3 py-1.5 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors font-medium"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirmId(form.id as string)}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-colors ml-auto"
                      title="Delete Form"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>

      {/* Simple Toast */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 20, x: '-50%' }}
            className="fixed bottom-6 left-1/2 z-50 flex items-center gap-2 bg-[#1A1A24] border border-white/[0.1] text-white px-4 py-3 rounded-2xl shadow-xl"
          >
            <CheckCircle2 className="w-5 h-5 text-green-400" />
            <span className="text-sm font-medium">{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
