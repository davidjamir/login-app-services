"use client"

import { Loader2 } from "lucide-react"

type Props = {
  page: { id: string; name: string }
  isSelected: boolean
  isLoading: boolean
  disabled: boolean
  onSelect: () => void
}

export default function EditPageListItem({
  page,
  isSelected,
  isLoading,
  disabled,
  onSelect,
}: Props) {
  return (
    <li>
      <button
        type="button"
        onClick={() => !disabled && onSelect()}
        disabled={disabled}
        className={`flex w-full cursor-pointer items-center justify-between gap-2 px-3 py-2 text-left text-xs transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 ${
          isSelected ? "bg-blue-50 font-medium text-blue-800" : "text-slate-700"
        }`}
      >
        <span className="flex items-center gap-2">
          <span className="truncate">{page.name}</span>
          {isLoading && (
            <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-blue-600" />
          )}
        </span>
        <span className="shrink-0 font-mono text-slate-500">{page.id}</span>
      </button>
    </li>
  )
}
