# AI Governance Log

AI tool used: Claude (Anthropic), via chat, 2026-11-13 to 2026-11-14.
All AI-generated files are listed below. Every entry was verified by running it.

## Entry 1 — Jenkinsfile and smoke test
1. **Date / tool:** 2026-11-14, Claude
2. **Task:** Pipeline with staging deploy, smoke test, approval gate and production deploy
3. **What AI produced:** `Jenkinsfile`, `scripts/smoke-test.sh`
4. **What it got wrong:** The approval `input` has a 30-minute timeout, but the AI never said the reviewer must approve within that window. Build #4 sat at the gate unnoticed and ended ABORTED. The AI also didn't anticipate that an old Jenkins job's stuck builds were holding both executors, so builds #2 and #3 never started.
5. **How I verified:** Build #5 ran green end to end, with smoke PASS in staging (`env=staging`) and production (`env=production`). Build #6 (fault demo) failed at the smoke test, rolled back staging and skipped the approval gate.
6. **Change I made:** Disabled the stale old job and cleared the queue; documented the timeout in the README (section 5).
7. **Governance checklist item:** Human approval before production. A reason is required and recorded.
8. **Follow-up:** Send a notification when the gate is waiting.

## Entry 2 — Image build on minikube
1. **Date / tool:** 2026-11-14, Claude
2. **Task:** Build the kk-payments image so the cluster can run it
3. **What AI produced:** Instructions to build with `eval $(minikube docker-env)` + `docker build`
4. **What it got wrong:** The AI assumed minikube used the Docker runtime. It runs containerd, so the build failed (`failed to inspect pulled image moby/buildkit`) and the pods were stuck in `ContainerCreating`.
5. **How I verified:** Read the error, then ran `minikube image ls | grep kk-payments` after the fix.
6. **Change I made:** Switched to `minikube image build`, and used the same command in the Jenkinsfile.
7. **Governance checklist item:** AI output is tested before it's used.
8. **Follow-up:** Use a real registry for a multi-node cluster.

## Entry 3 — Prometheus alert test
1. **Date / tool:** 2026-11-14, Claude
2. **Task:** Alert on a kk-payments health signal
3. **What AI produced:** `monitoring/alert-rules.yaml` (pod-restart rule) and a fault-injection command
4. **What it got wrong:** The first test steps didn't say how long to wait. The fault was undone after about 30 seconds with 0 restarts, so the alert stayed INACTIVE.
5. **How I verified:** Re-ran the fault and waited until restarts reached 5. Prometheus showed `KkPaymentsPodRestarting` FIRING for both staging pods.
6. **Change I made:** Waited the full window before undoing; re-applied the manifest instead of using `rollout undo`.
7. **Governance checklist item:** Monitoring is verified against a real failure, not assumed.
8. **Follow-up:** Add an Alertmanager receiver.
