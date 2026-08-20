# Agent Instructions

<!--
Copy this file to the target repository root as AGENTS.md.
Replace every {{...}} placeholder with verified repository facts.
Delete this comment before committing.

Do not put architecture in this file. Architecture belongs in ARCHITECTURE.md.
-->

## Repository Documents

Read these sources in order:

1. `ARCHITECTURE.md` for system purpose, components, dependency rules, data
   flow, entry points, and cross-cutting constraints.
2. `.agent/repo-map.json` for machine-readable module and file navigation.
3. The nearest `MODULE.md` for directory-specific responsibilities, key files,
   dependencies, and tests.
4. Candidate source-file `@agent-*` headers before reading full files.

## Development

Prerequisites:

- {{Runtime, toolchain, and minimum supported versions}}

Run from the repository root unless noted otherwise:

```console
{{dependency installation command}}
{{local development or build command}}
```

Required local services or environment variables:

- `{{NAME}}`: {{Purpose; never include secret values}}

## Testing

Use the narrowest existing command that covers the change. Expand validation
only when the result or change scope requires it.

```console
{{targeted test command}}
{{type-check or lint command}}
{{full test command}}
```

## Conventions

- {{Repository-specific naming, error-handling, or type-safety rule}}
- {{Generated files and their generation command, or "not applicable"}}
- {{Directory, API, or data format that must not be modified directly}}
- Source code is authoritative when documentation and implementation differ.
- Do not add dependencies or change public behavior unless the task requires it.

## Agent Workflow

Before editing:

1. Read this file, `ARCHITECTURE.md`, and `.agent/repo-map.json`.
2. Read the nearest applicable `MODULE.md` for every file in scope.
3. Read only the first 50 lines of candidate files and use their `@agent-*`
   headers to decide which files require full inspection.
4. Confirm relevant callers, dependencies, tests, and invariants in source.
5. Preserve unrelated user changes.

While editing:

1. Keep changes scoped to the requested behavior.
2. Follow documented dependency rules and existing module boundaries.
3. Reuse repository helpers and preserve type safety.
4. Run or update the smallest relevant existing tests when behavior changes.
5. Treat documentation as navigation, not a substitute for source inspection.

After editing:

1. Apply the documentation triggers below.
2. Run the repository-map generator after source, source-header, or module-guide changes.
3. Run the repository readability auditor and relevant project validation.

## Documentation Updates

| Change | Required update |
|---|---|
| Source-file purpose, API, invariant, or side effect changes | Update that file's `@agent-*` header, then regenerate the repository map. |
| Public or exported symbol changes | Update `@agent-public-api`, then regenerate the repository map. |
| File is added, deleted, renamed, moved, or split | Update the nearest applicable `MODULE.md`, then regenerate the repository map. |
| Module responsibility, dependencies, key files, or tests change | Update that module's `MODULE.md`. Update `ARCHITECTURE.md` only when the system-level design also changes. |
| Components, dependency rules, data flow, entry points, or cross-cutting constraints change | Update `ARCHITECTURE.md`. |
| Development commands, test commands, conventions, or agent workflow change | Update this `AGENTS.md`. |

Documentation updates are part of the code change. Do not leave stale
architecture, paths, symbols, responsibilities, or commands for a later agent.
Never edit `.agent/repo-map.json` manually.
