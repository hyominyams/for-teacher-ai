"use client";

import React from "react";
import { Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface PlaceholderWorkspaceProps {
    title: string;
    onBack: () => void;
}

export const PlaceholderWorkspace = ({ title, onBack }: PlaceholderWorkspaceProps) => {
    return (
        <Card className="p-20 border-0 bg-white shadow-2xl shadow-slate-200/40 rounded-[3.5rem] flex flex-col items-center justify-center text-center space-y-6 mt-8">
            <div className="size-32 rounded-[3.5rem] bg-slate-50 flex items-center justify-center relative group">
                <div className="absolute inset-0 bg-primary/5 rounded-[3.5rem] blur-2xl group-hover:bg-primary/10 transition-all duration-500" />
                <Sparkles className="size-14 text-slate-200 group-hover:text-primary/40 transition-all duration-500 animate-pulse" />
            </div>
            <div className="space-y-4">
                <h3 className="text-4xl font-black text-slate-900 tracking-tight">{title} 서비스 준비 중</h3>
                <p className="text-slate-400 font-medium text-lg max-w-sm mx-auto">
                    더 나은 기능을 제공하기 위해 <br />
                    현재 열심히 개발하고 있습니다.
                </p>
            </div>
            <Button
                onClick={onBack}
                className="rounded-2xl bg-slate-900 text-white font-black h-14 px-10 hover:bg-slate-800 shadow-2xl shadow-slate-900/20 transition-all"
            >
                관찰기록 탭으로 돌아가기
            </Button>
        </Card>
    );
};
