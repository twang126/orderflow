"use client"

import { useEffect, useState, useMemo } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { AuthProvider, useAuth } from "@/contexts/AuthContext"
import { EventProvider } from "@/contexts/EventContext"
import { Button } from "@/components/ui/button"
import { Calendar, BarChart3, LogOut } from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/events", label: "Events", icon: Calendar },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
]

function DashboardLayoutInner({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, shop } = useAuth()
  const [shopName, setShopName] = useState<string>("")
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    if (shop?.name) {
      setShopName(shop.name)
    } else if (user?.user_metadata?.shop_name) {
      setShopName(user.user_metadata.shop_name)
    }
  }, [shop, user])

  useEffect(() => {
    // Listen for auth state changes and redirect to login if session becomes invalid
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT" || event === "TOKEN_REFRESHED") {
        supabase.auth.getUser().then(({ data: { user } }) => {
          if (!user) {
            router.push("/login")
          }
        })
      }
    })

    return () => subscription.unsubscribe()
  }, [supabase, router])

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-8">
              <Link href="/events" className="font-bold text-xl">
                {shopName || "OrderFlow"}
              </Link>
            </div>
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
                return (
                  <Link key={item.href} href={item.href}>
                    <Button
                      variant={isActive ? "secondary" : "ghost"}
                      size="sm"
                      className={cn(
                        "gap-2",
                        isActive && "bg-secondary"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </Button>
                  </Link>
                )
              })}
              <form action="/auth/signout" method="POST">
                <Button
                  type="submit"
                  variant="ghost"
                  size="sm"
                  className="gap-2 ml-4"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </Button>
              </form>
            </nav>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t z-10">
        <div className="grid grid-cols-3 h-16">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-1",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="text-xs">{item.label}</span>
              </Link>
            )
          })}
          <form action="/auth/signout" method="POST" className="contents">
            <button
              type="submit"
              className="flex flex-col items-center justify-center gap-1 text-muted-foreground"
            >
              <LogOut className="h-5 w-5" />
              <span className="text-xs">Sign Out</span>
            </button>
          </form>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-6">
        {children}
      </main>
    </div>
  )
}

function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [isRedirecting, setIsRedirecting] = useState(false)

  useEffect(() => {
    if (!authLoading && !user && !isRedirecting) {
      setIsRedirecting(true)
      router.push("/login")
    }
  }, [authLoading, user, router, isRedirecting])

  // Show spinner while loading auth state or if no user (redirect in progress)
  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return <>{children}</>
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthProvider>
      <AuthGuard>
        <EventProvider>
          <DashboardLayoutInner>{children}</DashboardLayoutInner>
        </EventProvider>
      </AuthGuard>
    </AuthProvider>
  )
}
