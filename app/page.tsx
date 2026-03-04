import FacebookLogin from "@/components/facebook/FacebookLogin"

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white text-slate-900">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <FacebookLogin />
      </div>
    </main>
  )
}