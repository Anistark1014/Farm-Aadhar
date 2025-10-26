-- ============================================================================
-- Farm Aadhar - Complete Database Restructure
-- Date: October 26, 2025
-- Description: Streamlined schema for unified data nodes, automation controls,
--              and news/articles feature. Removes air/soil node separation.
-- ============================================================================

-- ============================================================================
-- SECTION 1: DROP OLD UNNECESSARY TABLES
-- ============================================================================

-- Drop old AI image analysis table (no longer needed)
DROP TABLE IF EXISTS public.ai_suggestions CASCADE;

-- Drop old split node metadata (replacing with unified data_nodes)
DROP TABLE IF EXISTS public.node_metadata CASCADE;

-- ============================================================================
-- SECTION 2: CREATE UNIFIED DATA NODES TABLE
-- ============================================================================

-- Drop existing table if it exists (for clean recreation)
DROP TABLE IF EXISTS public.data_nodes CASCADE;

CREATE TABLE public.data_nodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id text UNIQUE NOT NULL,                    -- e.g., "air_node_01", "field_node_02"
  node_name text NOT NULL,                          -- User-friendly name
  node_type text DEFAULT 'general',                -- 'general', 'greenhouse', 'field', 'storage'
  location text,                                    -- Physical location description
  assigned_user_id uuid REFERENCES public.user_profiles(user_id),
  
  -- Crop assignment for dynamic thresholds
  assigned_crop_id uuid REFERENCES public.crop_profiles(id),  -- NULL if not set
  growth_stage text DEFAULT 'vegetative',          -- 'seedling', 'vegetative', 'flowering', 'fruiting'
  planting_date date,                              -- When crop was planted
  
  is_active boolean DEFAULT true,
  last_active_timestamp timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  notes text,                                       -- Admin notes about the node
  
  -- Hardware specs (optional metadata)
  hardware_version text,
  firmware_version text,
  
  CONSTRAINT data_nodes_node_type_check CHECK (node_type IN ('general', 'greenhouse', 'field', 'storage', 'custom')),
  CONSTRAINT data_nodes_growth_stage_check CHECK (growth_stage IN (
    'seedling', 'vegetative', 'flowering', 'fruiting', 'harvesting', 'none'
  ))
);

-- Insert default nodes for current setup
INSERT INTO public.data_nodes (node_id, node_name, node_type, location, notes) 
VALUES 
  ('air_node_01', 'Main Data Node', 'greenhouse', 'Primary Greenhouse', 'ESP32 with DHT11, MQ-135, MQ-3, MQ-2 sensors'),
  ('simulation-node', 'Simulation Node', 'custom', 'Virtual', 'Test data generator for development')
ON CONFLICT (node_id) DO NOTHING;

-- Auto-insert any other existing node_ids from sensor_readings
INSERT INTO public.data_nodes (node_id, node_name, node_type, location, notes)
SELECT DISTINCT 
  node_id,
  'Legacy Node - ' || node_id,
  'custom',
  'Unknown',
  'Auto-created from existing sensor_readings data'
FROM public.sensor_readings
WHERE node_id NOT IN (SELECT node_id FROM public.data_nodes)
ON CONFLICT (node_id) DO NOTHING;

-- Indexes for data_nodes
CREATE INDEX idx_data_nodes_assigned_user ON public.data_nodes(assigned_user_id);
CREATE INDEX idx_data_nodes_is_active ON public.data_nodes(is_active);
CREATE INDEX idx_data_nodes_last_active ON public.data_nodes(last_active_timestamp DESC);

-- RLS policies for data_nodes
ALTER TABLE public.data_nodes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their assigned nodes" ON public.data_nodes
  FOR SELECT USING (
    assigned_user_id = auth.uid() OR 
    assigned_user_id IS NULL OR 
    auth.role() = 'authenticated'
  );

CREATE POLICY "Authenticated users can update node metadata" ON public.data_nodes
  FOR UPDATE USING (auth.role() = 'authenticated');

-- ============================================================================
-- SECTION 3: UPDATE SENSOR READINGS TABLE
-- ============================================================================

-- First, ensure all existing node_ids have corresponding entries in data_nodes
-- This is already handled in SECTION 2, but we add a safety check here

