-- TABLES SETUP FOR ZIVA CRM

-- 1. Create Malls Table
CREATE TABLE malls (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  address TEXT,
  contact_person TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create Roles Enum
CREATE TYPE user_role AS ENUM ('admin', 'client');

-- 3. Create Profiles Table (extends Supabase Auth)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  role user_role DEFAULT 'client',
  mall_id UUID REFERENCES malls(id),
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create Businesses Table (Dükkanlar)
CREATE TABLE businesses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mall_id UUID REFERENCES malls(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Create Maintenance Records
CREATE TABLE maintenance_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  admin_id UUID REFERENCES profiles(id),
  description TEXT NOT NULL,
  service_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Create Media/Photos
CREATE TABLE maintenance_photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  record_id UUID REFERENCES maintenance_records(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ENABLE RLS (Row Level Security)
ALTER TABLE malls ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_photos ENABLE ROW LEVEL SECURITY;

-- POLICIES EXAMPLES
-- Policy: Only Admins can insert/update anything
-- Policy: Clients can only see data where mall_id matches their own

CREATE POLICY "Clients can view their own mall data" ON malls
  FOR SELECT USING (id IN (SELECT mall_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Clients can view businesses in their mall" ON businesses
  FOR SELECT USING (mall_id IN (SELECT mall_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Clients can view records in their mall" ON maintenance_records
  FOR SELECT USING (
    business_id IN (
      SELECT id FROM businesses WHERE mall_id IN (
        SELECT mall_id FROM profiles WHERE id = auth.uid()
      )
    )
  );
