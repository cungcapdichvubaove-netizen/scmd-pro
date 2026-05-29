import React from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "../../../../lib/utils";
import { EmptyState } from "../../../superadmin/interfaces/components/EmptyState";

export const dashboardNavItemClass = (
  active: boolean,
  danger?: boolean,
  collapsed?: boolean,
) =>
  cn(
    "ops-interactive ops-focus-ring group relative flex min-h-[40px] w-full items-center gap-3 rounded-[10px] px-3 text-[13px] font-medium transition-colors duration-150",
    collapsed && "justify-center px-0",
    active
      ? "bg-blue-500/10 text-white ring-1 ring-blue-400/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
      : danger
        ? "text-red-300/82 hover:bg-red-500/10 hover:text-red-200"
        : "text-scmd-silver/68 hover:bg-white/[0.045] hover:text-white",
  );

export const dashboardNavActiveIndicatorClass =
  "absolute left-0 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-full bg-scmd-primary shadow-[0_0_12px_rgba(37,99,235,0.35)]";

export const dashboardHeadingClass =
  "text-2xl font-black tracking-[-0.035em] text-white not-italic leading-tight sm:text-3xl";

export const dashboardPanelClass =
  "rounded-[14px] border border-slate-200/10 bg-white/[0.035] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-xl";
export const dashboardToolbarClass =
  "rounded-[14px] border border-slate-200/10 bg-white/[0.035] p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]";
export const dashboardInputClass =
  "h-9 w-full rounded-[10px] border border-slate-200/10 bg-slate-950/35 px-3 text-[12px] font-semibold text-slate-200 outline-none transition-all placeholder:text-slate-500 focus:border-blue-400/45 focus:ring-2 focus:ring-blue-500/10";
export const dashboardSectionTitleClass =
  "text-base font-black tracking-[-0.015em] text-white not-italic";
export const dashboardMetricCardClass =
  "rounded-[14px] border border-slate-200/10 bg-white/[0.035] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-colors hover:border-blue-400/18 hover:bg-white/[0.05]";

export const dashboardSelectClass = cn(
  dashboardInputClass,
  "cursor-pointer appearance-none pr-10 text-scmd-silver/85 [&>option]:bg-scmd-navy [&>option]:text-white",
);

export const dashboardTextareaClass =
  "min-h-[120px] w-full rounded-2xl border border-white/8 bg-[#121a2e] px-4 py-3 text-sm font-semibold leading-6 text-white outline-none transition-all placeholder:text-scmd-silver/30 focus:border-scmd-primary/60 focus:ring-4 focus:ring-scmd-primary/10";

export const dashboardInfoPillClass =
  "inline-flex min-h-9 items-center gap-2 rounded-[10px] border border-white/8 bg-white/[0.03] px-3 text-[11px] font-semibold text-scmd-silver/72";

interface DashboardPageHeadingProps {
  children: React.ReactNode;
  className?: string;
}

export const DashboardPageHeading: React.FC<DashboardPageHeadingProps> = ({
  children,
  className,
}) => <h2 className={cn(dashboardHeadingClass, className)}>{children}</h2>;

