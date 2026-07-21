-- Ensure users table has a unique constraint on username
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_constraint 
        WHERE conname = 'users_username_key'
    ) THEN
        ALTER TABLE public.users ADD CONSTRAINT users_username_key UNIQUE (username);
    END IF;
END $$;

-- Create an index for username queries to make them extremely fast
CREATE INDEX IF NOT EXISTS idx_users_username ON public.users(username);
