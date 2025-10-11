# 📱 Frontend 3-Scenario Quota System - Implementation Guide

## ✅ What's Been Implemented

### **1. Type Definitions** (`lib/subscriptionTypes.ts`)
- `SubscriptionScenario` interface matching database function
- Helper type guards for scenario checking
- User-friendly message generators

### **2. React Hook** (`hooks/useSubscriptionScenario.ts`)
- Real-time subscription status checking
- Automatic refresh capability
- Quick access to permissions and quota info

### **3. Quota Guard Hook** (`hooks/useQuotaGuard.ts`)
- Pre-upload/pre-creation blocking with alerts
- Scenario-specific alert messages
- Navigation to subscription page

### **4. UI Component** (`components/SubscriptionStatusBanner.tsx`)
- Visual warnings for all 3 scenarios
- Color-coded banners (info/warning/urgent/error)
- Call-to-action buttons

---

## 🎯 Implementation Examples

### **Example 1: Property Creation Screen**

```typescript
import { useState, useEffect } from 'react';
import { View, TouchableOpacity, Text, Alert } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useSubscriptionScenario } from '@/hooks/useSubscriptionScenario';
import { useQuotaGuard } from '@/hooks/useQuotaGuard';
import { SubscriptionStatusBanner } from '@/components/SubscriptionStatusBanner';

export default function CreatePropertyScreen() {
  const [userId, setUserId] = useState<string | undefined>();

  // Get current user
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id);
    };
    getUser();
  }, []);

  // Check subscription scenario
  const {
    scenario,
    loading,
    canCreateListing,
    listingsRemaining,
    refresh
  } = useSubscriptionScenario(userId);

  // Get quota guard functions
  const { checkCanCreateListing } = useQuotaGuard({
    scenario,
    onBlocked: () => console.log('User blocked from creating listing')
  });

  const handleCreateProperty = async () => {
    // LAYER 1: Frontend check (UX)
    if (!checkCanCreateListing()) {
      return; // Alert already shown by quota guard
    }

    // Proceed with property creation
    try {
      const { data, error } = await supabase
        .from('rental_properties')
        .insert({ /* property data */ });

      // LAYER 2: Database trigger will also validate
      if (error) {
        if (error.message.includes('quota') || error.message.includes('limit')) {
          Alert.alert('Quota Exceeded', 'Your listing quota is full. Please upgrade or wait for monthly reset.');
          refresh(); // Refresh scenario to update UI
        } else {
          Alert.alert('Error', error.message);
        }
        return;
      }

      Alert.alert('Success', 'Property created successfully!');
      refresh(); // Refresh to update quota count
    } catch (err) {
      Alert.alert('Error', 'Failed to create property');
    }
  };

  return (
    <View>
      {/* Show subscription status banner */}
      <SubscriptionStatusBanner scenario={scenario} />

      {/* Show quota info */}
      {scenario && (
        <View style={{ padding: 16 }}>
          <Text>Listings Remaining: {listingsRemaining}/{scenario.max_listings}</Text>
        </View>
      )}

      {/* Create button - disabled if can't create */}
      <TouchableOpacity
        onPress={handleCreateProperty}
        disabled={!canCreateListing || loading}
        style={{
          backgroundColor: canCreateListing ? '#10B981' : '#D1D5DB',
          padding: 16,
          borderRadius: 8
        }}
      >
        <Text style={{ color: '#fff', textAlign: 'center' }}>
          Create Property Listing
        </Text>
      </TouchableOpacity>
    </View>
  );
}
```

---

### **Example 2: Image Upload Component**

