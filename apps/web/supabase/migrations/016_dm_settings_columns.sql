-- Migration 016: Add missing dm_settings columns
-- Adds bubble_style, my_nickname, their_nickname, muted
-- These were referenced in frontend code but missing from the DB schema

ALTER TABLE public.dm_settings
  ADD COLUMN IF NOT EXISTS bubble_style text DEFAULT 'glass',
  ADD COLUMN IF NOT EXISTS my_nickname text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS their_nickname text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS muted boolean DEFAULT false;

-- Update the updated_at trigger if it exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'set_dm_settings_updated_at'
    AND tgrelid = 'public.dm_settings'::regclass
  ) THEN
    -- Create trigger function if not exists
    CREATE OR REPLACE FUNCTION public.update_updated_at_column()
    RETURNS TRIGGER AS $func$
    BEGIN
      NEW.updated_at = timezone('utc'::text, now());
      RETURN NEW;
    END;
    $func$ language 'plpgsql';

    CREATE TRIGGER set_dm_settings_updated_at
      BEFORE UPDATE ON public.dm_settings
      FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();
  END IF;
END;
$$;
