# 服务集成：用户行为追踪与录屏

## When to use
面向 C 端用户的产品必装。内部工具/后台管理可跳过。

## 推荐方案

| 方案 | 适用场景 | 特点 |
|------|---------|------|
| **Smartlook** (SaaS) | 不想运维，需要快速接入 | Session Replay + Event Analytics，简单好用 |
| **PostHog** (Self-hosted) | 想要数据自主权，预算有限 | 功能全面（Replay + Analytics + Feature Flags），需要运维 Docker |

默认推荐 Smartlook（SaaS），除非项目有数据合规要求或需要 Feature Flags。

## Smartlook 集成

### Next.js

```typescript
// components/SmartlookInit.tsx
"use client"
import { useEffect } from 'react'

export function SmartlookInit() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    const script = document.createElement('script')
    script.innerHTML = `
      window.smartlook||(function(d) {
        var o=smartlook=function(){ o.api.push(arguments)},h=d.getElementsByTagName('head')[0];
        var c=d.createElement('script');o.api=new Array();c.async=true;
        c.type='text/javascript';c.charset='utf-8';
        c.src='https://web-sdk.smartlook.com/recorder.js';
        h.appendChild(c);
      })(document);
      smartlook('init', '${process.env.NEXT_PUBLIC_SMARTLOOK_KEY}', { region: 'eu' });
    `
    document.head.appendChild(script)
  }, [])
  return null
}

// app/layout.tsx 中引入
// <SmartlookInit />
```

### 用户关联

```typescript
// 登录后调用
smartlook('identify', supabaseUserId, {
  email: user.email,
  name: user.full_name,
  plan: user.subscription_status,
})
```

### 自定义事件

```typescript
smartlook('track', 'checkout_started', { plan: 'pro', price: 9.99 })
smartlook('track', 'feature_used', { feature: 'export_pdf' })
```

### Expo / React Native

```bash
npx expo install @smartlook/react-native-smartlook
```

```typescript
import Smartlook from '@smartlook/react-native-smartlook'

Smartlook.setup({ smartlookAPIKey: process.env.EXPO_PUBLIC_SMARTLOOK_KEY! })
Smartlook.setUser({ identifier: supabaseUserId, email: user.email })
```

## PostHog 集成（备选）

### Next.js

```bash
pnpm add posthog-js
```

```typescript
// lib/posthog.ts
import posthog from 'posthog-js'

export function initPostHog() {
  if (typeof window === 'undefined') return
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com',
    capture_pageview: true,
    capture_pageleave: true,
    session_recording: { maskAllInputs: true },
  })
}
```

## 必需环境变量

Smartlook：
- `NEXT_PUBLIC_SMARTLOOK_KEY` / `EXPO_PUBLIC_SMARTLOOK_KEY`

PostHog：
- `NEXT_PUBLIC_POSTHOG_KEY`
- `NEXT_PUBLIC_POSTHOG_HOST`

## 追踪规范

### 必须追踪的关键事件

- `signup_completed` — 注册完成
- `login_completed` — 登录完成
- `onboarding_step_{n}` — 引导步骤
- `feature_used:{name}` — 核心功能使用
- `checkout_started` — 开始支付
- `checkout_completed` — 支付完成
- `subscription_cancelled` — 取消订阅
- `error_encountered` — 用户可见错误

### 命名规范

- 事件名：`snake_case`
- 属性名：`snake_case`
- 不追踪 PII（密码、信用卡等）
