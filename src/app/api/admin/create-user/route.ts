import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Service Role ile ADMIN yetkili Supabase istemcisi (Server-side Only!)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { username, password, role, mall_id, full_name } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ error: 'Kullanıcı adı ve şifre zorunludur.' }, { status: 400 });
    }

    // Kullanıcı adını gizli bir e-postaya çevirelim
    const dummyEmail = `${username.toLowerCase()}@ziva.internal`;

    // 1. Supabase Auth üzerinden kullanıcıyı oluştur (Service Role sayesinde admin yetkisiyle)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: dummyEmail,
      password: password,
      email_confirm: true, // Otomatik onayla
      user_metadata: { full_name }
    });

    if (authError) {
      return NextResponse.json({ error: `Auth Hatası: ${authError.message}` }, { status: 400 });
    }

    // 2. Profil tablosuna ekleyelim (Auth veritabanından ID gelince)
    if (authData.user) {
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .insert([{
          id: authData.user.id,
          email: dummyEmail,
          role: role || 'client',
          mall_id: mall_id || null,
          full_name: full_name || username
        }]);

      if (profileError) {
        // Hata varsa kullanıcıyı auth'tan silelim ki çakışmasın
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
        return NextResponse.json({ error: `Profil Hatası: ${profileError.message}` }, { status: 400 });
      }
    }

    return NextResponse.json({ success: true, user: authData.user });
    
  } catch (err: any) {
    console.error('API Error:', err);
    return NextResponse.json({ error: 'Sunucu hatası oluştu.' }, { status: 500 });
  }
}