-- Check for any orphaned sensor_readings and create placeholder nodes
DO $$
DECLARE
  orphan_count INTEGER;
BEGIN
  -- Count orphaned records
  SELECT COUNT(DISTINCT node_id) INTO orphan_count
  FROM public.sensor_readings sr
  WHERE NOT EXISTS (
    SELECT 1 FROM public.data_nodes dn WHERE dn.node_id = sr.node_id
  );
  
  IF orphan_count > 0 THEN
    RAISE NOTICE 'Found % orphaned node_id values. Creating placeholder nodes...', orphan_count;
    
    -- Create placeholder nodes for orphaned data
    INSERT INTO public.data_nodes (node_id, node_name, node_type, location, notes)
    SELECT DISTINCT 
      sr.node_id,
      'Auto-created Node - ' || sr.node_id,
      'custom',
      'Unknown',
      'Automatically created to preserve existing sensor_readings data'
    FROM public.sensor_readings sr
    WHERE NOT EXISTS (
      SELECT 1 FROM public.data_nodes dn WHERE dn.node_id = sr.node_id
    )
    ON CONFLICT (node_id) DO NOTHING;
    
    RAISE NOTICE 'Created % placeholder node entries', orphan_count;
  ELSE
    RAISE NOTICE 'No orphaned sensor_readings found. All node_ids exist in data_nodes.';
  END IF;
END $$;

-- Now safe to add foreign key constraint
ALTER TABLE public.sensor_readings 
  DROP CONSTRAINT IF EXISTS sensor_readings_node_id_fkey;

ALTER TABLE public.sensor_readings 
  ADD CONSTRAINT sensor_readings_node_id_fkey 
  FOREIGN KEY (node_id) REFERENCES public.data_nodes(node_id)
  ON DELETE CASCADE;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_sensor_readings_node_id ON public.sensor_readings(node_id);
CREATE INDEX IF NOT EXISTS idx_sensor_readings_timestamp_desc ON public.sensor_readings(timestamp DESC);

-- ============================================================================
-- SECTION 4: CREATE AUTOMATION CONTROL RULES TABLE
-- ============================================================================

DROP TABLE IF EXISTS public.control_rules CASCADE;

CREATE TABLE public.control_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name text NOT NULL,
  description text,
  node_id text REFERENCES public.data_nodes(node_id),  -- NULL means applies to all nodes
  
  -- Trigger conditions
  sensor_type text NOT NULL,                        -- 'temperature', 'humidity', 'air_quality', etc.
  condition_type text NOT NULL,                     -- 'above', 'below', 'between', 'outside_range'
  threshold_value_1 numeric NOT NULL,               -- Primary threshold
  threshold_value_2 numeric,                        -- Secondary threshold (for 'between'/'outside_range')
  
  -- Action to take
  action_type text NOT NULL,                        -- 'notification', 'control_device', 'log_only'
  action_target text,                               -- 'fan', 'ac', 'irrigation', 'ventilation', etc.
  action_command text,                              -- 'turn_on', 'turn_off', 'adjust_speed', etc.
  notification_message text,                        -- Custom notification message
  
  -- Rule metadata
  is_enabled boolean DEFAULT true,
  priority integer DEFAULT 0,                       -- Higher priority rules execute first
  cooldown_minutes integer DEFAULT 5,               -- Minimum time between triggers
  last_triggered_at timestamptz,
  
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  CONSTRAINT control_rules_sensor_type_check CHECK (sensor_type IN (
    'temperature', 'humidity', 'soil_moisture', 'air_quality', 
    'alcohol', 'smoke', 'co2', 'light'
  )),
  CONSTRAINT control_rules_condition_type_check CHECK (condition_type IN (
    'above', 'below', 'between', 'outside_range', 'equals'
  )),
  CONSTRAINT control_rules_action_type_check CHECK (action_type IN (
    'notification', 'control_device', 'log_only', 'alert', 'email'
  ))
);

-- No hardcoded rules - users define their own based on crop selection

-- Indexes for control_rules
CREATE INDEX idx_control_rules_enabled ON public.control_rules(is_enabled) WHERE is_enabled = true;
CREATE INDEX idx_control_rules_sensor_type ON public.control_rules(sensor_type);
CREATE INDEX idx_control_rules_node_id ON public.control_rules(node_id);
CREATE INDEX idx_control_rules_priority ON public.control_rules(priority DESC);

