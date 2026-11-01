-- ============================================================
-- Migration: Add hostel_block to profiles
-- Run in Supabase SQL Editor for Phase 3
-- ============================================================

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS hostel_block TEXT;
