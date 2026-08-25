"use client";

import { useEffect, useState } from "react";
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { Trash2, MailOpen, Mail } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/contexts/AuthContext";

interface ContactMessage {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  message: string;
  status: "unread" | "read";
  createdAt: any;
}

export default function AdminMessagesPage() {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "contact_messages"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messagesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ContactMessage[];
      
      setMessages(messagesData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching messages:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete the message from ${name}?`)) {
      try {
        await deleteDoc(doc(db, "contact_messages", id));
      } catch (error) {
        console.error("Error deleting message:", error);
        alert("Failed to delete message.");
      }
    }
  };

  const toggleStatus = async (id: string, currentStatus: "unread" | "read") => {
    try {
      await updateDoc(doc(db, "contact_messages", id), {
        status: currentStatus === "unread" ? "read" : "unread"
      });
    } catch (error) {
      console.error("Error updating message status:", error);
    }
  };

  return (
    <div>
      <header className="px-8 py-6 border-b border-white/5 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Contact Messages</h1>
      </header>

      <div className="p-8">
        <div className="bg-[#0c0c0e] border border-white/5 rounded-3xl overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 bg-white/5 text-white/50 text-sm">
                <th className="px-6 py-4 font-medium w-[20%]">Sender</th>
                <th className="px-6 py-4 font-medium w-[45%]">Message</th>
                <th className="px-6 py-4 font-medium w-[15%]">Date</th>
                <th className="px-6 py-4 font-medium w-[10%]">Status</th>
                <th className="px-6 py-4 font-medium text-right w-[10%]">Actions</th>
              </tr>
            </thead>
            <tbody className="text-white/80">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-white/50">Loading messages...</td>
                </tr>
              ) : messages.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-white/50">No messages found.</td>
                </tr>
              ) : (
                messages.map((msg) => (
                  <tr key={msg.id} className={cn(
                    "border-b border-white/5 transition-colors",
                    msg.status === "unread" ? "bg-white/[0.04] hover:bg-white/[0.06]" : "hover:bg-white/[0.02]"
                  )}>
                    <td className="px-6 py-4">
                      <div className="font-medium text-white">{msg.firstName} {msg.lastName}</div>
                      <div className="text-xs text-white/50">{msg.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-white/80 line-clamp-2 max-w-xl">
                        {msg.message}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-white/60 text-sm">
                      {msg.createdAt 
                        ? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }).format(msg.createdAt.toDate()) 
                        : "Just now"}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => toggleStatus(msg.id, msg.status)}
                        className={cn(
                          "px-3 py-1 rounded-full text-xs font-semibold border inline-flex items-center gap-1.5 transition-colors",
                          msg.status === "unread" 
                            ? "bg-primary/20 text-primary border-primary/20 hover:bg-primary/30" 
                            : "bg-white/10 text-white/60 border-white/10 hover:bg-white/20"
                        )}
                      >
                        {msg.status === "unread" ? <Mail className="w-3 h-3" /> : <MailOpen className="w-3 h-3" />}
                        {msg.status === "unread" ? "New" : "Read"}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button 
                        onClick={() => handleDelete(msg.id, `${msg.firstName} ${msg.lastName}`)} 
                        className="p-2 text-red-400/50 hover:text-red-400 transition-colors inline-flex" 
                        aria-label="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
