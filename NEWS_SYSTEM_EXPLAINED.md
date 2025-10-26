# Farm Aadhar - News System Architecture

## 🎯 Overview
The news system fetches **Indian agriculture news** from NewsAPI.org, stores it **locally in Supabase database**, and displays it in both **English and Hindi**.

---

## 📊 Data Flow

```
NewsAPI.org (External)
    ↓
live-news-service.ts (Fetch & Process)
    ↓
Supabase Database (Local Storage)
    ↓
news-api.ts (Read from DB)
    ↓
News.tsx (Display in UI)
```

---

## 🔄 How It Works

### 1️⃣ **Sync News** (live-news-service.ts)
**Function**: `syncAllNews()`

**What it does:**
- Fetches 100 articles from NewsAPI.org for **English** (India/Maharashtra focused)
- Fetches 100 articles from NewsAPI.org for **Hindi** (भारत/महाराष्ट्र focused)
- Automatically categorizes articles (weather, crop_care, market_prices, etc.)
- Extracts related crops (sugarcane, cotton, onion, etc.)
- **Stores in Supabase database** (news_articles table)
- Filters out duplicates automatically

**Search Terms Used:**
- **English**: India, Maharashtra, farming, crops, MSP, APMC, PM Kisan, kharif, rabi, monsoon, sugarcane, cotton, soybean, onion, etc.
- **Hindi**: भारत, महाराष्ट्र, कृषि, किसान, मंडी, एमएसपी, खरीफ, रबी, गन्ना, कपास, प्याज, etc.

---

### 2️⃣ **Store in Database** (Supabase)
**Table**: `news_articles`

**Fields stored:**
- title, content, summary (English or Hindi)
- language ('en' or 'hi')
- category (weather, crop_care, pest_control, market_prices, technology, government_schemes, best_practices, seasonal_tips, general)
- tags (array of relevant tags)
- related_crops (array of crops mentioned)
- images, author, source
- view_count, likes_count
- published_at, created_at

**Benefits of local storage:**
- ✅ Fast access (no external API calls when displaying)
- ✅ Works offline (once synced)
- ✅ No rate limits when reading
- ✅ Can be filtered, searched, sorted easily
- ✅ Persistent storage

---

### 3️⃣ **Read from Database** (news-api.ts)
**Function**: `fetchNews(filters)`

**What it does:**
- Reads articles from **local Supabase database**
- Filters by language (en/hi)
- Filters by category (optional)
- Search by keywords (optional)
- Sorts by priority and date
- Returns 20 articles by default

**Example:**
```typescript
// Fetch English news
const articles = await fetchNews({ language: 'en', limit: 20 });

// Fetch Hindi news about weather
const hindiWeather = await fetchNews({ 
  language: 'hi', 
  category: 'weather', 
  limit: 10 
});

// Search for cotton-related news
const cottonNews = await fetchNews({ 
  search: 'cotton',
  language: 'en'
});
```

---

### 4️⃣ **Display in UI** (News.tsx)
**Component**: `News.tsx`

**Features:**
- 3 main tabs: News, Tips, Weather
- Search functionality
- "Sync Latest News" button (calls `syncAllNews()`)
- Language switching (English ↔ Hindi)
- Article cards with images
- View count and likes
- Full article view

---

## 🇮🇳 Indian/Maharashtra Focus

### News Topics Covered:
- ✅ Maharashtra farming (Vidarbha, Marathwada, Konkan)
- ✅ Major crops (Cotton, Sugarcane, Soybean, Onion, Jowar, Bajra)
- ✅ Government schemes (PM-KISAN, PMKSY, loan waivers)
- ✅ APMC mandi prices
- ✅ Monsoon and weather updates
- ✅ MSP announcements
- ✅ Agricultural technology and IoT
- ✅ Irrigation and water management
- ✅ Pest control and crop diseases

### Regional Coverage:
- 🌾 **Vidarbha**: Cotton, soybean, oranges
- 🌾 **Marathwada**: Sugarcane, cotton, drought management
- 🌾 **Western Maharashtra**: Sugarcane, grapes, pomegranate
- 🌾 **Konkan**: Rice, mango, coconut
- 🌾 **Khandesh**: Cotton, banana
- 🌾 **Nashik**: Onion, grapes

---

## 🔧 Technical Details

### Database Schema:
```sql
CREATE TABLE news_articles (
  id UUID PRIMARY KEY,
  title TEXT NOT NULL,
  subtitle TEXT,
  content TEXT NOT NULL,
  summary TEXT,
  language TEXT NOT NULL, -- 'en' or 'hi'
  category TEXT NOT NULL, -- weather, crop_care, etc.
  tags TEXT[],
  related_crops TEXT[],
  featured_image_url TEXT,
  thumbnail_url TEXT,
  author TEXT,
  source_name TEXT,
  source_url TEXT UNIQUE, -- Prevents duplicates
  view_count INTEGER DEFAULT 0,
  likes_count INTEGER DEFAULT 0,
  priority INTEGER DEFAULT 5,
  is_featured BOOLEAN DEFAULT false,
  is_published BOOLEAN DEFAULT true,
  published_at TIMESTAMP,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### Categories:
1. **weather** - Monsoon, drought, climate updates
2. **crop_care** - Planting, growing, harvesting tips
3. **pest_control** - Disease management, pesticides
4. **market_prices** - APMC rates, MSP, trading
5. **technology** - IoT, drones, smart farming
6. **government_schemes** - Subsidies, loans, policies
7. **best_practices** - Farming techniques, methods
8. **seasonal_tips** - Kharif/Rabi specific advice
9. **general** - Other agriculture news

---

## 🚀 Usage

### Sync News (Manual):
1. Click "Sync Latest News" button in UI
2. Or call: `await syncAllNews()`
3. Wait ~10-15 seconds for sync to complete
4. Articles appear in database and UI

### Sync News (Automatic):
Set up a cron job or scheduled task:
```typescript
// Run every 6 hours
setInterval(async () => {
  await syncAllNews();
}, 6 * 60 * 60 * 1000);
```

### Read News:
```typescript
// In any component
import { fetchNews } from '@/api/news-api';

const articles = await fetchNews({ 
  language: 'hi', // or 'en'
  limit: 20 
});
```

---

## ✅ Summary

**The system is ALREADY working as you requested:**

1. ✅ **Fetches news from external API** (NewsAPI.org)
2. ✅ **Stores in local database** (Supabase news_articles table)
3. ✅ **Supports both English and Hindi**
4. ✅ **Focused on Indian/Maharashtra farming**
5. ✅ **Categorizes automatically**
6. ✅ **Filters duplicates**
7. ✅ **Fast local access** (no external calls when reading)
8. ✅ **Searchable and filterable**

**Click "Sync Latest News" button to see it in action!** 🚀