```typescript
import { useState, useEffect } from 'react';
import { TouchableOpacity, Text, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';
import { useSubscriptionScenario } from '@/hooks/useSubscriptionScenario';
import { useQuotaGuard } from '@/hooks/useQuotaGuard';

interface ImageUploadProps {
  propertyId: string;
  userId: string;
  onUploadComplete?: () => void;
}

export function ImageUploadButton({ propertyId, userId, onUploadComplete }: ImageUploadProps) {
  const { scenario, canUploadMedia, imagesRemaining, refresh } = useSubscriptionScenario(userId);
  const { checkCanUploadMedia } = useQuotaGuard({ scenario });

  const handleSelectImage = async () => {
    // LAYER 1: Frontend check (UX)
    if (!checkCanUploadMedia('image')) {
      return; // Alert already shown
    }

    // Request permissions
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Please allow access to photos');
      return;
    }

    // Pick image
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
    });

    if (result.canceled) return;

    // Upload to Supabase Storage
    const imageUri = result.assets[0].uri;
    const fileName = `${propertyId}_${Date.now()}.jpg`;

    try {
      // Upload file
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('property-images')
        .upload(fileName, {
          uri: imageUri,
          type: 'image/jpeg',
          name: fileName
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('property-images')
        .getPublicUrl(fileName);

      // Insert media record (this will trigger quota check in database)
      // LAYER 2: Database trigger validates quota
      const { error: insertError } = await supabase
        .from('rental_property_media')
        .insert({
          property_id: propertyId,
          media_url: publicUrl,
          media_type: 'image'
        });

      if (insertError) {
        // Catch quota errors from database trigger
        if (insertError.message.includes('quota exceeded')) {
          Alert.alert('Upload Failed', 'Image quota exceeded. Please upgrade your plan.');
          refresh(); // Refresh quota count
        } else {
          Alert.alert('Error', insertError.message);
        }
        return;
      }

      Alert.alert('Success', 'Image uploaded successfully!');
      refresh(); // Update quota count
      onUploadComplete?.();
    } catch (err) {
      Alert.alert('Error', 'Failed to upload image');
    }
  };

  return (
    <TouchableOpacity
      onPress={handleSelectImage}
      disabled={!canUploadMedia}
      style={{
        backgroundColor: canUploadMedia ? '#3B82F6' : '#D1D5DB',
        padding: 12,
        borderRadius: 8,
        marginVertical: 8
      }}
    >
      <Text style={{ color: '#fff', textAlign: 'center' }}>
        Upload Image ({imagesRemaining} remaining)
      </Text>
    </TouchableOpacity>
  );
}
```

---

### **Example 3: Dashboard with Scenario Banner**

**Already implemented in:** `app/dashboard/index.tsx`

```typescript
import { useSubscriptionScenario } from '@/hooks/useSubscriptionScenario';
import { SubscriptionStatusBanner } from '@/components/SubscriptionStatusBanner';

export default function DashboardScreen() {
  const [userId, setUserId] = useState<string | undefined>();

  // Get subscription scenario
  const { scenario, loading } = useSubscriptionScenario(userId);

  return (
    <SafeAreaView>
      {/* Show banner based on scenario */}
      {!loading && scenario && (
        <SubscriptionStatusBanner scenario={scenario} />
      )}

      {/* Rest of dashboard */}
    </SafeAreaView>
  );
}
```

---

### **Example 4: Marketplace Listing Creation**

```typescript
import { useSubscriptionScenario } from '@/hooks/useSubscriptionScenario';
import { useQuotaGuard } from '@/hooks/useQuotaGuard';
import { SubscriptionStatusBanner } from '@/components/SubscriptionStatusBanner';

export function CreateMarketplaceListingScreen() {
  const [userId, setUserId] = useState<string | undefined>();
  const { scenario, canCreateListing, refresh } = useSubscriptionScenario(userId);
  const { checkCanCreateListing } = useQuotaGuard({ scenario });

  const handleCreateListing = async (category: string, listingData: any) => {
    // Check quota before proceeding
    if (!checkCanCreateListing()) {
      return;
    }

    const tableName = category === 'electronics' ? 'electronics'
                    : category === 'fashion' ? 'fashion'
                    : category === 'cosmetics' ? 'cosmetics'
                    : category === 'house_items' ? 'house_items'
                    : category === 'cars' ? 'cars'
                    : category === 'properties' ? 'properties_for_sale'
                    : 'businesses';

    try {
      const { error } = await supabase
        .from(tableName)
        .insert(listingData);

      if (error) {
        if (error.message.includes('quota') || error.message.includes('limit')) {
          Alert.alert('Quota Exceeded', 'Please upgrade or wait for monthly reset.');
          refresh();
        } else {
          Alert.alert('Error', error.message);
        }
        return;
      }

      Alert.alert('Success', 'Listing created!');
      refresh();
    } catch (err) {
      Alert.alert('Error', 'Failed to create listing');
    }
  };

  return (
    <View>
      <SubscriptionStatusBanner scenario={scenario} />

      {/* Form goes here */}

      <TouchableOpacity
        onPress={() => handleCreateListing('electronics', { /* data */ })}
        disabled={!canCreateListing}
      >
        <Text>Create Listing</Text>
      </TouchableOpacity>
    </View>
  );
}
```

---

## 🔍 Scenario-Specific Behavior

### **Scenario 0: No Subscription**
```typescript
// scenario.scenario === 0
// can_create_listings: false
// can_upload_media: false
// listings_should_be_live: false

// Banner shows: "No Active Subscription"
// Button: "Subscribe Now"
// Alert: "Subscribe to start creating listings..."
```

