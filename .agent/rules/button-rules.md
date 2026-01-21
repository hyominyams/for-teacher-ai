---
trigger: model_decision
glob: "components/ui/button.tsx"
description: "기본 버튼 컴포넌트의 디자인 및 사용 규칙"
---

# Button Component Rules

## 1. 디자인 의도 (Design Intent)
- **Consistency**: Shadcn/ui 표준을 따르되, Tweak CN 테마의 변수(`primary`, `secondary`, `accent` 등)를 사용하여 서비스 전체의 톤앤매너를 유지함.
- **Premium Feel**: 미세한 그림자(`shadow-sm`)와 부드러운 호버 효과를 적용하여 클릭 가능한 상태임을 명확히 전달.

## 2. Props 및 변형 (Variants)
- **variant**:
  - `default`: 메인 액션 컬러 (Primary) 적용.
  - `outline`: 서브 액션이나 중립적인 버튼에 사용.
  - `ghost`: 네비게이션 트리거 등에 사용.
- **size**: 기본 `default`, 작은 영역을 위한 `sm`, 강조가 필요한 영역을 위한 `lg` 제공.

## 3. 구현 규칙
- `asChild` 속성을 통해 `Link` 컴포넌트나 다른 래퍼와 조합 시 시맨틱한 HTML 구조를 유지할 것.
- 모든 인터렉티브 요소는 접근성을 위해 포커스 링 스타일을 반드시 포함함.
