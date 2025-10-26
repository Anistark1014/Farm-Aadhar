/**
 * Test script for NewsAPI integration
 * Run this to verify your NewsAPI key and fetch sample data
 */

import { fetchLiveAgricultureNews, syncAllNews } from './src/api/live-news-service';

async function testNewsAPI() {
  console.log('🧪 Testing NewsAPI Integration...\n');

  try {
    // Test 1: Check API key
    console.log('✅ Step 1: Checking API key...');
    const apiKey = import.meta.env.VITE_NEWS_API_KEY;
    if (!apiKey) {
      throw new Error('❌ NewsAPI key not found in environment variables');
    }
    console.log(`   API Key found: ${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)}\n`);

    // Test 2: Fetch English news
    console.log('📰 Step 2: Fetching English agriculture news...');
    const englishArticles = await fetchLiveAgricultureNews('en');
    console.log(`   ✅ Fetched ${englishArticles?.length || 0} English articles\n`);

    if (englishArticles && englishArticles.length > 0) {
      console.log('   Sample article:');
      console.log(`   - Title: ${englishArticles[0].title}`);
      console.log(`   - Category: ${englishArticles[0].category}`);
      console.log(`   - Source: ${englishArticles[0].source_name}\n`);
    }

    // Test 3: Fetch Hindi news
    console.log('📰 Step 3: Fetching Hindi agriculture news...');
    const hindiArticles = await fetchLiveAgricultureNews('hi');
    console.log(`   ✅ Fetched ${hindiArticles?.length || 0} Hindi articles\n`);

    if (hindiArticles && hindiArticles.length > 0) {
      console.log('   Sample article:');
      console.log(`   - Title: ${hindiArticles[0].title}`);
      console.log(`   - Category: ${hindiArticles[0].category}`);
      console.log(`   - Source: ${hindiArticles[0].source_name}\n`);
    }

    // Test 4: Check database storage
    console.log('💾 Step 4: Checking database storage...');
    const { supabase } = await import('./src/integrations/supabase/client');
    const { count, error } = await supabase
      .from('news_articles')
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.log(`   ⚠️ Database check failed: ${error.message}`);
    } else {
      console.log(`   ✅ Total articles in database: ${count}\n`);
    }

    // Summary
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉 NewsAPI Integration Test Complete!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✅ English articles: ${englishArticles?.length || 0}`);
    console.log(`✅ Hindi articles: ${hindiArticles?.length || 0}`);
    console.log(`✅ Total in database: ${count || 0}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('\n❌ Test Failed!');
    console.error('Error:', error.message);
    console.error('\nTroubleshooting:');
    console.error('1. Check .env file exists with VITE_NEWS_API_KEY');
    console.error('2. Restart dev server after creating .env');
    console.error('3. Verify API key at https://newsapi.org/account');
    console.error('4. Check you have not exceeded 100 requests/day limit');
    process.exit(1);
  }
}

// Run test if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testNewsAPI();
}

export { testNewsAPI };
