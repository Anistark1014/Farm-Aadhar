-- ============================================================================
-- Farm Aadhar - Quick Fix for Foreign Key Constraint Error
-- Run this if you got: "sensor_readings_node_id_fkey" constraint violation
-- ============================================================================

-- Step 1: Check what node_ids exist in sensor_readings
SELECT DISTINCT node_id, COUNT(*) as reading_count
FROM public.sensor_readings
GROUP BY node_id
ORDER BY reading_count DESC;

-- Step 2: Check what node_ids exist in data_nodes (if table exists)
SELECT node_id, node_name, node_type
FROM public.data_nodes
ORDER BY created_at;

-- Step 3: Create data_nodes entries for all existing sensor_readings node_ids
-- This ensures no orphaned data
INSERT INTO public.data_nodes (node_id, node_name, node_type, location, notes)
SELECT DISTINCT 
  sr.node_id,
  CASE 
    WHEN sr.node_id = 'air_node_01' THEN 'Main Data Node'
    WHEN sr.node_id = 'simulation-node' THEN 'Simulation Node'
    WHEN sr.node_id LIKE 'test%' THEN 'Test Node - ' || sr.node_id
    ELSE 'Auto-created Node - ' || sr.node_id
  END as node_name,
  CASE 
    WHEN sr.node_id = 'simulation-node' THEN 'custom'
    WHEN sr.node_id LIKE 'test%' THEN 'custom'
    ELSE 'general'
  END as node_type,
  CASE 
    WHEN sr.node_id = 'air_node_01' THEN 'Primary Greenhouse'
    WHEN sr.node_id = 'simulation-node' THEN 'Virtual'
    ELSE 'Unknown'
  END as location,
  CASE 
    WHEN sr.node_id = 'air_node_01' THEN 'ESP32 with DHT11, MQ-135, MQ-3, MQ-2 sensors'
    WHEN sr.node_id = 'simulation-node' THEN 'Test data generator for development'
    ELSE 'Automatically created to preserve existing sensor_readings data'
  END as notes
FROM public.sensor_readings sr
WHERE NOT EXISTS (
  SELECT 1 FROM public.data_nodes dn WHERE dn.node_id = sr.node_id
)
ON CONFLICT (node_id) DO NOTHING;

-- Step 4: Verify all node_ids are now present
-- This should return 0 rows if successful
SELECT DISTINCT sr.node_id
FROM public.sensor_readings sr
LEFT JOIN public.data_nodes dn ON dn.node_id = sr.node_id
WHERE dn.node_id IS NULL;

-- Step 5: Now safe to add the foreign key constraint
ALTER TABLE public.sensor_readings 
  DROP CONSTRAINT IF EXISTS sensor_readings_node_id_fkey;

ALTER TABLE public.sensor_readings 
  ADD CONSTRAINT sensor_readings_node_id_fkey 
  FOREIGN KEY (node_id) REFERENCES public.data_nodes(node_id)
  ON DELETE CASCADE;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Foreign key constraint added successfully!';
  RAISE NOTICE 'All existing sensor_readings node_ids now have data_nodes entries.';
END $$;
