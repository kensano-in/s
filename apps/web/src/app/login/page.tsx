import { headers } from 'next/headers';
import { getIpReputation } from '@/lib/security/reputation';
import AuthFlow from '@/components/auth/AuthFlow';

export default async function LoginPage(
  props: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
  }
) {
  const searchParams = await props.searchParams;
  const message = searchParams?.message as string | undefined;

  // 1. Resolve Identity Reputation
  const head = await headers();
  const forwardedFor = head.get('x-forwarded-for');
  const ip = forwardedFor ? forwardedFor.split(',')[0].trim() : 'unknown';
  
  const reputation = await getIpReputation(ip);
  const isSuspicious = reputation === 'SUSPICIOUS';

  return (
    <div className="min-h-screen bg-black flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Ornaments (Luxury Ambient) */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-900/10 rounded-full blur-[100px] pointer-events-none"></div>
      
      {/* The Premium Gateway */}
      <AuthFlow 
        isSuspicious={isSuspicious} 
        message={message} 
        initialMode={searchParams?.signup === 'true' ? 'signup' : 'login'} 
      />

    </div>
  )
}
