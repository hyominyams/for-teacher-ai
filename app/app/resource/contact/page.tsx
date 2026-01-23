"use client";

import React from "react";
import { MessagesSquare, Hammer, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NavbarMain } from "@/components/layout/NavbarMain";
import { Footer } from "@/components/layout/Footer";
import Link from "next/link";

export default function ContactPage() {
    return (
        <div className="min-h-screen bg-[#FAFBFF]">
            <main className="pt-32 pb-24 min-h-[80vh] flex items-center justify-center">
                <div className="container mx-auto px-6 max-w-2xl text-center space-y-10">
                    <div className="relative inline-block">
                        <div className="absolute inset-0 bg-indigo-100 rounded-full blur-2xl opacity-50" />
                        <div className="relative size-32 rounded-[2.5rem] bg-indigo-600 text-white flex items-center justify-center mx-auto shadow-2xl shadow-indigo-200 rotate-12 hover:rotate-0 transition-all duration-500">
                            <Hammer className="size-14" />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight">
                            서비스 준비 중입니다
                        </h1>
                        <p className="text-xl text-slate-500 font-medium leading-relaxed">
                            더 나은 소통을 위해 <span className="text-indigo-600 font-bold">1:1 문의 게시판</span>을 개발하고 있습니다.<br />
                            조금만 기다려주세요!
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
                        <Link href="/app">
                            <Button className="h-14 px-8 rounded-2xl bg-white text-slate-600 font-bold border border-slate-200 shadow-lg hover:bg-slate-50 hover:border-indigo-100 hover:text-indigo-600 transition-all w-full sm:w-auto">
                                메인으로 돌아가기
                            </Button>
                        </Link>
                        <Link href="/app/resource/faq">
                            <Button className="h-14 px-8 rounded-2xl bg-indigo-600 font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all w-full sm:w-auto">
                                FAQ 먼저 확인하기 <ArrowRight className="ml-2 size-4" />
                            </Button>
                        </Link>
                    </div>
                </div>
            </main>

        </div>
    );
}
