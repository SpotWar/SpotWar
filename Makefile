# SpotWar — local dev orchestration.
#
# `make dev` brings up the whole "hello world" slice (EPIC 8 / story 86badf4z6)
# with one command: Supabase, the mock Strava server, the ping-strava Edge
# Function, and the Expo app on web. See README.md → "Local development" for
# prerequisites (Docker must be running) and the end-to-end smoke test.
#
# The orchestrator is this Makefile, by design — there is intentionally no root
# package.json / concurrently.

.DEFAULT_GOAL := help
.PHONY: help dev install down

# Edge runtime runs inside Docker, so it reaches the host's mock Strava server
# (mock-strava on :3000) via host.docker.internal rather than localhost. We
# write this non-secret override into a gitignored env file that
# `supabase functions serve --env-file` feeds to the function.
EDGE_ENV_FILE := supabase/functions/.env

help:
	@echo "SpotWar local dev:"
	@echo "  make dev      Bring up the full local stack (Supabase + mock + edge fn + app web)."
	@echo "  make install  Install mock-strava and app npm dependencies."
	@echo "  make down     Stop the local Supabase stack."
	@echo ""
	@echo "Prereq: Docker must be running (supabase start needs it). See README.md."

# One-time (and idempotent) dependency install for the two npm packages.
install:
	npm --prefix mock-strava install
	npm --prefix app install

# Bring up the whole slice in one shell so the backgrounded services stay alive
# for the lifetime of the foreground Expo process. Ordering matters:
#   1. Supabase first — it needs Docker, applies migrations, and is the slowest
#      to come up; the app and edge function both depend on it.
#   2. The mock Strava server, so the edge function has something to call.
#   3. The ping-strava Edge Function, served from the host CLI with the
#      host.docker.internal override so it can reach the mock.
#   4. The Expo app on web in the foreground — Ctrl-C ends `make dev` and the
#      `trap` tears the background services down. Run `make down` to also stop
#      Supabase (it keeps running in Docker on purpose, so a restart is fast).
dev:
	@echo "==> Starting Supabase (Docker; applies migrations)…"
	npx supabase start
	@echo "==> Writing edge-function env ($(EDGE_ENV_FILE))…"
	@mkdir -p supabase/functions
	@printf 'STRAVA_BASE_URL=http://host.docker.internal:3000\n' > $(EDGE_ENV_FILE)
	@echo "==> Launching mock Strava (:3000), edge fn, and Expo web (:8081)…"
	@trap 'kill 0 2>/dev/null' EXIT; \
		npm --prefix mock-strava run mock & \
		npx supabase functions serve ping-strava --env-file $(EDGE_ENV_FILE) & \
		npm --prefix app run web

down:
	@echo "==> Stopping Supabase…"
	npx supabase stop
