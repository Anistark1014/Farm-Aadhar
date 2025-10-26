-- ⚡ ONE-LINE FIX: Run this BEFORE the main migration
-- This creates data_nodes entries for all existing sensor_readings node_ids

-- Create table if not exists
CREATE TABLE IF NOT EXISTS public.data_nodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id text UNIQUE NOT NULL,
  node_name text NOT NULL,
  node_type text DEFAULT 'general',
  location text,
  assigned_user_id uuid REFERENCES public.user_profiles(user_id),
  is_active boolean DEFAULT true,
  last_active_timestamp timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  notes text,
  hardware_version text,
  firmware_version text,
  CONSTRAINT data_nodes_node_type_check CHECK (node_type IN ('general', 'greenhouse', 'field', 'storage', 'custom'))
);

-- Auto-create nodes for ALL existing sensor_readings
INSERT INTO public.data_nodes (node_id, node_name, node_type, location, notes)
SELECT DISTINCT 
  sr.node_id,
  CASE 
    WHEN sr.node_id = 'air_node_01' THEN 'Main Data Node'
    WHEN sr.node_id = 'simulation-node' THEN 'Simulation Node'
    ELSE 'Auto-created - ' || sr.node_id
  END,
  CASE 
    WHEN sr.node_id = 'simulation-node' THEN 'custom'
    ELSE 'general'
  END,
  CASE 
    WHEN sr.node_id = 'air_node_01' THEN 'Primary Greenhouse'
    WHEN sr.node_id = 'simulation-node' THEN 'Virtual (Test Data)'
    ELSE 'Unknown'
  END,
  CASE 
    WHEN sr.node_id = 'air_node_01' THEN 'ESP32 with DHT11, MQ-135, MQ-3, MQ-2'
    WHEN sr.node_id = 'simulation-node' THEN 'Dashboard simulation data generator'
    ELSE 'Auto-created to preserve existing data'
  END
FROM public.sensor_readings sr
ON CONFLICT (node_id) DO NOTHING;

-- Verify (should return 0)
SELECT COUNT(DISTINCT sr.node_id) as orphaned_count
FROM public.sensor_readings sr
WHERE NOT EXISTS (SELECT 1 FROM public.data_nodes dn WHERE dn.node_id = sr.node_id);

-- Show what was created
SELECT node_id, node_name, node_type, location FROM public.data_nodes ORDER BY created_at;

-- ✅ NOW you can run the main migration file!
