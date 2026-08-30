"use client"

import React, { useState } from 'react'
import { LayoutDashboard, Package, Plus, ScanLine, Menu, X, ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { cn } from '../../lib/utils'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { LeaveGuardProvider, GuardedLink } from '../inspection/LeaveInspectionGuard'

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)
  
  const navItems = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'New Inspection', href: '/inspections/new', icon: Plus },
    { name: 'Inspections', href: '/inspections', icon: Package },
  ]

  const activeNav = 
    pathname === "/"
      ? "/"
      : pathname === "/inspections/new"
        ? "/inspections/new"
        : pathname.startsWith("/inspections")
          ? "/inspections"
          : null;

  return (
    <LeaveGuardProvider>
      <div className="min-h-screen bg-transparent flex flex-col md:flex-row font-sans selection:bg-accent-surface selection:text-accent overflow-hidden">
      
      {/* Mobile Top Header */}
      <div className="md:hidden flex items-center justify-between px-4 h-16 border-b border-border bg-surface-muted shrink-0 relative z-30 w-full no-print">
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
                const isActive = item.href === activeNav;
                return (
                  <GuardedLink
                    key={item.name}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center px-4 py-3 text-[14px] font-medium rounded-lg transition-all",
                      isActive 
                        ? "text-accent bg-accent-surface shadow-sm border border-accent/20" 
                        : "text-text-secondary hover:text-text-primary hover:bg-surface"
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

      {/* Desktop Floating Navigation */}
      <div className={cn(
        "hidden md:flex flex-col fixed top-0 left-0 h-screen z-50 pointer-events-none no-print transition-all duration-300",
        isCollapsed ? "w-[80px]" : "w-[240px]"
      )}>
        {/* Floating Brand Area (Always visible, PackSure branding independent) */}
        <div className="pt-10 px-8 pb-4 pointer-events-auto font-ibm flex items-center overflow-hidden">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-accent text-accent-foreground mr-3 shadow-[0_0_15px_rgba(45,212,191,0.3)] shrink-0">
            <ScanLine className="w-5 h-5 stroke-[2]" />
          </div>
          <div className={cn(
            "flex flex-col whitespace-nowrap drop-shadow-md transition-opacity duration-300",
            isCollapsed ? "opacity-0 w-0" : "opacity-100"
          )}>
            <span className="font-semibold text-[15px] leading-tight tracking-tight text-text-primary">PackSure AI</span>
            <span className="text-[11px] font-mono tracking-wider text-text-secondary">SIH26034</span>
          </div>
        </div>
        
        {/* Floating Liquid-Glass Nav Panel */}
        <div className="px-6 mt-4 pointer-events-auto">
          <motion.nav 
            initial={false}
            animate={{ width: isCollapsed ? 64 : 192 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="flex flex-col gap-2 font-sora bg-[#121821]/70 backdrop-blur-md shadow-[0_8px_30px_rgba(0,0,0,0.12),inset_0_1px_1px_rgba(255,255,255,0.05)] border border-[#1C2633] rounded-2xl p-2"
          >
            {navItems.map((item) => {
              const isActive = item.href === activeNav;
              return (
                <GuardedLink
                  key={item.name}
                  href={item.href}
                  title={isCollapsed ? item.name : undefined}
                  className={cn(
                    "relative flex items-center p-2.5 text-[14px] font-medium rounded-xl transition-all duration-200 group outline-none focus-visible:ring-2 focus-visible:ring-accent",
                    isActive 
                      ? "text-accent bg-accent-surface/30 shadow-[inset_0_1px_1px_rgba(45,212,191,0.15)]" 
                      : "text-text-secondary hover:text-text-primary hover:bg-white/5",
                    isCollapsed && "justify-center"
                  )}
                >
                  {isActive && (
                    <div className="absolute left-0 top-2 bottom-2 w-[3px] bg-accent rounded-r-full shadow-[0_0_8px_rgba(45,212,191,0.5)]" />
                  )}
                  
                  <item.icon 
                    className={cn(
                      "relative z-10 h-[18px] w-[18px] flex-shrink-0 transition-colors", 
                      isActive ? "text-accent drop-shadow-[0_0_8px_rgba(45,212,191,0.4)]" : "text-text-secondary group-hover:text-text-primary",
                      !isCollapsed && "mr-3"
                    )} 
                    aria-hidden="true" 
                  />
                  
                  {!isCollapsed && (
                    <span className="relative z-10 whitespace-nowrap truncate tracking-wide">{item.name}</span>
                  )}
                </GuardedLink>
              )
            })}
            
            {/* Collapse Control */}
            <div className="mt-2 pt-2 border-t border-white/5">
              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className={cn(
                  "w-full flex items-center p-2.5 text-[13px] text-text-secondary hover:text-text-primary hover:bg-white/5 rounded-xl transition-colors font-medium",
                  isCollapsed && "justify-center"
                )}
                title={isCollapsed ? "Expand" : "Collapse"}
              >
                {isCollapsed ? (
                  <ChevronRight className="w-[18px] h-[18px] shrink-0" />
                ) : (
                  <>
                    <ChevronLeft className="w-[18px] h-[18px] mr-3 shrink-0" />
                    <span className="whitespace-nowrap">Collapse</span>
                  </>
                )}
              </button>
            </div>
          </motion.nav>
        </div>
      </div>
      
      {/* Main Canvas */}
      <main className={cn(
        "flex-1 flex flex-col min-w-0 overflow-y-auto bg-transparent relative z-10 w-full transition-all duration-300",
        isCollapsed ? "md:pl-[80px]" : "md:pl-[240px]"
      )}>
        <div className="flex-1 p-4 md:p-8 lg:py-12 lg:pr-12 w-full max-w-[1250px] mx-auto min-w-0">
          {children}
        </div>
      </main>
    </div>
    </LeaveGuardProvider>
  )
}
