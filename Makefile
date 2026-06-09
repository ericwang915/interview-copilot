# Real Time Interview Copilot — `make run` builds (if needed) and opens the app.

# Project-local Electron cache so a first `npm install` never trips over a
# non-writable global ~/Library/Caches/electron.
export electron_config_cache := $(CURDIR)/.electron-cache

UNAME_S  := $(shell uname -s)
APP_NAME := Real Time Interview Copilot
# ARCH: x64 on Intel, arm64 on Apple Silicon
ARCH     := $(shell uname -m | sed 's/x86_64/x64/')
APP_DIR  := dist/$(APP_NAME)-darwin-$(ARCH)
APP      := $(APP_DIR)/$(APP_NAME).app
STAMP    := dist/.built-$(ARCH)
SRC      := $(shell find src -type f 2>/dev/null) package.json build/icon.icns extend-info.plist

# If a prebuilt Electron zip is cached locally (dev machines), build offline.
ZIP_DIR  := $(firstword $(wildcard .electron-cache/*/))
ZIP_ARG  := $(if $(ZIP_DIR),--electron-zip-dir=$(ZIP_DIR),)
PKG_ARGS := --platform=darwin --app-bundle-id=com.interview.copilot --icon=build/icon.icns \
	--out=dist --overwrite --extend-info=extend-info.plist --prune=true

.DEFAULT_GOAL := run
.PHONY: run dev install app universal test lint format screenshot gif clean help

ifeq ($(UNAME_S),Darwin)
run: $(STAMP) ## Build the app if needed, then open it (full features incl. system audio)
	@open "$(APP)"
	@echo "→ Opened \"$(APP_NAME)\". First run? Enter API keys in Settings (gear), and grant"
	@echo "  System Settings → Privacy & Security → Screen Recording for interviewer audio."
else
run: node_modules ## Launch the app (Linux/Windows dev launch)
	@echo "→ Launching via Electron. First run? Enter API keys in Settings (gear)."
	@echo "  Windows: getDisplayMedia captures system audio (loopback). Linux: pick a"
	@echo "  PulseAudio/PipeWire 'Monitor' source under 'Interviewer audio'."
	npm start
endif

# Rebuild only when sources change. Stamp file (no spaces) is the real target.
$(STAMP): node_modules $(SRC)
	npx --no-install electron-packager . "$(APP_NAME)" --arch=$(ARCH) $(PKG_ARGS) $(ZIP_ARG)
	codesign --force --deep --sign - "$(APP)"
	@mkdir -p dist && touch "$(STAMP)"

dev: node_modules ## Quick dev launch (npm start; system audio needs your terminal granted)
	npm start

install: node_modules ## Install dependencies
node_modules: package.json package-lock.json
	npm install
	@touch node_modules

app: node_modules ## Force a rebuild for this machine's arch, then open
	npx --no-install electron-packager . "$(APP_NAME)" --arch=$(ARCH) $(PKG_ARGS) $(ZIP_ARG)
	codesign --force --deep --sign - "$(APP)"
	@mkdir -p dist && touch "$(STAMP)"
	@open "$(APP)"

universal: node_modules ## Build a universal (x64+arm64) .app, sign & open
	npx --no-install electron-packager . "$(APP_NAME)" --arch=universal $(PKG_ARGS)
	codesign --force --deep --sign - "dist/$(APP_NAME)-darwin-universal/$(APP_NAME).app"
	@open "dist/$(APP_NAME)-darwin-universal/$(APP_NAME).app"

test: node_modules ## Run unit tests
	npm test

lint: node_modules ## Lint with ESLint
	npm run lint

format: node_modules ## Format with Prettier
	npm run format

screenshot: node_modules ## Regenerate README screenshot
	npm run screenshot

gif: node_modules ## Regenerate README demo GIF (needs ffmpeg)
	npm run gif

clean: ## Remove node_modules and build output
	rm -rf node_modules dist

help: ## Show available targets
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN{FS=":.*?## "}{printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2}'
