# 服务集成：Supabase Database & Storage

## When to use
项目需要数据库和/或文件存储时。

## 架构：共享实例 + Schema 隔离

所有项目默认共享 `smallproj` Supabase 实例。每个项目使用独立的 Postgres schema 隔离数据。

详见 `provisioning/recipes/supabase.md` 了解开通方式。

## 迁移管理

所有数据库变更通过迁移文件管理：

```bash
# 创建新迁移
supabase migration new <migration-name>

# 本地应用迁移
supabase db reset

# 推送到远端
supabase db push
```

## 迁移文件规范（Schema 隔离版）

每个迁移文件开头必须设置 search_path：

```sql
-- supabase/migrations/20240101000000_create_profiles.sql
SET search_path TO <project_slug>, public;

-- 建表（自动创建在项目 schema 中）
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 启用 RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- RLS 策略
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- 触发器：自动从 auth.users 创建 profile
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, avatar_url)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

## 客户端配置（指定 schema）

```typescript
// lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      db: { schema: process.env.NEXT_PUBLIC_SUPABASE_SCHEMA || 'public' },
    }
  )
}
```

```typescript
// lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      db: { schema: process.env.NEXT_PUBLIC_SUPABASE_SCHEMA || 'public' },
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )
}
```

## 查询规范

客户端使用 Supabase JS client（不写原生 SQL）：

```typescript
// 查询（自动使用配置的 schema）
const { data, error } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', userId)
  .single()

// 插入
const { error } = await supabase
  .from('items')
  .insert({ name, user_id: userId })

// 跨 schema 查询（极少需要）
const { data } = await supabase.schema('other_project').from('shared_table').select('*')
```

## RLS 必须启用

每张表都必须 `ENABLE ROW LEVEL SECURITY` 并定义策略。无 RLS 的表等于裸奔。

## Storage：Supabase Storage

Bucket 名加项目前缀避免跨项目冲突：

```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('<project_slug>_avatars', '<project_slug>_avatars', true);

CREATE POLICY "Users can upload own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = '<project_slug>_avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
```

```typescript
const { data, error } = await supabase.storage
  .from(`${process.env.NEXT_PUBLIC_SUPABASE_SCHEMA}_avatars`)
  .upload(`${userId}/avatar.png`, file, {
    cacheControl: '3600',
    upsert: true,
  })
```

## 本地开发

```bash
# 启动本地 Supabase（连接到 smallproj）
supabase start

# 本地 Dashboard
# http://localhost:54323

# 停止
supabase stop
```

## 必需环境变量

- `NEXT_PUBLIC_SUPABASE_URL` — smallproj 实例 URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — smallproj 公开匿名 key
- `SUPABASE_SERVICE_ROLE_KEY` — smallproj 后端管理员 key
- `NEXT_PUBLIC_SUPABASE_SCHEMA` / `SUPABASE_SCHEMA` — 项目 schema 名

## 关键约束

- 所有 schema 变更通过迁移文件，不在 Dashboard 手动操作
- 每个迁移文件开头 `SET search_path TO <project_slug>, public;`
- 每张表必须有 RLS
- 客户端只用 anon key
- Storage bucket 名加项目前缀
- 涉及跨表事务的操作用 Postgres Function (RPC)
- 实时订阅用 `supabase.channel()` API
