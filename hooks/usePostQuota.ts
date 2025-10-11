/**
 * USE POST QUOTA HOOK
 * Checks user's monthly post quota based on subscription plan
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

interface PostQuotaInfo {
  canPost: boolean;
  postsRemaining: number;
  maxPosts: number;
  postsUsed: number;
  message: string;
  maxImagesPerPost: number;
  maxVideosPerPost: number;
}

interface UsePostQuotaReturn {
  quotaInfo: PostQuotaInfo | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  incrementPostCount: () => Promise<boolean>;
}

export function usePostQuota(userId: string | undefined): UsePostQuotaReturn {
  const [quotaInfo, setQuotaInfo] = useState<PostQuotaInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchQuota = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Call the can_user_post function
      const { data, error: rpcError } = await supabase.rpc('can_user_post', {
        p_user_id: userId,
      });

      if (rpcError) {
        throw rpcError;
      }

      if (data && data.length > 0) {
        const result = data[0];

        // Get subscription plan details for media limits
        const { data: subscription } = await supabase
          .from('user_subscriptions')
          .select(`
            posts_used_this_month,
            subscription_plans (
              max_posts_per_month,
              max_images_per_post,
              max_videos_per_post
            )
          `)
          .eq('user_id', userId)
          .eq('status', 'active')
          .single();

        const planDetails = subscription?.subscription_plans;

        setQuotaInfo({
          canPost: result.can_post,
          postsRemaining: result.posts_remaining,
          maxPosts: result.max_posts,
          postsUsed: result.max_posts - result.posts_remaining,
          message: result.message,
          maxImagesPerPost: planDetails?.max_images_per_post || 0,
          maxVideosPerPost: planDetails?.max_videos_per_post || 0,
        });
      } else {
        // No active subscription
        setQuotaInfo({
          canPost: false,
          postsRemaining: 0,
          maxPosts: 0,
          postsUsed: 0,
          message: 'No active subscription',
          maxImagesPerPost: 0,
          maxVideosPerPost: 0,
        });
      }
    } catch (err) {
      console.error('Error fetching post quota:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch post quota');
      setQuotaInfo(null);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const incrementPostCount = useCallback(async (): Promise<boolean> => {
    if (!userId) return false;

    try {
      const { data, error: rpcError } = await supabase.rpc('increment_post_count', {
        p_user_id: userId,
      });

      if (rpcError) {
        console.error('Error incrementing post count:', rpcError);
        return false;
      }

      // Refresh quota after increment
      await fetchQuota();

      return data === true;
    } catch (err) {
      console.error('Error incrementing post count:', err);
      return false;
    }
  }, [userId, fetchQuota]);

  useEffect(() => {
    fetchQuota();
  }, [fetchQuota]);

  return {
    quotaInfo,
    loading,
    error,
    refresh: fetchQuota,
    incrementPostCount,
  };
}
