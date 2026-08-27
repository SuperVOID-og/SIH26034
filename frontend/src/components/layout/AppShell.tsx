"use client"

import React from 'react'
import { Hexagon, LayoutDashboard, Package, User } from 'lucide-react'
import Link from 'next/link'
import { cn } from '../../lib/utils'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  
  const navItems = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Inspections', href: '/inspections', icon: Package },
  ]

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row font-sans selection:bg-accent-surface selection:text-accent">
      <aside className="w-full md:w-64 border-r border-border bg-surface flex flex-col shrink-0">
        <div className="h-16 flex items-center px-6">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-accent text-white mr-3 shadow-sm">
            <Hexagon className="w-5 h-5 fill-current" />
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-[15px] leading-tight tracking-tight text-text-primary">PackSure AI</span>
            <span className="text-[11px] font-medium text-text-secondary tracking-wider uppercase">Compliance Intel</span>
          </div>
        </div>
        
        <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
          <div className="px-3 mb-2 text-[11px] font-semibold tracking-wider text-text-secondary uppercase">
            Workspace
          </div>
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/' && pathname?.startsWith(item.href))
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "relative flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors group outline-none focus-visible:ring-2 focus-visible:ring-accent",
                  isActive 
                    ? "text-accent" 
                    : "text-text-secondary hover:text-text-primary hover:bg-surface-hover/50"
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="active-nav-bg"
                    className="absolute inset-0 bg-accent-surface rounded-lg"
                    initial={false}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <item.icon className={cn("relative z-10 mr-3 h-4 w-4 flex-shrink-0 transition-colors", isActive ? "text-accent" : "text-text-secondary group-hover:text-text-primary")} aria-hidden="true" />
                <span className="relative z-10">{item.name}</span>
              </Link>
            )
          })}
        </nav>
        
        <div className="p-3">
          <div className="flex items-center px-3 py-2 text-sm font-medium text-text-secondary rounded-lg hover:bg-surface-hover hover:text-text-primary transition-colors cursor-default">
            <div className="w-7 h-7 rounded-full bg-border flex items-center justify-center mr-3 shrink-0">
              <User className="w-3.5 h-3.5 text-text-secondary" />
            </div>
            <div className="flex flex-col truncate">
              <span className="text-text-primary text-[13px] font-medium leading-none mb-1">Inspector</span>
              <span className="text-[11px] text-text-secondary leading-none">Local Workspace</span>
            </div>
          </div>
        </div>
      </aside>
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 md:p-10">
          <div className="max-w-5xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  )
}
