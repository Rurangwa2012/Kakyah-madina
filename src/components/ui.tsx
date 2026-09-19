import { cn } from "@/utils/format";

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="font-display text-3xl text-[var(--ink)]">{title}</h2>
        {subtitle ? <p className="text-[var(--muted)]">{subtitle}</p> : null}
      </div>
      {actions}
    </div>
  );
}

export function Card({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-4 shadow-sm", className)}>
      {children}
    </div>
  );
}

export function Button({
  children,
  onClick,
  type = "button",
  variant = "primary",
  disabled,
  className,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  variant?: "primary" | "secondary" | "ghost" | "danger" | "pay";
  disabled?: boolean;
  className?: string;
}) {
  const styles = {
    primary: "bg-[var(--spice)] text-white",
    secondary: "bg-[var(--leaf)] text-white",
    ghost: "bg-[var(--paper)] text-[var(--ink)]",
    danger: "bg-red-700 text-white",
    pay: "bg-[var(--gold)] text-[var(--ink)]",
  }[variant];
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "min-h-12 rounded-2xl px-5 text-base font-bold disabled:opacity-50",
        styles,
        className,
      )}
    >
      {children}
    </button>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <Card className="text-center">
      <p className="font-semibold">{title}</p>
      <p className="text-sm text-[var(--muted)]">{body}</p>
    </Card>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <Card className="border-red-200 bg-red-50 text-red-800">
      <p className="font-semibold">Something went wrong</p>
      <p className="text-sm">{message}</p>
    </Card>
  );
}
