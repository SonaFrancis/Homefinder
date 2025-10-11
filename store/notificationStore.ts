import { create } from 'zustand';
import {
  Notification,
  fetchNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  cleanupOldNotifications,
  subscribeToNotifications,
} from '@/lib/notification-api';
import { playNotificationSound } from '@/utils/notificationSound';

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  subscriptionActive: boolean;

  // Actions
  loadNotifications: (userId: string) => Promise<void>;
  refreshUnreadCount: (userId: string) => Promise<void>;
  markNotificationAsRead: (notificationId: string) => Promise<void>;
  markAllNotificationsAsRead: (userId: string) => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  cleanupOld: (userId: string) => Promise<void>;
  startRealtimeSubscription: (userId: string) => void;
  stopRealtimeSubscription: () => void;
  handleNewNotification: (notification: Notification) => void;
}

let unsubscribe: (() => void) | null = null;

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  loading: false,
  error: null,
  subscriptionActive: false,

  loadNotifications: async (userId: string) => {
    set({ loading: true, error: null });

    try {
      const { data, error } = await fetchNotifications(userId);

      if (error) throw error;

      set({ notifications: data || [], loading: false });

      // Also refresh unread count
      get().refreshUnreadCount(userId);
    } catch (error: any) {
      set({ error: error.message || 'Failed to load notifications', loading: false });
    }
  },

  refreshUnreadCount: async (userId: string) => {
    try {
      const { count } = await getUnreadCount(userId);
      set({ unreadCount: count });
    } catch (error) {
      console.error('Error refreshing unread count:', error);
    }
  },

  markNotificationAsRead: async (notificationId: string) => {
    try {
      await markAsRead(notificationId);

      // Update local state
      set((state) => ({
        notifications: state.notifications.map((n) =>
          n.id === notificationId ? { ...n, is_read: true } : n
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      }));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  },

  markAllNotificationsAsRead: async (userId: string) => {
    try {
      await markAllAsRead(userId);

      // Update local state
      set((state) => ({
        notifications: state.notifications.map((n) => ({ ...n, is_read: true })),
        unreadCount: 0,
      }));
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  },

  deleteNotification: async (notificationId: string) => {
    try {
      await deleteNotification(notificationId);

      // Update local state
      set((state) => {
        const deletedNotification = state.notifications.find((n) => n.id === notificationId);
        const wasUnread = deletedNotification && !deletedNotification.is_read;

        return {
          notifications: state.notifications.filter((n) => n.id !== notificationId),
          unreadCount: wasUnread ? Math.max(0, state.unreadCount - 1) : state.unreadCount,
        };
      });
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  },

  cleanupOld: async (userId: string) => {
    try {
      await cleanupOldNotifications(userId);
      // Reload notifications after cleanup
      get().loadNotifications(userId);
    } catch (error) {
      console.error('Error cleaning up old notifications:', error);
    }
  },

  startRealtimeSubscription: (userId: string) => {
    // Stop existing subscription if any
    if (unsubscribe) {
      unsubscribe();
    }

    unsubscribe = subscribeToNotifications(userId, (notification) => {
      get().handleNewNotification(notification);
    });

    set({ subscriptionActive: true });
  },

  stopRealtimeSubscription: () => {
    if (unsubscribe) {
      unsubscribe();
      unsubscribe = null;
    }
    set({ subscriptionActive: false });
  },

  handleNewNotification: (notification: Notification) => {
    // Add new notification to the list
    set((state) => ({
      notifications: [notification, ...state.notifications],
      unreadCount: state.unreadCount + 1,
    }));

    // Play notification sound
    playNotificationSound();
  },
}));
