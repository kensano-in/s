-- ============================================================================
-- VERLYN EXPLORE & DISCOVERY SYSTEM SCHEMA
-- ============================================================================

-- 1. user_interests
-- Tracks the weighted interest score per category/tag for each user.
CREATE TABLE IF NOT EXISTS public.user_interests (
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  score FLOAT DEFAULT 0.0,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, category)
);

CREATE INDEX IF NOT EXISTS idx_user_interests_user_id ON public.user_interests(user_id);

-- 2. post_features
-- Metadata for posts to enable fast scoring
CREATE TABLE IF NOT EXISTS public.post_features (
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE PRIMARY KEY,
  category TEXT,
  tags TEXT[],
  engagement_score FLOAT DEFAULT 0.0,
  velocity FLOAT DEFAULT 0.0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. engagement_logs
-- Append-only log powering the real-time learning algorithm
CREATE TABLE IF NOT EXISTS public.engagement_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,       -- 'view', 'like', 'comment', 'save', 'click'
  weight FLOAT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_engagement_logs_user_id ON public.engagement_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_engagement_logs_post_user ON public.engagement_logs(post_id, user_id, action_type);

-- 4. Auto-update Trigger for user_interests and post_features
CREATE OR REPLACE FUNCTION public.process_engagement_log()
RETURNS TRIGGER AS $$
DECLARE
  v_category TEXT;
BEGIN
  -- Get the category of the post being engaged with
  SELECT category INTO v_category FROM public.post_features WHERE post_id = NEW.post_id;
  
  -- If post has no category yet, skip
  IF v_category IS NOT NULL THEN
    -- Upsert user_interests
    INSERT INTO public.user_interests (user_id, category, score, last_updated)
    VALUES (NEW.user_id, v_category, NEW.weight, NOW())
    ON CONFLICT (user_id, category) 
    DO UPDATE SET 
      score = public.user_interests.score + NEW.weight,
      last_updated = NOW();
  END IF;

  -- Update post_features engagement_score
  UPDATE public.post_features
  SET engagement_score = engagement_score + NEW.weight,
      -- velocity pseudo-calculation: simple recent spike booster (more complex logic can run on cron)
      velocity = velocity + (NEW.weight * 0.5)
  WHERE post_id = NEW.post_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_process_engagement
AFTER INSERT ON public.engagement_logs
FOR EACH ROW
EXECUTE FUNCTION public.process_engagement_log();

-- Add RLS Policies

ALTER TABLE public.user_interests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own interests" ON public.user_interests
  FOR SELECT USING (auth.uid() = user_id);

ALTER TABLE public.post_features ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read post_features" ON public.post_features
  FOR SELECT USING (true);

ALTER TABLE public.engagement_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can insert own engagement logs" ON public.engagement_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can read own engagement logs" ON public.engagement_logs
  FOR SELECT USING (auth.uid() = user_id);
