-- ═══════════════════════════════════════════════════════════════════════════════
-- Advanced Messaging System Schema
-- Focus: Realtime status, seen receipts, and privacy requests.
-- ═══════════════════════════════════════════════════════════════════════════════

-- 1. Seen Receipts Integration
CREATE TABLE IF NOT EXISTS public.message_reads (
    message_id UUID REFERENCES public.messages(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    seen_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (message_id, user_id)
);

-- 2. Persistent Typing Status (Hybrid Broadcast/Persistence)
CREATE TABLE IF NOT EXISTS public.typing_status (
    chat_id TEXT NOT NULL, -- Supports both UUID (groups) and composite IDs (DMs)
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    is_typing BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (chat_id, user_id)
);

-- 3. Message Request Privacy Layer
CREATE TABLE IF NOT EXISTS public.message_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    recipient_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'DECLINED')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(sender_id, recipient_id)
);

-- 4. Messages Table Hardening
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS is_released BOOLEAN DEFAULT TRUE; -- For scheduled messages

-- 5. RLS Policies (Security Hardening)
ALTER TABLE public.message_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.typing_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_requests ENABLE ROW LEVEL SECURITY;

-- Message Reads: Users can see reads for messages they sent or received
CREATE POLICY "Users can view reads for their messages" ON message_reads
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM messages m
            WHERE m.id = message_id 
            AND (m.sender_id = auth.uid() OR m.recipient_id = auth.uid() OR EXISTS (
                SELECT 1 FROM conversation_participants cp 
                WHERE cp.conversation_id = m.conversation_id AND cp.user_id = auth.uid()
            ))
        )
    );

CREATE POLICY "Users can mark messages as seen" ON message_reads
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Typing Status: Users can see typing status for chats they are part of
CREATE POLICY "Users can view typing status in their chats" ON typing_status
    FOR SELECT USING (
        chat_id = auth.uid()::text OR 
        chat_id LIKE '%' || auth.uid() || '%' OR 
        EXISTS (
            SELECT 1 FROM conversation_participants 
            WHERE conversation_id::text = chat_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update own typing status" ON typing_status
    FOR ALL USING (auth.uid() = user_id);

-- Message Requests: Users can see requests they sent or received
CREATE POLICY "Users can view their own requests" ON message_requests
    FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

CREATE POLICY "Users can handle incoming requests" ON message_requests
    FOR UPDATE USING (auth.uid() = recipient_id);

-- 6. Realtime Enablement
ALTER PUBLICATION supabase_realtime ADD TABLE message_reads;
ALTER PUBLICATION supabase_realtime ADD TABLE typing_status;
ALTER PUBLICATION supabase_realtime ADD TABLE message_requests;
