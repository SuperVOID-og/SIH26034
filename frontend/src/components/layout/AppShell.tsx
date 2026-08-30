"use client"

import React, { useState } from 'react'
import { LayoutDashboard, Package, Plus, ScanLine, ChevronLeft, ChevronRight, Info, Menu, X } from 'lucide-react'
import Link from 'next/link'
import { cn } from '../../lib/utils'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { LeaveGuardProvider, GuardedLink } from '../inspection/LeaveInspectionGuard'

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  
  const navItems = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'New Inspection', href: '/inspections/new', icon: Plus },
    { name: 'Inspections', href: '/inspections', icon: Package },
  ]

  return (
    <LeaveGuardProvider>
      <div className="min-h-screen bg-transparent flex flex-col md:flex-row font-sans selection:bg-accent-surface selection:text-accent overflow-hidden">
      
      {/* Mobile Top Header */}
      <div className="md:hidden flex items-center justify-between px-4 h-16 border-b border-border bg-surface/50 backdrop-blur-md shrink-0 relative z-30 w-full no-print">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-accent text-accent-foreground shadow-[0_0_15px_rgba(20,184,166,0.3)] shrink-0">
            <ScanLine className="w-5 h-5 stroke-[2]" />
          </div>
          <span className="font-semibold text-[15px] tracking-tight text-text-primary truncate">PackSure AI</span>
        </div>
        <button 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 -mr-2 text-text-secondary hover:text-text-primary shrink-0"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Dropdown Nav */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="md:hidden border-b border-border bg-surface relative z-20 w-full overflow-hidden no-print"
          >
            <nav className="p-4 space-y-2">
              {navItems.map((item) => {
                const isActive = pathname === item.href || (item.href !== '/' && pathname?.startsWith(item.href))
                return (
                  <GuardedLink
                    key={item.name}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center px-4 py-3 text-[14px] font-medium rounded-lg transition-all",
                      isActive 
                        ? "text-text-primary bg-surface-raised shadow-sm border border-border" 
                        : "text-text-secondary hover:text-text-primary hover:bg-surface-hover"
                    )}
                  >
                    <item.icon className={cn("w-5 h-5 mr-3 shrink-0", isActive ? "text-accent" : "text-text-secondary")} />
                    <span className="truncate">{item.name}</span>
                  </GuardedLink>
                )
              })}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ width: isCollapsed ? 76 : 260 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="hidden md:flex border-r border-border bg-surface/50 backdrop-blur-md flex-col shrink-0 relative z-20 h-screen overflow-hidden no-print"
      >
        <div className="h-16 flex items-center px-4 overflow-hidden shrink-0 border-b border-border/50">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-accent text-accent-foreground mr-3 shadow-[0_0_15px_rgba(20,184,166,0.3)] shrink-0">
            <ScanLine className="w-5 h-5 stroke-[2]" />
          </div>
          
          <AnimatePresence mode="wait">
            {!isCollapsed && (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col whitespace-nowrap overflow-hidden"
              >
                <span className="font-semibold text-[15px] leading-tight tracking-tight text-text-primary truncate">PackSure AI</span>
                <span className="text-[11px] font-mono tracking-wider text-text-secondary truncate">SIH26034</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        <nav className="flex-1 px-3 py-6 space-y-1.5 overflow-y-auto overflow-x-hidden">
          {!isCollapsed && (
            <div className="px-3 mb-4 text-[11px] font-semibold tracking-wider text-text-secondary uppercase truncate">
              Workspace
            </div>
          )}
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/' && pathname?.startsWith(item.href))
            return (
              <GuardedLink
                key={item.name}
                href={item.href}
                title={isCollapsed ? item.name : undefined}
                className={cn(
                  "relative flex items-center px-3 py-2.5 text-[14px] font-medium rounded-lg transition-all duration-200 group outline-none focus-visible:ring-2 focus-visible:ring-accent",
                  isActive 
                    ? "text-text-primary bg-surface-raised shadow-sm" 
                    : "text-text-secondary hover:text-text-primary hover:bg-surface-hover",
                  isCollapsed && "justify-center px-0"
                )}
              >
                {isActive && (
                  <div className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-accent rounded-r-full" />
                )}
                
                <item.icon 
                  className={cn(
                    "relative z-10 h-4 w-4 flex-shrink-0 transition-colors", 
                    isActive ? "text-accent" : "text-text-secondary group-hover:text-text-primary",
                    !isCollapsed && "mr-3"
                  )} 
                  aria-hidden="true" 
                />
                
                {!isCollapsed && (
                  <span className="relative z-10 whitespace-nowrap truncate">{item.name}</span>
                )}
              </GuardedLink>
            )
          })}
        </nav>
        
        <div className="p-4 border-t border-border/50 shrink-0">
          <AnimatePresence mode="wait">
            {!isCollapsed && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="mb-4 p-3 rounded-lg bg-black/20 border border-transparent text-[11px] text-text-secondary leading-relaxed overflow-hidden"
              >
                <div className="flex items-start gap-2">
                  <Info className="w-3.5 h-3.5 text-accent shrink-0 mt-0.5" />
                  <p>AI extracts declarations. The deterministic rule engine decides compliance.</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="w-full flex items-center justify-center p-2 text-text-secondary hover:text-text-primary hover:bg-surface-hover rounded-lg transition-colors shrink-0"
            title={isCollapsed ? "Expand" : "Collapse"}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            {!isCollapsed && <span className="ml-2 text-xs font-medium uppercase tracking-wider">Collapse</span>}
          </button>
        </div>
      </motion.aside>
      
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto bg-transparent relative z-10 w-full">
        <div className="flex-1 p-4 md:p-8 lg:p-12 w-full max-w-[1250px] mx-auto min-w-0">
          {children}
        </div>
      </main>
    </div>
    </LeaveGuardProvider>
  )
}
