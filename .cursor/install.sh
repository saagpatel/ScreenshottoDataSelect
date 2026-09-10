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

# Aligning React and react-dom on 19 is required for component tests, but
# npm's strict peer resolver still rejects other locked peer relationships
# (Testing Library, CRXJS). Keep the install exact while allowing those.
npm ci --legacy-peer-deps
npm run typecheck
npm test
npm run build
