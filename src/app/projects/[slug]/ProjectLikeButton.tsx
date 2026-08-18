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
      className={`px-6 py-3 font-semibold rounded-xl flex items-center transition-colors border ${
        isLiked 
          ? "bg-red-500/20 text-red-500 border-red-500/30 hover:bg-red-500/30" 
          : "bg-white/10 text-white border-white/10 hover:bg-white/20"
      }`}
    >
      <Heart className={`w-5 h-5 mr-2 ${isLiked ? "fill-red-500" : ""}`} />
      {likes} {likes === 1 ? "Like" : "Likes"}
    </button>
  );
}
