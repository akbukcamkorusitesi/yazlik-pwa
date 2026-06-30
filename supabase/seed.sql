-- =============================================
-- ÖRNEK VERİ (Excel'den ilk 5 kayıt)
-- Supabase'e schema.sql'den SONRA çalıştırın
-- =============================================

insert into public.sakinler (daire, konum, adi, soyadi, tc_kimlik, ceptel, ceptel2, tel1, email, ev_adresi) values
('A',   1, 'ÜMİT NABİ', 'ÜLKÜTAŞIR', '37774656218', '(542) 422 89 29', '(534) 011 99 79', '(312) 207 58 86', 'uulkutasir@yahoo.com', 'Emek Mah. 19.Sokak No:126/6 Emek / Ankara'),
('AD',  0, 'PAKİZE-ÖMER', 'ÇINAR',    '45793376970', '(535) 304 22 23', null,               '(212) 657 95 87', null,                   'Yeni Mah. Tuna Sokak D Blok D:20 Bağcılar / İstanbul'),
('AC',  0, 'HASAN',       'KOLBAŞI',   '17476339404', '(542) 415 63 40', '(532) 546 11 64', '(332) 813 02 14', null,                   'Tipi Mah. Yeni Buğday Pazarı No:40 Akşehir / Konya'),
('AA',  1, 'İBRAHİM',     'TURAN',     '38464155882', '(533) 762 64 29', '(555) 991 73 17', null,               null,                   'Gerzele Mah. 523 Sok. Askal Sitesi 10/A Merkezefendi / Denizli'),
('B',   1, 'MÜKERREM',    'UZUN',      '23303584244', '(505) 445 48 43', '(505) 571 55 50', '(505) 571 88 80', null,                   'Yaşamkent Mah. 3222 Cad. Mehtap Sit. A Blok No:38 / Ankara');

-- Örnek duyuru
insert into public.duyurular (baslik, icerik, onem) values
('Hoş Geldiniz!', 'Yazlık Sitesi mobil uygulamasına hoş geldiniz. Sorularınız için yöneticiye ulaşabilirsiniz.', 'normal'),
('Su Kesintisi', '15 Temmuz Pazartesi 09:00-12:00 arası su kesintisi yaşanacaktır.', 'onemli');

