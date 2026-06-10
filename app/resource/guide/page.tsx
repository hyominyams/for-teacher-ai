"use client";

import React from "react";
import { BookOpen, FileText, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function GuidebookPage() {
    return (
        <div className="min-h-screen bg-[#FAFBFF] dark:bg-background transition-colors duration-300">
            <main className="pt-32 pb-24">
                <div className="container mx-auto px-6 max-w-5xl space-y-12">
                    {/* Header */}
                    <div className="text-center space-y-4">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-widest">
                            <BookOpen className="size-3" /> User Guide
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-foreground tracking-tight">
                            선생님을 위한 <span className="text-indigo-600 dark:text-indigo-400">사용 가이드</span>
                        </h1>
                        <p className="text-lg text-slate-500 dark:text-muted-foreground font-medium max-w-2xl mx-auto">
                            For Teacher AI의 모든 기능을 100% 활용하는 방법을 안내해 드립니다.<br />
                            PDF 가이드북을 통해 상세한 내용을 확인하실 수 있습니다.
                        </p>
                    </div>

                    {/* Placeholder for PDF Viewer */}
                    <Card className="aspect-[16/9] bg-white dark:bg-card border-slate-100 dark:border-border shadow-2xl shadow-slate-200/50 dark:shadow-none rounded-[2rem] flex flex-col items-center justify-center gap-6 p-10 text-center group transition-all hover:shadow-xl dark:hover:shadow-none">
                        <div className="size-20 rounded-3xl bg-slate-50 dark:bg-slate-900 text-slate-300 dark:text-slate-600 flex items-center justify-center group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/20 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-colors">
                            <FileText className="size-10" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-xl font-bold text-slate-900 dark:text-foreground">가이드북 뷰어 준비 중</h3>
                            <p className="text-slate-400 dark:text-muted-foreground font-medium">
                                현재 가이드북 자료를 준비하고 있습니다.<br />
                                곧 PDF 슬라이드 형태로 제공될 예정입니다.
                            </p>
                        </div>
                        <Button className="rounded-xl font-bold gap-2" variant="outline" disabled>
                            <Download className="size-4" /> 가이드북 다운로드 (준비중)
                        </Button>
                    </Card>

                    {/* FAQ or Quick Tips Section (Optional) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="p-8 bg-white dark:bg-card rounded-[2rem] border border-slate-100 dark:border-border shadow-sm dark:shadow-none space-y-4">
                            <h3 className="font-bold text-lg text-slate-900 dark:text-foreground">💡 시작하기</h3>
                            <p className="text-slate-500 dark:text-muted-foreground text-sm leading-relaxed">
                                학생 관리 탭에서 학생 명단을 먼저 설정하세요.<br />
                                엑셀 파일 업로드를 통해 기존 데이터를 한 번에 불러올 수 있습니다.
                            </p>
                        </div>
                        <div className="p-8 bg-white dark:bg-card rounded-[2rem] border border-slate-100 dark:border-border shadow-sm dark:shadow-none space-y-4">
                            <h3 className="font-bold text-lg text-slate-900 dark:text-foreground">✨ AI 생성 팁</h3>
                            <p className="text-slate-500 dark:text-muted-foreground text-sm leading-relaxed">
                                학생의 특성을 나타내는 키워드를 2개 이상 선택하면 더 자연스러운 문장이 생성됩니다.<br />
                                &apos;재생성&apos; 버튼을 눌러 다양한 표현을 확인해 보세요.
                            </p>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
