# 后端技术栈：Supabase Edge Functions (Serverless)

## 适用场景
后端逻辑简单的场景：webhook 处理、第三方 API 代理、定时任务、简单数据处理。

## 判断标准
选择 Edge Functions 而非独立服务的条件：
- 无需长连接（WebSocket）
- 无需大量 CPU 计算（> 30s）
- 无需本地文件系统
- 无复杂依赖（Python 科学计算库等）
- 单个函数逻辑可在 50ms 内完成

如果不满足以上条件，使用 `backend-service.md`（FastAPI）。

## 标准配置

- **运行时**: Deno (Supabase Edge Runtime)
- **语言**: TypeScript
- **部署**: `supabase functions deploy`

## 创建函数

```bash
supabase functions new <function-name>
```

## 目录结构

```
supabase/
  functions/
    _shared/           # 共享工具（不部署为独立函数）
      cors.ts
      supabase-client.ts
    process-webhook/
      index.ts
    sync-data/
      index.ts
  migrations/          # 数据库迁移
  config.toml
```

## 标准函数模板

```typescript
// supabase/functions/<name>/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    )

    // 业务逻辑

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})
```

## 部署

```bash
# 单个函数
supabase functions deploy <function-name>

# 所有函数
supabase functions deploy

# 设置 secrets
supabase secrets set KEY=value
```

## 关键约束

- 单次执行时间限制 150s（Wall Clock），CPU 时间限制 50ms
- 内存限制 150MB
- 请求体大小限制 2MB
- 共享代码放 `_shared/`，以 `_` 开头的目录不会部署
- 环境变量通过 `supabase secrets set` 设置，不写在代码中
