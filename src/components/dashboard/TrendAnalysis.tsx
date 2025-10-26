import React, { useState, memo, useCallback } from "react";
import { AlertTriangle, TrendingUp, CheckCircle2, Activity, BarChart3, Lightbulb, Eye } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getAnalysis } from "../GeminiAnalysis";
import AutomationControls from './AutomationControls';
import { getStoredThresholds } from '../settings/ThresholdSettings';

// Simplified type for the response
type AnalysisResponse = {
  overview: string[];
  suggestions: string[];
  controls: {
    ac: { trigger: boolean; reason: string };
    exhaust_fan: { trigger: boolean; reason: string };
    water_pump: { trigger: boolean; reason: string };
  };
};

type TrendAnalysisProps = {
  farmData?: any[];
};

const TrendAnalysis = memo(function TrendAnalysis({ farmData = [{ id: 1, sensor: 'test', value: 50 }] }: TrendAnalysisProps) {
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalysis = useCallback(async () => {
    if (!farmData || farmData.length === 0) return;
    setLoading(true);
    setError(null);

    try {
      const result = await getAnalysis(farmData);
      if (result) {
        setAnalysis(result);
        setError(null);
      }
    } catch (err: any) {
      console.error("Analysis failed:", err);
      setError(err.message || 'Failed to generate analysis. Please try again.');
      setAnalysis(null);
    }

    setLoading(false);
  }, [farmData]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4">
      {/* Header */}
      <div className="border border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg">
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-primary">Farm Analysis Dashboard</h1>
                <p className="text-muted-foreground mt-1">
                  Comprehensive insights for data-driven farming decisions
                </p>
              </div>
            </div>
            <button
              onClick={handleAnalysis}
              disabled={loading || !farmData}
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-2 rounded-md font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
                  Analyzing...
                </div>
              ) : (
                "Generate Analysis"
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && !loading && (
        <div className="border border-destructive/20 bg-destructive/5 rounded-lg">
          <div className="text-center py-8 px-6">
            <div className="rounded-full bg-destructive/10 p-4 w-fit mx-auto mb-4">
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
            <h3 className="text-lg font-medium text-destructive mb-2">Analysis Failed</h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            {error.includes('API key') && (
              <div className="text-sm text-left bg-background/50 rounded-lg p-4 max-w-md mx-auto">
                <p className="font-medium mb-2">To fix this:</p>
                <p className="text-xs text-muted-foreground">
                  1. Get your Gemini API key from: <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Google AI Studio</a><br/>
                  2. Add it to your .env file as: VITE_GEMINI_API_KEY=your_key_here<br/>
                  3. Restart your development server
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!analysis && !loading && !error && (
        <div className="border border-muted rounded-lg">
          <div className="text-center py-12 px-6">
            <div className="rounded-full bg-muted/50 p-4 w-fit mx-auto mb-4">
              <BarChart3 className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">Ready to Analyze Your Farm Data</h3>
            <p className="text-muted-foreground">
              Click "Generate Analysis" to get detailed insights about your farm's performance and recommendations.
            </p>
          </div>
        </div>
      )}

      {/* Simplified Analysis Results */}
      {analysis && (
        <div className="space-y-6">
          {/* AI Analysis - Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Farm Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {analysis.overview.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-2 p-2 rounded bg-muted/50">
                    <span className="text-lg">{item.match(/^[🌡️💧🌬️⚡🌱]/)?.[0] || '📊'}</span>
                    <span className="text-sm flex-1">{item.replace(/^[🌡️💧🌬️⚡🌱]\s*/, '')}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* AI Analysis - Suggestions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5" />
                AI Suggestions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {analysis.suggestions.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-2 p-3 rounded bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                    <span className="text-lg">{item.match(/^[💡⚡📊🔧💧]/)?.[0] || '💡'}</span>
                    <span className="text-sm flex-1">{item.replace(/^[💡⚡📊🔧💧]\s*/, '')}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Automation Controls */}
          <AutomationControls 
            sensorData={farmData || []}
            thresholds={getStoredThresholds()}
            analysisData={analysis}
          />
        </div>
      )}
    </div>
  );
});

export default TrendAnalysis;
