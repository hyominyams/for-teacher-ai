# Creative Activity Workspace Rules (창체활동 워크스페이스 규칙)

`trigger: model_decision`

## 1. 디자인 의도 (Design Intent)
- **통합 관리**: 자율, 동아리, 봉사, 진로 등 다양한 창체 영역을 하나의 로직으로 처리.
- **역할 강조**: 임원 활동(반장, 부반장 등)과 활동 기간을 별도의 UI 필드로 제공하여 문장에 정확히 반영되도록 함.
- **일관성**: 행동특성 워크스페이스와 동일한 레이아웃 구조를 사용하여 교사의 학습 비용 최소화.

## 2. Props 및 데이터 구조 (Data Structure)
- **Student Object (Extends Behavior)**:
    - `participatedEvents`: 참여한 행사/활동 리스트 (키워드로 활용)
    - `officerRole`: 학급/동아리 직책 (예: "반장", "임원아님")
    - `officerPeriod`: 활동 기간 (예: "1학기", "1년")

## 3. 구현 방식 (Implementation Details)
- **Event Pool**: `CREATIVE_CATEGORIES` 상수를 참조하여 영역별 고정된 이벤트 리스트 제공.
- **AI Logic**: 직책과 기간이 입력된 경우, 활동 내용과 결합하여 "XX로서 언제부터 언제까지 활동하며..." 식의 문구성 유도.
- **CSV Support**: '번호', '참여행사', '임원여부', '임원기간' 컬럼 지원.

## 4. 인터랙션 (Interactions)
- **카테고리 탭**: 영역(자율/동아리 등) 이동 시 선택 가능한 이벤트 리스트 동적으로 변경.
- **자동 완성**: '무작위 행사 배정' 기능을 통해 테스트 데이터나 빠른 초안 작성을 도움.
- **일관된 UI**: '선택 일괄 적용' 기능은 Header의 Popover 형태로 제공하여 다른 워크스페이스와 통일성 유지.