### **Scenario 1A: Active + Quota Available**
```typescript
// scenario.scenario === 1
// can_create_listings: true
// can_upload_media: true
// listings_should_be_live: true

// Banner: Shows quota info if > 70% used
// No blocking
```

### **Scenario 1B: Active + Quota Exhausted**
```typescript
// scenario.scenario === 1
// can_create_listings: false
// can_upload_media: false (if image quota full)
// listings_should_be_live: true (still active!)

// Banner shows: "⚠️ Listing Quota Reached"
// Button: "Upgrade Plan"
// Alert: "You've used all 10 listings for this month..."
```

### **Scenario 2: Grace Period (0-7 days)**
```typescript
// scenario.scenario === 2
// can_create_listings: depends on remaining quota
// can_upload_media: depends on remaining quota
// listings_should_be_live: true (grace active!)

// Banner shows: "⏰ Grace Period Active" or "🚨 URGENT" if <= 2 days
// Button: "Renew Now"
// Alert: "Expired 3 days ago. Grace period: 4 days remaining..."
```

### **Scenario 3: Grace Ended (8+ days)**
```typescript
// scenario.scenario === 3
// can_create_listings: false
// can_upload_media: false
// listings_should_be_live: false (deactivated!)

// Banner shows: "❌ Subscription Expired - Listings Deactivated"
// Button: "Renew to Restore"
// Alert: "Renew now to instantly restore all X listings!"
```

---

## 📋 Integration Checklist

For each screen that creates listings or uploads media:

- [ ] Import `useSubscriptionScenario` hook
- [ ] Import `useQuotaGuard` hook
- [ ] Import `SubscriptionStatusBanner` component
- [ ] Get current user ID
- [ ] Call hooks with user ID
- [ ] Add `<SubscriptionStatusBanner scenario={scenario} />` at top
- [ ] Call `checkCanCreateListing()` or `checkCanUploadMedia()` before action
- [ ] Disable buttons when `canCreateListing` or `canUploadMedia` is false
- [ ] Call `refresh()` after successful creation/upload to update quota
- [ ] Catch database errors and check for quota-related messages

---

## 🎯 Testing Checklist

### **Test Scenario 1A: Active + Available**
- [ ] Banner shows quota info (if > 70%)
- [ ] Can create listings
- [ ] Can upload images/videos
- [ ] Quota count updates after upload

### **Test Scenario 1B: Active + Exhausted**
- [ ] Warning banner shows
- [ ] "Create" button disabled
- [ ] Alert shown when trying to create
- [ ] "Upgrade Plan" button navigates to subscription page

### **Test Scenario 2: Grace Period**
- [ ] Grace period banner shows
- [ ] Can create if quota available
- [ ] Alert shows days remaining
- [ ] "Renew Now" button navigates correctly

### **Test Scenario 3: Expired**
- [ ] Error banner shows
- [ ] All creation/upload blocked
- [ ] Alert mentions restoring X listings
- [ ] "Renew to Restore" button works

---

## 🚀 Next Steps

1. **Add to all listing creation screens:**
   - Rental property creation
   - Electronics marketplace
   - Fashion marketplace
   - Cosmetics marketplace
   - House items marketplace
   - Cars marketplace
   - Properties for sale
   - Businesses marketplace

2. **Add to all media upload components:**
   - Property image uploads
   - Property video uploads
   - Marketplace item image uploads
   - Marketplace item video uploads

3. **Add to profile/account screens:**
   - Show subscription status
   - Display quota usage charts
   - Highlight upcoming expiry

---

## 🐛 Troubleshooting

### **Issue: Quota check returns null**
**Solution:** Make sure user is logged in and `userId` is passed correctly.

### **Issue: Banner doesn't update after upload**
**Solution:** Call `refresh()` after successful creation/upload.

### **Issue: Database still allows upload despite quota**
**Solution:** Verify database triggers are installed (run `complete_quota_enforcement_all_tables.sql`).

### **Issue: Alert doesn't show correct scenario**
**Solution:** Refresh subscription scenario before showing alert.

---

## ✅ Summary

**Frontend checks provide:**
- ✅ Better user experience
- ✅ Immediate feedback
- ✅ Clear upgrade prompts
- ✅ Visual quota indicators

**Database triggers provide:**
- ✅ Security enforcement
- ✅ Race condition protection
- ✅ API call protection
- ✅ Cannot be bypassed

**Together they create a robust, user-friendly quota system! 🎉**
