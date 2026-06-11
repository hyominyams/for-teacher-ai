import { NextResponse } from "next/server";
import { Resend } from "resend";

const CATEGORY_LABELS: Record<string, string> = {
    general: "이용 문의",
    bug: "오류 신고",
    account: "계정 문의",
    feedback: "의견 제안",
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const cleanText = (value: unknown, maxLength: number) => {
    if (typeof value !== "string") return "";
    return value.trim().slice(0, maxLength);
};

const escapeHtml = (value: string) =>
    value
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

export async function POST(req: Request) {
    try {
        const payload = await req.json();
        const honeypot = cleanText(payload.website, 200);

        if (honeypot) {
            return NextResponse.json({ ok: true });
        }

        const category = cleanText(payload.category, 30);
        const name = cleanText(payload.name, 80) || "이름 미입력";
        const email = cleanText(payload.email, 120);
        const subject = cleanText(payload.subject, 120);
        const message = cleanText(payload.message, 3000);

        if (!CATEGORY_LABELS[category]) {
            return NextResponse.json({ error: "문의 유형을 선택해주세요." }, { status: 400 });
        }

        if (!EMAIL_PATTERN.test(email)) {
            return NextResponse.json({ error: "답변받을 이메일을 확인해주세요." }, { status: 400 });
        }

        if (subject.length < 2) {
            return NextResponse.json({ error: "제목을 입력해주세요." }, { status: 400 });
        }

        if (message.length < 10) {
            return NextResponse.json({ error: "문의 내용을 10자 이상 입력해주세요." }, { status: 400 });
        }

        const apiKey = process.env.RESEND_API_KEY;
        const toEmail = process.env.CONTACT_TO_EMAIL;
        const fromEmail = process.env.CONTACT_FROM_EMAIL || "ForTeacherAI <onboarding@resend.dev>";

        if (!apiKey || !toEmail) {
            return NextResponse.json(
                { error: "문의 접수 설정이 완료되지 않았습니다." },
                { status: 503 }
            );
        }

        const resend = new Resend(apiKey);
        const categoryLabel = CATEGORY_LABELS[category];
        const submittedAt = new Intl.DateTimeFormat("ko-KR", {
            dateStyle: "medium",
            timeStyle: "short",
            timeZone: "Asia/Seoul",
        }).format(new Date());

        const text = [
            `[${categoryLabel}] ${subject}`,
            "",
            `이름: ${name}`,
            `이메일: ${email}`,
            `접수 시각: ${submittedAt}`,
            "",
            message,
        ].join("\n");

        const html = `
            <div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.65; color: #0f172a;">
                <p style="margin: 0 0 16px; font-size: 13px; color: #64748b;">${escapeHtml(submittedAt)}</p>
                <h1 style="margin: 0 0 24px; font-size: 22px;">${escapeHtml(subject)}</h1>
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 14px;">
                    <tr>
                        <th align="left" style="width: 90px; padding: 8px 0; color: #64748b;">유형</th>
                        <td style="padding: 8px 0;">${escapeHtml(categoryLabel)}</td>
                    </tr>
                    <tr>
                        <th align="left" style="width: 90px; padding: 8px 0; color: #64748b;">이름</th>
                        <td style="padding: 8px 0;">${escapeHtml(name)}</td>
                    </tr>
                    <tr>
                        <th align="left" style="width: 90px; padding: 8px 0; color: #64748b;">이메일</th>
                        <td style="padding: 8px 0;">${escapeHtml(email)}</td>
                    </tr>
                </table>
                <div style="white-space: pre-wrap; padding: 20px; border: 1px solid #e2e8f0; border-radius: 14px; background: #f8fafc;">${escapeHtml(message)}</div>
            </div>
        `;

        const { data, error } = await resend.emails.send({
            from: fromEmail,
            to: [toEmail],
            replyTo: email,
            subject: `[ForTeacherAI 문의] ${categoryLabel} - ${subject}`,
            text,
            html,
        });

        if (error) {
            console.error("Contact email error:", error);
            return NextResponse.json({ error: "문의 접수에 실패했습니다." }, { status: 502 });
        }

        return NextResponse.json({ ok: true, id: data?.id });
    } catch (error) {
        console.error("Contact API error:", error);
        return NextResponse.json({ error: "문의 접수에 실패했습니다." }, { status: 500 });
    }
}
