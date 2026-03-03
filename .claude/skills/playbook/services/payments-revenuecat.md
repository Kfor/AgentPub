# 服务集成：RevenueCat (Mobile 支付)

## When to use
移动端 App (Expo/React Native) 需要内购/订阅时。

## 为什么用 RevenueCat 而非直接 StoreKit/Billing
- 统一 iOS + Android 订阅管理
- 自动处理收据验证
- 提供 Webhook 同步到后端
- Dashboard 查看订阅指标

## 安装

```bash
npx expo install react-native-purchases
```

## 初始化

```typescript
// lib/revenuecat.ts
import Purchases from 'react-native-purchases'
import { Platform } from 'react-native'

const API_KEYS = {
  ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY!,
  android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY!,
}

export async function initPurchases(userId: string) {
  Purchases.configure({
    apiKey: Platform.OS === 'ios' ? API_KEYS.ios : API_KEYS.android,
    appUserID: userId, // 使用 Supabase user ID
  })
}
```

## 获取产品和购买

```typescript
import Purchases from 'react-native-purchases'

// 获取可购买产品
async function getOfferings() {
  const offerings = await Purchases.getOfferings()
  return offerings.current?.availablePackages ?? []
}

// 购买
async function purchasePackage(pkg: PurchasesPackage) {
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg)
    // 检查是否有活跃的 entitlement
    if (customerInfo.entitlements.active['pro']) {
      // 用户已订阅
    }
  } catch (e) {
    if (!e.userCancelled) {
      throw e
    }
  }
}

// 检查订阅状态
async function checkSubscription(): Promise<boolean> {
  const customerInfo = await Purchases.getCustomerInfo()
  return !!customerInfo.entitlements.active['pro']
}

// 恢复购买
async function restorePurchases() {
  const customerInfo = await Purchases.restorePurchases()
  return !!customerInfo.entitlements.active['pro']
}
```

## Webhook 同步到 Supabase

在 RevenueCat Dashboard 配置 Webhook URL 指向后端：

```typescript
// Supabase Edge Function 或 FastAPI endpoint
// POST /api/webhooks/revenuecat
async function handleRevenueCatWebhook(req: Request) {
  const event = await req.json()

  const userId = event.app_user_id  // = Supabase user ID
  const isActive = event.type === 'INITIAL_PURCHASE'
    || event.type === 'RENEWAL'
    || event.type === 'UNCANCELLATION'

  const isCancelled = event.type === 'CANCELLATION'
    || event.type === 'EXPIRATION'

  await supabaseAdmin.from('subscriptions').upsert({
    user_id: userId,
    status: isActive ? 'active' : isCancelled ? 'cancelled' : event.type,
    product_id: event.product_id,
    expires_at: event.expiration_at_ms
      ? new Date(event.expiration_at_ms).toISOString()
      : null,
  })
}
```

## RevenueCat 配置清单

1. 在 RevenueCat Dashboard 创建项目
2. 配置 iOS App (需 App Store Connect 的 Shared Secret)
3. 配置 Android App (需 Google Play Service Account JSON)
4. 创建 Entitlements (e.g., "pro")
5. 创建 Offerings + Packages
6. 在 App Store Connect / Google Play Console 创建 IAP 产品
7. 配置 Webhook URL

## 必需环境变量

- `EXPO_PUBLIC_REVENUECAT_IOS_KEY`
- `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY`

## 关键约束

- `appUserID` 必须设置为 Supabase user ID，保证跨平台同步
- 订阅状态以 RevenueCat 的 `customerInfo` 为准
- 必须实现 `restorePurchases` 功能（App Store 审核要求）
- 价格不硬编码，从 Offerings API 动态获取
