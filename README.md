# Agent-Readable Repository Toolkit

## Why

Coding agents waste context discovering architecture and deciding which files
matter. This toolkit separates:

- working instructions in `AGENTS.md`;
- system design in `ARCHITECTURE.md`;
- each source directory's local facts in its own `MODULE.md`;
- machine-readable navigation in `.agent/repo-map.json`; and
- file facts in the first 50 lines of each source file.

Agents can narrow their search before reading complete files.

## How to Use

1. Open `CODING_AGENT_PROMPT.md`.
2. Replace `<CHECKER_PATH>` with the absolute path to
   `check-agent-readability.mjs`.
3. Give the complete prompt to a coding agent running from the target
   repository root.

Use `ROOT_AGENTS_TEMPLATE.md` as an optional starting point for the target
repository's root `AGENTS.md`.

## How to Validate

Node.js 18 or later is required; no npm packages are needed.

```console
node check-agent-readability.mjs PATH_TO_REPOSITORY
node check-agent-readability.mjs PATH_TO_REPOSITORY --format json
```

A repository passes with at least 85 points and no `error` findings. Exit code
`0` means pass, `1` means non-conforming, and `2` means invalid invocation or
configuration.
