import { NextRequest, NextResponse } from 'next/server';
import { getBackendAccessToken } from '@/lib/filixpay';
import { serviceUrl } from '@/lib/env';

/** POST /api/checkout/create-payment-session */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      accept: 'application/json',
    };

    const userAuthHeader = request.headers.get('Authorization');
    if (userAuthHeader) {
      headers.Authorization = userAuthHeader;
    } else {
      try {
        headers.Authorization = `Bearer ${await getBackendAccessToken()}`;
      } catch {
        // Proceed without Authorization when credentials are unavailable.
      }
    }

    const url = serviceUrl(
      'FILIXPAY_CREATE_PAYMENT_SESSION_URL',
      '/api/v1/checkout/create-payment-session',
    );

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      cache: 'no-store',
    });

    const contentType = res.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      const data = await res.json();
      return NextResponse.json(data, { status: res.status });
    }

    const text = await res.text();
    return new NextResponse(text, {
      status: res.status,
      headers: { 'Content-Type': contentType },
    });
  } catch (error) {
    console.error('Error creating payment session:', error);
    return NextResponse.json({ code: 'ERROR', message: '服务暂时不可用' }, { status: 502 });
  }
}
