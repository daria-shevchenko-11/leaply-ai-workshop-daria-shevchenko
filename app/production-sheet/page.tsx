"use client"

import { useState } from "react"
import Link from "next/link"
import { useHookStore } from "@/lib/stores/hook-store"
import {
  ProductionSheetSchema,
  type ProductionSheet,
} from "@/lib/schemas/hook-schemas"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import { CopyButton } from "@/components/copy-button"
import { DemoModeToggle } from "@/components/demo-mode-toggle"
import mockProductionSheetJson from "@/lib/data/mock-production-sheet.json"

export default function ProductionSheetPage() {
  const geminiKey = useHookStore((s) => s.gemini_api_key)
  const setGeminiKey = useHookStore((s) => s.setGeminiApiKey)
  const demoMode = useHookStore((s) => s.demo_mode)

  const [scenario, setScenario] = useState("")
  const [charactersBrief, setCharactersBrief] = useState("")
  const [visualStyle, setVisualStyle] = useState("")
  const [duration, setDuration] = useState(30)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sheet, setSheet] = useState<ProductionSheet | null>(null)

  async function onGenerate() {
    setError(null)

    // Demo Mode — skip API, load static mock for click-through
    if (demoMode) {
      setLoading(true)
      setSheet(null)
      // Simulate ~1.2 sec of processing for realistic feel
      await new Promise((r) => setTimeout(r, 1200))
      try {
        const parsed = ProductionSheetSchema.parse(
          mockProductionSheetJson as unknown
        )
        setSheet(parsed)
      } catch (e) {
        setError(e instanceof Error ? e.message : "Demo mock parse failed")
      } finally {
        setLoading(false)
      }
      return
    }

    if (!scenario.trim()) {
      setError("Опиши сценарій (хоч би 2-3 речення)")
      return
    }
    setLoading(true)
    setSheet(null)
    try {
      const headers: Record<string, string> = {
        "content-type": "application/json",
      }
      if (geminiKey) headers["x-google-ai-key"] = geminiKey
      const res = await fetch("/api/production-sheet", {
        method: "POST",
        headers,
        body: JSON.stringify({
          scenario,
          characters_brief: charactersBrief,
          visual_style: visualStyle,
          target_duration_sec: duration,
        }),
      })
      if (!res.ok) {
        const txt = await res.text()
        throw new Error(`HTTP ${res.status}: ${txt.slice(0, 200)}`)
      }
      const json = (await res.json()) as unknown
      const parsed = ProductionSheetSchema.parse(json)
      setSheet(parsed)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-svh bg-background">
      <div className="mx-auto max-w-4xl px-4 py-8">
        {/* Top nav */}
        <nav className="mb-6 flex flex-wrap items-center gap-2">
          <Link
            href="/"
            className="rounded-md border border-muted bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent"
          >
            🎣 Hook Factory
          </Link>
          <span className="text-muted-foreground">·</span>
          <span className="rounded-md border border-primary bg-primary/10 px-3 py-1.5 text-xs font-medium">
            🎬 Production Sheet
          </span>
          <span className="text-muted-foreground">·</span>
          <Link
            href="/kling-test"
            className="rounded-md border border-muted bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent"
          >
            🧪 Kling Test
          </Link>
        </nav>

        <header className="mb-6 space-y-1">
          <p className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
            Director tool · multi-shot breakdown
          </p>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            🎬 Production Sheet
          </h1>
          <p className="text-sm text-muted-foreground">
            Сценарій → Character Passports + per-shot Nano Banana + Kling Omni
            prompts. Для довших ads (8-180 sec). Дотримує всіх hard rules:
            descriptor-in-parens, 10s split, no-phone в UGC, ambience, voice
            direction.
          </p>
        </header>

        <div className="mb-6">
          <DemoModeToggle />
        </div>

        {!sheet && (
          <Card>
            <CardContent className="space-y-4 pt-6">
              {!demoMode && (
                <div className="space-y-1.5 rounded-md border border-yellow-500/40 bg-yellow-500/5 p-3">
                  <label
                    htmlFor="ps-gemini-key"
                    className="text-xs font-medium"
                  >
                    🔑 Gemini API Key
                  </label>
                  <Input
                    id="ps-gemini-key"
                    type="password"
                    placeholder="AIzaSy..."
                    value={geminiKey}
                    onChange={(e) => setGeminiKey(e.target.value)}
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <label htmlFor="scenario" className="text-sm font-medium">
                  Сценарій
                </label>
                <Textarea
                  id="scenario"
                  rows={6}
                  placeholder="Напр.: Жінка-лікар у клініці пояснює, чому морський масаж недостатній. Дочка-маркетолог переконує маму спробувати новий метод. Мама зрештою показує результат через 30 днів."
                  value={scenario}
                  onChange={(e) => setScenario(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Можеш кинути cinematic-scenario, beat-list або просто
                  story-line. AI розкладе на 3-8 шотів.
                </p>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="chars" className="text-sm font-medium">
                  Персонажі (опціонально — інакше AI інферне з сценарію)
                </label>
                <Textarea
                  id="chars"
                  rows={3}
                  placeholder="Напр.:&#10;Anna — лікар, 45, біле волосся, в білому халаті&#10;Мама — 70, доглянута, домашній одяг"
                  value={charactersBrief}
                  onChange={(e) => setCharactersBrief(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="style" className="text-sm font-medium">
                  Visual style (опціонально)
                </label>
                <Input
                  id="style"
                  placeholder="напр.: clinical Professional Authority + warm UGC reveal"
                  value={visualStyle}
                  onChange={(e) => setVisualStyle(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Тривалість</label>
                  <Badge variant="secondary">{duration} сек</Badge>
                </div>
                <Slider
                  min={8}
                  max={180}
                  step={1}
                  value={[duration]}
                  onValueChange={(v) => setDuration(v[0])}
                />
                <p className="text-[10px] text-muted-foreground">
                  8s = 1 shot · 30s = 3-5 shots · 60s = 5-8 shots · 180s = 10-15
                  shots.
                </p>
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              {demoMode && (
                <p className="rounded-md border border-yellow-500/40 bg-yellow-500/10 px-3 py-2 text-xs text-yellow-700 dark:text-yellow-300">
                  🎭 Demo Mode ON — можна тиснути «Згенерувати» без заповнення.
                  Покажу mock «Mom&apos;s Neck Hump Reveal» — 4 шоти, 2
                  Character Passports, повний sheet з усіма правилами.
                </p>
              )}

              <Button
                size="lg"
                className="w-full"
                onClick={onGenerate}
                disabled={loading || (!demoMode && !scenario.trim())}
              >
                {loading ? "⏳ Генерую production sheet..." : "Згенерувати →"}
              </Button>
            </CardContent>
          </Card>
        )}

        {sheet && <SheetView sheet={sheet} onReset={() => setSheet(null)} />}
      </div>
    </div>
  )
}

function SheetView({
  sheet,
  onReset,
}: {
  sheet: ProductionSheet
  onReset: () => void
}) {
  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatCard label="Total" value={`${sheet.totals.total_duration_sec}s`} />
        <StatCard label="Shots" value={String(sheet.totals.shot_count)} />
        <StatCard
          label="Characters"
          value={String(sheet.totals.character_count)}
        />
        <StatCard label="Scenes" value={String(sheet.totals.scene_count)} />
      </div>

      {/* Title + summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{sheet.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5 text-sm">
          <p>{sheet.scenario_summary}</p>
          <p className="text-xs text-muted-foreground">
            <span className="font-medium">Visual style:</span>{" "}
            {sheet.visual_style}
          </p>
        </CardContent>
      </Card>

      {/* TOC */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">📑 Table of Contents</CardTitle>
          <p className="text-[10px] text-muted-foreground">
            Pre-production order: Characters → Locations → Establishing Shots →
            Per-shot breakdown
          </p>
        </CardHeader>
        <CardContent>
          <ol className="space-y-1 text-xs">
            <li>
              <a href="#characters" className="hover:underline">
                1. Character References ({sheet.characters.length})
              </a>
            </li>
            {sheet.locations.length > 0 && (
              <li>
                <a href="#locations" className="hover:underline">
                  2. Location References ({sheet.locations.length})
                </a>
              </li>
            )}
            {sheet.establishing_shots.length > 0 && (
              <li>
                <a href="#establishing" className="hover:underline">
                  3. Establishing Shots ({sheet.establishing_shots.length})
                </a>
              </li>
            )}
            {sheet.shots.map((s) => (
              <li key={s.id} className="ml-3">
                <a href={`#${s.id}`} className="hover:underline">
                  {s.id} · {s.title} ({s.duration_sec}s)
                </a>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      {/* Character Passports */}
      <section id="characters" className="space-y-3">
        <h2 className="text-lg font-bold">👥 Character References</h2>
        <p className="text-xs text-muted-foreground">
          Згенеруй цих у Nano Banana ПЕРШИМ ділом, потім додавай як
          identity-refs до кожного shot-prompt. Запобігає face/outfit drift.
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {sheet.characters.map((c) => (
            <Card key={c.name}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{c.name}</CardTitle>
                <p className="text-xs text-muted-foreground">
                  Descriptor (used in parens): &quot;{c.descriptor}&quot;
                </p>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
                    🖼 Passport prompt
                  </span>
                  <CopyButton text={c.passport_prompt} label="Copy" />
                </div>
                <pre className="max-h-40 overflow-y-auto rounded bg-muted/40 p-2 font-mono text-[10px] whitespace-pre-wrap">
                  {c.passport_prompt}
                </pre>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Location Passports */}
      {sheet.locations.length > 0 && (
        <section id="locations" className="space-y-3">
          <h2 className="text-lg font-bold">📍 Location References</h2>
          <p className="text-xs text-muted-foreground">
            Empty wide shots of each setting (no characters). Designer generує
            ці ДРУГИМИ після Character Passports — attach як setting-ref до
            кожного shot prompt у цій локації. Запобігає location drift.
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {sheet.locations.map((loc) => (
              <Card key={loc.name}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{loc.name}</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    {loc.description}
                  </p>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
                      🖼 Location passport
                    </span>
                    <CopyButton text={loc.passport_prompt} label="Copy" />
                  </div>
                  <pre className="max-h-40 overflow-y-auto rounded bg-muted/40 p-2 font-mono text-[10px] whitespace-pre-wrap">
                    {loc.passport_prompt}
                  </pre>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Establishing Shots */}
      {sheet.establishing_shots.length > 0 && (
        <section id="establishing" className="space-y-3">
          <h2 className="text-lg font-bold">🎭 Establishing Shots</h2>
          <p className="text-xs text-muted-foreground">
            Master wide frame per scene — всі персонажі цієї сцени в їх локації.
            Designer attach-ить ОБИДВА Character Passports + Location Passport
            як identity refs. Anchor для всіх close-up shots у цій сцені.
          </p>
          <div className="grid grid-cols-1 gap-3">
            {sheet.establishing_shots.map((est) => (
              <Card key={est.id} id={est.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-base">
                      <Badge variant="outline" className="mr-2 font-mono">
                        {est.id}
                      </Badge>
                      {est.scene_title}
                    </CardTitle>
                    <Badge variant="secondary">{est.duration_sec}s</Badge>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    📍 Location:{" "}
                    <span className="font-medium">{est.location_name}</span>
                    {est.characters_in_shot.length > 0 && (
                      <>
                        {" · "}
                        Characters:{" "}
                        <span className="font-medium">
                          {est.characters_in_shot.join(", ")}
                        </span>
                      </>
                    )}
                  </p>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
                      🖼 Establishing master frame
                    </span>
                    <CopyButton text={est.image_prompt} label="Copy" />
                  </div>
                  <pre className="max-h-40 overflow-y-auto rounded bg-muted/40 p-2 font-mono text-[10px] whitespace-pre-wrap">
                    {est.image_prompt}
                  </pre>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Shots */}
      <section className="space-y-3">
        <h2 className="text-lg font-bold">🎬 Shots</h2>
        <div className="space-y-4">
          {sheet.shots.map((shot, i) => (
            <ShotCard key={shot.id} shot={shot} index={i + 1} />
          ))}
        </div>
      </section>

      {/* Footer notes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">📦 Production Notes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-xs">
          <FooterRow
            label="🎙 Voice casting"
            value={sheet.voice_casting_note}
          />
          <FooterRow label="🎵 Music cue" value={sheet.music_cue_note} />
          <FooterRow label="📺 Subtitles" value={sheet.subtitle_spec} />
          <p className="mt-2 text-[10px] text-muted-foreground">
            ⚠ Kling 10s limit per on-camera lip-sync shot. Shots з needs_split:
            true означають що репліка довша за 10s — другий шот зі
            split_video_prompt.
          </p>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button variant="outline" onClick={onReset}>
          ← Новий sheet
        </Button>
      </div>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-muted/30 p-3 text-center">
      <div className="text-[9px] font-bold tracking-widest text-muted-foreground uppercase">
        {label}
      </div>
      <div className="mt-1 text-xl font-bold">{value}</div>
    </div>
  )
}

function FooterRow({ label, value }: { label: string; value: string }) {
  if (!value) return null
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
        {label}
      </span>
      <span>{value}</span>
    </div>
  )
}

function ShotCard({
  shot,
  index,
}: {
  shot: ProductionSheet["shots"][number]
  index: number
}) {
  return (
    <Card id={shot.id}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">
            <Badge variant="outline" className="mr-2 font-mono">
              {shot.id}
            </Badge>
            {index}. {shot.title}
          </CardTitle>
          <div className="flex shrink-0 items-center gap-1.5">
            <Badge variant="secondary">{shot.duration_sec}s</Badge>
            {shot.on_camera ? (
              <Badge variant="default" className="text-[9px]">
                ON-CAMERA
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[9px]">
                VO-ONLY
              </Badge>
            )}
            {shot.needs_split && (
              <Badge
                variant="outline"
                className="border-yellow-500/40 text-[9px] text-yellow-700 dark:text-yellow-300"
              >
                ⚠ SPLIT
              </Badge>
            )}
          </div>
        </div>
        {shot.characters_in_shot.length > 0 && (
          <p className="text-[10px] text-muted-foreground">
            Characters: {shot.characters_in_shot.join(", ")}
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-3 text-xs">
        {shot.dialogue && (
          <div className="rounded-md border-l-4 border-primary/50 bg-muted/30 p-2">
            <div className="text-[9px] font-bold tracking-widest text-muted-foreground uppercase">
              💬 Dialogue
            </div>
            <div className="mt-1 italic">&quot;{shot.dialogue}&quot;</div>
          </div>
        )}

        <PromptBlock
          label="🖼 Nano Banana (image prompt)"
          text={shot.image_prompt}
        />
        <PromptBlock
          label="🎬 Kling Omni (video prompt)"
          text={shot.video_prompt}
        />
        {shot.needs_split && shot.split_video_prompt && (
          <PromptBlock
            label="⚠ Shot 2 of 2 (continuity split)"
            text={shot.split_video_prompt}
            warning
          />
        )}

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {shot.ambience_note && (
            <div className="rounded bg-muted/30 p-2">
              <div className="text-[9px] font-bold tracking-widest text-muted-foreground uppercase">
                🔊 Ambience
              </div>
              <div className="mt-0.5">{shot.ambience_note}</div>
            </div>
          )}
          {shot.voice_direction && (
            <div className="rounded bg-muted/30 p-2">
              <div className="text-[9px] font-bold tracking-widest text-muted-foreground uppercase">
                🎙 Voice direction
              </div>
              <div className="mt-0.5">{shot.voice_direction}</div>
            </div>
          )}
          {shot.editor_overlay_note && (
            <div className="rounded border border-purple-500/40 bg-purple-500/5 p-2 sm:col-span-2">
              <div className="text-[9px] font-bold tracking-widest text-purple-700 uppercase dark:text-purple-300">
                ✏ Editor-only overlay
              </div>
              <div className="mt-0.5">{shot.editor_overlay_note}</div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function PromptBlock({
  label,
  text,
  warning,
}: {
  label: string
  text: string
  warning?: boolean
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span
          className={`text-[10px] font-bold tracking-widest uppercase ${
            warning
              ? "text-yellow-700 dark:text-yellow-300"
              : "text-muted-foreground"
          }`}
        >
          {label}
        </span>
        <CopyButton text={text} label="Copy" />
      </div>
      <pre className="max-h-48 overflow-y-auto rounded bg-muted/40 p-2 font-mono text-[10px] whitespace-pre-wrap">
        {text}
      </pre>
    </div>
  )
}
