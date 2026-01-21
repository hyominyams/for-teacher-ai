---
trigger: model_decision
glob: "components/ui/display-elements.tsx"
description: "그리드 및 카드형 전시 컴포넌트의 사용 규칙"
---

# Display Elements Rules

## 1. 개요
- **GridContainer**: 2열 또는 4열의 표준 그리드 레이아웃을 제공하는 컨테이너.
- **DisplayCard**: 이미지와 텍스트를 담는 범용 카드 컴포넌트.

## 2. 디자인 의도
- **Micro-Interaction**: 카드 호버 시 이미지가 `scale-105`로 커지며 입체적인 UX 제공.
- **Visual Rhythm**: `rounded-2xl`과 `shadow-sm`을 사용하여 Tweak CN 테마의 부드러움을 극대화.
- **Typography**: 제목은 `font-bold`, 설명은 `text-muted-foreground`를 사용하여 위계 질서 확립.

## 3. 사용 가이드
- 이미지의 비율은 `aspect-video`를 기본으로 함.
- 텍스트가 너무 긴 경우 `line-clamp`를 통해 레이아웃이 깨지지 않도록 관리함.
