# 服务集成：Sentry (错误监控)

## When to use
所有项目必装。在 Foundation 阶段就集成。

## 方案
使用 Sentry SaaS（不自建），错误追踪的 source map / release tracking / issue grouping 自建成本远超价值。

## Next.js 集成

### 安装

```bash
npx @sentry/wizard@latest -i nextjs
```

Wizard 会自动：
- 安装 `@sentry/nextjs`
- 创建 `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`
- 更新 `next.config.js` 包裹 `withSentryConfig`
- 创建 `instrumentation.ts`

### 关键配置

```typescript
// sentry.client.config.ts
import * as Sentry from "@sentry/nextjs"

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,        // 生产环境 10% 采样
  replaysSessionSampleRate: 0,   // 不录制 session replay（用 Smartlook）
  replaysOnErrorSampleRate: 1.0, // 错误时 100% 录制
})
```

### Error Boundary

```typescript
// app/global-error.tsx
"use client"
import * as Sentry from "@sentry/nextjs"
import { useEffect } from "react"

export default function GlobalError({ error, reset }: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => { Sentry.captureException(error) }, [error])

  return (
    <html><body>
      <h2>Something went wrong</h2>
      <button onClick={() => reset()}>Try again</button>
    </body></html>
  )
}
```

## Expo 集成

### 安装

```bash
npx expo install @sentry/react-native
```

### 配置

```typescript
// app/_layout.tsx
import * as Sentry from '@sentry/react-native'

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
})

// 包裹根组件
export default Sentry.wrap(function RootLayout() {
  // ...
})
```

### EAS Build 集成（Source Maps）

```json
// app.json
{
  "expo": {
    "plugins": [
      ["@sentry/react-native/expo", {
        "organization": "your-org",
        "project": "your-project"
      }]
    ]
  }
}
```

## FastAPI 集成

```python
import sentry_sdk

sentry_sdk.init(
    dsn=settings.sentry_dsn,
    traces_sample_rate=0.1,
    profiles_sample_rate=0.1,
)
```

FastAPI 自动集成，无需额外中间件。

## 必需环境变量

- `NEXT_PUBLIC_SENTRY_DSN` / `EXPO_PUBLIC_SENTRY_DSN` — 客户端 DSN
- `SENTRY_DSN` — 服务端 DSN（通常同一个值）
- `SENTRY_AUTH_TOKEN` — 仅 CI/CD 上传 source maps 用
- `SENTRY_ORG` — 组织名
- `SENTRY_PROJECT` — 项目名

## 关键约束

- 生产环境 `tracesSampleRate` 不超过 0.1
- Source maps 必须上传（Wizard 默认配置）
- 不用 Sentry 的 Session Replay（用专门的 analytics 工具）
- Release 名称与 git tag / commit hash 对齐
