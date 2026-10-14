#!/usr/bin/env bash
# 내 홈페이지(myhome) API 부르기(MYH-247). 오픈클로 스킬 「myhome」 이 쓴다.
#
#   myhome-api.sh <GET|POST> <경로> ['<JSON>']
#
# 주소: MYHOME_URL(없으면 http://127.0.0.1:40000 - 같은 서버의 운영 앱)
# 토큰: MYHOME_API_TOKEN, 없으면 ~/.config/myhome/api-token 파일(권한 600)
#       홈페이지 환경설정 › 홈페이지 API 에서 만든다. 출력하지 않는다
set -euo pipefail

method="${1:?GET 또는 POST}"
path="${2:?/api/v1/… 경로}"
body="${3:-}"
case "$method" in GET | POST) ;; *) echo "GET · POST 만 됩니다" >&2; exit 2 ;; esac
case "$path" in /api/v1/*) ;; *) echo "경로는 /api/v1/ 로 시작합니다" >&2; exit 2 ;; esac

url="${MYHOME_URL:-http://127.0.0.1:40000}"
token="${MYHOME_API_TOKEN:-}"
if [ -z "$token" ] && [ -r "$HOME/.config/myhome/api-token" ]; then
  token="$(tr -d '[:space:]' < "$HOME/.config/myhome/api-token")"
fi
[ -n "$token" ] || { echo "토큰이 없습니다: ~/.config/myhome/api-token" >&2; exit 3; }

args=(-sS --max-time 60 -X "$method" -H "Authorization: Bearer $token" -w '\n%{http_code}\n')
[ -n "$body" ] && args+=(-H 'Content-Type: application/json' --data "$body")
curl "${args[@]}" "$url$path"
