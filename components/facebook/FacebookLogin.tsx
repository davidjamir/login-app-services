'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Copy } from "lucide-react"
import { facebookService } from "@/services/facebook.service"
import { FacebookPage } from "@/types/facebook"
import { toast } from "sonner"

export default function FacebookLogin() {
    const [status, setStatus] = useState('Enter your permanent user token and save to continue.')
    const [userToken, setUserToken] = useState<string | undefined>()
    const [tokenInput, setTokenInput] = useState('')
    const [pages, setPages] = useState<FacebookPage[]>([])
    const [saving, setSaving] = useState(false)
    const [tokenSaving, setTokenSaving] = useState(false)

    const handleSave = () => {
        const inputToken = tokenInput.trim()
        if (!inputToken) {
            toast.error("Please enter user token")
            return
        }
        setUserToken(inputToken)
        setTokenInput(inputToken)
        setStatus("Token saved. Loading pages...")
        toast.success("User token saved")
    }

    useEffect(() => {
        if (!userToken) return

        const fetchPages = async () => {
            try {
                setTokenSaving(true)
                const fetchedPages = await facebookService.getPages(userToken)
                setPages(fetchedPages)
                setStatus("Pages loaded.")
            } catch (err: unknown) {
                const message =
                    err instanceof Error ? err.message : "Unknown error"

                toast.error(message)
                setStatus("Unable to load pages. Please check token and try again.")
            } finally {
                setTokenSaving(false)
            }
        }

        fetchPages()
    }, [userToken])

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
        } catch (err: unknown) {
            const message =
                err instanceof Error ? err.message : "Unknown error"

            toast.error(message)
        } finally {
            setSaving(false)
        }
    }
    return (
        <div className="min-h-screen bg-white text-slate-900 relative overflow-hidden">
            {/* Background effects */}
            <div className="pointer-events-none absolute inset-0 -z-10">
                <div className="absolute left-[15%] top-[10%] h-[520px] w-[900px] bg-blue-500/10 blur-3xl rounded-full" />
                <div className="absolute right-[15%] top-[15%] h-[520px] w-[800px] bg-emerald-500/10 blur-3xl rounded-full" />
                <div className="absolute left-[40%] bottom-[5%] h-[520px] w-[700px] bg-pink-500/10 blur-3xl rounded-full" />
            </div>

            <div className="max-w-6xl mx-auto px-6 py-10 space-y-6">
                {/* Topbar */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 bg-white/70 backdrop-blur-xl border rounded-full px-4 py-2 shadow-lg">
                        <div className="w-10 h-10 rounded-xl overflow-hidden shadow-md">
                            <Image
                                src="/favicon.ico"
                                alt="Logo"
                                width={40}
                                height={40}
                            />
                        </div>
                        <div className="leading-tight">
                            <p className="font-semibold text-sm">Facebook Login Integration</p>
                            <p className="text-xs text-slate-500">login → preview pages → saved</p>
                        </div>
                    </div>
                </div>

                {/* Hero Section */}

                <Card className="rounded-2xl shadow-xl bg-white/70 backdrop-blur-xl border">
                    <CardContent className="p-8 space-y-8">
                        {/* Status */}
                        <div>
                            <h2 className="text-2xl font-semibold mb-2">{status}</h2>
                        </div>

                        {/* User Token Row */}
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <h4 className="font-medium">User token:</h4>
                                <div className="flex items-center gap-2">
                                    <Input
                                        value={tokenInput}
                                        onChange={(e) => setTokenInput(e.target.value)}
                                        placeholder="Paste user token here"
                                        className="w-[420px]"
                                    />
                                    <Button size="icon" variant="outline" onClick={() => copy(tokenInput)} className="cursor-pointer">
                                        <Copy className="w-4 h-4" />
                                    </Button>
                                    <Button
                                        onClick={handleSave}
                                        disabled={tokenSaving || !tokenInput.trim()}
                                        className="bg-gradient-to-r from-indigo-500 via-blue-500 to-cyan-500 hover:from-indigo-600 hover:via-blue-600 hover:to-cyan-600 text-white shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer"
                                    >
                                        {tokenSaving ? "Saving..." : "Save"}
                                    </Button>
                                </div>
                            </div>

                            <Button
                                onClick={handlePageSave}
                                disabled={saving || pages.length === 0}
                                className="bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
                            >
                                {saving ? "Saving..." : "Save Page Token"}
                            </Button>
                        </div>

                        {/* Pages Table */}
                        <div className="rounded-xl border overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50">
                                    <tr className="text-center font-semibold">
                                        <th className="p-3 w-12">#</th>
                                        <th className="p-3">ID</th>
                                        <th className="p-3">Name</th>
                                        <th className="p-3">Token</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pages.map((page, index) => (
                                        <tr
                                            key={page.id}
                                            className="text-center border-t hover:bg-slate-50 transition"
                                        >
                                            <td className="p-3">{index + 1}</td>
                                            <td className="p-3">{page.id}</td>
                                            <td className="p-3 font-medium">{page.name}</td>
                                            <td className="p-3">
                                                <div className="flex items-center justify-center gap-3">
                                                    <span className="font-mono text-xs">
                                                        {shorten(page.access_token)}
                                                    </span>
                                                    <Button size="icon" variant="outline" onClick={() => copy(page.access_token)} className="cursor-pointer">
                                                        <Copy className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>

                <footer className="text-center text-xs text-slate-500 pt-4">
                    © Facebook Login Integration — Designed for smooth experience
                </footer>
            </div>
        </div>
    )
}
