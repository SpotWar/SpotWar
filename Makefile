# SpotWar — local dev orchestration.
#
# `make dev` (= `make web`) brings up the whole "hello world" slice (EPIC 8 /
# story 86badf4z6) with one command: Supabase, the mock Strava server, the
# ping-strava Edge Function, and the Expo app. `make ios` / `make android`
# launch the same backend and target a simulator/emulator instead of web. See
# README.md → "Local development" for prerequisites and the smoke test.
#
# The orchestrator is this Makefile, by design — there is intentionally no root
# package.json / concurrently.

.DEFAULT_GOAL := help
.PHONY: help dev web ios android install down

# Edge runtime runs inside Docker, so it reaches the host's mock Strava server
# (mock-strava on :3000) via host.docker.internal rather than localhost. We
# write this non-secret override into a gitignored env file that
# `supabase functions serve --env-file` feeds to the function.
EDGE_ENV_FILE := supabase/functions/.env

help:
	@echo "SpotWar local dev (Supabase + mock Strava + edge fn, then the app):"
	@echo "  make dev / make web  Run the app on web (:8081). dev is an alias for web."
	@echo "  make ios             Run the app in the iOS Simulator (needs Xcode)."
	@echo "  make android         Run the app in the Android emulator (needs a running AVD)."
	@echo "  make install         Install mock-strava and app npm dependencies."
	@echo "  make down            Stop the local Supabase stack."
	@echo ""
	@echo "Prereq: Docker must be running (supabase start needs it). See README.md."

# One-time (and idempotent) dependency install for the two npm packages.
install:
	npm --prefix mock-strava install
	npm --prefix app install

# Shared "bring the whole slice up" recipe, parameterised by $(1) = the
# foreground app command. Written once so the web/ios/android targets can't
# drift apart — they differ ONLY in that final command. Ordering matters:
#   1. Supabase first — it needs Docker, applies migrations, and is the slowest
#      to come up; the app and edge function both depend on it.
#   2. Seed the gitignored env files (edge fn override + app/.env) if absent.
#   3. The mock Strava server, so the edge function has something to call.
#   4. The ping-strava Edge Function, served from the host CLI with the
#      host.docker.internal override so it can reach the mock.
#   5. The app command (web/ios/android) in the foreground — Ctrl-C ends the
#      run and the `trap` tears the background services down. Run `make down`
#      to also stop Supabase (it keeps running in Docker so a restart is fast).
define UP
	@echo "==> Starting Supabase (Docker; applies migrations)…"
	npx supabase start
	@echo "==> Writing edge-function env ($(EDGE_ENV_FILE))…"
	@mkdir -p supabase/functions
	@printf 'STRAVA_BASE_URL=http://host.docker.internal:3000\n' > $(EDGE_ENV_FILE)
	@echo "==> Seeding app/.env from app/.env.example (first run only)…"
	@test -f app/.env || cp app/.env.example app/.env
	@echo "==> Launching mock Strava (:3000), edge fn, and the app…"
	@trap 'kill 0 2>/dev/null' EXIT; \
		npm --prefix mock-strava run mock & \
		npx supabase functions serve ping-strava --env-file $(EDGE_ENV_FILE) & \
		$(1)
endef

# Web (default). `dev` is kept as a back-compat alias.
dev: web
web:
	$(call UP,npm --prefix app run web)

# iOS Simulator shares the host loopback, so the app's localhost Supabase URL
# (from app/.env) works as-is — no override needed.
ios:
	$(call UP,npm --prefix app run ios)

# The Android emulator can't reach the host's `localhost`; 10.0.2.2 is its
# built-in alias for the host. We pass the Supabase URL as a shell env var so it
# overrides app/.env WITHOUT the user editing that file — Expo's env loader does
# not overwrite an EXPO_PUBLIC_* already present in the system environment, so
# the shell value wins and the bundle ends up with 10.0.2.2.
android:
	$(call UP,EXPO_PUBLIC_SUPABASE_URL=http://10.0.2.2:54321 npm --prefix app run android)

down:
	@echo "==> Stopping Supabase…"
	npx supabase stop
