"use client";

import { forwardRef, HTMLAttributes, ButtonHTMLAttributes, InputHTMLAttributes, TextareaHTMLAttributes } from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: (string | undefined | null | boolean | Record<string, boolean>)[]) {
  return twMerge(clsx(inputs));
}

// ─── Button ─────────────────────────────────────────────────────────
type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "outline";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", loading, className, children, disabled, ...props }, ref) => {
    const base = "inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";

    const variants: Record<ButtonVariant, string> = {
      primary: "bg-brand-500 text-white hover:bg-brand-600 focus:ring-brand-500 shadow-brand hover:shadow-none",
      secondary: "bg-brand-50 text-brand-700 hover:bg-brand-100 focus:ring-brand-400",
      ghost: "text-gray-600 hover:bg-gray-100 hover:text-gray-900 focus:ring-gray-300",
      danger: "bg-red-500 text-white hover:bg-red-600 focus:ring-red-400",
      outline: "border border-gray-200 text-gray-700 hover:bg-gray-50 focus:ring-gray-300",
    };

    const sizes: Record<ButtonSize, string> = {
      sm: "px-3 py-1.5 text-sm",
      md: "px-4 py-2 text-sm",
      lg: "px-6 py-3 text-base",
    };

    return (
      <button
        ref={ref}
        className={cn(base, variants[variant], sizes[size], className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";

// ─── Input ───────────────────────────────────────────────────────────
interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helper?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helper, className, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");
    return (
      <div className="space-y-1">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-gray-700">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            "block w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400",
            "focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100",
            "disabled:bg-gray-50 disabled:text-gray-400",
            error && "border-red-300 focus:border-red-400 focus:ring-red-100",
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-red-500">{error}</p>}
        {helper && !error && <p className="text-xs text-gray-500">{helper}</p>}
      </div>
    );
  }
);
Input.displayName = "Input";

// ─── Textarea ────────────────────────────────────────────────────────
interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");
    return (
      <div className="space-y-1">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-gray-700">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          className={cn(
            "block w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 resize-y min-h-[100px]",
            "focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100",
            error && "border-red-300",
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    );
  }
);
Textarea.displayName = "Textarea";

// ─── Card ────────────────────────────────────────────────────────────
interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: "none" | "sm" | "md" | "lg";
  hover?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ padding = "md", hover, className, children, ...props }, ref) => {
    const paddings = { none: "", sm: "p-4", md: "p-6", lg: "p-8" };
    return (
      <div
        ref={ref}
        className={cn(
          "bg-white rounded-xl border border-gray-100 shadow-card",
          hover && "cursor-pointer hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200",
          paddings[padding],
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
Card.displayName = "Card";

// ─── Badge ───────────────────────────────────────────────────────────
type BadgeVariant = "default" | "success" | "warning" | "danger" | "info" | "purple";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

export const Badge = ({ variant = "default", className, children, ...props }: BadgeProps) => {
  const variants: Record<BadgeVariant, string> = {
    default: "bg-gray-100 text-gray-700",
    success: "bg-emerald-50 text-emerald-700",
    warning: "bg-amber-50 text-amber-700",
    danger: "bg-red-50 text-red-700",
    info: "bg-blue-50 text-blue-700",
    purple: "bg-brand-50 text-brand-700",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
};

// ─── Spinner ─────────────────────────────────────────────────────────
export const Spinner = ({ className }: { className?: string }) => (
  <svg
    className={cn("animate-spin h-5 w-5 text-brand-500", className)}
    viewBox="0 0 24 24"
    fill="none"
  >
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
  </svg>
);

// ─── Skeleton ────────────────────────────────────────────────────────
export const Skeleton = ({ className }: { className?: string }) => (
  <div
    className={cn(
      "animate-pulse rounded-lg bg-gray-100",
      className
    )}
  />
);

// ─── Divider ────────────────────────────────────────────────────────
export const Divider = ({ className }: { className?: string }) => (
  <hr className={cn("border-gray-100", className)} />
);

// ─── Empty State ─────────────────────────────────────────────────────
interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export const EmptyState = ({ icon, title, description, action }: EmptyStateProps) => (
  <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
    {icon && <div className="mb-4 text-gray-300">{icon}</div>}
    <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
    {description && <p className="text-sm text-gray-500 max-w-xs mb-6">{description}</p>}
    {action}
  </div>
);

// ─── Avatar ──────────────────────────────────────────────────────────
interface AvatarProps {
  name: string;
  src?: string | null;
  size?: "sm" | "md" | "lg";
}

export const Avatar = ({ name, src, size = "md" }: AvatarProps) => {
  const sizes = { sm: "w-7 h-7 text-xs", md: "w-9 h-9 text-sm", lg: "w-12 h-12 text-base" };
  const initials = name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={cn("rounded-full object-cover", sizes[size])}
      />
    );
  }

  return (
    <div
      className={cn(
        "rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-semibold",
        sizes[size]
      )}
    >
      {initials}
    </div>
  );
};
