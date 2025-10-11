# 🏠 Cameroon Rental & Marketplace App

A comprehensive React Native mobile application for property rentals and marketplace trading in Cameroon, featuring subscription-based access for landlords, sellers, and students.

## ✨ Features

### 🔐 Authentication
- Email/password signup and login
- Role-based registration (Student, Landlord, Seller)
- Profile management with verification badges

### 🏘️ For Rent Tab
- Browse approved rental properties
- Filter by city, property type, and price
- View detailed property information
- Direct WhatsApp contact with landlords
- Featured listings for premium subscribers
- Verified landlord badges

### 🛍️ Marketplace Tab
- Browse items across 6 categories:
  - Electronics
  - Fashion
  - Cosmetics
  - House Items
  - Cars
  - Properties (land/houses for sale)
- Category-based filtering
- Seller verification system
- Direct WhatsApp messaging

### 👤 Profile & Dashboard
- View subscription status and quotas
- Manage posted listings
- Track views and WhatsApp clicks
- Submit support messages
- View and manage reviews

### 💳 Subscription System
- **Standard Plan** (10,000 FCFA/month):
  - 10 listings per month
  - 50 images per month
  - 10 videos per month
  - Up to 10 images per listing
  - Up to 3 videos per listing

- **Premium Plan** (25,000 FCFA/month):
  - 50 listings per month
  - 200 images per month
  - 50 videos per month
  - Up to 15 images per listing
  - Up to 5 videos per listing
  - Featured listing placement
  - Priority support

### 📊 Admin Features
- Approve/reject listings
- Verify user profiles
- Manage support messages
- View analytics and reports

### ⭐ Reviews System
- Users can review landlords and sellers
- 5-star rating system
- Average rating displayed on profiles
- Linked to specific listings

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- Expo CLI
- Supabase account

### Installation

1. **Clone and install dependencies**
```bash
cd New_version_student_retal
npm install
```

2. **Set up environment variables**
```bash
cp .env.example .env
```

Edit `.env` with your Supabase credentials:
```
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

3. **Set up Supabase**
- Create a new Supabase project
- Run `supabase_schema.sql` in SQL Editor
- Create storage buckets (see Implementation Guide)
- Configure storage policies

4. **Start development server**
```bash
npm start
```

## 📁 Project Structure

```
├── app/                          # Expo Router screens
│   ├── (auth)/                   # Authentication screens
│   ├── (tabs)/                   # Main tab navigation
│   ├── property/                 # Property screens
│   ├── marketplace/              # Marketplace screens
│   └── subscription/             # Subscription screens
├── components/                   # Reusable components
├── lib/                          # Libraries (Supabase client)
├── store/                        # Zustand state management
├── utils/                        # Utility functions
├── supabase_schema.sql          # Database schema
└── IMPLEMENTATION_GUIDE.md      # Detailed implementation guide
```

## 🗄️ Database Schema

### Core Tables
- `profiles` - User profiles with roles and verification
- `subscription_plans` - Standard and Premium plans
- `user_subscriptions` - Active user subscriptions with quotas
- `marketplace_categories` - 6 predefined categories
- `rental_properties` - Property listings with amenities
- `marketplace_items` - Marketplace listings
- `reviews` - User reviews and ratings
- `support_messages` - User support tickets

### Key Features
- Row Level Security (RLS) on all tables
- Automatic quota management
- Subscription validation triggers
- Rating calculation triggers
- Admin approval workflow

## 🔒 Security

- **Authentication**: Supabase Auth with secure session management
- **RLS Policies**: Database-level access control
- **Media Storage**: User-specific folders with quota enforcement
- **Verification System**: Admin approval for listings and users
- **Subscription Gates**: Feature access based on active subscription

## 📱 Tech Stack

- **Frontend**: React Native + Expo
- **Navigation**: Expo Router
- **State Management**: Zustand
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **UI**: React Native StyleSheet
- **Media**: Expo Image Picker + Image Manipulator
- **Validation**: Custom validation utilities

## 🎯 Key Differentiators

1. **Subscription-Based Model**: Users pay to post, not to browse
2. **Quota Management**: Monthly image/video quotas with auto-reset
3. **Verification System**: Admin approval ensures quality listings
4. **WhatsApp Integration**: Direct communication with sellers
5. **Cameroon-Focused**: Cities, phone formats, currency (FCFA)
6. **Review System**: Build trust through user ratings

## 🔧 Configuration

### Supabase Storage Buckets

Create these buckets in Supabase Dashboard:

1. **profile-pictures** (public, 5MB limit)
2. **rental-property-media** (public, 50MB limit)
3. **marketplace-item-media** (public, 50MB limit)

### Payment Integration

To integrate Mobile Money payments:

1. Sign up for MTN Mobile Money or Orange Money API
2. Add payment provider credentials to `.env`
3. Implement payment flow in `app/subscription/plans.tsx`
4. Update subscription status on payment confirmation

## 📖 Documentation

- [Implementation Guide](./IMPLEMENTATION_GUIDE.md) - Detailed implementation examples
- [Database Schema](./supabase_schema.sql) - Complete SQL schema with comments
- [Expo Documentation](https://docs.expo.dev/)
- [Supabase Documentation](https://supabase.com/docs)

## 🚀 Deployment

### Build for Production

```bash
# Install EAS CLI
npm install -g eas-cli

# Configure EAS
eas build:configure

# Build Android
eas build --platform android --profile production

# Build iOS
eas build --platform ios --profile production
```

### Submit to Stores

```bash
# Google Play Store
eas submit --platform android

# Apple App Store
eas submit --platform ios
```

## 🛠️ Development

### Run on Device

```bash
# Android
npm run android

# iOS (macOS only)
npm run ios
```

### Testing with Expo Go

1. Install Expo Go on your device
2. Run `npm start`
3. Scan QR code with Expo Go

## 📊 Admin Dashboard

For admin features, update a user's role to 'admin':

```sql
UPDATE profiles
SET role = 'admin'
WHERE email = 'admin@yourdomain.com';
```

Admin users can:
- Approve/reject listings
- Verify user profiles
- View all support messages
- Access analytics

## 🤝 Contributing

This is a custom project for Cameroon. For modifications:

1. Review the implementation guide
2. Test thoroughly with different user roles
3. Ensure subscription logic works correctly
4. Test on both Android and iOS

## 📄 License

Proprietary - All rights reserved

## 🌍 Made for Cameroon 🇨🇲

Designed specifically for the Cameroonian market with:
- Local cities (Yaoundé, Douala, Bamenda, Buea, etc.)
- FCFA currency formatting
- Cameroon phone number validation (+237)
- WhatsApp integration (primary communication method)
- Mobile Money payment support

---

**For detailed implementation instructions, see [IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md)**