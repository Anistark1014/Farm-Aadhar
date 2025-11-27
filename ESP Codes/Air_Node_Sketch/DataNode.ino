/*
 * Farm Aadhar - Air Quality Monitoring Node (Simplified)
 * 
 * This ESP32 node monitors:
 * - Air Temperature & Humidity (DHT11)
 * - Air Quality (MQ-135)
 * - Alcohol Detection (MQ-3)
 * - Smoke Detection (MQ-2)
 * 
 * Features:
 * - WiFi connectivity with fallback networks
 * - Sends raw sensor data to Supabase
 * - Optional LCD display (shows raw values only)
 * - LED status indicator
 * 
 * No logic or judgments - just pure sensor data collection!
 */

// ============================================================================
// INCLUDES & CONFIGURATION
// ============================================================================

// Enable/disable LCD display (comment out to disable)
#define USE_LCD

#ifdef USE_LCD
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#endif

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <DHT.h>
#include <DHT_U.h>

// ============================================================================
// NETWORK CONFIGURATION
// ============================================================================

const char* WIFI_NETWORKS[][2] = {
    {"Anushka", "123123123"},
    {"Anistark", "123123123"}
};
const int WIFI_NETWORK_COUNT = 2;

// ============================================================================
// SUPABASE DATABASE CONFIGURATION
// ============================================================================

const char* SUPABASE_URL = "https://ghkcfgcyzhtwufizxuyo.supabase.co";
const char* SUPABASE_ANON_KEY = "sb_publishable_mpZKtxbkxfc3xd86CGSfBA__w25PANh";
const char* SUPABASE_ENDPOINT = "/rest/v1/sensor_readings";

// ============================================================================
// HARDWARE CONFIGURATION
// ============================================================================

// Pin Definitions
#define LED_PIN 2              // Onboard LED
#define DHTPIN 4               // DHT11 Temperature/Humidity
#define MQ135_PIN 35           // Air Quality Sensor
#define MQ3_PIN 34             // Alcohol Sensor
#define MQ2_PIN 36             // Smoke Sensor

// DHT Sensor
#define DHTTYPE DHT11
DHT_Unified dht(DHTPIN, DHTTYPE);

// LCD Configuration
#ifdef USE_LCD
const int LCD_ADDRESS = 0x27;  // Common: 0x27 or 0x3F
const int LCD_COLS = 16;
const int LCD_ROWS = 2;
LiquidCrystal_I2C lcd(LCD_ADDRESS, LCD_COLS, LCD_ROWS);
#endif

// ============================================================================
// GLOBAL VARIABLES
// ============================================================================

// Sensor Data Structure
struct SensorData {
  float temperature = 0.0;
  float humidity = 0.0;
  int airQuality = 0;
  int alcohol = 0;
  int smoke = 0;
  bool dhtValid = false;
};

SensorData currentSensors;

// Timing Variables
unsigned long lastSensorRead = 0;
unsigned long lastDataSend = 0;
unsigned long lastDisplayUpdate = 0;
unsigned long lastWiFiCheck = 0;

// Intervals (milliseconds)
const long SENSOR_READ_INTERVAL = 2000;    // Read sensors every 2 seconds
const long DATA_SEND_INTERVAL = 5000;      // Send data every 5 seconds
const long DISPLAY_CYCLE_INTERVAL = 3000;  // Switch LCD screen every 3 seconds
const long WIFI_CHECK_INTERVAL = 30000;    // Check WiFi every 30 seconds

// Display state
int currentDisplayScreen = 0;

// ============================================================================
// SETUP FUNCTION
// ============================================================================

void setup() {
  Serial.begin(115200);
  Serial.println("\n========================================");
  Serial.println("Farm Aadhar - Air Quality Node");
  Serial.println("========================================");

  setupHardware();
  connectToWiFi();

  Serial.println("✅ Setup completed!");
  Serial.println("🔄 Starting sensor monitoring...\n");
}

