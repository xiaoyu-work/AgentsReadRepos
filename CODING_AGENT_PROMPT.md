# Repository Agent-Readability Migration Prompt

把下面代码块中的内容作为一个完整 Prompt 交给 coding agent，并让它在目标仓库根目录运行。若检查器不在目标仓库中，请把 `<CHECKER_PATH>` 替换为本目录中 `check-agent-readability.mjs` 的绝对路径。检查器需要 Node.js 18 或更高版本，不依赖第三方 npm 包。

```text
你正在改造当前仓库，使后续 coding agent 能以更少的检索和上下文快速、准确地理解代码。

最终目标：
1. 创建或完善根目录 AGENTS.md。
2. 为每个重要源码目录创建或完善 AGENTS.md。
3. 创建准确且完整的 .agent/repo-map.json。
4. 为每个未豁免源文件增加前 50 行内的固定格式 agent 摘要。
5. 处理超大源文件：安全时按职责重构；缺乏测试保护或属于生成代码时使用有具体理由的最小豁免。
6. 使用 Agent-Friendly Repository Standard v1.0 的检查器达到通过状态。

工作规则：
- 先完整调查，再编辑。使用仓库已有的符号搜索、语言服务、构建清单和测试，不要仅凭文件名猜测用途。
- 尊重现有 AGENTS.md、README 和架构文档；合并有效内容，不要无理由覆盖用户文档。
- 不改变产品行为、公共 API、持久化格式或网络协议，除非安全拆分超大文件确实需要，并且已有测试能够验证等价性。
- 保持用户仓库现有目录结构。不得移动、重命名、合并或重新组织现有目录和文件。
- 允许的结构变化只有两类：在原源文件所在目录内拆分该文件；增加 AGENTS.md、.agent/repo-map.json 或本标准要求的其他 agent 可读文件。
- 重构必须按目录顺序进行，并且一次只处理一个源文件。完成该文件的拆分、引用修复、相关验证和文档更新后，才能处理下一个文件。
- 不得同时批量拆分多个文件，不得跨多个目录进行一次性重构。
- 每个未豁免源文件必须在前 50 行加入固定格式 agent 摘要，使后续 agent 无需读取全文就能判断该文件是否相关。
- 文件头列出全部公开或导出符号，但不复制普通私有辅助方法清单；公开符号必须与 repo-map.json 保持一致。
- 描述必须具体并可由代码验证。禁止使用“处理相关逻辑”“工具方法”“业务模块”等占位描述。
- 不要通过广泛 exclude、虚假 purpose、空章节或无意义豁免来让检查器通过。
- 不修改依赖、生成产物和第三方代码，除非完成任务确实必要。
- 保留仓库现有格式、命名和文档语言；仓库没有明确语言偏好时，沿用 README 的主要语言。

执行步骤：

一、建立事实清单
- 识别语言、构建系统、包/工作区边界、运行入口、公共 API、主要数据流、外部系统和测试命令。
- 列出所有源文件，并识别公开/导出的类、函数、接口和常量。
- 区分生产代码、测试、配置、生成代码、依赖和构建产物。
- 找到已有文档中的有效架构说明和仓库特有约束。

二、创建或完善根目录 AGENTS.md
如果可以访问本工具目录中的 ROOT_AGENTS_TEMPLATE.md，以它作为结构模板，但必须根据当前仓库的代码事实替换全部占位符，不能原样复制。

必须包含非空章节：
- Purpose：仓库解决的问题及范围。
- Architecture：模块关系、依赖方向和主要数据流。
- Entry Points：运行入口、公共 API 入口及推荐阅读起点，使用相对路径。
- Development：安装、启动和构建命令。
- Testing：最小相关测试和完整测试命令。
- Conventions：仓库特有约定、不变量和禁止事项。

内容应短而密集，链接到模块 AGENTS.md，而不是复制模块细节。

三、为重要目录创建或完善 AGENTS.md
重要目录是满足任一条件的非根目录：
- 直接包含至少 3 个源文件；
- 名为 src、app、lib、libs、packages、services、modules 或 components，并递归包含至少 5 个源文件；
- 包含 package.json、pyproject.toml、go.mod、Cargo.toml、pom.xml、*.csproj 等构建清单，且其下存在源文件。

每份目录文档必须包含：
- Purpose
- Responsibilities
- Key Files
- Dependencies
- Tests

说明职责边界、关键文件及阅读顺序、上下游关系、关键约束和测试位置。纯分类目录不应复制同一段文字；如确实无需单独文档，在配置中按单个目录给出具体理由。

四、创建 .agent/repo-map.json
使用以下结构：
{
  "schemaVersion": 1,
  "generatedAt": "<带时区的 ISO 8601 时间>",
  "sourceFingerprint": "<检查器输出的 SHA-256>",
  "entryPoints": [
    {"path": "<相对路径>", "purpose": "<具体用途>"}
  ],
  "modules": [
    {"path": "<目录>", "purpose": "<具体职责>", "guide": "<目录/AGENTS.md>"}
  ],
  "files": [
    {
      "path": "<源文件相对路径>",
      "kind": "source|test|generated|config",
      "purpose": "<该文件独有的具体职责>",
      "publicSymbols": ["<公开或导出的符号>"]
    }
  ]
}

要求：
- 路径一律使用 /，并相对于仓库根目录。
- files 覆盖检查器识别的所有未排除源文件。
- modules 覆盖所有未豁免的重要目录。
- entryPoints 至少包含一个运行、阅读或公共 API 入口；库项目填写公共导出入口。
- purpose 至少 8 个非空白字符，且必须能区分相邻文件。
- publicSymbols 只列公开/导出符号；没有时填写 []。
- 优先使用语言 AST、符号工具或现有文档生成信息，不要用不可靠的正则猜测复杂语言语义。

五、逐文件增加顶部 agent 摘要
按目录顺序、一次只处理一个源文件。在该文件前 50 行内使用当前语言的原生注释格式加入：

@agent-file
@agent-purpose: <至少 8 个非空白字符，准确说明该文件独有职责>
@agent-public-api: <全部公开或导出符号；没有时写 none>
@agent-invariants: <重要约束；没有时写 none>
@agent-side-effects: <I/O、网络、数据库或全局状态副作用；没有时写 none>

要求：
- 五个字段必须按以上顺序出现在不超过 15 行的注释块中。
- shebang、编码声明或法定版权头可以在摘要之前，但摘要必须完整位于前 50 行。
- 不得写占位描述，不得省略不适用字段；使用 none 明确表示不适用。
- 文件职责、公开符号、约束或副作用改变时，同时更新摘要。
- 完成一个文件的摘要、repo-map 条目和引用核对后，再处理下一个文件。
- 只有不可直接编辑的生成文件可以使用 exemptions.fileHeaders 豁免。

六、控制文件规模
- 800 行以内为推荐目标。
- 801–2000 行会产生警告，应判断是否存在自然且可测试的拆分边界。
- 超过 2000 行必须安全拆分，或在 .agent-readability.json 的 exemptions.oversizedFiles 中按单文件写明具体原因。
- 不要为了行数机械切分强耦合代码。任何代码重构后运行最小相关测试。

拆分执行顺序：
1. 选择一个目录，其他目录暂时不修改。
2. 在当前目录中选择一个超大源文件，其他源文件暂时不拆分。
3. 只把该文件中的独立职责提取为同目录的新文件，不移动或重命名原有文件和目录。
4. 修复与该文件直接相关的导入、导出、注册和测试引用。
5. 运行覆盖该文件的最小现有验证，并更新对应 AGENTS.md 和 repo-map.json。
6. 确认该文件完整后，再处理当前目录的下一个文件；当前目录完成后，才进入下一个目录。

禁止把多个目录或多个源文件的拆分积累成一次大范围改动。

七、配置例外
仅在确实必要时创建 .agent-readability.json。例外格式：
{
  "version": 1,
  "exemptions": {
    "oversizedFiles": {"path/to/file": "具体原因"},
    "directoryGuides": {"path/to/directory": "具体原因"},
    "mapFiles": {"path/to/file": "具体原因"},
    "fileHeaders": {"path/to/generated-file": "生成来源及无法直接编辑的原因"}
  }
}

例外必须最小化到具体路径。禁止排除整个 src、app、packages 或等价业务代码根目录。

八、验证并迭代
1. 先运行仓库原有的最小相关测试，记录基线；如仅修改文档和 JSON，可跳过无关完整测试。
2. 运行：
   node "<CHECKER_PATH>" . --fingerprint
3. 把输出写入 repo-map.json 的 sourceFingerprint，并最后更新 generatedAt。
4. 运行：
   node "<CHECKER_PATH>" .
5. 修复所有 error，并达到默认 85 分以上。不要仅降低 minScore。
6. 若改动了源代码，运行覆盖改动行为的现有测试、类型检查或构建。
7. 再运行一次检查器，确保代码地图指纹仍是最新的。

完成前进行语义抽查：
- 随机抽取至少 3 个 repo-map 文件条目，与源码逐项核对 purpose 和 publicSymbols。
- 随机抽取至少 3 个文件头，确认 purpose、public API、不变量和副作用与源码一致。
- 从每个 entry point 跟踪至少一条调用链，确认根文档的架构描述和依赖方向。
- 确认所有文档命令可从仓库根目录直接执行，或明确标注执行目录。

最终回复只需说明：
- 创建或更新了哪些导航产物；
- 是否有超大文件、目录文档、代码地图或文件头豁免及其原因；
- 检查器最终得分；
- 若改动代码，列出执行过的相关验证。
```
