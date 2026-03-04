import { FacebookPage, FacebookUser,FacebookAuthResponse } from "@/types/facebook"

export const facebookService = {
  init(appId: string, version: string) {
    window.FB.init({
      appId,
      cookie: true,
      xfbml: true,
      version,
    })
  },

  getLoginStatus(): Promise<FacebookAuthResponse> {
    return new Promise((resolve) => {
      window.FB.getLoginStatus((res) => resolve(res))
    })
  },

  login(scope: string): Promise<FacebookAuthResponse> {
    return new Promise((resolve) => {
      window.FB.login((res) => resolve(res), { scope })
    })
  },

  async getMe(token: string): Promise<FacebookUser> {
    return new Promise((resolve) => {
      window.FB.api(
        "/me",
        { access_token: token },
        (response: FacebookUser) => resolve(response)
      )
    })
  },

  async getPages(token: string): Promise<FacebookPage[]> {
    return new Promise((resolve) => {
      window.FB.api(
        "/me/accounts",
        { access_token: token },
        (response: { data: FacebookPage[] }) => resolve(response.data)
      )
    })
  },

  async exchangeShortToken(shortToken: string) {
    const res = await fetch("/api/facebook/exchangeToken", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessToken: shortToken })
    })
    if (!res.ok) {
      throw new Error("Failed to exchange token")
    }
    return res.json()
  }
}