-- RLS policies for control_rules
ALTER TABLE public.control_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view control rules" ON public.control_rules
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage control rules" ON public.control_rules
  FOR ALL USING (auth.role() = 'authenticated');

-- ============================================================================
-- SECTION 5: CREATE CONTROL ACTIONS LOG TABLE
-- ============================================================================

DROP TABLE IF EXISTS public.control_actions_log CASCADE;

CREATE TABLE public.control_actions_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id uuid REFERENCES public.control_rules(id) ON DELETE SET NULL,
  node_id text REFERENCES public.data_nodes(node_id),
  sensor_reading_id uuid REFERENCES public.sensor_readings(id) ON DELETE SET NULL,
  
  -- Action details
  action_type text NOT NULL,
  action_target text,
  action_command text,
  trigger_value numeric,                            -- The sensor value that triggered the rule
  threshold_value numeric,                          -- The threshold that was crossed
  
  -- Status and result
  status text DEFAULT 'pending',                    -- 'pending', 'success', 'failed', 'cancelled'
  execution_time timestamptz DEFAULT now(),
  completion_time timestamptz,
  error_message text,
  
  -- Metadata
  notification_sent boolean DEFAULT false,
  notification_recipients text[],
  
  created_at timestamptz DEFAULT now(),
  
  CONSTRAINT control_actions_log_status_check CHECK (status IN (
    'pending', 'executing', 'success', 'failed', 'cancelled'
  ))
);

-- Indexes for control_actions_log
CREATE INDEX idx_control_actions_log_rule_id ON public.control_actions_log(rule_id);
CREATE INDEX idx_control_actions_log_node_id ON public.control_actions_log(node_id);
CREATE INDEX idx_control_actions_log_execution_time ON public.control_actions_log(execution_time DESC);
CREATE INDEX idx_control_actions_log_status ON public.control_actions_log(status);

-- RLS policies for control_actions_log
ALTER TABLE public.control_actions_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view action logs" ON public.control_actions_log
  FOR SELECT USING (auth.role() = 'authenticated');

-- ============================================================================
-- SECTION 6: CREATE NEWS/ARTICLES TABLE
-- ============================================================================

DROP TABLE IF EXISTS public.news_articles CASCADE;

CREATE TABLE public.news_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Article content
  title text NOT NULL,
  subtitle text,
  content text NOT NULL,                            -- Main article body (supports markdown)
  summary text,                                     -- Short summary for list view
  language text NOT NULL DEFAULT 'en',              -- 'en' or 'hi' for English/Hindi
  
  -- Media
  featured_image_url text,
  thumbnail_url text,
  
  -- Categorization
  category text NOT NULL DEFAULT 'general',         -- 'general', 'crop_care', 'pest_control', 'weather', 'market', 'technology'
  tags text[],                                      -- Array of tags for filtering
  related_crops text[],                             -- Crops this article is relevant for
  
  -- Relevance and importance
  priority integer DEFAULT 0,                       -- Higher priority articles show first
  is_featured boolean DEFAULT false,                -- Featured on homepage
  is_published boolean DEFAULT true,
  
  -- SEO and metadata
  author text,
  source_name text,                                 -- External source if applicable
  source_url text,                                  -- Link to original article
  
  -- Engagement tracking
  view_count integer DEFAULT 0,
  likes_count integer DEFAULT 0,
  
  -- Timestamps
  published_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Admin
  created_by uuid REFERENCES auth.users(id),
  
  CONSTRAINT news_articles_category_check CHECK (category IN (
    'general', 'crop_care', 'pest_control', 'weather', 
    'market_prices', 'technology', 'government_schemes', 
    'best_practices', 'seasonal_tips'
  ))
);

-- No hardcoded articles - populate via API or admin panel

-- ============================================================================
-- SECTION 6B: CREATE CROP PROFILES TABLE FOR DYNAMIC THRESHOLDS
-- ============================================================================

DROP TABLE IF EXISTS public.crop_profiles CASCADE;

