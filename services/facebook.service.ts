import { FacebookPage, FacebookUser,FacebookAuthResponse } from "@/types/facebook"

export const facebookService = {
  init(appId: string) {
    window.FB.init({
      appId,
      cookie: true,
      xfbml: true,
      version: "v25.0",
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
}