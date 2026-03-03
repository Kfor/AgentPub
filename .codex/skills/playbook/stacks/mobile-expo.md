# 移动端技术栈：Expo

## 适用场景
iOS / Android 移动应用。

## 标准配置

- **框架**: Expo (Managed workflow, SDK 最新稳定版)
- **路由**: Expo Router (文件系统路由)
- **样式**: NativeWind (Tailwind for React Native)
- **语言**: TypeScript
- **构建**: EAS Build + EAS Submit
- **OTA 更新**: EAS Update

## 项目初始化

```bash
npx create-expo-app@latest <project-name> --template tabs
cd <project-name>
npx expo install @supabase/supabase-js
npx expo install expo-secure-store expo-auth-session expo-web-browser
npx expo install nativewind tailwindcss
```

## 目录结构

```
app/
  (tabs)/              # Tab 导航
  (auth)/              # 认证流程
  _layout.tsx          # Root layout
lib/
  supabase.ts          # Supabase client (使用 expo-secure-store)
  revenuecat.ts        # RevenueCat 初始化
components/
  ui/                  # 通用 UI 组件
constants/
hooks/
types/
```

## 环境变量

使用 `expo-constants` + `app.config.ts`：

```typescript
// app.config.ts
export default {
  expo: {
    extra: {
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
      revenuecatApiKey: process.env.EXPO_PUBLIC_REVENUECAT_API_KEY,
      sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
    },
  },
};
```

## Supabase Client (Expo 专用)

```typescript
// lib/supabase.ts
import { createClient } from '@supabase/supabase-js'
import * as SecureStore from 'expo-secure-store'

const ExpoSecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
}

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      storage: ExpoSecureStoreAdapter,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
)
```

## 构建与发布

```bash
# 开发
npx expo start

# 构建
eas build --platform ios --profile production
eas build --platform android --profile production

# 提交到商店
eas submit --platform ios
eas submit --platform android

# OTA 更新
eas update --branch production --message "描述"
```

## 关键约束

- Token 存储必须用 `expo-secure-store`，不用 AsyncStorage
- Deep link 配置在 `app.json` 的 `scheme` 字段
- OAuth 回调使用 `expo-auth-session` 的 `makeRedirectUri()`
- 使用 EAS Build（不使用 `expo build` 旧方式）
