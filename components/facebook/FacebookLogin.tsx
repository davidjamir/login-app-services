'use client'

import Image from 'next/image'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Copy } from "lucide-react"
import { copyToClipboard } from "@/lib/copy"
import { facebookService } from "@/services/facebook.service"
import { FacebookPage, SystemUser } from "@/types/facebook"
import { toast } from "sonner"

type Props = { adminPassword: string; isAdminVerified: boolean }

export default function FacebookLogin({ adminPassword, isAdminVerified }: Props) {
    const [status, setStatus] = useState("Select a system user to crawl page tokens.")
    const [systemUsers, setSystemUsers] = useState<SystemUser[]>([])
    const [selectedBmFilter, setSelectedBmFilter] = useState("")
    const [selectedSystemUserId, setSelectedSystemUserId] = useState("")
    const [pages, setPages] = useState<FacebookPage[]>([])
    const [saving, setSaving] = useState(false)
    const [loadingPages, setLoadingPages] = useState(false)

    const bmFilterOptions = useMemo(() => {
        const seen = new Set<string>()
        return systemUsers
            .map((u) => ({ id: (u.businessId ?? "").trim(), name: (u.businessName ?? "—").trim() || "—" }))
            .filter((bm) => bm.id && !seen.has(bm.id) && seen.add(bm.id))
    }, [systemUsers])

    const filteredSystemUsers = useMemo(() => {
        if (!selectedBmFilter) return systemUsers
        return systemUsers.filter((u) => (u.businessId ?? "").trim() === selectedBmFilter)
    }, [systemUsers, selectedBmFilter])

    const selectedUser = systemUsers.find((u) => u.id === selectedSystemUserId)

    const loadSystemUsers = useCallback(async (password: string) => {
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
        setSelectedSystemUserId((prev) => (users.some((u) => u.id === prev) ? prev : ""))
    }, [])

    useEffect(() => {
        if (!isAdminVerified || !adminPassword.trim()) {
            setSystemUsers([])
            setSelectedBmFilter("")
            setSelectedSystemUserId("")
            setPages([])
            return
        }
        void loadSystemUsers(adminPassword.trim())
    }, [isAdminVerified, adminPassword, loadSystemUsers])

    useEffect(() => {
        if (selectedBmFilter && !bmFilterOptions.some((bm) => bm.id === selectedBmFilter)) {
            setSelectedBmFilter("")
        }
    }, [bmFilterOptions, selectedBmFilter])

    useEffect(() => {
        if (selectedSystemUserId && !filteredSystemUsers.some((u) => u.id === selectedSystemUserId)) {
            setSelectedSystemUserId("")
        }
    }, [selectedBmFilter, filteredSystemUsers, selectedSystemUserId])

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
    }, [selectedSystemUserId, selectedUser?.token, isAdminVerified])

    const shorten = (token?: string) => {
        if (!token) return ''
        if (token.length <= 10) return token
        return `${token.slice(0, 5)}...${token.slice(-5)}`
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
        <Card className="relative w-full rounded-2xl border-slate-200 bg-white shadow-lg">
                <div className="pointer-events-none absolute right-6 top-6 rounded-xl border border-slate-200 bg-white/90 p-2.5 shadow-sm">
                    <Image src="/icon.png" alt="App icon" width={40} height={40} />
                </div>
                <CardContent className="p-8 space-y-8">
                    <div className="space-y-1">
                        <h2 className="text-2xl font-semibold tracking-tight">Page Token Manager</h2>
                        <p className="text-sm text-slate-600">{status}</p>
                    </div>

                    <div className="grid grid-cols-[9rem_minmax(0,1fr)_auto] gap-x-2 gap-y-2 items-center">
                        <select
                            value={selectedBmFilter}
                            onChange={(e) => setSelectedBmFilter(e.target.value)}
                            className="h-10 w-full rounded-md border border-slate-300 bg-slate-50/80 px-3 text-sm text-slate-700 shadow-sm"
                            disabled={!isAdminVerified || systemUsers.length === 0}
                            title="Filter by Business Manager"
                        >
                            <option value="">All BMs</option>
                            {bmFilterOptions.map((bm) => (
                                <option key={bm.id} value={bm.id}>
                                    {bm.name}
                                </option>
                            ))}
                        </select>
                        <select
                            value={selectedSystemUserId}
                            onChange={(e) => setSelectedSystemUserId(e.target.value)}
                            className="h-10 w-full min-w-0 rounded-md border border-slate-300 bg-white px-3 text-sm shadow-sm"
                            disabled={!isAdminVerified || filteredSystemUsers.length === 0}
                        >
                            <option value="" disabled>
                                {!isAdminVerified
                                    ? "Please enter admin password first"
                                    : filteredSystemUsers.length === 0
                                        ? selectedBmFilter
                                            ? "No system users in this BM"
                                            : "No system users"
                                        : "Select system user (name • app • id)"}
                            </option>
                            {filteredSystemUsers.map((user) => (
                                <option key={user.id} value={user.id}>
                                    {`${user.name} • ${user.appName || "(no-app)"} • ${user.id}`}
                                </option>
                            ))}
                        </select>

                        <div className="flex items-center">
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
                                                        onClick={() => void copyToClipboard(page.id)}
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
                                                        onClick={() => void copyToClipboard(page.access_token)}
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
    )
}
