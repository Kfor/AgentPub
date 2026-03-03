# 资源开通：Google OAuth Credentials

## 分类
- auto: false
- sensitive: true（涉及 Google Cloud 计费账号）

## 依赖
- Supabase Project 已创建（需要回调 URL）

## 浏览器操作路径

1. 打开 https://console.cloud.google.com/
2. 创建新项目或选择已有项目
3. 导航到 APIs & Services → Credentials
4. 点击 "Create Credentials" → "OAuth 2.0 Client ID"
5. 如果未配置 OAuth Consent Screen：
   a. 配置 OAuth Consent Screen
   b. User type: External
   c. 填写 App name, User support email, Developer contact email
   d. Scopes: `email`, `profile`, `openid`
   e. Test users: 添加自己的邮箱
6. 回到 Credentials → Create OAuth Client ID
7. Application type: "Web application"
8. Name: `<project-name>`
9. Authorized redirect URIs:
   - `https://<supabase-ref>.supabase.co/auth/v1/callback`
10. **⏸ 需要人类确认创建**（sensitive=true）
11. 确认后复制 Client ID 和 Client Secret

## 输出 (写入 .env)

```env
GOOGLE_CLIENT_ID=<client-id>
GOOGLE_CLIENT_SECRET=<client-secret>
```

## 后续配置

在 Supabase Dashboard 中配置 Google Auth Provider：
1. 打开 https://supabase.com/dashboard/project/<ref>/auth/providers
2. 启用 Google
3. 填入 Client ID 和 Client Secret
4. 保存

## 验证

在应用中触发 Google OAuth 登录流程，确认能重定向到 Google 登录页面并成功回调。

## 注意事项

- OAuth Consent Screen 需要验证才能让所有用户使用（开发阶段用 Testing 模式）
- 生产环境需要提交 OAuth Consent Screen 审核
- 回调 URL 必须精确匹配
