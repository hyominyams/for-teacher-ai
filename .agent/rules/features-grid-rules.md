---
trigger: model_decision
glob: "components/blocks/features-grid.tsx"
description: "그리드 및 카드형 특징(Features) 전시 컴포넌트의 사용 규칙"
---

# Features Grid Rules

## 1. 디자인 의도 (Design Intent)
- **Premium Card Aesthetics**: 단순한 텍스트 나열이 아닌, 아이콘과 카드를 결합하여 서비스의 핵심 가치를 시각적으로 강조함.
- **Micro-Interactions**: 호버 시 카드의 배경색이 미세하게 밝아지고 아이콘이 살짝 회전/확대되는 효과(`group-hover`)를 통해 생동감 있는 사용자 경험을 제공함.
- **Glassmorphism Lite**: `bg-white/[0.02]`와 `border-white/5`를 사용하여 어두운 배경 위에서 은은하고 고급스러운 투명감을 연출함.

## 2. 주요 명세 (Key Specifications)
### Layout
- **2x2 Grid**: 데스크탑 기준 `grid-cols-2` 구성을 유지하여 정보의 밀도를 최적화함. 모바일에서는 자동으로 `grid-cols-1`로 전환됨.
- **Spacious Padding**: 카드 내부 패딩(`p-8`)을 충분히 주어 컨텐츠 간의 호흡을 확보함.

### Typography
- **Title**: `text-xl font-bold`와 `tracking-tight`를 적용하여 가독성과 심미성을 동시에 잡음.
- **Description**: `text-muted-foreground`를 사용하여 제목과의 시각적 위계를 명확히 함.

### Icons
- **Icon Container**: 부드러운 라운딩(`rounded-2xl`)과 저채도의 배경색(`bg-opacity-10`)을 사용하여 아이콘이 강조되도록 함.
- **Lucide Icons**: 정밀한 선형 아이콘을 사용하여 모던한 느낌을 유지함.

## 3. 구현 주의사항 (Implementation Rules)
- **Motion Viewport**: `whileInView`와 `viewport={{ once: true }}`를 사용하여 사용자가 스크롤하여 해당 영역에 도달했을 때만 순차적으로 나타나도록 함.
- **Color Harmony**: 각 카드의 아이콘 배경색과 아이콘 색상은 서로 보완 관계에 있는 톤으로 설정하여 전체적인 조화를 고려함.
- **Consistent Height**: 카드의 높이가 내부 컨텐츠 양에 관계없이 일관되게 보이도록 `h-full` 또는 적절한 그리드 설정을 유지함 (현재는 유동적이나 레이아웃 파괴 방지).

## 4. 반응형 대응 (Responsive)
- 모바일에서는 패딩이 줄어드나 텍스트 크기는 가독성을 위해 유지함.
- 스크롤 시 나타나는 애니메이션의 딜레이(`idx * 0.1`)를 통해 모바일에서도 자연스러운 시각적 흐름을 유지함.
