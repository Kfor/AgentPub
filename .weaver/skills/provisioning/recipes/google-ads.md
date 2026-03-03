# 资源开通：Google AdMob / AdSense / GA4

## 分类

| 资源 | auto | sensitive |
|------|:----:|:---------:|
| GA4 Property | false | false |
| AdSense | false | false |
| AdMob | false | false |

全部通过浏览器自动化完成，不涉及费用。

## GA4 Property

### 浏览器操作路径

1. 打开 https://analytics.google.com/
2. Admin → Create Property
3. Property name: `<project-name>`
4. 选择时区和货币
5. 创建 Web Stream:
   - Website URL: `<app-url>`
   - Stream name: `<project-name> Web`
6. 复制 Measurement ID (`G-XXXXXXXXXX`)

### 输出

```env
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

### Mobile (Firebase)

1. 打开 https://console.firebase.google.com/
2. 创建项目或选择已有项目
3. 添加 iOS / Android App
4. 下载 `google-services.json` (Android) 和 `GoogleService-Info.plist` (iOS)
5. GA4 自动通过 Firebase Analytics 启用

## AdSense

### 浏览器操作路径

1. 打开 https://www.google.com/adsense/
2. 登录 / 注册
3. 添加网站: `<app-domain>`
4. 复制 Publisher ID (`ca-pub-xxxxxxxxxxxxxxxx`)
5. 按提示在网站 `<head>` 中添加验证代码（或通过 ads.txt 验证）

### 输出

```env
NEXT_PUBLIC_ADSENSE_CLIENT_ID=ca-pub-xxxxxxxxxxxxxxxx
```

### 后续

- 网站需要有一定内容后才能通过审核
- 创建 `public/ads.txt` 文件
- 审核通过后在 AdSense Dashboard 创建广告单元，获取 slot ID

## AdMob

### 浏览器操作路径

1. 打开 https://apps.admob.google.com/
2. 登录 / 注册
3. 添加 App:
   - 平台: iOS / Android
   - App name: `<project-name>`
   - 关联 App Store / Play Store listing（如果已发布）
4. 复制 App ID (`ca-app-pub-xxxxxxxx~yyyyyyyy`)
5. 创建广告单元:
   - Banner / Interstitial / Rewarded
   - 复制各广告单元 ID

### 输出

```env
ADMOB_IOS_APP_ID=ca-app-pub-xxxxxxxx~yyyyyyyy
ADMOB_ANDROID_APP_ID=ca-app-pub-xxxxxxxx~zzzzzzzz
ADMOB_BANNER_IOS=ca-app-pub-xxx/yyy
ADMOB_BANNER_ANDROID=ca-app-pub-xxx/yyy
ADMOB_INTERSTITIAL_IOS=ca-app-pub-xxx/yyy
ADMOB_INTERSTITIAL_ANDROID=ca-app-pub-xxx/yyy
```

## 注意事项

- GA4 / AdSense / AdMob 全部使用同一个 Google 账号
- 开发阶段 AdMob 使用 Google 提供的测试广告 ID，不用真实 ID
- AdSense 在 localhost 不投放广告，开发阶段看不到
- GA4 数据有 24-48h 延迟，实时数据在 Realtime 面板
