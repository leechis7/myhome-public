#!/usr/bin/env bash
# myhome 설치(MYH-202). 터미널에서 묻고 답하며 앱과 DB 를 띄운다.
#
#   curl -fsSL https://raw.githubusercontent.com/leechis7/myhome-public/main/install.sh | bash
#   ./install.sh            저장소를 받은 자리에서
#   ./install.sh --yes      묻지 않고 기본값으로(시험 · 자동화)
#   MYHOME_DATA=folder      데이터를 설치 폴더의 data/ 에(묻지 않을 때도)
#
# 하는 일: Docker 확인 → 몇 가지 묻기 → .env 쓰기(비밀값은 만들어 넣음) →
# compose.yaml 받기 → 이미지 받고 띄우기 → 뜰 때까지 기다렸다가 로그에서
# 「처음 설정 코드」 를 찾아 보여 주기.
#
# 화면은 whiptail(우분투에 기본으로 있음)로 띄우고, 없으면 보통 질문으로 한다.
# 이미 .env 가 있으면 덮어쓰지 않는다 - 비밀값이 바뀌면 DB 와 쿠키가 어긋난다.
set -euo pipefail

# 저장소를 받은 자리에서 돌리면 그 compose.yaml 을 쓴다. 폴더를 옮기기 전에 봐 둔다
HERE=$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" 2>/dev/null && pwd || true)

REPO="${MYHOME_REPO:-leechis7/myhome-public}"
REF="${MYHOME_REF:-main}"
RAW="https://raw.githubusercontent.com/${REPO}/${REF}"

YES=0
for arg in "$@"; do
  case "$arg" in
    -y | --yes) YES=1 ;;
    -h | --help)
      sed -n '2,14p' "$0" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    *)
      echo "모르는 옵션: $arg (--yes, --help)" >&2
      exit 2
      ;;
  esac
done

# curl | bash 로 오면 표준 입력이 스크립트다. 묻는 것은 터미널에서 받는다
TTY=/dev/tty
if [ "$YES" -eq 0 ] && ! { : <"$TTY"; } 2>/dev/null; then
  echo "터미널이 없습니다. 묻지 않고 하려면 --yes 를 붙이세요." >&2
  exit 2
fi

TITLE="myhome 설치"
HAS_WHIPTAIL=0
if [ "$YES" -eq 0 ] && command -v whiptail >/dev/null 2>&1; then HAS_WHIPTAIL=1; fi

say() { printf '\n\033[1m%s\033[0m\n' "$*"; }
die() {
  printf '\n\033[31m%s\033[0m\n' "$*" >&2
  exit 1
}

# 물어서 답을 표준 출력으로. 묻지 않을 때는 기본값
ask() {
  local question="$1" default="$2" answer
  if [ "$YES" -eq 1 ]; then
    printf '%s' "$default"
    return
  fi
  if [ "$HAS_WHIPTAIL" -eq 1 ]; then
    answer=$(whiptail --title "$TITLE" --inputbox "$question" 10 70 "$default" \
      3>&1 1>&2 2>&3 <"$TTY") || die "설치를 그만뒀습니다."
  else
    printf '%s [%s]: ' "$question" "$default" >&2
    read -r answer <"$TTY" || true
  fi
  printf '%s' "${answer:-$default}"
}

# 예/아니오. 기본은 두 번째 인자(yes|no)
confirm() {
  local question="$1" default="$2" answer
  if [ "$YES" -eq 1 ]; then
    [ "$default" = yes ]
    return
  fi
  if [ "$HAS_WHIPTAIL" -eq 1 ]; then
    local flag=()
    [ "$default" = no ] && flag=(--defaultno)
    whiptail --title "$TITLE" "${flag[@]}" --yesno "$question" 12 70 <"$TTY"
    return
  fi
  local hint="Y/n"
  [ "$default" = no ] && hint="y/N"
  printf '%s [%s]: ' "$question" "$hint" >&2
  read -r answer <"$TTY" || true
  answer="${answer:-$([ "$default" = yes ] && echo y || echo n)}"
  [[ "$answer" =~ ^[Yy] ]]
}

note() {
  if [ "$HAS_WHIPTAIL" -eq 1 ]; then
    whiptail --title "$TITLE" --msgbox "$1" 16 74 <"$TTY"
  else
    printf '\n%s\n' "$1"
  fi
}

# 비밀값. openssl 이 없어도 되게 /dev/urandom 을 쓴다
secret() { head -c "$1" /dev/urandom | base64 | tr -d '\n'; }
password() { head -c 64 /dev/urandom | tr -dc 'A-Za-z0-9' | head -c "$1"; }

# --- 1. 준비물 ---------------------------------------------------------
command -v docker >/dev/null 2>&1 ||
  die "Docker 가 없습니다. https://docs.docker.com/engine/install/ 를 보고 먼저 까세요."
