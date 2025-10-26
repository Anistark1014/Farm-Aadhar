import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

interface SensorReading {
  id: string;
  timestamp: string;
  temperature: number;
  humidity: number;
  air_quality_mq135: number;
  alcohol_mq3: number;
  smoke_mq2: number;
}

export function PastRecordsTable() {
  const [records, setRecords] = useState<SensorReading[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let subscription: any;
    let mounted = true;
    
    const fetchRecords = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('sensor_readings')
        .select('*')
        .order('timestamp', { ascending: false });
      
      if (error) {
        console.error('Error fetching records:', error);
      } else if (data && mounted) {
        const mapped = data.map((rec: any) => ({
          id: rec.id,
          timestamp: rec.timestamp,
          temperature: rec.temperature ?? 0,
          humidity: rec.humidity ?? 0,
          air_quality_mq135: rec.air_quality_mq135 ?? 0,
          alcohol_mq3: rec.alcohol_mq3 ?? 0,
          smoke_mq2: rec.smoke_mq2 ?? 0,
        }));
        setRecords(mapped);
      }
      if (mounted) setLoading(false);
    };
    
    const setupRealtime = async () => {
      await fetchRecords();
      
      if (!mounted) return;

      // Subscribe to real-time changes
      subscription = supabase
        .channel('sensor-updates-table', {
          config: {
            presence: {
              key: `table-${Date.now()}`
            }
          }
        })
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'sensor_readings' }, (payload) => {
          if (!mounted) return;
          console.log('Real-time update received in PastRecordsTable:', payload);
          const rec = payload.new;
          setRecords((prev) => [
            {
              id: rec.id,
              timestamp: rec.timestamp,
              temperature: rec.temperature ?? 0,
              humidity: rec.humidity ?? 0,
              air_quality_mq135: rec.air_quality_mq135 ?? 0,
              alcohol_mq3: rec.alcohol_mq3 ?? 0,
              smoke_mq2: rec.smoke_mq2 ?? 0,
            },
            ...prev
          ]);
        })
        .subscribe();
    };
    
    setupRealtime();

    return () => {
      mounted = false;
      console.log('Cleaning up PastRecordsTable subscription');
      if (subscription) supabase.removeChannel(subscription);
    };
  }, []);

  return (
    <Card className="mt-4 md:mt-8 border-0 shadow-md">
      <CardHeader className="px-3 md:px-6">
        <CardTitle className="text-base md:text-lg">Past Sensor Records</CardTitle>
      </CardHeader>
      <CardContent className="px-3 md:px-6">
        {loading ? (
          <div className="flex items-center justify-center py-6 md:py-8">
            <Loader2 className="animate-spin h-5 w-5 md:h-6 md:w-6 text-muted-foreground" />
            <span className="ml-2 text-xs md:text-sm">Loading records...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableCaption className="text-xs md:text-sm">All sensor readings from the database</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs md:text-sm">ID</TableHead>
                  <TableHead className="text-xs md:text-sm">Temp (°C)</TableHead>
                  <TableHead className="text-xs md:text-sm">Humidity (%)</TableHead>
                  <TableHead className="text-xs md:text-sm">Air Quality</TableHead>
                  <TableHead className="text-xs md:text-sm">Alcohol</TableHead>
                  <TableHead className="text-xs md:text-sm">Smoke</TableHead>
                  <TableHead className="text-xs md:text-sm">Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((rec) => (
                  <TableRow key={rec.id}>
                    <TableCell className="text-xs md:text-sm font-mono">{rec.id}</TableCell>
                    <TableCell className="text-xs md:text-sm">{rec.temperature?.toFixed(1)}</TableCell>
                    <TableCell className="text-xs md:text-sm">{rec.humidity?.toFixed(1)}</TableCell>
                    <TableCell className="text-xs md:text-sm">{rec.air_quality_mq135}</TableCell>
                    <TableCell className="text-xs md:text-sm">{rec.alcohol_mq3}</TableCell>
                    <TableCell className="text-xs md:text-sm">{rec.smoke_mq2}</TableCell>
                    <TableCell className="text-xs md:text-sm">{new Date(rec.timestamp).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
