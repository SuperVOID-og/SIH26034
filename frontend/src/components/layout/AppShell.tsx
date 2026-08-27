"use client"

import React from 'react'
import { Package, LayoutDashboard, Plus, User } from 'lucide-react'
import Link from 'next/link'
import { cn } from '../../lib/utils'
import { usePathname } from 'next/navigation'

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  
  const navItems = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'New Inspection', href: '/inspections/new', icon: Plus },
    { name: 'Inspections', href: '/inspections', icon: Package },
  ]

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      <aside className="w-full md:w-64 border-r border-border bg-surface flex flex-col shrink-0">
        <div className="h-16 flex items-center px-6 border-b border-border">
          <Package className="w-6 h-6 mr-2 text-accent" />
          <span className="font-semibold text-lg tracking-tight">PackSure AI</span>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/' && pathname?.startsWith(item.href))
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors group",
                  isActive 
                    ? "bg-surface-hover text-accent" 
                    : "text-text-secondary hover:bg-surface-hover hover:text-text-primary"
                )}
              >
                <item.icon className={cn("mr-3 h-5 w-5 flex-shrink-0", isActive ? "text-accent" : "text-text-secondary group-hover:text-text-primary")} aria-hidden="true" />
                {item.name}
              </Link>
            )
          })}
        </nav>
        <div className="p-4 border-t border-border">
          <div className="flex items-center px-3 py-2 text-sm font-medium text-text-secondary rounded-lg">
            <User className="mr-3 h-5 w-5" />
            Inspector
          </div>
        </div>
      </aside>
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  )
}