docker compose version >/dev/null 2>&1 ||
  die "docker compose(v2) 가 없습니다. Docker 를 새로 깔면 함께 들어옵니다."
docker info >/dev/null 2>&1 ||
  die "Docker 에 닿지 않습니다. 데몬이 떠 있는지, 이 사용자가 docker 그룹인지 보세요(sudo usermod -aG docker \$USER 뒤 다시 로그인)."

[ "$YES" -eq 1 ] || note "myhome 을 설치합니다.

몇 가지를 묻고, 앱과 DB 를 Docker 로 띄웁니다.
DB 비밀번호와 쿠키 열쇠는 묻지 않고 만들어 넣습니다.
끝나면 관리자 비밀번호를 정할 「처음 설정 코드」 를 보여 드립니다."

# --- 2. 묻기 -----------------------------------------------------------
DIR=$(ask "어디에 설치할까요? (설정 파일과 compose.yaml 이 놓입니다)" "${MYHOME_DIR:-$HOME/myhome}")
DIR="${DIR/#\~/$HOME}"
mkdir -p "$DIR"
cd "$DIR"

if [ -f .env ]; then
  say "이미 .env 가 있어 그대로 씁니다: $DIR/.env"
  # 포트만 읽어 둔다(뒤에서 기다릴 때 쓴다)
  PORT=$(grep -E '^PORT=' .env | tail -1 | cut -d= -f2- || true)
  PORT="${PORT:-3000}"
else
  PORT=$(ask "몇 번 포트로 열까요?" "${MYHOME_PORT:-3000}")
  [[ "$PORT" =~ ^[0-9]+$ ]] || die "포트는 숫자여야 합니다: $PORT"
  SITE_URL=$(ask "바깥에서 들어오는 주소는? (도메인이 있으면 https://…, 없으면 그대로)" "http://localhost:${PORT}")
  SECRETS_KEY=""
  if confirm "나만 보는 비밀글을 쓸까요?

쓰면 비밀글을 암호화할 열쇠를 만들어 .env 에 넣습니다.
화면에서 넣는 토큰 · 키(텔레그램 · 카카오 · Gemini)도 이 열쇠로 암호화합니다.
그 열쇠를 잃으면 비밀글을 영영 못 읽습니다 - 따로 보관해야 합니다.
쓰지 않으면 메뉴에서 비밀글이 빠집니다(나중에 켤 수 있음)." no; then
    SECRETS_KEY=$(secret 32)
  fi

  # 데이터를 어디에 둘지. 기본은 Docker 볼륨 - 권한을 Docker 가 맡아 탈이 적다.
  # 설치 폴더에 두면 폴더 하나만 보면 되고 통째로 옮기기 쉽다(README 「데이터는 어디에」)
  DATA_IN_FOLDER=0
  if [ "${MYHOME_DATA:-}" = folder ]; then
    DATA_IN_FOLDER=1
  elif [ "$YES" -eq 0 ] && confirm "DB 와 첨부파일을 이 설치 폴더의 data/ 에 둘까요?

아니오(기본): Docker 볼륨에 둡니다. 권한 걱정이 없습니다.
예: $DIR/data 에 둡니다. 폴더 하나만 보면 되고,
    통째로 옮기거나 담기 쉽습니다(파일 주인은 컨테이너 사용자라
    지우거나 열 때 sudo 가 필요할 수 있습니다)." no; then
    DATA_IN_FOLDER=1
  fi

  umask 077
  cat >.env <<EOF
# myhome 설정. install.sh 가 $(date '+%Y-%m-%d %H:%M') 에 만들었다.
# 비밀값이 들어 있다 - 남에게 보이지 말고, 지우지 말 것(지우면 DB 에 못 붙는다)
POSTGRES_PASSWORD=$(password 32)
SESSION_SECRET=$(secret 32)
SITE_URL=${SITE_URL}
PORT=${PORT}
# 비밀글 열쇠. 비어 있으면 비밀글을 쓰지 않는다. 있으면 따로 보관한다
SECRETS_KEY=${SECRETS_KEY}
# 선택: 처음 관리자 비밀번호. 비우면 /admin 에서 처음 설정 코드로 정한다
ADMIN_PASSWORD=
# 텔레그램 · 카카오 책 검색 · Gemini 요약 · 방문 통계 · Search Console 은
# 관리 › 설정 › 환경설정 에서 넣는다. 여기 적어도 되고, 그러면 이것이 먼저다
# (이름은 README 의 「환경변수」 표)
EOF
  umask 022
  say "설정을 썼습니다: $DIR/.env (권한 600)"
fi

# --- 3. compose.yaml ---------------------------------------------------
if [ -f compose.yaml ]; then
  :
