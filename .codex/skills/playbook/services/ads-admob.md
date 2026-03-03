# 服务集成：Google AdMob (Mobile 广告)

## When to use
移动端 App 需要展示广告变现时。

## 标准配置

- **SDK**: react-native-google-mobile-ads
- **平台**: iOS + Android
- **广告格式**: Banner, Interstitial, Rewarded

## 安装

```bash
npx expo install react-native-google-mobile-ads
```

## app.json 配置

```json
{
  "expo": {
    "plugins": [
      [
        "react-native-google-mobile-ads",
        {
          "androidAppId": "ca-app-pub-xxxxxxxx~yyyyyyyy",
          "iosAppId": "ca-app-pub-xxxxxxxx~zzzzzzzz"
        }
      ]
    ]
  }
}
```

## 初始化

```typescript
// lib/admob.ts
import mobileAds from 'react-native-google-mobile-ads'

export async function initAdMob() {
  await mobileAds().initialize()
}

// 测试广告 ID（开发阶段使用）
export const TEST_ADS = {
  banner: {
    ios: 'ca-app-pub-3940256099942544/2934735716',
    android: 'ca-app-pub-3940256099942544/6300978111',
  },
  interstitial: {
    ios: 'ca-app-pub-3940256099942544/4411468910',
    android: 'ca-app-pub-3940256099942544/1033173712',
  },
  rewarded: {
    ios: 'ca-app-pub-3940256099942544/1712485313',
    android: 'ca-app-pub-3940256099942544/5224354917',
  },
}
```

## Banner 广告

```typescript
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads'

export function AdBanner({ adUnitId }: { adUnitId: string }) {
  return (
    <BannerAd
      unitId={adUnitId}
      size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
      requestOptions={{ requestNonPersonalizedAdsOnly: true }}
    />
  )
}
```

## Interstitial 广告

```typescript
import { InterstitialAd, AdEventType } from 'react-native-google-mobile-ads'

const interstitial = InterstitialAd.createForAdRequest(adUnitId)

interstitial.addAdEventListener(AdEventType.LOADED, () => {
  interstitial.show()
})

interstitial.load()
```

## Rewarded 广告

```typescript
import { RewardedAd, RewardedAdEventType } from 'react-native-google-mobile-ads'

const rewarded = RewardedAd.createForAdRequest(adUnitId)

rewarded.addAdEventListener(RewardedAdEventType.EARNED_REWARD, (reward) => {
  console.log(`User earned: ${reward.amount} ${reward.type}`)
  // 给用户发奖励
})

rewarded.load()
// 加载完成后 rewarded.show()
```

## 必需环境变量

```env
# app.config.ts 中使用
ADMOB_IOS_APP_ID=ca-app-pub-xxxxxxxx~yyyyyyyy
ADMOB_ANDROID_APP_ID=ca-app-pub-xxxxxxxx~zzzzzzzz

# 广告单元 ID（生产环境）
ADMOB_BANNER_IOS=ca-app-pub-xxx/yyy
ADMOB_BANNER_ANDROID=ca-app-pub-xxx/yyy
ADMOB_INTERSTITIAL_IOS=ca-app-pub-xxx/yyy
ADMOB_INTERSTITIAL_ANDROID=ca-app-pub-xxx/yyy
```

## 关键约束

- 开发阶段必须使用 Google 提供的测试广告 ID，不用真实广告 ID 测试
- 需要 EAS Build（AdMob 包含原生代码，Expo Go 不支持）
- iOS 需要配置 App Tracking Transparency (ATT) 弹窗
- `requestNonPersonalizedAdsOnly: true` 用于 GDPR 合规
- 广告 ID 通过环境变量管理，不硬编码
