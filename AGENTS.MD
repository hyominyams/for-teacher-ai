Always use the OpenAI developer documentation MCP server if you need to work with the OpenAI API, ChatGPT Apps SDK, Codex, or related docs without me having to explicitly ask.

## UI 개편 시 기존 기능 보존

- 사용자가 요청한 핵심 제약: 기존 기능이 유실되지 않도록 한다. UI 개편을 이유로 기능·입력 항목·저장 데이터를 삭제하거나 축소하지 않는다.
- UI 변경 전 `docs/workspace-feature-parity.md`와 해당 영역의 실제 React 구현을 확인한다. 정적 시안은 기능 명세의 기준이 아니며, 시안에 없는 기존 기능도 이식 대상이다.
- 전체 생성·선택 생성·학생별 생성/재생성의 대상 범위와 입력 조건을 보존한다. 창체 임원 직책·기간, 초기화, 자동배정, 가져오기/내보내기, 교과 관리, 저장·불러오기·나이스 연계도 추적한다.
- 기존 저장본의 필드를 UI에서 숨겼다는 이유로 비우거나 저장 과정에서 누락하지 않는다. 특히 창체 임원 정보, 교과별 기록, 윤문 원문·되돌리기 정보를 보존한다.
- 예시 데이터 동작, 실제 기능 연결, 기존 데이터 왕복 검증을 구분해 기록한다. 필요한 기존 기능의 이식·검증이 끝나기 전에는 시안을 기능이 완성된 대체 화면으로 취급하거나 기존 화면을 제거하지 않는다.
- 기존 워드마크, 하늘색 브랜드, 교과 인디고·창체 앰버, 둥근 카드 스타일의 연속성을 유지한다.
