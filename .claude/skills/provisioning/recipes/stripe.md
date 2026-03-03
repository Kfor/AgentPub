# 资源开通：Stripe

## 分类
- auto: true（Test mode 完全 CLI 自动化）
- sensitive: false（Test mode 不涉及真实费用）

生产激活时需人工，但开发阶段完全自动。

## 前提
- `stripe` CLI 已安装（`brew install stripe/stripe-cli/stripe`）
- 已登录（`stripe login`）

## CLI 开通步骤（Test Mode）

```bash
# 1. 验证登录状态
stripe config --list

# 2. 获取 Test mode API keys
stripe config --list | grep test_

# 如果需要从 Dashboard 获取 keys:
# stripe open --url https://dashboard.stripe.com/test/apikeys

# 3. 创建测试产品和价格
stripe products create --name "Pro Plan" --description "Pro subscription"
# 记录输出的 product ID (prod_xxx)

stripe prices create \
  --product prod_xxx \
  --unit-amount 999 \
  --currency usd \
  --recurring-interval month
# 记录输出的 price ID (price_xxx)

# 4. 启动本地 webhook 转发
stripe listen --forward-to localhost:3000/api/webhooks/stripe
# 输出 webhook signing secret (whsec_xxx)
```

## 输出 (写入 .env)

```env
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

## 验证

```bash
# 测试 API 连通性
stripe customers list --limit 1

# 创建测试客户
stripe customers create --email test@example.com

# 触发测试 webhook 事件
stripe trigger checkout.session.completed
stripe trigger customer.subscription.created
stripe trigger customer.subscription.updated
```

## 生产激活（需人工，上线前处理）

生产上线时需要：
1. 在 Stripe Dashboard 完成账号激活（提供公司/个人信息）— **需人工确认**
2. 切换 API keys 为 Live mode（sk_live_ / pk_live_）
3. 重新配置 production webhook endpoint

开发阶段不需要处理生产激活。

## 注意事项

- Test mode 数据完全隔离，不会产生真实费用
- 测试卡号：4242 4242 4242 4242（成功）、4000 0000 0000 0002（拒绝）
- Webhook secret 区分 test/live 和 CLI/Dashboard
- 产品和价格通过 CLI 创建，不硬编码金额
