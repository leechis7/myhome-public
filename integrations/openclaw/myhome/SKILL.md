---
name: myhome
description: 내 홈페이지(myhome)의 할 일 · 메모 · 일정을 조회하고 등록한다. 글은 초안(임시저장)으로만 등록한다.
---

# 내 홈페이지(myhome)

사용자의 홈페이지에 할 일 · 메모를 등록하고, 할 일 · 메모 · 일정을 조회한다. 블로그 ·
짧은 글은 **초안(임시저장)으로만** 등록한다 - 공개 · 삭제는 할 수 없으며, 사용자가
홈페이지 관리 화면에서 직접 처리한다.

모든 요청은 `exec` 로 이 스킬의 스크립트를 호출한다. 토큰은 스크립트가 읽는다 -
토큰을 묻거나 출력하지 않는다.

```bash
{baseDir}/scripts/myhome-api.sh <GET|POST> <경로> ['<JSON>']
```

## 할 일

- 목록: `myhome-api.sh GET /api/v1/todos` → `{ open: [...], done: [...] }`.
  `open` 은 마감일이 이른 순서로 정렬된다. 항목은 `title · startOn · dueOn · startTime · endTime`
- 등록(입력한 문장 그대로, 날짜 · 시각은 홈페이지가 해석한다):
  `myhome-api.sh POST /api/v1/todos '{"text":"내일 오후 7시~9시 운동"}'`
- 등록(날짜를 지정하여):
  `myhome-api.sh POST /api/v1/todos '{"title":"보고서 내기","dueOn":"2026-10-17","startTime":"09:00"}'`

## 메모

- 목록: `myhome-api.sh GET '/api/v1/memos?limit=20'`
- 등록: `myhome-api.sh POST /api/v1/memos '{"text":"떠오른 것"}'`

## 일정(조회 전용)

- `myhome-api.sh GET '/api/v1/events?from=2026-10-13&days=7'` - 구글 캘린더에서 조회한
  일정. 종일 일정은 `start · end` 가 날짜, 시각이 지정된 일정은 ISO 시각

## 글 초안

- 짧은 글: `myhome-api.sh POST /api/v1/drafts '{"kind":"note","content":"본문"}'`
- 블로그: `myhome-api.sh POST /api/v1/drafts '{"kind":"post","title":"제목","content":"마크다운 본문","tags":["태그"]}'`
- 등록한 뒤 사용자에게 「임시저장으로 등록했다, 관리 화면에서 확인한 후 공개하라」 고 안내한다

## 준수 사항

- 사용자가 요청한 것만 등록한다. 여러 건을 등록하기 전에는 등록할 내용을 한 번 보여 준다
- 401 이면 토큰이 없거나 변경된 것이다 - 사용자에게 홈페이지 환경설정 › 홈페이지 API 에서
  토큰을 새로 발급하여 이 서버의 토큰 파일에 저장하라고 안내한다
- 할 일 · 메모 내용은 사용자의 개인 기록이다. 다른 대화방 · 다른 사람에게 전달하지 않는다
