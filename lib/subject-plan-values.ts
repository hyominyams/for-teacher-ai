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
