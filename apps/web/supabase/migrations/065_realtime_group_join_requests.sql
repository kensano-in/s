-- Enable realtime for group_join_requests
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE group_join_requests;
EXCEPTION WHEN others THEN NULL;
END $$;

ALTER TABLE group_join_requests SET REPLICA IDENTITY FULL;
