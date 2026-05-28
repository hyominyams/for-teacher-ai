# For Teacher AI — Supabase 연동 설계 (로그인, 임시저장, 마이페이지 최신 저장)

이 문서는 현재 앱 코드(`app/app/page.tsx`, `app/app/logs/page.tsx`, `components/layout/NavbarMain.tsx`) 기준으로
Supabase PostgreSQL 연동을 정리한 설계입니다.

## 1) 현재 앱에서 필요한 데이터 동작

- 로그인: Supabase Auth 사용 (`lib/supabase.ts`, `app/login`, `app/signup`, `app/auth/callback`)
- 임시 입력:
  - 현재 코드의 `students`, `studentCount`, `charLimits`, `subjectConfig`는 메모리 상태로만 존재.
  - 변경 감지 시 3초 디바운스로 `saveWorkLog(true, students)` 호출 중 (`app/app/page.tsx`).
- 저장 버튼/버튼 동작:
  - `work_logs` 업서트 대상(현재 코드 기준: `user_id`, `category`, `data`)
- 마이페이지:
  - `app/app/logs/page.tsx`에서 `work_logs`를 `user_id` 기준으로 최신 `updated_at` 정렬 조회.

## 2) 스키마 목표

1. 사용자 식별은 Supabase Auth(`auth.users.id`) 기준으로 고정.
2. 카테고리별 최신 결과는 `work_logs` 한 건으로 유지.
3. `profiles`는 `profiles.id`와 호환되는 형태와 `user_id`(alias)도 함께 제공하여 기존 쿼리(`.eq('id', user.id)`)와 신규 쿼리(`.eq('user_id', user.id)`) 모두 대응.
4. RLS로 로그인 사용자 본인 데이터만 조회/변경 가능.

## 3) SQL 마이그레이션

- 스크립트: [supabase/migrations/20260528_for_teacher_ai_core.sql](/Users/user/Documents/ForTeacherAI/supabase/migrations/20260528_for_teacher_ai_core.sql)
- 실행 순서:
  1) Supabase Studio → SQL Editor에서 전체 스크립트 실행
  2) 테이블/정책 생성 확인
  3) 기존 Auth 사용자 기준 profiles 백필 실행 확인

## 4) 임시저장(localStorage) + 서버 저장 동기화 규칙

### 키 규칙
- `ftai:draft:v1:${userId}:${category}`
- 값 예시:
  - `students`, `studentCount`, `charLimits`, `subjectConfig`, `dirtyAt`(클라 타임스탬프), `version`

### 저장 규칙
1. 입력 변경 시 즉시 로컬 draft 저장(방향성: 신속 복구).
2. `save` 호출 시:
   - `work_logs`에 `upsert` 수행 (`user_id`, `category` 고유 키).
   - 서버 저장 성공 시 draft의 `dirty:false` 혹은 삭제.
3. 페이지 진입 시:
   - `userId`가 확인되면 draft 먼저 복구 시도.
   - 이어서 `work_logs` 조회.
   - `draft.dirtyAt`과 서버 `updated_at` 중 최신 시점 우선 적용.
4. 임시저장 데이터는 브라우저 기기 전용이므로 휴대기기/브라우저 변경 시 서버 데이터(`work_logs`)가 단일 영구본으로 동작.

## 5) 저장 데이터 최소 규격

- `profiles`
  - `id` (PK, `auth.users.id`)
  - `user_id` (generated from `id`, 호환성)
  - `full_name`, `school_name`, `email`, `created_at`, `updated_at`
- `work_logs`
  - `user_id`
  - `category` (`behavior|subject|creative|docs`)
  - `data` (JSONB)
  - `schema_version` (정수, 현재 1)
  - `created_at`, `updated_at`
  - `(user_id, category)` UNIQUE

## 6) 마이페이지 쿼리 동작

- 사용자별 최신값:
  - `select * from public.work_logs where user_id = :uid order by updated_at desc`
- 현재 앱은 카테고리별로 한 건(Unique) 구조이므로, 최신 값은 곧 최종 상태.

## 7) 코드 레벨 조정 권고

- `NavbarMain`의 프로필 조회는 현재 `profiles`에서 `id` 기준 조회.
  - 현재 스키마(`id` + `user_id alias`)는 호환.
- 로그 페이지 타입은 `data.charLimits` / `data.charLimit` 혼재가 있어 `data.charLimits`를 기본으로, 없으면 `charLimit` fallback 처리 필요.
- 로컬 임시저장 기능이 들어오면 `app/app/page.tsx`의 `saveWorkLog`/`loadWorkLog` 경로에 draft merge 로직을 추가해야 함.

## 8) 확인 쿼리(배포 후)

```sql
select table_name
from information_schema.tables
where table_schema = 'public' and table_name in ('profiles', 'work_logs');

select category, jsonb_typeof(data), updated_at
from public.work_logs
where user_id = auth.uid()
order by updated_at desc;

select p.id as profile_pk, p.user_id as profile_user_id, p.full_name
from public.profiles p
where p.user_id = auth.uid();
```

## 9) 다음 단계(운영)

1. 마이그레이션 실행
2. 환경변수 적용(`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
3. 앱에 draft + 서버 동기화 로직 적용
4. `/app/logs`와 대시보드 동작 테스트
