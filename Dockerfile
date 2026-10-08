# syntax=docker/dockerfile:1

# myhome 앱 이미지. Next.js standalone 출력을 사용해 런타임 이미지를 작게 유지한다.
# 빌드: ./scripts/build-image.sh

# --- 의존성 -------------------------------------------------------------
FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# --- 빌드 ---------------------------------------------------------------
FROM node:24-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# --- 런타임 -------------------------------------------------------------
FROM node:24-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    TZ=Asia/Seoul

# standalone 출력은 실행에 필요한 node_modules만 포함한다
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
# public/ 은 비어 있어도 폴더가 있어야 한다. 없으면 이 단계에서 빌드가 깨진다.
COPY --from=builder --chown=node:node /app/public ./public

# 마이그레이션을 이 이미지 안에서 돌린다. 서버에 소스를 두지 않기 위해서다.
# drizzle-kit(개발 의존성)은 넣지 않고, 이미 들어 있는 postgres 드라이버로
# SQL을 적용하는 작은 실행기를 쓴다.
COPY --from=builder --chown=node:node /app/drizzle ./drizzle
COPY --from=builder --chown=node:node /app/scripts/migrate.mjs ./scripts/migrate.mjs
# 앱 코드에서는 postgres 드라이버가 번들에 들어가 standalone 의 node_modules 에는
# 남지 않는다. 마이그레이션 실행기는 모듈로 불러 쓰므로 따로 넣어 준다.
# postgres.js 는 의존성이 없어 폴더 하나로 끝난다.
COPY --from=deps --chown=node:node /app/node_modules/postgres ./node_modules/postgres

# 올린 파일 자리. 이름 붙은 볼륨(compose.yaml)은 처음 붙을 때 이 디렉터리의
# 주인을 이어받는다 - 없으면 root 것이 되어 앱(node)이 쓰지 못한다(MYH-173)
RUN mkdir -p /app/storage/uploads /app/storage/secrets \
    && chown -R node:node /app/storage

USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:3000/ || exit 1

CMD ["node", "server.js"]
