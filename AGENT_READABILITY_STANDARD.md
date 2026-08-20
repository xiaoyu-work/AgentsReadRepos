# Agent-Friendly Repository Standard v1.0

This standard reduces the context a coding agent needs to understand an
unfamiliar repository. It separates working instructions from architecture so
each document has one clear responsibility.

Companion files:

- `CODING_AGENT_PROMPT.md`: complete repository migration prompt.
- `ROOT_AGENTS_TEMPLATE.md`: template for root agent instructions.
- `ARCHITECTURE_TEMPLATE.md`: template for repository architecture.
- `MODULE_TEMPLATE.md`: template for significant-directory documentation.
- `check-agent-readability.mjs`: automated conformance auditor.

## 1. Document Ownership

| Artifact | Owns | Must not contain |
|---|---|---|
| Root `AGENTS.md` | Agent workflow, development and test commands, coding conventions, and documentation update rules | Architecture, component design, data flow, or duplicated module descriptions |
| Root `ARCHITECTURE.md` | System purpose, context, components, dependency rules, data flow, entry points, and cross-cutting constraints | Agent behavior instructions or task execution procedures |
| Directory `MODULE.md` | One directory's purpose, responsibilities, key files, dependencies, and tests | Repository-wide architecture or general agent workflow |
| `.agent/repo-map.json` | Machine-readable paths, module index, entry points, file purposes, and public symbols | Long prose or behavioral instructions |
| Source-file `@agent-*` header | File-specific purpose, public API, invariants, and side effects | Repository architecture or ordinary private-helper inventories |

When information changes, update the artifact that owns that information. Do
not copy the same architecture prose into `AGENTS.md`.

## 2. Design Principles

1. **Separate instructions from architecture.** `AGENTS.md` explains how an
   agent should work; `ARCHITECTURE.md` explains how the system is designed.
2. **Keep module facts close to code.** Significant directories use
   `MODULE.md`.
3. **Generate derivable indexes.** File paths and public symbols belong in the
   repository map and should come from code facts.
4. **Treat code as the source of truth.** Documentation must not guess about
   behavior.
5. **Read indexes before bodies.** Agents should use the repository map and
   source-file headers to reject irrelevant files before reading them fully.
6. **Avoid risky compliance refactors.** Use a narrow, justified exemption
   when generated or legacy code cannot be safely changed.
7. **Use concrete descriptions.** Do not use placeholders such as "utility
   code," "business logic," or "handles related operations."

## 3. Required Repository Structure

```text
repository/
|-- AGENTS.md
|-- ARCHITECTURE.md
|-- .agent/
|   `-- repo-map.json
|-- .agent-readability.json       # Optional
|-- src/
|   |-- MODULE.md                 # Required when src is significant
|   `-- ...
`-- ...
```

### 3.1 Root `AGENTS.md`

The root `AGENTS.md` contains operational instructions only. It must contain
these non-empty sections:

| Canonical section | Accepted headings | Required information |
|---|---|---|
| Repository Documents | `Repository Documents`, `Navigation`, `Read First` | Links to `ARCHITECTURE.md`, `.agent/repo-map.json`, and relevant `MODULE.md` files |
| Development | `Development`, `Local Development` | Installation, startup, and build commands |
| Testing | `Testing`, `Tests` | Narrow and complete validation commands |
| Conventions | `Conventions`, `Coding Conventions` | Repository-specific implementation rules |
| Agent Workflow | `Agent Workflow`, `Workflow` | Required read-before-edit and edit behavior |
| Documentation Updates | `Documentation Updates`, `Documentation Update Triggers` | Which artifact changes for each kind of code change |

Do not place component descriptions, dependency diagrams, data flow, or entry
point explanations in `AGENTS.md`. Link to `ARCHITECTURE.md` instead.

### 3.2 Root `ARCHITECTURE.md`

The root `ARCHITECTURE.md` must contain these non-empty sections:

- `Purpose`
- `System Context`
- `Components`
- `Dependency Rules`
- `Data Flow`
- `Entry Points`
- `Cross-Cutting Constraints`

This file contains system facts only. It must not instruct an agent how to run
tasks, sequence edits, or maintain documentation.

### 3.3 Significant-Directory `MODULE.md`

A non-root directory is significant when any condition is true:

- it directly contains at least three source files;
- it is named `src`, `app`, `lib`, `libs`, `packages`, `services`, `modules`,
  or `components` and recursively contains at least five source files; or
- it contains a common build manifest such as `package.json`,
  `pyproject.toml`, `go.mod`, `Cargo.toml`, `pom.xml`, or `*.csproj`, and has
  source files below it.

Every significant directory must contain `MODULE.md` with these non-empty
sections:

- `Purpose`
- `Responsibilities`
- `Key Files`
- `Dependencies`
- `Tests`

`MODULE.md` documents local module facts. Repository-wide component
relationships remain in `ARCHITECTURE.md`.

### 3.4 `.agent/repo-map.json`

The repository map is UTF-8 JSON and uses `/` in repository-relative paths:

```json
{
  "schemaVersion": 1,
  "generatedAt": "2026-08-20T00:00:00Z",
  "sourceFingerprint": "64-character SHA-256",
  "entryPoints": [
    {
      "path": "src/main.py",
      "purpose": "Starts the application and assembles top-level dependencies"
    }
  ],
  "modules": [
    {
      "path": "src/orders",
      "purpose": "Implements order creation, state transitions, and persistence orchestration",
      "guide": "src/orders/MODULE.md"
    }
  ],
  "files": [
    {
      "path": "src/orders/service.py",
      "kind": "source",
      "purpose": "Coordinates order creation and payment reservation while preserving idempotency",
      "publicSymbols": [
        "OrderService",
        "create_order"
      ]
    }
  ]
}
```

Requirements:

- `schemaVersion` is the integer `1`.
- `generatedAt` is an ISO 8601 timestamp with a timezone.
- `sourceFingerprint` matches the current source fingerprint.
- `entryPoints` contains at least one runtime, reading, or public API entry.
- `modules` covers every non-exempt significant directory and points to that
  directory's `MODULE.md`.
- `files` covers every non-excluded source file.
- Every `purpose` contains at least eight non-whitespace characters and states
  a concrete responsibility.
- `publicSymbols` contains all public or exported classes, functions,
  interfaces, and constants. Use an empty array when none exist.
- `kind` normally uses `source`, `test`, `generated`, or `config`.

The auditor calculates `sourceFingerprint` by sorting source paths, normalizing
paths to `/`, normalizing line endings to `LF`, and hashing each
`UTF-8 path + NUL + content + NUL` sequence with SHA-256.

```console
node check-agent-readability.mjs PATH_TO_REPOSITORY --fingerprint
```

Refresh the repository map after source changes.

## 4. Source-File Agent Headers

Every non-exempt source file must contain a 5-15 line native-language comment
block within its first 50 lines:

```text
@agent-file
@agent-purpose: <the file's specific responsibility>
@agent-public-api: <all public or exported symbols; use none when empty>
@agent-invariants: <constraints that must remain true; use none when empty>
@agent-side-effects: <I/O, network, database, or global-state effects; use none when empty>
```

Example:

```ts
/**
 * @agent-file
 * @agent-purpose: Validates order transitions and records accepted state changes.
 * @agent-public-api: OrderStateMachine, transitionOrder
 * @agent-invariants: Completed and cancelled orders cannot return to an active state.
 * @agent-side-effects: none
 */
