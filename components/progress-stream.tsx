"use client"

import { Progress } from "@/components/ui/progress"

type Props = {
  messages: {
    label: string
    status: "pending" | "active" | "done" | "failed"
  }[]
  overall: number // 0-100
}

export function ProgressStream({ messages, overall }: Props) {
  return (
    <div className="space-y-4 rounded-md border bg-muted/30 p-4">
      <Progress value={overall} />
      <ul className="space-y-1.5 text-sm">
        {messages.map((m, i) => (
          <li key={i} className="flex items-center gap-2">
            <span aria-hidden>
              {m.status === "done"
                ? "✅"
                : m.status === "active"
                  ? "⏳"
                  : m.status === "failed"
                    ? "❌"
                    : "○"}
            </span>
            <span
              className={
                m.status === "done"
                  ? "text-muted-foreground"
                  : m.status === "active"
                    ? "font-medium"
                    : m.status === "failed"
                      ? "text-destructive"
                      : "text-muted-foreground/60"
              }
            >
              {m.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