// ============================================================================
// MAIN LOOP
// ============================================================================

void loop() {
  // Check WiFi connection periodically
  if (millis() - lastWiFiCheck >= WIFI_CHECK_INTERVAL) {
    if (WiFi.status() != WL_CONNECTED) {
      Serial.println("⚠️ WiFi disconnected, reconnecting...");
      WiFi.reconnect();
    }
    lastWiFiCheck = millis();
  }

  // Read sensors periodically
  if (millis() - lastSensorRead >= SENSOR_READ_INTERVAL) {
    readSensors();
    lastSensorRead = millis();
  }

  // Send data to Supabase periodically
  if (millis() - lastDataSend >= DATA_SEND_INTERVAL) {
    if (WiFi.status() == WL_CONNECTED) {
      sendSensorData();
    }
    lastDataSend = millis();
  }

  // Update LCD display periodically
#ifdef USE_LCD
  if (millis() - lastDisplayUpdate >= DISPLAY_CYCLE_INTERVAL) {
    updateDisplay();
    lastDisplayUpdate = millis();
  }
#endif

  delay(10);  // Small delay to prevent watchdog issues
}

// ============================================================================
// HARDWARE SETUP
// ============================================================================

void setupHardware() {
  // LED Setup
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);
  Serial.println("💡 LED initialized");

  // LCD Setup
#ifdef USE_LCD
  Serial.println("🖥️ Initializing LCD...");
  Wire.begin(21, 22);  // SDA = GPIO 21, SCL = GPIO 22
  delay(100);
  
  lcd.init();
  lcd.backlight();
  lcd.setCursor(0, 0);
  lcd.print("Farm Aadhar");
  lcd.setCursor(0, 1);
  lcd.print("Starting...");
  Serial.println("✅ LCD initialized");
#endif

  // DHT Sensor Setup
  dht.begin();
  Serial.println("🌡️ DHT11 initialized");
  
  // MQ Sensor Pins
  pinMode(MQ135_PIN, INPUT);
  pinMode(MQ3_PIN, INPUT);
  pinMode(MQ2_PIN, INPUT);
  Serial.println("💨 Gas sensors initialized");
}

// ============================================================================
// WIFI CONNECTION
// ============================================================================

