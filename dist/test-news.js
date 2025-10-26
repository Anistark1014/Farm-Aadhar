/**
 * NewsAPI Test - Run this in browser console
 * 
 * Instructions:
 * 1. Make sure dev server is running (npm run dev)
 * 2. Open http://localhost:8080 in browser
 * 3. Open browser console (F12)
 * 4. Copy and paste this code
 * 5. Press Enter to run
 */

// Test NewsAPI integration
async function testNewsAPI() {
  console.log('🧪 Testing NewsAPI Integration...\n');

  try {
    // Import services
    const { fetchLiveAgricultureNews, syncAllNews } = await import('./src/api/live-news-service');
    const { supabase } = await import('./src/integrations/supabase/client');

    // Test 1: Fetch English news
    console.log('📰 Fetching English agriculture news...');
    const englishArticles = await fetchLiveAgricultureNews('en');
    console.log(`✅ Fetched ${englishArticles?.length || 0} English articles`);
    
    if (englishArticles?.length > 0) {
      console.log('Sample:', englishArticles[0].title);
    }

    // Test 2: Fetch Hindi news
    console.log('\n📰 Fetching Hindi agriculture news...');
    const hindiArticles = await fetchLiveAgricultureNews('hi');
    console.log(`✅ Fetched ${hindiArticles?.length || 0} Hindi articles`);
    
    if (hindiArticles?.length > 0) {
      console.log('Sample:', hindiArticles[0].title);
    }

    // Test 3: Check database
    console.log('\n💾 Checking database...');
    const { count } = await supabase
      .from('news_articles')
      .select('*', { count: 'exact', head: true });
    console.log(`✅ Total articles in database: ${count}`);

    // Summary
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉 Test Complete!');
    console.log(`English: ${englishArticles?.length || 0} articles`);
    console.log(`Hindi: ${hindiArticles?.length || 0} articles`);
    console.log(`Database: ${count} articles`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('\nTroubleshooting:');
    console.error('1. Restart dev server after creating .env');
    console.error('2. Check VITE_NEWS_API_KEY in .env file');
    console.error('3. Verify NewsAPI key at https://newsapi.org/account');
  }
}

// Auto-run
testNewsAPI();
