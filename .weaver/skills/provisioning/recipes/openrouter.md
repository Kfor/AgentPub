# 资源开通：OpenRouter API Key

## 分类
- auto: false
- sensitive: true（涉及 API 用量费用）

## 浏览器操作路径

1. 打开 https://openrouter.ai/keys
2. 登录
3. 点击 "Create Key"
4. 设置名称: `<project-name>`
5. 设置用量限制（建议开发阶段 $10/月）
6. **⏸ 需要人类确认**（涉及费用）
7. 复制 API Key

## 输出 (写入 .env)

```env
OPENROUTER_API_KEY=sk-or-...
```

## 验证

```bash
curl -s https://openrouter.ai/api/v1/models \
  -H "Authorization: Bearer $OPENROUTER_API_KEY" | head -c 200
```

## 注意事项

- 设置合理的用量限制，避免意外高额账单
- API Key 仅在服务端使用，不暴露给客户端
- 通过 OpenRouter 使用多个 LLM provider，无需逐个注册
