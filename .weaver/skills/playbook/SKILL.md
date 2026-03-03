---
name: playbook
description: 技术选型与架构决策手册。在新项目初始化、PRD 编写、选择技术栈/数据库/认证/支付/监控方案、或不确定该用什么工具和服务时使用。
---

## 标准技术栈组合

| 场景 | 技术栈 |
|------|--------|
| Web 产品 (SaaS/Landing) | Next.js + Vercel + Stripe |
| 移动端 App | Expo + RevenueCat |
| 简单后端逻辑 | Supabase Edge Functions |
| 复杂后端服务 | FastAPI (Python) |
| 数据库 & 存储 & 认证 | Supabase (共享 smallproj 实例，schema 隔离) |
| 错误监控 | Sentry |
| Web 流量分析 | GA4 |
| 用户行为追踪/录屏 | Smartlook 或 PostHog |
| Web 广告变现 | Google AdSense |
| Mobile 广告变现 | Google AdMob |
| AB 测试 | 自建（见 [services/ab-testing.md](services/ab-testing.md)）|

## 选型规则

1. **认证/数据库/存储统一用 Supabase**，不引入额外 BaaS
2. **Supabase 共享实例**：默认 link 到 `smallproj`，每个项目用独立 schema 隔离
3. **后端逻辑先评估复杂度**：能用 Edge Function 解决就不开独立服务
4. **支付按平台分**：Web 用 Stripe，Mobile 用 RevenueCat
5. **监控必装**：Sentry 是所有项目的标配，在 Foundation 阶段就集成
6. **GA4 必装**：Web 项目必接 GA4（SEO 和流量分析），与 Smartlook 不冲突
7. **用户追踪按需**：面向 C 端产品必装 Smartlook/PostHog，内部工具可跳过
8. **广告按需**：有变现需求的项目接入 AdSense (Web) / AdMob (Mobile)

## 项目阶段判断

根据项目当前状态自行判断所处阶段：

**尚未确认技术方案时**（项目无 `docs/architecture.md` 或内容不完整）：
- 首要任务是根据本 playbook 的 stacks/ 和 services/ 选择技术方案
- 产出 Architecture Decision Record，写入 `docs/architecture.md`
- 列出所需外部资源清单，写入 `.weaver/resources.yaml`
- 技术方案确认后才允许创建实现任务

**技术方案已确认但资源未就绪时**（`.weaver/resources.yaml` 中有 pending 项）：
- 参考 `provisioning` skill 开通资源
- 开通完成后产出 `docs/infrastructure.md`
- 可以并行进行不依赖这些资源的基础搭建工作

**资源就绪后**：
- 正常执行实现任务
- 实现时参考对应 service 文档的标准做法和代码片段
- 遇到环境/资源问题时首先查阅 `docs/infrastructure.md`

## 详细规范

技术栈详情参考 `stacks/` 子目录：
- [stacks/web-nextjs.md](stacks/web-nextjs.md) — Next.js + Vercel 标准配置
- [stacks/mobile-expo.md](stacks/mobile-expo.md) — Expo 标准配置
- [stacks/backend-serverless.md](stacks/backend-serverless.md) — Supabase Edge Functions
- [stacks/backend-service.md](stacks/backend-service.md) — FastAPI 独立服务

服务集成规范参考 `services/` 子目录：
- [services/auth-supabase.md](services/auth-supabase.md) — 认证
- [services/db-supabase.md](services/db-supabase.md) — 数据库（共享实例 + schema 隔离）
- [services/payments-stripe.md](services/payments-stripe.md) — Web 支付
- [services/payments-revenuecat.md](services/payments-revenuecat.md) — Mobile 支付
- [services/monitoring-sentry.md](services/monitoring-sentry.md) — 错误监控
- [services/analytics-ga4.md](services/analytics-ga4.md) — GA4 流量分析
- [services/analytics.md](services/analytics.md) — 用户行为追踪/录屏
- [services/ads-adsense.md](services/ads-adsense.md) — Web 广告
- [services/ads-admob.md](services/ads-admob.md) — Mobile 广告
- [services/ab-testing.md](services/ab-testing.md) — AB 测试
