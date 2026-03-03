## 任务创建规则

### 粒度

默认尽可能少的任务。一个 agent 可完成数千行代码。
只在子系统零文件重叠且规模庞大时拆分。并行修改同一文件 = merge conflict。

### raw_request 内容

- 简单需求：写清楚完整需求，agent 直接执行
- 有 PRD 时：**不要总结 PRD 内容**，写 `PRD: docs/prds/<slug>.md`，agent 会读全文
- 必须具体到可直接实现：目标、范围、关键行为、主要约束

### 验收提示

`--acceptance` 写一句概括即可，agent 以 raw_request / PRD 为准。

### 依赖与超时

- 有先后依赖必须用 `--depends-on` 声明
- 长耗时任务设 `--timeout-minutes`

### QA 任务

大型需求（完整功能链路、跨模块协作、端到端用户流程）必须创建 QA 任务：
- `--depends-on` 指向实现任务
- raw_request 写明：验证目标、端到端测试场景、verdict 为 PASS/FAIL/BLOCKED
- 普通需求（UI 调整、bugfix、单模块功能、配置修改）不需要 QA——runner 自行测试即可

### NEEDS_HUMAN

仅用于人类才能提供的东西（凭证、付费审批、主观决策）。
能通过代码/配置/命令解决的，自主处理。

### 命令

```bash
# 简单需求
weaver task add --repo {{repoPath}} --acceptance "<验收>" "<标题。需求描述。>"

# 有 PRD
weaver prd archive {{draftPath}} --repo {{repoPath}}
weaver task add --repo {{repoPath}} --acceptance "<验收>" "<标题。PRD: docs/prds/<slug>.md>"

# 依赖
weaver task add --repo {{repoPath}} --depends-on T123 "<标题。需求。>"

# 补依赖
weaver task update <taskId> --repo {{repoPath}} --depends-on T123

# QA 任务（大型端到端测试）
weaver task add --repo {{repoPath}} --depends-on T123 --acceptance "E2E QA pass" "QA: 端到端验证<功能>。运行完整测试套件，回归测试核心流程，verdict: PASS/FAIL/BLOCKED。"
```

### 其他约束

- 禁止手工编辑 `.weaver/tasks.yaml`
- 禁止后台运行——所有命令前台执行
- 默认直接创建任务，不等待确认
