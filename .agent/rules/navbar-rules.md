---
trigger: model_decision
glob: "components/layout/Navbar.tsx"
description: "Navbar 컴포넌트의 디자인 의도 및 기능 규칙"
---

# Navbar Component Rules

## 1. 디자인 의도 (Design Intent)
- **Luxury Floating Feel**: 상단 바가 화면에 고정된 느낌이 아니라, 공중에 떠 있는 듯한(Floating) 느낌을 주어 현대적이고 프리미엄한 감성을 전달.
- **Glassmorphism**: 스크롤 시 `backdrop-blur-xl`과 매우 투명한 배경(`bg-background/60`)을 결합하여 컨텐츠 위에 자연스럽게 겹쳐지도록 함.
- **Context-Aware**: 랜딩 페이지 기반 메뉴와 앱 서비스 기반 메뉴를 경로(`pathname`)에 따라 자동으로 전환하여 사용자 혼란을 방지.

## 2. 주요 기능 및 Props (Features & Props)
- **Transparent-to-Glass Transition**: 초기에는 배경이 투명하다가 20px 이상 스크롤 시 부드러운 유리 질감으로 전이됨 (`transition-duration-500`).
- **Dynamic Items**: 
  - `/app`으로 시작하는 경로: 대시보드 전용 메뉴 및 세련된 유저 정보 칩 표시.
  - 그 외 경로: 마켓팅용 메뉴 유도 및 강조된 "무료로 시작하기" 버튼 표시.
- **Active State**: 현재 위치한 페이지의 메뉴 항목에 고정된 언더라인 효과를 주어 시각적 피드백 강화.

## 3. 기술적 세부 사항 (Implementation Details)
- **Framework**: Next.js App Router (`usePathname` 사용).
- **Styling**: Tailwind CSS v4 (`fixed`, `backdrop-blur-xl`, `border-white/5`).
- **Z-Index**: `ScrollExpandMedia`보다 항상 위에 위치하도록 `z-50` 설정.
- **Responsive**: 모바일에서는 카드가 팝업되는 형태의 네비게이션 적용.

## 4. 유지보수 가이드라인
- 새로운 영역(예: 교과 세특)이 정식 출시되면 `navItems` 배열에 경로를 추가할 것.
- 나중에 Supabase Auth 연동 시 `teacher@example.com` 더미 텍스트를 실제 유저 데이터로 교체할 것.
