#!/usr/bin/env bash
set -euo pipefail

# Vite 8 and the committed npm lockfile require a modern supported Node
# runtime.  Keep Cloud builds reproducible by rejecting an incompatible image
# before npm resolves or executes any package.
case "$(node --version)" in
	v22.*) ;;
	*)
		echo "ScreenshottoDataSelect Cursor Cloud setup requires Node 22" >&2
		exit 1
		;;
esac

npm ci
npm run typecheck
npm test
npm run build
