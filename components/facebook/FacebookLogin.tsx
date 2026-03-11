'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Copy } from "lucide-react"
import { facebookService } from "@/services/facebook.service"
import { FacebookPage, SystemUser } from "@/types/facebook"
import { toast } from "sonner"

export default function FacebookLogin() {
    const [status, setStatus] = useState('Select a system user to crawl page tokens.')
    const [systemUsers, setSystemUsers] = useState<SystemUser[]>([])
    const [selectedUserId, setSelectedUserId] = useState("")
    const [pages, setPages] = useState<FacebookPage[]>([])
    const [saving, setSaving] = useState(false)
    const [loadingPages, setLoadingPages] = useState(false)

    const selectedUser = systemUsers.find((user) => user.id === selectedUserId)

    const loadSystemUsers = async () => {
        try {
            const res = await fetch("/api/database/systemUsers")
            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.error || data.message || "Failed to load system users")
            }

            const users = (data.data ?? []) as SystemUser[]
            setSystemUsers(users)
            setSelectedUserId((prev) =>
                users.some((user) => user.id === prev) ? prev : ""
            )
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Unknown error"
            toast.error(message)
        }
    }

    useEffect(() => {
        loadSystemUsers()
    }, [])

    useEffect(() => {
        if (!selectedUser?.token) {
            setPages([])
            return
        }

        const fetchPages = async () => {
            try {
                setLoadingPages(true)
                setStatus("Crawling pages...")
                const fetchedPages = await facebookService.getPages(selectedUser.token)
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
    }, [selectedUserId, selectedUser?.token])

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
                systemUserName: selectedUser?.name ?? "",
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
                        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                            <span className="h-2 w-2 rounded-full bg-emerald-500" />
                            Page Token Manager
                        </div>
                        <h2 className="text-2xl font-semibold tracking-tight">Save Page Token</h2>
                        <p className="text-sm text-slate-600">{status}</p>
                    </div>

                    <div className="flex flex-col md:flex-row md:items-center gap-3">
                        <select
                            value={selectedUserId}
                            onChange={(e) => setSelectedUserId(e.target.value)}
                            className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm shadow-sm"
                        >
                            <option value="" disabled>
                                {systemUsers.length === 0 ? "No system users" : "Select system user"}
                            </option>
                            {systemUsers.map((user) => (
                                <option key={user.id} value={user.id}>
                                    {user.name}
                                </option>
                            ))}
                        </select>

                        <Button
                            onClick={handlePageSave}
                            disabled={saving || loadingPages || pages.length === 0}
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
                                            <td className="p-3 font-mono">{page.id}</td>
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
