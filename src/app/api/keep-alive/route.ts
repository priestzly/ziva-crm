import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Supabase ücretsiz planda 7 gün işlem olmazsa projeyi uyutur.
// Vercel Cron (vercel.json) bu endpoint'i her gün çağırarak veritabanını aktif tutar.
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  // CRON_SECRET tanımlıysa Vercel Cron bunu Authorization başlığında gönderir
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { error } = await supabase.from('malls').select('id').limit(1);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, at: new Date().toISOString() });
}