CREATE TABLE public.crop_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  crop_name text UNIQUE NOT NULL,                   -- 'Tomato', 'Rice', 'Wheat', etc.
  crop_name_hi text,                                -- Hindi name
  crop_type text NOT NULL,                          -- 'vegetable', 'grain', 'fruit'
  
  -- Optimal environmental ranges
  temp_min numeric NOT NULL,                        -- Minimum temperature (°C)
  temp_max numeric NOT NULL,                        -- Maximum temperature (°C)
  temp_optimal_min numeric,                         -- Ideal minimum
  temp_optimal_max numeric,                         -- Ideal maximum
  
  humidity_min numeric,                             -- Minimum humidity (%)
  humidity_max numeric,                             -- Maximum humidity (%)
  humidity_optimal_min numeric,
  humidity_optimal_max numeric,
  
  soil_moisture_min numeric,                        -- Minimum soil moisture (%)
  soil_moisture_max numeric,
  
  -- Air quality tolerances
  air_quality_max numeric DEFAULT 1500,             -- Max acceptable air quality (ppm)
  co2_min numeric DEFAULT 300,
  co2_max numeric DEFAULT 1200,
  
  -- Growth stages with different requirements
  growth_stages jsonb,                              -- Different thresholds per stage
  
  -- Additional metadata
  description text,
  growing_season text,                              -- 'Summer', 'Winter', 'Year-round'
  water_requirements text,                          -- 'Low', 'Medium', 'High'
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  CONSTRAINT crop_profiles_crop_type_check CHECK (crop_type IN (
    'vegetable', 'grain', 'fruit', 'herb', 'flower', 'other'
  ))
);

-- Insert common crop profiles
INSERT INTO public.crop_profiles (
  crop_name, crop_name_hi, crop_type,
  temp_min, temp_max, temp_optimal_min, temp_optimal_max,
  humidity_min, humidity_max, humidity_optimal_min, humidity_optimal_max,
  soil_moisture_min, soil_moisture_max,
  description, growing_season, water_requirements
) VALUES
  ('Tomato', 'टमाटर', 'vegetable', 
   15, 35, 21, 27,
   50, 85, 60, 75,
   60, 80,
   'Warm season crop requiring consistent moisture', 'Summer', 'Medium'),
  
  ('Rice', 'धान', 'grain',
   20, 38, 25, 32,
   70, 90, 75, 85,
   100, 100,
   'Water-intensive crop requiring flooded conditions', 'Monsoon', 'Very High'),
  
  ('Wheat', 'गेहूं', 'grain',
   10, 25, 15, 22,
   40, 70, 50, 65,
   40, 65,
   'Cool season crop tolerant to drier conditions', 'Winter', 'Medium'),
  
  ('Chili', 'मिर्च', 'vegetable',
   18, 35, 22, 30,
   50, 80, 60, 70,
   55, 75,
   'Warm crop sensitive to overwatering', 'Summer', 'Low-Medium'),
  
  ('Cucumber', 'खीरा', 'vegetable',
   18, 32, 21, 29,
   60, 90, 70, 85,
   65, 85,
   'Requires warm temperatures and high humidity', 'Summer', 'High'),
  
  ('Lettuce', 'सलाद पत्ता', 'vegetable',
   7, 24, 12, 20,
   40, 70, 50, 65,
   50, 70,
   'Cool season leafy vegetable', 'Winter', 'Medium'),
  
  ('Strawberry', 'स्ट्रॉबेरी', 'fruit',
   15, 26, 18, 24,
   60, 80, 65, 75,
   60, 75,
   'Requires cool temperatures and consistent moisture', 'Winter', 'Medium'),
  
  ('Bell Pepper', 'शिमला मिर्च', 'vegetable',
   18, 32, 21, 28,
   50, 80, 60, 70,
   60, 75,
   'Warm season crop similar to tomatoes', 'Summer', 'Medium');

-- Indexes for crop_profiles
CREATE INDEX idx_crop_profiles_crop_name ON public.crop_profiles(crop_name);
CREATE INDEX idx_crop_profiles_crop_type ON public.crop_profiles(crop_type);

-- RLS policies for crop_profiles
ALTER TABLE public.crop_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view crop profiles" ON public.crop_profiles
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage crop profiles" ON public.crop_profiles
  FOR ALL USING (auth.role() = 'authenticated');

