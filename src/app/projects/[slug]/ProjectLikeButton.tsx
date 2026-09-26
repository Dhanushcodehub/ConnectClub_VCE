"use client";

import { useState, useEffect } from "react";
import { Heart } from "lucide-react";
import { toggleProjectLike } from "@/lib/firebase/api";

export default function ProjectLikeButton({ 
  projectId, 
  initialLikes,
  collectionName
}: { 
  projectId: string; 
  initialLikes: number;
  collectionName: string;
}) {
  const [likes, setLikes] = useState(initialLikes);
  const [isLiked, setIsLiked] = useState(false);
  const [isLiking, setIsLiking] = useState(false);

  useEffect(() => {
    // Check local storage to see if user already liked
    const likedProjects = JSON.parse(localStorage.getItem("likedProjects") || "{}");
    if (likedProjects[projectId]) {
      setIsLiked(true);
    }
  }, [projectId]);

  const handleLike = async () => {
    if (isLiking) return;
    setIsLiking(true);

    const likedProjects = JSON.parse(localStorage.getItem("likedProjects") || "{}");
    const currentlyLiked = !!likedProjects[projectId];
    
    // Optimistic update
    setIsLiked(!currentlyLiked);
    setLikes(prev => currentlyLiked ? prev - 1 : prev + 1);

    // Save to local storage
    if (currentlyLiked) {
      delete likedProjects[projectId];
    } else {
      likedProjects[projectId] = true;
    }
    localStorage.setItem("likedProjects", JSON.stringify(likedProjects));

    // Send to Firebase
    const success = await toggleProjectLike(projectId, !currentlyLiked, collectionName);
    
    if (!success) {
      // Revert if failed
      setIsLiked(currentlyLiked);
      setLikes(prev => currentlyLiked ? prev + 1 : prev - 1);
      if (currentlyLiked) {
        likedProjects[projectId] = true;
      } else {
        delete likedProjects[projectId];
      }
      localStorage.setItem("likedProjects", JSON.stringify(likedProjects));
    }

    setIsLiking(false);
  };

  return (
    <button
      onClick={handleLike}
      disabled={isLiking}
      className={`group flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-xs font-display font-black uppercase tracking-widest border transition-all ${
        isLiked 
          ? "bg-[#2A0C1A] text-red-500 border-red-500/30 hover:bg-[#3D1226] hover:border-red-500/50 hover:shadow-[0_0_15px_rgba(239,68,68,0.2)]" 
          : "bg-[#0A0B14] text-white/60 border-white/10 hover:bg-[#13151F] hover:text-white hover:border-white/25"
      }`}
    >
      <Heart className={`w-4 h-4 ${isLiked ? "fill-red-500" : ""}`} />
      {likes} {likes === 1 ? "Like" : "Likes"}
    </button>
  );
}
