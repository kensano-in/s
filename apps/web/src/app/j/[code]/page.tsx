import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getGroupByJoinCodeDB } from "@/app/(main)/messages/actions";
import JoinGroupClient from "./JoinGroupClient";

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const { data: group } = await getGroupByJoinCodeDB(code);
  return {
    title: group ? `Join ${group.name} on Verlyn` : "Invalid Invite - Verlyn",
    description: "You've been invited to a sanctuary on Verlyn.",
  };
}

export default async function JoinGroupPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Fetch the group data
  const { success, data: group, error } = await getGroupByJoinCodeDB(code);

  if (!success || !group) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-6">
          <svg className="w-10 h-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Transmission Lost</h1>
        <p className="text-white/50 mb-8 max-w-sm">This invite link is invalid or the sanctuary has been destroyed.</p>
        <a href="/" className="px-8 py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-2xl transition-all">Return to Nexus</a>
      </div>
    );
  }

  // Pass it all to the interactive client component
  return (
    <JoinGroupClient 
      code={code} 
      group={group} 
      userId={user?.id || null} 
    />
  );
}
