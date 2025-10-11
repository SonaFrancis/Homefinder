# Export Development Database to Production

## 🎯 Goal
Copy your complete working development database (tables, policies, buckets) to production.

## ✅ Method 1: Using Supabase Dashboard (Easiest - 5 minutes)

### Step 1: Export Development Schema

1. **Go to Development Supabase Project**
   - https://supabase.com/dashboard

2. **Open SQL Editor**

3. **Click "Schema" tab** (top of SQL editor)

4. **Copy the entire schema** - This includes:
   - All table definitions
   - All indexes
   - All triggers
   - All functions
   - RLS policies

5. **Save to a file** (optional but recommended)

### Step 2: Import to Production

1. **Go to Production Supabase Project**

2. **Open SQL Editor**

3. **Create New Query**

4. **Paste the schema you copied**

5. **Run the query**

Done! ✅

---

## 📦 Method 2: Export Tables Individually (More Control)

If you want to be selective, export each table:

### For Each Table:

1. **In Development Supabase**, go to **Table Editor**

2. **Click on a table** (e.g., `rental_properties`)

3. **Click the "..." menu** → **View SQL Definition**

4. **Copy the CREATE TABLE statement**

5. **Paste into Production SQL Editor** and run

### Example Table Export:

```sql
-- rental_properties table
CREATE TABLE rental_properties (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  landlord_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  property_type text,
  price numeric,
  city text,
  street text,
  -- ... rest of columns
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE rental_properties ENABLE ROW LEVEL SECURITY;

-- Add policies
CREATE POLICY "Public rental properties are viewable by everyone"
  ON rental_properties FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own rental properties"
  ON rental_properties FOR INSERT
  WITH CHECK (auth.uid() = landlord_id);

-- Add indexes
CREATE INDEX idx_rental_properties_landlord ON rental_properties(landlord_id);
CREATE INDEX idx_rental_properties_city ON rental_properties(city);
```

---

## 🗄️ Method 3: Use Supabase CLI (Most Reliable)

### Install Supabase CLI:

```bash
# Install
npm install -g supabase

# Login
supabase login
```

### Link to Development Project:

```bash
# Get your project ref from dashboard URL
# URL looks like: https://app.supabase.com/project/XXXXX
# XXXXX is your project ref

supabase link --project-ref YOUR_DEV_PROJECT_REF
```

### Generate Migration from Development:

```bash
# This creates a migration file with your current schema
supabase db pull

# This creates a file in: supabase/migrations/TIMESTAMP_remote_schema.sql
```

### Apply to Production:

```bash
# Link to production
supabase link --project-ref YOUR_PROD_PROJECT_REF

# Push the migration
supabase db push
```

---

## 🪣 Storage Buckets Setup

### In Production Supabase:

1. **Go to Storage** in left sidebar

2. **Create these buckets** (click "New bucket"):

   **Bucket 1: property-images**
   - Name: `property-images`
   - Public: ✅ Yes
   - File size limit: 5MB
   - Allowed MIME types: `image/*, video/*`

   **Bucket 2: marketplace-images**
   - Name: `marketplace-images`
   - Public: ✅ Yes
   - File size limit: 5MB
   - Allowed MIME types: `image/*, video/*`

   **Bucket 3: profile-pictures**
   - Name: `profile-pictures`
   - Public: ✅ Yes
   - File size limit: 2MB
   - Allowed MIME types: `image/*`

3. **Set Bucket Policies** for each:

   Click on bucket → **Policies** → **New Policy** → **For full customization**

   ```sql
   -- Policy for public read access
   CREATE POLICY "Public Access"
   ON storage.objects FOR SELECT
   USING (bucket_id = 'property-images');

   -- Policy for authenticated uploads
   CREATE POLICY "Authenticated users can upload"
   ON storage.objects FOR INSERT
   WITH CHECK (
     bucket_id = 'property-images'
     AND auth.role() = 'authenticated'
   );

   -- Policy for users to delete own files
   CREATE POLICY "Users can delete own files"
   ON storage.objects FOR DELETE
   USING (
     bucket_id = 'property-images'
     AND auth.uid() = owner
   );
   ```

   Repeat for other buckets, changing `property-images` to the bucket name.

