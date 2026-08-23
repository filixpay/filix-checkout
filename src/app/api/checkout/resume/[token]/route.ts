import { NextRequest, NextResponse } from 'next/server';
import { serviceUrl } from '@/lib/env';

/** GET /api/checkout/resume/[token] */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  if (!token) {
    return NextResponse.json(
      { code: 'RESUME_TOKEN_INVALID', message: '缺少续跑凭证' },
      { status: 404 },
    );
  }

  try {
    const basePath = serviceUrl('FILIXPAY_RESUME_PEEK_URL', '/api/v1/checkout/resume');
    const url = `${basePath}/${encodeURIComponent(token)}`;

    const res = await fetch(url, {
      headers: { accept: 'application/json' },
      cache: 'no-store',
    });

    const body = await res.text();
    try {
      return NextResponse.json(JSON.parse(body), { status: res.status });
    } catch {
      return NextResponse.json(
        { code: 'ERROR', message: '服务暂时不可用' },
        { status: res.status >= 400 ? res.status : 502 },
      );
    }
  } catch (error) {
    console.error('Error peeking resume token:', error);
    return NextResponse.json({ code: 'ERROR', message: '服务暂时不可用' }, { status: 502 });
  }
}
