'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, FileText, Briefcase, MessageSquare, Code2, Settings } from 'lucide-react'

const routes = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/resume', label: 'Resume Hub', icon: FileText },
  { href: '/jobs', label: 'Job Matches', icon: Briefcase },
  { href: '/interviews', label: 'Mock Interviews', icon: MessageSquare },
  { href: '/dsa', label: 'DSA Practice', icon: Code2 },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-64 flex-col hidden md:flex border-r bg-card h-screen sticky top-0 overflow-y-auto">
      <div className="p-6">
        <h1 className="text-2xl font-bold tracking-tight text-primary flex items-center gap-2">
          <Briefcase className="w-6 h-6" />
          AI Coach
        </h1>
      </div>
      <nav className="flex-1 px-4 space-y-2">
        {routes.map((route) => {
          const isActive = pathname === route.href || (route.href !== '/' && pathname.startsWith(route.href))
          return (
            <Link
              key={route.href}
              href={route.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                isActive ? 'bg-primary text-primary-foreground font-medium' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              }`}
            >
              <route.icon className="w-5 h-5" />
              {route.label}
            </Link>
          )
        })}
      </nav>
      <div className="p-4 mt-auto">
        <div className="p-4 rounded-xl bg-accent/50 border flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
            <span className="font-bold text-primary">U</span>
          </div>
          <div>
            <p className="font-medium text-sm">Guest User</p>
            <p className="text-xs text-muted-foreground">Free Local Mode</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
