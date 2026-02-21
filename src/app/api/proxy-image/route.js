import { NextResponse } from 'next/server';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json({ message: 'url wajib diisi' }, { status: 400 });
  }

  let u;
  try {
    u = new URL(url);
  } catch {
    return NextResponse.json({ message: 'url tidak valid' }, { status: 400 });
  }

  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    return NextResponse.json({ message: 'url harus http/https' }, { status: 400 });
  }

  try {
    const upstream = await fetch(u.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        Accept: '*/*',
      },
      cache: 'no-store',
    });

    if (!upstream.ok) {
      return NextResponse.json({ message: `Gagal fetch upstream (${upstream.status})` }, { status: 502 });
    }

    const contentType = upstream.headers.get('content-type') || 'application/octet-stream';
    const bytes = await upstream.arrayBuffer();

    return new NextResponse(bytes, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    return NextResponse.json({ message: err?.message || 'Gagal proxy image' }, { status: 500 });
  }
}
