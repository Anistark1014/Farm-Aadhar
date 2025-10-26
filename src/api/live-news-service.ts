/**
 * Live News API Integration Service
 * 
 * PURPOSE:
 * - Fetches real-time Indian agriculture news from NewsAPI.org
 * - Stores news articles in Supabase database (news_articles table)
 * - Supports both English and Hindi languages
 * - Focused on India and Maharashtra farming
 * 
 * HOW IT WORKS:
 * 1. syncAllNews() - Fetches news from NewsAPI for both languages
 * 2. Articles are automatically categorized (weather, crop_care, market_prices, etc.)
 * 3. Articles are stored in local Supabase database
 * 4. Duplicates are automatically filtered out (based on source_url)
 * 5. News.tsx component reads from this local database
 * 
 * DATA FLOW:
 * NewsAPI.org → fetchLiveAgricultureNews() → Supabase DB → fetchNews() → UI
 * 
 * SEARCH TERMS USED:
 * - English: India, Maharashtra, farming, crops, MSP, APMC, PM Kisan, monsoon, etc.
 * - Hindi: भारत, महाराष्ट्र, कृषि, किसान, मंडी, etc.
 */

import { supabase } from '@/integrations/supabase/client';

// NewsAPI.org configuration
const NEWS_API_KEY = import.meta.env.VITE_NEWS_API_KEY || '';
const NEWS_API_BASE_URL = 'https://newsapi.org/v2';

// Validate API key on initialization
if (!NEWS_API_KEY) {
  console.error('⚠️ NewsAPI key not found! Add VITE_NEWS_API_KEY to your .env file');
}

// Types for NewsAPI response
interface NewsAPIArticle {
  source: { id: string | null; name: string };
  author: string | null;
  title: string;
  description: string;
  url: string;
  urlToImage: string | null;
  publishedAt: string;
  content: string;
}

interface NewsAPIResponse {
  status: string;
  totalResults: number;
  articles: NewsAPIArticle[];
}

/**
 * Fetch live agriculture news from NewsAPI.org
 * Supports both English and Hindi languages
 */
export async function fetchLiveAgricultureNews(language: 'en' | 'hi' = 'en') {
  try {
    // Language-specific search queries - FOCUSED ON INDIAN/MAHARASHTRA AGRICULTURE
    const queries = {
      en: '(India OR Maharashtra OR Indian) AND (agriculture OR farming OR crops OR irrigation OR "smart farming" OR agritech OR farmers OR kharif OR rabi OR mandi OR MSP OR "PM Kisan" OR APMC OR FPO OR "sugarcane" OR "cotton" OR "soybean" OR "wheat" OR "rice" OR "onion" OR drought OR monsoon)',
      hi: '(भारत OR महाराष्ट्र OR भारतीय) AND (कृषि OR किसान OR खेती OR सिंचाई OR फसल OR बीज OR खाद OR कीटनाशक OR मंडी OR एमएसपी OR खरीफ OR रबी OR गन्ना OR कपास OR सोयाबीन OR गेहूं OR धान OR प्याज OR सूखा OR मानसून)'
    };

    const params = new URLSearchParams({
      q: queries[language],
      language: language,
      sortBy: 'publishedAt',
      pageSize: '100', // Increased from 30 to 100
      apiKey: NEWS_API_KEY
    });

    const response = await fetch(`${NEWS_API_BASE_URL}/everything?${params}`);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`NewsAPI error: ${response.statusText} - ${errorData.message || ''}`);
    }

    const data: NewsAPIResponse = await response.json();
    
    if (data.status !== 'ok') {
      throw new Error('NewsAPI returned non-ok status');
    }

    // Transform and categorize articles
    const articles = data.articles
      .filter(article => article.title && article.description) // Filter out incomplete articles
      .map(article => ({
        title: article.title,
        subtitle: article.description.substring(0, 200),
        content: article.content || article.description,
        summary: article.description,
        language,
        featured_image_url: article.urlToImage,
        thumbnail_url: article.urlToImage,
        category: categorizeArticle(article.title + ' ' + article.description),
        tags: extractTags(article.title + ' ' + article.description),
        related_crops: extractCrops(article.title + ' ' + article.description),
        priority: 5,
        is_featured: false,
        is_published: true,
        author: article.author || article.source.name,
        source_name: article.source.name,
        source_url: article.url,
        view_count: 0,
        likes_count: 0,
        published_at: new Date(article.publishedAt).toISOString()
      }));

    console.log(`📥 Received ${articles.length} ${language} articles from NewsAPI`);
    console.log(`🏷️  Categories found: ${[...new Set(articles.map(a => a.category))].join(', ')}`);

    // Insert articles into database
    // Note: If you get "no unique constraint" error, run this SQL in Supabase:
    // ALTER TABLE public.news_articles ADD CONSTRAINT news_articles_source_url_unique UNIQUE (source_url);
    
    // First, check which articles already exist
    const existingUrls = new Set<string>();
    try {
      const { data: existing } = await supabase
        .from('news_articles')
        .select('source_url')
        .in('source_url', articles.map(a => a.source_url));
      
      existing?.forEach(row => existingUrls.add(row.source_url));
    } catch (e) {
      console.warn('Could not check existing articles, proceeding with insert');
    }

    // Filter out duplicates manually
    const newArticles = articles.filter(article => !existingUrls.has(article.source_url));

    if (newArticles.length === 0) {
      console.log(`ℹ️  No new ${language} articles to sync (all ${articles.length} already exist in database)`);
      return [];
    }

    console.log(`💾 Storing ${newArticles.length} new articles in Supabase database...`);

    // Insert only new articles into news_articles table
    const { data: insertedArticles, error } = await supabase
      .from('news_articles')
      .insert(newArticles)
      .select();

    if (error) {
      console.error('❌ Error storing news articles in database:', error);
      throw error;
    }

    console.log(`✅ Successfully stored ${insertedArticles?.length || 0} new ${language} articles in database`);
    console.log(`📍 Articles can now be read locally from news_articles table`);
    return insertedArticles;

  } catch (error) {
    console.error(`❌ Error fetching live ${language} news:`, error);
    throw error;
  }
}

