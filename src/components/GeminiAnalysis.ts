import { getStoredThresholds } from './settings/ThresholdSettings';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

// Available Gemini models to try in order of preference
// Updated for current Google AI API (as of Oct 2024)
const GEMINI_MODELS = [
  'gemini-1.5-flash',     // Current fast model
  'gemini-1.5-pro',      // Current pro model  
  'gemini-pro',          // Legacy fallback
  'text-bison-001'       // Alternative text generation model
];

// Function to get available models from Google API
async function getAvailableModels(): Promise<string[]> {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models?key=${API_KEY}`
    );
    
    if (response.ok) {
      const data = await response.json();
      const availableModels = data.models
        ?.filter((model: any) => 
          model.supportedGenerationMethods?.includes('generateContent') &&
          (model.name.includes('gemini') || model.name.includes('text-bison'))
        )
        ?.map((model: any) => model.name.replace('models/', '')) || [];
      
      console.log('📋 Available models from Google API:', availableModels);
      return availableModels.length > 0 ? availableModels : GEMINI_MODELS;
    }
  } catch (error) {
    console.warn('⚠️ Could not fetch available models, using fallback list');
  }
  
  return GEMINI_MODELS;
}

export async function getAnalysis(farmData: any[]) {
  // Check if API key is configured
  if (!API_KEY || API_KEY === 'undefined' || API_KEY === 'your_gemini_api_key_here') {
    throw new Error('Gemini API key not configured. Please add VITE_GEMINI_API_KEY to your .env file. Get your key at: https://aistudio.google.com/app/apikey');
  }

  try {
    // Get current threshold settings
    const thresholds = getStoredThresholds();
    
    // Build dynamic threshold text
    const thresholdText = Object.entries(thresholds).map(([key, threshold]) => {
      const sensorName = threshold.label;
      return `- ${sensorName}: ${threshold.low}-${threshold.high}${threshold.unit} (critical below ${threshold.low}${threshold.unit} or above ${threshold.high}${threshold.unit})`;
    }).join('\n                  ');
    
    const safeData = JSON.stringify(farmData.slice(-10)); // last 10 readings only

    // Get available models and try them until one works
    const modelsToTry = await getAvailableModels();
    let response: Response | null = null;
    let lastError: string = '';

    for (const model of modelsToTry) {
      try {
        console.log(`Trying Gemini model: ${model}`);
        
        // Try v1 API first, then v1beta as fallback
        const apiVersions = ['v1', 'v1beta'];
        
        for (const apiVersion of apiVersions) {
          try {
            console.log(`  - Using API version: ${apiVersion}`);
            response = await fetch(
              `https://generativelanguage.googleapis.com/${apiVersion}/models/${model}:generateContent?key=${API_KEY}`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: `
                  Analyze this farm sensor data and return a SIMPLE JSON with bullet points and emojis.
                  Keep it SHORT and FAST. Use the threshold values to determine issues.
                  
                  THRESHOLDS:
                  ${thresholdText}
                  
                  Return ONLY this JSON format:
                  {
                    "overview": [
                      "🌡️ Temperature: Current status vs ideal",
                      "💧 Humidity: Current status vs ideal", 
                      "🌬️ Air Quality: Current status"
                    ],
                    "suggestions": [
                      "💡 Action needed (if any)",
                      "⚡ Control triggers (AC/Fan/Water)",
                      "📊 Quick improvement tip"
                    ],
                    "controls": {
                      "ac": { "trigger": true/false, "reason": "Temperature 28°C > 25°C threshold" },
                      "exhaust_fan": { "trigger": true/false, "reason": "Reason if triggered" },
                      "water_pump": { "trigger": true/false, "reason": "Reason if triggered" }
                    }
                  }

                  Data: ${safeData}
                  `
                },
              ],
            },
          ],
                }),
              }
            );

            if (response.ok) {
              console.log(`✅ Successfully connected to ${model} (${apiVersion})`);
              break; // Success! Exit the API version loop
            } else {
              const errText = await response.text();
              console.warn(`❌ ${model} failed on ${apiVersion}: ${response.status}`);
              if (apiVersion === apiVersions[apiVersions.length - 1]) {
                // Last API version failed
                lastError = `${model}: ${response.status} - ${errText}`;
                response = null;
              }
            }
          } catch (apiErr: any) {
            console.warn(`❌ ${model} failed on ${apiVersion}:`, apiErr.message);
            if (apiVersion === apiVersions[apiVersions.length - 1]) {
              // Last API version failed
              lastError = `${model}: ${apiErr.message}`;
              response = null;
            }
          }
        }

        // If we got a successful response, break out of the model loop
        if (response && response.ok) {
          break;
        }
      } catch (err: any) {
        lastError = `${model}: ${err.message}`;
        console.warn(`❌ ${model} completely failed:`, err.message);
        response = null; // Reset for next attempt
      }
    }

    // If no model worked, throw an error
    if (!response || !response.ok) {
      throw new Error(`All Gemini models failed. Last error: ${lastError}. Please check your API key and try again.`);
    }

    const result = await response.json();

    const text = result.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    // Extract JSON block
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("Gemini returned no JSON:", text);
      throw new Error("Gemini response did not contain valid JSON");
    }

    let json: any = {};
    try {
      json = JSON.parse(jsonMatch[0]);
    } catch (e) {
      console.error("Failed to parse extracted JSON:", jsonMatch[0]);
      throw new Error("Failed to parse Gemini response as JSON");
    }

    return json;
  } catch (err) {
    console.error("Gemini analysis failed", err);
    throw err;
  }
}
