'use client';

import { Suspense } from 'react';
import ResumeClient from '@/components/checkout/ResumeClient';

export default function ResumePage() {
  return (
    <Suspense fallback={null}>
      <ResumeClient />
    </Suspense>
  );
}