```

Requirements:

- fields appear in the exact order above;
- `@agent-purpose` contains at least eight non-whitespace characters;
- empty public APIs, invariants, and side effects use `none`;
- `@agent-public-api` matches the file's `publicSymbols` map entry;
- a shebang, encoding declaration, or legally required copyright header may
  appear first, but the complete summary remains within the first 50 lines;
- changes to file purpose, public API, invariants, or side effects update the
  header in the same change; and
- only generated files that cannot be edited directly may use
  `exemptions.fileHeaders`.

## 5. Source-File Size

Default thresholds:

- recommended maximum: 800 lines;
- hard maximum: 2,000 lines.

Files over 800 lines produce a warning and lose points. Files over 2,000 lines
fail unless narrowly exempted. Split files along stable responsibilities and
testable boundaries, not arbitrary line counts.

## 6. Optional Configuration

The repository may create `.agent-readability.json`:

```json
{
  "version": 1,
  "exclude": [
    "third_party/**",
    "fixtures/generated/**"
  ],
  "sourceExtensions": [
    ".custom"
  ],
  "significantDirectoryMinFiles": 3,
  "significantDirectoryRecursiveFiles": 5,
  "recommendedMaxLines": 800,
  "hardMaxLines": 2000,
  "minScore": 85,
  "exemptions": {
    "oversizedFiles": {
      "src/legacy/parser.py": "Generated grammar output; maintained source is parser.y"
    },
    "moduleGuides": {
      "src/compat": "Two-file compatibility shim documented by its parent module"
    },
    "mapFiles": {
      "tests/fixtures/huge_generated.py": "Generated fixture with no maintainable public API"
    },
    "fileHeaders": {
      "src/generated/schema.ts": "Generated from schema.json; direct edits are overwritten"
    }
  }
}
```

Every exemption uses a repository-relative `/` path and a concrete reason.
Broad exclusions must not hide a business-code root. `recommendedMaxLines`
cannot exceed `hardMaxLines`.

## 7. Scoring and Passing

| Category | Points |
|---|---:|
| Root agent instructions | 10 |
| Root architecture | 15 |
| Significant-directory module guides | 20 |
| `.agent/repo-map.json` | 25 |
| Source-file agent headers | 20 |
| Source-file size | 10 |

A repository passes when it reaches the configured minimum score, which
defaults to 85, and has no `error` findings.

```console
node check-agent-readability.mjs PATH_TO_REPOSITORY
node check-agent-readability.mjs PATH_TO_REPOSITORY --format json
```

Exit codes:

- `0`: pass;
- `1`: repository does not meet the standard;
- `2`: invalid path, configuration, or invocation.

## 8. Documentation Update Ownership

| Change | Required update |
|---|---|
| Source-file responsibility, API, invariant, or side effect changes | That file's `@agent-*` header and matching repository-map file entry |
| File is added, deleted, renamed, moved, or split | Nearest `MODULE.md`, repository-map `files`, affected entry points, and fingerprint |
| Module responsibility, dependency, key files, or tests change | That module's `MODULE.md`; update `ARCHITECTURE.md` only when the system-level design also changes |
| System components, dependency rules, data flow, or entry points change | Root `ARCHITECTURE.md` and matching repository-map entries |
| Development commands, test commands, conventions, or agent workflow change | Root `AGENTS.md` |

Documentation updates are part of the code change. Do not leave stale
architecture, paths, symbols, or commands for a later agent.

## 9. Limits of Automated Auditing

The auditor verifies structure, required fields, map coverage, file size, and
fingerprint freshness. It cannot prove that natural-language descriptions are
semantically correct. Final review should sample source headers and map entries,
trace entry-point call chains, and run the documented project commands.

