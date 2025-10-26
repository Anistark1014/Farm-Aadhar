/**
 * Weather API Service
 * Fetches real-time weather data for farming decisions
 */

// OpenWeatherMap configuration
const WEATHER_API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY || '';
const WEATHER_API_BASE = 'https://api.openweathermap.org/data/2.5';

export interface WeatherData {
  location: string;
  temperature: number;
  feels_like: number;
  humidity: number;
  pressure: number;
  wind_speed: number;
  wind_direction: number;
  clouds: number;
  visibility: number;
  description: string;
  icon: string;
  sunrise: number;
  sunset: number;
  rainfall?: number;
  timestamp: string;
}

export interface WeatherForecast {
  date: string;
  temp_min: number;
  temp_max: number;
  humidity: number;
  rainfall: number;
  description: string;
  icon: string;
}

export interface FarmingAdvice {
  category: 'irrigation' | 'planting' | 'harvesting' | 'pest_control' | 'general';
  advice: string;
  advice_hi: string;
  priority: 'high' | 'medium' | 'low';
  icon: string;
}

/**
 * Get current weather by coordinates
 */
export async function getCurrentWeather(lat: number, lon: number): Promise<WeatherData> {
  if (!WEATHER_API_KEY) {
    throw new Error('Weather API key not configured');
  }

  const url = `${WEATHER_API_BASE}/weather?lat=${lat}&lon=${lon}&units=metric&appid=${WEATHER_API_KEY}`;
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch weather data');
  }

  const data = await response.json();

  return {
    location: data.name,
    temperature: Math.round(data.main.temp),
    feels_like: Math.round(data.main.feels_like),
    humidity: data.main.humidity,
    pressure: data.main.pressure,
    wind_speed: data.wind.speed,
    wind_direction: data.wind.deg,
    clouds: data.clouds.all,
    visibility: data.visibility / 1000, // Convert to km
    description: data.weather[0].description,
    icon: data.weather[0].icon,
    sunrise: data.sys.sunrise,
    sunset: data.sys.sunset,
    rainfall: data.rain?.['1h'] || 0,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Get 5-day weather forecast
 */
export async function getWeatherForecast(lat: number, lon: number): Promise<WeatherForecast[]> {
  if (!WEATHER_API_KEY) {
    throw new Error('Weather API key not configured');
  }

  const url = `${WEATHER_API_BASE}/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${WEATHER_API_KEY}`;
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch weather forecast');
  }

  const data = await response.json();

  // Group by date and get daily min/max
  const dailyForecasts: Record<string, any> = {};

  data.list.forEach((item: any) => {
    const date = item.dt_txt.split(' ')[0];
    
    if (!dailyForecasts[date]) {
      dailyForecasts[date] = {
        date,
        temp_min: item.main.temp_min,
        temp_max: item.main.temp_max,
        humidity: item.main.humidity,
        rainfall: item.rain?.['3h'] || 0,
        description: item.weather[0].description,
        icon: item.weather[0].icon,
      };
    } else {
      dailyForecasts[date].temp_min = Math.min(dailyForecasts[date].temp_min, item.main.temp_min);
      dailyForecasts[date].temp_max = Math.max(dailyForecasts[date].temp_max, item.main.temp_max);
      dailyForecasts[date].rainfall += item.rain?.['3h'] || 0;
    }
  });

  return Object.values(dailyForecasts).slice(0, 5).map((forecast: any) => ({
    ...forecast,
    temp_min: Math.round(forecast.temp_min),
    temp_max: Math.round(forecast.temp_max),
    rainfall: Math.round(forecast.rainfall * 10) / 10,
  }));
}

/**
 * Generate farming advice based on weather
 */
