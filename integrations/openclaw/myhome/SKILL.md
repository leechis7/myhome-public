---
name: myhome
description: 내 홈페이지(myhome)의 할 일 · 메모 · 일정을 읽고 넣는다. 글은 초안(임시저장)만 넣는다.
---

# 내 홈페이지(myhome)

사용자의 홈페이지에 할 일 · 메모를 넣고, 할 일 · 메모 · 일정을 읽는다. 블로그 ·
짧은 글은 **초안(임시저장)으로만** 넣는다 - 공개 · 지우기는 할 수 없고, 사람이
홈페이지 관리 화면에서 한다.

모든 요청은 `exec` 로 이 스킬의 스크립트를 부른다. 토큰은 스크립트가 읽는다 -
토큰을 묻거나 출력하지 않는다.

```bash
{baseDir}/scripts/myhome-api.sh <GET|POST> <경로> ['<JSON>']
```

## 할 일

- 목록: `myhome-api.sh GET /api/v1/todos` → `{ open: [...], done: [...] }`.
  `open` 은 마감이 이른 것부터. 항목은 `title · startOn · dueOn · startTime · endTime`
- 넣기(글 그대로, 날짜 · 시각은 홈페이지가 읽는다):
  `myhome-api.sh POST /api/v1/todos '{"text":"내일 오후 7시~9시 운동"}'`
- 넣기(날짜를 정해서):
  `myhome-api.sh POST /api/v1/todos '{"title":"보고서 내기","dueOn":"2026-10-17","startTime":"09:00"}'`

## 메모

- 목록: `myhome-api.sh GET '/api/v1/memos?limit=20'`
- 넣기: `myhome-api.sh POST /api/v1/memos '{"text":"떠오른 것"}'`

## 일정(읽기만)

- `myhome-api.sh GET '/api/v1/events?from=2026-10-13&days=7'` - 구글 캘린더에서 읽은
  일정. 종일 일정은 `start · end` 가 날짜, 시각 일정은 ISO 시각

## 글 초안

- 짧은 글: `myhome-api.sh POST /api/v1/drafts '{"kind":"note","content":"본문"}'`
- 블로그: `myhome-api.sh POST /api/v1/drafts '{"kind":"post","title":"제목","content":"마크다운 본문","tags":["태그"]}'`
- 넣은 뒤 사용자에게 「임시저장으로 넣었다, 관리 화면에서 확인하고 공개하라」 고 알린다

## 지키는 것

- 사용자가 부탁한 것만 넣는다. 여러 개를 넣기 전에는 무엇을 넣을지 한 번 보여 준다
- 401 이면 토큰이 없거나 바뀐 것이다 - 사용자에게 홈페이지 환경설정 › 홈페이지 API 에서
  토큰을 새로 만들어 이 서버의 토큰 파일에 넣으라고 알린다
- 할 일 · 메모 글은 사용자의 개인 기록이다. 다른 대화방 · 사람에게 옮기지 않는다
