# @atlanticrev/atl-formatter

CLI formatter for `js`, `jsx`, `ts`, and `tsx` that changes **only blank lines**.

## What it does

`atl-formatter` enforces a strict blank-line policy for:

- JSX / TSX visual blocks
- block-level statements inside functions and hooks

It does **not** change:

- code logic
- names
- indentation
- quotes
- commas
- semicolons
- any other formatting

## Supported rules

### JSX / TSX

Insert exactly one blank line between adjacent visual blocks on the same nesting level.

Visual blocks include:

- JSX elements
- self-closing tags
- SVG elements
- fragments
- JSX comments
- standalone JSX expressions such as:
  - `{condition && ...}`
  - `{condition ? ... : ...}`
  - `{value ?? ...}`
  - `{items.map(...)}`
  - `{renderActions?.(...)}`
  - `{footer}`
  - `{props.footer}`
  - `{value}`
  - standalone JSX text nodes

### Functions / hooks

Insert exactly one blank line between adjacent statements inside any `BlockStatement`, including:

- function and hook bodies
- nested `if` / `else` blocks
- loop bodies
- `try` / `catch` / `finally` blocks

This covers declarations, calls, guards, `return`, `throw`, and other sibling statements in the same block.

Exception:

- keep a compact two-line `const ...; return ...;` block tight when both statements are single-line

## Non-rules

The formatter does not add blank lines:

- inside JSX props or attributes
- inside one multi-line expression
- inside a compact single-line `const ...; return ...;` pair
- before closing JSX tags
- more than one blank line in a row

## Installation

```bash
npm i -D @atlanticrev/atl-formatter
```

The package is public on npmjs.com and can be installed without a GitHub token.

## CLI usage

### Check files

```bash
atl-formatter --check "src/**/*.{js,jsx,ts,tsx}"
```

### Write changes

```bash
atl-formatter --write "src/**/*.{js,jsx,ts,tsx}"
```

### Run without explicit paths

If no path or glob is passed, the CLI scans:

```text
**/*.{js,jsx,ts,tsx}
```

with default ignores:

- `node_modules`
- `dist`
- `build`
- `.next`
- `coverage`
- `.git`

## npm scripts

### Only this formatter

```json
{
  "scripts": {
    "format:blank-lines": "atl-formatter --write \"src/**/*.{js,jsx,ts,tsx}\"",
    "format:blank-lines:check": "atl-formatter --check \"src/**/*.{js,jsx,ts,tsx}\""
  }
}
```

### Together with Biome

```json
{
  "scripts": {
    "format": "biome format --write . && atl-formatter --write \"src/**/*.{js,jsx,ts,tsx}\"",
    "format:check": "biome check . && atl-formatter --check \"src/**/*.{js,jsx,ts,tsx}\""
  }
}
```

## lint-staged example

```json
{
  "lint-staged": {
    "*.{js,jsx,ts,tsx}": [
      "atl-formatter --write"
    ]
  }
}
```

## Local development

```bash
npm install
npm run verify
```

## Extra docs

- `USAGE.ru.md` — коротко на русском, как подключать и запускать пакет

## Release

Sign in to npmjs.com with an account that can publish under `@atlanticrev`, then run:

```bash
npm run release:patch
```

## Project structure

```text
src/
  cli/
  formatter/
  shared/
tests/
  fixtures/
```

## Current test coverage

The test suite covers:

- adjacent JSX elements
- comments in JSX
- expressions in JSX
- standalone text nodes in JSX
- fragments
- existing single blank line preservation
- blank line collapse to one
- adjacent statements in function bodies
- guard clauses and nested blocks
- `for`, `for...of`, `for...in`, `while`, `do...while`
- CLI check and write flows
- mixed real-world TSX case
- idempotency
