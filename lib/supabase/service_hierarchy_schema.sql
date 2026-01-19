
-- Create subcategories table
create table if not exists public.subcategories (
  id uuid default gen_random_uuid() primary key,
  category_id uuid references public.categories(id) on delete cascade not null,
  name text not null,
  slug text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(category_id, slug)
);

-- Create services table
create table if not exists public.services (
  id uuid default gen_random_uuid() primary key,
  subcategory_id uuid references public.subcategories(id) on delete cascade not null,
  name text not null,
  description text,
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create provider_services table (replacing loose specialties eventually?)
create table if not exists public.provider_services (
  id uuid default gen_random_uuid() primary key,
  provider_id uuid references public.profiles(id) on delete cascade not null,
  service_id uuid references public.services(id) on delete cascade not null,
  price_starting_at numeric,
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(provider_id, service_id)
);

-- RLS Policies

-- Subcategories: Public read, Admin write
alter table public.subcategories enable row level security;
create policy "Public can view subcategories" on public.subcategories for select using (true);
create policy "Admins can manage subcategories" on public.subcategories for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- Services: Public read, Admin write
alter table public.services enable row level security;
create policy "Public can view services" on public.services for select using (true);
create policy "Admins can manage services" on public.services for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- Provider Services: Public read, Provider manage own
alter table public.provider_services enable row level security;
create policy "Public can view provider services" on public.provider_services for select using (true);
create policy "Providers can manage own services" on public.provider_services for all using (
  auth.uid() = provider_id
);

-- Indexes for performance
create index if not exists idx_subcategories_category_id on public.subcategories(category_id);
create index if not exists idx_services_subcategory_id on public.services(subcategory_id);
create index if not exists idx_provider_services_provider_id on public.provider_services(provider_id);
create index if not exists idx_provider_services_service_id on public.provider_services(service_id);
