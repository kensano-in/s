
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS seq BIGSERIAL,
  ADD CONSTRAINT unique_client_temp_id UNIQUE (sender_id, client_temp_id);

CREATE INDEX IF NOT EXISTS idx_messages_seq ON public.messages(seq);
