"use client"

import { FacebookPage } from "@/types/facebook"

interface Props {
  pages: FacebookPage[]
}

export function PagesTable({ pages }: Props) {
  if (!pages.length)
    return <div className="text-muted-foreground">No pages found</div>

  return (
    <table className="w-full text-sm border">
      <thead className="bg-muted">
        <tr>
          <th className="p-2">#</th>
          <th>ID</th>
          <th>Name</th>
          <th>Token</th>
        </tr>
      </thead>
      <tbody>
        {pages.map((page, index) => (
          <tr key={page.id} className="border-t">
            <td className="p-2">{index + 1}</td>
            <td>{page.id}</td>
            <td>{page.name}</td>
            <td className="truncate max-w-[200px]">
              {page.access_token.slice(0, 6)}...
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}