void connectToWiFi() {
  Serial.println("========================================");
  Serial.println("📶 WiFi Connection Starting...");
  Serial.println("========================================");
  
#ifdef USE_LCD
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Connecting WiFi");
#endif

  bool connected = false;
  
  for (int networkIndex = 0; networkIndex < WIFI_NETWORK_COUNT && !connected; networkIndex++) {
    const char* ssid = WIFI_NETWORKS[networkIndex][0];
    const char* password = WIFI_NETWORKS[networkIndex][1];
    
    Serial.printf("\n🔗 Attempting Network %d/%d\n", networkIndex + 1, WIFI_NETWORK_COUNT);
    Serial.printf("   SSID: %s\n", ssid);
    Serial.print("   Status: Connecting");
    
#ifdef USE_LCD
    lcd.setCursor(0, 1);
    lcd.print("                "); // Clear line
    lcd.setCursor(0, 1);
    lcd.print(ssid);
#endif

    // Disconnect from any previous connection attempts
    WiFi.disconnect(true);
    delay(100);
    
    // Set WiFi mode and begin connection
    WiFi.mode(WIFI_STA);
    WiFi.begin(ssid, password);
    
    // Try to connect for 10 seconds
    int attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < 20) {
      delay(500);
      Serial.print(".");
      digitalWrite(LED_PIN, !digitalRead(LED_PIN)); // Blink LED while connecting
      attempts++;
      
#ifdef USE_LCD
      // Show progress dots on LCD
      if (attempts % 4 == 0) {
        lcd.setCursor(15, 1);
        lcd.print(attempts / 4);
      }
#endif
    }
    
    if (WiFi.status() == WL_CONNECTED) {
      connected = true;
      Serial.println();
      Serial.println("   ✅ SUCCESS!");
      Serial.printf("   Connected to: %s\n", ssid);
      Serial.printf("   IP Address: %s\n", WiFi.localIP().toString().c_str());
      Serial.printf("   Signal Strength: %d dBm\n", WiFi.RSSI());
      Serial.println("========================================");
      
#ifdef USE_LCD
      lcd.clear();
      lcd.setCursor(0, 0);
      lcd.print("Connected!");
      lcd.setCursor(0, 1);
      lcd.print(ssid);
      delay(1500);
      
      lcd.clear();
      lcd.setCursor(0, 0);
      lcd.print("IP Address:");
      lcd.setCursor(0, 1);
      lcd.print(WiFi.localIP().toString());
      delay(2000);
#endif
      digitalWrite(LED_PIN, HIGH); // LED solid on when connected
    } else {
      Serial.println();
      Serial.printf("   ❌ FAILED to connect to %s\n", ssid);
      Serial.println("   Disconnecting and trying next network...");
      
      // Properly disconnect before trying next network
      WiFi.disconnect(true);
      delay(500);
      
      digitalWrite(LED_PIN, LOW);
      
#ifdef USE_LCD
      lcd.setCursor(0, 1);
      lcd.print("Failed         ");
      delay(1000);
#endif
    }
  }
  
  if (!connected) {
    Serial.println("\n========================================");
    Serial.println("🚫 WiFi Connection FAILED");
    Serial.println("   Could not connect to any network");
    Serial.println("   Running in OFFLINE mode");
    Serial.println("   - Sensors will still read");
    Serial.println("   - Data will NOT be sent to cloud");
    Serial.println("========================================\n");
    
#ifdef USE_LCD
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("WiFi Failed!");
    lcd.setCursor(0, 1);
    lcd.print("Offline Mode");
    delay(3000);
#endif
    digitalWrite(LED_PIN, LOW);
  }
}

// ============================================================================
// SENSOR READING
// ============================================================================

void readSensors() {
  // Read DHT sensor
  sensors_event_t event;
  
  dht.temperature().getEvent(&event);
  if (!isnan(event.temperature)) {
    currentSensors.temperature = event.temperature;
    currentSensors.dhtValid = true;
  } else {
    currentSensors.dhtValid = false;
  }

  dht.humidity().getEvent(&event);
  if (!isnan(event.relative_humidity)) {
    currentSensors.humidity = event.relative_humidity;
  }

  // Read MQ sensors (raw analog values)
  currentSensors.airQuality = analogRead(MQ135_PIN);
  currentSensors.alcohol = analogRead(MQ3_PIN);
  currentSensors.smoke = analogRead(MQ2_PIN);

  // Log to Serial
  Serial.printf("📊 T:%.1f°C H:%.0f%% AQ:%d Alc:%d Smoke:%d\n",
    currentSensors.temperature, 
    currentSensors.humidity, 
    currentSensors.airQuality, 
    currentSensors.alcohol, 
    currentSensors.smoke
  );
}

// ============================================================================
// DATA TRANSMISSION TO SUPABASE
// ============================================================================