elif [ -n "$HERE" ] && [ -f "$HERE/compose.yaml" ] && [ "$HERE" != "$DIR" ]; then
  cp "$HERE/compose.yaml" compose.yaml
else
  say "compose.yaml 을 받습니다 ($REPO@$REF)"
  curl -fsSL "$RAW/compose.yaml" -o compose.yaml || die "compose.yaml 을 받지 못했습니다: $RAW/compose.yaml"
fi

# 데이터를 설치 폴더에 두기로 했으면 compose.override.yaml 로 볼륨을 폴더로
# 바꾼다. compose.yaml 은 손대지 않는다 - 새로 받아도 이 설정은 남는다
if [ "${DATA_IN_FOLDER:-0}" -eq 1 ] && [ ! -f compose.override.yaml ]; then
  mkdir -p data/db data/uploads data/secrets
  cat >compose.override.yaml <<'EOF'
# 데이터를 설치 폴더의 data/ 에 둔다(install.sh 가 만들었다).
# docker compose 가 compose.yaml 과 함께 저절로 읽는다
services:
  postgres:
    volumes:
      - ./data/db:/var/lib/postgresql
  app:
    volumes:
      - ./data/uploads:/app/storage/uploads
      - ./data/secrets:/app/storage/secrets
EOF
  say "데이터는 $DIR/data 에 둡니다 (compose.override.yaml)"
fi

# --- 4. 띄우기 ---------------------------------------------------------
say "이미지를 받고 띄웁니다. 처음에는 몇 분 걸립니다"
# MYHOME_IMAGE 를 주면 이미 가진 이미지로(시험) - 받지 않는다
[ -n "${MYHOME_IMAGE:-}" ] || docker compose pull --ignore-buildable </dev/null

# 앱은 컨테이너 안에서 node 사용자로 돈다. 설치 폴더의 data/uploads ·
# data/secrets 는 이 계정 것이라, 그대로면 첨부파일을 올릴 수 없다. 이미지로
# 한 번 주인을 넘긴다(sudo 없이). DB 폴더는 postgres 가 스스로 맞춘다
# curl | bash 로 오면 표준 입력이 이 스크립트다. compose run 이 그것을 읽으면
# 남은 스크립트를 삼켜 설치가 말없이 끝난다 - 터미널을 붙이지 않고(-T) 입력을 막는다
if [ -f compose.override.yaml ] && [ -d data/uploads ]; then
  docker compose run --rm -T --no-deps --pull never --user root --entrypoint chown app \
    -R node:node /app/storage/uploads /app/storage/secrets </dev/null
fi

docker compose up -d --no-build --pull never </dev/null

say "앱이 뜨기를 기다립니다"
ok=0
for _ in $(seq 1 60); do
  if curl -fsS -o /dev/null "http://127.0.0.1:${PORT}/" 2>/dev/null; then
    ok=1
    break
  fi
  sleep 2
done
[ "$ok" -eq 1 ] || die "2분이 지나도 앱이 뜨지 않았습니다. docker compose -f $DIR/compose.yaml logs app 을 보세요."

# 비밀번호를 아직 안 정했으면 /admin 이 「정하기」 화면이다. 그때만 로그에서
# 코드를 찾는다 - 로그에는 예전에 찍힌 코드가 남아 있을 수 있다
CODE=""
if curl -fsS "http://127.0.0.1:${PORT}/admin" 2>/dev/null | grep -q '관리자 비밀번호 정하기'; then
  CODE=$(docker compose logs app 2>/dev/null | grep -o '처음 설정 코드: [A-Z0-9-]*' | tail -1 | awk '{print $NF}' || true)
  CODE="${CODE:-(로그에서 찾지 못함 - docker compose logs app | grep 설정)}"
fi
URL=$(grep -E '^SITE_URL=' .env | tail -1 | cut -d= -f2-)
URL="${URL:-http://localhost:${PORT}}"

if [ -n "$CODE" ]; then
  NEXT="이제 브라우저에서 관리자 비밀번호를 정하세요.

  주소     ${URL}/admin
  설치 코드  ${CODE}"
else
  NEXT="관리자 비밀번호는 이미 정해져 있습니다.

  주소     ${URL}/admin"
fi

note "다 됐습니다.

${NEXT}

자주 쓰는 명령 (설치 폴더 ${DIR} 에서)
  docker compose logs -f app       로그 보기
  docker compose down              멈추기(글은 남음)
  docker compose pull && docker compose up -d   새 판으로 올리기
  지우는 법은 README 「멈추기 · 지우기」"

# whiptail 화면은 닫히면 사라지니 터미널에도 남긴다
if [ "$HAS_WHIPTAIL" -eq 1 ]; then
  printf '\n%s\n' "$NEXT"
fi
