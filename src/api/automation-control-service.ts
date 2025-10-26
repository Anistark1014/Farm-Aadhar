/**
 * Farm Aadhar - Automation Control Service
 * 
 * This service evaluates control rules against real-time sensor data
 * and triggers automated actions when thresholds are breached.
 */

import { supabase } from '@/integrations/supabase/client';

export interface ControlRule {
  id: string;
  rule_name: string;
  description: string | null;
  node_id: string | null;
  sensor_type: string;
  condition_type: 'above' | 'below' | 'between' | 'outside_range' | 'equals';
  threshold_value_1: number;
  threshold_value_2: number | null;
  action_type: 'notification' | 'control_device' | 'log_only' | 'alert' | 'email';
  action_target: string | null;
  action_command: string | null;
  notification_message: string | null;
  is_enabled: boolean;
  priority: number;
  cooldown_minutes: number;
  last_triggered_at: string | null;
}

export interface ControlAction {
  rule_id: string;
  node_id: string;
  sensor_reading_id: string;
  action_type: string;
  action_target: string | null;
  action_command: string | null;
  trigger_value: number;
  threshold_value: number;
  status: 'pending' | 'executing' | 'success' | 'failed';
  notification_sent: boolean;
}

export interface SensorReading {
  id: string;
  node_id: string;
  temperature: number | null;
  humidity: number | null;
  air_quality_mq135: number | null;
  alcohol_mq3: number | null;
  smoke_mq2: number | null;
  soil_moisture: number | null;
  timestamp: string;
}

/**
 * Fetches all enabled control rules from the database
 */
export async function getEnabledControlRules(): Promise<ControlRule[]> {
  const { data, error } = await supabase
    .from('control_rules')
    .select('*')
    .eq('is_enabled', true)
    .order('priority', { ascending: false });

  if (error) {
    console.error('Error fetching control rules:', error);
    throw error;
  }

  return data || [];
}

/**
 * Evaluates a control rule against a sensor value
 */
export function evaluateCondition(
  rule: ControlRule,
  sensorValue: number
): boolean {
  switch (rule.condition_type) {
    case 'above':
      return sensorValue > rule.threshold_value_1;
    
    case 'below':
      return sensorValue < rule.threshold_value_1;
    
    case 'between':
      return rule.threshold_value_2 !== null &&
        sensorValue >= rule.threshold_value_1 &&
        sensorValue <= rule.threshold_value_2;
    
    case 'outside_range':
      return rule.threshold_value_2 !== null &&
        (sensorValue < rule.threshold_value_1 || sensorValue > rule.threshold_value_2);
    
    case 'equals':
      return Math.abs(sensorValue - rule.threshold_value_1) < 0.01;
    
    default:
      return false;
  }
}

/**
 * Checks if a rule is in cooldown period
 */
export function isRuleInCooldown(rule: ControlRule): boolean {
  if (!rule.last_triggered_at) return false;

  const lastTriggered = new Date(rule.last_triggered_at);
  const cooldownEnd = new Date(lastTriggered.getTime() + rule.cooldown_minutes * 60000);
  
  return new Date() < cooldownEnd;
}

/**
 * Gets the sensor value for a specific sensor type from a reading
 */
export function getSensorValue(
  reading: SensorReading,
  sensorType: string
): number | null {
  switch (sensorType) {
    case 'temperature':
      return reading.temperature;
    case 'humidity':
      return reading.humidity;
    case 'air_quality':
      return reading.air_quality_mq135;
    case 'alcohol':
      return reading.alcohol_mq3;
    case 'smoke':
      return reading.smoke_mq2;
    case 'soil_moisture':
      return reading.soil_moisture;
    default:
      return null;
  }
}

/**
 * Evaluates all control rules against a new sensor reading
 */
export async function evaluateSensorReading(
  reading: SensorReading
): Promise<void> {
  try {
    const rules = await getEnabledControlRules();
    
    for (const rule of rules) {
      // Skip if rule is for different node
      if (rule.node_id && rule.node_id !== reading.node_id) continue;
      
      // Skip if rule is in cooldown
      if (isRuleInCooldown(rule)) continue;
      
      // Get sensor value
      const sensorValue = getSensorValue(reading, rule.sensor_type);
      if (sensorValue === null) continue;
      
      // Evaluate condition
      const shouldTrigger = evaluateCondition(rule, sensorValue);
      
      if (shouldTrigger) {
        await triggerControlAction(rule, reading, sensorValue);
      }
    }
  } catch (error) {
    console.error('Error evaluating sensor reading:', error);
  }
}

/**
 * Triggers a control action when a rule condition is met
 */
