# 服务集成：Google Analytics 4 (GA4)

## When to use
需要页面访问量、用户来源、转化漏斗等 Web/App 分析时。

## 方案选择

| 场景 | 推荐 |
|------|------|
| 需要 SEO / 流量分析 / 广告归因 | GA4（与 Google Ads / Search Console 天然集成）|
| 需要用户行为录屏 / 热力图 | Smartlook / PostHog（见 analytics.md）|
| 两者都需要 | GA4 + Smartlook 并行 |

GA4 和 Smartlook/PostHog 不冲突，各司其职。

## Next.js 集成

### 使用 next/third-parties（推荐）

```bash
pnpm add @next/third-parties
```

```typescript
// app/layout.tsx
import { GoogleAnalytics } from '@next/third-parties/google'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>{children}</body>
      <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID!} />
    </html>
  )
}
```

### 自定义事件

```typescript
// lib/analytics.ts
export function trackEvent(eventName: string, params?: Record<string, string | number>) {
  if (typeof window === 'undefined') return
  const gtag = (window as any).gtag
  if (!gtag) return
  gtag('event', eventName, params)
}

// 使用
trackEvent('purchase', { value: 9.99, currency: 'USD' })
trackEvent('sign_up', { method: 'google' })
```

### 页面浏览自动追踪

Next.js App Router 页面切换自动被 GA4 追踪（通过 `@next/third-parties` 的 History API 监听）。无需手动处理。

## Expo 集成

```bash
npx expo install @react-native-firebase/app @react-native-firebase/analytics
```

```typescript
// lib/analytics.ts
import analytics from '@react-native-firebase/analytics'

export async function trackScreenView(screenName: string) {
  await analytics().logScreenView({ screen_name: screenName })
}

export async function trackEvent(eventName: string, params?: Record<string, unknown>) {
  await analytics().logEvent(eventName, params)
}

// 标准电商事件
export async function trackPurchase(value: number, currency: string, items: any[]) {
  await analytics().logPurchase({ value, currency, items })
}
```

注意：Expo 中 GA4 通过 Firebase Analytics SDK 接入，需要 EAS Build。

## 必需环境变量

Web:
```env
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

Mobile (Firebase):
```env
# 通过 google-services.json (Android) 和 GoogleService-Info.plist (iOS) 配置
# 这两个文件从 Firebase Console 下载
```

## 标准追踪事件

GA4 内置事件（优先使用内置名称）：

- `sign_up` — 注册
- `login` — 登录
- `purchase` — 购买
- `begin_checkout` — 开始结账
- `add_to_cart` — 加入购物车
- `view_item` — 查看商品
- `search` — 搜索
- `share` — 分享

自定义事件命名：`snake_case`，与内置事件风格一致。

## 关键约束

- Measurement ID 格式：`G-XXXXXXXXXX`（Web）
- Mobile 必须通过 Firebase 接入
- 数据处理有 24-48h 延迟（实时数据在 Realtime 面板）
- 事件参数值有长度限制（100 字符）
- 不追踪 PII（邮箱、姓名等）到 GA4
- User ID 关联：登录后 `gtag('set', { user_id: supabaseUserId })`
