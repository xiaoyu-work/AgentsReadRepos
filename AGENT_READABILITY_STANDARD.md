# Agent-Friendly Repository Standard v1.0

This standard reduces the search and context required for a coding agent to
understand an unfamiliar repository. It avoids large amounts of duplicated
documentation that are likely to become stale.

Companion files:

- `CODING_AGENT_PROMPT.md`: a complete prompt for migrating a repository.
- `ROOT_AGENTS_TEMPLATE.md`: a template to copy into a target repository as
  its root `AGENTS.md`.
- `check-agent-readability.mjs`: an automated conformance auditor.

## 1. Design Principles

1. **Explain boundaries before details.** Module responsibilities, entry
   points, data flow, and invariants are more useful than inventories of
   private helpers.
2. **Keep documentation close to code.** Repository-level information belongs
   at the root; module-level information belongs in the module directory.
3. **Generate derivable information.** File indexes and public symbols belong
   in the repository map and should be produced from code facts.
4. **Treat code as the source of truth.** Documentation must not guess about
   behavior. Mark facts that cannot be verified as unresolved.
5. **Do not perform risky refactors merely to pass an audit.** A large legacy
   or generated file may use a narrow, justified exemption when safe
   restructuring is not currently possible.
6. **Write descriptions that improve navigation.** Do not use placeholders
   such as "utility code," "business logic," or "handles related operations."
7. **Read file headers before file bodies.** Every source file must expose a
   fixed agent summary in its first 50 lines so an agent can reject irrelevant
   files without reading them in full.

## 2. Required Repository Structure

A conforming code repository contains at least:

