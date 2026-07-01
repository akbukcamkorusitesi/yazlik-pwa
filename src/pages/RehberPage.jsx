import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

export default function RehberPage() {
  const { isAdmin } = useAuth()
  const [sakinler, setSakinler] = useState([])
  const [arama, setArama] = useState('')
  const [yukleniyor, setYukleniyor] = useState(true)
  const [secili, setSecili] = useState(null)

  useEffect(() => { fetchSakinler() }, [])

  async function fetchSakinler() {
    const { data } = await supabase
      .from('sakinler')
      .select('id, daire, daire_no, adi, soyadi, ceptel, ceptel2, tel1, email, konum, fotograf_url')
      .order('daire_no', { ascending: true, nullsFirst: false })
    setSakinler(data || [])
    setYukleniyor(false)
  }

  const filtreli = sakinler.filter(s =>
    `${s.adi} ${s.soyadi} ${s.daire} ${s.daire_no || ''}`.toLowerCase().includes(arama.toLowerCase())
  )

  const basTutar = (s) => {
    const isim = `${s.adi} ${s.soyadi}`
    const kelimeler = isim.trim().split(' ')
    return kelimeler.map(k => k[0]).join('').slice(0, 2).toUpperCase()
  }

  return (
    <div className="sayfa">
      <h1 className="sayfa-baslik">Sakin Rehberi</h1>

      <div style={{ display: 'flex', gap: 12, marginBottom: '0.75rem', fontSize: 12, color: 'var(--metin3)', flexWrap: 'wrap' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--yesil-acik)', border: '1px solid var(--yesil)', display: 'inline-block' }} />
          Yazlıkçı
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--mavi)', border: '1px solid var(--mavi)', display: 'inline-block' }} />
          Devamlı
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--yüzey)', border: '1px solid var(--kenarlık)', display: 'inline-block' }} />
          Sitede değil
        </span>
      </div>

      <input
        className="form-girdi"
        placeholder="İsim veya daire ara..."
        value={arama}
        onChange={e => setArama(e.target.value)}
        style={{ marginBottom: '1rem' }}
      />

      {yukleniyor ? (
        <div className="yukleniyor">Yükleniyor...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {filtreli.map(s => (
            <div
              key={s.id}
              className="kart"
              style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.75rem' }}
              onClick={() => setSecili(secili?.id === s.id ? null : s)}
            >
              <div style={{ position: 'relative', flexShrink: 0, width: 44, height: 44 }}>
                {s.fotograf_url ? (
                  <img
                    src={s.fotograf_url}
                    alt=""
                    style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', display: 'block' }}
                  />
                ) : (
                  <div style={{
                    width: 44, height: 44, borderRadius: '50%',
                    background: parseInt(s.konum) === 2 ? 'var(--mavi-bg)' : parseInt(s.konum) === 1 ? 'var(--yesil-bg)' : 'var(--yüzey)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 600, fontSize: 14,
                    color: parseInt(s.konum) === 2 ? 'var(--mavi)' : parseInt(s.konum) === 1 ? 'var(--yesil)' : 'var(--metin3)'
                  }}>
                    {basTutar(s)}
                  </div>
                )}
                {parseInt(s.konum) === 1 && (
                  <span style={{
                    position: 'absolute', bottom: 2, right: 2, width: 11, height: 11, borderRadius: '50%',
                    background: 'var(--yesil-acik)', border: '2px solid #fff'
                  }} />
                )}
                {parseInt(s.konum) === 2 && (
                  <span style={{
                    position: 'absolute', bottom: 2, right: 2, width: 11, height: 11, borderRadius: '50%',
                    background: 'var(--mavi)', border: '2px solid #fff'
                  }} />
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontWeight: 500, fontSize: 15 }}>{s.adi} {s.soyadi}</p>
                <p style={{ color: 'var(--metin3)', fontSize: 13 }}>
                  {s.daire_no ? `Daire ${s.daire_no}` : `Daire ${s.daire}`}
                  {s.daire_no && <span style={{ color: 'var(--metin3)', opacity: 0.6 }}> · {s.daire}</span>}
                </p>
              </div>
              <span style={{ color: 'var(--metin3)', fontSize: 18 }}>{secili?.id === s.id ? '▲' : '▼'}</span>
            </div>
          ))}

          {filtreli.length === 0 && (
            <div className="bos-durum">
              <div className="bos-durum-ikon">🔍</div>
              <p>Sonuç bulunamadı.</p>
            </div>
          )}
        </div>
      )}

      {/* Detay Modal */}
      {secili && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
          display: 'flex', alignItems: 'flex-end', zIndex: 200
        }} onClick={() => setSecili(null)}>
          <div
            className="kart"
            style={{ width: '100%', maxWidth: 480, margin: '0 auto', borderBottomLeftRadius: 0, borderBottomRightRadius: 0, borderRadius: '16px 16px 0 0', padding: '1.25rem' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ position: 'relative', flexShrink: 0, width: 56, height: 56 }}>
                {secili.fotograf_url ? (
                  <img src={secili.fotograf_url} alt="" style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', display: 'block' }} />
                ) : (
                  <div style={{
                    width: 56, height: 56, borderRadius: '50%',
                    background: secili.konum === 2 ? 'var(--mavi-bg)' : secili.konum === 1 ? 'var(--yesil-bg)' : 'var(--yüzey)',
                    display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontWeight: 700, fontSize: 18,
                    color: secili.konum === 2 ? 'var(--mavi)' : secili.konum === 1 ? 'var(--yesil)' : 'var(--metin3)'
                  }}>
                    {basTutar(secili)}
                  </div>
                )}
                {parseInt(secili.konum) === 1 && (
                  <span style={{
                    position: 'absolute', bottom: 0, right: 0, width: 16, height: 16, borderRadius: '50%',
                    background: 'var(--yesil-acik)', border: '2px solid #fff'
                  }} />
                )}
                {parseInt(secili.konum) === 2 && (
                  <span style={{
                    position: 'absolute', bottom: 0, right: 0, width: 16, height: 16, borderRadius: '50%',
                    background: 'var(--mavi)', border: '2px solid #fff'
                  }} />
                )}
              </div>
              <div>
                <h2 style={{ fontSize: 17, fontWeight: 600 }}>{secili.adi} {secili.soyadi}</h2>
                <p style={{ color: 'var(--metin3)', fontSize: 13 }}>
                  {secili.daire_no ? `Daire ${secili.daire_no}` : `Daire ${secili.daire}`}
                  {secili.daire_no && <span style={{ opacity: 0.6 }}> · {secili.daire}</span>}
                </p>
              </div>
            </div>
            <div className="ayirici" />
            {[
              { label: '📱 Cep', val: secili.ceptel },
              { label: '📱 Cep 2', val: secili.ceptel2 },
              { label: '☎️ Ev', val: secili.tel1 },
              { label: '✉️ E-posta', val: secili.email },
            ].filter(r => r.val).map(r => (
              <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 14 }}>
                <span style={{ color: 'var(--metin3)' }}>{r.label}</span>
                <a href={r.label.includes('posta') ? `mailto:${r.val}` : `tel:${r.val}`}
                  style={{ color: 'var(--yesil)', textDecoration: 'none', fontWeight: 500 }}>
                  {r.val}
                </a>
              </div>
            ))}
            <button
              className="btn btn-ikincil"
              style={{ marginTop: '1rem', width: '100%' }}
              onClick={() => setSecili(null)}>
              Kapat
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
