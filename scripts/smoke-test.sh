#!/usr/bin/env bash
# Usage: scripts/smoke-test.sh <namespace> <expected_env>
set -euo pipefail
NS="$1"
EXPECTED="$2"
PORT="${SMOKE_PORT:-18080}"

echo "[smoke] waiting for rollout in $NS"
kubectl -n "$NS" rollout status deployment/kk-payments --timeout=90s

kubectl -n "$NS" port-forward svc/kk-payments "$PORT:80" >/dev/null 2>&1 &
PF=$!
trap 'kill $PF 2>/dev/null || true' EXIT
sleep 3

for i in $(seq 1 10); do
  BODY=$(curl -fsS "http://127.0.0.1:$PORT/health" || true)
  if echo "$BODY" | grep -q "\"env\":\"$EXPECTED\""; then
    echo "[smoke] $BODY"
    CODE=$(curl -s -o /dev/null -w '%{http_code}' -X POST "http://127.0.0.1:$PORT/payments" -H 'Content-Type: application/json' -d '{"amount":1,"customerId":"smoke"}')
    if [ "$CODE" != "201" ]; then echo "[smoke] FAIL: POST /payments returned $CODE"; exit 1; fi
    echo "[smoke] payments OK (201)"
    echo "[smoke] PASS in $NS"
    exit 0
  fi
  echo "[smoke] attempt $i failed, retrying..."
  sleep 3
done
echo "[smoke] FAIL: /health not OK in $NS"
exit 1
