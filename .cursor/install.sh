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

# The committed lockfile intentionally retains the existing React 18/19 type
# package pairing; npm's strict peer resolver rejects that locked tree even
# though TypeScript and the test/build gates pass.  Keep the install exact
# while allowing that existing peer relationship.
npm ci --legacy-peer-deps
npm run typecheck
npm test
npm run build
