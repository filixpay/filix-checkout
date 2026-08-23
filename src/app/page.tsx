'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import CheckoutClient from '@/components/checkout/CheckoutClient';
import QrCheckoutClient from '@/components/checkout/QrCheckoutClient';

function CheckoutViewSelector() {
  const searchParams = useSearchParams();
  const loc = searchParams.get('loc');

  if (loc) {
    return <QrCheckoutClient />;
  }

  return <CheckoutClient />;
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={null}>
      <CheckoutViewSelector />
    </Suspense>
  );
}
