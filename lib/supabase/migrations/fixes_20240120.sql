-- Create provider_specialties (Legacy/Extra Skills) if it doesn't exist
CREATE TABLE IF NOT EXISTS public.provider_specialties (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    provider_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    specialty_name TEXT NOT NULL,
    experience_level TEXT, -- 'beginner', 'intermediate', 'advanced', 'expert'
    years_experience INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS for provider_specialties
ALTER TABLE public.provider_specialties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view provider specialties" ON public.provider_specialties
    FOR SELECT USING (true);

CREATE POLICY "Providers can manage own specialties" ON public.provider_specialties
    FOR ALL USING (auth.uid() = provider_id);


-- Add missing columns to profiles
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'provider_application_date') THEN
        ALTER TABLE public.profiles ADD COLUMN provider_application_date TIMESTAMP WITH TIME ZONE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'hourly_rate') THEN
        ALTER TABLE public.profiles ADD COLUMN hourly_rate NUMERIC(10, 2);
    END IF;
    
    -- Ensure other fields from onboarding exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'provider_bio') THEN
        ALTER TABLE public.profiles ADD COLUMN provider_bio TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'provider_phone') THEN
        ALTER TABLE public.profiles ADD COLUMN provider_phone TEXT;
    END IF;

     IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'provider_website') THEN
        ALTER TABLE public.profiles ADD COLUMN provider_website TEXT;
    END IF;

     IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'provider_experience_years') THEN
        ALTER TABLE public.profiles ADD COLUMN provider_experience_years INTEGER;
    END IF;
    
     IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'provider_hourly_rate') THEN
        ALTER TABLE public.profiles ADD COLUMN provider_hourly_rate NUMERIC(10, 2);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'provider_availability') THEN
        ALTER TABLE public.profiles ADD COLUMN provider_availability TEXT DEFAULT 'available';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'location') THEN
        ALTER TABLE public.profiles ADD COLUMN location TEXT;
    END IF;

END $$;
