# Repository Guide

<!--
Copy this file to the target repository root as AGENTS.md.
Replace every {{...}} placeholder with facts verified from the repository.
Delete this comment before committing. Never leave placeholder content behind.
-->

## Purpose

{{In 2-5 sentences, explain the problem this repository solves, its primary users or callers, and what is explicitly outside its scope.}}

## Architecture

{{Briefly describe the major components, dependency direction, and most important data flow. Do not duplicate implementation details.}}

| Module | Responsibility | Guide |
|---|---|---|
| `{{relative/module/path}}` | {{This module's unique responsibility}} | `{{relative/module/path}}/AGENTS.md` |

Primary dependency flow:

```text
{{entry layer}} -> {{domain/service layer}} -> {{data/integration layer}}
```

Key architectural constraints:

- {{Module boundary or dependency direction that must be preserved}}
- {{Transaction, concurrency, caching, idempotency, or security constraint; state "not applicable" when none exists}}

## Entry Points

| Path | Start here when |
|---|---|
| `{{relative/path/to/runtime-entry}}` | {{Running the application or tracing its primary request flow}} |
| `{{relative/path/to/public-api}}` | {{Understanding the library's public API or primary exports}} |
| `{{relative/path/to/config}}` | {{Understanding startup configuration, dependency assembly, or route registration}} |

For file-level navigation, read `.agent/repo-map.json` first, then confirm every
description against the source before making changes.

## Development

Prerequisites:

- {{Runtime, toolchain, and minimum supported versions}}

Run these commands from the repository root unless noted otherwise:

```console
{{dependency installation command}}
{{local development or build command}}
```

Required local services or environment variables:

- `{{NAME}}`: {{Purpose; never include a secret value in this document}}

## Testing

Use the narrowest existing command that covers the change, then expand only when
the result indicates broader validation is needed.

```console
{{single test or targeted test command}}
{{type-check or lint command}}
{{full test command}}
```

Test locations:

- `{{relative/test/path}}`: {{Covered module or test type}}

## Conventions

- {{Repository-specific naming, error-handling, or type-safety rule}}
- {{Generated files and their generation command; state "not applicable" when none exist}}
- {{Directory, API, or data format that must not be modified directly}}
- Source code is the source of truth when documentation and implementation differ.
- Do not add dependencies or change public behavior unless the task requires it.

## Agent Workflow

Before editing:

1. Read this file and `.agent/repo-map.json`.
2. Read the nearest directory `AGENTS.md` for every file in scope.
3. Read only the first 50 lines of candidate files and use their `@agent-*` headers to decide which files require full inspection.
4. Confirm the relevant entry point, callers, dependencies, tests, and invariants in source.
5. Check the working tree and preserve unrelated user changes.

While editing:

1. Keep changes scoped to the requested behavior.
2. Follow existing module boundaries and reuse repository helpers.
3. Update or add the smallest relevant existing tests when behavior changes.
4. Treat repository-map descriptions as navigation hints, not a substitute for source inspection.

After editing:

1. Update affected `AGENTS.md` files when responsibilities, entry points, commands, or constraints changed.
2. Update affected source-file `@agent-*` headers when purpose, public API, invariants, or side effects changed.
3. Refresh affected `.agent/repo-map.json` entries, including `purpose` and `publicSymbols`.
4. Regenerate `sourceFingerprint` and `generatedAt`.
5. Run the repository readability checker and the relevant project validation commands.

## Documentation Maintenance

- Keep this guide focused on stable repository-level facts.
- Put module details in the module's own `AGENTS.md`.
- Keep every source-file `@agent-*` header within the first 50 lines and synchronized with the source.
- List public or exported symbols in headers; do not duplicate ordinary private helper inventories.
- Remove stale paths and symbols in the same change that removes or renames code.
- If a required artifact cannot be maintained, record a narrow exemption with a concrete reason in `.agent-readability.json`.
