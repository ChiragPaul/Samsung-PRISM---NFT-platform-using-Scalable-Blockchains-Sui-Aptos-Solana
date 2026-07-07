import {
  createContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
  type ReactNode,
} from "react"

export type ToastVariant = "info" | "success" | "error"

export type ToastInput = {
  title: string
  description?: string
  variant?: ToastVariant
  durationMs?: number
}

type Toast = ToastInput & {
  id: string
}

type ToastContextValue = {
  showToast: (toast: ToastInput) => string
  dismissToast: (id: string) => void
}

// eslint-disable-next-line react-refresh/only-export-components
export const ToastContext = createContext<ToastContextValue | null>(null)

function createToastId() {
  return crypto.randomUUID()
}

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: Toast
  onDismiss: (id: string) => void
}) {
  const palette =
    toast.variant === "error"
      ? "border-rose-400/25 bg-rose-500/10 text-rose-50"
      : toast.variant === "success"
        ? "border-emerald-400/25 bg-emerald-500/10 text-emerald-50"
        : "border-cyan-400/25 bg-cyan-500/10 text-cyan-50"

  return (
    <div
      className={`pointer-events-auto w-[340px] rounded-[22px] border p-4 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl ${palette}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-sm font-semibold">{toast.title}</p>
          {toast.description ? (
            <p className="text-sm leading-6 text-white/85">{toast.description}</p>
          ) : null}
        </div>

        <button
          onClick={() => onDismiss(toast.id)}
          className="rounded-full px-2 py-1 text-lg leading-none text-white/70 transition hover:bg-white/10 hover:text-white"
          aria-label="Dismiss toast"
        >
          ×
        </button>
      </div>
    </div>
  )
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const timersRef = useRef(new Map<string, number>())

  const dismissToast = useCallback((id: string) => {
    const timer = timersRef.current.get(id)
    if (timer !== undefined) {
      window.clearTimeout(timer)
      timersRef.current.delete(id)
    }

    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const showToast = useCallback((toast: ToastInput) => {
    const id = createToastId()
    const nextToast: Toast = {
      id,
      title: toast.title,
      description: toast.description,
      variant: toast.variant ?? "info",
      durationMs: toast.durationMs ?? 6000,
    }

    setToasts((current) => [nextToast, ...current].slice(0, 4))

    const timer = window.setTimeout(() => {
      dismissToast(id)
    }, nextToast.durationMs)

    timersRef.current.set(id, timer)

    return id
  }, [dismissToast])

  useEffect(() => {
    const timers = timersRef.current
    return () => {
      for (const timer of timers.values()) {
        window.clearTimeout(timer)
      }
      timers.clear()
    }
  }, [])

  const value = useMemo<ToastContextValue>(
    () => ({
      showToast,
      dismissToast,
    }),
    [showToast, dismissToast]
  )

  return (
    <ToastContext.Provider value={value}>
      {children}

      <div className="pointer-events-none fixed bottom-6 right-6 z-[100] flex w-[min(100vw-2rem,360px)] flex-col gap-3">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={dismissToast} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}
