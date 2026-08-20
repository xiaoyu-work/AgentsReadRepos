# Module: {{module name}}

<!--
Copy this file into a significant directory as MODULE.md.
Replace every {{...}} placeholder with facts local to that directory.
Repository-wide architecture belongs in the root ARCHITECTURE.md.
-->

## Purpose

{{State this directory's specific purpose and boundary.}}

## Responsibilities

- {{Responsibility owned by this module}}
- {{Responsibility explicitly owned elsewhere}}

## Key Files

| Path | Role |
|---|---|
| `{{relative/file/path}}` | {{Specific role and when to read it}} |

Recommended reading order:

1. `{{first/file}}`
2. `{{second/file}}`

## Dependencies

Upstream callers:

- `{{relative/path}}`: {{How it calls this module}}

Downstream dependencies:

- `{{relative/path or external service}}`: {{Why this module depends on it}}

## Tests

| Path or command | Coverage |
|---|---|
| `{{relative/test/path}}` | {{Behavior or boundary covered}} |

