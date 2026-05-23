"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"

type Props = {
  text: string
  label?: string
  className?: string
}

export function CopyButton({ text, label = "Copy", className }: Props) {
  const [copied, setCopied] = useState(false)

  async function onClick() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Fallback for older browsers
      const ta = document.createElement("textarea")
      ta.value = text
      document.body.appendChild(ta)
      ta.select()
      document.execCommand("copy")
      document.body.removeChild(ta)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={onClick}
      className={className}
    >
      {copied ? "✓ Copied!" : `📋 ${label}`}
    </Button>
  )
}
