import React, { useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/store/authStore';
import { useNotificationStore } from '@/store/notificationStore';
import { getNotificationTimeAgo } from '@/lib/notification-api';
import { wp, hp, spacing, fontSize, scale } from '@/utils/responsive';

export default function NotificationsScreen() {
  const { profile, initialized } = useAuthStore();
  const {
    notifications,
    unreadCount,
    loading,
    loadNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    deleteNotification,
    cleanupOld,
  } = useNotificationStore();

  const [refreshing, setRefreshing] = React.useState(false);

  useEffect(() => {
    // Wait for auth to initialize
    if (!initialized) return;

    // Redirect to login if user is not authenticated
    if (!profile) {
      router.replace('/(auth)/login');
      return;
    }

    loadNotifications(profile.id);
    cleanupOld(profile.id);
  }, [profile?.id, initialized]);

  const handleRefresh = async () => {
    if (!profile?.id) return;
    setRefreshing(true);
    await loadNotifications(profile.id);
    await cleanupOld(profile.id);
    setRefreshing(false);
  };

  const handleNotificationPress = async (notification: any) => {
    // Mark as read if unread
    if (!notification.is_read) {
      await markNotificationAsRead(notification.id);
    }

    // Navigate to the referenced property or item if available
    if (notification.reference_type && notification.reference_id) {
      if (notification.reference_type === 'property') {
        router.push(`/property/${notification.reference_id}`);
      } else if (notification.reference_type === 'marketplace_item') {
        // Include category parameter for marketplace items
        const category = notification.category || 'electronics'; // fallback to electronics if no category
        router.push(`/marketplace/${notification.reference_id}?category=${category}`);
      }
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!profile?.id) return;
    await markAllNotificationsAsRead(profile.id);
  };

  const handleDelete = async (notificationId: string) => {
    await deleteNotification(notificationId);
  };

  const renderNotification = ({ item }: { item: any }) => {
    const isUnread = !item.is_read;

    return (
      <TouchableOpacity
        style={[styles.notificationCard, isUnread && styles.unreadCard]}
        onPress={() => handleNotificationPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.notificationContent}>
          {/* Icon */}
          <View style={[styles.iconContainer, isUnread && styles.unreadIcon]}>
            <Ionicons
              name={item.type === 'system' ? 'notifications' : 'chatbubble'}
              size={24}
              color={isUnread ? '#10B981' : '#999'}
            />
          </View>

          {/* Content */}
          <View style={styles.textContent}>
            <Text style={[styles.title, isUnread && styles.unreadText]}>
              {item.title}
            </Text>
            <Text style={styles.message} numberOfLines={2}>
              {item.message}
            </Text>
            <Text style={styles.time}>{getNotificationTimeAgo(item.created_at)}</Text>
          </View>

          {/* Unread indicator & Delete */}
          <View style={styles.actionContainer}>
            {isUnread && <View style={styles.unreadDot} />}
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => handleDelete(item.id)}
            >
              <Ionicons name="trash-outline" size={20} color="#EF4444" />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="notifications-off-outline" size={80} color="#ccc" />
        <Text style={styles.emptyTitle}>No notifications</Text>
        <Text style={styles.emptySubtitle}>
          You'll see notifications here when you receive them
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Notifications</Text>
          {unreadCount > 0 && (
            <View style={styles.headerBadge}>
              <Text style={styles.headerBadgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity
            style={styles.markAllButton}
            onPress={handleMarkAllAsRead}
          >
            <Text style={styles.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Notifications List */}
      <FlatList
        data={notifications}
        renderItem={renderNotification}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={!loading ? renderEmpty : null}
        contentContainerStyle={notifications.length === 0 ? styles.emptyListContent : styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#10B981']}
            tintColor="#10B981"
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    gap: spacing.md,
  },
  backButton: {
    width: scale(40),
    height: scale(40),
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerTitle: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  headerBadge: {
    backgroundColor: '#EF4444',
    borderRadius: scale(12),
    minWidth: scale(24),
    height: scale(24),
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
  },
  headerBadgeText: {
    color: '#fff',
    fontSize: fontSize.xs,
    fontWeight: '700',
  },
  markAllButton: {
    paddingVertical: spacing.xs,
  },
  markAllText: {
    color: '#10B981',
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  listContent: {
    paddingBottom: spacing.lg,
  },
  emptyListContent: {
    flexGrow: 1,
  },
  notificationCard: {
    backgroundColor: '#fff',
    marginHorizontal: spacing.lg,
    marginTop: spacing.base,
    borderRadius: spacing.md,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  unreadCard: {
    backgroundColor: '#F0FDF4',
    borderColor: '#10B981',
  },
  notificationContent: {
    flexDirection: 'row',
    padding: spacing.base,
    gap: spacing.md,
  },
  iconContainer: {
    width: scale(48),
    height: scale(48),
    borderRadius: scale(24),
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadIcon: {
    backgroundColor: '#D1FAE5',
  },
  textContent: {
    flex: 1,
  },
  title: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: spacing.xs / 2,
  },
  unreadText: {
    fontWeight: '700',
  },
  message: {
    fontSize: fontSize.sm,
    color: '#666',
    lineHeight: fontSize.lg,
    marginBottom: spacing.xs,
  },
  time: {
    fontSize: fontSize.xs,
    color: '#999',
  },
  actionContainer: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  unreadDot: {
    width: scale(10),
    height: scale(10),
    borderRadius: scale(5),
    backgroundColor: '#10B981',
  },
  deleteButton: {
    padding: spacing.xs,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxxl + spacing.lg,
  },
  emptyTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: '#666',
    marginTop: spacing.base,
  },
  emptySubtitle: {
    fontSize: fontSize.base,
    color: '#999',
    marginTop: spacing.sm,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
  retryButton: {
    backgroundColor: '#10B981',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: spacing.md,
    marginTop: spacing.lg,
  },
  retryText: {
    color: '#fff',
    fontSize: fontSize.base,
    fontWeight: '600',
  },
});
