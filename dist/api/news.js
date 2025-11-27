// Serverless API endpoint for fetching news articles
// GET /api/news?language=en&category=crop_care&limit=10

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { 
      language = 'en', 
      category, 
      limit = 20,
      featured,
      search 
    } = req.query;

    // Supabase configuration
    const SUPABASE_URL = 'https://ghkcfgcyzhtwufizxuyo.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsbXFpcWh3bnhiZmZhd2ZibHJ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjYzMDYxMTMsImV4cCI6MjA0MTg4MjExM30.WyBL3G9Z5z4RvGhN2D7fN5bIcDW0Ix-z6Xm1i_fhq7w';

    // Build query URL
    let queryUrl = `${SUPABASE_URL}/rest/v1/news_articles?select=*&is_published=eq.true&language=eq.${language}`;
    
    if (category) {
      queryUrl += `&category=eq.${category}`;
    }
    
    if (featured === 'true') {
      queryUrl += `&is_featured=eq.true`;
    }
    
    if (search) {
      queryUrl += `&or=(title.ilike.%${search}%,summary.ilike.%${search}%)`;
    }
    
    queryUrl += `&order=is_featured.desc,priority.desc,published_at.desc&limit=${limit}`;

    // Fetch from Supabase
    const response = await fetch(queryUrl, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Supabase error: ${response.status}`);
    }

    const articles = await response.json();

    return res.status(200).json({
      success: true,
      count: articles.length,
      language,
      category: category || 'all',
      data: articles
    });

  } catch (error) {
    console.error('News API error:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Failed to fetch news articles',
      message: error.message 
    });
  }
}
