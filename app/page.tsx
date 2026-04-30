'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

function isValidInput(value: string): boolean {
  const trimmed = value.trim()
  if (/^0x[0-9a-fA-F]{40}$/.test(trimmed)) return true
  if (trimmed.length > 2 && trimmed.includes('.') && !/\s/.test(trimmed)) return true
  return false
}

export default function Home() {
  const router = useRouter()
  const [a, setA] = useState('')
  const [b, setB] = useState('')
  const canCompare = isValidInput(a) && isValidInput(b)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canCompare) return
    router.push(`/compare?a=${encodeURIComponent(a.trim())}&b=${encodeURIComponent(b.trim())}`)
  }

  return (
    <main
      className="min-h-screen"
      style={{ background: "#fafaf9", color: "#1c1917" }}
    >
      <div className="mx-auto flex min-h-screen w-full max-w-3xl items-center px-6 py-16 sm:px-10 sm:py-24">
        <section className="w-full" style={{ color: "inherit" }}>
          <div className="mb-12 sm:mb-16">
            <p className="mb-4 text-xs uppercase tracking-[0.24em] text-stone-500">Read-only cultural overlap</p>
            <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-stone-950 sm:text-5xl">Collector Chemistry</h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-stone-600 sm:text-lg">Compare 2 collectors and see where their taste overlaps.</p>
          </div>
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label htmlFor="collector-a" className="block text-sm font-medium text-stone-700">Collector 1</label>
              <input id="collector-a" type="text" placeholder="Wallet address or ENS" value={a} onChange={(e) => setA(e.target.value)} className="block w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-stone-500" />
            </div>
            <div className="space-y-2">
              <label htmlFor="collector-b" className="block text-sm font-medium text-stone-700">Collector 2</label>
              <input id="collector-b" type="text" placeholder="Wallet address or ENS" value={b} onChange={(e) => setB(e.target.value)} className="block w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-stone-500" />
            </div>
            <div className="pt-3">
              <button type="submit" disabled={!canCompare} className="inline-flex items-center justify-center rounded-full bg-stone-900 px-5 py-3 text-sm font-medium text-stone-50 transition hover:bg-stone-800 disabled:opacity-40">Compare</button>
            </div>
          </form>
        </section>
      </div>
    </main>
  )
}