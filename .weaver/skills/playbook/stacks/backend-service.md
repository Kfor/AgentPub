# 后端技术栈：FastAPI (独立服务)

## 适用场景
后端逻辑复杂的场景：AI/ML 处理、长时间任务、WebSocket、复杂数据处理管道。

## 判断标准
选择 FastAPI 而非 Edge Functions 的条件：
- 需要长连接（WebSocket / SSE）
- 需要大量 CPU 计算或长时间处理
- 需要 Python 特有库（numpy, pandas, transformers 等）
- 需要本地文件系统或临时存储
- 业务逻辑复杂度超过单个函数

## 标准配置

- **框架**: FastAPI
- **语言**: Python 3.11+
- **包管理**: uv (优先) 或 poetry
- **部署**: Docker + Cloud Run / Fly.io
- **ORM**: 直接用 Supabase Python client（不引入 SQLAlchemy 除非必要）

## 项目初始化

```bash
mkdir <service-name> && cd <service-name>
uv init
uv add fastapi uvicorn supabase sentry-sdk[fastapi]
```

## 目录结构

```
<service-name>/
  app/
    main.py            # FastAPI app 入口
    config.py          # 环境变量 (pydantic-settings)
    routers/           # 路由模块
    services/          # 业务逻辑
    models/            # Pydantic models
    deps.py            # 依赖注入 (Supabase client etc.)
  Dockerfile
  docker-compose.yml   # 本地开发
  pyproject.toml
```

## 标准入口

```python
# app/main.py
from fastapi import FastAPI
from contextlib import asynccontextmanager
import sentry_sdk

from app.config import settings

sentry_sdk.init(dsn=settings.sentry_dsn, traces_sample_rate=0.1)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # startup
    yield
    # shutdown

app = FastAPI(title=settings.app_name, lifespan=lifespan)

# app/config.py
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    app_name: str = "service"
    supabase_url: str
    supabase_service_key: str
    sentry_dsn: str = ""

    class Config:
        env_file = ".env"

settings = Settings()
```

## Dockerfile

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY pyproject.toml uv.lock ./
RUN pip install uv && uv sync --frozen --no-dev
COPY app/ app/
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]
```

## 关键约束

- 所有配置通过环境变量，用 pydantic-settings 验证
- 认证：验证 Supabase JWT（从请求 header 中提取 Bearer token）
- 健康检查端点：`GET /health`
- API 版本前缀：`/api/v1/`
- 错误返回统一 JSON 格式
