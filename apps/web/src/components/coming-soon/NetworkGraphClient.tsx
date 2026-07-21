'use client';

import dynamic from 'next/dynamic';

const NetworkGraph = dynamic(() => import('@/components/coming-soon/NetworkGraph'), { ssr: false });

export default function NetworkGraphClient() {
  return <NetworkGraph />;
}
