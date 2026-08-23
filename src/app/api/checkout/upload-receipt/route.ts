import { NextRequest, NextResponse } from 'next/server';
import { serviceUrl } from '@/lib/env';

/** POST /api/checkout/upload-receipt */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const url = serviceUrl('FILIXPAY_UPLOAD_RECEIPT_URL', '/api/v1/checkout/upload-receipt');

    const res = await fetch(url, {
      method: 'POST',
      body: formData,
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
    console.error('Error uploading receipt:', error);
    return NextResponse.json({ code: 'ERROR', message: '服务暂时不可用' }, { status: 502 });
  }
}
