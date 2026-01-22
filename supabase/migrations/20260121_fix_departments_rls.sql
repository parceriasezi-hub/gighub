-- Enable RLS for departments (Already enabled, just adding policies)

-- Helper function (if not exists)
-- We reuse is_org_admin from previous migration if possible, or recreate/ensure it exists.
-- Assuming `is_org_admin` exists.

-- Policies for Departments

create policy "Admins can insert departments"
  on public.departments for insert
  with check ( public.is_org_admin(organization_id) );

create policy "Admins can update departments"
  on public.departments for update
  using ( public.is_org_admin(organization_id) );

create policy "Admins can delete departments"
  on public.departments for delete
  using ( public.is_org_admin(organization_id) );
