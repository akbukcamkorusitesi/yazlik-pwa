import { useRef } from 'react'

// Basit Markdown toolbar butonları
const BUTONLAR = [
  { etiket: 'B', title: 'Kalın', once: '**', sonra: '**', ornek: 'kalın metin' },
  { etiket: 'I', title: 'İtalik', once: '*', sonra: '*', ornek: 'italik metin' },
  { etiket: 'H', title: 'Başlık', once: '## ', sonra: '', ornek: 'Başlık' },
  { etiket: '—', title: 'Çizgi', once: '\n---\n', sonra: '', ornek: '' },
  { etiket: '•', title: 'Liste', once: '\n- ', sonra: '', ornek: 'madde' },
]

export default function MetinEditoru({ value, onChange, rows = 6, placeholder = 'Yazın...' }) {
  const ref = useRef()

  function formatUygula(once, sonra, ornek) {
    const el = ref.current
    if (!el) return

    const baslangic = el.selectionStart
    const bitis = el.selectionEnd
    const secili = value.substring(baslangic, bitis) || ornek

    const yeniDeger =
      value.substring(0, baslangic) +
      once + secili + sonra +
      value.substring(bitis)

    onChange(yeniDeger)

    // İmleci doğru yere getir
    setTimeout(() => {
      el.focus()
      const yeniBaslangic = baslangic + once.length
      const yeniBitis = yeniBaslangic + secili.length
      el.setSelectionRange(yeniBaslangic, yeniBitis)
    }, 0)
  }

  return (
    <div style={{ border: '0.5px solid var(--kenarlık)', borderRadius: 8, overflow: 'hidden' }}>
      {/* Toolbar */}
      <div style={{
        display: 'flex', gap: 2, padding: '6px 8px',
        background: 'var(--yüzey)', borderBottom: '0.5px solid var(--kenarlık)'
      }}>
        {BUTONLAR.map(b => (
          <button
            key={b.etiket}
            type="button"
            title={b.title}
            onClick={() => formatUygula(b.once, b.sonra, b.ornek)}
            style={{
              width: 28, height: 28, borderRadius: 4, border: '0.5px solid var(--kenarlık)',
              background: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 600,
              color: 'var(--metin2)', display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
            {b.etiket}
          </button>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--metin3)', alignSelf: 'center' }}>
          **kalın** *italik* ## başlık - liste
        </span>
      </div>

      {/* Textarea */}
      <textarea
        ref={ref}
        className="form-girdi"
        rows={rows}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          resize: 'vertical', border: 'none', borderRadius: 0,
          fontFamily: 'monospace', fontSize: 13
        }}
      />
    </div>
  )
}
