"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, CheckCircle2, PartyPopper } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastVariant = "success" | "error" | "celebration";

interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  toast: (message: string, variant?: ToastVariant) => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

// Occasional, one-off confirmations (rename saved, tags applied, upload
// failed) — never anything a user sees dozens of times a session, so a
// standard 250ms enter / exit is well inside budget.
const TOAST_DURATION_MS = 3200;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);

  const toast = React.useCallback((message: string, variant: ToastVariant = "success") => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, message, variant }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, TOAST_DURATION_MS);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[300] flex flex-col items-center gap-2 sm:inset-x-auto sm:right-4 sm:items-end">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 16, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.95 }}
              transition={{ duration: 0.25, ease: [0.25, 1, 0.5, 1] }}
              className={cn(
                "pointer-events-auto flex max-w-sm items-center gap-2.5 rounded-[var(--radius-md)] border px-3.5 py-2.5 text-sm shadow-[var(--shadow-lg)]",
                t.variant === "error"
                  ? "border-destructive/30 bg-surface text-destructive"
                  : t.variant === "celebration"
                    ? "border-accent/40 bg-surface text-foreground"
                    : "border-border bg-surface-2 text-foreground"
              )}
            >
              {t.variant === "error" ? (
                <AlertCircle className="size-4 shrink-0" />
              ) : t.variant === "celebration" ? (
                <PartyPopper className="size-4 shrink-0 text-accent" />
              ) : (
                <CheckCircle2 className="size-4 shrink-0 text-accent" />
              )}
              <span>{t.message}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx.toast;
}