interface DashboardPageHeaderProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  eyebrow?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export const DashboardPageHeader: React.FC<DashboardPageHeaderProps> = ({
  title,
  description,
  eyebrow,
  actions,
  className,
}) => {
  return (
    <section
      aria-label={typeof title === "string" ? title : "Page header"}
      className={cn(
        dashboardToolbarClass,
        "flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        {eyebrow ? (
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-scmd-primary/80">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="mt-1 text-xl font-black tracking-[-0.025em] text-white sm:text-2xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-1 max-w-3xl text-[12px] font-medium leading-5 text-scmd-silver/65">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </section>
  );
};

interface DashboardInfoPillProps {
  icon?: React.ReactNode;
  children: React.ReactNode;
  tone?: "default" | "primary" | "success" | "warning" | "danger";
  className?: string;
}

const dashboardInfoPillToneClass: Record<
  NonNullable<DashboardInfoPillProps["tone"]>,
  string
> = {
  default: "text-scmd-silver/72",
  primary: "border-scmd-primary/18 bg-scmd-primary/10 text-scmd-primary",
  success: "border-emerald-500/18 bg-emerald-500/10 text-emerald-300",
  warning: "border-amber-500/18 bg-amber-500/10 text-amber-200",
  danger: "border-red-500/18 bg-red-500/10 text-red-300",
};

export const DashboardInfoPill: React.FC<DashboardInfoPillProps> = ({
  icon,
  children,
  tone = "default",
  className,
}) => (
  <span
    className={cn(
      dashboardInfoPillClass,
      dashboardInfoPillToneClass[tone],
      className,
    )}
  >
    {icon ? <span className="shrink-0 text-current">{icon}</span> : null}
    <span className="truncate">{children}</span>
  </span>
);

interface DashboardFilterBarProps {
  children: React.ReactNode;
  className?: string;
}

export const DashboardFilterBar: React.FC<DashboardFilterBarProps> = ({
  children,
  className,
}) => (
  <section
    className={cn(
      dashboardToolbarClass,
      "flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between",
      className,
    )}
  >
    {children}
  </section>
);

interface DashboardFilterGroupProps {
  children: React.ReactNode;
  className?: string;
}

export const DashboardFilterGroup: React.FC<DashboardFilterGroupProps> = ({
  children,
  className,
}) => (
  <div className={cn("flex flex-1 flex-wrap items-end gap-3", className)}>
    {children}
  </div>
);

interface DashboardMetricGridProps {
  children: React.ReactNode;
  className?: string;
}

export const DashboardMetricGrid: React.FC<DashboardMetricGridProps> = ({
  children,
  className,
}) => (
  <section
    className={cn(
      "grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4",
      className,
    )}
  >
    {children}
  </section>
);

interface DashboardMetricCardProps {
  label: React.ReactNode;
  value: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  tone?: "default" | "success" | "warning" | "danger" | "primary";
  className?: string;
}

const metricToneClass: Record<
  NonNullable<DashboardMetricCardProps["tone"]>,
  string
> = {
  default: "text-white",
  success: "text-emerald-300",
  warning: "text-amber-300",
  danger: "text-red-300",
  primary: "text-scmd-primary",
};

export const DashboardMetricCard: React.FC<DashboardMetricCardProps> = ({
  label,
  value,
  description,
  icon,
  tone = "default",
  className,
}) => (
  <article className={cn(dashboardMetricCardClass, "min-h-[104px]", className)}>
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-scmd-silver/45 not-italic">
          {label}
        </p>
        <p
          className={cn(
            "mt-2 truncate text-2xl font-black tracking-[-0.04em] not-italic sm:text-[28px]",
            metricToneClass[tone],
          )}
        >
          {value}
        </p>
      </div>
      {icon ? (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/8 bg-white/[0.04] text-scmd-silver/60">
          {icon}
        </div>
      ) : null}
    </div>
    {description ? (
      <p className="mt-2 text-xs font-semibold leading-5 text-scmd-silver/50 not-italic">
        {description}
      </p>
    ) : null}
  </article>
);

interface DashboardSectionPanelProps {
  title?: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
}

export const DashboardSectionPanel: React.FC<DashboardSectionPanelProps> = ({
  title,
  description,
  actions,
  children,
  className,
  contentClassName,
}) => (
  <section className={cn(dashboardPanelClass, "overflow-hidden", className)}>
    {title || description || actions ? (
      <div className="flex flex-col gap-3 border-b border-white/5 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 space-y-1">
          {title ? <h3 className={dashboardSectionTitleClass}>{title}</h3> : null}
          {description ? (
            <p className="text-xs font-semibold leading-5 text-scmd-silver/50 not-italic">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
            {actions}
          </div>
        ) : null}
      </div>
    ) : null}
    <div className={cn("p-4", contentClassName)}>{children}</div>
  </section>
);

interface DashboardToolbarRowProps {
  children: React.ReactNode;
  className?: string;
}

export const DashboardToolbarRow: React.FC<DashboardToolbarRowProps> = ({
  children,
  className,
}) => <DashboardFilterBar className={className}>{children}</DashboardFilterBar>;

export const dashboardTabButtonClass = (active: boolean) =>
  cn(
    "min-h-[36px] rounded-[10px] px-3 py-2 text-[11px] font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-scmd-primary/35",
    active
      ? "bg-scmd-primary/14 text-white ring-1 ring-scmd-primary/25"
      : "text-scmd-silver/65 hover:bg-white/[0.045] hover:text-white",
  );

interface DashboardSpinnerProps {
  message?: string;
  className?: string;
  fullHeight?: boolean;
}

export const DashboardSpinner: React.FC<DashboardSpinnerProps> = ({
  message = "Đang tải dữ liệu...",
  className,
  fullHeight = false,
}) => (
  <div
    className={cn(
      "flex flex-col items-center justify-center gap-4 rounded-[14px] border border-white/8 bg-white/[0.025]",
      fullHeight ? "h-full py-40" : "py-20",
      className,
    )}
    role="status"
    aria-live="polite"
  >
    <div className="relative">
      <Loader2 className="h-10 w-10 animate-spin text-scmd-primary" />
      <motion.div
        animate={{ scale: [1, 1.25, 1], opacity: [0.16, 0.36, 0.16] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        className="absolute inset-0 rounded-full bg-scmd-primary/20 blur-lg"
      />
    </div>
    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-scmd-silver/50 not-italic">
      {message}
    </p>
  </div>
);

interface DashboardErrorStateProps {
  title: string;
  description?: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}

export const DashboardErrorState: React.FC<DashboardErrorStateProps> = ({
  title,
  description,
  onRetry,
  retryLabel = "Thử tải lại",
  className,
}) => (
  <EmptyState
    icon={<AlertTriangle size={32} />}
    title={title}
    description={description}
    className={cn("border-red-500/20 bg-red-500/5", className)}
    action={
      onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="h-12 rounded-xl border border-scmd-primary/30 bg-scmd-primary/10 px-6 text-xs font-black text-scmd-primary transition-all hover:bg-scmd-primary/20 focus:outline-none focus:ring-2 focus:ring-scmd-primary/30"
        >
          {retryLabel}
        </button>
      ) : undefined
    }
  />
);
