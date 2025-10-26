import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Translations {
  [key: string]: {
    en: string;
    hi: string;
  };
}

const translations: Translations = {
  // Navigation
  dashboard: { en: 'Dashboard', hi: 'डैशबोर्ड' },
  news: { en: 'News & Tips', hi: 'समाचार और सुझाव' },
  tasks: { en: 'Tasks & Planning', hi: 'कार्य और योजना' },
  reports: { en: 'Reports', hi: 'रिपोर्ट' },
  settings: { en: 'Settings', hi: 'सेटिंग्स' },
  
  // Dashboard
  welcome: { en: 'Welcome', hi: 'स्वागत है' },
  temperature: { en: 'Temperature', hi: 'तापमान' },
  humidity: { en: 'Humidity', hi: 'आर्द्रता' },
  soilMoisture: { en: 'Soil Moisture', hi: 'मिट्टी की नमी' },
  airQuality: { en: 'Air Quality', hi: 'वायु गुणवत्ता' },
  
  // Status
  healthy: { en: 'Healthy', hi: 'स्वस्थ' },
  warning: { en: 'Warning', hi: 'चेतावनी' },
  critical: { en: 'Critical', hi: 'गंभीर' },
  
  // Common
  loading: { en: 'Loading...', hi: 'लोड हो रहा है...' },
  error: { en: 'Error', hi: 'त्रुटि' },
  success: { en: 'Success', hi: 'सफल' },
  save: { en: 'Save', hi: 'सेव करें' },
  cancel: { en: 'Cancel', hi: 'रद्द करें' },
  edit: { en: 'Edit', hi: 'संपादित करें' },
  delete: { en: 'Delete', hi: 'हटाएं' },
  search: { en: 'Search', hi: 'खोजें' },
  back: { en: 'Back', hi: 'वापस' },
  views: { en: 'views', hi: 'बार देखा गया' },
  likes: { en: 'likes', hi: 'पसंद' },
  
  // News page
  farmingNews: { en: 'Farming News & Tips', hi: 'खेती समाचार और सुझाव' },
  newsDescription: { en: 'Stay updated with the latest farming insights, best practices, and expert advice', hi: 'नवीनतम खेती जानकारी, सर्वोत्तम प्रथाओं और विशेषज्ञ सलाह के साथ अपडेट रहें' },
  searchPlaceholder: { en: 'Search articles, tags, topics...', hi: 'लेख, टैग, विषय खोजें...' },
  noArticles: { en: 'No articles found', hi: 'कोई लेख नहीं मिला' },
  featured: { en: 'Featured', hi: 'विशेष' },
  backToArticles: { en: 'Back to Articles', hi: 'लेखों पर वापस जाएं' },
  
  // Categories
  all: { en: 'All', hi: 'सभी' },
  cropCare: { en: 'Crop Care', hi: 'फसल देखभाल' },
  pestControl: { en: 'Pest Control', hi: 'कीट नियंत्रण' },
  weather: { en: 'Weather', hi: 'मौसम' },
  marketPrices: { en: 'Market', hi: 'बाजार' },
  technology: { en: 'Technology', hi: 'तकनीक' },
  bestPractices: { en: 'Best Practices', hi: 'सर्वोत्तम प्रथाएं' },
  seasonalTips: { en: 'Seasonal', hi: 'मौसमी' },
  general: { en: 'General', hi: 'सामान्य' },
  
  // Authentication
  login: { en: 'Login', hi: 'लॉगिन' },
  logout: { en: 'Logout', hi: 'लॉगआउट' },
  signup: { en: 'Sign Up', hi: 'साइन अप' },
  email: { en: 'Email', hi: 'ईमेल' },
  password: { en: 'Password', hi: 'पासवर्ड' },
  
  // Profile
  profile: { en: 'Profile', hi: 'प्रोफ़ाइल' },
  name: { en: 'Name', hi: 'नाम' },
  role: { en: 'Role', hi: 'भूमिका' },
  language: { en: 'Language', hi: 'भाषा' },
  theme: { en: 'Theme', hi: 'थीम' },
  light: { en: 'Light', hi: 'सफेद' },
  dark: { en: 'Dark', hi: 'काला' }
};

interface LanguageContextType {
  language: 'en' | 'hi';
  setLanguage: (lang: 'en' | 'hi') => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'en',
  setLanguage: () => {},
  t: (key: string) => key,
});

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<'en' | 'hi'>('en');
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      // Fetch user's preferred language from database
      const fetchLanguage = async () => {
        const { data } = await supabase
          .from('user_profiles')
          .select('preferred_language')
          .eq('user_id', user.id)
          .single();
        
        if (data?.preferred_language) {
          setLanguageState(data.preferred_language as 'en' | 'hi');
        }
      };
      
      fetchLanguage();
    }
  }, [user]);

  const setLanguage = async (lang: 'en' | 'hi') => {
    setLanguageState(lang);
    
    if (user) {
      // Update user's preferred language in database
      await supabase
        .from('user_profiles')
        .update({ preferred_language: lang })
        .eq('user_id', user.id);
    }
  };

  const t = (key: string): string => {
    const translation = translations[key];
    if (!translation) return key;
    return translation[language] || translation.en || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};