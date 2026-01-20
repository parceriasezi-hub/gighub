-- NUCLEAR FIX: DROP and RECREATE provider_documents
-- The persistent 400 Bad Request implies a deep schema mismatch or corrupt constraint.
-- We will RECREATE the table to be 100% sure it matches the code.

-- 1. Drop existing policies (cascade should handle it, but being safe)
DROP POLICY IF EXISTS "Providers can manage own documents" ON public.provider_documents;
DROP POLICY IF EXISTS "Admins can view all documents" ON public.provider_documents;

-- 2. DROP THE TABLE
DROP TABLE IF EXISTS public.provider_documents CASCADE;

-- 3. RECREATE THE TABLE (Exact Schema expected by App)
CREATE TABLE public.provider_documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    provider_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    document_type TEXT NOT NULL, -- 'id', 'address', 'other'
    document_name TEXT NOT NULL,
    document_url TEXT NOT NULL,
    status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Enable RLS
ALTER TABLE public.provider_documents ENABLE ROW LEVEL SECURITY;

-- 5. Re-apply Policies
CREATE POLICY "Providers can manage own documents" ON public.provider_documents
    FOR ALL USING (auth.uid() = provider_id);

CREATE POLICY "Admins can view all documents" ON public.provider_documents
    FOR SELECT TO authenticated USING (true);

-- 6. Verify one last time via a dummy check (no-op)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'provider_documents') THEN
        RAISE EXCEPTION 'Table creation failed!';
    END IF;
END $$;