/**
 * Categorize article based on content keywords
 * Categories must match database CHECK constraint: 
 * 'general', 'crop_care', 'pest_control', 'weather', 
 * 'market_prices', 'technology', 'government_schemes', 
 * 'best_practices', 'seasonal_tips'
 */
function categorizeArticle(text: string): string {
  const lower = text.toLowerCase();
  
  const categories = [
    { keywords: ['weather', 'rain', 'drought', 'climate', 'temperature', 'monsoon', 'forecast'], name: 'weather' },
    { keywords: ['pest', 'disease', 'weed', 'pesticide', 'insect', 'fungus', 'bug'], name: 'pest_control' },
    { keywords: ['market', 'price', 'sell', 'buy', 'trade', 'export', 'msp', 'mandi'], name: 'market_prices' },
    { keywords: ['technology', 'iot', 'sensor', 'app', 'digital', 'smart', 'drone', 'ai'], name: 'technology' },
    { keywords: ['subsidy', 'scheme', 'government', 'policy', 'loan', 'pm-kisan', 'yojana'], name: 'government_schemes' },
    { keywords: ['crop', 'harvest', 'yield', 'plant', 'seed', 'grow', 'wheat', 'rice', 'fertilizer', 'organic', 'soil', 'irrigation', 'water'], name: 'crop_care' },
    { keywords: ['tip', 'practice', 'method', 'technique', 'guide', 'how to'], name: 'best_practices' },
    { keywords: ['season', 'kharif', 'rabi', 'summer', 'winter', 'monsoon'], name: 'seasonal_tips' }
  ];

  for (const category of categories) {
    if (category.keywords.some(keyword => lower.includes(keyword))) {
      return category.name;
    }
  }

  return 'general';
}

/**
 * Extract relevant tags from article text
 */
function extractTags(text: string): string[] {
  const lower = text.toLowerCase();
  const tags: string[] = [];

  const tagPatterns = [
    { pattern: /smart farm|precision agricult|agritech/i, tag: 'smart-farming' },
    { pattern: /organic|sustainable|eco-friendly/i, tag: 'organic' },
    { pattern: /subsidy|scheme|yojana/i, tag: 'government-schemes' },
    { pattern: /export|international/i, tag: 'exports' },
    { pattern: /drought|water scarcity/i, tag: 'drought' },
    { pattern: /pest|disease/i, tag: 'pest-control' },
    { pattern: /market|price|mandi/i, tag: 'market-prices' }
  ];

  tagPatterns.forEach(({ pattern, tag }) => {
    if (pattern.test(text)) {
      tags.push(tag);
    }
  });

  return tags.length > 0 ? tags : null;
}

