import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Newspaper, Search, TrendingUp, Sprout, Bug, Cloud, DollarSign, Lightbulb, Calendar, CloudRain, Thermometer, Droplets, Wind, Sun, Sunrise, Sunset } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/hooks/useLanguage';
import ReactMarkdown from 'react-markdown';
import { FallbackImage } from '@/components/ui/fallback-image';
import { 
  fetchNews, 
  likeArticle, 
  incrementViewCount, 
  NewsArticle 
} from '@/api/news-api';
import { getFarmingTips, getTipOfTheDay, FarmingTip } from '@/api/tips-service';
import { 
  getCurrentWeather, 
  getWeatherForecast, 
  getWeatherByCity, 
  generateFarmingAdvice,
  getUserLocation,
  WeatherData, 
  WeatherForecast, 
  FarmingAdvice 
} from '../api/weather-service';
import { syncAllNews } from '@/api/live-news-service';

const categoryIcons: Record<string, any> = {
  general: Newspaper,
  crop_care: Sprout,
  pest_control: Bug,
  weather: Cloud,
  market_prices: DollarSign,
  technology: Lightbulb,
  best_practices: TrendingUp,
  seasonal_tips: Calendar,
};

const categoryColors: Record<string, string> = {
  general: 'bg-gray-500',
  crop_care: 'bg-green-500',
  pest_control: 'bg-red-500',
  weather: 'bg-blue-500',
  market_prices: 'bg-yellow-500',
  technology: 'bg-purple-500',
  government_schemes: 'bg-indigo-500',
  best_practices: 'bg-emerald-500',
  seasonal_tips: 'bg-orange-500',
};

