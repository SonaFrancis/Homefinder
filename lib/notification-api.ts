import { supabase } from './supabase';

export interface Notification {
  id: string;
  user_id: string;
  type: 'message' | 'system';
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

/**
 * Fetch user notifications (only from last 24 hours)
 */
export async function fetchNotifications(userId: string) {
  try {
    // Calculate 24 hours ago
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', twentyFourHoursAgo.toISOString())
      .order('created_at', { ascending: false });

    if (error) throw error;

    return { data: data as Notification[], error: null };
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return { data: null, error };
  }
}

/**
 * Get unread notification count
 */
export async function getUnreadCount(userId: string) {
  try {
    // Calculate 24 hours ago
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false)
      .gte('created_at', twentyFourHoursAgo.toISOString());

    if (error) throw error;

    return { count: count || 0, error: null };
  } catch (error) {
    console.error('Error getting unread count:', error);
    return { count: 0, error };
  }
}

/**
 * Mark a notification as read
 */
export async function markAsRead(notificationId: string) {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId);

    if (error) throw error;

    return { error: null };
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return { error };
  }
}

/**
 * Mark all notifications as read
 */
export async function markAllAsRead(userId: string) {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) throw error;

    return { error: null };
  } catch (error) {
    console.error('Error marking all as read:', error);
    return { error };
  }
}

/**
 * Delete a notification
 */
export async function deleteNotification(notificationId: string) {
  try {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId);

    if (error) throw error;

    return { error: null };
  } catch (error) {
    console.error('Error deleting notification:', error);
    return { error };
  }
}

/**
 * Delete all notifications older than 24 hours
 */
export async function cleanupOldNotifications(userId: string) {
  try {
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('user_id', userId)
      .lt('created_at', twentyFourHoursAgo.toISOString());

    if (error) throw error;

    return { error: null };
  } catch (error) {
    console.error('Error cleaning up notifications:', error);
    return { error };
  }
}

/**
 * Subscribe to real-time notifications
 */
export function subscribeToNotifications(
  userId: string,
  onNotification: (notification: Notification) => void
) {
  const channel = supabase
    .channel(`notifications:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        const notification = payload.new as Notification;
        onNotification(notification);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Trigger notifications for new rental property
 * This creates notifications for all users except the poster
 */
export async function notifyNewRentalProperty(
  propertyId: string,
  propertyTitle: string,
  landlordId: string,
  city: string
) {
  try {
    // Get all users except the landlord
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select('id')
      .neq('id', landlordId);

    if (usersError) throw usersError;

    if (!users || users.length === 0) return { error: null };

    // Create notifications for all users
    const notifications = users.map(user => ({
      user_id: user.id,
      type: 'system' as const,
      title: '🏠 New Property Available!',
      message: `New rental property "${propertyTitle}" is now available in ${city}`,
      is_read: false,
    }));

    const { error } = await supabase
      .from('notifications')
      .insert(notifications);

    if (error) throw error;

    return { error: null };
  } catch (error) {
    console.error('Error creating rental property notifications:', error);
    return { error };
  }
}

/**
 * Trigger notifications for new marketplace item
 * This creates notifications for all users except the seller
 */
export async function notifyNewMarketplaceItem(
  itemId: string,
  itemTitle: string,
  sellerId: string,
  category: string,
  city: string
) {
  try {
    // Get all users except the seller
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select('id')
      .neq('id', sellerId);

    if (usersError) throw usersError;

    if (!users || users.length === 0) return { error: null };

    // Format category name
    const categoryName = category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

    // Create notifications for all users
    const notifications = users.map(user => ({
      user_id: user.id,
      type: 'system' as const,
      title: '🛍️ New Item Listed!',
      message: `New ${categoryName} "${itemTitle}" is now available in ${city}`,
      is_read: false,
    }));

    const { error } = await supabase
      .from('notifications')
      .insert(notifications);

    if (error) throw error;

    return { error: null };
  } catch (error) {
    console.error('Error creating marketplace item notifications:', error);
    return { error };
  }
}

/**
 * Notify user when they are verified by admin
 */
export async function notifyUserVerified(userId: string, userName: string) {
  try {
    const notification = {
      user_id: userId,
      type: 'system' as const,
      title: '✅ Account Verified!',
      message: `Congratulations ${userName}! Your account has been verified by our admin team. You can now enjoy enhanced credibility and trust from other users.`,
      is_read: false,
    };

    const { error } = await supabase
      .from('notifications')
      .insert([notification]);

    if (error) throw error;

    return { error: null };
  } catch (error) {
    console.error('Error creating verification notification:', error);
    return { error };
  }
}

/**
 * Get time ago string from timestamp
 */
export function getNotificationTimeAgo(timestamp: string): string {
  const now = new Date();
  const past = new Date(timestamp);
  const diffMs = now.getTime() - past.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return 'Earlier today';
}
