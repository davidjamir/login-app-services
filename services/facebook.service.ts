import { FacebookPage, FacebookUser } from "@/types/facebook"

const LIMIT = 200

export const facebookService = {
  async getMe(token: string): Promise<FacebookUser> {
    const url = new URL("https://graph.facebook.com/me")
    url.searchParams.set("fields", "id,name")
    url.searchParams.set("access_token", token)

    const res = await fetch(url.toString())
    if (!res.ok) {
      throw new Error("Failed to fetch Facebook user")
    }

    const data = await res.json() as FacebookUser & { error?: { message?: string } }
    if (data.error?.message) {
      throw new Error(data.error.message)
    }

    return { id: data.id, name: data.name }
  },

  async getPages(token: string): Promise<FacebookPage[]> {
    const url = new URL("https://graph.facebook.com/me/accounts")
    url.searchParams.set("fields", "id,name,access_token,category")
    url.searchParams.set("access_token", token)
    url.searchParams.set("limit", LIMIT.toString())

    const res = await fetch(url.toString())
    if (!res.ok) {
      throw new Error("Failed to fetch Facebook pages")
    }

    const data = await res.json() as { data?: FacebookPage[]; error?: { message?: string } }
    if (data.error?.message) {
      throw new Error(data.error.message)
    }

    return data.data ?? []
  }
}