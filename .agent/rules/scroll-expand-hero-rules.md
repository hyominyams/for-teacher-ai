---
trigger: model_decision
glob: "components/blocks/scroll-expansion-hero.tsx"
description: "스크롤 확장 히어로 컴포넌트의 디자인 및 구현 규칙"
---

# Scroll Expansion Hero Rules

## 1. 디자인 의도 (Design Intent)
- **Immersive Portrait Transition**: 2:3 비율의 세로형(Portrait) 미디어가 스크롤에 따라 화면 전체로 확장되며 압도적인 몰입감을 제공함.
- **Vertical Staggered Typography**: 두 줄의 텍스트가 중앙에 적층되어 시작하되, 상하로 엇갈린 위치(`translateY`)를 가져 시각적 리듬감을 부여함. 
- **Graceful Split**: 스크롤 속도보다 텍스트 이동 속도를 늦춰(`translation multiplier: 70`), 글씨가 아주 천천히 조각나며 컨텐츠를 열어주는 프리미엄한 연출을 지향함.

## 2. 주요 명세 (Key Specifications - Final Calibration)
### Layout & Frame
- **Aspect Ratio**: 2:3 비율 (Portrait) 최적화.
- **Media Size**: 
  - Desktop: Initial Width `400px`, Height `600px`.
  - Mobile: Initial Width `300px`, Height `450px`.
- **Z-Index Hierarchy**: Background(0) < Media(10) < Subtext(20) < Title(30).

### Animation & Physics
- **Scroll Speed (Translation)**: `baseGap(0) + scrollProgress * 70` (Desktop). 아주 느리고 우아한 분리 효과.
- **Vertical Stagger**: 
  - Top Line (titleLeft): `translateY(-6vh)`
  - Bottom Line (titleRight): `translateY(7vh)`
- **Subtext Split**: 메인 타이틀 속도의 40%로 함께 벌어짐 (`translateX(±translation * 0.4)`).

### Typography
- **Font Size**: `xl:text-[8rem]` (2:3 프레임 내 가독성 및 미적 균형을 위해 기존 10rem에서 축소 조정).
- **Subtext Placement**: 영상 영역 밖인 화면 최하단(`bottom-12`)에 고정되어 영상 레이아웃과 분리된 안정감을 제공함.

## 3. 구현 주의사항 (Implementation Rules)
- **Asset Preference**: 1080p 고화질 MP4를 기본으로 하며, 2:3 비율의 세로형 영상을 권장함. 
- **Background Contrast**: 배경 이미지는 `brightness-[0.3]`를 적용하여 흰색 텍스트와의 대비를 극대화함.
- **Text Blend**: `mix-blend-difference`를 적극 활용하여 미디어 확장 시 텍스트 가독성을 보장함.
- **Shadow/Overlay**: 미디어 박스 하단에 강력한 `boxShadow(100px blur)`를 적용하여 하단 컨텐츠와의 경계를 부드럽게 처리함.
- **Unconstrained Container**: 하위 컨텐츠(`children`)를 감싸는 컨테이너는 너비나 패딩 제한이 없도록 설계하여, 각 섹션이 Full-wide 배경을 갖거나 고유의 너비를 정의할 수 있도록 유연성을 보장함.

## 4. 반응형 대응 (Responsive)
- 모바일 프레임은 `300x450`으로 시작하며, 확장 속도는 데스크탑보다 소폭 느린 `multiplier: 60`을 적용하여 작은 화면에서의 어지러움을 방지함.
- 텍스트 크기는 모바일에서 `text-5xl`로 유지하여 가독성을 확보함.
