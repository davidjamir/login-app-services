import Image from "next/image"

export default function LoadingPage() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-10 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(148,163,184,0.15),transparent)] bg-gradient-to-b from-slate-100/90 via-white to-slate-50">
      <div className="relative flex h-28 w-28 items-center justify-center">
        <div className="absolute z-0 flex items-center justify-center">
          <Image src="/icon.png" alt="Social Parallels" width={64} height={64} priority />
        </div>
        <svg
          className="absolute z-10 h-28 w-28 animate-spin"
          style={{ animationDuration: "1s" }}
          viewBox="0 0 112 112"
          aria-hidden
        >
          <circle
            cx="56"
            cy="56"
            r="50"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="text-slate-200"
          />
          <circle
            cx="56"
            cy="56"
            r="50"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray="80 235"
            className="text-slate-500"
          />
        </svg>
      </div>
      <div className="flex flex-col items-center gap-2">
        <p className="text-sm font-medium text-slate-600">Loading</p>
        <div className="flex gap-1.5">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-slate-400 [animation-delay:0ms]" />
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-slate-400 [animation-delay:150ms]" />
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-slate-400 [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  )
}
