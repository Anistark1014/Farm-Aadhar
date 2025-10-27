import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/hooks/useLanguage";
import { Upload, Camera, Mic, Brain, Leaf, AlertTriangle } from "lucide-react";

interface AISuggestion {
  id: string;
  suggestion_text: string;
  category: string;
  image_url?: string;
  timestamp: string;
}

export default function AIAnalysis() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [analysisPrompt, setAnalysisPrompt] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Fetch AI suggestions
  const { data: suggestions = [], isLoading } = useQuery({
    queryKey: ['ai-suggestions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_suggestions')
        .select('*')
        .eq('user_id', user?.id)
        .order('timestamp', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return data as AISuggestion[];
    },
    enabled: !!user
  });

  // Add AI suggestion mutation
  const addSuggestionMutation = useMutation({
    mutationFn: async (suggestion: { text: string; category: string; imageUrl?: string }) => {
      const { error } = await supabase
        .from('ai_suggestions')
        .insert({
          user_id: user?.id,
          suggestion_text: suggestion.text,
          category: suggestion.category,
          image_url: suggestion.imageUrl
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-suggestions'] });
      toast({
        title: t('AI Analysis Complete'),
        description: t('New suggestion added successfully'),
      });
    }
  });

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyzeImage = async () => {
    if (!selectedImage && !analysisPrompt) {
      toast({
        title: t('Error'),
        description: t('Please upload an image or enter analysis prompt'),
        variant: "destructive"
      });
      return;
    }

    setIsAnalyzing(true);
    
    try {
      // Mock AI analysis - in real app, this would call an AI service
      const mockSuggestions = [
        {
          text: "Your crops show healthy growth patterns. Consider increasing nitrogen levels by 10% for optimal yield.",
          category: "nutrition"
        },
        {
          text: "Detected early signs of pest activity. Recommend organic neem oil treatment within 24 hours.",
          category: "pest_control"
        },
        {
          text: "Air humidity levels are optimal for plant growth. Maintain current ventilation settings.",
          category: "environment"
        }
      ];

      const randomSuggestion = mockSuggestions[Math.floor(Math.random() * mockSuggestions.length)];
      
      await addSuggestionMutation.mutateAsync({
        text: analysisPrompt || randomSuggestion.text,
        category: randomSuggestion.category,
        imageUrl: imagePreview || undefined
      });

      setSelectedImage(null);
      setImagePreview("");
      setAnalysisPrompt("");
      
    } catch (error) {
      toast({
        title: t('Error'),
        description: t('Failed to analyze. Please try again.'),
        variant: "destructive"
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'nutrition': return <Leaf className="h-4 w-4" />;
      case 'pest_control': return <AlertTriangle className="h-4 w-4" />;
      case 'irrigation': return <Brain className="h-4 w-4" />;
      default: return <Brain className="h-4 w-4" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'nutrition': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'pest_control': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'irrigation': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  return (
    <div className="p-3 md:p-4 lg:p-6 space-y-4 md:space-y-6 max-w-full overflow-x-hidden">
      <div className="flex items-center gap-2 mb-4 md:mb-6">
        <Brain className="h-5 w-5 md:h-6 md:w-6" />
        <h1 className="text-xl md:text-2xl font-bold truncate">{t('AI Analysis')}</h1>
      </div>

      {/* Image Upload and Analysis */}
      <Card>
        <CardHeader className="p-3 md:p-6">
          <CardTitle className="flex items-center gap-2 text-base md:text-lg">
            <Camera className="h-4 w-4 md:h-5 md:w-5" />
            {t('Crop Image Analysis')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-3 md:p-6 pt-0">
          <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 md:p-8 text-center">
            {imagePreview ? (
              <div className="space-y-3 md:space-y-4">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="max-w-full md:max-w-sm mx-auto rounded-lg"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setImagePreview("");
                    setSelectedImage(null);
                  }}
                  className="text-xs md:text-sm"
                >
                  {t('Remove Image')}
                </Button>
              </div>
            ) : (
              <div className="space-y-3 md:space-y-4">
                <Upload className="h-8 w-8 md:h-12 md:w-12 mx-auto text-muted-foreground" />
                <div>
                  <p className="text-sm md:text-lg font-medium">{t('Upload crop image for analysis')}</p>
                  <p className="text-xs md:text-sm text-muted-foreground">
                    {t('PNG, JPG up to 10MB')}
                  </p>
                </div>
                <Button onClick={() => fileInputRef.current?.click()} size="sm" className="text-xs md:text-sm">
                  {t('Choose File')}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </div>
            )}
          </div>
          
          <Textarea
            placeholder={t('Describe what you want to analyze or ask questions about your crops...')}
            value={analysisPrompt}
            onChange={(e) => setAnalysisPrompt(e.target.value)}
            rows={3}
            className="text-sm"
          />
          
          <Button
            onClick={handleAnalyzeImage}
            disabled={isAnalyzing || (!selectedImage && !analysisPrompt)}
            className="w-full text-xs md:text-sm"
            size="sm"
          >
            {isAnalyzing ? t('Analyzing...') : t('Analyze with AI')}
          </Button>
        </CardContent>
      </Card>

      {/* Voice Analysis */}
      <Card>
        <CardHeader className="p-3 md:p-6">
          <CardTitle className="flex items-center gap-2 text-base md:text-lg">
            <Mic className="h-4 w-4 md:h-5 md:w-5" />
            {t('Voice Analysis')}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 md:p-6 pt-0">
          <div className="text-center space-y-3 md:space-y-4">
            <p className="text-xs md:text-sm text-muted-foreground">
              {t('Ask questions about your farm using voice commands')}
            </p>
            <Button variant="outline" className="w-full text-xs md:text-sm" size="sm">
              <Mic className="h-3 w-3 md:h-4 md:w-4 mr-2" />
              {t('Start Voice Recording')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* AI Suggestions History */}
      <Card>
        <CardHeader className="p-3 md:p-6">
          <CardTitle className="text-base md:text-lg">{t('Recent AI Suggestions')}</CardTitle>
        </CardHeader>
        <CardContent className="p-3 md:p-6 pt-0">
          {isLoading ? (
            <p className="text-xs md:text-sm text-muted-foreground">{t('Loading suggestions...')}</p>
          ) : suggestions.length === 0 ? (
            <p className="text-xs md:text-sm text-muted-foreground">{t('No suggestions yet. Upload an image to get started!')}</p>
          ) : (
            <div className="space-y-3 md:space-y-4">
              {suggestions.map((suggestion) => (
                <div key={suggestion.id} className="border rounded-lg p-3 md:p-4 space-y-2 md:space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <Badge className={`${getCategoryColor(suggestion.category)} text-xs flex items-center gap-1 flex-shrink-0`}>
                      {getCategoryIcon(suggestion.category)}
                      <span className="capitalize truncate">{suggestion.category.replace('_', ' ')}</span>
                    </Badge>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(suggestion.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-xs md:text-sm break-words">{suggestion.suggestion_text}</p>
                  {suggestion.image_url && (
                    <img
                      src={suggestion.image_url}
                      alt="Analysis"
                      className="w-20 h-20 md:w-24 md:h-24 object-cover rounded-md"
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}