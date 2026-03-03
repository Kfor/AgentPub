# 服务集成：Stripe (Web 支付)

## When to use
Web 端产品需要支付功能时（订阅或一次性付款）。

## 标准方案

- **Checkout**: Stripe Checkout (hosted) — 不自建支付表单
- **订阅管理**: Stripe Customer Portal
- **Webhook**: 接收支付事件更新数据库

## 安装

```bash
pnpm add stripe @stripe/stripe-js
```

## 服务端 Client

```typescript
// lib/stripe/client.ts
import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
  typescript: true,
})
```

## Checkout Session 创建

```typescript
// app/api/checkout/route.ts
import { stripe } from '@/lib/stripe/client'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { priceId } = await req.json()

  const session = await stripe.checkout.sessions.create({
    customer_email: user.email,
    mode: 'subscription', // 或 'payment'
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?success=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing`,
    metadata: { supabase_user_id: user.id },
  })

  return Response.json({ url: session.url })
}
```

## Webhook 处理

```typescript
// app/api/webhooks/stripe/route.ts
import { stripe } from '@/lib/stripe/client'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')!

  let event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch {
    return new Response('Invalid signature', { status: 400 })
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object
      await supabaseAdmin.from('subscriptions').upsert({
        user_id: session.metadata?.supabase_user_id,
        stripe_customer_id: session.customer,
        stripe_subscription_id: session.subscription,
        status: 'active',
      })
      break
    }
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const subscription = event.data.object
      await supabaseAdmin.from('subscriptions').update({
        status: subscription.status,
      }).eq('stripe_subscription_id', subscription.id)
      break
    }
  }

  return new Response('ok')
}
```

## 数据库表

```sql
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  status TEXT DEFAULT 'inactive',
  price_id TEXT,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscription"
  ON public.subscriptions FOR SELECT
  USING (auth.uid() = user_id);
```

## 本地测试

```bash
# Stripe CLI 监听 webhook
stripe listen --forward-to localhost:3000/api/webhooks/stripe
# 会输出 webhook signing secret (whsec_...)

# 触发测试事件
stripe trigger checkout.session.completed
```

## 必需环境变量

- `STRIPE_SECRET_KEY` — 服务端密钥
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` — 客户端公钥
- `STRIPE_WEBHOOK_SECRET` — Webhook 签名密钥

## 关键约束

- 不自建支付表单，一律用 Stripe Checkout
- 所有价格（Price）在 Stripe Dashboard 创建，不硬编码金额
- Webhook 必须验证签名
- 用户支付状态以 webhook 事件为准，不以 checkout redirect 为准
- Customer Portal 用于用户自助管理订阅（取消、更换计划）
