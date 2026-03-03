# 服务集成：Google AdSense (Web 广告)

## When to use
Web 产品需要展示广告变现时。

## 标准配置

- **平台**: Next.js (Web)
- **广告格式**: Auto Ads, Display, In-article, In-feed

## 接入步骤

### 1. AdSense 脚本

```typescript
// components/AdSenseScript.tsx
"use client"
import Script from 'next/script'

export function AdSenseScript() {
  return (
    <Script
      async
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID}`}
      crossOrigin="anonymous"
      strategy="afterInteractive"
    />
  )
}

// app/layout.tsx 中引入
// <AdSenseScript />
```

### 2. 广告组件

```typescript
// components/AdUnit.tsx
"use client"
import { useEffect, useRef } from 'react'

interface AdUnitProps {
  slot: string
  format?: 'auto' | 'fluid' | 'rectangle' | 'horizontal' | 'vertical'
  responsive?: boolean
  className?: string
}

export function AdUnit({ slot, format = 'auto', responsive = true, className }: AdUnitProps) {
  const adRef = useRef<HTMLModElement>(null)

  useEffect(() => {
    try {
      ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({})
    } catch {}
  }, [])

  return (
    <div className={className}>
      <ins
        ref={adRef}
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID}
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive={responsive ? 'true' : 'false'}
      />
    </div>
  )
}
```

### 3. 使用

```tsx
// 在页面中
<AdUnit slot="1234567890" />
<AdUnit slot="0987654321" format="horizontal" />
```

## Auto Ads

如果启用 Auto Ads（AdSense 自动在合适位置插入广告），只需要加载脚本即可，无需手动放置广告组件。在 AdSense Dashboard 中启用。

## 必需环境变量

```env
NEXT_PUBLIC_ADSENSE_CLIENT_ID=ca-pub-xxxxxxxxxxxxxxxx
```

## 关键约束

- 需要 AdSense 账号审核通过（网站需要有一定内容）
- 开发环境不会展示真实广告（AdSense 不在 localhost 投放）
- 不要在没有内容的页面放广告（违反 AdSense 政策）
- 每页广告数量合理，不要过度放置
- ads.txt 文件放在 `public/ads.txt`
- 需要隐私政策页面

## ads.txt

```text
// public/ads.txt
google.com, pub-xxxxxxxxxxxxxxxx, DIRECT, f08c47fec0942fa0
```
