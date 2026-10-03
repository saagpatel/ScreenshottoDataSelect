.PHONY: dev build test typecheck clean install

install:
	npm ci --ignore-scripts

dev:
	npm run dev

build:
	npm run build

test:
	npm test

typecheck:
	npm run typecheck

clean:
	rm -rf node_modules dist .next .turbo
