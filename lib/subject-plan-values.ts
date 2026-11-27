import type { AchievementLevel, SubjectAssessmentInfo } from "@/types";

export const subjectAchievementLevels: readonly AchievementLevel[] = ["상", "중", "하"];

export function getSubjectCriteriaForLevel({ criteria, criteriaLevels }: SubjectAssessmentInfo, level: AchievementLevel) {
    const explicit = criteriaLevels?.[level]?.trim();
    if (explicit) return explicit;

    // Older records can store all levels together in the criteria text.
    const sections = [...(criteria || "").matchAll(/(?:^|\n)[^\S\n]*([상중하])[^\S\n]*[):：-]([\s\S]*?)(?=\n[^\S\n]*[상중하][^\S\n]*[):：-]|$)/g)];
    if (sections.length) return sections.find(section => section[1] === level)?.[2].trim() || "";
    return criteria;
}

export type SchoolLevel = 'elementary' | 'middle' | 'high';
export function normalizeSchoolLevel(value: unknown, fallback: unknown = 'elementary'): SchoolLevel {
    const read = (input: unknown): SchoolLevel | undefined => {
        const text = String(input || '').trim().toLowerCase();
        if (text.includes('초등') || text.includes('elementary') || text === 'primary') return 'elementary';
        if (text.includes('중학') || text === '중등' || text.includes('middle')) return 'middle';
        if (text.includes('고등') || text.includes('high')) return 'high';
    };
    return read(value) || read(fallback) || 'elementary';
}
export function normalizeGrade(value: unknown, schoolLevel: SchoolLevel, fallback: unknown = '1'): string {
    const max = schoolLevel === 'elementary' ? 6 : 3;
    const read = (input: unknown) => {
        const text = String(input || '').trim(), match = text.match(/(\d+)\s*학년(?!도)/) || text.match(/^(\d+)$/);
        const number = match ? Number(match[1]) : 0;
        return number >= 1 && number <= max ? String(number) : undefined;
    };
    return read(value) || read(fallback) || '1';
}
