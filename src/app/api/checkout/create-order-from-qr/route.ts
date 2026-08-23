import { NextRequest, NextResponse } from 'next/server';
import { apiBaseUrl } from '@/lib/env';

/** POST /api/checkout/create-order-from-qr */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const url = `${apiBaseUrl()}/api/v1/checkout/create-order-from-qr`;

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      cache: 'no-store',
    });

    const responseBody = await res.text();

    if (!res.ok) {
      try {
        const errorData = JSON.parse(responseBody);
        return NextResponse.json(errorData, { status: res.status });
      } catch {
        return NextResponse.json({ code: 'ERROR', message: '服务暂时不可用' }, { status: res.status });
      }
    }

    const data = JSON.parse(responseBody);
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error('Error creating order from QR:', error);
    return NextResponse.json({ code: 'ERROR', message: '服务暂时不可用' }, { status: 502 });
  }
}
