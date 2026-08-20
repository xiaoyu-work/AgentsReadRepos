# Repository Guide

<!--
Copy this file to the target repository root as AGENTS.md.
Replace every {{...}} placeholder with facts verified from the repository.
Delete this comment before committing. Never leave placeholder content behind.
-->

## Purpose

{{用 2–5 句话说明仓库解决的问题、主要用户或调用方，以及明确不属于本仓库职责的内容。}}

## Architecture

{{简要说明主要组件、依赖方向和最重要的数据流。不要复制实现细节。}}

| Module | Responsibility | Guide |
|---|---|---|
| `{{relative/module/path}}` | {{该模块独有的职责}} | `{{relative/module/path}}/AGENTS.md` |

Primary dependency flow:

```text
{{entry layer}} -> {{domain/service layer}} -> {{data/integration layer}}
```

Key architectural constraints:

- {{必须保持的模块边界或依赖方向}}
- {{事务、并发、缓存、幂等或安全约束；没有时写明不适用}}

## Entry Points

| Path | Start here when |
|---|---|
| `{{relative/path/to/runtime-entry}}` | {{运行应用或跟踪主要请求流程}} |
| `{{relative/path/to/public-api}}` | {{理解库的公共 API 或主要导出}} |
| `{{relative/path/to/config}}` | {{理解启动配置、依赖组装或路由注册}} |

For file-level navigation, read `.agent/repo-map.json` first, then confirm every
description against the source before making changes.

## Development

Prerequisites:

- {{运行时、工具链及最低版本}}

Run these commands from the repository root unless noted otherwise:

```console
{{dependency installation command}}
{{local development or build command}}
```

Required local services or environment variables:

- `{{NAME}}`: {{用途；不要在本文档中写入密钥值}}

## Testing

Use the narrowest existing command that covers the change, then expand only when
the result indicates broader validation is needed.

```console
{{single test or targeted test command}}
{{type-check or lint command}}
{{full test command}}
```

Test locations:

- `{{relative/test/path}}`: {{覆盖的模块或测试类型}}

## Conventions

- {{仓库特有的命名、错误处理或类型安全规则}}
- {{生成文件和生成命令；没有时写明不适用}}
- {{禁止直接修改的目录、API 或数据格式}}
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
