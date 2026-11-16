# 기여하기 (Contributing)

이슈 · PR 모두 환영합니다. 다만 이 저장소는 다소 특수한 방식으로 운영됩니다.

## 이 저장소는 「내보낸 사본」 입니다

개발은 비공개 원본 저장소에서 진행하고, 이 공개 저장소는 **릴리스마다 한 커밋씩**
반영됩니다. 따라서

- PR 은 **이곳에서 병합(Merge)하지 않습니다.** 수락하기로 하면 원본 저장소로 가져가 다음
  버전에 포함하고, PR 에는 「vX.Y.Z 에 들어갔습니다」 를 남기고 닫습니다
- 공개 이력에는 해당 버전의 커밋에 `Co-authored-by:` 로 이름이 기록됩니다
- 병합되지 않고 닫혀도 거절이 아닙니다 — 닫은 이유를 반드시 남깁니다

## 절차

1. **큰 변경은 이슈부터** 열어 주세요. 방향이 맞는지 먼저 논의하는 편이 서로
   시간을 절약합니다. 오타 · 작은 버그는 바로 PR 을 보내도 됩니다
2. PR 은 `main` 을 대상으로 하고, 한 PR 에는 한 가지 변경만 담습니다
3. 아래 검사를 통과해야 합니다(PR 을 열면 CI 가 동일한 검사를 실행합니다)

## 로컬에서 실행하기

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

브라우저 테스트는 글을 생성하고 삭제합니다. **운영 데이터베이스를 대상으로 실행하지 마세요.**

## 작성 규칙

- 화면 문구는 한국어입니다. 주변 코드의 어조와 용어를 따라 주세요
- 코드 · 주석도 주변 코드의 방식을 따릅니다
- 데이터베이스를 변경하면 `drizzle/` 에 마이그레이션을 추가합니다(기존 마이그레이션은 수정하지 않음)
- 테스트 값에 실제 개인 정보(이름 · 메일 · 전화번호 등)를 넣지 마세요

## 라이선스

기여한 내용은 이 저장소와 같은 [AGPL-3.0](LICENSE) 으로 배포됩니다.

---

Issues and PRs are welcome. This repository is an export of a private source
repo: PRs are not merged here but carried into the next release (you are
credited with `Co-authored-by`). Please open an issue before large changes.
Contributions are licensed under AGPL-3.0.
