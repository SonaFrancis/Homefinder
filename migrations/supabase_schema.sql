-- =====================================================
-- Cameroon Property & Marketplace App - Database Schema
-- SEPARATE TABLES FOR EACH MARKETPLACE CATEGORY
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- ENUMS
-- =====================================================

CREATE TYPE user_role AS ENUM ('student', 'landlord', 'seller', 'admin');
CREATE TYPE subscription_status AS ENUM ('active', 'expired', 'cancelled', 'pending');
CREATE TYPE subscription_plan AS ENUM ('standard', 'premium');
CREATE TYPE listing_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE support_status AS ENUM ('open', 'in_progress', 'resolved', 'closed');
CREATE TYPE item_condition AS ENUM ('new', 'like_new', 'good', 'fair', 'poor');
CREATE TYPE fuel_type AS ENUM ('petrol', 'diesel', 'electric', 'hybrid');
CREATE TYPE transmission_type AS ENUM ('manual', 'automatic');
CREATE TYPE gender_type AS ENUM ('male', 'female', 'unisex');

-- =====================================================
-- PROFILES TABLE (extends Supabase auth.users)
-- =====================================================

CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    phone_number TEXT,
    profile_picture_url TEXT,
    role user_role NOT NULL DEFAULT 'student',
    city TEXT,
    bio TEXT,
    whatsapp_number TEXT,
    is_verified BOOLEAN DEFAULT FALSE,
    verified_at TIMESTAMP WITH TIME ZONE,
    verified_by UUID REFERENCES auth.users(id),
    average_rating DECIMAL(3, 2) DEFAULT 0.00,
    total_reviews INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- SUBSCRIPTION PLANS TABLE
-- =====================================================

CREATE TABLE subscription_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name subscription_plan NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    duration_days INTEGER NOT NULL,
    max_listings INTEGER NOT NULL,
    image_quota_per_month INTEGER NOT NULL,
    video_quota_per_month INTEGER NOT NULL,
    max_images_per_listing INTEGER DEFAULT 15,
    max_videos_per_listing INTEGER DEFAULT 5,
    featured_listing BOOLEAN DEFAULT FALSE,
    priority_support BOOLEAN DEFAULT FALSE,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- USER SUBSCRIPTIONS TABLE
-- =====================================================

CREATE TABLE user_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES subscription_plans(id),
    status subscription_status DEFAULT 'pending',
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    listings_used INTEGER DEFAULT 0,
    images_used_this_month INTEGER DEFAULT 0,
    videos_used_this_month INTEGER DEFAULT 0,
    last_quota_reset TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    payment_reference TEXT,
    payment_method TEXT,
    auto_renew BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT valid_dates CHECK (end_date > start_date)
);

-- =====================================================
-- RENTAL PROPERTIES TABLE
-- =====================================================

CREATE TABLE rental_properties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    landlord_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES user_subscriptions(id),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    property_type TEXT NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    city TEXT NOT NULL,
    street TEXT,
    landmarks TEXT,
    contact_number TEXT,
    bedrooms INTEGER,
    bathrooms INTEGER,
    square_meters DECIMAL(10, 2),
    amenities TEXT[],
    is_furnished BOOLEAN DEFAULT FALSE,
    is_featured BOOLEAN DEFAULT FALSE,
    is_available BOOLEAN DEFAULT TRUE,
    listing_status listing_status DEFAULT 'pending',
    approved_at TIMESTAMP WITH TIME ZONE,
    approved_by UUID REFERENCES profiles(id),
    rejection_reason TEXT,
    views_count INTEGER DEFAULT 0,
    whatsapp_clicks INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- RENTAL PROPERTY MEDIA TABLE
-- =====================================================

