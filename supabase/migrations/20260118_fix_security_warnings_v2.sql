-- Migration to resolve remaining Supabase Security Warnings
-- Fixes: function_search_path_mutable, rls_policy_always_true

-- 1. Fix Function Search Paths
-- Explicitly set search_path to public for security

DO $$ 
BEGIN
    -- get_user_quotas
    IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'public' AND p.proname = 'get_user_quotas') THEN
        ALTER FUNCTION public.get_user_quotas(uuid) SET search_path = public;
    END IF;

    -- reset_user_quotas
    IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'public' AND p.proname = 'reset_user_quotas') THEN
        ALTER FUNCTION public.reset_user_quotas() SET search_path = public;
    END IF;
END $$;

-- 2. Fix RLS Policies for emergency_responses
-- The previous policies "Allow insert for auth" and "Allow update for auth" were too permissive (true).
-- We assume the table has a 'provider_id' column representing the user making the response.

DO $$
BEGIN
    -- Only proceed if the table exists
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'emergency_responses') THEN
        
        -- Drop insecure policies if they exist (names inferred from warning)
        DROP POLICY IF EXISTS "Allow insert for auth" ON public.emergency_responses;
        DROP POLICY IF EXISTS "Allow update for auth" ON public.emergency_responses;
        DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.emergency_responses;
        DROP POLICY IF EXISTS "Enable update for users based on id" ON public.emergency_responses;

        -- Create tighter policies
        -- Check if 'provider_id' column exists to perform the check
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'emergency_responses' AND column_name = 'provider_id') THEN
            
            -- Insert: User must be the provider they are claiming to be
            CREATE POLICY "secure_emergency_responses_insert" ON public.emergency_responses
                FOR INSERT 
                TO authenticated
                WITH CHECK (auth.uid() = provider_id);

            -- Update: User must be the provider (owner of the response)
            CREATE POLICY "secure_emergency_responses_update" ON public.emergency_responses
                FOR UPDATE
                TO authenticated
                USING (auth.uid() = provider_id)
                WITH CHECK (auth.uid() = provider_id);
                
        ELSE
            -- Fallback if provider_id doesn't exist but user_id does
             IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'emergency_responses' AND column_name = 'user_id') THEN
                
                CREATE POLICY "secure_emergency_responses_insert" ON public.emergency_responses
                    FOR INSERT 
                    TO authenticated
                    WITH CHECK (auth.uid() = user_id);

                CREATE POLICY "secure_emergency_responses_update" ON public.emergency_responses
                    FOR UPDATE
                    TO authenticated
                    USING (auth.uid() = user_id)
                    WITH CHECK (auth.uid() = user_id);
             END IF;
        END IF;

    END IF;
END $$;
