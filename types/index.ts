export interface Student {
    id: number;
    name: string;
    customKeywords: string[];
    selectedKeywords: string[];
    aiResult: string;
    isGenerating: boolean;
    isEditable: boolean;
    selected: boolean;

    // 창체활동 영역
    participatedEvents?: string[];
    officerRole?: string;
    officerPeriod?: string;

    // 향후 확장을 위한 필드 (교과, 문서 등)
    subjectData?: any;
    docsData?: any;
}

export type FeatureCategory = "behavior" | "subject" | "creative" | "docs";

export interface DashboardState {
    students: Student[];
    studentCount: number;
    charLimit: number;
    activeTabId: string;
}
