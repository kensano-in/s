-- Migration: Nickname Permissions Settings
-- 067_nickname_permissions.sql

ALTER TABLE public.dm_settings
  ADD COLUMN IF NOT EXISTS nickname_edit_permission text DEFAULT 'everyone';
