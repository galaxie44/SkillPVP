"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { CheckCircle2, AlertCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

export type ToastVariant = "success" | "error" | "info";

interface ToastOptions {
  message: string;
  variant?: ToastVariant;
  duration?: number;
}

interface ToastContextValue {
  toast: (options: ToastOptions | string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const ICONS = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
};

const STYLES = {
  success: "border-green-500/40 bg-green-500/10 text-green-700 dark:text-green-300",
  error: "border-destructive/40 bg-destructive/10 text-destructive",
  info: "border-primary/40 bg-primary/10 text-primary",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<(ToastOptions & { id: number }) | null>(
    null
  );
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((options: ToastOptions | string) => {
    const opts: ToastOptions =
      typeof options === "string" ? { message: options } : options;

    if (timerRef.current) clearTimeout(timerRef.current);

    setToast({
      id: Date.now(),
      message: opts.message,
      variant: opts.variant ?? "info",
      duration: opts.duration ?? 4000,
    });
  }, []);

  useEffect(() => {
    if (!toast) return;
    timerRef.current = setTimeout(() => setToast(null), toast.duration);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [toast]);

  const Icon = toast ? ICONS[toast.variant ?? "info"] : Info;

  return (
    <ToastContext.Provider value={{ toast: show }}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed bottom-4 left-4 right-4 z-[100] flex flex-col items-center gap-2 sm:bottom-6 sm:left-auto sm:right-6 sm:items-end"
      >
        {toast && (
          <div
            key={toast.id}
            className={cn(
              "pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border px-4 py-3 shadow-lg backdrop-blur-md animate-in slide-in-from-bottom-4 fade-in duration-300",
              STYLES[toast.variant ?? "info"]
            )}
          >
            <Icon className="mt-0.5 h-5 w-5 shrink-0" />
            <p className="text-sm font-medium leading-snug">{toast.message}</p>
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast doit être utilisé dans ToastProvider");
  return ctx;
}
