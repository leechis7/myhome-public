# AI 엔진 붙이기

홈페이지가 AI 에게 묻는 길은 이 폴더 하나로 모인다. 부르는 쪽(책 소개 요약
`lib/books/summary.ts`, 할 일 · 메모 판정 `lib/telegram/classify.ts`)은 엔진을
모른다 - `askAi(프롬프트, 엔진들, { timeoutMs, temperature, schema })` 만 부른다.

| 파일 | 하는 일 |
| --- | --- |
| `engines.ts` | 엔진 목록(이름 · 화면 글자 · 필요한 값)과 차례 · 사용 글(`openclaw,-gemini`) 읽고 쓰기 |
| `index.ts` | `askAi` - 켠 엔진을 차례대로 묻고, 안 되면 다음 것. 다 안 되면 마지막 까닭을 던진다 |
| `gemini.ts` | Gemini 부르기(모델 차례, 생각 끄기, JSON 꼴) |
| `openclaw.ts` | OpenClaw 게이트웨이의 `/v1/chat/completions` 부르기(에이전트를 모델 자리에) |

`lib/site/settings.ts` 의 `siteAi()` 가 환경설정(차례 · 엔진마다의 값)을 읽어
`askAi` 에 넘길 엔진들을 만든다.

## 새 엔진을 붙이려면

예: Claude API 를 `claude` 라는 이름으로.

1. **엔진 목록** - `engines.ts` 의 `AI_ENGINES` 에 한 줄:
   `claude: { label: "Claude", needs: "API 키" }`.
   환경설정 › AI 사용 의 차례 칸에 저절로 나온다(처음은 켬, 맨 뒤)
2. **부르는 파일** - `claude.ts` 에 `askClaude(prompt, access, { timeoutMs, temperature, schema })`.
   글 하나를 묻고 답한 글을 돌려준다. `schema` 를 받으면 그 꼴의 JSON 글을 돌려준다
   (엔진이 강제하지 못하면 `openclaw.ts` 처럼 꼴을 덧붙이고 답에서 `{ … }` 를 떼어 낸다).
   한도 초과는 `new GeminiError("quota")`, 그 밖은 `"error"` 를 던진다 - 화면이 까닭을 알린다
3. **차례 처리** - `index.ts` 의 `AiEngineAccess` 에 `{ engine: "claude"; key: string }` 를,
   `askAi` 에 그 엔진을 부르는 갈래를 더한다
4. **설정 값** - `lib/site/settings.ts` 의 `SETTINGS` 에 `claudeApiKey: { env: "CLAUDE_API_KEY", kind: "secret" }`,
   `siteAi()` 에 `engine === "claude"` 갈래. 마이그레이션은 없다(settings 테이블에 한 줄)
5. **화면** - `components/admin/settings/ConfigFields.tsx` 의 `ROWS` 에 칸 설명,
   `app/admin/settings/page.tsx` 의 「AI 사용」 묶음에 `<ConfigFields names={["claudeApiKey"]} … />`,
   `app/admin/settings/actions.ts` 의 `saveOutsideAction` 에 값 검사
6. **.env · 문서** - `compose.yaml` · `infra/docker-compose.yml` · `.env.example` 셋 · README 의
   설정 표에 `CLAUDE_API_KEY`. 빠지면 `tests/unit/compose-env.test.ts` 가 깨진다
7. **시험** - `tests/unit/ai-engine.test.ts` 에 그 엔진으로 묻기 · 실패하면 다음 엔진으로 넘어가기

## 지킬 것

- 키 · 토큰은 서버에서만 쓴다. 브라우저로 보내지 않는다(화면에도 다시 보이지 않는다)
- 나만 보는 글(일기 · 메모 · 비밀글)을 AI 에 보내는 기능은 따로 켜는 스위치를 둔다
- AI 가 없어도 기능이 돌아야 한다 - 부르는 쪽은 실패하면 규칙 · 줄이기로 간다
