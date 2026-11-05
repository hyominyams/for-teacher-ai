# Chrome Web Store 게시본 비교 · 2026-11-05

사용자가 요청한 업로드 전 원본 확인을 위해 인증된 개발자 콘솔의 **게시됨 → main.crx**에서 직접 다운로드했습니다. 로컬 ZIP끼리만 비교하지 않았습니다.

- 항목: `kccpnhgkaombpfajdjgonenibmglpcmp` (ForTeacher AI NEIS Uploader)
- 실제 게시 버전: **0.1.6**
- 게시 CRX SHA-256: `84fc1d896cca490971ddee3bb7070efb30d38d33d0c7830a4c1b5b4932c6325a`
- 비교 대상 원본: `dist/releases/neis-uploader-v0.1.6/for-teacher-ai-neis-uploader-v0.1.6.zip`
- 업로드 대상: `dist/releases/neis-uploader-v0.1.7/for-teacher-ai-neis-uploader-v0.1.7.zip`
- 새 ZIP SHA-256: `5cbffe88c9fb82adfe95245e7262520574774a6958847fe117178cad8c64c0a7`

## 원본 동일성

게시 CRX의 모든 원본 파일은 로컬 0.1.6과 바이트 단위로 같습니다. 예외는 Google이 추가한 manifest의 `update_url`, `_metadata/verified_contents.json`, Windows ZIP의 아이콘 경로 구분자 정규화뿐입니다. manifest에서 Google 추가 필드를 제외하면 모든 필드가 같습니다. 다른 기초 파일로 개발한 흔적이나 게시본에만 있는 기능 수정은 발견되지 않았습니다.

## 0.1.7과의 비교

- manifest는 버전 이외에 동일합니다. 권한과 호스트 범위를 넓히지 않았습니다.
- `config.js`와 아이콘은 바이트 단위로 같습니다. 로그인 브리지는 줄바꿈(CRLF→LF) 외에 같습니다.
- 나이스 입력 선택자와 `runUploaderInPage` 전체는 줄바꿈 정규화 후 같습니다. 업로더는 23,989자로, SHA-256은 `119de6d5ede4337d7addff36fe64215b92c9f20c9427cf1308cd7a7a72572322`입니다.
- 동작 변경은 팝업의 저장·보관 작업로그 선택, 페이지 조회, 최신 revision 재확인, 오래된 데이터 무효화, CSV 헤더 지원과 표시 개선입니다.
- README와 manifest 및 런타임에서 참조하지 않는 구형 `content.js`는 배포 ZIP에서 제외했습니다. 실행 의존 파일 누락은 없습니다.
- 새 ZIP은 10개 실행 파일 allowlist·CRC 검증을 통과했고 저장소 소스와 모든 파일이 같습니다.
- 확장 회귀 테스트 11개가 통과했습니다. 기존 브라우저·운영 API 검증 범위는 [0.1.7 릴리스 기록](neis-uploader-v0.1.7.md)을 참고합니다.
- 실제 나이스 계정으로 입력·저장은 하지 않았습니다. 변경하지 않은 입력 코드의 현장 동작까지 새로 검증했다고 주장하지 않습니다.

## 스토어 설명 정합성

기존 스토어 공개사항에서 계정 식별 정보·인증 정보가 누락돼 있어 실제 로그인 세션 처리에 맞춰 표시했습니다. storage와 호스트 권한 설명, 작업로그 사용법도 수정했습니다. 웹사이트 개인정보처리방침에는 0.1.7의 웹 결과 메모리 처리, CSV 로컬 보관, 초기화·연결 해제 구분과 이전 캐시 삭제를 반영했습니다. 확장에 새 데이터 수집 기능이나 새 권한을 추가한 변경은 아닙니다.

Google은 로컬에서만 처리하는 데이터도 공개해야 한다고 안내합니다: [사용자 데이터 FAQ](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq).

## 배포 단계

기존 항목에 검증한 ZIP을 업로드합니다. 새 항목을 생성하지 않습니다. 웹사이트 변경의 운영 배포가 확인된 뒤 스토어의 심사 제출 및 자동 게시 설정을 확인합니다. **심사 접수와 최종 게시 완료는 다른 상태**이며, 최종 상태의 기준은 개발자 콘솔입니다: [업데이트 절차](https://developer.chrome.com/docs/webstore/update).
