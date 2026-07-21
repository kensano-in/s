'use client';
import React, { useEffect, useState } from 'react';
import PreAccessVerify from './PreAccessVerify';
import EmailVerify from './EmailVerify';

export default function VerifyDispatcher() {
  const [host, setHost] = useState('');

  useEffect(() => {
    setHost(window.location.host);
  }, []);

  if (!host) {
    return (
      <div style={{ background: '#000', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-white"></div>
      </div>
    );
  }

  const isRootDomain = host === 'verlyn.in' || 
                       host === 'www.verlyn.in' || 
                       host.startsWith('verlyn.local') || 
                       host.endsWith(':3001');

  if (isRootDomain) {
    return <PreAccessVerify />;
  }

  return <EmailVerify />;
}
