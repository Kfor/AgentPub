# 服务集成：AB 测试（自建）

## When to use
需要对产品功能/UI/定价做对照实验时。

## 为什么自建
- 与 Supabase 数据库紧密耦合，无需额外数据管道
- 分组算法简单确定性，无需复杂 SDK
- 第三方工具（Optimizely/LaunchDarkly）引入不必要的成本和复杂度
- 实验数据与业务数据同库，分析方便

## 架构

```
前端 SDK (React hook)  →  Supabase DB  →  分析 Dashboard / Edge Function
```

## 数据库表

```sql
-- 实验定义
CREATE TABLE public.experiments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  variants JSONB NOT NULL DEFAULT '["control", "treatment"]',
  traffic_pct INT NOT NULL DEFAULT 100,  -- 参与流量百分比
  status TEXT NOT NULL DEFAULT 'draft',  -- draft / running / stopped
  created_at TIMESTAMPTZ DEFAULT now(),
  stopped_at TIMESTAMPTZ
);

-- 用户分组（确定性）
CREATE TABLE public.experiment_assignments (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  experiment_id UUID REFERENCES public.experiments(id) ON DELETE CASCADE,
  variant TEXT NOT NULL,
  assigned_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, experiment_id)
);

-- 实验事件
CREATE TABLE public.experiment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  experiment_id UUID REFERENCES public.experiments(id) ON DELETE CASCADE,
  event_name TEXT NOT NULL,
  properties JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 索引
CREATE INDEX idx_exp_events_lookup
  ON public.experiment_events (experiment_id, event_name, created_at);

-- RLS
ALTER TABLE public.experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.experiment_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.experiment_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read running experiments"
  ON public.experiments FOR SELECT USING (status = 'running');

CREATE POLICY "Users can read own assignments"
  ON public.experiment_assignments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own events"
  ON public.experiment_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

## 分组算法 (Postgres Function)

```sql
CREATE OR REPLACE FUNCTION public.get_experiment_variant(
  p_user_id UUID,
  p_experiment_name TEXT
) RETURNS TEXT AS $$
DECLARE
  v_experiment RECORD;
  v_existing TEXT;
  v_hash INT;
  v_variant_count INT;
  v_variant_index INT;
  v_variant TEXT;
BEGIN
  SELECT * INTO v_experiment
  FROM public.experiments
  WHERE name = p_experiment_name AND status = 'running';

  IF NOT FOUND THEN RETURN NULL; END IF;

  -- 检查已有分组
  SELECT variant INTO v_existing
  FROM public.experiment_assignments
  WHERE user_id = p_user_id AND experiment_id = v_experiment.id;

  IF FOUND THEN RETURN v_existing; END IF;

  -- 确定性 hash 判断是否参与
  v_hash := abs(hashtext(p_user_id::text || v_experiment.id::text));
  IF (v_hash % 100) >= v_experiment.traffic_pct THEN RETURN NULL; END IF;

  -- 确定性分组
  v_variant_count := jsonb_array_length(v_experiment.variants);
  v_variant_index := v_hash % v_variant_count;
  v_variant := v_experiment.variants->>v_variant_index;

  -- 记录分组
  INSERT INTO public.experiment_assignments (user_id, experiment_id, variant)
  VALUES (p_user_id, v_experiment.id, v_variant)
  ON CONFLICT DO NOTHING;

  RETURN v_variant;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## 前端 SDK (React Hook)

```typescript
// hooks/useExperiment.ts
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface UseExperimentResult {
  variant: string | null
  isLoading: boolean
  track: (eventName: string, properties?: Record<string, unknown>) => void
}

export function useExperiment(experimentName: string): UseExperimentResult {
  const [variant, setVariant] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [experimentId, setExperimentId] = useState<string | null>(null)

  useEffect(() => {
    async function assign() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setIsLoading(false); return }

      const { data, error } = await supabase
        .rpc('get_experiment_variant', {
          p_user_id: user.id,
          p_experiment_name: experimentName,
        })

      if (!error && data) {
        setVariant(data)
        // 获取 experiment_id 用于 track
        const { data: exp } = await supabase
          .from('experiments')
          .select('id')
          .eq('name', experimentName)
          .single()
        if (exp) setExperimentId(exp.id)
      }
      setIsLoading(false)
    }
    assign()
  }, [experimentName])

  const track = (eventName: string, properties?: Record<string, unknown>) => {
    if (!experimentId) return
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase.from('experiment_events').insert({
        user_id: user.id,
        experiment_id: experimentId,
        event_name: eventName,
        properties: properties ?? {},
      })
    })
  }

  return { variant, isLoading, track }
}

// 使用示例
// const { variant, track } = useExperiment('pricing-v2')
// if (variant === 'treatment') { /* 新版定价 */ }
// track('clicked_buy', { plan: 'pro' })
```

## 结果分析 (Edge Function)

```typescript
// supabase/functions/experiment-results/index.ts
// 计算 conversion rate + chi-squared 显著性检验
// 返回: { variants: [{ name, users, conversions, rate }], significant: boolean, p_value: number }
```

## 关键约束

- 分组是确定性的：同一 user + 同一 experiment 永远同一组
- 实验创建后 variants 不可修改（会破坏分组一致性）
- `traffic_pct` 控制参与比例，未参与用户返回 null（显示默认版本）
- 最小样本量：每组至少 100 用户后再看结果
- 停止实验后不再分配新用户
