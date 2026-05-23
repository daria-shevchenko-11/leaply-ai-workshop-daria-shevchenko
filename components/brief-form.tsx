"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useHookStore } from "@/lib/stores/hook-store"
import { BriefSchema, type Brief } from "@/lib/schemas/hook-schemas"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Slider } from "@/components/ui/slider"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

const MAX_VIDEO_BYTES = 4 * 1024 * 1024 // 4 MB Vercel function body limit

export function BriefForm() {
  const router = useRouter()
  const setBrief = useHookStore((s) => s.setBrief)
  const goToStep = useHookStore((s) => s.goToStep)

  const [referenceType, setReferenceType] = useState<"text" | "video">("text")
  const [referenceText, setReferenceText] = useState("")
  const [referenceVideoDataUrl, setReferenceVideoDataUrl] = useState<
    string | undefined
  >(undefined)
  const [videoFileName, setVideoFileName] = useState<string | null>(null)
  const [videoWarning, setVideoWarning] = useState<string | null>(null)
  const [audience, setAudience] = useState("")
  const [painContext, setPainContext] = useState("")
  const [variantCount, setVariantCount] = useState(3)
  const [error, setError] = useState<string | null>(null)

  function onVideoSelect(file: File | null) {
    setError(null)
    setVideoWarning(null)
    setReferenceVideoDataUrl(undefined)
    setVideoFileName(null)
    if (!file) return

    if (file.size > MAX_VIDEO_BYTES) {
      setVideoWarning(
        `Файл ${(file.size / 1024 / 1024).toFixed(1)} MB — більше за 4 MB ліміту Vercel. Обріж до коротшого фрагменту або використай текстовий референс.`
      )
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      setReferenceVideoDataUrl(dataUrl)
      setVideoFileName(file.name)
    }
    reader.onerror = () => {
      setVideoWarning("Помилка читання файлу. Спробуй інший.")
    }
    reader.readAsDataURL(file)
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const candidate: Brief = {
      reference_type: referenceType,
      reference_text: referenceType === "text" ? referenceText : undefined,
      reference_video_data_url:
        referenceType === "video" ? referenceVideoDataUrl : undefined,
      audience,
      pain_context: painContext,
      variant_count: variantCount,
    }

    const parsed = BriefSchema.safeParse(candidate)
    if (!parsed.success) {
      const first = parsed.error.issues[0]
      setError(first?.message ?? "Перевір форму")
      return
    }
    if (referenceType === "text" && !referenceText.trim()) {
      setError("Опиши референс-хук текстом")
      return
    }
    if (referenceType === "video" && !referenceVideoDataUrl) {
      setError("Завантаж відео-референс (< 4 MB)")
      return
    }

    setBrief(parsed.data)
    goToStep("analyze")
    router.push("/analyze")
  }

  const estimatedCost = (variantCount * 1.05).toFixed(2)

  return (
    <Card>
      <CardContent className="space-y-6 pt-6">
        <form onSubmit={onSubmit} className="space-y-6">
          {/* Reference toggle */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Референс-хук</label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={referenceType === "text" ? "default" : "outline"}
                onClick={() => setReferenceType("text")}
                size="sm"
              >
                Текст
              </Button>
              <Button
                type="button"
                variant={referenceType === "video" ? "default" : "outline"}
                onClick={() => setReferenceType("video")}
                size="sm"
              >
                Відео (&lt; 4 MB)
              </Button>
            </div>
          </div>

          {referenceType === "text" ? (
            <div className="space-y-2">
              <label htmlFor="ref-text" className="text-sm font-medium">
                Опис референс-хука
              </label>
              <Textarea
                id="ref-text"
                placeholder='Напр.: "Жінка-лікар у білому халаті дивиться в камеру і каже: «Ваші лімфовузли заблоковані»…"'
                value={referenceText}
                onChange={(e) => setReferenceText(e.target.value)}
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                Опиши, що відбувається на екрані, що говорить актор, який тон.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <label htmlFor="ref-video" className="text-sm font-medium">
                Відео-референс
              </label>
              <Input
                id="ref-video"
                type="file"
                accept="video/mp4,video/webm,video/quicktime"
                onChange={(e) => onVideoSelect(e.target.files?.[0] ?? null)}
              />
              {videoFileName && (
                <p className="text-xs text-muted-foreground">
                  ✓ {videoFileName}
                </p>
              )}
              {videoWarning && (
                <p className="text-xs text-destructive">{videoWarning}</p>
              )}
              {referenceVideoDataUrl && (
                <video
                  src={referenceVideoDataUrl}
                  controls
                  className="mt-2 max-h-64 w-full rounded-md border"
                />
              )}
            </div>
          )}

          {/* Audience */}
          <div className="space-y-2">
            <label htmlFor="audience" className="text-sm font-medium">
              Цільова аудиторія
            </label>
            <Input
              id="audience"
              placeholder="Напр.: жінки 35-50, які працюють сидячи"
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
            />
          </div>

          {/* Pain context */}
          <div className="space-y-2">
            <label htmlFor="pains" className="text-sm font-medium">
              Болі / контекст
            </label>
            <Textarea
              id="pains"
              placeholder="Напр.: біль у шиї, набряк обличчя зранку, відчуття «грудки» біля плечей"
              value={painContext}
              onChange={(e) => setPainContext(e.target.value)}
              rows={3}
            />
          </div>

          {/* Variant count slider */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label htmlFor="count" className="text-sm font-medium">
                Скільки варіантів?
              </label>
              <Badge variant="secondary">{variantCount}</Badge>
            </div>
            <Slider
              id="count"
              min={1}
              max={5}
              step={1}
              value={[variantCount]}
              onValueChange={(v) => setVariantCount(v[0])}
            />
            <p className="text-xs text-muted-foreground">
              Орієнтовна вартість: ~${estimatedCost} (Gemini + Kling).
            </p>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" className="w-full" size="lg">
            Аналізувати →
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
