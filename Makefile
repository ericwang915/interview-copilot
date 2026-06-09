# Interview Copilot — convenience targets. Run `make` (or `make run`) to launch.

# Use a project-local Electron download cache so a first-time `npm install`
# never trips over a non-writable global ~/Library/Caches/electron, and to
# keep installs reproducible.
export electron_config_cache := $(CURDIR)/.electron-cache

# Build for THIS machine's architecture (x64 on Intel, arm64 on Apple Silicon).
APP_NAME := Real Time Interview Copilot
ARCH := $(shell uname -m | sed 's/x86_64/x64/')
APP_DIR := dist/$(APP_NAME)-darwin-$(ARCH)

.DEFAULT_GOAL := run
.PHONY: run dev install test lint format package app universal screenshot gif clean help

PKG_ARGS := --platform=darwin --app-bundle-id=com.interview.copilot --icon=build/icon.icns \
	--out=dist --overwrite --extend-info=extend-info.plist --prune=true

run: node_modules ## Install deps if needed, then launch the app
	npm start

dev: node_modules ## Launch with verbose logging
	npm run dev

install: node_modules ## Install dependencies

node_modules: package.json package-lock.json
	npm install
	@touch node_modules

test: node_modules ## Run unit tests
	npm test

lint: node_modules ## Lint with ESLint
	npm run lint

format: node_modules ## Format with Prettier
	npm run format

package: node_modules ## Build & ad-hoc sign a local macOS .app
	npm run package && npm run sign

app: node_modules ## Build (this machine's arch), sign & open the native .app
	npx --no-install electron-packager . "$(APP_NAME)" --arch=$(ARCH) $(PKG_ARGS)
	codesign --force --deep --sign - "$(APP_DIR)/$(APP_NAME).app"
	open "$(APP_DIR)/$(APP_NAME).app"

universal: node_modules ## Build a universal (x64+arm64) .app, sign & open
	npx --no-install electron-packager . "$(APP_NAME)" --arch=universal $(PKG_ARGS)
	codesign --force --deep --sign - "dist/$(APP_NAME)-darwin-universal/$(APP_NAME).app"
	open "dist/$(APP_NAME)-darwin-universal/$(APP_NAME).app"

screenshot: node_modules ## Regenerate README screenshot
	npm run screenshot

gif: node_modules ## Regenerate README demo GIF (needs ffmpeg)
	npm run gif

clean: ## Remove node_modules and build output
	rm -rf node_modules dist

help: ## Show available targets
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN{FS=":.*?## "}{printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2}'
