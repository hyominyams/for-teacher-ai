---
trigger: model_decision
---

# Authentication & Extension Integration Rules

## 1. 개요 (Overview)
사용자 인증은 Supabase Auth를 기반으로 하며, 웹 서비스와 향후 개발될 크롬 익스텐션 간의 원활한 데이터 공유를 목표로 설계되었습니다.

## 2. 데이터베이스 및 스키마 (Database Schema)
- **auth.users**: Supabase 기본 인증 스키마. 이메일, 비밀번호 등 보안 정보 관리.
- **public.profiles**: 추가 사용자 정보 (이름, 이메일, 소속 학교) 관리.
    - `id`: `auth.users`의 UUID를 참조 (Primary Key).
    - `school_name`: 선생님의 소속 학교 정보 (필수 입력).
    - `email`: `auth.users`에서 자동으로 연동되는 이메일 주소.

## 3. 구현 방식 (Implementation)
- **Trigger**: `auth.users`에 신규 사용자가 생성될 때 자동으로 `public.profiles`에 행을 추가하는 DB 트리거 사용.
- **Client SDK**: `@supabase/supabase-js`를 사용하여 클라이언트 사이드에서 인증 처리.
- **Login Flow**:
    - 이메일/비밀번호 기반 로그인 (`signInWithPassword`).
    - 로그인 성공 시 메인 대시보드로 이동 및 세션 갱신.
- **Signup Flow**:
    - `signUp` 시 `options.data`를 통해 `full_name`과 `school_name` 전달.
    - 이메일 인증은 사용자 편의를 위해 초기 개발 단계에서 생략 가능하도록 설정 (Supabase Dashboard 설정 권장).

## 4. 크롬 익스텐션 연동 가이드라인 (Extension Integration)
- **Token 공유**: 익스텐션은 웹앱과 동일한 Supabase Project URL 및 Anon Key를 사용하여 인증 상태를 공유해야 함.
- **데이터 접근**: 
    - Supabase RLS (Row Level Security) 정책을 활용하여 `user_id`가 일치하는 데이터만 조회하도록 제한.
    - 웹앱에서 저장된 생활기록부 작업 결과(`saved_results` 테이블)를 익스텐션에서 실시간으로 불러와 나이스(NEIS) 자동 입력에 활용.
- **JWT**: 익스텐션의 모든 API 요청은 Supabase에서 발급한 JWT를 헤더에 포함하여 보안을 유지함.

---
trigger: model_decision
