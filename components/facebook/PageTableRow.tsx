"use client"

import { Button } from "@/components/ui/button"
import { Copy } from "lucide-react"
import { copyToClipboard } from "@/lib/copy"

type PageRow = { id: string; name: string; category?: string }

type Props = {
  index: number
  page: PageRow
  checked: boolean
  onRowClick: () => void
  onCheckboxChange: (checked: boolean) => void
  copyTitle?: string
  ariaLabel?: string
  rowClassName?: string
  copyIconSize?: "default" | "sm"
}

export default function PageTableRow({
  index,
  page,
  checked,
  onRowClick,
  onCheckboxChange,
  copyTitle = "Copy page id",
  ariaLabel,
  rowClassName = "border-t hover:bg-slate-50/60",
  copyIconSize = "default",
}: Props) {
  return (
    <tr className={`cursor-pointer ${rowClassName}`} onClick={onRowClick}>
      <td className="p-3">{index + 1}</td>
      <td className="p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono">{page.id}</span>
          <Button
            size="icon"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation()
              copyToClipboard(page.id)
            }}
            className={
              copyIconSize === "sm"
                ? "h-7 w-7 cursor-pointer border-slate-300 bg-white hover:bg-slate-50"
                : "cursor-pointer border-slate-300 bg-white hover:bg-slate-50"
            }
            title={copyTitle}
          >
            <Copy className={copyIconSize === "sm" ? "h-3.5 w-3.5" : "h-4 w-4"} />
          </Button>
        </div>
      </td>
      <td className="p-3">{page.name}</td>
      <td className="p-3">{page.category || "-"}</td>
      <td className="p-3 pr-5 text-right" onClick={(e) => e.stopPropagation()}>
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onCheckboxChange(e.target.checked)}
          className="h-4 w-4 cursor-pointer accent-slate-600"
          aria-label={ariaLabel ?? `Select page ${page.name}`}
        />
      </td>
    </tr>
  )
}
