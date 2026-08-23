import { NextRequest, NextResponse } from 'next/server';
import { apiBaseUrl } from '@/lib/env';

/** GET /api/checkout/payment-code */
export async function GET(request: NextRequest) {
  const loc = request.nextUrl.searchParams.get('loc');
  if (!loc) {
    return NextResponse.json({ code: 'INVALID_PARAMS', message: '缺少参数 loc' }, { status: 400 });
  }

  try {
    const url = `${apiBaseUrl()}/api/v1/checkout/payment-code?loc=${encodeURIComponent(loc)}`;

    const res = await fetch(url, {
      headers: {
        accept: 'application/json',
      },
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
    console.error('Error fetching payment code info:', error);
    return NextResponse.json({ code: 'ERROR', message: '服务暂时不可用' }, { status: 502 });
  }
}
