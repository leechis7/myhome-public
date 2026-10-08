# 기여하기 (Contributing)

이슈 · PR 모두 고맙게 받습니다. 다만 이 저장소는 조금 특이하게 돌아갑니다.

## 이 저장소는 「내보낸 사본」 입니다

개발은 비공개 원본 저장소에서 하고, 이 공개 저장소는 **릴리스마다 한 커밋씩**
받습니다. 그래서

- PR 은 **여기서 합치지(Merge) 않습니다.** 받기로 하면 원본으로 가져가 다음
  판에 싣고, PR 에는 「vX.Y.Z 에 들어갔습니다」 를 적고 닫습니다
- 공개 이력에는 그 판의 커밋에 `Co-authored-by:` 로 이름이 남습니다
- 합쳐지지 않고 닫혀도 거절이 아닙니다 — 닫힌 이유를 꼭 적습니다

## 순서

1. **큰 변경은 이슈부터** 열어 주세요. 방향이 맞는지 먼저 이야기하는 편이 서로
   시간을 아낍니다. 오타 · 작은 버그는 바로 PR 해도 됩니다
2. PR 은 `main` 에 대고, 한 PR 에 한 가지만
3. 아래 검사가 통과해야 합니다(PR 을 열면 CI 가 같은 것을 돌립니다)

## 로컬에서 돌리기

Node 24 와 PostgreSQL 이 필요합니다.

```bash
npm install
cp .env.example .env.local     # DATABASE_URL · SESSION_SECRET 을 채운다
npm run db:migrate
npm run dev                    # http://localhost:40002
```

```bash
npm run lint
npm run typecheck
npm test                       # 단위 시험
npm run test:e2e               # 브라우저 시험. 개발 서버가 떠 있어야 한다
```

브라우저 시험은 글을 만들고 지웁니다. **운영 DB 에 대고 돌리지 마세요.**

## 쓰는 방식

- 화면 글자는 한국어입니다. 둘레의 말투와 낱말을 따라 주세요
- 코드 · 주석도 둘레를 따릅니다
- DB 를 바꾸면 `drizzle/` 에 마이그레이션을 더합니다(이미 있는 것은 고치지 않음)
- 시험 값에 실제 개인 정보(이름 · 메일 · 전화번호 등)를 넣지 마세요

## 라이선스

기여한 것은 이 저장소와 같은 [AGPL-3.0](LICENSE) 으로 나갑니다.

---

Issues and PRs are welcome. This repository is an export of a private source
repo: PRs are not merged here but carried into the next release (you are
credited with `Co-authored-by`). Please open an issue before large changes.
Contributions are licensed under AGPL-3.0.
