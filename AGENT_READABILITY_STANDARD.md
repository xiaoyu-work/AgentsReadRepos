# Agent-Friendly Repository Standard v1.0

本标准用于降低 coding agent 理解陌生代码库时的检索量和上下文消耗，同时避免为了“方便 AI”而制造大量容易过期的重复文档。

配套文件：

- `CODING_AGENT_PROMPT.md`：可直接交给 coding agent 执行的仓库改造 Prompt。
- `ROOT_AGENTS_TEMPLATE.md`：可复制到目标仓库根目录的 `AGENTS.md` 示例模板。
- `check-agent-readability.mjs`：自动检查仓库是否符合本标准。

## 1. 设计原则

1. **先解释边界，再罗列细节**：模块职责、入口、数据流和约束比逐个解释私有方法更有价值。
2. **文档必须靠近代码**：仓库级信息放在根目录，模块级信息放在模块目录。
3. **可推导的信息应自动生成**：文件列表和公开符号放入代码地图，不在文件头人工复制。
4. **代码是事实来源**：文档不得猜测行为；无法确认的内容应明确标记为待确认。
5. **不为通过检查而做危险重构**：缺少测试保护时，超大文件可以使用有理由的临时豁免。
6. **描述必须有导航价值**：禁止使用“工具类”“处理业务逻辑”“相关功能”等无信息占位文本。
7. **先读文件头，再决定是否读全文**：每个源文件都必须在前 50 行提供固定格式的 agent 摘要，使 agent 能先排除无关文件。

## 2. 必需的仓库结构

符合标准的代码仓库至少包含：

```text
repository/
├── AGENTS.md
├── .agent/
│   └── repo-map.json
├── .agent-readability.json       # 可选
├── src/
│   ├── AGENTS.md                 # 当 src 被判定为重要目录时必需
│   └── ...
└── ...
```

### 2.1 根目录 `AGENTS.md`

根目录必须存在 `AGENTS.md`，并包含以下非空章节。标题可以使用表中任一中英文名称。

| 规范名称 | 可接受标题 | 应回答的问题 |
|---|---|---|
| Purpose | `Purpose`、`目标`、`用途` | 仓库解决什么问题，不解决什么问题？ |
| Architecture | `Architecture`、`架构`、`系统设计` | 主要模块如何连接，依赖方向是什么？ |
| Entry Points | `Entry Points`、`入口`、`入口点` | 从哪里开始读、运行或调用？ |
| Development | `Development`、`开发`、`本地开发` | 如何安装依赖、启动和构建？ |
| Testing | `Testing`、`测试` | 最小测试命令和完整测试命令是什么？ |
| Conventions | `Conventions`、`约定`、`编码约定` | 仓库特有的规则和不变量是什么？ |

`AGENTS.md` 应尽量简洁，并通过相对路径链接到具体模块文档。它不是产品 README 的替代品。

可以复制 `ROOT_AGENTS_TEMPLATE.md` 到目标仓库根目录并重命名为
`AGENTS.md`。提交前必须用真实仓库信息替换所有 `{{...}}` 占位符。

### 2.2 重要目录的 `AGENTS.md`

检查器会把满足任一条件的非根目录视为“重要目录”：

- 目录内直接包含至少 3 个源文件；
- 名为 `src`、`app`、`lib`、`libs`、`packages`、`services`、`modules` 或 `components`，并递归包含至少 5 个源文件；
- 包含常见构建清单，例如 `package.json`、`pyproject.toml`、`go.mod`、`Cargo.toml`、`pom.xml` 或 `*.csproj`，且其下存在源文件。

每个重要目录必须包含 `AGENTS.md`，并包含以下非空章节：

- `Purpose` / `目标` / `用途`
- `Responsibilities` / `职责`
- `Key Files` / `关键文件`
- `Dependencies` / `依赖`
- `Tests` / `测试`

建议写明：

- 本目录负责和不负责的内容；
- 推荐阅读顺序；
- 上游调用方和下游依赖；
- 状态、数据或请求如何流过本模块；
- 不容易从类型和函数名看出的约束；
- 对应测试目录及测试命令。

不要在每层纯粹用于分类的目录中机械复制相同文档。确实不适合放置目录文档时，应使用带理由的豁免。

### 2.3 `.agent/repo-map.json`

代码地图必须是 UTF-8 JSON，使用 `/` 分隔的仓库相对路径。基本结构如下：

```json
{
  "schemaVersion": 1,
  "generatedAt": "2026-08-20T00:00:00Z",
  "sourceFingerprint": "64-character SHA-256",
  "entryPoints": [
    {
      "path": "src/main.py",
      "purpose": "启动命令行应用并组装顶层依赖"
    }
  ],
  "modules": [
    {
      "path": "src/orders",
      "purpose": "实现订单创建、状态转换和持久化编排",
      "guide": "src/orders/AGENTS.md"
    }
  ],
  "files": [
    {
      "path": "src/orders/service.py",
      "kind": "source",
      "purpose": "编排订单创建和支付预留，并维护幂等性边界",
      "publicSymbols": [
        "OrderService",
        "create_order"
      ]
    }
  ]
}
```

字段规则：

- `schemaVersion`：当前固定为整数 `1`。
- `generatedAt`：带时区的 ISO 8601 时间。
- `sourceFingerprint`：由检查器计算的源文件指纹。
- `entryPoints`：至少一个阅读、运行或公共 API 入口；库项目可以填写导出公共 API 的文件。
- `modules`：覆盖所有未豁免的重要目录。
- `files`：覆盖所有未排除的源文件。
- `purpose`：至少 8 个非空白字符，并描述文件或模块的具体职责。
- `publicSymbols`：公开或导出的类、函数、接口和常量；没有时使用空数组。不要罗列私有实现细节。
- `kind`：建议使用 `source`、`test`、`generated` 或 `config`。

