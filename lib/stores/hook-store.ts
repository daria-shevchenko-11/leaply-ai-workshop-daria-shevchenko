// Zustand store for the entire Hook Factory flow state.
// Holds: brief, analysis result, generated variants, video jobs, approved set,
// demo mode flag, and step-machine state.

import { create } from "zustand"
import type {
  Brief,
  AnalysisResult,
  Variant,
  VariantTags,
  FitMapped,
  ProposedNewCM,
  VariationAxis,
} from "@/lib/schemas/hook-schemas"

export type Step = "brief" | "analyze" | "sort" | "variants"

type GenerationMode = "apply_existing_cm" | "propose_new_cm"

type VideoJobState = {
  variant_id: string
  status: "pending" | "processing" | "completed" | "failed"
  video_url: string | null
  error: string | null
}

type HookState = {
  // Mode
  demo_mode: boolean
  setDemoMode: (v: boolean) => void

  // Navigation
  step: Step
  goToStep: (s: Step) => void

  // Step 1 — Brief
  brief: Brief | null
  setBrief: (b: Brief) => void

  // Step 2 — Analysis
  analysis: AnalysisResult | null
  setAnalysis: (a: AnalysisResult) => void
  // Editable overrides for inline correction
  setMapped: (m: FitMapped) => void
  setProposedNewCM: (p: ProposedNewCM) => void
  setFitStatus: (s: "existing" | "new") => void
  setLinkedTaskIds: (ids: number[]) => void

  generation_mode: GenerationMode
  setGenerationMode: (m: GenerationMode) => void

  // Step 3 — Sort (which axes to vary on)
  variation_axes: VariationAxis[]
  toggleAxis: (a: VariationAxis) => void
  setVariationAxes: (a: VariationAxis[]) => void

  // Step 3 — Variants
  variants: Variant[]
  setVariants: (vs: Variant[]) => void
  updateVariantText: (id: string, text: string) => void
  updateVariantCover: (id: string, url: string) => void
  updateVariantTags: (id: string, tags: VariantTags) => void

  approved_ids: Set<string>
  toggleApproved: (id: string) => void
  isApproved: (id: string) => boolean

  // Video jobs
  video_jobs: Record<string, VideoJobState>
  setVideoJob: (variant_id: string, state: VideoJobState) => void
  updateVideoJobStatus: (
    variant_id: string,
    status: VideoJobState["status"],
    video_url?: string | null,
    error?: string | null
  ) => void

  // Progress tracking
  loading_message: string | null
  setLoadingMessage: (m: string | null) => void

  // Reset
  reset: () => void
}

const initialState = {
  demo_mode: false,
  step: "brief" as Step,
  brief: null,
  analysis: null,
  generation_mode: "apply_existing_cm" as GenerationMode,
  variation_axes: ["text", "audience", "tone"] as VariationAxis[],
  variants: [],
  approved_ids: new Set<string>(),
  video_jobs: {} as Record<string, VideoJobState>,
  loading_message: null,
}

export const useHookStore = create<HookState>()((set, get) => ({
  ...initialState,

  setDemoMode: (v) => set({ demo_mode: v }),
  goToStep: (s) => set({ step: s }),

  setBrief: (b) => set({ brief: b }),

  setAnalysis: (a) => set({ analysis: a }),
  setMapped: (m) => {
    const a = get().analysis
    if (!a) return
    set({ analysis: { ...a, fit_check: { ...a.fit_check, mapped: m } } })
  },
  setProposedNewCM: (p) => {
    const a = get().analysis
    if (!a) return
    set({
      analysis: { ...a, fit_check: { ...a.fit_check, proposed_new_cm: p } },
    })
  },
  setFitStatus: (s) => {
    const a = get().analysis
    if (!a) return
    set({ analysis: { ...a, fit_check: { ...a.fit_check, status: s } } })
  },
  setLinkedTaskIds: (ids) => {
    const a = get().analysis
    if (!a) return
    const tasks = a.linked_tasks.filter((t) => ids.includes(t.id))
    set({ analysis: { ...a, linked_tasks: tasks } })
  },

  setGenerationMode: (m) => set({ generation_mode: m }),

  toggleAxis: (a) =>
    set((state) => {
      const has = state.variation_axes.includes(a)
      return {
        variation_axes: has
          ? state.variation_axes.filter((x) => x !== a)
          : [...state.variation_axes, a],
      }
    }),
  setVariationAxes: (a) => set({ variation_axes: a }),

  setVariants: (vs) => set({ variants: vs }),
  updateVariantText: (id, text) =>
    set((state) => ({
      variants: state.variants.map((v) =>
        v.id === id ? { ...v, hook_text: text } : v
      ),
    })),
  updateVariantCover: (id, url) =>
    set((state) => ({
      variants: state.variants.map((v) =>
        v.id === id ? { ...v, cover_image_url: url } : v
      ),
    })),
  updateVariantTags: (id, tags) =>
    set((state) => ({
      variants: state.variants.map((v) => (v.id === id ? { ...v, tags } : v)),
    })),

  toggleApproved: (id) =>
    set((state) => {
      const next = new Set(state.approved_ids)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return { approved_ids: next }
    }),
  isApproved: (id) => get().approved_ids.has(id),

  setVideoJob: (variant_id, state_) =>
    set((state) => ({
      video_jobs: { ...state.video_jobs, [variant_id]: state_ },
    })),
  updateVideoJobStatus: (variant_id, status, video_url, error) =>
    set((state) => {
      const prev = state.video_jobs[variant_id]
      if (!prev) return state
      return {
        video_jobs: {
          ...state.video_jobs,
          [variant_id]: {
            ...prev,
            status,
            video_url: video_url ?? prev.video_url,
            error: error ?? prev.error,
          },
        },
      }
    }),

  setLoadingMessage: (m) => set({ loading_message: m }),

  reset: () =>
    set({
      ...initialState,
      approved_ids: new Set<string>(),
      video_jobs: {},
    }),
}))
