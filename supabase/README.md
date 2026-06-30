# Supabase Kurulum Adımları

## 1. Proje oluştur
https://supabase.com → "New Project" → isim ver → şifre belirle → bölge: Frankfurt (EU)akbukcamkorusitesi	akbukcamkorusitesi20+

## 2. Schema çalıştır
Supabase Dashboard → SQL Editor → schema.sql içeriğini yapıştır → Run

## 3. Örnek veri ekle (isteğe bağlı)
SQL Editor → seed.sql içeriğini yapıştır → Run

## 4. Admin kullanıcı oluştur
Authentication → Users → "Invite User" ile e-posta gönder
Sonra SQL Editor'da şu komutu çalıştır (kendi user id'ni yaz):

```sql
update auth.users
set raw_user_meta_data = jsonb_set(
  coalesce(raw_user_meta_data, '{}'),
  '{role}',
  '"admin"'
)
where id = '0f333fe7-b181-4280-90c2-5d183f546e21';
0f333fe7-b181-4280-90c2-5d183f546e21
```

## 5. .env için bilgileri al
Settings → API:
- Project URL → VITE_SUPABASE_URL	
https://nrlnrantzgqmsmijpowm.supabase.co

- anon public key → VITE_SUPABASE_ANON_KEY	
	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ybG5yYW50emdxbXNtaWpwb3dtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI3NjI1MzUsImV4cCI6MjA5ODMzODUzNX0.2mBrtGwBmVUSi9tyw5utZXPVuFFCHj_VZgIloP3Gsn8

## 6. Storage bucket oluştur (fotoğraflar için)
Storage → New bucket → "fotograflar" → Public: kapalı
