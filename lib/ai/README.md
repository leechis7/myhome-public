# AI 엔진 연동

홈페이지가 AI 에 요청하는 경로는 이 폴더 하나로 모인다. 호출하는 쪽(책 소개 요약
`lib/books/summary.ts`, 할 일 · 메모 분류 `lib/telegram/classify.ts`)은 엔진을
알지 못한다 - `askAi(프롬프트, 엔진들, { timeoutMs, temperature, schema })` 만 호출한다.

| 파일 | 역할 |
| --- | --- |
| `engines.ts` | 엔진 목록(이름 · 표시 이름 · 필요한 값)과 순서 · 사용 설정 문자열(`openclaw,-gemini`) 읽기 및 쓰기 |
| `index.ts` | `askAi` - 활성화된 엔진에 순서대로 요청하고, 실패하면 다음 엔진으로 넘어간다. 모두 실패하면 마지막 오류 원인을 던진다 |
| `gemini.ts` | Gemini 호출(모델 순서, 사고(thinking) 비활성화, JSON 형식) |
| `openclaw.ts` | OpenClaw 게이트웨이의 `/v1/chat/completions` 호출(에이전트를 모델 자리에 지정) |

`lib/site/settings.ts` 의 `siteAi()` 가 환경설정(순서 · 엔진별 값)을 읽어
`askAi` 에 전달할 엔진 목록을 구성한다.

## 새 엔진을 추가하려면

예: Claude API 를 `claude` 라는 이름으로 추가하는 경우.

1. **엔진 목록** - `engines.ts` 의 `AI_ENGINES` 에 한 줄을 추가한다:
   `claude: { label: "Claude", needs: "API 키" }`.
   환경설정 › AI 사용 의 순서 입력란에 자동으로 표시된다(기본값 켜짐, 맨 뒤)
2. **호출 파일** - `claude.ts` 에 `askClaude(prompt, access, { timeoutMs, temperature, schema })`.
   텍스트 하나로 요청하고 응답 텍스트를 반환한다. `schema` 를 받으면 해당 형식의 JSON 텍스트를 반환한다
   (엔진이 형식을 강제하지 못하면 `openclaw.ts` 처럼 형식 설명을 덧붙이고 응답에서 `{ … }` 를 추출한다).
   한도 초과는 `new GeminiError("quota")`, 그 밖의 경우는 `"error"` 를 던진다 - 화면이 원인을 안내한다
3. **순서 처리** - `index.ts` 의 `AiEngineAccess` 에 `{ engine: "claude"; key: string }` 를,
   `askAi` 에 해당 엔진을 호출하는 분기를 추가한다
4. **설정 값** - `lib/site/settings.ts` 의 `SETTINGS` 에 `claudeApiKey: { env: "CLAUDE_API_KEY", kind: "secret" }`,
   `siteAi()` 에 `engine === "claude"` 분기. 마이그레이션은 없다(settings 테이블에 한 행)
5. **화면** - `components/admin/settings/ConfigFields.tsx` 의 `ROWS` 에 입력란 설명,
   `app/admin/settings/page.tsx` 의 「AI 사용」 그룹에 `<ConfigFields names={["claudeApiKey"]} … />`,
   `app/admin/settings/actions.ts` 의 `saveOutsideAction` 에 값 검증
6. **.env · 문서** - `compose.yaml` · `infra/docker-compose.yml` · `.env.example` 세 곳 · README 의
   설정 표에 `CLAUDE_API_KEY`. 누락되면 `tests/unit/compose-env.test.ts` 가 실패한다
7. **테스트** - `tests/unit/ai-engine.test.ts` 에 해당 엔진으로 요청하기 · 실패 시 다음 엔진으로 넘어가기

## 준수 사항

- 키 · 토큰은 서버에서만 사용한다. 브라우저로 전송하지 않는다(화면에도 다시 표시하지 않는다)
- 본인만 보는 글(일기 · 메모 · 비밀글)을 AI 에 전송하는 기능은 별도의 활성화 스위치를 둔다
- AI 가 없어도 기능이 동작해야 한다 - 호출하는 쪽은 실패하면 규칙 기반 처리 · 축약으로 대체한다
