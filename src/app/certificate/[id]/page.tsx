import React from 'react';
import { getAdminApp } from '@/lib/firebase/admin';
import { getFirestore } from 'firebase-admin/firestore';
import Link from 'next/link';
import { CheckCircle } from 'lucide-react';
import PrintButton from './PrintButton';

export const metadata = {
  title: 'Verified Certificate | Connect Club',
  description: 'View the verified certificate of participation.',
};

async function getCertificateData(id: string) {
  const app = getAdminApp();
  const db = getFirestore(app);

  const certDoc = await db.collection('certificates').doc(id).get();
  if (!certDoc.exists) return null;

  const certData = certDoc.data()!;
  
  // Try to get name/branch from cert (new system), fallback to user doc (old system)
  let userName = certData.participantName;
  let userBranch = certData.participantBranch;

  if (!userName || !userBranch || userBranch === "N/A") {
    const userDoc = await db.collection('users').doc(certData.userId).get();
    if (userDoc.exists) {
      userName = userName || userDoc.data()?.name || "Unknown User";
      userBranch = userBranch && userBranch !== "N/A" ? userBranch : (userDoc.data()?.branch || "N/A");
    } else {
      userName = userName || "Unknown User";
      userBranch = userBranch || "N/A";
    }
  }

  // Fetch Template
  const templateDoc = await db.collection('event_templates').doc(certData.eventId).get();
  const templateConfig = templateDoc.exists ? templateDoc.data() : null;

  return {
    id: certDoc.id,
    ...certData,
    userName,
    userBranch,
    templateConfig
  };
}

export default async function CertificatePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const data = await getCertificateData(resolvedParams.id);

  if (!data || !data.templateConfig?.imageUrl) {
    return (
      <div className="min-h-screen flex items-center justify-center flex-col bg-background p-4 text-center">
        <h1 className="text-2xl font-bold text-white mb-2">Certificate Not Ready</h1>
        <p className="text-white/60 mb-6">This certificate does not exist, or the event template is missing.</p>
        <Link href="/" className="px-6 py-2 bg-primary text-white rounded-lg">Return Home</Link>
      </div>
    );
  }

  const { templateConfig, userName, userBranch } = data;
  const tc = templateConfig as any;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 pt-24 md:p-12 md:pt-32 relative overflow-hidden bg-[#0C0C0E]">
      
      {/* Background Effects */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Verification Badge */}
      <div className="mb-8 flex flex-col items-center text-center z-10">
        <div className="flex items-center gap-2 text-green-500 font-medium mb-2 bg-green-500/10 px-4 py-1.5 rounded-full border border-green-500/20">
          <CheckCircle className="w-4 h-4" />
          <span>Verified Credential</span>
        </div>
        <p className="text-white/50 text-sm max-w-md">
          This certificate is permanently stored and verified by Connect Club. 
          You can share this exact URL to prove your participation.
        </p>
      </div>

      {/* The Certificate Viewer */}
      <div className="relative w-full max-w-5xl shadow-2xl z-10 rounded-sm overflow-hidden bg-white">
        <img 
          src={tc.imageUrl} 
          alt="Certificate Template" 
          className="w-full h-auto block select-none pointer-events-none" 
        />
        
        {/* Name Overlay */}
        {tc.name?.visible && (
          <div 
            className="absolute -translate-x-1/2 -translate-y-1/2 text-center whitespace-nowrap"
            style={{
              left: `${tc.name.x * 100}%`,
              top: `${tc.name.y * 100}%`,
              fontSize: `clamp(16px, ${tc.name.size / 1024 * 100}vw, ${tc.name.size}px)`,
              color: tc.name.color,
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontStyle: "italic",
              fontWeight: 600
            }}
          >
            {userName}
          </div>
        )}

        {/* Branch Overlay */}
        {tc.branch?.visible && (
          <div 
            className="absolute -translate-x-1/2 -translate-y-1/2 text-center whitespace-nowrap"
            style={{
              left: `${tc.branch.x * 100}%`,
              top: `${tc.branch.y * 100}%`,
              fontSize: `clamp(10px, ${tc.branch.size / 1024 * 100}vw, ${tc.branch.size}px)`,
              color: tc.branch.color,
              fontFamily: "sans-serif",
              fontWeight: 400
            }}
          >
            {userBranch}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="mt-12 flex gap-4 z-10">
        <PrintButton config={tc} userName={userName} userBranch={userBranch} />
        <Link 
          href="https://www.linkedin.com/profile/add?startTask=CERTIFICATION_NAME" 
          target="_blank"
          className="px-6 py-3 bg-[#0A66C2] text-white font-bold rounded-xl hover:bg-[#004182] transition-colors"
        >
          Add to LinkedIn
        </Link>
      </div>
    </div>
  );
}