/**
 * Extract crop mentions from article text
 * Focused on Maharashtra's major crops
 */
function extractCrops(text: string): string[] | null {
  const lower = text.toLowerCase();
  const crops: string[] = [];

  // Maharashtra's major crops + common Indian crops
  const cropKeywords = [
    // Maharashtra major crops
    'sugarcane', 'cotton', 'soybean', 'jowar', 'bajra',
    'rice', 'wheat', 'pulses', 'gram', 'tur',
    'onion', 'tomato', 'potato', 'chili', 'brinjal',
    'mango', 'banana', 'grapes', 'orange', 'pomegranate',
    'turmeric', 'ginger', 'groundnut',
    // Hindi names
    'गन्ना', 'कपास', 'सोयाबीन', 'ज्वार', 'बाजरा',
    'धान', 'गेहूं', 'दाल', 'चना', 'तूर',
    'प्याज', 'टमाटर', 'आलू', 'मिर्च', 'बैंगन',
    'आम', 'केला', 'अंगूर', 'संतरा', 'अनार',
    'हल्दी', 'अदरक', 'मूंगफली'
  ];

  cropKeywords.forEach(crop => {
    if (lower.includes(crop)) {
      crops.push(crop);
    }
  });

  return crops.length > 0 ? crops : null;
}

/**
 * Sync news from NewsAPI for both languages and store in Supabase database
 * This function:
 * 1. Fetches latest Indian/Maharashtra agriculture news from NewsAPI
 * 2. Categorizes articles automatically
 * 3. Stores in local database (news_articles table)
 * 4. Handles duplicates (won't insert same article twice)
 * 5. Works for both English and Hindi languages
 * 
 * Call this function on a schedule (e.g., every 6 hours) or manually via UI button
 */
export async function syncAllNews() {
  const results = {
    en: null as any,
    hi: null as any,
    errors: [] as string[],
    totalSynced: 0
  };

  console.log('🔄 Starting news sync for Indian farming...');
  console.log('📰 Fetching from NewsAPI.org and storing in Supabase database...');

  // Sync English news (Indian farming focused)
  try {
    console.log('📡 Fetching English news about Indian agriculture...');
    results.en = await fetchLiveAgricultureNews('en');
    results.totalSynced += results.en?.length || 0;
    console.log(`✅ English: ${results.en?.length || 0} articles stored in database`);
  } catch (error) {
    const errorMsg = `English news sync failed: ${error}`;
    console.error(errorMsg);
    results.errors.push(errorMsg);
  }

  // Sync Hindi news (भारतीय कृषि focused)
  try {
    console.log('📡 Fetching Hindi news about भारतीय कृषि...');
    results.hi = await fetchLiveAgricultureNews('hi');
    results.totalSynced += results.hi?.length || 0;
    console.log(`✅ Hindi: ${results.hi?.length || 0} articles stored in database`);
  } catch (error) {
    const errorMsg = `Hindi news sync failed: ${error}`;
    console.error(errorMsg);
    results.errors.push(errorMsg);
  }

  console.log(`\n📊 SYNC SUMMARY:`);
  console.log(`   Total articles synced: ${results.totalSynced}`);
  console.log(`   English articles: ${results.en?.length || 0}`);
  console.log(`   Hindi articles: ${results.hi?.length || 0}`);
  console.log(`   Stored in: news_articles table (Supabase)`);
  console.log(`   ✅ Articles are now available locally in database\n`);

  if (results.errors.length > 0) {
    console.warn('⚠️ Sync completed with errors:', results.errors);
  }

  return results;
}

/**
 * Clean old news articles (keep last 30 days)
 */
export async function cleanOldNews() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { error } = await supabase
    .from('news_articles')
    .delete()
    .lt('published_at', thirtyDaysAgo.toISOString());

  if (error) {
    console.error('Error cleaning old news:', error);
    throw error;
  }

  console.log('✅ Cleaned news articles older than 30 days');
}