-- Indexes for news_articles
CREATE INDEX idx_news_articles_published ON public.news_articles(is_published, published_at DESC);
CREATE INDEX idx_news_articles_category ON public.news_articles(category);
CREATE INDEX idx_news_articles_featured ON public.news_articles(is_featured) WHERE is_featured = true;
CREATE INDEX idx_news_articles_tags ON public.news_articles USING GIN(tags);
CREATE INDEX idx_news_articles_related_crops ON public.news_articles USING GIN(related_crops);
CREATE INDEX idx_news_articles_language ON public.news_articles(language, is_published);

-- RLS policies for news_articles
ALTER TABLE public.news_articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published articles" ON public.news_articles
  FOR SELECT USING (is_published = true);

CREATE POLICY "Authenticated users can manage articles" ON public.news_articles
  FOR ALL USING (auth.role() = 'authenticated');

-- ============================================================================
-- SECTION 6C: CROP-BASED AUTO-RULE GENERATION FUNCTIONS
-- ============================================================================

-- This function auto-creates control rules based on selected crop profile
CREATE OR REPLACE FUNCTION generate_rules_from_crop(
  p_node_id text,
  p_crop_id uuid
) RETURNS void AS $$
DECLARE
  v_crop crop_profiles%ROWTYPE;
  v_node_uuid uuid;
BEGIN
  -- Get crop profile
  SELECT * INTO v_crop FROM crop_profiles WHERE id = p_crop_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Crop not found: %', p_crop_id;
  END IF;

  -- Get node uuid
  SELECT id INTO v_node_uuid FROM data_nodes WHERE node_id = p_node_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Node not found: %', p_node_id;
  END IF;

  -- Delete existing auto-generated rules for this node
  DELETE FROM control_rules 
  WHERE target_node_id = p_node_id 
  AND rule_description LIKE '%[AUTO]%';

  -- Create temperature control rules
  IF v_crop.temp_optimal_min IS NOT NULL THEN
    INSERT INTO control_rules (
      rule_name, rule_description, sensor_type, threshold_condition, threshold_value,
      target_node_id, action_type, action_params, is_active, priority
    ) VALUES (
      v_crop.crop_name || ' - Temperature Low [AUTO]',
      'Auto-generated: Alert when temperature drops below optimal range for ' || v_crop.crop_name,
      'temperature', 'less_than', v_crop.temp_optimal_min,
      p_node_id, 'notify', '{"message": "Temperature too low for ' || v_crop.crop_name || '"}',
      true, 5
    );
  END IF;

  IF v_crop.temp_optimal_max IS NOT NULL THEN
    INSERT INTO control_rules (
      rule_name, rule_description, sensor_type, threshold_condition, threshold_value,
      target_node_id, action_type, action_params, is_active, priority
    ) VALUES (
      v_crop.crop_name || ' - Temperature High [AUTO]',
      'Auto-generated: Alert when temperature exceeds optimal range for ' || v_crop.crop_name,
      'temperature', 'greater_than', v_crop.temp_optimal_max,
      p_node_id, 'notify', '{"message": "Temperature too high for ' || v_crop.crop_name || '"}',
      true, 5
    );
  END IF;

  -- Create humidity control rules
  IF v_crop.humidity_optimal_min IS NOT NULL THEN
    INSERT INTO control_rules (
      rule_name, rule_description, sensor_type, threshold_condition, threshold_value,
      target_node_id, action_type, action_params, is_active, priority
    ) VALUES (
      v_crop.crop_name || ' - Humidity Low [AUTO]',
      'Auto-generated: Alert when humidity drops below optimal range for ' || v_crop.crop_name,
      'humidity', 'less_than', v_crop.humidity_optimal_min,
      p_node_id, 'notify', '{"message": "Humidity too low for ' || v_crop.crop_name || '"}',
      true, 5
    );
  END IF;

  IF v_crop.humidity_optimal_max IS NOT NULL THEN
    INSERT INTO control_rules (
      rule_name, rule_description, sensor_type, threshold_condition, threshold_value,
      target_node_id, action_type, action_params, is_active, priority
    ) VALUES (
      v_crop.crop_name || ' - Humidity High [AUTO]',
      'Auto-generated: Alert when humidity exceeds optimal range for ' || v_crop.crop_name,
      'humidity', 'greater_than', v_crop.humidity_optimal_max,
      p_node_id, 'notify', '{"message": "Humidity too high for ' || v_crop.crop_name || '"}',
      true, 5
    );
  END IF;

  -- Create soil moisture control rules
  IF v_crop.soil_moisture_min IS NOT NULL THEN
    INSERT INTO control_rules (
      rule_name, rule_description, sensor_type, threshold_condition, threshold_value,
      target_node_id, action_type, action_params, is_active, priority
    ) VALUES (
      v_crop.crop_name || ' - Soil Moisture Low [AUTO]',
      'Auto-generated: Alert when soil moisture is too low for ' || v_crop.crop_name,
      'soil_moisture', 'less_than', v_crop.soil_moisture_min,
      p_node_id, 'notify', '{"message": "Soil moisture too low for ' || v_crop.crop_name || ' - Consider irrigation"}',
      true, 8
    );
  END IF;

  -- Create air quality rule
  IF v_crop.air_quality_max IS NOT NULL THEN
    INSERT INTO control_rules (
      rule_name, rule_description, sensor_type, threshold_condition, threshold_value,
      target_node_id, action_type, action_params, is_active, priority
    ) VALUES (
      v_crop.crop_name || ' - Air Quality Alert [AUTO]',
      'Auto-generated: Alert when air quality exceeds safe levels for ' || v_crop.crop_name,
      'air_quality', 'greater_than', v_crop.air_quality_max,
      p_node_id, 'notify', '{"message": "Air quality poor for ' || v_crop.crop_name || ' growth"}',
      true, 7
    );
  END IF;

  -- Log the rule generation
  RAISE NOTICE 'Generated % control rules for crop % on node %', 
    (SELECT COUNT(*) FROM control_rules WHERE target_node_id = p_node_id AND rule_description LIKE '%[AUTO]%'),
    v_crop.crop_name, 
    p_node_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-generate rules when crop is assigned to a node
