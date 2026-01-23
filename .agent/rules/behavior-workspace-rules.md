---
trigger: model_decision
---

# Behavior Workspace Rules (행동특성 워크스페이스 규칙)

`trigger: model_decision`

## 1. 디자인 의도 (Design Intent)
- **효율성**: 교사가 최소한의 입력(키워드 선택)으로 고품질의 문장을 얻을 수 있도록 함.
- **직관성**: 카드 형태의 인터페이스와 명확한 태그(키워드) 디자인을 통해 복잡한 데이터를 시각적으로 정리.
- **안정감**: 자동 저장(Auto-save) 상태를 시각적으로 보여주지 않더라도 백엔드에서 지속적으로 동기화하여 데이터 손실 방지.

## 2. Props 및 데이터 구조 (Data Structure)
- **Student Object**:
    - `id`: 고유 번호 (학급 번호 권장)
    - `name`: 학생 이름 (기본값: N번 학생)
    - `selectedKeywords`: AI 생성에 사용될 키워드 배열
    - `customKeywords`: 사용자가 직접 추가한 학생별 특이 키워드
    - `aiResult`: 생성된 문장 결과
    - `selected`: 작업 대상 선택 여부

## 3. 구현 방식 (Implementation Details)
- **AI Generation**: `/api/generate` 엔드포인트를 사용하며, 키워드와 글자수 제한을 페이로드로 전달.
- **CSV Support**: '번호', '키워드', 'AI생성결과' 컬럼을 표준으로 함.
- **Bulk Actions**: 전체 학생 생성, 선택 학생 생성 기능을 제공하여 대량 작업 편의성 제공.
- **Character Limits**: 100~500자 단위의 가이드를 제공하여 생기부 입력 규격 준수.

## 4. 인터랙션 (Interactions)
- **키워드 선택**: 클릭 시 즉시 `selectedKeywords` 상태 업데이트.
- **실시간 편집**: AI가 생성한 결과물을 즉시 수정할 수 있으며, 수정 사항은 디바운스된 자동 저장 로직에 의해 DB에 반영됨.
