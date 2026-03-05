import { FacebookPage } from "@/types/facebook"

export const facebookService = {
  async getPages(token: string): Promise<FacebookPage[]> {
    const url = new URL("https://graph.facebook.com/me/accounts")
    url.searchParams.set("fields", "id,name,access_token")
    url.searchParams.set("access_token", token)

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