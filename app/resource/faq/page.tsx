"use client";

import React from "react";
import { HelpCircle, MessagesSquare } from "lucide-react";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";

const FAQS = [
    {
        question: "입력한 학생 정보는 안전하게 보관되나요?",
        answer: "네, 모든 데이터는 안전하게 암호화되어 저장되며 본인 외에는 누구도 열람할 수 없습니다. 또한, 입력한 정보는 언제든지 삭제할 수 있습니다."
    },
    {
        question: "AI 생성 결과가 마음에 들지 않으면 어떻게 하나요?",
        answer: "'재생성' 버튼을 눌러보세요. AI가 새로운 관점에서 다시 작성해 드립니다. 또한 생성된 결과는 텍스트 편집기에서 직접 수정하실 수도 있습니다."
    },
    {
        question: "한 번에 몇 명까지 생성할 수 있나요?",
        answer: "시스템 성능에 따라 다르지만, 일반적으로 30명 내외의 한 학급 인원을 한 번에 처리할 수 있도록 최적화되어 있습니다."
    },
    {
        question: "CSV 파일 업로드 양식은 어디서 다운로드하나요?",
        answer: "각 기능(교과, 행동, 창체)의 대시보드 내 '양식 업로드' 모달 창에서 기본 엑셀 양식을 다운로드하실 수 있습니다."
    },
    {
        question: "모바일에서도 사용할 수 있나요?",
        answer: "네, 반응형 웹 디자인을 적용하여 태블릿이나 모바일 기기에서도 편리하게 이용하실 수 있습니다. 다만, 대량의 텍스트 편집 작업은 PC 환경을 권장합니다."
    }
];

export default function FAQPage() {
    return (
        <div className="min-h-screen bg-[#FAFBFF] dark:bg-background transition-colors duration-300">
            <main className="pt-32 pb-24">
                <div className="container mx-auto px-6 max-w-4xl space-y-12">
                    {/* Header */}
                    <div className="text-center space-y-4">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-50 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400 text-[10px] font-black uppercase tracking-widest">
                            <HelpCircle className="size-3" /> Support Center
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-foreground tracking-tight">
                            자주 묻는 <span className="text-orange-500">질문들 (FAQ)</span>
                        </h1>
                        <p className="text-lg text-slate-500 dark:text-muted-foreground font-medium max-w-2xl mx-auto">
                            서비스 이용 중 궁금한 점을 빠르게 해결해 드립니다.
                        </p>
                    </div>

                    {/* Accordion */}
                    <div className="bg-white dark:bg-card rounded-[2.5rem] p-10 shadow-2xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-border">
                        <Accordion type="single" collapsible className="w-full space-y-4">
                            {FAQS.map((faq, idx) => (
                                <AccordionItem key={idx} value={`item-${idx}`} className="border-b border-slate-100 dark:border-border last:border-0 px-4">
                                    <AccordionTrigger className="text-lg font-bold text-slate-800 dark:text-foreground hover:text-orange-500 dark:hover:text-orange-400 hover:no-underline py-6">
                                        <span className="text-left">{faq.question}</span>
                                    </AccordionTrigger>
                                    <AccordionContent className="text-slate-500 dark:text-slate-400 font-medium text-base leading-relaxed pb-6">
                                        <div className="bg-slate-50 dark:bg-slate-900 p-6 rounded-2xl">
                                            {faq.answer}
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    </div>

                    {/* Contact CTA */}
                    <div className="text-center space-y-6 pt-10">
                        <div className="inline-flex items-center justify-center size-16 rounded-3xl bg-white dark:bg-card border border-slate-100 dark:border-border shadow-xl dark:shadow-none text-indigo-600 dark:text-indigo-400">
                            <MessagesSquare className="size-8" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-foreground">추가 질문이 있으신가요?</h3>
                            <p className="text-slate-400 dark:text-slate-500 mt-2">1:1 문의 게시판을 통해 상세한 답변을 받아보세요.</p>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
