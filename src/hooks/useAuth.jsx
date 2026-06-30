import { useState, useEffect, createContext, useContext } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [sakinler, setSakinler] = useState([])      // bu hesaba bağlı TÜM daire kayıtları
  const [aktifSakinId, setAktifSakinId] = useState(null) // şu an seçili daire
  const [loading, setLoading] = useState(true)

  const isAdmin = user?.user_metadata?.role === 'admin'
  const sakin = sakinler.find(s => s.id === aktifSakinId) || sakinler[0] || null

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchSakinler(session.user.id)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setUser(session?.user ?? null)
        if (session?.user) fetchSakinler(session.user.id)
        else { setSakinler([]); setAktifSakinId(null); setLoading(false) }
      }
    )
    return () => subscription.unsubscribe()
  }, [])

  async function fetchSakinler(userId) {
    const { data } = await supabase
      .from('sakinler')
      .select('*')
      .eq('user_id', userId)
      .order('daire_no')
    const liste = data || []
    setSakinler(liste)
    setAktifSakinId(liste[0]?.id ?? null)
    setLoading(false)
  }

  function daireSec(sakinId) {
    setAktifSakinId(sakinId)
  }

  async function girisYap(email, sifre) {
    const { error } = await supabase.auth.signInWithPassword({ email, password: sifre })
    return { error }
  }

  async function cikisYap() {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{
      user, sakin, sakinler, aktifSakinId, daireSec,
      coklu: sakinler.length > 1,
      isAdmin, loading, girisYap, cikisYap
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
