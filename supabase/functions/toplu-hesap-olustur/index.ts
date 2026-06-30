// Supabase Edge Function: Sakinler için toplu giriş hesabı oluşturur
// Sadece admin tetikleyebilir. service_role key burada güvenli (sunucu tarafı).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function rastgeleSifre() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'
  let s = ''
  for (let i = 0; i < 8; i++) s += chars[Math.floor(Math.random() * chars.length)]
  return s
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    // İsteği yapan kullanıcının admin olup olmadığını doğrula
    const authHeader = req.headers.get('Authorization')!
    const supabaseAuth = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )
    const { data: { user } } = await supabaseAuth.auth.getUser()
    if (!user || user.user_metadata?.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Yetkisiz erişim' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Admin yetkili client (service_role) — sadece sunucu tarafında
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // user_id'si boş olan, email'i dolu sakinleri bul
    const { data: sakinler, error: fetchError } = await supabaseAdmin
      .from('sakinler')
      .select('id, daire, adi, soyadi, email')
      .is('user_id', null)
      .not('email', 'is', null)
      .neq('email', '')

    if (fetchError) throw fetchError

    const sonuclar = []

    for (const sakin of sakinler) {
      const sifre = rastgeleSifre()

      const { data: yeniKullanici, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: sakin.email,
        password: sifre,
        email_confirm: true,
        user_metadata: { role: 'sakin', daire: sakin.daire }
      })

      if (createError) {
        sonuclar.push({ daire: sakin.daire, adi: sakin.adi, email: sakin.email, durum: 'hata', mesaj: createError.message })
        continue
      }

      await supabaseAdmin
        .from('sakinler')
        .update({ user_id: yeniKullanici.user.id })
        .eq('id', sakin.id)

      sonuclar.push({ daire: sakin.daire, adi: sakin.adi, email: sakin.email, sifre, durum: 'basarili' })
    }

    return new Response(JSON.stringify({ sonuclar, toplam: sonuclar.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
