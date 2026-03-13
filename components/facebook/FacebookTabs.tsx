'use client'

import { useState } from "react"
import { Button } from "@/components/ui/button"
import FacebookLogin from "@/components/facebook/FacebookLogin"
import SystemUserManager from "@/components/facebook/SystemUserManager"
import PageManager from "@/components/facebook/PageManager"

type TabKey = "page-token" | "system-user" | "page-manager"

export default function FacebookTabs() {
  const [activeTab, setActiveTab] = useState<TabKey>("page-token")

  return (
    <div className="space-y-5">
      <div className="inline-flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
        <Button
          variant="outline"
          onClick={() => setActiveTab("page-token")}
          className={`h-9 cursor-pointer rounded-lg border-slate-200 px-4 ${
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
          className={`h-9 cursor-pointer rounded-lg border-slate-200 px-4 ${
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
          className={`h-9 cursor-pointer rounded-lg border-slate-200 px-4 ${
            activeTab === "page-manager"
              ? "bg-slate-100 text-slate-800 hover:bg-slate-100"
              : "border-transparent bg-white text-slate-500 hover:bg-slate-50"
          }`}
        >
          Page Manager
        </Button>
      </div>

      {activeTab === "page-token" && <FacebookLogin />}
      {activeTab === "system-user" && <SystemUserManager />}
      {activeTab === "page-manager" && <PageManager />}
    </div>
  )
}
