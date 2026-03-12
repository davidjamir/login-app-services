'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Copy } from "lucide-react"
import { facebookService } from "@/services/facebook.service"
import { FacebookPage, SystemUser } from "@/types/facebook"
import { toast } from "sonner"

export default function FacebookLogin() {
    const [status, setStatus] = useState('Please enter admin password first.')
    const [authError, setAuthError] = useState("")
    const [adminPasswordInput, setAdminPasswordInput] = useState("")
    const [isAdminVerified, setIsAdminVerified] = useState(false)
    const [authLoading, setAuthLoading] = useState(false)
    const [systemUsers, setSystemUsers] = useState<SystemUser[]>([])
    const [selectedUserIndex, setSelectedUserIndex] = useState("")
    const [pages, setPages] = useState<FacebookPage[]>([])
    const [saving, setSaving] = useState(false)
    const [loadingPages, setLoadingPages] = useState(false)

    const selectedUser =
        selectedUserIndex !== "" ? systemUsers[Number(selectedUserIndex)] : undefined

    const loadSystemUsers = async (password: string) => {
        const res = await fetch("/api/database/systemUsers/secure-list", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ password }),
        })
        const data = await res.json()

        if (!res.ok) {
            throw new Error(data.error || data.message || "Failed to load system users")
        }

        const users = (data.data ?? []) as SystemUser[]
        setSystemUsers(users)
        setSelectedUserIndex((prev) => {
            const index = Number(prev)
            return Number.isInteger(index) && index >= 0 && index < users.length ? prev : ""
        })
    }

    const handleVerifyAdmin = async () => {
        const password = adminPasswordInput.trim()
        if (!password) {
            toast.error("Please input admin password")
            return
        }

        try {
            setAuthLoading(true)
            setAuthError("")
            await loadSystemUsers(password)
            setIsAdminVerified(true)
            setStatus("Select a system user to crawl page tokens.")
            toast.success("Admin verified")
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Invalid admin password"
            setIsAdminVerified(false)
            setSystemUsers([])
            setSelectedUserIndex("")
            setPages([])
            setStatus("Please enter admin password first.")
            setAuthError(message)
            toast.error(message)
        } finally {
            setAuthLoading(false)
        }
    }

    useEffect(() => {
        const token = selectedUser?.token
        if (!isAdminVerified || !token) {
            setPages([])
            return
        }

        const fetchPages = async () => {
            try {
                setLoadingPages(true)
                setStatus("Crawling pages...")
                const fetchedPages = await facebookService.getPages(token)
                setPages(fetchedPages)
                setStatus("Pages loaded. Click Save Page Token to store in database.")
            } catch (err: unknown) {
                const message =
                    err instanceof Error ? err.message : "Unknown error"

                toast.error(message)
                setStatus("Unable to load pages. Please check selected system user.")
            } finally {
                setLoadingPages(false)
            }
        }

        void fetchPages()
    }, [selectedUserIndex, selectedUser?.token, isAdminVerified])

    const shorten = (token?: string) => {
        if (!token) return ''
        if (token.length <= 10) return token
        return `${token.slice(0, 5)}...${token.slice(-5)}`
    }

    const copy = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text)
            toast.success("Copied")
        } catch (err: unknown) {
            if (err instanceof Error) {
                toast.error(err.message)
            } else {
                console.error("Unknown error", err)
                toast.error("Unknown error")
            }
        }
    }

    const handlePageSave = async () => {
        if (!pages.length) return

        try {
            setSaving(true)

            const payload = pages.map((page) => ({
                pageId: page.id,
                name: page.name,
                source: "System User",
                systemUserId: selectedUser?.id ?? "",
                systemUserName: selectedUser?.name ?? "",
                appName: selectedUser?.appName ?? "",
                category: page.category ?? "",
                token: page.access_token,
            }))

            const res = await fetch("/api/database/saveToken", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            })

            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.error || "Failed to save pages")
            }

            toast.success("Saved successfully")
            setStatus("Saved page tokens successfully.")
        } catch (err: unknown) {
            const message =
                err instanceof Error ? err.message : "Unknown error"

            toast.error(message)
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="max-w-5xl mx-auto px-6 py-10">
            <Card className="relative rounded-2xl border-slate-200 bg-white shadow-lg">
                <div className="pointer-events-none absolute right-6 top-6 rounded-xl border border-slate-200 bg-white/90 p-2.5 shadow-sm">
                    <Image src="/icon.png" alt="App icon" width={40} height={40} />
                </div>
                <CardContent className="p-8 space-y-8">
                    <div className="space-y-3">
                        <h2 className="text-2xl font-semibold tracking-tight">Page Token Manager</h2>
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            <div className="space-y-1">
                                <p className="text-sm text-slate-600">{status}</p>
                                {authError && <p className="text-xs text-red-600">{authError}</p>}
                            </div>
                            <div className="flex items-center gap-2">
                                <Input
                                    type="password"
                                    value={adminPasswordInput}
                                    onChange={(e) => setAdminPasswordInput(e.target.value)}
                                    placeholder="Admin password"
                                    className="h-9 w-44 text-xs"
                                />
                                <Button
                                    onClick={handleVerifyAdmin}
                                    disabled={authLoading || !adminPasswordInput.trim()}
                                    className="h-9 min-w-24 cursor-pointer border border-slate-300 bg-slate-50 px-3 text-xs text-slate-700 shadow-sm hover:bg-slate-100"
                                >
                                    {authLoading ? "Checking..." : "Unlock"}
                                </Button>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col md:flex-row md:items-center gap-3">
                        <select
                            value={selectedUserIndex}
                            onChange={(e) => setSelectedUserIndex(e.target.value)}
                            className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm shadow-sm"
                            disabled={!isAdminVerified || systemUsers.length === 0}
                        >
                            <option value="" disabled>
                                {!isAdminVerified
                                    ? "Please enter admin password first"
                                    : systemUsers.length === 0
                                        ? "No system users"
                                        : "Select system user (name • app • id)"}
                            </option>
                            {systemUsers.map((user, index) => (
                                <option key={index} value={String(index)}>
                                    {`${user.name} • ${user.appName || "(no-app)"} • ${user.id}`}
                                </option>
                            ))}
                        </select>

                        <Button
                            onClick={handlePageSave}
                            disabled={!isAdminVerified || saving || loadingPages || pages.length === 0}
                            className={`min-w-36 cursor-pointer border border-slate-300 shadow-sm transition-colors duration-200 ${
                                saving || loadingPages || pages.length === 0
                                    ? "bg-white text-slate-400 hover:bg-white"
                                    : "bg-slate-50 text-slate-700 hover:bg-slate-100"
                            }`}
                        >
                            {saving ? "Saving..." : "Save Page Token"}
                        </Button>
                    </div>

                    <div className="space-y-3">
                        <h3 className="text-lg font-semibold tracking-tight">Preview</h3>
                        <div className="overflow-hidden rounded-xl border border-slate-200">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50">
                                    <tr className="text-left font-semibold">
                                        <th className="p-3 w-12">#</th>
                                        <th className="p-3">Page ID</th>
                                        <th className="p-3">Page Name</th>
                                        <th className="p-3">Page Token</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pages.map((page, index) => (
                                        <tr key={page.id} className="border-t hover:bg-slate-50/60">
                                            <td className="p-3">{index + 1}</td>
                                            <td className="p-3">
                                                <div className="flex items-center justify-between gap-2">
                                                    <span className="font-mono">{page.id}</span>
                                                    <Button
                                                        size="icon"
                                                        variant="outline"
                                                        onClick={() => copy(page.id)}
                                                        className="cursor-pointer border-slate-300 bg-white hover:bg-slate-50"
                                                        title="Copy page id"
                                                    >
                                                        <Copy className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </td>
                                            <td className="p-3">{page.name}</td>
                                            <td className="p-3">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono text-xs">{shorten(page.access_token)}</span>
                                                    <Button
                                                        size="icon"
                                                        variant="outline"
                                                        onClick={() => copy(page.access_token)}
                                                        className="cursor-pointer border-slate-300 bg-white hover:bg-slate-50"
                                                    >
                                                        <Copy className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {pages.length === 0 && !loadingPages && (
                                        <tr className="border-t">
                                            <td className="p-3 text-slate-500" colSpan={4}>
                                                No pages found.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
