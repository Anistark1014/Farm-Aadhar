import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Thermometer, 
  Fan, 
  Droplets, 
  Power, 
  PowerOff,
  Zap,
  X,
  Activity
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { getStoredThresholds } from '@/components/settings/ThresholdSettings';

interface SensorData {
  id: string;
  timestamp: string;
  temperature?: number;
  humidity?: number;
  air_quality?: number;
  alcohol?: number;
  smoke?: number;
}

interface DeviceStatus {
  id: string;
  name: string;
  icon: React.ReactNode;
  isActive: boolean;
  trigger: boolean;
  reason: string;
  type: 'cooling' | 'ventilation' | 'humidification';
  current?: number;
  threshold?: number;
  unit?: string;
}

const FloatingAutomationStatus = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [devices, setDevices] = useState<DeviceStatus[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch sensor data and calculate device status
  useEffect(() => {
    const fetchDeviceStatus = async () => {
      try {
        const { data, error } = await supabase
          .from('sensor_readings')
          .select('*')
          .order('timestamp', { ascending: false })
          .limit(1);

        if (error) {
          console.error('Error fetching sensor data:', error);
          return;
        }

        if (data && data.length > 0) {
          const latestData: SensorData = {
            id: data[0].id,
            timestamp: data[0].timestamp,
            temperature: data[0].temperature || 0,
            humidity: data[0].humidity || 0,
            air_quality: data[0].air_quality_mq135 || 0,
            alcohol: data[0].alcohol_mq3 || 0,
            smoke: data[0].smoke_mq2 || 0,
          };

          const thresholds = getStoredThresholds();
          const deviceStatuses = calculateDeviceStatus(latestData, thresholds);
          setDevices(deviceStatuses);
        }
      } catch (error) {
        console.error('Error in fetchDeviceStatus:', error);
      } finally {
        setLoading(false);
      }
    };

    // Initial fetch
    fetchDeviceStatus();

    // Set up real-time subscription for instant updates
    const subscription = supabase
      .channel('floating_automation_status')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'sensor_readings' },
        () => {
          fetchDeviceStatus();
        }
      )
      .subscribe();

    // Add auto-refresh every 2 seconds for button reliability
    const autoRefreshInterval = setInterval(() => {
      fetchDeviceStatus();
    }, 2000);

    return () => {
      subscription.unsubscribe();
      clearInterval(autoRefreshInterval);
    };
  }, []);

  const calculateDeviceStatus = (sensorData: SensorData, thresholds: any): DeviceStatus[] => {
    const deviceStatuses: DeviceStatus[] = [
      {
        id: 'ac',
        name: 'Air Conditioner',
        icon: <Thermometer className="w-4 h-4" />,
        isActive: false,
        trigger: false,
        reason: '',
        type: 'cooling',
        current: sensorData.temperature,
        threshold: thresholds.temperature?.high || 25,
        unit: '°C'
      },
      {
        id: 'exhaust_fan',
        name: 'Exhaust Fan',
        icon: <Fan className="w-4 h-4" />,
        isActive: false,
        trigger: false,
        reason: '',
        type: 'ventilation',
        current: Math.max(sensorData.air_quality || 0, sensorData.smoke || 0),
        threshold: Math.min(thresholds.air_quality_mq135?.high || 2000, thresholds.smoke_mq2?.high || 1000),
        unit: 'ppm'
      },
      {
        id: 'humidifier',
        name: 'Humidifier',
        icon: <Droplets className="w-4 h-4" />,
        isActive: false,
        trigger: false,
        reason: '',
        type: 'humidification',
        current: sensorData.humidity,
        threshold: thresholds.humidity?.low || 40,
        unit: '%'
      }
    ];

    // Calculate triggers
    return deviceStatuses.map(device => {
      let shouldTrigger = false;
      let reason = '';

      switch (device.id) {
        case 'ac':
          if (sensorData.temperature && sensorData.temperature > device.threshold!) {
            shouldTrigger = true;
            reason = `Temperature ${sensorData.temperature}°C > ${device.threshold}°C`;
          }
          break;
        case 'exhaust_fan':
          const airQualityThreshold = thresholds.air_quality_mq135?.high || 2000;
          const smokeThreshold = thresholds.smoke_mq2?.high || 1000;
          
          if ((sensorData.smoke && sensorData.smoke > smokeThreshold) ||
              (sensorData.air_quality && sensorData.air_quality > airQualityThreshold)) {
            shouldTrigger = true;
            if (sensorData.smoke && sensorData.smoke > smokeThreshold) {
              reason = `Smoke detected: ${sensorData.smoke} ppm`;
            } else {
              reason = `Poor air quality: ${sensorData.air_quality} ppm`;
            }
          }
          break;
        case 'humidifier':
          if (sensorData.humidity && sensorData.humidity < device.threshold!) {
            shouldTrigger = true;
            reason = `Low humidity: ${sensorData.humidity}% < ${device.threshold}%`;
          }
          break;
      }

      return {
        ...device,
        trigger: shouldTrigger,
        reason,
        isActive: shouldTrigger // Auto mode assumption
      };
    });
  };

  const getDeviceColor = (device: DeviceStatus) => {
    if (device.isActive) {
      switch (device.type) {
        case 'cooling': return 'text-blue-500';
        case 'ventilation': return 'text-green-500';
        case 'humidification': return 'text-cyan-500';
        default: return 'text-gray-500';
      }
    }
    return 'text-gray-400';
  };

  const getDeviceAnimation = (device: DeviceStatus) => {
    if (device.isActive) {
      switch (device.type) {
        case 'cooling': return 'animate-pulse';
        case 'ventilation': return 'animate-spin';
        case 'humidification': return 'animate-bounce';
        default: return '';
      }
    }
    return '';
  };

  // Get dynamic icon based on active devices (no animations on button)
  const getButtonIcon = () => {
    const activeDevices = devices.filter(d => d.isActive);
    const activeCount = activeDevices.length;

    if (activeCount === 0) {
      return <Power className="w-6 h-6" />;
    }

    if (activeCount === 1) {
      const device = activeDevices[0];
      return React.cloneElement(device.icon as React.ReactElement, { className: "w-6 h-6" });
    }

    if (activeCount === 2) {
      return (
        <div className="flex items-center justify-center space-x-1">
          {React.cloneElement(activeDevices[0].icon as React.ReactElement, { className: "w-3 h-3" })}
          {React.cloneElement(activeDevices[1].icon as React.ReactElement, { className: "w-3 h-3" })}
        </div>
      );
    }

    // All 3 devices active
    return (
      <div className="grid grid-cols-2 gap-0.5 items-center justify-center">
        {React.cloneElement(devices[0].icon as React.ReactElement, { className: "w-2.5 h-2.5" })}
        {React.cloneElement(devices[1].icon as React.ReactElement, { className: "w-2.5 h-2.5" })}
        <div className="col-span-2 mx-auto">
          {React.cloneElement(devices[2].icon as React.ReactElement, { className: "w-2.5 h-2.5" })}
        </div>
      </div>
    );
  };

  const getButtonColor = () => {
    const activeDevices = devices.filter(d => d.isActive);
    const activeCount = activeDevices.length;

    if (activeCount === 0) {
      return 'bg-gray-500 hover:bg-gray-600';
    }

    if (activeCount === 1) {
      const device = activeDevices[0];
      return device.type === 'cooling' ? 'bg-blue-500 hover:bg-blue-600' :
             device.type === 'ventilation' ? 'bg-green-500 hover:bg-green-600' :
             'bg-cyan-500 hover:bg-cyan-600';
    }

    return 'bg-green-500 hover:bg-green-600';
  };

  return (
    <>
      {/* Floating Button - No animations, just icons */}
      <div className="fixed bottom-4 right-4 md:bottom-6 md:right-6 z-50">
        <Button
          onClick={() => setIsOpen(!isOpen)}
          size="lg"
          className={`rounded-full w-12 h-12 md:w-14 md:h-14 shadow-lg hover:shadow-xl transition-colors duration-300 ${getButtonColor()}`}
          title={`Automation Status: ${devices.filter(d => d.isActive).length} devices active`}
        >
          {getButtonIcon()}
        </Button>
      </div>

      {/* Popup Overlay */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-3 md:p-4">
          <Card className="w-full max-w-md mx-auto max-h-[90vh] overflow-y-auto">
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base md:text-lg font-semibold flex items-center gap-2">
                  <Zap className="w-4 h-4 md:w-5 md:h-5" />
                  Automation Status
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (
                <div className="space-y-3 md:space-y-4">
                  {devices.map((device) => (
                    <div 
                      key={device.id}
                      className={`p-3 rounded-lg border transition-all duration-300 ${
                        device.isActive 
                          ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' 
                          : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className={`${getDeviceColor(device)} ${getDeviceAnimation(device)} flex-shrink-0`}>
                            {device.icon}
                          </div>
                          <span className="font-medium text-sm truncate">{device.name}</span>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {device.isActive ? (
                            <Power className="w-4 h-4 text-green-500" />
                          ) : (
                            <PowerOff className="w-4 h-4 text-gray-400" />
                          )}
                          {device.trigger && (
                            <Activity className="w-3 h-3 text-yellow-500 animate-pulse" />
                          )}
                        </div>
                      </div>
                      
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span>Current:</span>
                          <span className={`font-mono ${device.trigger ? 'text-yellow-600 font-semibold' : ''}`}>
                            {device.current}{device.unit}
                          </span>
                        </div>
                        <div className="flex justify-between text-muted-foreground">
                          <span>Threshold:</span>
                          <span className="font-mono">{device.threshold}{device.unit}</span>
                        </div>
                        
                        {device.trigger && device.reason && (
                          <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded text-xs">
                            <span className="font-medium">⚡ Triggered:</span>
                            <br />
                            <span className="text-muted-foreground break-words">{device.reason}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                    <div className="flex justify-between text-sm">
                      <span>Active Devices:</span>
                      <Badge variant={devices.some(d => d.isActive) ? "default" : "secondary"}>
                        {devices.filter(d => d.isActive).length} / {devices.length}
                      </Badge>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
};

export default FloatingAutomationStatus;