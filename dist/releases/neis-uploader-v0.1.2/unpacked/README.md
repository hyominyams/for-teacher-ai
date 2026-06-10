# ForTeacher AI NEIS Uploader

Chrome Extension Manifest V3 기반 나이스 입력 자동화 MVP입니다.

## 설치

1. Chrome에서 `chrome://extensions`를 엽니다.
2. 우측 상단의 개발자 모드를 켭니다.
3. `압축해제된 확장 프로그램을 로드`를 누릅니다.
4. 이 저장소의 `extension` 폴더를 선택합니다.

## 웹앱 계정 연결

1. ForTeacher AI 웹앱을 실행합니다.
2. 확장 팝업에서 `웹앱 계정 연결`을 누릅니다.
3. 브리지 화면에서 Google 계정으로 로그인합니다.
4. 확장 팝업을 다시 열고 행특/창체/교과를 선택한 뒤 `웹앱 저장 데이터 불러오기`를 누릅니다.

브리지 기본 주소는 `config.js`의 `appOrigin` 값을 사용합니다.

## 사용

1. 웹앱 저장 데이터 또는 CSV를 불러옵니다.
2. 나이스 입력 화면을 엽니다.
3. 첫 학생 입력칸을 클릭합니다.
4. 확장 팝업에서 `현재 칸부터 쭉 입력`을 누릅니다.
5. 나이스 화면의 보이는 입력칸 순서대로 학생별 결과가 입력됩니다.

## 나이스 화면 확인 시 조정할 부분

나이스 입력칸이 일반 `textarea`가 아니거나 특수 그리드 컴포넌트라면 확장 팝업의 `입력칸 선택자` 또는 `popup.js`의 `runUploaderInPage` 입력 로직을 화면 구조에 맞게 조정해야 합니다.

현재 MVP는 모든 프레임에서 실행되므로 나이스 입력칸이 iframe 안에 있어도, 사용자가 첫 입력칸에 커서를 둔 상태라면 `현재 칸부터 쭉 입력`으로 시작할 수 있습니다.

첨부 DOM 기준 행특 입력칸 기본 선택자는 다음입니다.

```text
.cl-grid-cell[data-cellindex='3'] .cl-textarea:not(.cl-disabled)
```

창의적 체험활동의 자율/자치활동 화면은 붙여넣기 칸이 다른 열에 있어 확장 팝업에서 `창체 - 창의적 체험활동`을 선택하면 다음 선택자를 자동으로 사용합니다.

```text
.cl-grid-cell[data-cellindex='5'] .cl-textarea:not(.cl-disabled)
```

학기말 종합의견(교과) 화면은 `학기말 종합의견` 편집창이 4번 열에 있어 확장 팝업에서 `교과 - 교과 세특`을 선택하면 다음 선택자를 자동으로 사용합니다.

```text
.cl-grid-cell[data-cellindex='4'][aria-label*='학기말 종합의견'] .cl-textarea:not(.cl-disabled), .cl-grid-cell[data-cellindex='4'] .cl-textarea:not(.cl-disabled)
```