export function generateFarmingAdvice(weather: WeatherData, forecast?: WeatherForecast[]): FarmingAdvice[] {
  const advice: FarmingAdvice[] = [];

  // Temperature-based advice
  if (weather.temperature > 35) {
    advice.push({
      category: 'irrigation',
      advice: 'High temperature alert! Increase irrigation frequency. Water plants early morning or evening. Use mulch to retain soil moisture.',
      advice_hi: 'उच्च तापमान अलर्ट! सिंचाई की आवृत्ति बढ़ाएं। सुबह जल्दी या शाम को पौधों को पानी दें। मिट्टी की नमी बनाए रखने के लिए मल्च का उपयोग करें।',
      priority: 'high',
      icon: '🌡️',
    });
  }

  if (weather.temperature < 10) {
    advice.push({
      category: 'general',
      advice: 'Frost warning! Cover sensitive plants. Harvest cold-sensitive crops. Consider using frost blankets or tunnels.',
      advice_hi: 'ठंढ चेतावनी! संवेदनशील पौधों को ढकें। ठंड के प्रति संवेदनशील फसलों की कटाई करें। ठंढ कंबल या सुरंगों का उपयोग करने पर विचार करें।',
      priority: 'high',
      icon: '❄️',
    });
  }

  // Humidity-based advice
  if (weather.humidity > 80) {
    advice.push({
      category: 'pest_control',
      advice: 'High humidity may cause fungal diseases. Improve air circulation. Avoid overhead watering. Check for mold, mildew, and leaf spot.',
      advice_hi: 'उच्च आर्द्रता से फंगल रोग हो सकते हैं। वायु परिसंचरण में सुधार करें। ओवरहेड पानी देने से बचें। फफूंदी, फफूंदी और पत्ती के धब्बे की जांच करें।',
      priority: 'medium',
      icon: '💧',
    });
  }

  // Rainfall advice
  if (weather.rainfall && weather.rainfall > 10) {
    advice.push({
      category: 'irrigation',
      advice: 'Heavy rainfall detected. Skip irrigation today. Ensure good drainage to prevent waterlogging. Check for soil erosion.',
      advice_hi: 'भारी बारिश का पता चला। आज सिंचाई छोड़ें। जलभराव को रोकने के लिए अच्छी जल निकासी सुनिश्चित करें। मिट्टी के कटाव की जांच करें।',
      priority: 'high',
      icon: '🌧️',
    });
  }

  // Check forecast for rain
  if (forecast) {
    const upcomingRain = forecast.find(f => f.rainfall > 5);
    if (upcomingRain) {
      advice.push({
        category: 'planting',
        advice: `Rain expected on ${upcomingRain.date}. Good time for planting seeds. Prepare fields now. Rain will help with germination.`,
        advice_hi: `${upcomingRain.date} को बारिश की उम्मीद है। बीज बोने का अच्छा समय। अब खेत तैयार करें। बारिश अंकुरण में मदद करेगी।`,
        priority: 'medium',
        icon: '🌱',
      });
    }
  }

  // Wind-based advice
  if (weather.wind_speed > 15) {
    advice.push({
      category: 'general',
      advice: 'Strong winds detected. Secure greenhouse structures. Stake tall plants. Delay pesticide/fertilizer application.',
      advice_hi: 'तेज हवाओं का पता चला। ग्रीनहाउस संरचनाओं को सुरक्षित करें। लंबे पौधों को सहारा दें। कीटनाशक/उर्वरक अनुप्रयोग में देरी करें।',
      priority: 'medium',
      icon: '💨',
    });
  }

  // Perfect weather advice
  if (
    weather.temperature >= 20 && weather.temperature <= 30 &&
    weather.humidity >= 40 && weather.humidity <= 70 &&
    !weather.rainfall
  ) {
    advice.push({
      category: 'general',
      advice: 'Perfect farming weather! Good conditions for most agricultural activities. Great day for planting, transplanting, and harvesting.',
      advice_hi: 'आदर्श खेती का मौसम! अधिकांश कृषि गतिविधियों के लिए अच्छी स्थिति। रोपण, प्रत्यारोपण और कटाई के लिए शानदार दिन।',
      priority: 'low',
      icon: '☀️',
    });
  }

  // Default advice if no specific conditions
  if (advice.length === 0) {
    advice.push({
      category: 'general',
      advice: 'Monitor your crops regularly. Check soil moisture, look for pests, and ensure proper plant health. Use Farm Aadhar sensors for real-time monitoring.',
      advice_hi: 'अपनी फसलों की नियमित निगरानी करें। मिट्टी की नमी की जांच करें, कीटों की तलाश करें, और उचित पौधे के स्वास्थ्य को सुनिश्चित करें। रियल-टाइम निगरानी के लिए Farm Aadhar सेंसर का उपयोग करें।',
      priority: 'low',
      icon: '📊',
    });
  }

  return advice;
}

/**
 * Get weather by city name
 */
export async function getWeatherByCity(city: string): Promise<WeatherData> {
  if (!WEATHER_API_KEY) {
    throw new Error('Weather API key not configured');
  }

  const url = `${WEATHER_API_BASE}/weather?q=${city}&units=metric&appid=${WEATHER_API_KEY}`;
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('City not found or weather data unavailable');
  }

  const data = await response.json();

  return {
    location: data.name,
    temperature: Math.round(data.main.temp),
    feels_like: Math.round(data.main.feels_like),
    humidity: data.main.humidity,
    pressure: data.main.pressure,
    wind_speed: data.wind.speed,
    wind_direction: data.wind.deg,
    clouds: data.clouds.all,
    visibility: data.visibility / 1000,
    description: data.weather[0].description,
    icon: data.weather[0].icon,
    sunrise: data.sys.sunrise,
    sunset: data.sys.sunset,
    rainfall: data.rain?.['1h'] || 0,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Get user location
 */
export function getUserLocation(): Promise<{ lat: number; lon: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      console.warn('Geolocation not supported, will use fallback location');
      reject(new Error('Geolocation not supported'));
      return;
    }

    // Add timeout and better error handling
    navigator.geolocation.getCurrentPosition(
      (position) => {
        console.log('✅ Location obtained successfully');
        resolve({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        });
      },
      (error) => {
        console.warn('⚠️ Geolocation failed:', error.message, '- using fallback location');
        reject(error);
      },
      {
        timeout: 10000, // 10 second timeout
        enableHighAccuracy: false, // Use less accurate but faster location
        maximumAge: 300000 // Accept cached location up to 5 minutes old
      }
    );
  });
}