void sendSensorData() {
  HTTPClient http;
  String serverPath = String(SUPABASE_URL) + String(SUPABASE_ENDPOINT);

  // Create JSON payload with raw sensor values
  StaticJsonDocument<512> doc;
  doc["node_id"] = "air_node_01";
  
  // Add temperature (set to null if invalid)
  if (currentSensors.dhtValid) {
    doc["temperature"] = currentSensors.temperature;
  } else {
    doc["temperature"] = (char*)0;  // JSON null
  }
  
  // Add humidity (set to null if invalid)
  if (!isnan(currentSensors.humidity)) {
    doc["humidity"] = currentSensors.humidity;
  } else {
    doc["humidity"] = (char*)0;  // JSON null
  }
  
  doc["air_quality_mq135"] = currentSensors.airQuality;
  doc["alcohol_mq3"] = currentSensors.alcohol;
  doc["smoke_mq2"] = currentSensors.smoke;

  String jsonPayload;
  serializeJson(doc, jsonPayload);

  // Debug: Print what we're sending
  Serial.println("📤 Sending to Supabase:");
  Serial.println("   URL: " + serverPath);
  Serial.println("   Payload: " + jsonPayload);

  // Configure HTTP client
  http.begin(serverPath);
  http.setTimeout(10000);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("apikey", SUPABASE_ANON_KEY);
  http.addHeader("Authorization", String("Bearer ") + SUPABASE_ANON_KEY);
  http.addHeader("Prefer", "return=minimal");  // Add this for better compatibility

  // Send data
  int httpResponseCode = http.POST(jsonPayload);

  if (httpResponseCode == 200 || httpResponseCode == 201) {
    Serial.println("✅ Data sent to Supabase");
    digitalWrite(LED_PIN, HIGH);
    delay(50);
    digitalWrite(LED_PIN, WiFi.status() == WL_CONNECTED ? HIGH : LOW);
  } else {
    Serial.printf("❌ Send failed: HTTP %d\n", httpResponseCode);
    
    // Print detailed error information
    if (httpResponseCode == 401) {
      Serial.println("   🔑 Authentication Error:");
      Serial.println("   - Check if Supabase anon key is correct");
      Serial.println("   - Verify RLS policies allow INSERT");
      Serial.println("   - Check if API key has expired");
    } else if (httpResponseCode == 400) {
      Serial.println("   ⚠️ Bad Request - Check data format");
    } else if (httpResponseCode == 403) {
      Serial.println("   🚫 Forbidden - RLS policy blocking insert");
    }
    
    // Print response body for debugging
    String response = http.getString();
    if (response.length() > 0 && response.length() < 500) {
      Serial.println("   Response: " + response);
    }
  }

  http.end();
}

// ============================================================================
// LCD DISPLAY UPDATE (RAW VALUES ONLY - NO JUDGMENTS)
// ============================================================================

#ifdef USE_LCD
void updateDisplay() {
  // Cycle through 4 screens showing raw values + WiFi status
  currentDisplayScreen = (currentDisplayScreen + 1) % 4;
  lcd.clear();

  switch (currentDisplayScreen) {
    case 0: // Temperature & Humidity
      lcd.setCursor(0, 0);
      if (currentSensors.dhtValid) {
        lcd.printf("Temp: %.1fC", currentSensors.temperature);
      } else {
        lcd.print("Temp: --");
      }
      
      lcd.setCursor(0, 1);
      if (!isnan(currentSensors.humidity)) {
        lcd.printf("Humid: %.0f%%", currentSensors.humidity);
      } else {
        lcd.print("Humid: --");
      }
      break;

    case 1: // Air Quality
      lcd.setCursor(0, 0);
      lcd.print("Air Quality");
      lcd.setCursor(0, 1);
      lcd.printf("MQ135: %d", currentSensors.airQuality);
      break;

    case 2: // Gas Sensors
      lcd.setCursor(0, 0);
      lcd.printf("Alc: %d", currentSensors.alcohol);
      lcd.setCursor(0, 1);
      lcd.printf("Smoke: %d", currentSensors.smoke);
      break;

    case 3: // WiFi Status
      lcd.setCursor(0, 0);
      if (WiFi.status() == WL_CONNECTED) {
        lcd.print("WiFi: Connected");
        lcd.setCursor(0, 1);
        lcd.print(WiFi.SSID());
      } else {
        lcd.print("WiFi: Offline");
        lcd.setCursor(0, 1);
        lcd.print("No Connection");
      }
      break;
  }
}
#endif
