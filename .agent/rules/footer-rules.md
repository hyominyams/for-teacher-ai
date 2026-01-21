---
trigger: model_decision
glob: "components/layout/Footer.tsx"
description: "Footer 컴포넌트의 디자인 의도 및 기능 규칙"
---

# Footer Component Rules

## 1. 디자인 의도 (Design Intent)
- **Subtle but Premium**: 하단 영역인 만큼 눈에 띄지 않게 차분한 배경색(`bg-card/30`)과 작은 텍스트 크기(`text-xs`, `text-[10px]`)를 사용하여 콘텐츠 본체에 집중하게 함.
- **Trustworthiness**: 문의처(이메일)를 명확히 노출하고 개인정보처리방침 등을 강조하여 서비스의 신뢰도를 높임.
- **Informative**: 사용자가 대시보드 내의 다른 영역으로 빠르게 이동할 수 있는 링크를 제공.

## 2. 주요 구성
- **Brand**: 로고 및 서비스 미션 요약.
- **Quick Links**: 서비스 내 주요 카테고리 이동 경로.
- **Contact**: 관리자 이메일(`jhjhpark0800@gmail.com`) 및 문의 안내.
- **Legal**: 카피라이트, 이용약관, 개인정보처리방침 링크 및 버전 정보.

## 3. 구현 규칙
- 이메일 문의처는 `Group` 호버 애니메이션을 사용하여 동적인 인터랙션을 제공함.
- `currentYear`를 동적으로 계산하여 매년 수동 업데이트가 필요 없게 함.
- 반응형 레이아웃(`grid-cols-1 md:grid-cols-3`)을 적용하여 모바일 가독성 확보.
