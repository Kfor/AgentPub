# 服务集成：Supabase Auth

## When to use
项目需要用户认证/注册/登录时。

## 标准配置

- **Provider**: Supabase Auth
- **支持登录方式**: Google OAuth, Apple OAuth, Email + Password
- **Session 管理**: Supabase 自动处理（JWT + Refresh Token）

## OAuth 回调 URL

所有 OAuth Provider 的回调 URL 统一为：
```
{SUPABASE_URL}/auth/v1/callback
```

## Next.js 集成

### 浏览器端 Client

```typescript
// lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

### 服务端 Client

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

### Middleware (Auth 保护)

```typescript
// middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (!user && request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/dashboard/:path*'],
}
```

### OAuth Callback Route

```typescript
// app/auth/callback/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}
```

## Expo 集成

参见 `stacks/mobile-expo.md` 中的 Supabase Client 配置。

OAuth 登录使用 `expo-auth-session`：

```typescript
import * as AuthSession from 'expo-auth-session'
import { supabase } from '@/lib/supabase'

const redirectUrl = AuthSession.makeRedirectUri({ scheme: 'your-app-scheme' })

async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: redirectUrl },
  })
  // 处理 data.url — 在 WebBrowser 中打开
}
```

## RLS 策略

认证相关的 RLS 策略必须在数据库迁移中定义：

```sql
-- 用户只能读写自己的数据
CREATE POLICY "Users can view own data"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own data"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);
```

## 必需环境变量

- `NEXT_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`（仅后端/API Routes）

## 注意事项

- 生产环境必须开启 email confirmation
- RLS 策略在迁移文件中维护，不在 Dashboard 手动操作
- 客户端只用 anon key，service_role_key 仅后端使用
- Google OAuth 需要在 Supabase Dashboard 中配置 Client ID/Secret
