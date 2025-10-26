/**
 * News API Service - Local Database Operations
 * 
 * PURPOSE:
 * - Reads news articles from LOCAL Supabase database (news_articles table)
 * - Articles are pre-stored by live-news-service.ts via NewsAPI sync
 * - Supports filtering by language (en/hi), category, search, etc.
 * 
 * DATA SOURCE:
 * - All articles are stored in Supabase 'news_articles' table
 * - Articles are Indian farming focused (India, Maharashtra)
 * - Available in both English and Hindi
 * 
 * HOW TO USE:
 * 1. First, sync articles: syncAllNews() from live-news-service.ts
 * 2. Then, fetch articles: fetchNews({ language: 'en' }) from this file
 * 3. Articles are fetched from LOCAL database (not external API)
 * 
 * WORKFLOW:
 * NewsAPI → Sync → Supabase DB (local) → fetchNews() → Display in UI
 */

import { supabase } from '@/integrations/supabase/client';

export interface NewsArticle {
  id: string;
  title: string;
  subtitle: string | null;
  content: string;
  summary: string | null;
  language: string;
  featured_image_url: string | null;
  thumbnail_url: string | null;
  category: string;
  tags: string[] | null;
  related_crops: string[] | null;
  priority: number;
  is_featured: boolean;
  is_published: boolean;
  author: string | null;
  source_name: string | null;
  source_url: string | null;
  view_count: number;
  likes_count: number;
  published_at: string;
  created_at: string;
  updated_at: string;
}

export interface NewsFilters {
  language?: string;
  category?: string;
  search?: string;
  featured?: boolean;
  limit?: number;
}

/**
 * Fetch news articles from LOCAL database with optional filters
 * 
 * Articles are pre-synced from NewsAPI and stored in Supabase.
 * This function reads from local database (fast, no external API calls).
 * 
 * @param filters - Optional filters for language, category, search, etc.
 * @returns Array of news articles from local database
 */
export async function fetchNews(filters: NewsFilters = {}): Promise<NewsArticle[]> {
  const {
    language = 'en',
    category,
    search,
    featured,
    limit = 20
  } = filters;

  try {
    // Query local Supabase database (news_articles table)
    let query = supabase
      .from('news_articles')
      .select('*')
      .eq('is_published', true)
      .eq('language', language); // Filter by language (en or hi)

    if (category) {
      query = query.eq('category', category);
    }

    if (featured !== undefined) {
      query = query.eq('is_featured', featured);
    }

    if (search) {
      query = query.or(`title.ilike.%${search}%,summary.ilike.%${search}%`);
    }

    query = query
      .order('is_featured', { ascending: false })
      .order('priority', { ascending: false })
      .order('published_at', { ascending: false })
      .limit(limit);

    const { data, error } = await query;

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error fetching news:', error);
    throw error;
  }
}

/**
 * Fetch a single article by ID
 */
export async function fetchArticleById(id: string): Promise<NewsArticle | null> {
  try {
    const { data, error } = await supabase
      .from('news_articles')
      .select('*')
      .eq('id', id)
      .eq('is_published', true)
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error fetching article:', error);
    return null;
  }
}

/**
 * Increment article view count
 */
export async function incrementViewCount(id: string): Promise<void> {
  try {
    const { error } = await supabase.rpc('increment_article_views', { article_id: id });
    
    if (error) {
      // Fallback: manual increment
      const { data: article } = await supabase
        .from('news_articles')
        .select('view_count')
        .eq('id', id)
        .single();
      
      if (article) {
        await supabase
          .from('news_articles')
          .update({ view_count: article.view_count + 1 })
          .eq('id', id);
      }
    }
  } catch (error) {
    console.error('Error incrementing view count:', error);
  }
}

/**
 * Like an article
 */
export async function likeArticle(id: string): Promise<void> {
  try {
    const { error } = await supabase.rpc('increment_article_likes', { article_id: id });
    
    if (error) {
      // Fallback: manual increment
      const { data: article } = await supabase
        .from('news_articles')
        .select('likes_count')
        .eq('id', id)
        .single();
      
      if (article) {
        await supabase
          .from('news_articles')
          .update({ likes_count: article.likes_count + 1 })
          .eq('id', id);
      }
    }
  } catch (error) {
    console.error('Error liking article:', error);
    throw error;
  }
}

/**
 * Get featured articles
 */
export async function getFeaturedArticles(language: string = 'en'): Promise<NewsArticle[]> {
  return fetchNews({ language, featured: true, limit: 5 });
}

/**
 * Get articles by category
 */
export async function getArticlesByCategory(
  category: string,
  language: string = 'en',
  limit: number = 10
): Promise<NewsArticle[]> {
  return fetchNews({ language, category, limit });
}

/**
 * Search articles
 */
export async function searchArticles(
  searchQuery: string,
  language: string = 'en'
): Promise<NewsArticle[]> {
  return fetchNews({ language, search: searchQuery, limit: 50 });
}
