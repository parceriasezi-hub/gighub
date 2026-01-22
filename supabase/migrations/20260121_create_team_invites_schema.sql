-- Create organization_invites table
create table if not exists public.organization_invites (
  id uuid default gen_random_uuid() primary key,
  organization_id uuid references public.organizations(id) on delete cascade not null,
  email text not null,
  role text not null check (role in ('admin', 'member')),
  token text default gen_random_uuid()::text not null unique,
  expires_at timestamptz default (now() + interval '7 days') not null,
  status text default 'pending' check (status in ('pending', 'accepted', 'expired')),
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  unique(organization_id, email)
);

-- Enable RLS
alter table public.organization_invites enable row level security;

-- Helper function to check if user is admin or owner of an org
create or replace function public.is_org_admin(org_id uuid)
returns boolean as $$
  select exists (
    select 1 from public.organization_members
    where organization_id = org_id
    and user_id = auth.uid()
    and role in ('owner', 'admin')
  );
$$ language sql security definer;

-- Policies
create policy "Admins can view invites"
  on public.organization_invites for select
  using ( is_org_admin(organization_id) );

create policy "Admins can insert invites"
  on public.organization_invites for insert
  with check ( is_org_admin(organization_id) );

create policy "Admins can delete invites"
  on public.organization_invites for delete
  using ( is_org_admin(organization_id) );

-- Secure function to get invite details by token (for public acceptance page)
create or replace function public.get_invite_details(invite_token text)
returns table (
  id uuid,
  email text,
  role text,
  organization_name text,
  organization_id uuid
) language plpgsql security definer as $$
begin
  return query
  select 
    i.id,
    i.email,
    i.role,
    o.legal_name as organization_name,
    o.id as organization_id
  from public.organization_invites i
  join public.organizations o on i.organization_id = o.id
  where i.token = invite_token
  and i.status = 'pending'
  and i.expires_at > now();
end;
$$;
