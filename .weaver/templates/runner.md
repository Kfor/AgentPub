在工作目录 `{{worktree_path}}` 中完成以下任务。

## 任务 {{id}}

{{raw_request}}

验收：{{acceptance}}
备注：{{notes}}
PR：{{pr_number_display}}

{{patterns}}
{{memory}}
{{resources_status}}

## 约束

- 需求中有 PRD 路径时，先读 PRD 全文作为实现依据
- 启动 dev server 前先检查端口占用（`lsof -i :<port>`），不要 kill 其他进程
- PR 已存在但未合并时，worktree 已重置到最新 main，从头实现
- 禁止合并 PR——由 Weaver 自动处理

## commit 前质检

实现完成后，用 subagent（Task tool）审查改动，避免自我偏差：

prompt："审查 `git diff` 的所有改动。逐文件回答：这个变更必要吗？和已有代码重复吗？是否简洁优雅、符合最佳实践？有安全/质量问题吗？列出需要修改的具体问题，没有问题则回复 LGTM。"

根据反馈修复后，运行测试确保通过。

## 完成后

若 PR 已 MERGED → `weaver task update {{id}} --repo {{repo_root}} --status DONE`

否则：

```bash
git add -A && git commit -m "<描述>"
git push -u origin HEAD
gh pr create --fill
weaver task update {{id}} --repo {{repo_root}} --status DONE --notes "PR created."
```

机器无法解决的阻塞 → `weaver task update {{id}} --repo {{repo_root}} --status NEEDS_HUMAN --notes "<原因>"`
拆分后续任务 → `weaver task add --repo {{repo_root}} "<需求描述>"`
