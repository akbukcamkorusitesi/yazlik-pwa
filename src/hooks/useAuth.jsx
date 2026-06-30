import { useState, useEffect, createContext, useContext } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [sakin, setSakin] = useState(null)
  const [loading, setLoading] = useState(true)

  const isAdmin = user?.user_metadata?.role === 'admin'

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchSakin(session.user.id)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setUser(session?.user ?? null)
        if (session?.user) fetchSakin(session.user.id)
        else { setSakin(null); setLoading(false) }
      }
    )
    return () => subscription.unsubscribe()
  }, [])

  async function fetchSakin(userId) {
    const { data } = await supabase
      .from('sakinler')
      .select('*')
      .eq('user_id', userId)
      .single()
    setSakin(data)
    setLoading(false)
  }

  async function girisYap(email, sifre) {
    const { error } = await supabase.auth.signInWithPassword({ email, password: sifre })
    return { error }
  }

  async function cikisYap() {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ user, sakin, isAdmin, loading, girisYap, cikisYap }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
