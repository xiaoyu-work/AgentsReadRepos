# Architecture

<!--
Copy this file to the target repository root as ARCHITECTURE.md.
Replace every {{...}} placeholder with facts verified from source.
Do not put agent workflow or task execution instructions in this file.
-->

## Purpose

{{Explain the problem the system solves, its primary users or callers, and what is outside its scope.}}

## System Context

{{Describe external actors, services, data stores, and protocols at the system boundary.}}

## Components

| Component | Responsibility | Module guide |
|---|---|---|
| `{{relative/module/path}}` | {{Unique responsibility}} | `{{relative/module/path}}/MODULE.md` |

## Dependency Rules

```text
{{entry layer}} -> {{domain or service layer}} -> {{data or integration layer}}
```

- {{Allowed dependency direction}}
- {{Forbidden dependency or boundary crossing}}

## Data Flow

1. {{How a primary request, event, or job enters the system}}
2. {{How it moves through core components}}
3. {{Where state is read, changed, or emitted}}

## Entry Points

| Path | Role |
|---|---|
| `{{relative/path/to/runtime-entry}}` | {{Runtime or request entry}} |
| `{{relative/path/to/public-api}}` | {{Public API or library export}} |
| `{{relative/path/to/composition-root}}` | {{Dependency assembly or route registration}} |

## Cross-Cutting Constraints

- {{Transaction, concurrency, caching, or idempotency constraint}}
- {{Security, privacy, observability, or reliability constraint}}
- {{Compatibility or data-format constraint}}

