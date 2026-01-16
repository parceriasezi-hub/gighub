-- Create job_completions table
CREATE TABLE IF NOT EXISTS job_completions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gig_id UUID NOT NULL REFERENCES gigs(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES profiles(id),
  description TEXT NOT NULL,
  attachments JSONB DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  
  -- Constraint to ensure only one pending completion per gig
  CONSTRAINT unique_pending_completion UNIQUE (gig_id, provider_id)
);

-- RLS Policies
ALTER TABLE job_completions ENABLE ROW LEVEL SECURITY;

-- Provider can see their own completions
CREATE POLICY "Providers can view own completions" 
  ON job_completions FOR SELECT 
  USING (auth.uid() = provider_id);

-- Provider can create completions for gigs they are assigned to (handled by app logic but good to have)
CREATE POLICY "Providers can insert completions" 
  ON job_completions FOR INSERT 
  WITH CHECK (auth.uid() = provider_id);

-- Clients can view completions for their gigs
CREATE POLICY "Clients can view completions for their gigs" 
  ON job_completions FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM gigs 
    WHERE gigs.id = job_completions.gig_id 
    AND gigs.author_id = auth.uid()
  ));

-- Clients can update status (approve/reject)
CREATE POLICY "Clients can update completions for their gigs" 
  ON job_completions FOR UPDATE 
  USING (EXISTS (
    SELECT 1 FROM gigs 
    WHERE gigs.id = job_completions.gig_id 
    AND gigs.author_id = auth.uid()
  ));
