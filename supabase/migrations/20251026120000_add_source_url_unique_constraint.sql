-- Add UNIQUE constraint to source_url for news sync
-- This allows us to use ON CONFLICT for upsert operations

ALTER TABLE public.news_articles 
ADD CONSTRAINT news_articles_source_url_unique UNIQUE (source_url);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_news_articles_source_url ON public.news_articles(source_url);
