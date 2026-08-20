# Agent-Readable Repository Toolkit

## Why

Coding agents often spend substantial context discovering a repository's
architecture, locating entry points, and deciding which files are relevant.
This toolkit adds:

- repository and directory-level `AGENTS.md` guides;
- a machine-readable `.agent/repo-map.json`; and
- a short `@agent-*` summary in the first 50 lines of each source file.

An agent can use these indexes to narrow its search before reading complete
files.

## How to Use

1. Open `CODING_AGENT_PROMPT.md`.
2. Replace `<CHECKER_PATH>` with the absolute path to
   `check-agent-readability.mjs`.
3. Give the complete prompt to a coding agent running from the target
   repository root.

`ROOT_AGENTS_TEMPLATE.md` is an optional starting point for the target
repository's root `AGENTS.md`. The full requirements are documented in
`AGENT_READABILITY_STANDARD.md`.

## How to Validate

The auditor requires Node.js 18 or later and no npm packages.

```console
node check-agent-readability.mjs PATH_TO_REPOSITORY
```

For machine-readable output:

```console
node check-agent-readability.mjs PATH_TO_REPOSITORY --format json
```

A repository passes when it scores at least 85 out of 100 and has no `error`
findings. Exit code `0` means pass, `1` means the repository does not meet the
standard, and `2` means the command or configuration is invalid.
