-- =============================================
-- YAZLIK SİTESİ PWA - Supabase Şeması
-- =============================================

-- 1. SAKİNLER TABLOSU
create table public.sakinler (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null, -- giriş yapan kullanıcı
  daire text not null unique,           -- A, AA, B, BA ...
  konum integer default 0,             -- 0=yazlık yok, 1=var
  adi text not null,
  soyadi text not null,
  tc_kimlik text,                       -- hassas: RLS ile korunur
  es_adi text,
  baba_adi text,
  anne_adi text,
  tel1 text,
  ceptel text,
  ceptel2 text,
  email text,
  ev_adresi text,
  aciklama text,
  fotograf_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. DUYURULAR TABLOSU
create table public.duyurular (
  id uuid primary key default gen_random_uuid(),
  baslik text not null,
  icerik text not null,
  onem text default 'normal' check (onem in ('normal', 'onemli', 'acil')),
  yayinda boolean default true,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

-- 3. AİDAT TABLOSU
create table public.aidatlar (
  id uuid primary key default gen_random_uuid(),
  sakin_id uuid references public.sakinler(id) on delete cascade,
  yil integer not null,
  ay integer not null check (ay between 1 and 12),
  tutar numeric(10,2) not null default 0,
  odendi boolean default false,
  odeme_tarihi date,
  aciklama text,
  created_at timestamptz default now(),
  unique(sakin_id, yil, ay)
);

-- 4. ARIZA / TALEP TABLOSU
create table public.talepler (
  id uuid primary key default gen_random_uuid(),
  sakin_id uuid references public.sakinler(id) on delete cascade,
  kategori text not null check (kategori in ('elektrik','su','asansor','bahce','guvenlik','diger')),
  baslik text not null,
  aciklama text,
  durum text default 'bekliyor' check (durum in ('bekliyor','inceleniyor','tamamlandi','iptal')),
  oncelik text default 'normal' check (oncelik in ('dusuk','normal','yuksek','acil')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

alter table public.sakinler enable row level security;
alter table public.duyurular enable row level security;
alter table public.aidatlar enable row level security;
alter table public.talepler enable row level security;

-- Admin kontrolü için yardımcı fonksiyon
create or replace function public.is_admin()
returns boolean as $$
  select exists (
    select 1 from auth.users
    where id = auth.uid()
    and raw_user_meta_data->>'role' = 'admin'
  );
$$ language sql security definer;

-- SAKİNLER POLİTİKALARI
create policy "Herkes sakinleri görebilir (TC hariç)" on public.sakinler
  for select using (auth.uid() is not null);

create policy "Sakin kendi kaydını güncelleyebilir" on public.sakinler
  for update using (user_id = auth.uid() or is_admin());

create policy "Sadece admin ekleyebilir" on public.sakinler
  for insert with check (is_admin());

create policy "Sadece admin silebilir" on public.sakinler
  for delete using (is_admin());

-- DUYURULAR POLİTİKALARI
create policy "Herkes duyuruları görebilir" on public.duyurular
  for select using (auth.uid() is not null and yayinda = true);

create policy "Sadece admin duyuru yönetebilir" on public.duyurular
  for all using (is_admin());

-- AİDAT POLİTİKALARI
create policy "Sakin kendi aidatlarını görür" on public.aidatlar
  for select using (
    sakin_id in (select id from public.sakinler where user_id = auth.uid())
    or is_admin()
  );

create policy "Sadece admin aidat yönetir" on public.aidatlar
  for all using (is_admin());

-- TALEP POLİTİKALARI
create policy "Sakin kendi taleplerini görür" on public.talepler
  for select using (
    sakin_id in (select id from public.sakinler where user_id = auth.uid())
    or is_admin()
  );

create policy "Sakin talep oluşturabilir" on public.talepler
  for insert with check (
    sakin_id in (select id from public.sakinler where user_id = auth.uid())
  );

create policy "Sakin kendi talebini güncelleyebilir" on public.talepler
  for update using (
    sakin_id in (select id from public.sakinler where user_id = auth.uid())
    or is_admin()
  );

-- =============================================
-- UPDATED_AT OTOMATİK GÜNCELLEME
-- =============================================
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger sakinler_updated_at
  before update on public.sakinler
  for each row execute function public.handle_updated_at();

create trigger talepler_updated_at
  before update on public.talepler
  for each row execute function public.handle_updated_at();

-- =============================================
-- VERİ GÖRÜNÜMLERİ (VIEW) - TC gizlenir
-- =============================================
create view public.sakinler_public as
  select
    id, daire, konum, adi, soyadi,
    es_adi, ceptel, ceptel2, tel1, email,
    fotograf_url, created_at
  from public.sakinler;