export async function triggerControlAction(
  rule: ControlRule,
  reading: SensorReading,
  triggerValue: number
): Promise<void> {
  try {
    console.log(`🚨 Control rule triggered: ${rule.rule_name}`);
    console.log(`   Sensor: ${rule.sensor_type} = ${triggerValue}`);
    console.log(`   Action: ${rule.action_type} - ${rule.action_target || 'N/A'}`);
    
    // Log the action to database
    const { data: logEntry, error: logError } = await supabase
      .from('control_actions_log')
      .insert({
        rule_id: rule.id,
        node_id: reading.node_id,
        sensor_reading_id: reading.id,
        action_type: rule.action_type,
        action_target: rule.action_target,
        action_command: rule.action_command,
        trigger_value: triggerValue,
        threshold_value: rule.threshold_value_1,
        status: 'pending'
      })
      .select()
      .single();

    if (logError) {
      console.error('Error logging control action:', logError);
      return;
    }

    // Update rule's last_triggered_at
    await supabase
      .from('control_rules')
      .update({ last_triggered_at: new Date().toISOString() })
      .eq('id', rule.id);

    // Execute the action based on type
    switch (rule.action_type) {
      case 'notification':
        await sendNotification(rule, triggerValue, logEntry.id);
        break;
      
      case 'alert':
        await sendAlert(rule, triggerValue, logEntry.id);
        break;
      
      case 'control_device':
        await controlDevice(rule, logEntry.id);
        break;
      
      case 'log_only':
        // Already logged, nothing more to do
        await updateActionStatus(logEntry.id, 'success');
        break;
      
      default:
        console.warn(`Unknown action type: ${rule.action_type}`);
    }
  } catch (error) {
    console.error('Error triggering control action:', error);
  }
}

/**
 * Sends a notification to the user
 */
async function sendNotification(
  rule: ControlRule,
  triggerValue: number,
  actionLogId: string
): Promise<void> {
  try {
    const message = rule.notification_message || 
      `${rule.rule_name}: ${rule.sensor_type} is ${triggerValue}`;

    // Create an alert in the alerts table
    const { error } = await supabase
      .from('alerts')
      .insert({
        message,
        severity: 'warning',
        is_read: false
      });

    if (error) throw error;

    // Try browser notification if available
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Farm Aadhar Alert', {
        body: message,
        icon: '/placeholder.svg',
        badge: '/placeholder.svg',
        tag: rule.id
      });
    }

    await updateActionStatus(actionLogId, 'success', true);
    console.log('✅ Notification sent successfully');
  } catch (error) {
    console.error('Error sending notification:', error);
    await updateActionStatus(actionLogId, 'failed');
  }
}

/**
 * Sends a critical alert to the user
 */
async function sendAlert(
  rule: ControlRule,
  triggerValue: number,
  actionLogId: string
): Promise<void> {
  try {
    const message = rule.notification_message || 
      `CRITICAL: ${rule.rule_name}! ${rule.sensor_type} is ${triggerValue}`;

    // Create a critical alert
    const { error } = await supabase
      .from('alerts')
      .insert({
        message,
        severity: 'error',
        is_read: false
      });

    if (error) throw error;

    // Try browser notification with urgent settings
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('🚨 FARM AADHAR CRITICAL ALERT', {
        body: message,
        icon: '/placeholder.svg',
        badge: '/placeholder.svg',
        tag: rule.id,
        requireInteraction: true,
        vibrate: [200, 100, 200, 100, 200]
      });
    }

    await updateActionStatus(actionLogId, 'success', true);
    console.log('🚨 Critical alert sent successfully');
  } catch (error) {
    console.error('Error sending alert:', error);
    await updateActionStatus(actionLogId, 'failed');
  }
}

/**
 * Controls a device (simulated - in production would connect to actual hardware)
 */
async function controlDevice(
  rule: ControlRule,
  actionLogId: string
): Promise<void> {
  try {
    console.log(`🎛️ Controlling device: ${rule.action_target}`);
    console.log(`   Command: ${rule.action_command}`);
    
    // In production, this would send commands to actual hardware
    // For now, we just simulate and log
    
    // Create a notification that the device is being controlled
    const message = `Automated control: ${rule.action_command} ${rule.action_target}`;
    await supabase
      .from('alerts')
      .insert({
        message,
        severity: 'info',
        is_read: false
      });

    await updateActionStatus(actionLogId, 'success', true);
    console.log(`✅ Device control command sent: ${rule.action_command} ${rule.action_target}`);
  } catch (error) {
    console.error('Error controlling device:', error);
    await updateActionStatus(actionLogId, 'failed');
  }
}

/**
 * Updates the status of a control action log entry
 */
async function updateActionStatus(
  actionLogId: string,
  status: 'success' | 'failed' | 'executing',
  notificationSent: boolean = false
): Promise<void> {
  await supabase
    .from('control_actions_log')
    .update({
      status,
      completion_time: new Date().toISOString(),
      notification_sent: notificationSent
    })
    .eq('id', actionLogId);
}

/**
 * Subscribes to real-time sensor readings and evaluates control rules
 */
export function subscribeToSensorReadings(
  callback?: (payload: any) => void
): () => void {
  const subscription = supabase
    .channel('sensor-readings-automation')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'sensor_readings'
      },
      async (payload) => {
        console.log('📊 New sensor reading received, evaluating control rules...');
        
        const reading = payload.new as SensorReading;
        await evaluateSensorReading(reading);
        
        if (callback) {
          callback(payload);
        }
      }
    )
    .subscribe();

  // Return unsubscribe function
  return () => {
    subscription.unsubscribe();
  };
}

/**
 * Requests notification permission from the user
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    console.warn('This browser does not support notifications');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
}
