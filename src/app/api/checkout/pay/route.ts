import { NextRequest, NextResponse } from 'next/server';
import { requireEnv } from '@/lib/env';

/** GET /api/checkout/pay */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');
  if (!token) {
    return NextResponse.json({ code: 'INVALID_TOKEN', message: '缺少支付凭证' }, { status: 400 });
  }

  try {
    const filixPayUrl = requireEnv('FILIXPAY_PAY_URL');
    const url = `${filixPayUrl}?token=${encodeURIComponent(token)}`;

    const headers: Record<string, string> = {
      accept: 'application/json',
    };

    const userAuthHeader = request.headers.get('Authorization');
    if (userAuthHeader) {
      headers.Authorization = userAuthHeader;
    }

    const res = await fetch(url, {
      headers,
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
    console.error('Error getting payment info:', error);
    return NextResponse.json({ code: 'ERROR', message: '服务暂时不可用' }, { status: 502 });
  }
}
