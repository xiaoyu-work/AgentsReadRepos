# Agent-Readable Repository Toolkit

This toolkit helps convert an existing codebase into a structure that coding
agents can navigate with less searching and less context consumption. It keeps
the repository's existing directory organization and focuses on adding layered
navigation guides, source-file summaries, and a machine-checkable repository
map.

## Contents

| File | Purpose |
|---|---|
| `CODING_AGENT_PROMPT.md` | Complete migration prompt to run with a coding agent |
| `ROOT_AGENTS_TEMPLATE.md` | Template for the target repository's root `AGENTS.md` |
| `AGENT_READABILITY_STANDARD.md` | Full rules, scoring model, formats, and exemption policy |
| `check-agent-readability.mjs` | Auditor that checks whether a target repository meets the standard |

## Requirements

Running the auditor requires:

- Node.js 18 or later;
- no third-party npm packages;
- Windows, Linux, or macOS.

The Markdown documents and migration prompt do not depend on Node.js. Node.js is
required only when running the auditor.

## Quick Start

### 1. Get the auditor's absolute path

Locate `check-agent-readability.mjs` in this toolkit. For example:

```text
C:\tools\agentreadsrepo\check-agent-readability.mjs
```

### 2. Run the migration prompt with a coding agent

Open `CODING_AGENT_PROMPT.md` and copy the complete fenced prompt. Replace:

```text
<CHECKER_PATH>
```

with the auditor's absolute path. Run the resulting prompt with a coding agent
from the **target repository root**.

For example:

```text
node "C:\tools\agentreadsrepo\check-agent-readability.mjs" . --fingerprint
node "C:\tools\agentreadsrepo\check-agent-readability.mjs" .
```

The migration prompt instructs the coding agent to:

1. Determine the target repository's real architecture, entry points, modules,
   and public symbols.
2. Create or improve the root `AGENTS.md`.
3. Create or improve local `AGENTS.md` files for significant directories.
4. Create `.agent/repo-map.json`.
5. Add an `@agent-*` summary within the first 50 lines of every source file.
6. Process oversized files one directory and one file at a time.
7. Preserve the existing directory structure without moving or renaming
   existing files.

### 3. Optional: start from the root guide template

Copy the template into the target repository if you do not want the coding
agent to start from an empty file:

```powershell
Copy-Item .\ROOT_AGENTS_TEMPLATE.md C:\path\to\target-repository\AGENTS.md
```

Replace every `{{...}}` placeholder with facts verified from the target
repository. Do not commit an unfilled template.

### 4. Audit the target repository

From this toolkit directory on Windows:

```powershell
node .\check-agent-readability.mjs C:\path\to\target-repository
```

On Linux or macOS:

```console
node ./check-agent-readability.mjs /path/to/target-repository
```

Produce a JSON report:

```powershell
node .\check-agent-readability.mjs C:\path\to\target-repository --format json
```

Print only the current source fingerprint:

```powershell
node .\check-agent-readability.mjs C:\path\to\target-repository --fingerprint
```

Temporarily override the minimum passing score:

```powershell
node .\check-agent-readability.mjs C:\path\to\target-repository --min-score 90
```

## Passing Criteria

The auditor assigns 100 total points:

| Category | Points |
|---|---:|
| Root `AGENTS.md` | 25 |
| Significant-directory guides | 20 |
| `.agent/repo-map.json` | 25 |
| Source-file agent headers | 20 |
| Source-file size | 10 |

A repository passes only when:

- it reaches the minimum score, which defaults to 85; and
- it has no `error` findings.

Exit codes:

| Exit code | Meaning |
|---:|---|
| `0` | The repository passes |
| `1` | The repository does not meet the standard |
| `2` | The path, configuration, or command invocation is invalid |

## Source-File Agent Headers

Every non-exempt source file must contain the following fields within its first
50 lines, using the language's native comment syntax:

```text
@agent-file
@agent-purpose: The file's specific responsibility
@agent-public-api: Every public or exported symbol, or none
@agent-invariants: Constraints that must remain true, or none
@agent-side-effects: I/O, network, database, or global-state effects, or none
```

Agents should read the root guide and repository map first, then inspect only
the first 50 lines of candidate files. They should read a complete file only
after its header confirms that the file is relevant to the task.

## Expected Target Repository Structure

A typical migrated repository looks like this:

```text
target-repository/
|-- AGENTS.md
|-- .agent/
|   `-- repo-map.json
|-- .agent-readability.json       # Only when configuration or exemptions are needed
|-- src/
|   |-- AGENTS.md
|   `-- ...
`-- ...
```

The auditor can remain in this toolkit and inspect other repositories through
an absolute path. It does not need to be copied into every target repository.

## Configuration and Exemptions

A target repository can use `.agent-readability.json` to add source extensions,
change significant-directory thresholds, adjust line limits, or override the
minimum score. It can also define narrow exemptions for generated files that
cannot be edited directly.

Every exemption must identify a specific file or directory and provide a
concrete reason. Do not exclude an entire `src`, `app`, `packages`, or equivalent
business-code root.

See `AGENT_READABILITY_STANDARD.md` for the complete configuration format and
all normative requirements.
