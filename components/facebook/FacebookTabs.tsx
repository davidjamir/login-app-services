'use client'

import { useEffect, useState } from "react"
import Image from "next/image"
import { Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import LoadingPage from "@/components/ui/loading-page"
import FacebookLogin from "@/components/facebook/FacebookLogin"
import SystemUserManager from "@/components/facebook/SystemUserManager"
import PageManager from "@/components/facebook/PageManager"
import { toast } from "sonner"
import { clearSession, isSessionExpired, loadSession, saveSession } from "@/lib/session"

type TabKey = "page-token" | "system-user" | "page-manager"

export default function FacebookTabs() {
  const [activeTab, setActiveTab] = useState<TabKey>("page-token")
  const [adminPassword, setAdminPassword] = useState("")
  const [isAdminVerified, setIsAdminVerified] = useState(false)
  const [authLoading, setAuthLoading] = useState(false)
  const [authError, setAuthError] = useState("")
  const [sessionChecked, setSessionChecked] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    const checkExpiry = () => {
      if (isSessionExpired()) {
        clearSession()
        setAdminPassword("")
        setIsAdminVerified(false)
        toast.error("Session expired. Please sign in again.")
      }
    }

    const saved = loadSession()
    if (saved) {
      setAdminPassword(saved)
      setAuthLoading(true)
      fetch("/api/database/systemUsers/secure-list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: saved }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (!data.data) throw new Error(data.error || data.message || "Invalid")
          setIsAdminVerified(true)
          setAdminPassword(saved)
          saveSession(saved)
        })
        .catch(() => {
          setAdminPassword("")
          setIsAdminVerified(false)
        })
        .finally(() => {
          setAuthLoading(false)
          setSessionChecked(true)
        })
    } else {
      setSessionChecked(true)
    }

    const interval = setInterval(checkExpiry, 60_000)
    return () => clearInterval(interval)
  }, [])

  const handleVerifyAdmin = async () => {
    const password = adminPassword.trim()
    if (!password) {
      toast.error("Please input admin password")
      return
    }
    try {
      setAuthLoading(true)
      setAuthError("")
      const res = await fetch("/api/database/systemUsers/secure-list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || data.message || "Invalid admin password")
      }
      setIsAdminVerified(true)
      setAdminPassword(password)
      saveSession(password)
      toast.success("Admin verified")
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Invalid admin password"
      setIsAdminVerified(false)
      setAuthError(message)
      toast.error(message)
    } finally {
      setAuthLoading(false)
    }
  }

  if (!sessionChecked) {
    return <LoadingPage />
  }

  if (!isAdminVerified) {
    return (
      <Card className="relative w-full overflow-hidden rounded-2xl border-slate-200 bg-white shadow-lg">
        <div className="pointer-events-none absolute right-6 top-6 rounded-xl border border-slate-200 bg-white/95 p-2.5 shadow-sm">
          <Image src="/icon.png" alt="Logo" width={48} height={48} priority />
        </div>
        <CardContent className="flex flex-col items-center gap-8 p-10 sm:flex-row sm:items-start sm:gap-12">
          <div className="flex shrink-0 flex-col items-center gap-3">
            <div className="rounded-2xl border-2 border-slate-200 bg-white p-4 shadow-md ring-2 ring-slate-100">
              <Image src="/icon.png" alt="Social Parallels" width={80} height={80} priority />
            </div>
            <p className="text-center text-sm font-medium text-slate-600">Social Parallels</p>
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-4">
            <h2 className="text-xl font-semibold tracking-tight">Admin Password</h2>
            <p className="text-sm text-slate-600">
              Enter admin password to sign in. Session lasts 1 hour.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="Password"
                  className="h-9 w-44 pr-9 text-xs"
                  onKeyDown={(e) => e.key === "Enter" && void handleVerifyAdmin()}
                />
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="absolute right-0 top-0 h-9 w-9 cursor-pointer text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                  onClick={() => setShowPassword((p) => !p)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <Button
                onClick={() => void handleVerifyAdmin()}
                disabled={authLoading || !adminPassword.trim()}
                className="h-9 min-w-24 cursor-pointer border border-slate-300 bg-slate-50 px-3 text-xs text-slate-700 shadow-sm hover:bg-slate-100"
              >
                {authLoading ? "Checking..." : "Sign in"}
              </Button>
            </div>
            {authError && <p className="text-xs text-red-600">{authError}</p>}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="w-full space-y-5">
      <div className="flex w-full items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
        <Button
          variant="outline"
          onClick={() => setActiveTab("page-token")}
          className={`h-9 min-w-0 flex-1 cursor-pointer rounded-lg border-slate-200 px-4 transition-colors duration-200 ${
            activeTab === "page-token"
              ? "bg-slate-100 text-slate-800 hover:bg-slate-100"
              : "border-transparent bg-white text-slate-500 hover:bg-slate-50"
          }`}
        >
          Page Token Manager
        </Button>
        <Button
          variant="outline"
          onClick={() => setActiveTab("system-user")}
          className={`h-9 min-w-0 flex-1 cursor-pointer rounded-lg border-slate-200 px-4 transition-colors duration-200 ${
            activeTab === "system-user"
              ? "bg-slate-100 text-slate-800 hover:bg-slate-100"
              : "border-transparent bg-white text-slate-500 hover:bg-slate-50"
          }`}
        >
          System User Manager
        </Button>
        <Button
          variant="outline"
          onClick={() => setActiveTab("page-manager")}
          className={`h-9 min-w-0 flex-1 cursor-pointer rounded-lg border-slate-200 px-4 transition-colors duration-200 ${
            activeTab === "page-manager"
              ? "bg-slate-100 text-slate-800 hover:bg-slate-100"
              : "border-transparent bg-white text-slate-500 hover:bg-slate-50"
          }`}
        >
          Page Manager
        </Button>
      </div>

      {activeTab === "page-token" && (
        <FacebookLogin adminPassword={adminPassword} isAdminVerified={isAdminVerified} />
      )}
      {activeTab === "system-user" && (
        <SystemUserManager adminPassword={adminPassword} isAdminVerified={isAdminVerified} />
      )}
      {activeTab === "page-manager" && (
        <PageManager adminPassword={adminPassword} isAdminVerified={isAdminVerified} />
      )}
    </div>
  )
}
