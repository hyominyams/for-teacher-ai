---
trigger: always_on
glob: "**/*"
description: "For Teacher AI 프로젝트의 핵심 규칙 및 컨텍스트 정의"
---

# For Teacher AI - Project Rules

## 1. 프로젝트 개요 (Project Overview)
- **제품명**: For Teacher AI
- **목표**: 교사가 생활기록부를 쉽고 빠르게 작성하도록 돕는 웹 애플리케이션.
- **Phase 1 범위**:
  - **핵심 기능**: 로그인/회원가입, 메인 대시보드, **행동특성 및 종합의견(Behavior Specifics)** 생성 기능.
  - **UI 제공 (기능 미구현)**: 교과 세특(Subject), 창의적 체험활동(Creative), 업무 문서(Docs) -> 이들은 "준비중"으로 표시.
- **타겟 사용자**: 초/중/고 교사.

## 2. 기술 스택 (Tech Stack)
- **Framework**: Next.js 16+ (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
  - *Note*: 사용자 글로벌 룰의 "Vanilla CSS" 원칙보다 프로젝트에 이미 설치된 Tailwind 설정을 우선함.
- **UI Library**: Shadcn/ui (Radix UI 기반), Lucide React.
- **Backend/Auth**: Supabase (Authentication, PostgreSQL, RLS).
- **Deploy**: Vercel (권장).

## 3. 아키텍처 및 라우팅 (Architecture & Routing)
- **페이지 구조**:
  - `/`: 디자인 페이지 (비로그인 랜딩, 마케팅/설명 중심).
  - `/login`: 로그인/회원가입 (Supabase Auth, 이메일+비밀번호).
  - `/app`: 메인 대시보드 (로그인 후 진입, 4개 영역 선택).
    - `/app/behavior`: **행동특성 페이지 (Phase 1 핵심)**. 좌측 입력 / 우측 결과 레이아웃.
    - `/app/grade`: 교과 세특 (준비중 카드/페이지).
    - `/app/creative`: 창체 (준비중 카드/페이지).
    - `/app/docs`: 업무 문서 (준비중 카드/페이지).

- **데이터 처리**:
  - Server Actions를 사용하여 데이터 mutation 처리.
  - Supabase 클라이언트를 통한 데이터 조회.

## 4. 데이터베이스 및 스키마 (Database)
- **테이블**: `saved_results`
- **구조**:
  - `id`: UUID (PK)
  - `user_id`: UUID (FK to auth.users)
  - `category`: String (`"behavior"`, `"grade"`, `"creative"`, `"docs"`)
  - `data`: JSONB (생성된 결과, 슬롯 정보, 키워드 등을 구조화하여 저장)
  - `created_at`: Timestamptz
- **보안**: RLS(Row Level Security) 필수 적용 (본인 데이터만 조회/수정 가능).

## 5. UI/UX 가이드라인
- **디자인 컨셉**: 교사용이지만 딱딱하지 않은, 프리미엄하고 세련된 디자인.
- **레이아웃**: 생성형 도구의 표준인 **Left Input / Right Output** 구조 준수.
- **반응성**: PC 환경 위주이나 모바일 대응도 고려.

## 6. 개발 원칙 (Development Principles)
- **Focus**: Phase 1에서는 무리하게 모든 기능을 구현하지 않고, "행동특성" 기능의 완성도에 집중한다.
- **Scalability**: 데이터 구조(`saved_results`의 JSONB 활용)는 향후 카테고리 확장을 고려하여 설계한다.
- **Privacy**: 학생의 실명 등 개인식별정보는 가능한 저장하지 않거나 암호화/최소화한다 (슬롯 번호 위주 관리).

## 7. 컴포넌트 개발 및 관리 규칙 (Component Guidelines)
- **Workflow**:
  1. 공통 컴포넌트 파일을 생성한다.
  2. 반드시 **Demo 페이지**에 해당 컴포넌트를 구현하여 시각적으로 확인 및 시연해야 한다.
- **Documentation**:
  - 각 컴포넌트 제작 후, `.agent/rules/` 내에 개별 문서(`[component-name]-rules.md` 등)를 생성하여 저장한다.
  - **필수 포함 내용**: 디자인 의도, Props 구조, 구현 방식 등 핵심 사항.
  - **Trigger 설정**: `trigger: model_decision`을 반드시 포함해야 한다.
- **UI Library**: `shadcn/ui`를 기본적으로 사용한다.
- **Configuration**:
  - API 키 및 민감 정보는 반드시 `.env` 환경 변수로 주입한다. (코드 내 하드코딩 금지)