---

## 🎯 Quick Copy-Paste Schema (Your Main Tables)

If you want to manually copy, here are your main tables to create:

### 1. Profiles Table

```sql
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text,
  phone_number text,
  whatsapp_number text,
  profile_picture_url text,
  role text DEFAULT 'user',
  city text,
  bio text,
  is_verified boolean DEFAULT false,
  verified_at timestamptz,
  verified_by uuid,
  average_rating numeric DEFAULT 0,
  total_reviews integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);
```

### 2. Rental Properties Table

```sql
CREATE TABLE rental_properties (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  landlord_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  subscription_id uuid,
  title text NOT NULL,
  description text,
  property_type text,
  price numeric NOT NULL,
  city text NOT NULL,
  street text,
  landmarks text,
  latitude numeric,
  longitude numeric,
  bedrooms integer,
  bathrooms integer,
  square_meters numeric,
  amenities text[],
  is_furnished boolean DEFAULT false,
  is_featured boolean DEFAULT false,
  is_available boolean DEFAULT true,
  listing_status text DEFAULT 'pending',
  contact_number text,
  approved_at timestamptz,
  approved_by uuid,
  rejection_reason text,
  views_count integer DEFAULT 0,
  whatsapp_clicks integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE rental_properties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view approved properties"
  ON rental_properties FOR SELECT
  USING (listing_status = 'approved' OR landlord_id = auth.uid());

CREATE POLICY "Landlords can create properties"
  ON rental_properties FOR INSERT
  WITH CHECK (auth.uid() = landlord_id);

CREATE POLICY "Landlords can update own properties"
  ON rental_properties FOR UPDATE
  USING (auth.uid() = landlord_id);
```

### 3. Rental Property Media

```sql
CREATE TABLE rental_property_media (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id uuid REFERENCES rental_properties(id) ON DELETE CASCADE,
  media_url text NOT NULL,
  media_type text CHECK (media_type IN ('image', 'video')),
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE rental_property_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Media is viewable by everyone"
  ON rental_property_media FOR SELECT
  USING (true);
```

### 4. Categories & Marketplace Tables

```sql
-- Categories
CREATE TABLE categories (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text UNIQUE NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  icon_name text,
  created_at timestamptz DEFAULT now()
);

-- Electronics
CREATE TABLE electronics (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  price numeric NOT NULL,
  city text NOT NULL,
  contact_number text,
  condition text,
  brand text,
  is_sold boolean DEFAULT false,
  views_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Repeat similar structure for:
-- fashion, cosmetics, house_items, cars, properties_for_sale, businesses
```

---

## 🚀 Recommended Approach

**For fastest deployment:**

1. **Use Method 1** (Supabase Dashboard Schema copy)
   - Easiest, gets everything including policies
   - Takes 5 minutes

2. **Manually create storage buckets**
   - Quick and straightforward
   - Set policies as shown above

3. **Run the disable subscription SQL:**
   ```sql
   -- From: migrations/disable_subscription_enforcement.sql
   ```

4. **Verify everything works:**
   ```sql
   -- Check tables exist
   SELECT table_name FROM information_schema.tables
   WHERE table_schema = 'public';

   -- Check buckets exist
   SELECT * FROM storage.buckets;
   ```

---

## ✅ Verification Checklist

After migration, verify:

- [ ] All tables exist
- [ ] RLS is enabled on all tables
- [ ] Policies are created
- [ ] Storage buckets created (property-images, marketplace-images, profile-pictures)
- [ ] Bucket policies set to public read
- [ ] Can insert test data
- [ ] Can upload test image to bucket

---

## 🆘 If Something Goes Wrong

**Reset and start over:**

```sql
-- Drop all tables (CAUTION - this deletes everything!)
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;
```

Then re-run your schema export.

---

**Ready to proceed?**

Once your production database has all tables and buckets, let me know and we'll continue with the EAS build! 🚀
