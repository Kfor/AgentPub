# Web 技术栈：Next.js + Vercel

## 适用场景
Web 端产品：SaaS、Landing Page、Dashboard、内容站。

## 标准配置

- **框架**: Next.js (App Router)
- **部署**: Vercel
- **样式**: Tailwind CSS
- **组件库**: shadcn/ui (按需引入，不全量安装)
- **包管理**: pnpm
- **语言**: TypeScript (strict mode)

## 项目初始化

```bash
pnpm create next-app@latest <project-name> \
  --typescript --tailwind --eslint --app \
  --src-dir --import-alias "@/*"
cd <project-name>
pnpm add @supabase/supabase-js @supabase/ssr
```

## 目录结构

```
src/
  app/
    (auth)/           # 认证相关路由 (login, signup, callback)
    (dashboard)/      # 登录后路由
    api/              # API Routes (webhooks etc.)
    layout.tsx
    page.tsx
  components/
    ui/               # shadcn/ui 组件
  lib/
    supabase/
      client.ts       # 浏览器端 client
      server.ts       # 服务端 client
      middleware.ts    # Auth middleware helper
    stripe/
      client.ts
  types/
```

## 环境变量

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
SENTRY_DSN=
NEXT_PUBLIC_SENTRY_DSN=
```

## Vercel 部署规范

- 使用 Vercel CLI (`vercel link`) 关联项目
- 环境变量通过 `vercel env add` 或 Dashboard 设置
- Preview 分支：所有 PR 自动部署 preview
- Production 分支：main

## 关键约束

- 优先使用 Server Components，仅在需要交互时用 Client Components
- 数据获取优先在 Server Component 中直接调用 Supabase
- API Routes 仅用于 webhook 接收和需要 service_role_key 的操作
- 图片使用 `next/image`，字体使用 `next/font`
- Metadata 使用 `generateMetadata` 导出
