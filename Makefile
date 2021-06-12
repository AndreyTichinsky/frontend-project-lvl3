publish:
	npm publish --dry-run

lint: 
	npx eslint .

develop:
	npx webpack serve --open --hot --mode development

install:
	npm ci

build:
	rm -rf dist
	NODE_ENV=production npx webpack

test:
	npm test

test-coverage:
	npm test -- --coverage --coverageProvider=v8

.PHONY: test