CREATE TABLE rental_property_media (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID NOT NULL REFERENCES rental_properties(id) ON DELETE CASCADE,
    media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
    media_url TEXT NOT NULL,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- ELECTRONICS TABLE
-- =====================================================

CREATE TABLE electronics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    seller_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES user_subscriptions(id),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    city TEXT NOT NULL,
    contact_number TEXT,

    -- Electronics-specific fields
    brand TEXT,
    model TEXT,
    condition item_condition NOT NULL,
    warranty TEXT,

    is_negotiable BOOLEAN DEFAULT TRUE,
    is_featured BOOLEAN DEFAULT FALSE,
    is_available BOOLEAN DEFAULT TRUE,
    listing_status listing_status DEFAULT 'pending',
    approved_at TIMESTAMP WITH TIME ZONE,
    approved_by UUID REFERENCES profiles(id),
    rejection_reason TEXT,
    views_count INTEGER DEFAULT 0,
    whatsapp_clicks INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- ELECTRONICS MEDIA TABLE
-- =====================================================

CREATE TABLE electronics_media (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_id UUID NOT NULL REFERENCES electronics(id) ON DELETE CASCADE,
    media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
    media_url TEXT NOT NULL,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- FASHION TABLE
-- =====================================================

CREATE TABLE fashion (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    seller_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES user_subscriptions(id),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    city TEXT NOT NULL,
    contact_number TEXT,

    -- Fashion-specific fields
    brand TEXT,
    size TEXT,
    color TEXT,
    material TEXT,
    gender gender_type,
    made_in TEXT,
    condition item_condition NOT NULL,

    is_negotiable BOOLEAN DEFAULT TRUE,
    is_featured BOOLEAN DEFAULT FALSE,
    is_available BOOLEAN DEFAULT TRUE,
    listing_status listing_status DEFAULT 'pending',
    approved_at TIMESTAMP WITH TIME ZONE,
    approved_by UUID REFERENCES profiles(id),
    rejection_reason TEXT,
    views_count INTEGER DEFAULT 0,
    whatsapp_clicks INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- FASHION MEDIA TABLE
-- =====================================================

CREATE TABLE fashion_media (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_id UUID NOT NULL REFERENCES fashion(id) ON DELETE CASCADE,
    media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
    media_url TEXT NOT NULL,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- COSMETICS TABLE
-- =====================================================

CREATE TABLE cosmetics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    seller_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES user_subscriptions(id),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    city TEXT NOT NULL,
    contact_number TEXT,

    -- Cosmetics-specific fields
    brand TEXT,
    product_type TEXT,
    volume TEXT,
    scent_type TEXT,
    skin_type TEXT,
    expiry_date DATE,
    made_in TEXT,
    is_organic BOOLEAN DEFAULT FALSE,
    condition item_condition NOT NULL,

    is_negotiable BOOLEAN DEFAULT TRUE,
    is_featured BOOLEAN DEFAULT FALSE,
    is_available BOOLEAN DEFAULT TRUE,
    listing_status listing_status DEFAULT 'pending',
    approved_at TIMESTAMP WITH TIME ZONE,
    approved_by UUID REFERENCES profiles(id),
    rejection_reason TEXT,
    views_count INTEGER DEFAULT 0,
    whatsapp_clicks INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- COSMETICS MEDIA TABLE
-- =====================================================

CREATE TABLE cosmetics_media (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_id UUID NOT NULL REFERENCES cosmetics(id) ON DELETE CASCADE,
    media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
    media_url TEXT NOT NULL,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- HOUSE ITEMS TABLE
-- =====================================================

CREATE TABLE house_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    seller_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES user_subscriptions(id),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    city TEXT NOT NULL,
    contact_number TEXT,

    -- House items-specific fields
    category_type TEXT,
    brand TEXT,
    made_in TEXT,
    condition item_condition NOT NULL,

    is_negotiable BOOLEAN DEFAULT TRUE,
    is_featured BOOLEAN DEFAULT FALSE,
    is_available BOOLEAN DEFAULT TRUE,
    listing_status listing_status DEFAULT 'pending',
    approved_at TIMESTAMP WITH TIME ZONE,
    approved_by UUID REFERENCES profiles(id),
    rejection_reason TEXT,
    views_count INTEGER DEFAULT 0,
    whatsapp_clicks INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- HOUSE ITEMS MEDIA TABLE
-- =====================================================

CREATE TABLE house_items_media (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_id UUID NOT NULL REFERENCES house_items(id) ON DELETE CASCADE,
    media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
    media_url TEXT NOT NULL,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- CARS TABLE
-- =====================================================

CREATE TABLE cars (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    seller_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES user_subscriptions(id),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    city TEXT NOT NULL,
    contact_number TEXT,

    -- Cars-specific fields
    make TEXT,
    model TEXT,
    year INTEGER,
    mileage INTEGER,
    fuel_type fuel_type,
    transmission transmission_type,
    condition item_condition NOT NULL,

    is_negotiable BOOLEAN DEFAULT TRUE,
    is_featured BOOLEAN DEFAULT FALSE,
    is_available BOOLEAN DEFAULT TRUE,
    listing_status listing_status DEFAULT 'pending',
    approved_at TIMESTAMP WITH TIME ZONE,
    approved_by UUID REFERENCES profiles(id),
    rejection_reason TEXT,
    views_count INTEGER DEFAULT 0,
    whatsapp_clicks INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- CARS MEDIA TABLE
-- =====================================================

CREATE TABLE cars_media (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_id UUID NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
    media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
    media_url TEXT NOT NULL,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- PROPERTIES FOR SALE TABLE
-- Note: Form has "properties" category but no specific fields
-- Simplified to match form capabilities
-- =====================================================

CREATE TABLE properties_for_sale (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    seller_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES user_subscriptions(id),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    city TEXT NOT NULL,
    contact_number TEXT,

    -- Property-specific fields
    property_type TEXT,
    address TEXT,
    bedrooms INTEGER,
    bathrooms INTEGER,
    condition item_condition NOT NULL,

    is_negotiable BOOLEAN DEFAULT TRUE,
    is_featured BOOLEAN DEFAULT FALSE,
    is_available BOOLEAN DEFAULT TRUE,
    listing_status listing_status DEFAULT 'pending',
    approved_at TIMESTAMP WITH TIME ZONE,
    approved_by UUID REFERENCES profiles(id),
    rejection_reason TEXT,
    views_count INTEGER DEFAULT 0,
    whatsapp_clicks INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- PROPERTIES FOR SALE MEDIA TABLE
-- =====================================================

CREATE TABLE properties_for_sale_media (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_id UUID NOT NULL REFERENCES properties_for_sale(id) ON DELETE CASCADE,
    media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
    media_url TEXT NOT NULL,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- BUSINESSES TABLE
-- =====================================================

CREATE TABLE businesses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    seller_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES user_subscriptions(id),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    city TEXT NOT NULL,
    contact_number TEXT,

    -- Business-specific fields
    business_type TEXT,
    industry TEXT,
    year_established INTEGER,
    number_of_employees INTEGER,
    monthly_revenue DECIMAL(10, 2),
    annual_revenue DECIMAL(10, 2),
    location_address TEXT,
    condition item_condition NOT NULL,

    is_negotiable BOOLEAN DEFAULT TRUE,
    is_featured BOOLEAN DEFAULT FALSE,
    is_available BOOLEAN DEFAULT TRUE,
    listing_status listing_status DEFAULT 'pending',
    approved_at TIMESTAMP WITH TIME ZONE,
    approved_by UUID REFERENCES profiles(id),
    rejection_reason TEXT,
    views_count INTEGER DEFAULT 0,
    whatsapp_clicks INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- BUSINESSES MEDIA TABLE
-- =====================================================

CREATE TABLE businesses_media (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
    media_url TEXT NOT NULL,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- REVIEWS TABLE
-- =====================================================

CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reviewer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    reviewed_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    listing_type TEXT NOT NULL, -- 'rental', 'electronics', 'fashion', etc.
    listing_id UUID NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    is_visible BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT no_self_review CHECK (reviewer_id != reviewed_user_id)
);

-- =====================================================
-- SUPPORT MESSAGES TABLE
-- =====================================================

CREATE TABLE support_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    status support_status DEFAULT 'open',
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    assigned_to UUID REFERENCES profiles(id),
    resolved_at TIMESTAMP WITH TIME ZONE,
    admin_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- FAVORITES TABLE
-- =====================================================

CREATE TABLE favorites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    listing_type TEXT NOT NULL, -- 'rental', 'electronics', 'fashion', etc.
    listing_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, listing_type, listing_id)
);

-- =====================================================
-- PAYMENT TRANSACTIONS TABLE
-- =====================================================

CREATE TABLE payment_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES user_subscriptions(id),
    amount DECIMAL(10, 2) NOT NULL,
    currency TEXT DEFAULT 'XAF',
    payment_method TEXT NOT NULL,
    payment_reference TEXT UNIQUE,
    status TEXT DEFAULT 'pending',
    payment_provider TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- INDEXES
-- =====================================================

-- Profiles indexes
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_city ON profiles(city);
CREATE INDEX idx_profiles_verified ON profiles(is_verified);

-- Rental properties indexes
CREATE INDEX idx_rental_properties_landlord ON rental_properties(landlord_id);
CREATE INDEX idx_rental_properties_city ON rental_properties(city);
CREATE INDEX idx_rental_properties_status ON rental_properties(listing_status);
CREATE INDEX idx_rental_properties_created ON rental_properties(created_at DESC);

-- Electronics indexes
CREATE INDEX idx_electronics_seller ON electronics(seller_id);
CREATE INDEX idx_electronics_city ON electronics(city);
CREATE INDEX idx_electronics_status ON electronics(listing_status);
CREATE INDEX idx_electronics_brand ON electronics(brand);

-- Fashion indexes
CREATE INDEX idx_fashion_seller ON fashion(seller_id);
CREATE INDEX idx_fashion_city ON fashion(city);
CREATE INDEX idx_fashion_status ON fashion(listing_status);
CREATE INDEX idx_fashion_gender ON fashion(gender);
CREATE INDEX idx_fashion_size ON fashion(size);

-- Cosmetics indexes
CREATE INDEX idx_cosmetics_seller ON cosmetics(seller_id);
CREATE INDEX idx_cosmetics_city ON cosmetics(city);
CREATE INDEX idx_cosmetics_status ON cosmetics(listing_status);
CREATE INDEX idx_cosmetics_brand ON cosmetics(brand);

-- House items indexes
CREATE INDEX idx_house_items_seller ON house_items(seller_id);
CREATE INDEX idx_house_items_city ON house_items(city);
CREATE INDEX idx_house_items_status ON house_items(listing_status);

-- Cars indexes
CREATE INDEX idx_cars_seller ON cars(seller_id);
CREATE INDEX idx_cars_city ON cars(city);
CREATE INDEX idx_cars_status ON cars(listing_status);
CREATE INDEX idx_cars_make ON cars(make);
CREATE INDEX idx_cars_year ON cars(year);

-- Properties for sale indexes
CREATE INDEX idx_properties_sale_seller ON properties_for_sale(seller_id);
CREATE INDEX idx_properties_sale_city ON properties_for_sale(city);
CREATE INDEX idx_properties_sale_status ON properties_for_sale(listing_status);

-- Businesses indexes
CREATE INDEX idx_businesses_seller ON businesses(seller_id);
CREATE INDEX idx_businesses_city ON businesses(city);
CREATE INDEX idx_businesses_status ON businesses(listing_status);

-- Reviews indexes
CREATE INDEX idx_reviews_reviewer ON reviews(reviewer_id);
CREATE INDEX idx_reviews_reviewed_user ON reviews(reviewed_user_id);
CREATE INDEX idx_reviews_listing ON reviews(listing_type, listing_id);

-- Favorites indexes
CREATE INDEX idx_favorites_user ON favorites(user_id);
CREATE INDEX idx_favorites_listing ON favorites(listing_type, listing_id);

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE rental_properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE rental_property_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE electronics ENABLE ROW LEVEL SECURITY;
ALTER TABLE electronics_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE fashion ENABLE ROW LEVEL SECURITY;
ALTER TABLE fashion_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE cosmetics ENABLE ROW LEVEL SECURITY;
ALTER TABLE cosmetics_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE house_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE house_items_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE cars ENABLE ROW LEVEL SECURITY;
ALTER TABLE cars_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties_for_sale ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties_for_sale_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE businesses_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Public profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Subscription plans policies
CREATE POLICY "Anyone can view subscription plans" ON subscription_plans FOR SELECT USING (is_active = true);

-- User subscriptions policies
CREATE POLICY "Users can view own subscriptions" ON user_subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own subscriptions" ON user_subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Rental properties policies
CREATE POLICY "Anyone can view approved properties" ON rental_properties FOR SELECT USING (listing_status = 'approved' AND is_available = true);
CREATE POLICY "Landlords can view own properties" ON rental_properties FOR SELECT USING (auth.uid() = landlord_id);
CREATE POLICY "Landlords can insert own properties" ON rental_properties FOR INSERT WITH CHECK (auth.uid() = landlord_id);
CREATE POLICY "Landlords can update own properties" ON rental_properties FOR UPDATE USING (auth.uid() = landlord_id);
CREATE POLICY "Landlords can delete own properties" ON rental_properties FOR DELETE USING (auth.uid() = landlord_id);

-- Rental property media policies
CREATE POLICY "Anyone can view approved property media" ON rental_property_media FOR SELECT USING (
    EXISTS (SELECT 1 FROM rental_properties WHERE rental_properties.id = rental_property_media.property_id AND rental_properties.listing_status = 'approved')
);
CREATE POLICY "Landlords can manage own property media" ON rental_property_media FOR ALL USING (
    EXISTS (SELECT 1 FROM rental_properties WHERE rental_properties.id = rental_property_media.property_id AND rental_properties.landlord_id = auth.uid())
);

-- Electronics policies
CREATE POLICY "Anyone can view approved electronics" ON electronics FOR SELECT USING (listing_status = 'approved' AND is_available = true);
CREATE POLICY "Sellers can view own electronics" ON electronics FOR SELECT USING (auth.uid() = seller_id);
CREATE POLICY "Sellers can insert own electronics" ON electronics FOR INSERT WITH CHECK (auth.uid() = seller_id);
CREATE POLICY "Sellers can update own electronics" ON electronics FOR UPDATE USING (auth.uid() = seller_id);
CREATE POLICY "Sellers can delete own electronics" ON electronics FOR DELETE USING (auth.uid() = seller_id);

CREATE POLICY "Anyone can view approved electronics media" ON electronics_media FOR SELECT USING (
    EXISTS (SELECT 1 FROM electronics WHERE electronics.id = electronics_media.item_id AND electronics.listing_status = 'approved')
);
CREATE POLICY "Sellers can manage own electronics media" ON electronics_media FOR ALL USING (
    EXISTS (SELECT 1 FROM electronics WHERE electronics.id = electronics_media.item_id AND electronics.seller_id = auth.uid())
);

-- Fashion policies
CREATE POLICY "Anyone can view approved fashion" ON fashion FOR SELECT USING (listing_status = 'approved' AND is_available = true);
CREATE POLICY "Sellers can view own fashion" ON fashion FOR SELECT USING (auth.uid() = seller_id);
CREATE POLICY "Sellers can insert own fashion" ON fashion FOR INSERT WITH CHECK (auth.uid() = seller_id);
CREATE POLICY "Sellers can update own fashion" ON fashion FOR UPDATE USING (auth.uid() = seller_id);
CREATE POLICY "Sellers can delete own fashion" ON fashion FOR DELETE USING (auth.uid() = seller_id);

CREATE POLICY "Anyone can view approved fashion media" ON fashion_media FOR SELECT USING (
    EXISTS (SELECT 1 FROM fashion WHERE fashion.id = fashion_media.item_id AND fashion.listing_status = 'approved')
);
CREATE POLICY "Sellers can manage own fashion media" ON fashion_media FOR ALL USING (
    EXISTS (SELECT 1 FROM fashion WHERE fashion.id = fashion_media.item_id AND fashion.seller_id = auth.uid())
);

-- Cosmetics policies
CREATE POLICY "Anyone can view approved cosmetics" ON cosmetics FOR SELECT USING (listing_status = 'approved' AND is_available = true);
CREATE POLICY "Sellers can view own cosmetics" ON cosmetics FOR SELECT USING (auth.uid() = seller_id);
CREATE POLICY "Sellers can insert own cosmetics" ON cosmetics FOR INSERT WITH CHECK (auth.uid() = seller_id);
CREATE POLICY "Sellers can update own cosmetics" ON cosmetics FOR UPDATE USING (auth.uid() = seller_id);
CREATE POLICY "Sellers can delete own cosmetics" ON cosmetics FOR DELETE USING (auth.uid() = seller_id);

CREATE POLICY "Anyone can view approved cosmetics media" ON cosmetics_media FOR SELECT USING (
    EXISTS (SELECT 1 FROM cosmetics WHERE cosmetics.id = cosmetics_media.item_id AND cosmetics.listing_status = 'approved')
);
CREATE POLICY "Sellers can manage own cosmetics media" ON cosmetics_media FOR ALL USING (
    EXISTS (SELECT 1 FROM cosmetics WHERE cosmetics.id = cosmetics_media.item_id AND cosmetics.seller_id = auth.uid())
);

-- House items policies
CREATE POLICY "Anyone can view approved house items" ON house_items FOR SELECT USING (listing_status = 'approved' AND is_available = true);
CREATE POLICY "Sellers can view own house items" ON house_items FOR SELECT USING (auth.uid() = seller_id);
CREATE POLICY "Sellers can insert own house items" ON house_items FOR INSERT WITH CHECK (auth.uid() = seller_id);
CREATE POLICY "Sellers can update own house items" ON house_items FOR UPDATE USING (auth.uid() = seller_id);
CREATE POLICY "Sellers can delete own house items" ON house_items FOR DELETE USING (auth.uid() = seller_id);

CREATE POLICY "Anyone can view approved house items media" ON house_items_media FOR SELECT USING (
    EXISTS (SELECT 1 FROM house_items WHERE house_items.id = house_items_media.item_id AND house_items.listing_status = 'approved')
);
CREATE POLICY "Sellers can manage own house items media" ON house_items_media FOR ALL USING (
    EXISTS (SELECT 1 FROM house_items WHERE house_items.id = house_items_media.item_id AND house_items.seller_id = auth.uid())
);

-- Cars policies
CREATE POLICY "Anyone can view approved cars" ON cars FOR SELECT USING (listing_status = 'approved' AND is_available = true);
CREATE POLICY "Sellers can view own cars" ON cars FOR SELECT USING (auth.uid() = seller_id);
CREATE POLICY "Sellers can insert own cars" ON cars FOR INSERT WITH CHECK (auth.uid() = seller_id);
CREATE POLICY "Sellers can update own cars" ON cars FOR UPDATE USING (auth.uid() = seller_id);
CREATE POLICY "Sellers can delete own cars" ON cars FOR DELETE USING (auth.uid() = seller_id);

CREATE POLICY "Anyone can view approved cars media" ON cars_media FOR SELECT USING (
    EXISTS (SELECT 1 FROM cars WHERE cars.id = cars_media.item_id AND cars.listing_status = 'approved')
);
CREATE POLICY "Sellers can manage own cars media" ON cars_media FOR ALL USING (
    EXISTS (SELECT 1 FROM cars WHERE cars.id = cars_media.item_id AND cars.seller_id = auth.uid())
);

-- Properties for sale policies
CREATE POLICY "Anyone can view approved properties for sale" ON properties_for_sale FOR SELECT USING (listing_status = 'approved' AND is_available = true);
CREATE POLICY "Sellers can view own properties for sale" ON properties_for_sale FOR SELECT USING (auth.uid() = seller_id);
CREATE POLICY "Sellers can insert own properties for sale" ON properties_for_sale FOR INSERT WITH CHECK (auth.uid() = seller_id);
CREATE POLICY "Sellers can update own properties for sale" ON properties_for_sale FOR UPDATE USING (auth.uid() = seller_id);
CREATE POLICY "Sellers can delete own properties for sale" ON properties_for_sale FOR DELETE USING (auth.uid() = seller_id);

CREATE POLICY "Anyone can view approved properties for sale media" ON properties_for_sale_media FOR SELECT USING (
    EXISTS (SELECT 1 FROM properties_for_sale WHERE properties_for_sale.id = properties_for_sale_media.item_id AND properties_for_sale.listing_status = 'approved')
);
CREATE POLICY "Sellers can manage own properties for sale media" ON properties_for_sale_media FOR ALL USING (
    EXISTS (SELECT 1 FROM properties_for_sale WHERE properties_for_sale.id = properties_for_sale_media.item_id AND properties_for_sale.seller_id = auth.uid())
);

-- Businesses policies
CREATE POLICY "Anyone can view approved businesses" ON businesses FOR SELECT USING (listing_status = 'approved' AND is_available = true);
CREATE POLICY "Sellers can view own businesses" ON businesses FOR SELECT USING (auth.uid() = seller_id);
CREATE POLICY "Sellers can insert own businesses" ON businesses FOR INSERT WITH CHECK (auth.uid() = seller_id);
CREATE POLICY "Sellers can update own businesses" ON businesses FOR UPDATE USING (auth.uid() = seller_id);
CREATE POLICY "Sellers can delete own businesses" ON businesses FOR DELETE USING (auth.uid() = seller_id);

CREATE POLICY "Anyone can view approved businesses media" ON businesses_media FOR SELECT USING (
    EXISTS (SELECT 1 FROM businesses WHERE businesses.id = businesses_media.item_id AND businesses.listing_status = 'approved')
);
CREATE POLICY "Sellers can manage own businesses media" ON businesses_media FOR ALL USING (
    EXISTS (SELECT 1 FROM businesses WHERE businesses.id = businesses_media.item_id AND businesses.seller_id = auth.uid())
);

-- Reviews policies
CREATE POLICY "Anyone can view visible reviews" ON reviews FOR SELECT USING (is_visible = true);
CREATE POLICY "Users can create reviews" ON reviews FOR INSERT WITH CHECK (auth.uid() = reviewer_id);
CREATE POLICY "Users can update own reviews" ON reviews FOR UPDATE USING (auth.uid() = reviewer_id);
CREATE POLICY "Users can delete own reviews" ON reviews FOR DELETE USING (auth.uid() = reviewer_id);

-- Support messages policies
CREATE POLICY "Users can view own support messages" ON support_messages FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create support messages" ON support_messages FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own support messages" ON support_messages FOR UPDATE USING (auth.uid() = user_id);

-- Favorites policies
CREATE POLICY "Users can view own favorites" ON favorites FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own favorites" ON favorites FOR ALL USING (auth.uid() = user_id);

-- Payment transactions policies
CREATE POLICY "Users can view own transactions" ON payment_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own transactions" ON payment_transactions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- FUNCTIONS & TRIGGERS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscription_plans_updated_at BEFORE UPDATE ON subscription_plans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_subscriptions_updated_at BEFORE UPDATE ON user_subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rental_properties_updated_at BEFORE UPDATE ON rental_properties
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_electronics_updated_at BEFORE UPDATE ON electronics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fashion_updated_at BEFORE UPDATE ON fashion
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cosmetics_updated_at BEFORE UPDATE ON cosmetics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_house_items_updated_at BEFORE UPDATE ON house_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cars_updated_at BEFORE UPDATE ON cars
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_properties_for_sale_updated_at BEFORE UPDATE ON properties_for_sale
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_businesses_updated_at BEFORE UPDATE ON businesses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON reviews
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_support_messages_updated_at BEFORE UPDATE ON support_messages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_transactions_updated_at BEFORE UPDATE ON payment_transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to check subscription before posting
CREATE OR REPLACE FUNCTION check_subscription_before_post()
RETURNS TRIGGER AS $$
DECLARE
    active_subscription RECORD;
BEGIN
    -- Get active subscription
    SELECT us.*, sp.max_listings
    INTO active_subscription
    FROM user_subscriptions us
    JOIN subscription_plans sp ON us.plan_id = sp.id
    WHERE us.user_id = NEW.seller_id
    AND us.status = 'active'
    AND us.end_date > NOW()
    ORDER BY us.end_date DESC
    LIMIT 1;

    IF active_subscription IS NULL THEN
        RAISE EXCEPTION 'Active subscription required to post listings. Please subscribe to continue.';
    END IF;

    IF active_subscription.listings_used >= active_subscription.max_listings THEN
        RAISE EXCEPTION 'Listing limit reached for current subscription plan.';
    END IF;

    NEW.subscription_id = active_subscription.id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply subscription check triggers to all marketplace tables
CREATE TRIGGER check_subscription_rental BEFORE INSERT ON rental_properties
    FOR EACH ROW EXECUTE FUNCTION check_subscription_before_post();

CREATE TRIGGER check_subscription_electronics BEFORE INSERT ON electronics
    FOR EACH ROW EXECUTE FUNCTION check_subscription_before_post();

CREATE TRIGGER check_subscription_fashion BEFORE INSERT ON fashion
    FOR EACH ROW EXECUTE FUNCTION check_subscription_before_post();

CREATE TRIGGER check_subscription_cosmetics BEFORE INSERT ON cosmetics
    FOR EACH ROW EXECUTE FUNCTION check_subscription_before_post();

CREATE TRIGGER check_subscription_house_items BEFORE INSERT ON house_items
    FOR EACH ROW EXECUTE FUNCTION check_subscription_before_post();

CREATE TRIGGER check_subscription_cars BEFORE INSERT ON cars
    FOR EACH ROW EXECUTE FUNCTION check_subscription_before_post();

CREATE TRIGGER check_subscription_properties_sale BEFORE INSERT ON properties_for_sale
    FOR EACH ROW EXECUTE FUNCTION check_subscription_before_post();

CREATE TRIGGER check_subscription_businesses BEFORE INSERT ON businesses
    FOR EACH ROW EXECUTE FUNCTION check_subscription_before_post();

-- Function to increment listings counter
CREATE OR REPLACE FUNCTION increment_listings_counter()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE user_subscriptions
    SET listings_used = listings_used + 1
    WHERE id = NEW.subscription_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply increment triggers
CREATE TRIGGER increment_rental_listings AFTER INSERT ON rental_properties
    FOR EACH ROW EXECUTE FUNCTION increment_listings_counter();

CREATE TRIGGER increment_electronics_listings AFTER INSERT ON electronics
    FOR EACH ROW EXECUTE FUNCTION increment_listings_counter();

CREATE TRIGGER increment_fashion_listings AFTER INSERT ON fashion
    FOR EACH ROW EXECUTE FUNCTION increment_listings_counter();

CREATE TRIGGER increment_cosmetics_listings AFTER INSERT ON cosmetics
    FOR EACH ROW EXECUTE FUNCTION increment_listings_counter();

CREATE TRIGGER increment_house_items_listings AFTER INSERT ON house_items
    FOR EACH ROW EXECUTE FUNCTION increment_listings_counter();

CREATE TRIGGER increment_cars_listings AFTER INSERT ON cars
    FOR EACH ROW EXECUTE FUNCTION increment_listings_counter();

CREATE TRIGGER increment_properties_sale_listings AFTER INSERT ON properties_for_sale
    FOR EACH ROW EXECUTE FUNCTION increment_listings_counter();

CREATE TRIGGER increment_businesses_listings AFTER INSERT ON businesses
    FOR EACH ROW EXECUTE FUNCTION increment_listings_counter();

-- Function to check media quota
CREATE OR REPLACE FUNCTION check_media_quota_function()
RETURNS TRIGGER AS $$
DECLARE
    active_subscription RECORD;
    owner_id UUID;
    table_prefix TEXT;
BEGIN
    -- Determine table and get owner
    table_prefix := replace(TG_TABLE_NAME, '_media', '');

    EXECUTE format('SELECT seller_id FROM %I WHERE id = $1', table_prefix)
    INTO owner_id
    USING COALESCE(NEW.item_id, NEW.property_id);

    -- Get subscription
    SELECT us.*, sp.image_quota_per_month, sp.video_quota_per_month, sp.max_images_per_listing, sp.max_videos_per_listing
    INTO active_subscription
    FROM user_subscriptions us
    JOIN subscription_plans sp ON us.plan_id = sp.id
    WHERE us.user_id = owner_id
    AND us.status = 'active'
    AND us.end_date > NOW()
    ORDER BY us.end_date DESC
    LIMIT 1;

    IF active_subscription IS NULL THEN
        RAISE EXCEPTION 'Active subscription required to upload media';
    END IF;

    -- Reset quota if new month
    IF active_subscription.last_quota_reset < date_trunc('month', NOW()) THEN
        UPDATE user_subscriptions
        SET images_used_this_month = 0,
            videos_used_this_month = 0,
            last_quota_reset = NOW()
        WHERE id = active_subscription.id;

        active_subscription.images_used_this_month := 0;
        active_subscription.videos_used_this_month := 0;
    END IF;

    -- Check quotas
    IF NEW.media_type = 'image' THEN
        IF active_subscription.images_used_this_month >= active_subscription.image_quota_per_month THEN
            RAISE EXCEPTION 'Monthly image quota exceeded';
        END IF;
    ELSIF NEW.media_type = 'video' THEN
        IF active_subscription.videos_used_this_month >= active_subscription.video_quota_per_month THEN
            RAISE EXCEPTION 'Monthly video quota exceeded';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to increment media usage
CREATE OR REPLACE FUNCTION increment_media_usage_function()
RETURNS TRIGGER AS $$
DECLARE
    owner_id UUID;
    table_prefix TEXT;
BEGIN
    table_prefix := replace(TG_TABLE_NAME, '_media', '');

    EXECUTE format('SELECT seller_id FROM %I WHERE id = $1', table_prefix)
    INTO owner_id
    USING COALESCE(NEW.item_id, NEW.property_id);

    IF NEW.media_type = 'image' THEN
        UPDATE user_subscriptions
        SET images_used_this_month = images_used_this_month + 1
        WHERE user_id = owner_id AND status = 'active' AND end_date > NOW();
    ELSIF NEW.media_type = 'video' THEN
        UPDATE user_subscriptions
        SET videos_used_this_month = videos_used_this_month + 1
        WHERE user_id = owner_id AND status = 'active' AND end_date > NOW();
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply media quota triggers
CREATE TRIGGER check_rental_media_quota BEFORE INSERT ON rental_property_media
    FOR EACH ROW EXECUTE FUNCTION check_media_quota_function();

CREATE TRIGGER increment_rental_media AFTER INSERT ON rental_property_media
    FOR EACH ROW EXECUTE FUNCTION increment_media_usage_function();

-- Function to update user rating
CREATE OR REPLACE FUNCTION update_user_rating_function()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE profiles
    SET average_rating = (
        SELECT COALESCE(AVG(rating), 0)
        FROM reviews
        WHERE reviewed_user_id = NEW.reviewed_user_id AND is_visible = true
    ),
    total_reviews = (
        SELECT COUNT(*)
        FROM reviews
        WHERE reviewed_user_id = NEW.reviewed_user_id AND is_visible = true
    )
    WHERE id = NEW.reviewed_user_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_rating_on_review_insert AFTER INSERT ON reviews
    FOR EACH ROW EXECUTE FUNCTION update_user_rating_function();

CREATE TRIGGER update_rating_on_review_update AFTER UPDATE ON reviews
    FOR EACH ROW EXECUTE FUNCTION update_user_rating_function();

-- =====================================================
-- SEED DATA - Subscription Plans
-- =====================================================

INSERT INTO subscription_plans (
    name,
    display_name,
    price,
    duration_days,
    max_listings,
    image_quota_per_month,
    video_quota_per_month,
    max_images_per_listing,
    max_videos_per_listing,
    featured_listing,
    priority_support,
    description
) VALUES
(
    'standard',
    'Standard Plan',
    10000.00,
    30,
    10,
    50,
    10,
    10,
    3,
    false,
    false,
    'Perfect for individuals - Post up to 10 listings with 50 images and 10 videos per month'
),
(
    'premium',
    'Premium Plan',
    25000.00,
    30,
    50,
    200,
    50,
    15,
    5,
    true,
    true,
    'Best for professionals - Post up to 50 listings with 200 images and 50 videos per month, plus featured placement and priority support'
);

-- =====================================================
-- CREATE STORAGE BUCKETS
-- =====================================================

-- Insert storage buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  (
    'profile-pictures',
    'profile-pictures',
    true,
    5242880,  -- 5MB
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
  ),
  (
    'rental-property-media',
    'rental-property-media',
    true,
    52428800,  -- 50MB
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'video/mp4', 'video/quicktime', 'video/x-msvideo']
  ),
  (
    'marketplace-media',
    'marketplace-media',
    true,
    52428800,  -- 50MB
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'video/mp4', 'video/quicktime', 'video/x-msvideo']
  )
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- STORAGE POLICIES
-- =====================================================
-- NOTE: Storage policies must be created manually in Supabase Dashboard
-- Go to Storage > Policies to create these policies:
--
-- 1. "Public files are viewable by everyone" (SELECT)
--    USING: bucket_id IN ('profile-pictures', 'rental-property-media', 'marketplace-media')
--
-- 2. "Authenticated users can upload own files" (INSERT)
--    WITH CHECK: auth.role() = 'authenticated' AND
--                bucket_id IN ('profile-pictures', 'rental-property-media', 'marketplace-media') AND
--                (storage.foldername(name))[1] = auth.uid()::text
--
-- 3. "Users can update own files" (UPDATE)
--    USING: auth.uid()::text = (storage.foldername(name))[1] AND
--           bucket_id IN ('profile-pictures', 'rental-property-media', 'marketplace-media')
--
-- 4. "Users can delete own files" (DELETE)
--    USING: auth.uid()::text = (storage.foldername(name))[1] AND
--           bucket_id IN ('profile-pictures', 'rental-property-media', 'marketplace-media')

-- =====================================================
-- UTILITY FUNCTIONS
-- =====================================================

-- Function to get total storage used by user
CREATE OR REPLACE FUNCTION get_user_storage_usage(user_uuid UUID)
RETURNS BIGINT AS $$
BEGIN
  RETURN (
    SELECT COALESCE(SUM((metadata->>'size')::bigint), 0)
    FROM storage.objects
    WHERE (storage.foldername(name))[1] = user_uuid::text
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment view count
CREATE OR REPLACE FUNCTION increment_views(
  listing_table TEXT,
  listing_uuid UUID
)
RETURNS VOID AS $$
BEGIN
  EXECUTE format(
    'UPDATE %I SET views_count = views_count + 1 WHERE id = $1',
    listing_table
  ) USING listing_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment WhatsApp clicks
CREATE OR REPLACE FUNCTION increment_whatsapp_clicks(
  listing_table TEXT,
  listing_uuid UUID
)
RETURNS VOID AS $$
BEGIN
  EXECUTE format(
    'UPDATE %I SET whatsapp_clicks = whatsapp_clicks + 1 WHERE id = $1',
    listing_table
  ) USING listing_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- HELPER VIEWS FOR EASY QUERYING
-- =====================================================

-- View: All marketplace listings combined (for homepage "All Items" view)
CREATE OR REPLACE VIEW all_marketplace_listings AS
SELECT
  id,
  seller_id,
  'electronics' as category,
  title,
  description,
  price,
  city,
  brand as detail_1,
  model as detail_2,
  condition::text as detail_3,
  is_featured,
  is_available,
  listing_status,
  whatsapp_clicks,
  created_at
FROM electronics
UNION ALL
SELECT
  id,
  seller_id,
  'fashion' as category,
  title,
  description,
  price,
  city,
  brand as detail_1,
  size as detail_2,
  gender::text as detail_3,
  is_featured,
  is_available,
  listing_status,
  whatsapp_clicks,
  created_at
FROM fashion
UNION ALL
SELECT
  id,
  seller_id,
  'cosmetics' as category,
  title,
  description,
  price,
  city,
  brand as detail_1,
  product_type as detail_2,
  NULL as detail_3,
  is_featured,
  is_available,
  listing_status,
  whatsapp_clicks,
  created_at
FROM cosmetics
UNION ALL
SELECT
  id,
  seller_id,
  'house_items' as category,
  title,
  description,
  price,
  city,
  category_type as detail_1,
  brand as detail_2,
  condition::text as detail_3,
  is_featured,
  is_available,
  listing_status,
  whatsapp_clicks,
  created_at
FROM house_items
UNION ALL
SELECT
  id,
  seller_id,
  'cars' as category,
  title,
  description,
  price,
  city,
  make as detail_1,
  model as detail_2,
  year::text as detail_3,
  is_featured,
  is_available,
  listing_status,
  whatsapp_clicks,
  created_at
FROM cars
UNION ALL
SELECT
  id,
  seller_id,
  'properties_for_sale' as category,
  title,
  description,
  price,
  city,
  property_type as detail_1,
  address as detail_2,
  NULL as detail_3,
  is_featured,
  is_available,
  listing_status,
  whatsapp_clicks,
  created_at
FROM properties_for_sale
UNION ALL
SELECT
  id,
  seller_id,
  'businesses' as category,
  title,
  description,
  price,
  city,
  business_type as detail_1,
  industry as detail_2,
  NULL as detail_3,
  is_featured,
  is_available,
  listing_status,
  whatsapp_clicks,
  created_at
FROM businesses;

-- =====================================================
-- ADMIN HELPER FUNCTIONS
-- =====================================================

-- Function: Approve listing
CREATE OR REPLACE FUNCTION approve_listing(
  listing_table TEXT,
  listing_uuid UUID,
  admin_uuid UUID
)
RETURNS VOID AS $$
BEGIN
  EXECUTE format(
    'UPDATE %I SET listing_status = ''approved'', approved_at = NOW(), approved_by = $1 WHERE id = $2',
    listing_table
  ) USING admin_uuid, listing_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Reject listing
CREATE OR REPLACE FUNCTION reject_listing(
  listing_table TEXT,
  listing_uuid UUID,
  reason TEXT
)
RETURNS VOID AS $$
BEGIN
  EXECUTE format(
    'UPDATE %I SET listing_status = ''rejected'', rejection_reason = $1 WHERE id = $2',
    listing_table
  ) USING reason, listing_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Verify user profile
CREATE OR REPLACE FUNCTION verify_user(
  user_uuid UUID,
  admin_uuid UUID
)
RETURNS VOID AS $$
BEGIN
  UPDATE profiles
  SET is_verified = true,
      verified_at = NOW(),
      verified_by = admin_uuid
  WHERE id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- ANALYTICS FUNCTIONS (PREMIUM FEATURE)
-- =====================================================

-- Function: Get user's listing analytics
CREATE OR REPLACE FUNCTION get_user_analytics(user_uuid UUID)
RETURNS TABLE(
  category TEXT,
  total_listings BIGINT,
  total_views BIGINT,
  total_whatsapp_clicks BIGINT,
  avg_views_per_listing NUMERIC,
  avg_clicks_per_listing NUMERIC,
  conversion_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH all_user_listings AS (
    SELECT 'rental_properties' as category, views_count, whatsapp_clicks
    FROM rental_properties WHERE landlord_id = user_uuid
    UNION ALL
    SELECT 'electronics', views_count, whatsapp_clicks
    FROM electronics WHERE seller_id = user_uuid
    UNION ALL
    SELECT 'fashion', views_count, whatsapp_clicks
    FROM fashion WHERE seller_id = user_uuid
    UNION ALL
    SELECT 'cosmetics', views_count, whatsapp_clicks
    FROM cosmetics WHERE seller_id = user_uuid
    UNION ALL
    SELECT 'house_items', views_count, whatsapp_clicks
    FROM house_items WHERE seller_id = user_uuid
    UNION ALL
    SELECT 'cars', views_count, whatsapp_clicks
    FROM cars WHERE seller_id = user_uuid
    UNION ALL
    SELECT 'properties_for_sale', views_count, whatsapp_clicks
    FROM properties_for_sale WHERE seller_id = user_uuid
    UNION ALL
    SELECT 'businesses', views_count, whatsapp_clicks
    FROM businesses WHERE seller_id = user_uuid
  )
  SELECT
    category,
    COUNT(*)::BIGINT as total_listings,
    SUM(views_count)::BIGINT as total_views,
    SUM(whatsapp_clicks)::BIGINT as total_whatsapp_clicks,
    ROUND(AVG(views_count), 2) as avg_views_per_listing,
    ROUND(AVG(whatsapp_clicks), 2) as avg_clicks_per_listing,
    CASE
      WHEN SUM(views_count) > 0 THEN
        ROUND((SUM(whatsapp_clicks)::NUMERIC / SUM(views_count)::NUMERIC) * 100, 2)
      ELSE 0
    END as conversion_rate
  FROM all_user_listings
  GROUP BY category;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get individual listing performance
CREATE OR REPLACE FUNCTION get_listing_analytics(
  listing_table TEXT,
  listing_uuid UUID
)
RETURNS TABLE(
  views BIGINT,
  whatsapp_clicks BIGINT,
  conversion_rate NUMERIC,
  days_since_posted INTEGER
) AS $$
BEGIN
  RETURN QUERY
  EXECUTE format('
    SELECT
      views_count::BIGINT as views,
      whatsapp_clicks::BIGINT as whatsapp_clicks,
      CASE
        WHEN views_count > 0 THEN
          ROUND((whatsapp_clicks::NUMERIC / views_count::NUMERIC) * 100, 2)
        ELSE 0
      END as conversion_rate,
      EXTRACT(DAY FROM NOW() - created_at)::INTEGER as days_since_posted
    FROM %I
    WHERE id = $1
  ', listing_table)
  USING listing_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Check if user has premium analytics access
CREATE OR REPLACE FUNCTION user_has_analytics_access(user_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  has_premium BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1
    FROM user_subscriptions us
    JOIN subscription_plans sp ON us.plan_id = sp.id
    WHERE us.user_id = user_uuid
    AND us.status = 'active'
    AND us.end_date > NOW()
    AND sp.name = 'premium'
  ) INTO has_premium;

  RETURN has_premium;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- NOTIFICATIONS TABLE
-- =====================================================

CREATE TYPE notification_type AS ENUM ('message', 'system');

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    type notification_type NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- NOTIFICATIONS INDEXES
-- =====================================================

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);

-- =====================================================
-- NOTIFICATIONS RLS POLICIES
-- =====================================================

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own notifications" ON notifications FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- NOTIFICATION FUNCTIONS
-- =====================================================

-- Function to create notification
CREATE OR REPLACE FUNCTION create_notification(
  target_user_id UUID,
  notif_type notification_type,
  notif_title TEXT,
  notif_message TEXT
)
RETURNS UUID AS $$
DECLARE
  new_notification_id UUID;
BEGIN
  INSERT INTO notifications (user_id, type, title, message)
  VALUES (target_user_id, notif_type, notif_title, notif_message)
  RETURNING id INTO new_notification_id;

  RETURN new_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark notification as read
CREATE OR REPLACE FUNCTION mark_notification_as_read(notification_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE notifications
  SET is_read = TRUE
  WHERE id = notification_id AND user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark all notifications as read
CREATE OR REPLACE FUNCTION mark_all_notifications_as_read()
RETURNS VOID AS $$
BEGIN
  UPDATE notifications
  SET is_read = TRUE
  WHERE user_id = auth.uid() AND is_read = FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to delete notification
CREATE OR REPLACE FUNCTION delete_notification(notification_id UUID)
RETURNS VOID AS $$
BEGIN
  DELETE FROM notifications
  WHERE id = notification_id AND user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get unread count
CREATE OR REPLACE FUNCTION get_unread_notifications_count(target_user_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM notifications
    WHERE user_id = target_user_id AND is_read = FALSE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- DEVICE TOKENS TABLE (for push notifications)
-- =====================================================

CREATE TABLE device_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    expo_push_token TEXT NOT NULL,
    device_name TEXT,
    device_os TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, expo_push_token)
);

CREATE INDEX idx_device_tokens_user ON device_tokens(user_id);
CREATE INDEX idx_device_tokens_active ON device_tokens(is_active);

ALTER TABLE device_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own device tokens" ON device_tokens FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own device tokens" ON device_tokens FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own device tokens" ON device_tokens FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own device tokens" ON device_tokens FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- AUTOMATIC NOTIFICATION TRIGGERS
-- =====================================================

-- Trigger function to notify user when listing is approved
CREATE OR REPLACE FUNCTION notify_listing_approved()
RETURNS TRIGGER AS $$
DECLARE
    owner_id UUID;
    listing_title TEXT;
BEGIN
    -- Only send notification if status changed to 'approved'
    IF NEW.listing_status = 'approved' AND (OLD.listing_status IS NULL OR OLD.listing_status != 'approved') THEN
        -- Get owner ID and title (works for both landlord_id and seller_id)
        IF TG_TABLE_NAME = 'rental_properties' THEN
            owner_id := NEW.landlord_id;
        ELSE
            owner_id := NEW.seller_id;
        END IF;

        listing_title := NEW.title;

        -- Create notification
        PERFORM create_notification(
            owner_id,
            'system',
            'Listing Approved! 🎉',
            'Your listing "' || listing_title || '" has been approved and is now live!'
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all listing tables
CREATE TRIGGER notify_rental_approved AFTER UPDATE ON rental_properties
    FOR EACH ROW EXECUTE FUNCTION notify_listing_approved();

CREATE TRIGGER notify_electronics_approved AFTER UPDATE ON electronics
    FOR EACH ROW EXECUTE FUNCTION notify_listing_approved();

CREATE TRIGGER notify_fashion_approved AFTER UPDATE ON fashion
    FOR EACH ROW EXECUTE FUNCTION notify_listing_approved();

CREATE TRIGGER notify_cosmetics_approved AFTER UPDATE ON cosmetics
    FOR EACH ROW EXECUTE FUNCTION notify_listing_approved();

CREATE TRIGGER notify_house_items_approved AFTER UPDATE ON house_items
    FOR EACH ROW EXECUTE FUNCTION notify_listing_approved();

CREATE TRIGGER notify_cars_approved AFTER UPDATE ON cars
    FOR EACH ROW EXECUTE FUNCTION notify_listing_approved();

CREATE TRIGGER notify_properties_sale_approved AFTER UPDATE ON properties_for_sale
    FOR EACH ROW EXECUTE FUNCTION notify_listing_approved();

CREATE TRIGGER notify_businesses_approved AFTER UPDATE ON businesses
    FOR EACH ROW EXECUTE FUNCTION notify_listing_approved();

-- Trigger function to notify user when listing is rejected
CREATE OR REPLACE FUNCTION notify_listing_rejected()
RETURNS TRIGGER AS $$
DECLARE
    owner_id UUID;
    listing_title TEXT;
BEGIN
    -- Only send notification if status changed to 'rejected'
    IF NEW.listing_status = 'rejected' AND (OLD.listing_status IS NULL OR OLD.listing_status != 'rejected') THEN
        -- Get owner ID and title
        IF TG_TABLE_NAME = 'rental_properties' THEN
            owner_id := NEW.landlord_id;
        ELSE
            owner_id := NEW.seller_id;
        END IF;

        listing_title := NEW.title;

        -- Create notification
        PERFORM create_notification(
            owner_id,
            'system',
            'Listing Rejected',
            'Your listing "' || listing_title || '" was rejected. Reason: ' || COALESCE(NEW.rejection_reason, 'No reason provided')
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all listing tables
CREATE TRIGGER notify_rental_rejected AFTER UPDATE ON rental_properties
    FOR EACH ROW EXECUTE FUNCTION notify_listing_rejected();

CREATE TRIGGER notify_electronics_rejected AFTER UPDATE ON electronics
    FOR EACH ROW EXECUTE FUNCTION notify_listing_rejected();

CREATE TRIGGER notify_fashion_rejected AFTER UPDATE ON fashion
    FOR EACH ROW EXECUTE FUNCTION notify_listing_rejected();

CREATE TRIGGER notify_cosmetics_rejected AFTER UPDATE ON cosmetics
    FOR EACH ROW EXECUTE FUNCTION notify_listing_rejected();

CREATE TRIGGER notify_house_items_rejected AFTER UPDATE ON house_items
    FOR EACH ROW EXECUTE FUNCTION notify_listing_rejected();

CREATE TRIGGER notify_cars_rejected AFTER UPDATE ON cars
    FOR EACH ROW EXECUTE FUNCTION notify_listing_rejected();

CREATE TRIGGER notify_properties_sale_rejected AFTER UPDATE ON properties_for_sale
    FOR EACH ROW EXECUTE FUNCTION notify_listing_rejected();

CREATE TRIGGER notify_businesses_rejected AFTER UPDATE ON businesses
    FOR EACH ROW EXECUTE FUNCTION notify_listing_rejected();

-- =====================================================
-- NEW LISTING NOTIFICATION FUNCTIONS (For all users)
-- =====================================================

-- Function to notify all users (except poster) when rental property is approved
CREATE OR REPLACE FUNCTION notify_new_rental_property()
RETURNS TRIGGER AS $$
BEGIN
    -- Only notify when listing status changes to 'approved'
    IF NEW.listing_status = 'approved' AND (OLD.listing_status IS NULL OR OLD.listing_status != 'approved') THEN
        INSERT INTO notifications (user_id, type, title, message)
        SELECT
            id,
            'system',
            '🏠 New Property Available!',
            'New rental property "' || NEW.title || '" is now available in ' || NEW.city
        FROM profiles
        WHERE id != NEW.landlord_id; -- Exclude the landlord
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to notify all users (except seller) when marketplace item is approved
CREATE OR REPLACE FUNCTION notify_new_marketplace_item(category_name TEXT)
RETURNS TRIGGER AS $$
DECLARE
    formatted_category TEXT;
BEGIN
    -- Only notify when listing status changes to 'approved'
    IF NEW.listing_status = 'approved' AND (OLD.listing_status IS NULL OR OLD.listing_status != 'approved') THEN
        -- Format category name
        formatted_category := REPLACE(INITCAP(REPLACE(category_name, '_', ' ')), ' ', ' ');

        INSERT INTO notifications (user_id, type, title, message)
        SELECT
            id,
            'system',
            '🛍️ New Item Listed!',
            'New ' || formatted_category || ' "' || NEW.title || '" is now available in ' || NEW.city
        FROM profiles
        WHERE id != NEW.seller_id; -- Exclude the seller
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers for rental properties
CREATE TRIGGER notify_rental_property_approved
    AFTER UPDATE ON rental_properties
    FOR EACH ROW
    EXECUTE FUNCTION notify_new_rental_property();

-- Triggers for marketplace categories
CREATE TRIGGER notify_electronics_approved
    AFTER UPDATE ON electronics
    FOR EACH ROW
    EXECUTE FUNCTION notify_new_marketplace_item('Electronics');

CREATE TRIGGER notify_cars_approved
    AFTER UPDATE ON cars
    FOR EACH ROW
    EXECUTE FUNCTION notify_new_marketplace_item('Cars');

CREATE TRIGGER notify_fashion_approved
    AFTER UPDATE ON fashion
    FOR EACH ROW
    EXECUTE FUNCTION notify_new_marketplace_item('Fashion');

CREATE TRIGGER notify_cosmetics_approved
    AFTER UPDATE ON cosmetics
    FOR EACH ROW
    EXECUTE FUNCTION notify_new_marketplace_item('Cosmetics');

CREATE TRIGGER notify_house_items_approved
    AFTER UPDATE ON house_items
    FOR EACH ROW
    EXECUTE FUNCTION notify_new_marketplace_item('House Items');

CREATE TRIGGER notify_businesses_approved
    AFTER UPDATE ON businesses
    FOR EACH ROW
    EXECUTE FUNCTION notify_new_marketplace_item('Businesses');

CREATE TRIGGER notify_properties_for_sale_approved
    AFTER UPDATE ON properties_for_sale
    FOR EACH ROW
    EXECUTE FUNCTION notify_new_marketplace_item('Properties For Sale');

-- =====================================================
-- AUTO-CLEANUP OLD NOTIFICATIONS (24 HOURS)
-- =====================================================

-- Function to delete notifications older than 24 hours
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS TABLE(deleted_count INTEGER) AS $$
DECLARE
    affected_rows INTEGER;
BEGIN
    DELETE FROM notifications
    WHERE created_at < NOW() - INTERVAL '24 hours';

    GET DIAGNOSTICS affected_rows = ROW_COUNT;

    RETURN QUERY SELECT affected_rows;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- SUBSCRIPTION MANAGEMENT FUNCTIONS
-- =====================================================

-- Function to check and expire subscriptions (to be called by cron job)
CREATE OR REPLACE FUNCTION check_expired_subscriptions()
RETURNS TABLE(expired_count INTEGER) AS $$
DECLARE
    affected_rows INTEGER;
BEGIN
    -- Update expired subscriptions
    UPDATE user_subscriptions
    SET status = 'expired'
    WHERE status = 'active'
    AND end_date < NOW();

    GET DIAGNOSTICS affected_rows = ROW_COUNT;

    -- Notify users with expired subscriptions
    INSERT INTO notifications (user_id, type, title, message)
    SELECT
        user_id,
        'system',
        'Subscription Expired',
        'Your ' || sp.display_name || ' subscription has expired. Renew to continue posting listings.'
    FROM user_subscriptions us
    JOIN subscription_plans sp ON us.plan_id = sp.id
    WHERE us.status = 'expired'
    AND us.updated_at >= NOW() - INTERVAL '1 minute'; -- Only notify newly expired

    RETURN QUERY SELECT affected_rows;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check subscriptions expiring soon
CREATE OR REPLACE FUNCTION check_expiring_subscriptions()
RETURNS TABLE(expiring_count INTEGER) AS $$
DECLARE
    affected_rows INTEGER;
BEGIN
    -- Find subscriptions expiring in 7 days that haven't been notified recently
    WITH expiring_subs AS (
        SELECT us.user_id, us.id, sp.display_name, us.end_date
        FROM user_subscriptions us
        JOIN subscription_plans sp ON us.plan_id = sp.id
        WHERE us.status = 'active'
        AND us.end_date BETWEEN NOW() AND NOW() + INTERVAL '7 days'
        AND NOT EXISTS (
            SELECT 1 FROM notifications n
            WHERE n.user_id = us.user_id
            AND n.title = 'Subscription Expiring Soon'
            AND n.created_at > NOW() - INTERVAL '7 days'
        )
    )
    INSERT INTO notifications (user_id, type, title, message)
    SELECT
        user_id,
        'system',
        'Subscription Expiring Soon',
        'Your ' || display_name || ' subscription will expire on ' || TO_CHAR(end_date, 'YYYY-MM-DD') || '. Renew to avoid interruption.'
    FROM expiring_subs;

    GET DIAGNOSTICS affected_rows = ROW_COUNT;

    RETURN QUERY SELECT affected_rows;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- MEDIA UPLOAD QUOTA FUNCTIONS
-- =====================================================

-- Function to check if user can upload media
CREATE OR REPLACE FUNCTION can_upload_media(
    user_uuid UUID,
    media_type TEXT -- 'image' or 'video'
)
RETURNS BOOLEAN AS $$
DECLARE
    active_sub RECORD;
    current_usage INTEGER;
    quota_limit INTEGER;
BEGIN
    -- Get active subscription
    SELECT us.*, sp.image_quota_per_month, sp.video_quota_per_month
    INTO active_sub
    FROM user_subscriptions us
    JOIN subscription_plans sp ON us.plan_id = sp.id
    WHERE us.user_id = user_uuid
    AND us.status = 'active'
    AND us.end_date > NOW()
    ORDER BY us.end_date DESC
    LIMIT 1;

    IF active_sub IS NULL THEN
        RETURN FALSE; -- No active subscription
    END IF;

    -- Check quota
    IF media_type = 'image' THEN
        current_usage := active_sub.images_used_this_month;
        quota_limit := active_sub.image_quota_per_month;
    ELSIF media_type = 'video' THEN
        current_usage := active_sub.videos_used_this_month;
        quota_limit := active_sub.video_quota_per_month;
    ELSE
        RETURN FALSE; -- Invalid media type
    END IF;

    RETURN current_usage < quota_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment media usage
CREATE OR REPLACE FUNCTION increment_media_usage(
    user_uuid UUID,
    media_type TEXT
)
RETURNS VOID AS $$
BEGIN
    IF media_type = 'image' THEN
        UPDATE user_subscriptions
        SET images_used_this_month = images_used_this_month + 1
        WHERE user_id = user_uuid
        AND status = 'active'
        AND end_date > NOW();
    ELSIF media_type = 'video' THEN
        UPDATE user_subscriptions
        SET videos_used_this_month = videos_used_this_month + 1
        WHERE user_id = user_uuid
        AND status = 'active'
        AND end_date > NOW();
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reset monthly quotas (to be called by cron job on 1st of each month)
CREATE OR REPLACE FUNCTION reset_monthly_quotas()
RETURNS TABLE(reset_count INTEGER) AS $$
DECLARE
    affected_rows INTEGER;
BEGIN
    UPDATE user_subscriptions
    SET
        images_used_this_month = 0,
        videos_used_this_month = 0,
        last_quota_reset = NOW()
    WHERE status = 'active'
    AND last_quota_reset < DATE_TRUNC('month', NOW());

    GET DIAGNOSTICS affected_rows = ROW_COUNT;

    RETURN QUERY SELECT affected_rows;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- COMPLETE! 🎉
-- =====================================================

-- Run this entire schema in your Supabase SQL Editor
-- All tables, policies, triggers, functions, and storage buckets will be created automatically

-- ⚠️ IMPORTANT: Setup required AFTER running this schema:
-- 1. Create Supabase Edge Function for push notifications (expo-push-notification)
-- 2. Setup cron jobs in Supabase Dashboard:
--    - Daily: SELECT check_expired_subscriptions();
--    - Daily: SELECT check_expiring_subscriptions();
--    - Monthly (1st): SELECT reset_monthly_quotas();
-- 3. Insert subscription plans data:
--    INSERT INTO subscription_plans (name, display_name, price, duration_days, max_listings, image_quota_per_month, video_quota_per_month) VALUES
--    ('standard', 'Standard', 5000, 30, 10, 50, 5),
--    ('premium', 'Premium', 15000, 30, 999999, 200, 20);