"use client";

import { Button, type ButtonProps } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export const workspaceControlClassName = "h-11 rounded-[12px] text-sm font-semibold leading-5 shadow-none";

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
    onValueChange: (value: number) => void;
};

export function WorkspaceNumberSelect({ id, label, value, unit, options, disabled, onValueChange }: NumberSelectProps) {
    return (
        <div className="min-w-0 space-y-2 sm:w-36">
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
