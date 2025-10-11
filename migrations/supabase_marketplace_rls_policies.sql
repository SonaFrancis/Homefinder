-- =====================================================
-- MARKETPLACE TABLES RLS POLICIES
-- Allow users to manage their own items
-- =====================================================

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can insert own electronics" ON electronics;
DROP POLICY IF EXISTS "Users can update own electronics" ON electronics;
DROP POLICY IF EXISTS "Users can delete own electronics" ON electronics;
DROP POLICY IF EXISTS "Public can view approved electronics" ON electronics;

DROP POLICY IF EXISTS "Users can insert own cars" ON cars;
DROP POLICY IF EXISTS "Users can update own cars" ON cars;
DROP POLICY IF EXISTS "Users can delete own cars" ON cars;
DROP POLICY IF EXISTS "Public can view approved cars" ON cars;

DROP POLICY IF EXISTS "Users can insert own house_items" ON house_items;
DROP POLICY IF EXISTS "Users can update own house_items" ON house_items;
DROP POLICY IF EXISTS "Users can delete own house_items" ON house_items;
DROP POLICY IF EXISTS "Public can view approved house_items" ON house_items;

DROP POLICY IF EXISTS "Users can insert own fashion" ON fashion;
DROP POLICY IF EXISTS "Users can update own fashion" ON fashion;
DROP POLICY IF EXISTS "Users can delete own fashion" ON fashion;
DROP POLICY IF EXISTS "Public can view approved fashion" ON fashion;

DROP POLICY IF EXISTS "Users can insert own cosmetics" ON cosmetics;
DROP POLICY IF EXISTS "Users can update own cosmetics" ON cosmetics;
DROP POLICY IF EXISTS "Users can delete own cosmetics" ON cosmetics;
DROP POLICY IF EXISTS "Public can view approved cosmetics" ON cosmetics;

DROP POLICY IF EXISTS "Users can insert own businesses" ON businesses;
DROP POLICY IF EXISTS "Users can update own businesses" ON businesses;
DROP POLICY IF EXISTS "Users can delete own businesses" ON businesses;
DROP POLICY IF EXISTS "Public can view approved businesses" ON businesses;

DROP POLICY IF EXISTS "Users can insert own properties_for_sale" ON properties_for_sale;
DROP POLICY IF EXISTS "Users can update own properties_for_sale" ON properties_for_sale;
DROP POLICY IF EXISTS "Users can delete own properties_for_sale" ON properties_for_sale;
DROP POLICY IF EXISTS "Public can view approved properties_for_sale" ON properties_for_sale;

DROP POLICY IF EXISTS "Users can insert electronics media" ON electronics_media;
DROP POLICY IF EXISTS "Public can view electronics media" ON electronics_media;
DROP POLICY IF EXISTS "Users can insert cars media" ON cars_media;
DROP POLICY IF EXISTS "Public can view cars media" ON cars_media;
DROP POLICY IF EXISTS "Users can insert house_items media" ON house_items_media;
DROP POLICY IF EXISTS "Public can view house_items media" ON house_items_media;
DROP POLICY IF EXISTS "Users can insert fashion media" ON fashion_media;
DROP POLICY IF EXISTS "Public can view fashion media" ON fashion_media;
DROP POLICY IF EXISTS "Users can insert cosmetics media" ON cosmetics_media;
DROP POLICY IF EXISTS "Public can view cosmetics media" ON cosmetics_media;
DROP POLICY IF EXISTS "Users can insert businesses media" ON businesses_media;
DROP POLICY IF EXISTS "Public can view businesses media" ON businesses_media;
DROP POLICY IF EXISTS "Users can insert properties_for_sale media" ON properties_for_sale_media;
DROP POLICY IF EXISTS "Public can view properties_for_sale media" ON properties_for_sale_media;

DROP POLICY IF EXISTS "Authenticated users can upload marketplace media" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own marketplace media" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own marketplace media" ON storage.objects;
DROP POLICY IF EXISTS "Public can view marketplace media" ON storage.objects;

-- Electronics
CREATE POLICY "Users can insert own electronics"
ON electronics FOR INSERT
WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "Users can update own electronics"
ON electronics FOR UPDATE
USING (auth.uid() = seller_id);

CREATE POLICY "Users can delete own electronics"
ON electronics FOR DELETE
USING (auth.uid() = seller_id);

CREATE POLICY "Public can view approved electronics"
ON electronics FOR SELECT
USING (listing_status = 'approved' OR auth.uid() = seller_id);

-- Cars
CREATE POLICY "Users can insert own cars"
ON cars FOR INSERT
WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "Users can update own cars"
ON cars FOR UPDATE
USING (auth.uid() = seller_id);

CREATE POLICY "Users can delete own cars"
ON cars FOR DELETE
USING (auth.uid() = seller_id);

CREATE POLICY "Public can view approved cars"
ON cars FOR SELECT
USING (listing_status = 'approved' OR auth.uid() = seller_id);

