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
    // 교과세특 영역
    subjectData?: {
        assessments: Array<{
            assessmentId: string;
            level: "상" | "중" | "하" | "";
        }>;
        individualNote: string;
    };
    docsData?: unknown;
}

export interface SubjectAssessmentInfo {
    id: string;
    area: string; // 영역(대단원)
    standard: string; // 성취기준
    criteria: string; // 평가기준
    criteriaLevels?: CriteriaLevels; // 상/중/하 평가기준
    competency: string; // 관련역량
}

export interface SubjectGlobalConfig {
    schoolLevel: string;
    grade: string;
    subjectName: string;
    assessments: SubjectAssessmentInfo[];
}

export type AchievementLevel = "상" | "중" | "하";

export type CriteriaLevels = Partial<Record<AchievementLevel, string>>;

export interface ParsedSubjectPlanAssessment {
    area: string;
    standard: string;
    criteria: string;
    criteriaLevels?: CriteriaLevels;
    competency: string;
}

export interface ParsedSubjectPlanSubject {
    subjectName: string;
    schoolLevel: string;
    grade: string;
    assessments: ParsedSubjectPlanAssessment[];
}

export type FeatureCategory = "behavior" | "subject" | "creative" | "docs";

export interface DashboardState {
    students: Student[];
    studentCount: number;
    charLimit: number;
    activeTabId: string;
}