export default function News() {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [filteredArticles, setFilteredArticles] = useState<NewsArticle[]>([]);
  const [selectedArticle, setSelectedArticle] = useState<NewsArticle | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Tips state
  const [tips, setTips] = useState<FarmingTip[]>([]);
  const [selectedTip, setSelectedTip] = useState<FarmingTip | null>(null);
  const [tipCategory, setTipCategory] = useState<string>('all');
  
  // Weather state
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [forecast, setForecast] = useState<WeatherForecast[]>([]);
  const [farmingAdvice, setFarmingAdvice] = useState<FarmingAdvice[]>([]);
  const [weatherCity, setWeatherCity] = useState('');
  const [weatherLoading, setWeatherLoading] = useState(false);
  
  const { toast } = useToast();
  const { language, t } = useLanguage();

  useEffect(() => {
    fetchArticles();
    fetchTips();
    fetchWeather();
  }, [language]);

  useEffect(() => {
    filterArticles();
  }, [articles, searchQuery]);

  const fetchArticles = async () => {
    try {
      setLoading(true);
      const data = await fetchNews({
        language,
        limit: 20
      });
      setArticles(data);
    } catch (error: any) {
      toast({
        title: t('error'),
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchTips = async () => {
    try {
      const filters = tipCategory !== 'all' ? { category: tipCategory, language } : { language };
      const data = await getFarmingTips(filters);
      setTips(data);
    } catch (error: any) {
      console.error('Error fetching tips:', error);
      toast({
        title: 'Error loading tips',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const fetchWeather = async () => {
    try {
      setWeatherLoading(true);
      
      const location = await getUserLocation();
      const weatherData = await getCurrentWeather(location.lat, location.lon);
      const forecastData = await getWeatherForecast(location.lat, location.lon);
      const advice = generateFarmingAdvice(weatherData, forecastData);
      
      setWeather(weatherData);
      setForecast(forecastData);
      setFarmingAdvice(advice);
    } catch (error: any) {
      console.error('Error fetching weather:', error);
      try {
        const weatherData = await getWeatherByCity('Delhi');
        const forecastData = await getWeatherForecast(28.7041, 77.1025);
        const advice = generateFarmingAdvice(weatherData, forecastData);
        
        setWeather(weatherData);
        setForecast(forecastData);
        setFarmingAdvice(advice);
        setWeatherCity('Delhi');
      } catch (fallbackError) {
        toast({
          title: 'Weather unavailable',
          description: 'Unable to load weather data',
          variant: 'destructive',
        });
      }
    } finally {
      setWeatherLoading(false);
    }
  };

  const handleCitySearch = async () => {
    if (!weatherCity.trim()) return;
    
    try {
      setWeatherLoading(true);
      const weatherData = await getWeatherByCity(weatherCity);
      const advice = generateFarmingAdvice(weatherData, []);
      
      setWeather(weatherData);
      setForecast([]);
      setFarmingAdvice(advice);
      
      toast({
        title: 'Weather updated',
        description: `Showing weather for ${weatherData.location}`,
      });
    } catch (error: any) {
      toast({
        title: 'City not found',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setWeatherLoading(false);
    }
  };

  const filterArticles = () => {
    let filtered = articles;

    // Filter by search query only (no category filter)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (article) =>
          article.title.toLowerCase().includes(query) ||
          article.summary?.toLowerCase().includes(query) ||
          article.tags?.some((tag) => tag.toLowerCase().includes(query))
      );
    }

    setFilteredArticles(filtered);
  };

  const handleArticleClick = async (article: NewsArticle) => {
    setSelectedArticle(article);

    try {
      await incrementViewCount(article.id);
      setArticles(prev => 
        prev.map(a => a.id === article.id ? { ...a, view_count: a.view_count + 1 } : a)
      );
    } catch (error) {
      console.error('Error updating view count:', error);
    }
  };

  const handleLike = async (article: NewsArticle) => {
    try {
      await likeArticle(article.id);

      setArticles((prev) =>
        prev.map((a) => (a.id === article.id ? { ...a, likes_count: a.likes_count + 1 } : a))
      );

      if (selectedArticle?.id === article.id) {
        setSelectedArticle({ ...selectedArticle, likes_count: selectedArticle.likes_count + 1 });
      }

      toast({
        title: 'Article liked!',
        description: 'Thank you for your feedback.',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const getCategoryLabel = (category: string): string => {
    return category
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  if (selectedArticle) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <Button
          variant="outline"
          onClick={() => setSelectedArticle(null)}
          className="mb-4"
        >
          ← Back to Articles
        </Button>

        <Card>
          <FallbackImage
            src={selectedArticle.featured_image_url}
            alt={selectedArticle.title}
            className="w-full h-64 object-cover rounded-t-lg"
            fallbackIcon={<Newspaper className="w-16 h-16 text-muted-foreground/40" />}
          />
          
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <Badge className={categoryColors[selectedArticle.category]}>
                {getCategoryLabel(selectedArticle.category)}
              </Badge>
              {selectedArticle.is_featured && (
                <Badge variant="secondary">Featured</Badge>
              )}
            </div>
            
            <CardTitle className="text-3xl">{selectedArticle.title}</CardTitle>
            
            {selectedArticle.subtitle && (
              <CardDescription className="text-lg">
                {selectedArticle.subtitle}
              </CardDescription>
            )}

            <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
              {selectedArticle.author && <span>By {selectedArticle.author}</span>}
              <span>{new Date(selectedArticle.published_at).toLocaleDateString()}</span>
              <span>{selectedArticle.view_count} views</span>
              <span>{selectedArticle.likes_count} likes</span>
            </div>
          </CardHeader>

          <CardContent>
            <div className="prose dark:prose-invert prose-green max-w-none">
              <ReactMarkdown>{selectedArticle.content}</ReactMarkdown>
            </div>

            {selectedArticle.tags && selectedArticle.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-6">
                {selectedArticle.tags.map((tag) => (
                  <Badge key={tag} variant="outline">
                    #{tag}
                  </Badge>
                ))}
              </div>
            )}

            {selectedArticle.source_url && (
              <div className="mt-6 p-4 bg-secondary/50 dark:bg-secondary/20 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  Original source:{' '}
                  <a
                    href={selectedArticle.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    {selectedArticle.source_name || 'External Link'}
                  </a>
                </p>
              </div>
            )}

            <div className="flex gap-4 mt-6">
              <Button onClick={() => handleLike(selectedArticle)}>
                ❤️ Like ({selectedArticle.likes_count})
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (selectedTip) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <Button
          variant="outline"
          onClick={() => setSelectedTip(null)}
          className="mb-4"
        >
          ← Back to Tips
        </Button>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <Badge className={categoryColors[selectedTip.category] || 'bg-green-500'}>
                {getCategoryLabel(selectedTip.category)}
              </Badge>
              <Badge variant="outline">{selectedTip.difficulty}</Badge>
            </div>
            
            <CardTitle className="text-3xl">
              {language === 'hi' && selectedTip.title_hi ? selectedTip.title_hi : selectedTip.title}
            </CardTitle>
          </CardHeader>

          <CardContent>
            <div className="prose dark:prose-invert prose-green max-w-none">
              <ReactMarkdown>
                {language === 'hi' && selectedTip.content_hi ? selectedTip.content_hi : selectedTip.content}
              </ReactMarkdown>
            </div>

            {selectedTip.related_crops && selectedTip.related_crops.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-semibold mb-2">Related Crops:</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedTip.related_crops.map((crop) => (
                    <Badge key={crop} variant="outline">
                      {crop}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Farming Hub</h1>
        <p className="text-muted-foreground">
          Stay updated with news, tips, and live weather for better farming decisions
        </p>
      </div>

      {/* Main Tabs: News / Tips / Weather */}
      <Tabs defaultValue="news" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="news" className="flex items-center gap-2">
            <Newspaper className="w-4 h-4" />
            News
          </TabsTrigger>
          <TabsTrigger value="tips" className="flex items-center gap-2">
            <Lightbulb className="w-4 h-4" />
            Tips
          </TabsTrigger>
          <TabsTrigger value="weather" className="flex items-center gap-2">
            <CloudRain className="w-4 h-4" />
            Weather
          </TabsTrigger>
        </TabsList>

        {/* NEWS TAB */}
        <TabsContent value="news">
          {/* Search Bar and Sync Button - NO CATEGORY TABS */}
          <div className="mb-6 flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search articles, tags, topics..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button 
              onClick={async () => {
                try {
                  setLoading(true);
                  await syncAllNews();
                  await fetchArticles();
                  toast({
                    title: 'News synced!',
                    description: '100+ latest articles fetched from NewsAPI',
                  });
                } catch (error: any) {
                  toast({
                    title: 'Sync failed',
                    description: error.message,
                    variant: 'destructive',
                  });
                } finally {
                  setLoading(false);
                }
              }}
              disabled={loading}
              variant="outline"
              className="whitespace-nowrap"
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              Sync Latest News
            </Button>
          </div>

          {/* Articles Grid - No Category Tabs */}
          {loading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Loading articles...</p>
            </div>
          ) : filteredArticles.length === 0 ? (
            <div className="text-center py-12">
              <Newspaper className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground">No articles found. Click "Sync Latest News" to fetch articles.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredArticles.map((article) => {
                const Icon = categoryIcons[article.category] || Newspaper;
                
                return (
                  <Card
                    key={article.id}
                    className="cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => handleArticleClick(article)}
                  >
                    <FallbackImage
                      src={article.thumbnail_url || article.featured_image_url}
                      alt={article.title}
                      className="w-full h-48 object-cover rounded-t-lg"
                      fallbackIcon={<Icon className="w-8 h-8 text-muted-foreground/40" />}
                    />
                    
                    <CardHeader>
                      <div className="flex items-center gap-2 mb-2">
                        <Icon className="w-4 h-4" />
                        <Badge className={categoryColors[article.category]}>
                          {getCategoryLabel(article.category)}
                        </Badge>
                        {article.is_featured && (
                          <Badge variant="secondary">Featured</Badge>
                        )}
                      </div>
                      
                      <CardTitle className="line-clamp-2">{article.title}</CardTitle>
                      
                      {article.summary && (
                        <CardDescription className="line-clamp-3">
                          {article.summary}
                        </CardDescription>
                      )}
                    </CardHeader>

                    <CardContent>
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>{new Date(article.published_at).toLocaleDateString()}</span>
                        <div className="flex gap-3">
                          <span>{article.view_count} views</span>
                          <span>❤️ {article.likes_count}</span>
                        </div>
                      </div>

                      {article.tags && article.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-3">
                          {article.tags.slice(0, 3).map((tag) => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              #{tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* TIPS TAB */}
        <TabsContent value="tips">
          <div className="mb-6">
            <Tabs value={tipCategory} onValueChange={(val) => { setTipCategory(val); fetchTips(); }}>
              <TabsList className="grid grid-cols-4 lg:grid-cols-7 gap-2">
                <TabsTrigger value="all">All Tips</TabsTrigger>
                <TabsTrigger value="planting">🌱 Planting</TabsTrigger>
                <TabsTrigger value="irrigation">💧 Irrigation</TabsTrigger>
                <TabsTrigger value="pest_control">🐛 Pest Control</TabsTrigger>
                <TabsTrigger value="fertilization">🌾 Fertilization</TabsTrigger>
                <TabsTrigger value="harvesting">🌽 Harvesting</TabsTrigger>
                <TabsTrigger value="soil_care">🌍 Soil Care</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tips.map((tip) => (
              <Card
                key={tip.id}
                className="cursor-pointer hover:shadow-lg transition-all hover:-translate-y-1"
                onClick={() => setSelectedTip(tip)}
              >
                <CardHeader>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className={categoryColors[tip.category] || 'bg-green-500'}>
                      {getCategoryLabel(tip.category)}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {tip.difficulty}
                    </Badge>
                  </div>
                  
                  <CardTitle className="line-clamp-2">
                    {language === 'hi' && tip.title_hi ? tip.title_hi : tip.title}
                  </CardTitle>
                </CardHeader>

                <CardContent>
                  <CardDescription className="line-clamp-4">
                    {language === 'hi' && tip.content_hi ? tip.content_hi : tip.content}
                  </CardDescription>

                  {tip.related_crops && tip.related_crops.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {tip.related_crops.slice(0, 2).map((crop) => (
                        <Badge key={crop} variant="secondary" className="text-xs">
                          {crop}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* WEATHER TAB */}
        <TabsContent value="weather">
          <div className="mb-6 flex gap-3">
            <Input
              placeholder="Enter city name (e.g., Mumbai, Delhi)"
              value={weatherCity}
              onChange={(e) => setWeatherCity(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleCitySearch()}
            />
            <Button onClick={handleCitySearch} disabled={weatherLoading}>
              <Search className="w-4 h-4 mr-2" />
              Search
            </Button>
          </div>

          {weatherLoading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Loading weather...</p>
            </div>
          ) : weather ? (
            <div className="space-y-6">
              {/* Current Weather Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Cloud className="w-5 h-5" />
                    Current Weather - {weather.location}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="flex items-center gap-3">
                      <Thermometer className="w-8 h-8 text-red-500" />
                      <div>
                        <p className="text-2xl font-bold">{weather.temperature}°C</p>
                        <p className="text-sm text-muted-foreground">Temperature</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Droplets className="w-8 h-8 text-blue-500" />
                      <div>
                        <p className="text-2xl font-bold">{weather.humidity}%</p>
                        <p className="text-sm text-muted-foreground">Humidity</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Wind className="w-8 h-8 text-gray-500" />
                      <div>
                        <p className="text-2xl font-bold">{weather.wind_speed} km/h</p>
                        <p className="text-sm text-muted-foreground">Wind Speed</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Cloud className="w-8 h-8 text-gray-400" />
                      <div>
                        <p className="text-lg font-semibold capitalize">{weather.description}</p>
                        <p className="text-sm text-muted-foreground">Condition</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Farming Advice */}
              {farmingAdvice.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Lightbulb className="w-5 h-5" />
                      Farming Advice
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {farmingAdvice.map((advice, index) => (
                        <div key={index} className="p-3 bg-secondary/50 dark:bg-secondary/20 rounded-lg">
                          <div className="flex items-start gap-2">
                            <Badge className={`${categoryColors[advice.category] || 'bg-green-500'} mt-1`}>
                              {getCategoryLabel(advice.category)}
                            </Badge>
                            <p className="text-sm flex-1">{advice.advice}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* 5-Day Forecast */}
              {forecast.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="w-5 h-5" />
                      5-Day Forecast
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                      {forecast.map((day, index) => (
                        <div key={index} className="text-center p-3 bg-secondary/50 dark:bg-secondary/20 rounded-lg">
                          <p className="font-semibold">{new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}</p>
                          <Sun className="w-8 h-8 mx-auto my-2 text-yellow-500" />
                          <p className="text-lg font-bold">{day.temp_max}°C</p>
                          <p className="text-xs text-muted-foreground capitalize">{day.description}</p>
                          <p className="text-xs text-muted-foreground mt-1">💧 {day.humidity}%</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <Cloud className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground">Enter a city name to see weather information</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
