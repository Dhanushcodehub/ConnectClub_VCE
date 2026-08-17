"use client";

import { useState, useEffect } from "react";
import { MessageCircle, Send } from "lucide-react";
import { getProjectComments, addProjectComment, ProjectComment } from "@/lib/firebase/api";

export default function ProjectComments({ projectId }: { projectId: string }) {
  const [comments, setComments] = useState<ProjectComment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newCommentName, setNewCommentName] = useState("");
  const [newCommentContent, setNewCommentContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchComments();
  }, [projectId]);

  const fetchComments = async () => {
    const data = await getProjectComments(projectId);
    setComments(data);
    setIsLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentName.trim() || !newCommentContent.trim() || isSubmitting) return;

    setIsSubmitting(true);
    const success = await addProjectComment(projectId, newCommentName.trim(), newCommentContent.trim());
    
    if (success) {
      setNewCommentContent("");
      // Refresh comments to show the new one
      await fetchComments();
    } else {
      alert("Failed to post comment. Please try again later.");
    }
    
    setIsSubmitting(false);
  };

  // Format timestamp (handles both Firestore Timestamp and JS Date)
  const formatDate = (timestamp: any) => {
    if (!timestamp) return "Just now";
    
    let date;
    if (timestamp.toDate) {
      date = timestamp.toDate();
    } else {
      date = new Date(timestamp);
    }
    
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit"
    }).format(date);
  };

  return (
    <section className="mt-20 pt-10 border-t border-white/10">
      <div className="flex items-center gap-3 mb-8">
        <MessageCircle className="w-6 h-6 text-primary" />
        <h2 className="text-2xl font-bold font-heading text-white">Comments ({comments.length})</h2>
      </div>

      {/* Comment Form */}
      <div className="bg-[#0C0C0E] border border-white/[0.06] rounded-2xl p-6 mb-10 shadow-xl">
        <h3 className="text-white font-medium mb-4">Leave a Comment</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="Your Name"
            value={newCommentName}
            onChange={(e) => setNewCommentName(e.target.value)}
            className="w-full bg-[#111114] border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-primary/50 transition-colors"
            required
            maxLength={50}
          />
          <div className="relative">
            <textarea
              placeholder="What do you think about this project?"
              value={newCommentContent}
              onChange={(e) => setNewCommentContent(e.target.value)}
              className="w-full bg-[#111114] border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-primary/50 transition-colors min-h-[120px] resize-y"
              required
              maxLength={500}
            />
            <button
              type="submit"
              disabled={isSubmitting || !newCommentName.trim() || !newCommentContent.trim()}
              className="absolute bottom-3 right-3 p-2 bg-primary hover:bg-primary/90 disabled:bg-primary/50 text-white rounded-lg transition-colors flex items-center justify-center"
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Comments List */}
      <div className="space-y-6">
        {isLoading ? (
          <div className="text-white/50 text-center py-8 animate-pulse">Loading comments...</div>
        ) : comments.length === 0 ? (
          <div className="text-white/30 text-center py-12 border border-dashed border-white/10 rounded-2xl">
            No comments yet. Be the first to share your thoughts!
          </div>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="bg-white/5 border border-white/5 rounded-xl p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold font-heading">
                    {comment.authorName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-white font-medium">{comment.authorName}</div>
                    <div className="text-white/40 text-xs">{formatDate(comment.timestamp)}</div>
                  </div>
                </div>
              </div>
              <p className="text-white/80 leading-relaxed ml-13 pl-13 sm:pl-13">
                {comment.content}
              </p>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
