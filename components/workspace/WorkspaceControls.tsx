"use client";

import type { ReactNode } from "react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export const workspaceControlClassName = "h-11 rounded-[12px] text-sm font-semibold leading-5 shadow-none";

/** 작업화면 공통 토큰: 카드 rounded-2xl, 행·컨트롤 rounded-xl, 굵기는 semibold 이하. */
export const workspaceCardClassName = "rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:shadow-none";

/** 카드 머리의 보조 도구 버튼(키워드 자동생성, 활동 자동배정 등)은 모두 같은 외곽선 모양을 쓴다. */
export const workspaceToolButtonClassName = "h-9 gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-none hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-white";

/** 하단 실행 바의 보조 버튼 */
export const workspaceSecondaryActionClassName = "h-10 gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-none hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-white";

/** 화면마다 하나만 두는 주요 버튼(전체 생성) */
export const workspacePrimaryActionClassName = "h-10 gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90";

export const workspaceTableHeadClassName = "text-xs font-semibold leading-4 text-slate-500 dark:text-slate-400";

export const workspaceCheckboxClassName = "size-4 cursor-pointer rounded border-slate-300 accent-primary dark:border-slate-600";

export const workspaceRowNumberClassName = "text-sm font-semibold tabular-nums text-slate-900 dark:text-white";

/** 행 안의 생성 버튼: 결과가 없으면 채움, 있으면(재생성) 옅은 브랜드색 */
export function workspaceRowGenerateClassName(hasResult: boolean) {
    return cn(
        "h-9 w-full gap-1.5 rounded-xl px-3 text-xs font-semibold shadow-none",
        hasResult
            ? "border border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-300 dark:hover:bg-sky-900/40"
            : "bg-primary text-primary-foreground hover:bg-primary/90"
    );
}

export const workspaceRowResetClassName = "inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-xl text-xs font-medium text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600 disabled:pointer-events-none disabled:opacity-50 dark:text-slate-400 dark:hover:bg-red-950/30 dark:hover:text-red-400";

export type WorkspaceAccent = "sky" | "indigo" | "amber";

const accentStyles: Record<WorkspaceAccent, { icon: string; selectedRow: string }> = {
    sky: {
        icon: "bg-sky-50 text-sky-600 dark:bg-sky-950/50 dark:text-sky-300",
        selectedRow: "border-sky-200 bg-sky-50/70 dark:border-sky-800 dark:bg-sky-950/30",
    },
    indigo: {
        icon: "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-300",
        selectedRow: "border-indigo-200 bg-indigo-50/60 dark:border-indigo-800 dark:bg-indigo-950/30",
    },
    amber: {
        icon: "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-300",
        selectedRow: "border-amber-200 bg-amber-50/60 dark:border-amber-800 dark:bg-amber-950/20",
    },
};

export function workspaceRowClassName(selected: boolean, accent: WorkspaceAccent) {
    return cn(
        "rounded-xl border transition-colors",
        selected
            ? accentStyles[accent].selectedRow
            : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
    );
}

/**
 * 표가 화면에 다 들어오는 폭(fit)부터는 페이지 스크롤에 머리글을 고정하고, 그보다 좁으면 가로 스크롤로 떨어진다.
 * 가로 스크롤 상자 안에서 sticky top-20을 쓰면 상자 기준으로 80px 밀려 첫 행을 덮으므로, 머리글 고정도 같은 폭부터만 켠다.
 */
export type WorkspaceTableFit = "lg" | "xl" | "2xl" | "none";

const tableFitClasses: Record<WorkspaceTableFit, { scroll: string; head: string }> = {
    lg: { scroll: "lg:overflow-visible", head: "lg:sticky lg:top-20" },
    xl: { scroll: "xl:overflow-visible", head: "xl:sticky xl:top-20" },
    "2xl": { scroll: "2xl:overflow-visible", head: "2xl:sticky 2xl:top-20" },
    none: { scroll: "", head: "" },
};

export function workspaceTableScrollClassName(expanded: boolean, fit: WorkspaceTableFit) {
    return expanded ? "overflow-visible" : cn("overflow-x-auto", tableFitClasses[fit].scroll);
}

/**
 * 전체화면 카드는 p-4 sm:p-5 안에서 스크롤하고, sticky 기준선은 패딩 안쪽이다.
 * 패딩만큼 음수로 붙여야 머리글·실행 바 바깥 띠로 행이 비치지 않는다.
 */
