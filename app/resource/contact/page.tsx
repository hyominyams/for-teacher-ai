"use client";

import React, { FormEvent, useState } from "react";
import Link from "next/link";
import { AlertCircle, CheckCircle2, Mail, Send, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const INITIAL_FORM = {
    category: "general",
    name: "",
    email: "",
    subject: "",
    message: "",
    website: "",
};

type ContactForm = typeof INITIAL_FORM;

export default function ContactPage() {
    const [form, setForm] = useState<ContactForm>(INITIAL_FORM);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [notice, setNotice] = useState<{ type: "success" | "error"; message: string } | null>(null);

    const updateForm = (field: keyof ContactForm, value: string) => {
        setForm((current) => ({ ...current, [field]: value }));
    };

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setIsSubmitting(true);
        setNotice(null);

        try {
            const response = await fetch("/api/contact", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(form),
            });

            const body = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(body.error || "문의 접수에 실패했습니다.");
            }

            setNotice({
                type: "success",
                message: "문의가 접수되었습니다. 남겨주신 이메일로 답변드리겠습니다.",
            });
            setForm(INITIAL_FORM);
        } catch (error) {
            setNotice({
                type: "error",
                message: error instanceof Error ? error.message : "문의 접수에 실패했습니다.",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#FAFBFF] dark:bg-background transition-colors duration-300">
            <main className="pt-28 pb-20">
                <div className="container mx-auto px-6 max-w-6xl">
                    <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
                        <section className="space-y-8 pt-4">
                            <div className="inline-flex items-center gap-2 rounded-lg border border-sky-100 bg-white px-3 py-2 text-sm font-bold text-sky-700 shadow-sm dark:border-border dark:bg-card dark:text-sky-300">
                                <Mail className="size-4" />
                                1:1 문의
                            </div>

                            <div className="space-y-5">
                                <h1 className="text-4xl font-black tracking-tight text-slate-950 dark:text-foreground md:text-5xl">
                                    필요한 내용을 남겨주세요
                                </h1>
                                <p className="max-w-xl text-lg font-medium leading-relaxed text-slate-600 dark:text-muted-foreground">
                                    ForTeacherAI 이용 중 궁금한 점이나 오류를 보내주시면 확인 후 답변드리겠습니다.
                                </p>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                                <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-border dark:bg-card">
                                    <div className="mb-3 flex size-10 items-center justify-center rounded-lg bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300">
                                        <ShieldCheck className="size-5" />
                                    </div>
                                    <h2 className="text-base font-black text-slate-900 dark:text-foreground">답변 메일</h2>
                                    <p className="mt-2 text-sm font-medium leading-6 text-slate-500 dark:text-muted-foreground">
                                        입력한 이메일 주소로 답변이 발송됩니다.
                                    </p>
                                </div>

                                <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-border dark:bg-card">
                                    <div className="mb-3 flex size-10 items-center justify-center rounded-lg bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                                        <AlertCircle className="size-5" />
                                    </div>
                                    <h2 className="text-base font-black text-slate-900 dark:text-foreground">오류 신고</h2>
                                    <p className="mt-2 text-sm font-medium leading-6 text-slate-500 dark:text-muted-foreground">
                                        화면 위치와 상황을 함께 적어주시면 더 빠르게 확인할 수 있습니다.
                                    </p>
                                </div>
                            </div>

                            <Link
                                href="/resource/faq"
                                className="inline-flex text-sm font-bold text-sky-700 underline-offset-4 hover:underline dark:text-sky-300"
                            >
                                자주 묻는 질문 보기
                            </Link>
                        </section>

                        <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/50 dark:border-border dark:bg-card dark:shadow-none md:p-8">
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <input
                                    tabIndex={-1}
                                    autoComplete="off"
                                    className="hidden"
                                    value={form.website}
                                    onChange={(event) => updateForm("website", event.target.value)}
                                    name="website"
                                />

                                <div className="grid gap-5 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="category">문의 유형</Label>
                                        <select
                                            id="category"
                                            value={form.category}
                                            onChange={(event) => updateForm("category", event.target.value)}
                                            className="h-11 w-full rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100 dark:border-border dark:bg-background dark:text-foreground dark:focus:ring-sky-950"
                                        >
                                            <option value="general">이용 문의</option>
                                            <option value="bug">오류 신고</option>
                                            <option value="account">계정 문의</option>
                                            <option value="feedback">의견 제안</option>
                                        </select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="name">이름</Label>
                                        <Input
                                            id="name"
                                            value={form.name}
                                            onChange={(event) => updateForm("name", event.target.value)}
                                            placeholder="홍길동"
                                            maxLength={80}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="email">답변받을 이메일</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        value={form.email}
                                        onChange={(event) => updateForm("email", event.target.value)}
                                        placeholder="teacher@example.com"
                                        autoComplete="email"
                                        required
                                        maxLength={120}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="subject">제목</Label>
                                    <Input
                                        id="subject"
                                        value={form.subject}
                                        onChange={(event) => updateForm("subject", event.target.value)}
                                        placeholder="문의 제목을 입력해주세요"
                                        required
                                        maxLength={120}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="message">문의 내용</Label>
                                    <textarea
                                        id="message"
                                        value={form.message}
                                        onChange={(event) => updateForm("message", event.target.value)}
                                        placeholder="문의 내용을 입력해주세요"
                                        required
                                        minLength={10}
                                        maxLength={3000}
                                        rows={9}
                                        className="w-full resize-none rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-medium leading-6 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-4 focus:ring-sky-100 dark:border-border dark:bg-background dark:text-foreground dark:placeholder:text-muted-foreground dark:focus:ring-sky-950"
                                    />
                                    <div className="text-right text-xs font-semibold text-slate-400">
                                        {form.message.length}/3000
                                    </div>
                                </div>

                                {notice ? (
                                    <div
                                        role="status"
                                        aria-live="polite"
                                        className={`flex items-start gap-3 rounded-lg border p-4 text-sm font-bold ${notice.type === "success"
                                            ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300"
                                            : "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300"
                                            }`}
                                    >
                                        {notice.type === "success" ? (
                                            <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
                                        ) : (
                                            <AlertCircle className="mt-0.5 size-4 shrink-0" />
                                        )}
                                        <span>{notice.message}</span>
                                    </div>
                                ) : null}

                                <Button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="h-12 w-full rounded-lg bg-sky-600 text-base font-black text-white hover:bg-sky-700"
                                >
                                    {isSubmitting ? "접수 중" : "문의 보내기"}
                                    <Send className="size-4" />
                                </Button>
                            </form>
                        </section>
                    </div>
                </div>
            </main>
        </div>
    );
}
