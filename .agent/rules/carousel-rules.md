---
trigger: model_decision
glob: "components/ui/carousel.tsx"
description: "캐러셀 컴포넌트의 가이드라인 및 구현 규칙"
---

# Carousel Component Rules

## 1. 디자인 의도 (Design Intent)
- **High-End Motion**: Embla Carousel을 기반으로 부드럽고 끊김 없는 스와이프 경험을 제공.
- **Visual Balance**: 이전/다음 버튼(`CarouselPrevious`, `CarouselNext`)을 아이콘 형태로 배치하여 콘텐츠를 가리지 않으면서 조작 편의성 제공.

## 2. 기술적 사항
- **Client Side**: 반드시 `"use client"` 지시어를 포함해야 함.
- **API Matching**: `embla-carousel` 최신 버전의 타입 시스템과 호환되도록 구성.
- **Responsiveness**: `md:basis-1/2`, `lg:basis-1/3` 등 Tailwind의 `basis` 클래스를 사용하여 기기별 노출 개수 조절.

## 3. 유지보수
- 자동 재생(Autoplay) 플러그인 추가 시 `plugins` prop을 통해 확장 가능하도록 설계됨.
- 캐러셀 내부 아이템 간 간격은 `CarouselContent`의 음수 마진과 `CarouselItem`의 패딩으로 제어함.