const expandedStickyTopClassName = "-top-4 sm:-top-5";
const expandedStickyBottomClassName = "-bottom-4 sm:-bottom-5";

export function workspaceStickyHeadClassName(expanded: boolean, fit: WorkspaceTableFit) {
    return cn(
        "relative z-20 border-b border-slate-200 bg-slate-50/95 backdrop-blur supports-[backdrop-filter]:bg-slate-50/80 dark:border-slate-800 dark:bg-slate-950/90",
        expanded ? cn("sticky", expandedStickyTopClassName) : tableFitClasses[fit].head
    );
}

export function WorkspaceCardHeader({ icon, accent, title, description, actions }: {
    icon: ReactNode;
    accent: WorkspaceAccent;
    title: string;
    description?: string;
    actions?: ReactNode;
}) {
    return (
        <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
                <div className={cn("flex size-9 shrink-0 items-center justify-center rounded-xl [&_svg]:size-[18px]", accentStyles[accent].icon)}>{icon}</div>
                <div className="min-w-0">
                    <h2 className="text-base font-bold leading-6 text-slate-900 dark:text-white">{title}</h2>
                    {description && <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">{description}</p>}
                </div>
            </div>
            {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
    );
}

export function WorkspaceActionBar({ selectedCount, onClearSelection, expanded, children }: {
    selectedCount: number;
    onClearSelection?: () => void;
    expanded?: boolean;
    children: ReactNode;
}) {
    return (
        <div className={cn(
            "sticky z-20 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/95 px-3 py-2.5 shadow-lg shadow-slate-900/5 backdrop-blur supports-[backdrop-filter]:bg-white/85 dark:border-slate-700 dark:bg-slate-900/95 dark:shadow-none",
            expanded ? expandedStickyBottomClassName : "bottom-4"
        )}>
            <div className="flex items-center gap-1.5">
                <span aria-live="polite" className="inline-flex h-8 items-center rounded-lg bg-slate-100 px-2.5 text-sm font-semibold tabular-nums text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                    {selectedCount}명 선택됨
                </span>
                {selectedCount > 0 && onClearSelection && (
                    <Button type="button" variant="ghost" onClick={onClearSelection} className="h-8 rounded-lg px-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                        선택 해제
                    </Button>
                )}
            </div>
            {/* 휴대폰 폭에서는 세 버튼을 한 줄(3열)로 줄여 고정 바가 화면을 덜 가리게 한다. */}
            <div className="grid w-full grid-cols-3 gap-1.5 sm:flex sm:w-auto sm:flex-wrap sm:items-center sm:gap-2 max-sm:[&>button]:min-w-0 max-sm:[&>button]:gap-1 max-sm:[&>button]:px-1.5 max-sm:[&>button]:text-xs max-sm:[&>button>svg:first-child]:hidden">{children}</div>
        </div>
    );
}

export function WorkspaceButton({ className, ...props }: ButtonProps) {
    return <Button className={cn(workspaceControlClassName, "px-4", className)} {...props} />;
}

type NumberSelectProps = {
    id: string;
    label: string;
    value: number;
    unit: string;
    options: number[];
    disabled?: boolean;
    className?: string;
    onValueChange: (value: number) => void;
};

export function WorkspaceNumberSelect({ id, label, value, unit, options, disabled, className, onValueChange }: NumberSelectProps) {
    return (
        <div className={cn("min-w-0 space-y-2 sm:w-36", className)}>
            <label htmlFor={id} className="block text-xs font-semibold leading-4 text-slate-600 dark:text-slate-400">{label}</label>
            <Select value={String(value)} onValueChange={next => onValueChange(Number(next))} disabled={disabled}>
                <SelectTrigger id={id} aria-label={label} className={cn(workspaceControlClassName, "w-full data-[size=default]:h-11 border-slate-200 px-3.5 dark:border-slate-700")}>
                    <SelectValue />
                </SelectTrigger>
                <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
                    {options.map(option => (
                        <SelectItem key={option} value={String(option)} textValue={`${option}${unit}`}>
                            <span className="inline-flex items-baseline gap-1.5">
                                <span className="min-w-[3ch] text-right text-base font-semibold tabular-nums">{option}</span>
                                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{unit}</span>
                            </span>
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}
