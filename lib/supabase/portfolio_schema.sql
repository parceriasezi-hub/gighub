
-- Create portfolio_items table
CREATE TABLE IF NOT EXISTS public.portfolio_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    project_url TEXT,
    completion_date DATE,
    client_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create portfolio_media table
CREATE TABLE IF NOT EXISTS public.portfolio_media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    portfolio_item_id UUID NOT NULL REFERENCES public.portfolio_items(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video', 'pdf')),
    file_name TEXT,
    size INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.portfolio_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_media ENABLE ROW LEVEL SECURITY;

-- Policies for portfolio_items
CREATE POLICY "Portfolio items are viewable by everyone" 
    ON public.portfolio_items FOR SELECT 
    USING (true);

CREATE POLICY "Providers can insert their own portfolio items" 
    ON public.portfolio_items FOR INSERT 
    WITH CHECK (auth.uid() = provider_id);

CREATE POLICY "Providers can update their own portfolio items" 
    ON public.portfolio_items FOR UPDATE 
    USING (auth.uid() = provider_id);

CREATE POLICY "Providers can delete their own portfolio items" 
    ON public.portfolio_items FOR DELETE 
    USING (auth.uid() = provider_id);

-- Policies for portfolio_media
CREATE POLICY "Portfolio media is viewable by everyone" 
    ON public.portfolio_media FOR SELECT 
    USING (true);

CREATE POLICY "Providers can manage their portfolio media" 
    ON public.portfolio_media FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM public.portfolio_items 
            WHERE id = portfolio_media.portfolio_item_id 
            AND provider_id = auth.uid()
        )
    );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_portfolio_items_provider_id ON public.portfolio_items(provider_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_media_item_id ON public.portfolio_media(portfolio_item_id);