```text
repository/
|-- AGENTS.md
|-- .agent/
|   `-- repo-map.json
|-- .agent-readability.json       # Optional
|-- src/
|   |-- AGENTS.md                 # Required when src is significant
|   `-- ...
`-- ...
```

### 2.1 Root `AGENTS.md`

The repository root must contain `AGENTS.md` with the following non-empty
sections:

| Canonical section | Accepted headings | Required information |
|---|---|---|
| Purpose | `Purpose`, `Goal` | What problem does the repository solve, and what is outside its scope? |
| Architecture | `Architecture`, `System Design` | How do the main modules connect, and what is the dependency direction? |
| Entry Points | `Entry Points`, `Entry Point` | Where should an agent begin reading, running, or calling the system? |
| Development | `Development`, `Local Development` | How are dependencies installed and the project built or started? |
| Testing | `Testing`, `Tests` | What are the narrow and complete validation commands? |
| Conventions | `Conventions`, `Coding Conventions` | What repository-specific rules and invariants must be preserved? |

Keep the root guide concise and link to module guides through relative paths.
It does not replace the product README.

Copy `ROOT_AGENTS_TEMPLATE.md` into the target repository as `AGENTS.md` when a
starting template is useful. Replace every `{{...}}` placeholder with verified
repository facts before committing it.

### 2.2 Significant-Directory `AGENTS.md`

The auditor considers a non-root directory significant when any of these
conditions is true:

- it directly contains at least three source files;
- it is named `src`, `app`, `lib`, `libs`, `packages`, `services`, `modules`,
  or `components` and recursively contains at least five source files; or
- it contains a common build manifest such as `package.json`,
  `pyproject.toml`, `go.mod`, `Cargo.toml`, `pom.xml`, or `*.csproj`, and has
  source files below it.

Every significant directory must contain `AGENTS.md` with these non-empty
sections:

- `Purpose`
- `Responsibilities`
- `Key Files`
- `Dependencies`
- `Tests`

The guide should state:

- what the directory owns and does not own;
- the recommended reading order;
- upstream callers and downstream dependencies;
- how state, data, or requests move through the module;
- constraints that are not obvious from types and names; and
- associated test locations and commands.

Do not mechanically copy the same guide into pure organizational directories.
Use a narrow, justified exemption when a directory genuinely does not need its
own guide.

### 2.3 `.agent/repo-map.json`

The repository map must be UTF-8 JSON and use `/` in repository-relative paths.
Its basic structure is:

```json
{
  "schemaVersion": 1,
  "generatedAt": "2026-08-20T00:00:00Z",
  "sourceFingerprint": "64-character SHA-256",
  "entryPoints": [
    {
      "path": "src/main.py",
      "purpose": "Starts the command-line application and assembles top-level dependencies"
    }
  ],
  "modules": [
    {
      "path": "src/orders",
      "purpose": "Implements order creation, state transitions, and persistence orchestration",
      "guide": "src/orders/AGENTS.md"
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

Field requirements:

- `schemaVersion`: the integer `1`.
- `generatedAt`: an ISO 8601 timestamp with a timezone.
- `sourceFingerprint`: the fingerprint calculated by the auditor.
- `entryPoints`: at least one runtime, reading, or public API entry point. A
  library can use its public export file.
- `modules`: every non-exempt significant directory.
- `files`: every non-excluded source file.
- `purpose`: at least eight non-whitespace characters and a concrete,
  file-specific or module-specific responsibility.
- `publicSymbols`: all public or exported classes, functions, interfaces, and
  constants. Use an empty array when none exist.
- `kind`: normally `source`, `test`, `generated`, or `config`.

The auditor calculates `sourceFingerprint` as follows:

1. Sort source files by repository-relative path.
2. Normalize path separators to `/`.
3. Normalize `CRLF` and `CR` content to `LF`.
4. For each file, hash `UTF-8 path + NUL + content + NUL`.
5. Produce a SHA-256 digest over the full sequence.

Print the current fingerprint with:

```console
node check-agent-readability.mjs PATH_TO_REPOSITORY --fingerprint
```

The repository map should be generated from code facts through language tools,
AST inspection, or a coding agent. Refresh it after source changes; the auditor
rejects stale fingerprints.

## 3. Source-File Size

Default thresholds:

- **Recommended maximum: 800 lines.** Larger files produce a warning and lose
  points.
- **Hard maximum: 2,000 lines.** Larger files fail the audit.

Line count is a complexity signal, not a refactoring target. Split files along
stable responsibilities, dependency directions, and testable boundaries. Do
not divide tightly coupled logic into arbitrary fragments merely to satisfy a
number.

Generated outputs, protocol artifacts, and legacy files that cannot currently
be split safely may use a specific exemption with a concrete reason.

## 4. Optional Configuration

A repository may create `.agent-readability.json` at its root:

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
      "src/legacy/parser.py": "Generated grammar output; the maintained source is parser.y"
    },
    "directoryGuides": {
      "src/compat": "Two-file compatibility shim documented by src/AGENTS.md"
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

Configuration requirements:

- all exemption paths use `/` and are relative to the repository root;
- exclusion entries use glob syntax;
- every exemption has a non-empty reason;
- `recommendedMaxLines` is not greater than `hardMaxLines`; and
- broad patterns must not hide most business source code.

The auditor ignores common dependency, build, cache, IDE, version-control, and
generated-code directories by default.

## 5. Scoring and Passing

The total score is 100:

| Category | Points |
|---|---:|
| Root `AGENTS.md` | 25 |
| Significant-directory guides | 20 |
| `.agent/repo-map.json` | 25 |
| Source-file agent headers | 20 |
| Source-file size | 10 |

A repository passes only when:

1. it reaches `minScore`, which defaults to 85; and
2. it has no `error` findings.

Commands:

```console
node check-agent-readability.mjs PATH_TO_REPOSITORY
node check-agent-readability.mjs PATH_TO_REPOSITORY --format json
node check-agent-readability.mjs PATH_TO_REPOSITORY --min-score 90
```

Exit codes:

- `0`: pass;
- `1`: repository does not meet the standard;
- `2`: invalid path, configuration, or invocation.

## 6. Source-File Agent Headers

Every non-exempt source file must contain a 5-15 line native-language comment
block within its **first 50 lines**. The fields and order are fixed:

```text
@agent-file
@agent-purpose: <the file's specific responsibility>
@agent-public-api: <public or exported classes, functions, interfaces, and constants; use none when empty>
@agent-invariants: <constraints callers and maintainers must preserve; use none when empty>
@agent-side-effects: <I/O, network, database, or global-state effects; use none when empty>
```

JavaScript or TypeScript example:

```ts
/**
 * @agent-file
 * @agent-purpose: Validates order transitions and records accepted state changes.
 * @agent-public-api: OrderStateMachine, transitionOrder
 * @agent-invariants: Completed and cancelled orders cannot return to an active state.
 * @agent-side-effects: none
 */
```

Python example:

```python
"""
@agent-file
@agent-purpose: Loads order records and maps database rows into domain objects.
@agent-public-api: OrderRepository, find_order
@agent-invariants: Returned monetary values are integer cents.
@agent-side-effects: Reads and writes the orders database table.
"""
```

Requirements:

- `@agent-purpose` contains at least eight non-whitespace characters and
  distinguishes the file from adjacent files.
- `@agent-public-api` lists every public or exported symbol but does not list
  ordinary private helpers.
- Empty public APIs, invariants, or side effects are written explicitly as
  `none`; fields are never left blank.
- Changes to responsibility, public symbols, constraints, or side effects
  update the header in the same change.
- `@agent-public-api` stays consistent with the matching `publicSymbols` entry
  in `repo-map.json`.
- A shebang, encoding declaration, or legally required copyright header may
  appear before the block, but the complete summary remains within the first
  50 lines.
- Only generated files that cannot be edited directly may use a per-file
  `exemptions.fileHeaders` entry.

This summary determines whether a full file read is necessary. An agent should
read the root guide, repository map, and first 50 lines of candidate files,
then read complete files only when their summaries show relevance.

## 7. Limits of Automated Auditing

The auditor verifies document structure, header fields, path and map coverage,
file size, and repository-map freshness. It cannot prove that natural-language
descriptions are semantically correct. Final review should also:

1. sample three to five files and compare each `purpose` with the code;
2. trace one real call chain from every entry point to verify architecture and
   dependency direction;
3. run the build and test commands documented in the root guide; and
4. confirm that a new agent can locate major functionality, entry points, and
   tests by reading the root guide, repository map, and candidate-file headers.