CREATE OR REPLACE FUNCTION trigger_generate_rules_on_crop_assignment()
RETURNS trigger AS $$
BEGIN
  IF NEW.assigned_crop_id IS NOT NULL AND (OLD.assigned_crop_id IS NULL OR OLD.assigned_crop_id != NEW.assigned_crop_id) THEN
    PERFORM generate_rules_from_crop(NEW.node_id, NEW.assigned_crop_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_auto_generate_rules
  AFTER INSERT OR UPDATE OF assigned_crop_id ON data_nodes
  FOR EACH ROW
  EXECUTE FUNCTION trigger_generate_rules_on_crop_assignment();

-- ============================================================================
-- SECTION 7: CREATE FUNCTIONS FOR AUTOMATION SYSTEM
-- ============================================================================

-- Function to evaluate control rules against sensor data
CREATE OR REPLACE FUNCTION public.evaluate_control_rules(
  p_node_id text,
  p_sensor_type text,
  p_sensor_value numeric
)
RETURNS TABLE(
  rule_id uuid,
  should_trigger boolean,
  action_type text,
  action_target text,
  action_command text,
  notification_message text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cr.id as rule_id,
    CASE 
      WHEN cr.condition_type = 'above' THEN p_sensor_value > cr.threshold_value_1
      WHEN cr.condition_type = 'below' THEN p_sensor_value < cr.threshold_value_1
      WHEN cr.condition_type = 'between' THEN 
        p_sensor_value >= cr.threshold_value_1 AND p_sensor_value <= cr.threshold_value_2
      WHEN cr.condition_type = 'outside_range' THEN 
        p_sensor_value < cr.threshold_value_1 OR p_sensor_value > cr.threshold_value_2
      WHEN cr.condition_type = 'equals' THEN p_sensor_value = cr.threshold_value_1
      ELSE false
    END as should_trigger,
    cr.action_type,
    cr.action_target,
    cr.action_command,
    cr.notification_message
  FROM public.control_rules cr
  WHERE cr.is_enabled = true
    AND cr.sensor_type = p_sensor_type
    AND (cr.node_id = p_node_id OR cr.node_id IS NULL)
    AND (
      cr.last_triggered_at IS NULL OR 
      cr.last_triggered_at < NOW() - INTERVAL '1 minute' * cr.cooldown_minutes
    )
  ORDER BY cr.priority DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log control action
CREATE OR REPLACE FUNCTION public.log_control_action(
  p_rule_id uuid,
  p_node_id text,
  p_sensor_reading_id uuid,
  p_action_type text,
  p_action_target text,
  p_action_command text,
  p_trigger_value numeric,
  p_threshold_value numeric
)
RETURNS uuid AS $$
DECLARE
  new_log_id uuid;
BEGIN
  INSERT INTO public.control_actions_log (
    rule_id, node_id, sensor_reading_id, action_type, action_target,
    action_command, trigger_value, threshold_value, status
  ) VALUES (
    p_rule_id, p_node_id, p_sensor_reading_id, p_action_type, p_action_target,
    p_action_command, p_trigger_value, p_threshold_value, 'pending'
  )
  RETURNING id INTO new_log_id;
  
  -- Update the rule's last_triggered_at
  UPDATE public.control_rules
  SET last_triggered_at = NOW()
  WHERE id = p_rule_id;
  
  RETURN new_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get personalized news for user
CREATE OR REPLACE FUNCTION public.get_personalized_news(
  p_user_id uuid DEFAULT NULL,
  p_limit integer DEFAULT 10
)
RETURNS TABLE(
  id uuid,
  title text,
  subtitle text,
  summary text,
  category text,
  tags text[],
  featured_image_url text,
  is_featured boolean,
  published_at timestamptz,
  relevance_score integer
) AS $$
BEGIN
  -- If user_id provided, could personalize based on their crops/preferences
  -- For now, return recent articles with featured ones first
  RETURN QUERY
  SELECT 
    na.id,
    na.title,
    na.subtitle,
    na.summary,
    na.category,
    na.tags,
    na.featured_image_url,
    na.is_featured,
    na.published_at,
    CASE 
      WHEN na.is_featured THEN 100
      ELSE na.priority
    END as relevance_score
  FROM public.news_articles na
  WHERE na.is_published = true
  ORDER BY 
    na.is_featured DESC,
    na.priority DESC,
    na.published_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment article view count (atomic)
CREATE OR REPLACE FUNCTION public.increment_article_views(article_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE public.news_articles
  SET view_count = view_count + 1
  WHERE id = article_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment article likes (atomic)
CREATE OR REPLACE FUNCTION public.increment_article_likes(article_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE public.news_articles
  SET likes_count = likes_count + 1
  WHERE id = article_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- SECTION 8: UPDATE TRIGGERS AND FUNCTIONS
-- ============================================================================

-- Generic updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_data_nodes_updated_at
  BEFORE UPDATE ON public.data_nodes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_control_rules_updated_at
  BEFORE UPDATE ON public.control_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_news_articles_updated_at
  BEFORE UPDATE ON public.news_articles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- SECTION 9: ENABLE REALTIME SUBSCRIPTIONS
-- ============================================================================

-- Enable realtime for critical tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.data_nodes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.control_actions_log;
ALTER PUBLICATION supabase_realtime ADD TABLE public.news_articles;

-- ============================================================================
-- SECTION 10: COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE public.data_nodes IS 'Unified table for all sensor nodes (replaces separate air/soil node tables)';
COMMENT ON TABLE public.control_rules IS 'Automation rules that trigger actions based on sensor thresholds';
COMMENT ON TABLE public.control_actions_log IS 'History of all automated control actions and their results';
COMMENT ON TABLE public.news_articles IS 'Farming news, tips, and personalized suggestions for users';

COMMENT ON FUNCTION public.evaluate_control_rules IS 'Checks which control rules should trigger for given sensor data';
COMMENT ON FUNCTION public.log_control_action IS 'Records an automated control action in the log';
COMMENT ON FUNCTION public.get_personalized_news IS 'Retrieves relevant news articles for a user';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Log migration completion
DO $$
BEGIN
  RAISE NOTICE 'Database restructure completed successfully!';
  RAISE NOTICE 'New tables created: data_nodes, control_rules, control_actions_log, news_articles';
  RAISE NOTICE 'Removed tables: ai_suggestions, node_metadata';
  RAISE NOTICE 'Automation system ready for use';
END $$;
