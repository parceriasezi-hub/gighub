-- Create organizations table
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    legal_name TEXT NOT NULL,
    vat_number TEXT UNIQUE NOT NULL,
    address TEXT,
    registry_code TEXT,
    website TEXT,
    logo_url TEXT,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Enable RLS for organizations
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Create departments table
CREATE TABLE IF NOT EXISTS public.departments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Enable RLS for departments
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

-- Create organization role enum
DO $$ BEGIN
    CREATE TYPE public.organization_role AS ENUM ('owner', 'admin', 'member');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create organization_members table
CREATE TABLE IF NOT EXISTS public.organization_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    role public.organization_role DEFAULT 'member' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    UNIQUE(organization_id, user_id)
);

-- Enable RLS for organization_members
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- POLICIES

-- Organizations:
-- Select: Members can view their own organization
CREATE POLICY "Members can view their own organization" ON public.organizations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.organization_members
            WHERE organization_members.organization_id = organizations.id
            AND organization_members.user_id = auth.uid()
        )
    );

-- Insert: Authenticated users can create an organization (Registration flow)
CREATE POLICY "Authenticated users can create organizations" ON public.organizations
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Organization Members:
-- Select: View self
CREATE POLICY "Members can view their own membership" ON public.organization_members
    FOR SELECT USING (
        user_id = auth.uid()
    );

-- Select: View colleagues
CREATE POLICY "Members can view other members in same org" ON public.organization_members
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM public.organization_members
            WHERE user_id = auth.uid()
        )
    );

-- Insert: Owners/Admins can add members OR User can add themselves as Owner if Org is new (tricky with RLS)
-- Strategy: We expect 'registerCompany' Action to use a Service Role client or Security Definer function for the atomic creation.
-- OR we allow users to insert into members IF they are the owner of the organization.
-- BUT 'owner' status is defined BY this table.
-- SOLUTION: Trust the server-side action to handle the initial member creation using Service Role.
-- So we only add policies for reading for now, and maybe Owner-invites later.

-- Departments:
-- Select: Members of the org
CREATE POLICY "Members can view their org departments" ON public.departments
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM public.organization_members
            WHERE user_id = auth.uid()
        )
    );
