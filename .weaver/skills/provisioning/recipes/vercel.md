# 资源开通：Vercel Project

## 分类
- auto: true
- sensitive: false

## 前提
- `vercel` CLI 已安装（`pnpm add -g vercel`）
- 已登录（`vercel login`）

## CLI 开通步骤

```bash
# 1. 在项目根目录关联 Vercel 项目
vercel link --yes

# 2. 设置环境变量
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
vercel env add STRIPE_SECRET_KEY production
vercel env add STRIPE_WEBHOOK_SECRET production
vercel env add SENTRY_DSN production
# ... 其他环境变量

# 3. 首次部署
vercel --prod
```

## 输出

Vercel 项目关联后会在本地生成 `.vercel/project.json`。
部署后获取：
- Preview URL: `https://<project>.vercel.app`
- Production URL: 自定义域名或 Vercel 默认域名

将 Preview URL 记录到项目配置中方便后续查看。

## 自定义域名

```bash
vercel domains add <domain>
```

## 验证

```bash
# 检查部署状态
vercel ls

# 打开最新部署
vercel inspect <url>
```

## 注意事项

- `.vercel/` 目录应加入 `.gitignore`
- 环境变量区分 production / preview / development
- 免费计划够用，超出 bandwidth 或 build minutes 需要升级
