import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/hooks/useLanguage";
import { useTheme } from "@/hooks/useTheme";
import { Settings as SettingsIcon, User, Palette, Globe, Bell, Shield, LogOut } from "lucide-react";

interface UserProfile {
  user_id: string;
  name?: string;
  email?: string;
  role: string;
  theme: string;
  preferred_language: string;
  created_at: string;
  updated_at: string;
}

export default function Settings() {
  const { user } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [profileData, setProfileData] = useState({
    name: "",
    email: "",
    role: "farmer"
  });
  const [notificationSettings, setNotificationSettings] = useState({
    emailAlerts: true,
    pushNotifications: true,
    weeklyReports: false
  });

  // Fetch user profile
  const { data: profile, isLoading } = useQuery({
    queryKey: ['user-profile'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user?.id)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data as UserProfile | null;
    },
    enabled: !!user
  });

  // Update profile data when profile is loaded
  useEffect(() => {
    if (profile) {
      setProfileData({
        name: profile.name || "",
        email: profile.email || user?.email || "",
        role: profile.role || "farmer"
      });
    }
  }, [profile, user]);

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: typeof profileData) => {
      if (profile) {
        // Update existing profile
        const { error } = await supabase
          .from('user_profiles')
          .update({
            name: data.name,
            email: data.email,
            role: data.role,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user?.id);
        
        if (error) throw error;
      } else {
        // Create new profile
        const { error } = await supabase
          .from('user_profiles')
          .insert({
            user_id: user?.id,
            name: data.name,
            email: data.email,
            role: data.role,
            theme: theme,
            preferred_language: language
          });
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      toast({ title: t('Profile updated successfully') });
    },
    onError: (error) => {
      toast({
        title: t('Error updating profile'),
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Update theme and language in profile
  const updatePreferencesMutation = useMutation({
    mutationFn: async ({ theme: newTheme, language: newLanguage }: { theme: string; language: string }) => {
      if (profile) {
        const { error } = await supabase
          .from('user_profiles')
          .update({
            theme: newTheme,
            preferred_language: newLanguage,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user?.id);
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
    }
  });

  const handleSaveProfile = () => {
    updateProfileMutation.mutate(profileData);
  };

  const handleThemeToggle = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    toggleTheme();
    updatePreferencesMutation.mutate({ theme: newTheme, language });
  };

  const handleLanguageChange = (newLanguage: string) => {
    setLanguage(newLanguage as 'en' | 'hi');
    updatePreferencesMutation.mutate({ theme, language: newLanguage });
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      toast({ title: t('Signed out successfully') });
    } catch (error) {
      toast({
        title: t('Error signing out'),
        description: 'Please try again',
        variant: "destructive"
      });
    }
  };

  if (isLoading) {
    return (
      <div className="p-3 md:p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 md:h-8 bg-muted rounded w-32 md:w-48"></div>
          <div className="h-48 md:h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 md:p-4 lg:p-6 space-y-4 md:space-y-6 max-w-full overflow-x-hidden">
      <div className="flex items-center gap-2">
        <SettingsIcon className="h-5 w-5 md:h-6 md:w-6" />
        <h1 className="text-xl md:text-2xl font-bold">{t('Settings')}</h1>
      </div>

      {/* Profile Settings */}
      <Card>
        <CardHeader className="p-3 md:p-6">
          <CardTitle className="flex items-center gap-2 text-base md:text-lg">
            <User className="h-4 w-4 md:h-5 md:w-5" />
            {t('Profile Information')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-3 md:p-6 pt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm">{t('Full Name')}</Label>
              <Input
                id="name"
                value={profileData.name}
                onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                placeholder={t('Enter your full name')}
                className="text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm">{t('Email')}</Label>
              <Input
                id="email"
                type="email"
                value={profileData.email}
                onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                placeholder={t('Enter your email')}
                className="text-sm"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="role" className="text-sm">{t('Role')}</Label>
            <Select value={profileData.role} onValueChange={(value) => setProfileData({ ...profileData, role: value })}>
              <SelectTrigger className="text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="farmer">{t('Farmer')}</SelectItem>
                <SelectItem value="manager">{t('Farm Manager')}</SelectItem>
                <SelectItem value="technician">{t('Technician')}</SelectItem>
                <SelectItem value="admin">{t('Administrator')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleSaveProfile} disabled={updateProfileMutation.isPending} size="sm" className="text-sm">
            {updateProfileMutation.isPending ? t('Saving...') : t('Save Profile')}
          </Button>
        </CardContent>
      </Card>

      {/* Appearance Settings */}
      <Card>
        <CardHeader className="p-3 md:p-6">
          <CardTitle className="flex items-center gap-2 text-base md:text-lg">
            <Palette className="h-4 w-4 md:h-5 md:w-5" />
            {t('Appearance')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-3 md:p-6 pt-0">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1 mr-2">
              <Label className="text-sm">{t('Dark Mode')}</Label>
              <p className="text-xs text-muted-foreground line-clamp-2">
                {t('Toggle between light and dark themes')}
              </p>
            </div>
            <Switch checked={theme === 'dark'} onCheckedChange={handleThemeToggle} className="flex-shrink-0" />
          </div>
        </CardContent>
      </Card>

      {/* Language Settings */}
      <Card>
        <CardHeader className="p-3 md:p-6">
          <CardTitle className="flex items-center gap-2 text-base md:text-lg">
            <Globe className="h-4 w-4 md:h-5 md:w-5" />
            {t('Language & Region')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-3 md:p-6 pt-0">
          <div className="space-y-2">
            <Label className="text-sm">{t('Language')}</Label>
            <Select value={language} onValueChange={handleLanguageChange}>
              <SelectTrigger className="w-full md:w-48 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="hi">हिंदी (Hindi)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card>
        <CardHeader className="p-3 md:p-6">
          <CardTitle className="flex items-center gap-2 text-base md:text-lg">
            <Bell className="h-4 w-4 md:h-5 md:w-5" />
            {t('Notifications')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-3 md:p-6 pt-0">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1 mr-2">
              <Label className="text-sm">{t('Email Alerts')}</Label>
              <p className="text-xs text-muted-foreground line-clamp-2">
                {t('Receive alerts via email')}
              </p>
            </div>
            <Switch
              checked={notificationSettings.emailAlerts}
              onCheckedChange={(checked) =>
                setNotificationSettings({ ...notificationSettings, emailAlerts: checked })
              }
              className="flex-shrink-0"
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1 mr-2">
              <Label className="text-sm">{t('Push Notifications')}</Label>
              <p className="text-xs text-muted-foreground line-clamp-2">
                {t('Receive push notifications in browser')}
              </p>
            </div>
            <Switch
              checked={notificationSettings.pushNotifications}
              onCheckedChange={(checked) =>
                setNotificationSettings({ ...notificationSettings, pushNotifications: checked })
              }
              className="flex-shrink-0"
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1 mr-2">
              <Label className="text-sm">{t('Weekly Reports')}</Label>
              <p className="text-xs text-muted-foreground line-clamp-2">
                {t('Receive weekly summary reports')}
              </p>
            </div>
            <Switch
              checked={notificationSettings.weeklyReports}
              onCheckedChange={(checked) =>
                setNotificationSettings({ ...notificationSettings, weeklyReports: checked })
              }
              className="flex-shrink-0"
            />
          </div>
        </CardContent>
      </Card>

      {/* Account Actions */}
      <Card>
        <CardHeader className="p-3 md:p-6">
          <CardTitle className="flex items-center gap-2 text-base md:text-lg">
            <Shield className="h-4 w-4 md:h-5 md:w-5" />
            {t('Account')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-3 md:p-6 pt-0">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1 mr-2">
              <Label className="text-sm">{t('Account Status')}</Label>
              <p className="text-xs text-muted-foreground line-clamp-2">
                {t('Your account is active and verified')}
              </p>
            </div>
            <div className="text-xs md:text-sm text-green-600 font-medium flex-shrink-0">
              {t('Active')}
            </div>
          </div>
          <Separator />
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="min-w-0">
              <Label className="text-red-600 text-sm">{t('Sign Out')}</Label>
              <p className="text-xs text-muted-foreground line-clamp-2">
                {t('Sign out of your account')}
              </p>
            </div>
            <Button 
              variant="outline" 
              onClick={handleSignOut} 
              className="text-red-600 border-red-200 hover:bg-red-50 text-sm w-full sm:w-auto flex-shrink-0" 
              size="sm"
            >
              <LogOut className="h-3 w-3 md:h-4 md:w-4 mr-2" />
              {t('Sign Out')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}