# 资源开通：Supabase（共享实例 + Schema 隔离）

## 分类
- auto: true
- sensitive: false

## 策略

**不为每个项目创建独立 Supabase 项目**。所有项目共享 `smallproj` 实例，通过 Postgres schema 隔离数据。

好处：
- 节省 Supabase 免费项目配额（免费限 2 个活跃项目）
- 统一管理和监控
- 共享 Auth 用户池（如果需要）

## 前提
- `supabase` CLI 已安装（`brew install supabase/tap/supabase`）
- 已登录（`supabase login`）
- `smallproj` 实例已存在

## CLI 开通步骤

```bash
# 1. 关联到 smallproj 实例
supabase link --project-ref <smallproj-ref-id>

# 2. 为当前项目创建独立 schema
# 在第一个迁移文件中创建项目专属 schema:
supabase migration new init_project_schema
```

迁移内容：
```sql
-- supabase/migrations/00000000000000_init_project_schema.sql

-- 创建项目专属 schema
CREATE SCHEMA IF NOT EXISTS <project_slug>;

-- 设置 search_path，后续迁移默认使用此 schema
-- 注意：每个迁移文件开头都要加 SET search_path
```

```bash
# 3. 推送迁移到 smallproj
supabase db push

# 4. 获取连接信息
supabase status
```

## 输出 (写入 .env)

```env
# 连接到 smallproj 实例
NEXT_PUBLIC_SUPABASE_URL=https://<smallproj-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<smallproj-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<smallproj-service-role-key>

# 项目 schema 标识
SUPABASE_SCHEMA=<project_slug>

# Expo 项目
EXPO_PUBLIC_SUPABASE_URL=https://<smallproj-ref>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<smallproj-anon-key>
```

## Schema 命名规范

- Schema 名 = 项目 slug（小写字母 + 下划线）
- 例：`myapp`、`cool_project`、`budget_tracker`
- `public` schema 保留给共享的基础设施（如果有）

## 验证

```bash
# 检查 schema 是否创建成功
supabase db execute --sql "SELECT schema_name FROM information_schema.schemata WHERE schema_name = '<project_slug>'"

# 检查连通性
curl -s "https://<smallproj-ref>.supabase.co/rest/v1/" \
  -H "apikey: <anon-key>" | head -c 200
```

## 注意事项

- 每个迁移文件开头加 `SET search_path TO <project_slug>, public;`
- RLS 策略照常写，schema 隔离不影响 RLS
- Storage bucket 名加项目前缀避免冲突：`<project_slug>_avatars`
- Edge Functions 所有项目共享，函数名加项目前缀
- Auth 是实例级的，所有项目共享用户池（通常这是期望行为）
- 如果某个项目需要完全独立的 Auth，才创建独立 Supabase 项目
