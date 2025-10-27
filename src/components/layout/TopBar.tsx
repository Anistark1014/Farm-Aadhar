import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/hooks/useLanguage";
import { useTheme } from "@/hooks/useTheme";
import { Button } from "@/components/ui/button";
import { SimulationController } from "@/components/dashboard/SimulationController";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Bell, 
  Menu, 
  Moon, 
  Sun, 
  User, 
  LogOut,
  Globe,
  Play,
  Square,
  Database
} from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";

export function TopBar() {
  const { user } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();

  // Mobile simulation state
  const [isSimRunning, setIsSimRunning] = useState(() => {
    return localStorage.getItem('simulationRunning') === 'true';
  });
  const [isCollectionActive, setIsCollectionActive] = useState(() => {
    return localStorage.getItem('espConnectionEnabled') === 'true';
  });

  // Listen for storage changes
  useEffect(() => {
    const handleStorageChange = () => {
      setIsSimRunning(localStorage.getItem('simulationRunning') === 'true');
      setIsCollectionActive(localStorage.getItem('espConnectionEnabled') === 'true');
    };
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('simulationStateChanged', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('simulationStateChanged', handleStorageChange);
    };
  }, []);

  const toggleSimulation = () => {
    const newState = !isSimRunning;
    setIsSimRunning(newState);
    localStorage.setItem('simulationRunning', String(newState));
    window.dispatchEvent(new Event('simulationStateChanged'));
    toast({
      title: newState ? "Simulation Started" : "Simulation Stopped",
      description: newState ? "Generating simulated sensor data" : "Simulation paused",
    });
  };

  const toggleDataCollection = async () => {
    const newState = !isCollectionActive;
    setIsCollectionActive(newState);
    localStorage.setItem('espConnectionEnabled', String(newState));
    window.dispatchEvent(new Event('simulationStateChanged'));

    try {
      const { error } = await supabase
        .from('data_collection_settings')
        .update({ 
          is_active: newState,
          updated_at: new Date().toISOString()
        })
        .eq('id', 1);

      if (error) throw error;

      toast({
        title: newState ? "Data Collection Started" : "Data Collection Stopped",
        description: newState ? "Storing sensor data to database" : "Data collection paused",
      });
    } catch (error) {
      console.error('Error updating collection state:', error);
      setIsCollectionActive(!newState);
      localStorage.setItem('espConnectionEnabled', String(!newState));
      window.dispatchEvent(new Event('simulationStateChanged'));
      toast({
        title: "Error",
        description: "Failed to update data collection state",
        variant: "destructive",
      });
    }
  };

  const formatTime = () => {
    return new Date().toLocaleString(language === 'hi' ? 'hi-IN' : 'en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <SidebarTrigger className="p-2" />
          
          {/* Mobile Simulation Controls */}
          <div className="flex items-center gap-1 md:hidden">
            <Button
              variant={isSimRunning ? "default" : "outline"}
              size="sm"
              onClick={toggleSimulation}
              className="h-8 px-2 text-xs"
              title={isSimRunning ? "Stop Simulation" : "Start Simulation"}
            >
              {isSimRunning ? <Square className="h-3 w-3 mr-1" /> : <Play className="h-3 w-3 mr-1" />}
              <span className="hidden xs:inline">Sim</span>
            </Button>
            
            <Button
              variant={isCollectionActive ? "default" : "outline"}
              size="sm"
              onClick={toggleDataCollection}
              className="h-8 px-2 text-xs"
              title={isCollectionActive ? "Stop Collection" : "Start Collection"}
            >
              <Database className="h-3 w-3 mr-1" />
              <span className="hidden xs:inline">Data</span>
            </Button>
          </div>
          
          <div className="hidden md:block">
            <h2 className="text-lg font-semibold text-foreground">
              {t('welcome')}, {user?.user_metadata?.name || user?.email?.split('@')[0] || 'Farmer'}!
            </h2>
            <p className="text-sm text-muted-foreground">
              {formatTime()}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Language Selector */}
          <Select value={language} onValueChange={(value: 'en' | 'hi') => setLanguage(value)}>
            <SelectTrigger className="w-32">
              <Globe className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="hi">हिंदी</SelectItem>
            </SelectContent>
          </Select>

            {/* Simulation Buttons */}
            {/* Desktop Simulation Controller */}
        <div className="hidden md:block">
          <SimulationController />
        </div>

          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="h-9 w-9"
          >
            {theme === 'light' ? (
              <Moon className="h-4 w-4" />
            ) : (
              <Sun className="h-4 w-4" />
            )}
          </Button>

          {/* Notifications */}
          {/* <Button variant="ghost" size="icon" className="h-9 w-9 relative">
            <Bell className="h-4 w-4" />
            <span className="absolute -top-1 -right-1 h-3 w-3 bg-destructive rounded-full text-xs flex items-center justify-center text-destructive-foreground">
              2
            </span>
          </Button> */}

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                <User className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <div className="flex flex-col space-y-1 p-2">
                <p className="text-sm font-medium leading-none">
                  {user?.user_metadata?.name || 'Farmer'}
                </p>
                <p className="text-xs leading-none text-muted-foreground">
                  {user?.email}
                </p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                {t('logout')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}