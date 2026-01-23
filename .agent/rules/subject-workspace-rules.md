---
trigger: model_decision
---

# Subject Workspace Rules (교과세특 워크스페이스 규칙)

`trigger: model_decision`

## 1. 디자인 의도 (Design Intent)
- **목표**: 교과목별 성취 기준을 바탕으로 학생의 학업 성취도(상/중/하)와 특이사항을 체계적인 문장으로 변환.
- **구조적 입력**: 학교급, 학년, 교과명 등 전역 설정(Global Config)과 학생별 개별 평가(Assessments)를 분리하여 관리.
- **동적 평가 관리**: 평가 항목(성취기준, 평가기준, 역량)을 동적으로 n개까지 추가/삭제 가능.

## 2. UI 구조 및 레이아웃 (Layout Rules)
- **Header Actions**: 
  - (우측 상단) `선택 일괄 적용`(Popover), `내보내기` (.csv), `Expand/Collapse` 버튼 그룹 배치.
  - 창체/행동특성 워크스페이스와 동일한 위치/간격 유지.
- **Global Config Tab**:
  - `학교급`, `학년`, `교과명` 입력 필드 제공.
  - **평가 정보 카드**: 동적 추가/제거 가능. 내부 필드: `영역`, `핵심역량`, `성취기준`(Textarea), `평가기준`(Textarea).
  - **입력 정보 초기화**: 우측 하단에 전체 설정 값을 초기화하는 버튼(`RotateCcw`) 배치.
- **Individual Tab (Grid)**:
  - **Columns**: `Checkbox(40px)` + `Number(80px)` + `평가(140px * n)` + `Note(minmax)` + `Result` + `Control`.
  - **Bulk Action**: Header의 Popover를 통해 선택된 학생들에게 특정 평가 등급(상/중/하) 일괄 적용.
- **Footer Actions**:
  - (좌측) `Students Focused` 배지.
  - (우측) `전체 초기화`, `선택 생성`, `전체 생성` 버튼 그룹.

## 3. 데이터 구조 (Data Structure)
- **Global Config**:
    ```typescript
    interface SubjectGlobalConfig {
        schoolLevel: string;
        grade: string;
        subjectName: string;
        assessments: SubjectAssessmentInfo[]; // { id, area, standard, criteria, competency }
    }
    ```
- **Subject Data (Student Extension)**:
    - `assessments`: `{ assessmentId: string, level: "상" | "중" | "하" | "" }[]`
    - `individualNote`: 개별 관찰 특이사항.

## 4. 인터랙션 규칙 (Interaction Rules)
- **성취 수준 변경**: Dropdown(Select)을 통해 상/중/하 선택.
- **상태 동기화**: `setGlobalConfig`, `setStudents`를 통해 상위 컴포넌트와 상태 동기화.
- **CSV Export**: 교과명, 평가 등급, 생성된 문장 등을 포함하여 CSV 다운로드 지원.