检查器按以下方式生成指纹：

1. 按仓库相对路径排序源文件；
2. 将路径转换为 `/`；
3. 将文件内容的 `CRLF` 和 `CR` 统一为 `LF`；
4. 对每个文件依次写入 `UTF-8 路径 + NUL + 内容 + NUL`；
5. 计算整体 SHA-256。

运行以下命令可以直接得到正确指纹：

```console
node check-agent-readability.mjs PATH_TO_REPOSITORY --fingerprint
```

代码地图应由脚本、AST/语言工具或 agent 从代码事实生成。代码变更后必须刷新，检查器会拒绝过期指纹。

## 3. 源文件规模

默认阈值：

- **建议上限：800 行**。超过后产生警告并扣分。
- **硬上限：2000 行**。超过后检查失败。

行数只是复杂度信号，不是重构目标。拆分文件时应按稳定职责、依赖方向和可测试边界拆分，不能为了满足数字而把强耦合逻辑切成任意片段。

生成代码、协议产物或暂时无法安全拆分的遗留文件可以豁免，但理由必须具体。

## 4. 可选配置

仓库根目录可以创建 `.agent-readability.json`：

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
      "src/legacy/parser.py": "Generated grammar output; source grammar is parser.y"
    },
    "directoryGuides": {
      "src/compat": "Two-file compatibility shim documented by src/AGENTS.md"
    },
    "mapFiles": {
      "tests/fixtures/huge_generated.py": "Generated test fixture with no maintainable public API"
    },
    "fileHeaders": {
      "src/generated/schema.ts": "Generated from schema.json; edits would be overwritten"
    }
  }
}
```

配置约束：

- 路径均为使用 `/` 的仓库相对路径；
- 排除项使用 glob；
- 每项豁免必须包含非空理由；
- `recommendedMaxLines` 不得大于 `hardMaxLines`；
- 不允许用根级通配符排除大部分业务代码来伪造通过结果。

默认忽略 `.git`、依赖、构建产物、缓存、IDE 目录和常见生成文件。

## 5. 评分与通过条件

总分为 100：

| 类别 | 分值 |
|---|---:|
| 根目录 `AGENTS.md` | 25 |
| 重要目录文档 | 20 |
| `.agent/repo-map.json` | 25 |
| 源文件顶部 agent 摘要 | 20 |
| 源文件规模 | 10 |

仓库必须同时满足：

1. 分数达到 `minScore`，默认 85；
2. 不存在 `error` 级问题。

运行方法：

```console
node check-agent-readability.mjs PATH_TO_REPOSITORY
node check-agent-readability.mjs PATH_TO_REPOSITORY --format json
node check-agent-readability.mjs PATH_TO_REPOSITORY --min-score 90
```

退出码：

- `0`：通过；
- `1`：仓库不符合标准；
- `2`：路径、配置或检查器调用错误。

## 6. 文件头规则

每个未豁免源文件都必须在**前 50 行**包含一个 5–15 行的语言原生注释块。固定字段和顺序如下：

```text
@agent-file
@agent-purpose: <该文件独有的具体职责>
@agent-public-api: <公开或导出的类、函数、接口和常量；没有时写 none>
@agent-invariants: <调用方和修改者必须保持的约束；没有时写 none>
@agent-side-effects: <I/O、网络、数据库、全局状态等副作用；没有时写 none>
```

JavaScript / TypeScript 示例：

```ts
/**
 * @agent-file
 * @agent-purpose: Validates order transitions and records accepted state changes.
 * @agent-public-api: OrderStateMachine, transitionOrder
 * @agent-invariants: Completed and cancelled orders cannot return to an active state.
 * @agent-side-effects: none
 */
```

Python 示例：

```python
"""
@agent-file
@agent-purpose: Loads order records and maps database rows into domain objects.
@agent-public-api: OrderRepository, find_order
@agent-invariants: Returned monetary values are integer cents.
@agent-side-effects: Reads and writes the orders database table.
"""
```

要求：

- `@agent-purpose` 至少包含 8 个非空白字符，并能区分相邻文件；
- `@agent-public-api` 列出全部公开或导出符号，不罗列普通私有辅助方法；
- 没有不变量、副作用或公开符号时必须明确写 `none`，不能留空；
- 代码发生职责、公开符号、约束或副作用变化时，同一改动必须更新文件头；
- `@agent-public-api` 必须与 `repo-map.json` 的 `publicSymbols` 保持一致；
- shebang、编码声明和法定版权头可以位于它之前，但整个摘要必须出现在前 50 行；
- 只有不可直接编辑的生成文件可以通过 `exemptions.fileHeaders` 按文件豁免。

这个摘要用于判断“是否需要读取全文”。Agent 应先读取根文档、代码地图和候选文件前 50 行，只有确认文件与任务相关后才读取其余内容。

## 7. 自动检查的边界

检查器可以验证文档结构、文件头字段、覆盖率、路径、文件规模和代码地图新鲜度，但无法证明描述在语义上完全正确。最终验收还应抽查：

1. 随机选择 3–5 个文件，对照代码验证 `purpose`；
2. 从每个入口追踪一条真实调用链，验证架构和依赖方向；
3. 用根文档中的命令执行构建和测试；
4. 确认一个新 agent 仅阅读根文档、代码地图和候选文件前 50 行后，能定位主要功能、入口和测试。
