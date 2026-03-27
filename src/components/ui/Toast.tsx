"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { cn } from "@/components/ui";
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  InformationCircleIcon,
  XMarkIcon,
} from "@heroicons/react/24/solid";

type ToastType = "success" | "error" | "info" | "warning";

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue>({
  toast: () => {},
});

export function useToast() {
  return useContext(ToastContext);
}

const ICONS: Record<ToastType, React.ReactNode> = {
  success: <CheckCircleIcon className="w-5 h-5 text-emerald-500" />,
  error: <ExclamationCircleIcon className="w-5 h-5 text-red-500" />,
  info: <InformationCircleIcon className="w-5 h-5 text-brand-500" />,
  warning: <ExclamationCircleIcon className="w-5 h-5 text-amber-500" />,
};

const STYLES: Record<ToastType, string> = {
  success: "border-emerald-200 bg-emerald-50",
  error: "border-red-200 bg-red-50",
  info: "border-brand-200 bg-brand-50",
  warning: "border-amber-200 bg-amber-50",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, type: ToastType = "info") => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  function dismiss(id: string) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/* Toast container */}
      <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl border shadow-card-hover pointer-events-auto",
              "animate-slide-up max-w-sm",
              STYLES[t.type]
            )}
          >
            {ICONS[t.type]}
            <p className="text-sm font-medium text-gray-800 flex-1">{t.message}</p>
            <button
              onClick={() => dismiss(t.id)}
              className="text-gray-400 hover:text-gray-600 flex-shrink-0"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
