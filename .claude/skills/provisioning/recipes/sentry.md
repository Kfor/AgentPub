# 资源开通：Sentry Project

## 分类
- auto: true
- sensitive: false

## 前提
- `sentry-cli` 已安装（`brew install getsentry/tools/sentry-cli`）
- 已登录（`sentry-cli login`）

## CLI 开通步骤

```bash
# 1. 创建项目
sentry-cli projects create <project-name> --org <org-slug>

# 2. 获取 DSN
sentry-cli projects list --org <org-slug>
# 或从 Sentry Dashboard 获取 DSN

# 3. 生成 Auth Token（用于 CI/CD source map 上传）
# 需要在 https://sentry.io/settings/auth-tokens/ 创建
```

## 备选：使用 Sentry Wizard

对于 Next.js 项目，更推荐使用 Wizard 自动配置：

```bash
npx @sentry/wizard@latest -i nextjs
```

Wizard 会自动创建项目（如果不存在）并配置所有文件。

## 输出 (写入 .env)

```env
NEXT_PUBLIC_SENTRY_DSN=https://<key>@o<org-id>.ingest.sentry.io/<project-id>
SENTRY_DSN=https://<key>@o<org-id>.ingest.sentry.io/<project-id>
SENTRY_ORG=<org-slug>
SENTRY_PROJECT=<project-name>
SENTRY_AUTH_TOKEN=<auth-token>
```

## 验证

```bash
# 发送测试事件
sentry-cli send-event -m "Test event from CLI"

# 检查是否收到
# 在 Sentry Dashboard Issues 页面查看
```

## 注意事项

- 免费计划 5K errors/月，小项目足够
- Auth Token 用于 CI/CD 上传 source maps，不要泄露
- DSN 是公开的，可以放在客户端代码中
