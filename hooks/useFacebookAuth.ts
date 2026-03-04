"use client"

import { useState } from "react"
import { facebookService } from "@/services/facebook.service"
import { FacebookPage } from "@/types/facebook"

export function useFacebookAuth() {
  const [userName, setUserName] = useState<string | null>(null)
  const [userToken, setUserToken] = useState<string | null>(null)
  const [pages, setPages] = useState<FacebookPage[]>([])

  const login = async () => {
    const response = await facebookService.login(
      "public_profile,email,pages_show_list,pages_read_engagement,pages_manage_posts"
    )

    if (response.status !== "connected" || !response.authResponse)
      return

    const token = response.authResponse.accessToken

    const user = await facebookService.getMe(token)
    const pagesData = await facebookService.getPages(token)

    setUserName(user.name)
    setUserToken(token)
    setPages(pagesData)
  }

  return {
    userName,
    userToken,
    pages,
    login,
  }
}