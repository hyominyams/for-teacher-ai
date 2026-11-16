"use client";

import type { ComponentProps } from "react";
import { ChevronDown, MoveRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { GenerationMode } from "@/lib/record-generation";

type Props = Omit<ComponentProps<typeof Button>, "onClick" | "asChild"> & {
    onGenerate: (mode: GenerationMode) => void;
};

export function GenerationMenu({ children, onGenerate, ...buttonProps }: Props) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button {...buttonProps} type="button">
                    {children}<ChevronDown className="size-3.5 shrink-0 opacity-70" aria-hidden="true" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="z-[10100] w-56 rounded-2xl p-1.5 shadow-xl">
                <DropdownMenuItem onSelect={() => onGenerate("replace")} className="items-start rounded-xl px-2.5 py-2.5">
                    <Sparkles className="mt-0.5 text-muted-foreground" aria-hidden="true" />
                    <span><span className="block font-bold">새로 쓰기</span><span className="block text-xs text-muted-foreground">기존 결과를 새 문장으로 교체</span></span>
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => onGenerate("append")} className="items-start rounded-xl px-2.5 py-2.5">
                    <MoveRight className="mt-0.5 text-primary" aria-hidden="true" />
                    <span><span className="block font-bold">이어쓰기</span><span className="block text-xs text-muted-foreground">기존 문장 뒤에 새로운 내용만 추가<br />빈 기록은 새로 작성</span></span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
