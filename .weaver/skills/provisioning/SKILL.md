---
name: provisioning
description: 外部资源自动化开通。在项目需要创建外部服务账号/项目（数据库、认证、支付、监控等）、任务因缺少 API key/账号/环境配置而阻塞、或新项目 Foundation 阶段开通基础设施时使用。
---

## 核心原则

资源开通完成后，必须产出 `docs/infrastructure.md` 作为项目基础设施的唯一事实来源。后续所有开发和运维都遵照此文档。

## 资源清单

项目所需资源记录在 `.weaver/resources.yaml` 中：

```yaml
resources:
  - id: supabase-schema
    type: supabase
    status: pending     # pending / provisioned / failed
    auto: true
    sensitive: false
    outputs: [SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_SCHEMA]
```

## 开通策略

按优先级依次尝试：

1. **CLI 自动化**（auto: true）
   - 直接执行对应 CLI 命令
   - 将输出的 credentials 写入 `.env`
   - 标记 resource 为 `provisioned`

2. **浏览器自动化**（auto: false, sensitive: false）
   - 使用 Playwright 打开浏览器
   - 按 recipe 中定义的操作路径自动完成
   - 将获取的 credentials 写入 `.env`

3. **人工确认**（auto: false, sensitive: true）
   - 使用 Playwright 导航到目标页面
   - 在涉及费用/敏感操作的确认步骤前暂停
   - 设置任务为 `NEEDS_HUMAN`，说明需要确认什么
   - 人类确认后继续

## 资源分类

| 资源 | auto | sensitive | 开通方式 |
|------|:----:|:---------:|---------|
| Supabase Schema | true | false | `supabase` CLI link + migration |
| Vercel Project | true | false | `vercel` CLI |
| Sentry Project | true | false | `sentry-cli` 或 Wizard |
| Stripe (Test) | true | false | `stripe` CLI |
| GA4 Property | false | false | 浏览器自动化 |
| AdSense | false | false | 浏览器自动化 |
| AdMob | false | false | 浏览器自动化 |
| Google OAuth | false | true | 浏览器 + 人工确认 |
| Apple OAuth | false | true | 浏览器 + 人工确认 |
| Stripe (Live) | false | true | 浏览器 + 人工确认（上线时） |
| RevenueCat Project | false | false | 浏览器自动化 |
| OpenRouter API Key | false | true | 浏览器 + 人工确认 |
| 域名 | false | true | 浏览器 + 人工确认 |

## 执行流程

```
1. 读取 .weaver/resources.yaml
2. 找到所有 status: pending 的资源
3. 按依赖顺序执行
4. 每个资源：
   a. 读取对应 recipe（recipes/<type>.md）
   b. 按策略执行
   c. 将 credentials 追加到 .env
   d. 更新 resources.yaml 状态
5. 所有资源就绪后，产出 docs/infrastructure.md
```

## 依赖顺序

```
supabase-schema (第一个，其他服务需要其 URL)
  ├── google-oauth (需要 Supabase 回调 URL)
  ├── apple-oauth (需要 Supabase 回调 URL)
  └── ga4 (独立，但通常同时配)
vercel-project (独立)
stripe-test (独立)
sentry-project (独立)
admob / adsense (独立)
revenuecat-project (独立)
```

## Infrastructure 文档（必须产出）

所有资源开通完成后，产出 `docs/infrastructure.md`：

```markdown
# Infrastructure

## 项目标识
- 项目名：<name>
- Supabase 实例：smallproj
- Supabase Schema：<project_slug>
- Vercel 项目：<vercel-project-name>
- Sentry 项目：<sentry-project-name>

## 环境变量清单
| 变量名 | 来源 | 说明 |
|--------|------|------|
| NEXT_PUBLIC_SUPABASE_URL | Supabase | smallproj 实例 URL |
| ... | ... | ... |

## 服务端点
- Web Preview: https://<project>.vercel.app
- Supabase API: https://<ref>.supabase.co
- Sentry: https://sentry.io/organizations/<org>/projects/<project>/

## 开发环境启动
<从 PRD 的 Environment Bootstrap 提取>

## 生产部署
<Vercel 自动部署流程>

## 待上线时处理
- [ ] Stripe 生产激活
- [ ] Google OAuth Consent Screen 审核
- [ ] 自定义域名绑定
```

此文档是后续开发和运维的唯一事实来源。Agent 在开发任务中遇到环境/资源问题时，首先查阅此文档。

## .env 管理

- 所有 credentials 写入项目根目录 `.env`
- `.env` 必须在 `.gitignore` 中
- 不同环境通过 `.env.local`、`.env.production` 区分
- Vercel / Supabase 的 production 环境变量另通过各自 CLI 设置

## 详细操作步骤

每种资源的具体操作步骤参考 `recipes/` 子目录：
- [recipes/supabase.md](recipes/supabase.md) — Supabase 共享实例 + schema 隔离
- [recipes/vercel.md](recipes/vercel.md) — Vercel 项目创建
- [recipes/sentry.md](recipes/sentry.md) — Sentry 项目创建
- [recipes/stripe.md](recipes/stripe.md) — Stripe 测试模式配置
- [recipes/google-oauth.md](recipes/google-oauth.md) — Google OAuth 配置
- [recipes/google-ads.md](recipes/google-ads.md) — GA4 / AdSense / AdMob
- [recipes/openrouter.md](recipes/openrouter.md) — OpenRouter API Key
