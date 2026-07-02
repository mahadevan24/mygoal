-- MyGoal Database Schema Setup
-- Run this script in your Supabase SQL Editor

-- 1. Enable UUID Extension (usually enabled by default)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Create Study Logs Table
CREATE TABLE IF NOT EXISTS public.study_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    dsa_minutes INTEGER NOT NULL DEFAULT 0,
    lld_minutes INTEGER NOT NULL DEFAULT 0,
    system_design_minutes INTEGER NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, date)
);

-- Enable RLS for study_logs
ALTER TABLE public.study_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for study_logs
CREATE POLICY "Users can insert their own study logs" 
    ON public.study_logs FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own study logs" 
    ON public.study_logs FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own study logs" 
    ON public.study_logs FOR UPDATE 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own study logs" 
    ON public.study_logs FOR DELETE 
    USING (auth.uid() = user_id);


-- 3. Create Vision Board Table
CREATE TABLE IF NOT EXISTS public.vision_board (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    title TEXT NOT NULL,
    target_company TEXT,
    target_year INTEGER DEFAULT 2027,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for vision_board
ALTER TABLE public.vision_board ENABLE ROW LEVEL SECURITY;

-- RLS Policies for vision_board
CREATE POLICY "Users can insert their own vision board items" 
    ON public.vision_board FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own vision board items" 
    ON public.vision_board FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own vision board items" 
    ON public.vision_board FOR DELETE 
    USING (auth.uid() = user_id);


-- 4. Storage Bucket Setup (Instructions and Policies)
-- Make sure to create a bucket named 'vision-board-images' in the Supabase Storage Dashboard first, with public access enabled or restricted as needed.
-- Below are the RLS policies for storage.objects in the 'vision-board-images' bucket:

-- Note: In Supabase, storage tables are under the 'storage' schema.
-- Policy to allow authenticated users to upload files to 'vision-board-images' bucket
CREATE POLICY "Allow authenticated users to upload vision board images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'vision-board-images' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy to allow anyone to read files from 'vision-board-images' bucket (if public)
CREATE POLICY "Allow public read access to vision board images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'vision-board-images');

-- Policy to allow users to delete their own files from 'vision-board-images' bucket
CREATE POLICY "Allow users to delete their own vision board images"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'vision-board-images' AND
    (storage.foldername(name))[1] = auth.uid()::text
);


-- 5. Create Study Notes Table
CREATE TABLE IF NOT EXISTS public.study_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('dsa', 'lld', 'system_design')),
    content TEXT NOT NULL,
    tags TEXT[] DEFAULT '{}'::TEXT[],
    mastery_level TEXT NOT NULL DEFAULT 'learning' CHECK (mastery_level IN ('learning', 'reviewing', 'mastered')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for study_notes
ALTER TABLE public.study_notes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for study_notes
CREATE POLICY "Users can insert their own study notes" 
    ON public.study_notes FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own study notes" 
    ON public.study_notes FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own study notes" 
    ON public.study_notes FOR UPDATE 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own study notes" 
    ON public.study_notes FOR DELETE 
    USING (auth.uid() = user_id);


-- 6. Create Blogs Table
CREATE TABLE IF NOT EXISTS public.blogs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    user_email TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    tags TEXT[] DEFAULT '{}'::TEXT[],
    is_shared BOOLEAN DEFAULT false NOT NULL,
    claps INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for blogs
ALTER TABLE public.blogs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for blogs
CREATE POLICY "Users can insert their own blogs" 
    ON public.blogs FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view shared blogs or their own blogs" 
    ON public.blogs FOR SELECT 
    USING (is_shared = true OR auth.uid() = user_id);

CREATE POLICY "Users can update their own blogs" 
    ON public.blogs FOR UPDATE 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own blogs" 
    ON public.blogs FOR DELETE 
    USING (auth.uid() = user_id);


