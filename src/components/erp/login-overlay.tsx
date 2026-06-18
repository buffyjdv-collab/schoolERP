'use client'

import { useStore } from '@/lib/store'
import { ROLE_LABELS, ROLE_DESCRIPTIONS } from '@/lib/rbac'
import type { Role } from '@/lib/rbac'
import { School, Shield, GraduationCap, User, Users, Bus, Loader2, LogIn, Sparkles, Eye, EyeOff } from 'lucide-react'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

const ROLE_ICONS: Record<Role, any> = {
  super_admin: Shield,
  admin: School,
  transport_manager: Bus,
  teacher: GraduationCap,
  student: User,
  parent: Users,
}

const DEMO_ACCOUNTS: { role: Role; email: string; password: string; color: string }[] = [
  { role: 'super_admin', email: 'superadmin@vidyamatrix.edu', password: 'super123', color: 'from-violet-500 to-violet-600' },
  { role: 'admin', email: 'admin@vidyamatrix.edu', password: 'admin123', color: 'from-emerald-500 to-emerald-600' },
  { role: 'transport_manager', email: 'transport@vidyamatrix.edu', password: 'transport123', color: 'from-teal-500 to-teal-600' },
  { role: 'teacher', email: 'teacher@vidyamatrix.edu', password: 'teacher123', color: 'from-cyan-500 to-cyan-600' },
  { role: 'student', email: 'student@vidyamatrix.edu', password: 'student123', color: 'from-amber-500 to-amber-600' },
  { role: 'parent', email: 'parent@vidyamatrix.edu', password: 'parent123', color: 'from-sky-500 to-sky-600' },
]

export function LoginOverlay() {
  const { setUser, setAuthLoading } = useStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)

  // Auto-load session on mount
  useEffect(() => {
    let cancelled = false
    fetch('/api/auth/me').then(r => r.json()).then((data) => {
      if (cancelled) return
      if (data.user) setUser(data.user)
      else setAuthLoading(false)
    }).catch(() => setAuthLoading(false))
    return () => { cancelled = true }
  }, [])

  const login = async (em: string, pw: string) => {
    if (!em || !pw) { toast.error('Enter email and password'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: em, password: pw }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Login failed'); return }
      setUser(data)
      toast.success(`Welcome, ${data.name}!`)
    } catch (e: any) {
      toast.error('Network error: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  const quickLogin = (acc: { email: string; password: string }) => {
    setEmail(acc.email)
    setPassword(acc.password)
    login(acc.email, acc.password)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-emerald-50 via-teal-50 to-sky-50 dark:from-emerald-950/40 dark:via-background dark:to-background">
      <div className="absolute inset-0 bg-grid opacity-40 pointer-events-none" />
      <div className="relative w-full max-w-5xl grid lg:grid-cols-2 gap-6 items-center">
        {/* Left: branding + feature highlights */}
        <div className="hidden lg:block space-y-6 p-8">
          <div className="flex items-center gap-3">
            <div className="size-14 rounded-2xl bg-primary grid place-items-center shadow-lg">
              <School className="size-7 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Vidyamatrix</h1>
              <p className="text-sm text-muted-foreground">Enterprise School ERP</p>
            </div>
          </div>
          <div>
            <h2 className="text-3xl font-bold leading-tight bg-gradient-to-r from-primary to-teal-600 bg-clip-text text-transparent">
              One platform for your entire institution.
            </h2>
            <p className="text-muted-foreground mt-3 max-w-md">
              AI-powered school management with role-based access for admins, teachers, students and parents — covering admissions, academics, fees, exams, transport GPS & more.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 max-w-md">
            {[
              { icon: Shield, label: 'Role-Based Access Control' },
              { icon: Sparkles, label: 'AI Assistant "Vidya"' },
              { icon: GraduationCap, label: '14 Integrated Modules' },
              { icon: Users, label: 'Multi-stakeholder Views' },
            ].map(f => (
              <div key={f.label} className="flex items-center gap-2 text-sm">
                <div className="size-8 rounded-lg bg-primary/10 grid place-items-center"><f.icon className="size-4 text-primary" /></div>
                <span className="font-medium">{f.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: login card + demo accounts */}
        <Card>
          <div className="lg:hidden flex items-center gap-2 mb-4">
            <div className="size-10 rounded-xl bg-primary grid place-items-center"><School className="size-5 text-primary-foreground" /></div>
            <div><div className="font-bold">Vidyamatrix</div><div className="text-xs text-muted-foreground">School ERP</div></div>
          </div>

          <div className="mb-5">
            <h3 className="text-lg font-semibold">Sign in to your account</h3>
            <p className="text-sm text-muted-foreground">Use a demo account below or enter credentials.</p>
          </div>

          <form onSubmit={(e) => { e.preventDefault(); login(email, password) }} className="space-y-3">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="you@vidyamatrix.edu" value={email} onChange={(e) => setEmail(e.target.value)} className="h-10" autoComplete="email" />
            </div>
            <div>
              <Label htmlFor="pw">Password</Label>
              <div className="relative">
                <Input id="pw" type={showPw ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="h-10 pr-10" autoComplete="current-password" />
                <button type="button" onClick={() => setShowPw(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full h-10 gap-2" disabled={loading}>
              {loading ? <Loader2 className="size-4 animate-spin" /> : <><LogIn className="size-4" /> Sign In</>}
            </Button>
          </form>

          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
            <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">Quick demo login</span></div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {DEMO_ACCOUNTS.map((acc) => {
              const Icon = ROLE_ICONS[acc.role]
              return (
                <button
                  key={acc.role}
                  onClick={() => quickLogin(acc)}
                  disabled={loading}
                  className="flex items-center gap-3 p-2.5 rounded-lg border hover:border-primary hover:bg-primary/5 transition-colors text-left disabled:opacity-50"
                >
                  <div className={`size-9 rounded-lg bg-gradient-to-br ${acc.color} grid place-items-center text-white shrink-0`}>
                    <Icon className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium">{ROLE_LABELS[acc.role]}</div>
                    <div className="text-[10px] text-muted-foreground truncate">{acc.email}</div>
                  </div>
                </button>
              )
            })}
          </div>
          <p className="text-[11px] text-muted-foreground mt-3 text-center">Click any role above to instantly sign in with demo credentials.</p>
        </Card>
      </div>
    </div>
  )
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-card border rounded-2xl shadow-xl p-6 ${className}`}>{children}</div>
}
