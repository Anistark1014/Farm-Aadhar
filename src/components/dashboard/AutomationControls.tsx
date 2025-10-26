import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { getStoredThresholds } from '@/components/settings/ThresholdSettings';
import { 
  Thermometer, 
  Fan, 
  Droplets, 
  Power, 
  PowerOff,
  Zap,
  Settings,
  Activity
} from 'lucide-react';

interface SensorData {
  id: string;
  timestamp: string;
  temperature?: number;
  humidity?: number;
  air_quality?: number;
  air_quality_mq135?: number;
  alcohol?: number;
  smoke?: number;
}

interface ControlDevice {
  id: string;
  name: string;
  icon: React.ReactNode;
  isActive: boolean;
  trigger: boolean;
  reason: string;
  targetValue?: string;
  type: 'cooling' | 'ventilation' | 'humidification';
}

interface AutomationControlsProps {
  sensorData: SensorData[];
  thresholds: any;
  analysisData?: {
    recommendations?: string[];
    risks?: string[];
    alerts?: string[];
  };
}

const AutomationControls: React.FC<AutomationControlsProps> = ({ 
  sensorData: propSensorData = [], 
  thresholds: propThresholds = {},
  analysisData 
}) => {
  const [liveSensorData, setLiveSensorData] = useState<SensorData[]>([]);
  const [liveThresholds, setLiveThresholds] = useState<any>(propThresholds);
  const [devices, setDevices] = useState<ControlDevice[]>([]);
  const [simulationMode, setSimulationMode] = useState(false);

  // Get the most recent sensor reading
  const latestReading = liveSensorData.length > 0 ? liveSensorData[0] : null;

  // Live data fetching function
  const fetchLiveData = async () => {
    try {
      console.log('AutomationControls: Fetching data at', new Date().toISOString());
      const { data, error } = await supabase
        .from('sensor_readings')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(10);
      
      console.log('AutomationControls: Query completed at', new Date().toISOString(), 'Error:', error);

      if (error) {
        console.error('Error fetching live sensor data:', error);
        return;
      }

      if (data && data.length > 0) {
        console.log('AutomationControls: Raw data from DB', data[0], 'Time:', new Date().toLocaleTimeString());
        
        const transformedData = data.map((reading: any) => ({
          id: reading.id,
          timestamp: reading.timestamp,
          temperature: reading.temperature || 0,
          humidity: reading.humidity || 0,
          air_quality: reading.air_quality_mq135 || 0,
          alcohol: reading.alcohol_mq3 || 0,
          smoke: reading.smoke_mq2 || 0,
        }));

        console.log('AutomationControls: Transformed data', transformedData[0], 'Time:', new Date().toLocaleTimeString());
        setLiveSensorData(transformedData);
        setLiveThresholds(getStoredThresholds());
        console.log('AutomationControls: Live data refreshed', transformedData[0], 'Time:', new Date().toLocaleTimeString());
      }
    } catch (error) {
      console.error('Error in fetchLiveData:', error);
    }
  };

  // Set up live data refresh and WebSocket subscription
  useEffect(() => {
    console.log('AutomationControls: Setting up live data refresh');
    
    // Initial fetch
    fetchLiveData();
    
    // Set up periodic refresh every 3 seconds
    const refreshInterval = setInterval(fetchLiveData, 3000);
    
    // Set up WebSocket subscription
    const subscription = supabase
      .channel('sensor_readings_automation')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'sensor_readings' },
        (payload) => {
          console.log('AutomationControls: Real-time update received', payload);
          fetchLiveData(); // Refresh data when changes occur
        }
      )
      .subscribe();

    return () => {
      clearInterval(refreshInterval);
      subscription.unsubscribe();
    };
  }, []);

  // Calculate device states based on current sensor data and thresholds
  useEffect(() => {
    if (!latestReading) return;

    const currentThresholds = liveThresholds;
    const newDevices: ControlDevice[] = [];

    // Air Conditioner - activated when temperature is high
    const acTrigger = latestReading.temperature > (currentThresholds.temperature?.max || 30);
    newDevices.push({
      id: 'ac',
      name: 'Air Conditioner',
      icon: <Thermometer className="h-5 w-5" />,
      isActive: acTrigger,
      trigger: acTrigger,
      reason: acTrigger 
        ? `Temperature ${latestReading.temperature}°C exceeds ${currentThresholds.temperature?.max || 30}°C`
        : `Temperature ${latestReading.temperature}°C is within range`,
      targetValue: `Target: ${currentThresholds.temperature?.max || 30}°C`,
      type: 'cooling'
    });

    // Exhaust Fan - activated when air quality is poor OR humidity is high
    const fanTrigger = 
      latestReading.air_quality > (currentThresholds.air_quality?.max || 400) ||
      latestReading.humidity > (currentThresholds.humidity?.max || 70);
    
    let fanReason = '';
    if (latestReading.air_quality > (currentThresholds.air_quality?.max || 400)) {
      fanReason = `Air quality ${latestReading.air_quality} ppm exceeds ${currentThresholds.air_quality?.max || 400} ppm`;
    } else if (latestReading.humidity > (currentThresholds.humidity?.max || 70)) {
      fanReason = `Humidity ${latestReading.humidity}% exceeds ${currentThresholds.humidity?.max || 70}%`;
    } else {
      fanReason = `Air quality and humidity within acceptable ranges`;
    }

    newDevices.push({
      id: 'exhaust_fan',
      name: 'Exhaust Fan',
      icon: <Fan className="h-5 w-5" />,
      isActive: fanTrigger,
      trigger: fanTrigger,
      reason: fanReason,
      targetValue: `AQ: <${currentThresholds.air_quality?.max || 400}ppm, RH: <${currentThresholds.humidity?.max || 70}%`,
      type: 'ventilation'
    });

    // Humidifier - activated when humidity is too low
    const humidifierTrigger = latestReading.humidity < (currentThresholds.humidity?.min || 40);
    newDevices.push({
      id: 'humidifier',
      name: 'Humidifier',
      icon: <Droplets className="h-5 w-5" />,
      isActive: humidifierTrigger,
      trigger: humidifierTrigger,
      reason: humidifierTrigger 
        ? `Humidity ${latestReading.humidity}% below ${currentThresholds.humidity?.min || 40}%`
        : `Humidity ${latestReading.humidity}% is adequate`,
      targetValue: `Target: >${currentThresholds.humidity?.min || 40}%`,
      type: 'humidification'
    });

    setDevices(newDevices);
  }, [latestReading, liveThresholds]);

  const getDeviceStatusColor = (device: ControlDevice) => {
    if (device.isActive) {
      return device.type === 'cooling' ? 'bg-blue-500' : 
             device.type === 'ventilation' ? 'bg-green-500' : 
             'bg-cyan-500';
    }
    return 'bg-gray-400';
  };

  const getDeviceStatusText = (device: ControlDevice) => {
    return device.isActive ? 'ACTIVE' : 'STANDBY';
  };

  const toggleSimulation = () => {
    setSimulationMode(!simulationMode);
  };

  const overrideDevice = (deviceId: string) => {
    setDevices(prev => prev.map(device => 
      device.id === deviceId 
        ? { ...device, isActive: !device.isActive }
        : device
    ));
  };

  const getTotalActivePower = () => {
    const powerRatings = { ac: 2500, exhaust_fan: 150, humidifier: 300 };
    return devices.reduce((total, device) => {
      if (device.isActive) {
        return total + (powerRatings[device.id as keyof typeof powerRatings] || 0);
      }
      return total;
    }, 0);
  };

  const getEnvironmentalStatus = () => {
    if (!latestReading) return { status: 'No Data', color: 'text-gray-500 dark:text-gray-400' };
    
    const activeDevices = devices.filter(d => d.isActive).length;
    if (activeDevices === 0) {
      return { status: 'Optimal', color: 'text-green-600 dark:text-green-400' };
    } else if (activeDevices === 1) {
      return { status: 'Adjusting', color: 'text-yellow-600 dark:text-yellow-400' };
    } else {
      return { status: 'Critical', color: 'text-red-600 dark:text-red-400' };
    }
  };

  const envStatus = getEnvironmentalStatus();

  return (
    <div className="space-y-4 md:space-y-6 p-2 md:p-0">
      {/* System Status Overview */}
      <Card className="border-0 shadow-lg bg-card">
        <CardHeader className="pb-3 px-3 md:px-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
              <Activity className="h-5 w-5 md:h-6 md:w-6 text-blue-500" />
              <span className="truncate">Automation Control System</span>
            </CardTitle>
            <div className="flex items-center gap-2 md:gap-3 w-full sm:w-auto">
              <Badge variant="outline" className={`px-2 md:px-3 py-1 ${envStatus.color} font-semibold text-xs md:text-sm`}>
                {envStatus.status}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={toggleSimulation}
                className={`text-xs md:text-sm ${simulationMode ? "bg-orange-100 dark:bg-orange-900 border-orange-300 dark:border-orange-600" : ""}`}
              >
                <Settings className="h-3 w-3 md:h-4 md:w-4 mr-1" />
                <span className="hidden sm:inline">{simulationMode ? 'Manual Mode' : 'Auto Mode'}</span>
                <span className="sm:hidden">{simulationMode ? 'Manual' : 'Auto'}</span>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-3 md:px-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4">
            <div className="text-center p-2 md:p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border-0">
              <div className="text-xs md:text-sm text-gray-600 dark:text-gray-300">Active Devices</div>
              <div className="text-lg md:text-2xl font-bold text-blue-600 dark:text-blue-400">
                {devices.filter(d => d.isActive).length}
              </div>
            </div>
            <div className="text-center p-2 md:p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border-0">
              <div className="text-xs md:text-sm text-gray-600 dark:text-gray-300">Power Draw</div>
              <div className="text-lg md:text-2xl font-bold text-green-600 dark:text-green-400">
                {getTotalActivePower()}W
              </div>
            </div>
            <div className="text-center p-2 md:p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border-0">
              <div className="text-xs md:text-sm text-gray-600 dark:text-gray-300">Temperature</div>
              <div className="text-lg md:text-2xl font-bold text-orange-600 dark:text-orange-400">
                {latestReading?.temperature || '--'}°C
              </div>
            </div>
            <div className="text-center p-2 md:p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border-0">
              <div className="text-xs md:text-sm text-gray-600 dark:text-gray-300">Humidity</div>
              <div className="text-lg md:text-2xl font-bold text-blue-600 dark:text-blue-400">
                {latestReading?.humidity || '--'}%
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Device Control Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
        {devices.map((device) => (
          <Card key={device.id} className={`border-0 transition-all duration-300 shadow-md ${
            device.isActive 
              ? 'shadow-lg ring-2 ring-blue-500/20 bg-blue-50/30 dark:bg-blue-950/30' 
              : 'shadow-sm bg-card'
          }`}>
            <CardHeader className="pb-2 md:pb-3 px-3 md:px-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div className={`p-1.5 md:p-2 rounded-full ${getDeviceStatusColor(device)} text-white flex-shrink-0`}>
                    <div className="w-4 h-4 md:w-5 md:h-5">
                      {device.icon}
                    </div>
                  </div>
                  <CardTitle className="text-sm md:text-lg truncate">{device.name}</CardTitle>
                </div>
                <Badge 
                  variant={device.isActive ? "default" : "secondary"}
                  className={`px-2 py-1 text-xs font-bold flex-shrink-0 ${
                    device.isActive ? 'bg-green-500 text-white' : 'bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200'
                  }`}
                >
                  {getDeviceStatusText(device)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="px-3 md:px-6">
              <div className="space-y-2 md:space-y-3">
                <div className="text-xs md:text-sm text-gray-600 dark:text-gray-300">
                  <div className="font-semibold mb-1">Status:</div>
                  <div className={`text-xs md:text-sm ${device.isActive ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
                    {device.reason}
                  </div>
                </div>
                
                {device.targetValue && (
                  <div className="text-xs md:text-sm text-gray-600 dark:text-gray-300">
                    <div className="font-semibold mb-1">Target:</div>
                    <div className="text-blue-600 dark:text-blue-400 text-xs md:text-sm">{device.targetValue}</div>
                  </div>
                )}

                {simulationMode && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => overrideDevice(device.id)}
                    className="w-full mt-2 md:mt-3 text-xs md:text-sm"
                  >
                    {device.isActive ? <PowerOff className="h-3 w-3 md:h-4 md:w-4 mr-1" /> : <Power className="h-3 w-3 md:h-4 md:w-4 mr-1" />}
                    {device.isActive ? 'Turn Off' : 'Turn On'}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Current Readings Display */}
      {latestReading && (
        <Card className="border-0 shadow-md bg-card">
          <CardHeader className="px-3 md:px-6">
            <CardTitle className="text-base md:text-lg">Current Sensor Readings</CardTitle>
            <div className="text-xs md:text-sm text-gray-500 dark:text-gray-400">
              Last updated: {new Date(latestReading.timestamp).toLocaleString()}
            </div>
          </CardHeader>
          <CardContent className="px-3 md:px-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 md:gap-4">
              <div className="text-center p-2 md:p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border-0">
                <div className="text-xs md:text-sm text-gray-600 dark:text-gray-300 mb-1">Temperature</div>
                <div className="text-base md:text-xl font-bold text-orange-600 dark:text-orange-400">
                  {latestReading.temperature}°C
                </div>
              </div>
              <div className="text-center p-2 md:p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border-0">
                <div className="text-xs md:text-sm text-gray-600 dark:text-gray-300 mb-1">Humidity</div>
                <div className="text-base md:text-xl font-bold text-blue-600 dark:text-blue-400">
                  {latestReading.humidity}%
                </div>
              </div>
              <div className="text-center p-2 md:p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border-0">
                <div className="text-xs md:text-sm text-gray-600 dark:text-gray-300 mb-1">Air Quality</div>
                <div className="text-base md:text-xl font-bold text-green-600 dark:text-green-400">
                  {latestReading.air_quality} ppm
                </div>
              </div>
              <div className="text-center p-2 md:p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border-0">
                <div className="text-xs md:text-sm text-gray-600 dark:text-gray-300 mb-1">Alcohol</div>
                <div className="text-base md:text-xl font-bold text-purple-600 dark:text-purple-400">
                  {latestReading.alcohol} ppm
                </div>
              </div>
              <div className="text-center p-2 md:p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border-0 col-span-2 sm:col-span-1">
                <div className="text-xs md:text-sm text-gray-600 dark:text-gray-300 mb-1">Smoke</div>
                <div className="text-base md:text-xl font-bold text-red-600 dark:text-red-400">
                  {latestReading.smoke} ppm
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Analysis Integration */}
      {analysisData && (analysisData.recommendations?.length || analysisData.risks?.length || analysisData.alerts?.length) && (
        <Card className="border-0 shadow-md bg-yellow-50 dark:bg-yellow-900/20">
          <CardHeader className="px-3 md:px-6">
            <CardTitle className="text-base md:text-lg flex items-center gap-2">
              <Zap className="h-4 w-4 md:h-5 md:w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
              <span className="truncate">AI Analysis & Recommendations</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 md:px-6">
            <div className="space-y-3 md:space-y-4">
              {analysisData.alerts && analysisData.alerts.length > 0 && (
                <div>
                  <div className="font-semibold text-red-600 dark:text-red-400 mb-2 text-sm md:text-base">🚨 Alerts:</div>
                  <ul className="list-disc list-inside space-y-1 text-xs md:text-sm">
                    {analysisData.alerts.map((alert, idx) => (
                      <li key={idx} className="text-red-700 dark:text-red-300">{alert}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {analysisData.recommendations && analysisData.recommendations.length > 0 && (
                <div>
                  <div className="font-semibold text-blue-600 dark:text-blue-400 mb-2 text-sm md:text-base">💡 Recommendations:</div>
                  <ul className="list-disc list-inside space-y-1 text-xs md:text-sm">
                    {analysisData.recommendations.map((rec, idx) => (
                      <li key={idx} className="text-blue-700 dark:text-blue-300">{rec}</li>
                    ))}
                  </ul>
                </div>
              )}

              {analysisData.risks && analysisData.risks.length > 0 && (
                <div>
                  <div className="font-semibold text-orange-600 dark:text-orange-400 mb-2 text-sm md:text-base">⚠️ Risk Assessment:</div>
                  <ul className="list-disc list-inside space-y-1 text-xs md:text-sm">
                    {analysisData.risks.map((risk, idx) => (
                      <li key={idx} className="text-orange-700 dark:text-orange-300">{risk}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AutomationControls;