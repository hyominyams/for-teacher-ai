"use client";

import React from "react";
import { MessagesSquare, Hammer, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function ContactPage() {
    return (
        <div className="min-h-screen bg-[#FAFBFF] dark:bg-background transition-colors duration-300">
            <main className="pt-32 pb-24 min-h-[80vh] flex items-center justify-center">
                <div className="container mx-auto px-6 max-w-2xl text-center space-y-10">
                    <div className="relative inline-block">
                        <div className="absolute inset-0 bg-indigo-100 dark:bg-indigo-900/30 rounded-full blur-2xl opacity-50" />
                        <div className="relative size-32 rounded-[2.5rem] bg-indigo-600 dark:bg-indigo-500 text-white flex items-center justify-center mx-auto shadow-2xl shadow-indigo-200 dark:shadow-none rotate-12 hover:rotate-0 transition-all duration-500">
                            <Hammer className="size-14" />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-foreground tracking-tight">
                            서비스 준비 중입니다
                        </h1>
                        <p className="text-xl text-slate-500 dark:text-muted-foreground font-medium leading-relaxed">
                            더 나은 소통을 위해 <span className="text-indigo-600 dark:text-indigo-400 font-bold">1:1 문의 게시판</span>을 개발하고 있습니다.<br />
                            조금만 기다려주세요!
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
                        <Link href="/app">
                            <Button className="h-14 px-8 rounded-2xl bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shadow-lg dark:shadow-none hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-indigo-100 dark:hover:border-indigo-900 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all w-full sm:w-auto">
                                메인으로 돌아가기
                            </Button>
                        </Link>
                        <Link href="/resource/faq">
                            <Button className="h-14 px-8 rounded-2xl bg-indigo-600 font-bold shadow-lg shadow-indigo-200 dark:shadow-none hover:bg-indigo-700 transition-all w-full sm:w-auto">
                                FAQ 먼저 확인하기 <ArrowRight className="ml-2 size-4" />
                            </Button>
                        </Link>
                    </div>
                </div>
            </main>
        </div>
    );
}
