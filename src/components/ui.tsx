/** Petits composants d'interface réutilisables. */
import type { ReactNode } from "react";
import { Icon, type IconName } from "./Icons";

export function PageHeader({ icon, title, subtitle, actions }: { icon: IconName; title: string; subtitle: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div className="flex items-start gap-4">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-accent/15 text-accent ring-1 ring-accent/30">
          <Icon name={icon} className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{title}</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted sm:text-base">{subtitle}</p>
        </div>
      </div>
      {actions}
    </div>
  );
}

export function ProgressBar({ value, className = "" }: { value: number; className?: string }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div
      className={`h-2 w-full overflow-hidden rounded-full bg-line/70 ${className}`}
      role="progressbar"
      aria-valuenow={v}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className="h-full rounded-full bg-gradient-to-r from-accent to-ok transition-all duration-700" style={{ width: `${v}%` }} />
    </div>
  );
}

export function Difficulty({ level }: { level: 1 | 2 | 3 }) {
  const label = ["Facile", "Moyen", "Difficile"][level - 1];
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-muted" title={`Difficulté : ${label}`}>
      <span className="flex gap-0.5">
        {[1, 2, 3].map((i) => (
          <span key={i} className={`h-1.5 w-3 rounded-full ${i <= level ? "bg-accent" : "bg-line"}`} />
        ))}
      </span>
      {label}
    </span>
  );
}

export function Tag({ children, tone = "muted" }: { children: ReactNode; tone?: "muted" | "ok" | "danger" | "accent" | "warn" }) {
  const tones = {
    muted: "bg-line/60 text-muted",
    ok: "bg-ok/15 text-ok",
    danger: "bg-danger/15 text-danger",
    accent: "bg-accent/15 text-accent",
    warn: "bg-warn/15 text-warn",
  };
  return <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-bold ${tones[tone]}`}>{children}</span>;
}
