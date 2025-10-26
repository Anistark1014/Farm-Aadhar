import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import AutomationControls from "@/components/dashboard/AutomationControls";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";
import { getStoredThresholds } from "@/components/settings/ThresholdSettings";
import { Zap, Settings } from "lucide-react";

interface SensorReading {
  id: string;
  timestamp: string;
  air_temperature?: number;
  air_humidity?: number;
  air_air_quality_mq135?: number;
  air_alcohol_mq3?: number;
  air_smoke_mq2?: number;
  // fallback for old fields
  temperature?: number;
  humidity?: number;
  air_quality_mq135?: number;
  alcohol_mq3?: number;
  smoke_mq2?: number;
}

const Automation = () => {
  const { language } = useLanguage();
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch sensor data for automation controls
  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data, error } = await supabase
          .from('sensor_readings')
          .select('*')
          .order('timestamp', { ascending: false })
          .limit(50);

        if (error) {
          console.error('Error fetching sensor data:', error);
          return;
        }

        if (data && data.length > 0) {
          // Transform data for AutomationControls
          const transformedData = data.map((reading: SensorReading) => ({
            id: reading.id,
            timestamp: reading.timestamp,
            temperature: reading.temperature || 0,
            humidity: reading.humidity || 0,
            air_quality: reading.air_quality_mq135 || 0,
            alcohol: reading.alcohol_mq3 || 0,
            smoke: reading.smoke_mq2 || 0,
          }));

          console.log('Automation page: New sensor data transformed', transformedData[transformedData.length - 1]);
          setChartData(transformedData);
        }
      } catch (error) {
        console.error('Error in fetchData:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Set up real-time subscription for instant updates
    const subscription = supabase
      .channel('sensor_readings_automation')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'sensor_readings' },
        (payload) => {
          console.log('Real-time update (automation):', payload);
          fetchData();
        }
      )
      .subscribe();

    // Add auto-refresh every 2 seconds to match floating button
    const autoRefreshInterval = setInterval(() => {
      fetchData();
    }, 2000);

    return () => {
      subscription.unsubscribe();
      clearInterval(autoRefreshInterval);
    };
  }, []);

  const translations = {
    en: {
      title: "Automation Control Center",
      description: "Monitor and control automated systems for optimal farm management",
      systemStatus: "System Status",
      controls: "Device Controls",
      overview: "Control your AC units, exhaust fans, and water pumps based on real-time sensor data and custom thresholds."
    },
    hi: {
      title: "स्वचालन नियंत्रण केंद्र",
      description: "इष्टतम खेत प्रबंधन के लिए स्वचालित प्रणालियों की निगरानी और नियंत्रण",
      systemStatus: "सिस्टम स्थिति",
      controls: "उपकरण नियंत्रण",
      overview: "वास्तविक समय सेंसर डेटा और कस्टम थ्रेशोल्ड के आधार पर अपने एसी यूनिट्स, एग्जॉस्ट फैन और वाटर पंप को नियंत्रित करें।"
    }
  };

  const t = translations[language as keyof typeof translations] || translations.en;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Zap className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t.title}</h1>
          <p className="text-muted-foreground">{t.description}</p>
        </div>
      </div>

      {/* Overview Card */}
      <Card className="border-0 shadow-md">
        <CardHeader className="px-3 md:px-6">
          <CardTitle className="flex items-center gap-2 text-base md:text-lg">
            <Settings className="h-4 w-4 md:h-5 md:w-5" />
            {t.controls}
          </CardTitle>
          <CardDescription className="text-xs md:text-sm">
            {t.overview}
          </CardDescription>
        </CardHeader>
        <CardContent className="px-3 md:px-6">
          {loading ? (
            <div className="flex items-center justify-center py-6 md:py-8">
              <div className="animate-spin rounded-full h-6 w-6 md:h-8 md:w-8 border-b-2 border-primary"></div>
              <span className="ml-2 text-xs md:text-sm">Loading automation controls...</span>
            </div>
          ) : (
            <AutomationControls 
              sensorData={chartData.slice(-10)}
              thresholds={getStoredThresholds()}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Automation;