-- House Items
CREATE POLICY "Users can insert own house_items"
ON house_items FOR INSERT
WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "Users can update own house_items"
ON house_items FOR UPDATE
USING (auth.uid() = seller_id);

CREATE POLICY "Users can delete own house_items"
ON house_items FOR DELETE
USING (auth.uid() = seller_id);

CREATE POLICY "Public can view approved house_items"
ON house_items FOR SELECT
USING (listing_status = 'approved' OR auth.uid() = seller_id);

-- Fashion
CREATE POLICY "Users can insert own fashion"
ON fashion FOR INSERT
WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "Users can update own fashion"
ON fashion FOR UPDATE
USING (auth.uid() = seller_id);

CREATE POLICY "Users can delete own fashion"
ON fashion FOR DELETE
USING (auth.uid() = seller_id);

CREATE POLICY "Public can view approved fashion"
ON fashion FOR SELECT
USING (listing_status = 'approved' OR auth.uid() = seller_id);

-- Cosmetics
CREATE POLICY "Users can insert own cosmetics"
ON cosmetics FOR INSERT
WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "Users can update own cosmetics"
ON cosmetics FOR UPDATE
USING (auth.uid() = seller_id);

CREATE POLICY "Users can delete own cosmetics"
ON cosmetics FOR DELETE
USING (auth.uid() = seller_id);

CREATE POLICY "Public can view approved cosmetics"
ON cosmetics FOR SELECT
USING (listing_status = 'approved' OR auth.uid() = seller_id);

-- Businesses
CREATE POLICY "Users can insert own businesses"
ON businesses FOR INSERT
WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "Users can update own businesses"
ON businesses FOR UPDATE
USING (auth.uid() = seller_id);

CREATE POLICY "Users can delete own businesses"
ON businesses FOR DELETE
USING (auth.uid() = seller_id);

CREATE POLICY "Public can view approved businesses"
ON businesses FOR SELECT
USING (listing_status = 'approved' OR auth.uid() = seller_id);

-- Properties for Sale
CREATE POLICY "Users can insert own properties_for_sale"
ON properties_for_sale FOR INSERT
WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "Users can update own properties_for_sale"
ON properties_for_sale FOR UPDATE
USING (auth.uid() = seller_id);

CREATE POLICY "Users can delete own properties_for_sale"
ON properties_for_sale FOR DELETE
USING (auth.uid() = seller_id);

CREATE POLICY "Public can view approved properties_for_sale"
ON properties_for_sale FOR SELECT
USING (listing_status = 'approved' OR auth.uid() = seller_id);

-- Media tables policies (allow insertion and viewing)
CREATE POLICY "Users can insert electronics media"
ON electronics_media FOR INSERT
WITH CHECK (true);

CREATE POLICY "Public can view electronics media"
ON electronics_media FOR SELECT
USING (true);

CREATE POLICY "Users can insert cars media"
ON cars_media FOR INSERT
WITH CHECK (true);

CREATE POLICY "Public can view cars media"
ON cars_media FOR SELECT
USING (true);

CREATE POLICY "Users can insert house_items media"
ON house_items_media FOR INSERT
WITH CHECK (true);

CREATE POLICY "Public can view house_items media"
ON house_items_media FOR SELECT
USING (true);

CREATE POLICY "Users can insert fashion media"
ON fashion_media FOR INSERT
WITH CHECK (true);

CREATE POLICY "Public can view fashion media"
ON fashion_media FOR SELECT
USING (true);

CREATE POLICY "Users can insert cosmetics media"
ON cosmetics_media FOR INSERT
WITH CHECK (true);

CREATE POLICY "Public can view cosmetics media"
ON cosmetics_media FOR SELECT
USING (true);

CREATE POLICY "Users can insert businesses media"
ON businesses_media FOR INSERT
WITH CHECK (true);

CREATE POLICY "Public can view businesses media"
ON businesses_media FOR SELECT
USING (true);

CREATE POLICY "Users can insert properties_for_sale media"
ON properties_for_sale_media FOR INSERT
WITH CHECK (true);

CREATE POLICY "Public can view properties_for_sale media"
ON properties_for_sale_media FOR SELECT
USING (true);

-- =====================================================
-- STORAGE BUCKET POLICIES FOR marketplace-media
-- Allow authenticated users to upload and view files
-- =====================================================

-- Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload marketplace media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'marketplace-media');

-- Allow authenticated users to update files
CREATE POLICY "Users can update own marketplace media"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'marketplace-media');

-- Allow authenticated users to delete files
CREATE POLICY "Users can delete own marketplace media"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'marketplace-media');

-- Allow everyone to view marketplace media (public read)
CREATE POLICY "Public can view marketplace media"
ON storage.objects FOR SELECT
USING (bucket_id = 'marketplace-media');

SELECT 'Marketplace RLS policies created successfully' AS status;
