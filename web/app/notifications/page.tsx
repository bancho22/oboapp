"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { NotificationHistoryItem } from "@/lib/types";
import Link from "next/link";
import { createMessageUrlFromId } from "@/lib/url-utils";
import { createSnippet } from "@/lib/text-utils";
import { useSubscriptionStatus } from "@/lib/hooks/useSubscriptionStatus";
import { buttonStyles, buttonSizes } from "@/lib/theme";
import { borderRadius } from "@/lib/colors";
import BackButton from "@/components/BackButton";
import SubscribeDevicePrompt from "@/app/settings/SubscribeDevicePrompt";
import {
  subscribeCurrentDeviceForUser,
  getEnableNotificationsMessage,
} from "@/lib/notification-service";
import {
  fetchNotificationHistory,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  formatNotificationDateTime,
} from "@/lib/notification-history";

export default function NotificationsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const subscriptionStatus = useSubscriptionStatus(user);
  const [notifications, setNotifications] = useState<NotificationHistoryItem[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [nextOffset, setNextOffset] = useState<number | null>(null);

  const fetchNotifications = useCallback(
    async (offset = 0, append = false) => {
      if (!user) return;

      try {
        if (append) {
          setIsLoadingMore(true);
        } else {
          setIsLoading(true);
          setError(null);
        }

        const data = await fetchNotificationHistory(user, offset);

        if (append) {
          setNotifications((prev) => [...prev, ...(data.items || [])]);
        } else {
          setNotifications(data.items || []);
        }

        setHasMore(data.hasMore || false);
        setNextOffset(data.nextOffset);
      } catch (err) {
        console.error("Error fetching notifications:", err);
        setError("Неуспешно зареждане на известията");
        if (!append) {
          setNotifications([]);
        }
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [user],
  );

  const handleLoadMore = useCallback(() => {
    if (nextOffset !== null && !isLoadingMore) {
      fetchNotifications(nextOffset, true);
    }
  }, [nextOffset, isLoadingMore, fetchNotifications]);

  const handleSubscribeCurrentDevice = async () => {
    if (!user) return;

    try {
      const result = await subscribeCurrentDeviceForUser(user);
      if (!result.ok) {
        alert(getEnableNotificationsMessage(result.reason));
        return;
      }

      // Re-check subscription status after subscribing
      await subscriptionStatus.checkStatus();
    } catch (error) {
      console.error("Error subscribing:", error);
      alert("Грешка при абонирането");
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    if (!user) return;

    try {
      await markNotificationAsRead(user, notificationId);

      setNotifications((prev) => {
        const updatedNotifications = prev.map((n) =>
          n.id === notificationId
            ? { ...n, readAt: new Date().toISOString() }
            : n,
        );

        // Notify other components (e.g., NotificationBell) to refetch unread count
        if (typeof window !== "undefined") {
          const newUnreadCount = updatedNotifications.filter(
            (n) => !n.readAt,
          ).length;
          window.dispatchEvent(
            new CustomEvent("notifications:unread-count-changed", {
              detail: { count: newUnreadCount },
            }),
          );
        }

        return updatedNotifications;
      });
    } catch (err) {
      console.error("Error marking notification as read:", err);
    }
  };

  const handleMarkAllRead = async () => {
    if (!user) return;

    try {
      await markAllNotificationsAsRead(user);

      const now = new Date().toISOString();
      setNotifications((prev) => prev.map((n) => ({ ...n, readAt: now })));

      // Notify other components (e.g., NotificationBell) that all are now read
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("notifications:unread-count-changed", {
            detail: { count: 0 },
          }),
        );
      }
    } catch (err) {
      console.error("Error marking all notifications as read:", err);
    }
  };

  useEffect(() => {
    if (!user) {
      router.push("/");
      return;
    }

    fetchNotifications();
    // Subscription status is managed by the hook
  }, [user, router, fetchNotifications]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Back button */}
          <div className="mb-6">
            <BackButton />
          </div>

          <h1 className="text-3xl font-bold text-gray-900 mb-8">Известия</h1>
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Back button */}
        <div className="mb-6">
          <BackButton />
        </div>

        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Известия</h1>
          {notifications.length > 0 && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="text-sm text-primary hover:text-primary-hover hover:underline cursor-pointer transition-colors"
            >
              Маркирай всички прочетени
            </button>
          )}
        </div>

        {error && (
          <div className="bg-error-light border border-error-border rounded-lg p-4 mb-6">
            <p className="text-error">{error}</p>
          </div>
        )}

        {/* Subscription warning - first item */}
        {!subscriptionStatus.isCurrentDeviceSubscribed && (
          <div className="mb-6">
            <SubscribeDevicePrompt
              onSubscribe={handleSubscribeCurrentDevice}
              hasAnySubscriptions={subscriptionStatus.hasAnySubscriptions}
              isGuestUser={user?.isAnonymous ?? false}
            />
          </div>
        )}

        {notifications.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-neutral text-lg">Нямате известия</p>
          </div>
        ) : (
          <div className="space-y-0">
            {notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkAsRead={handleMarkAsRead}
              />
            ))}
            {hasMore && (
              <div className="p-4 text-center bg-white border-t border-neutral-border">
                <button
                  type="button"
                  onClick={handleLoadMore}
                  disabled={isLoadingMore}
                  className={`${buttonStyles.secondary} ${buttonSizes.md} ${borderRadius.md} ${isLoadingMore ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  {isLoadingMore ? "Зареждане..." : "Зареди още"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

interface NotificationItemProps {
  readonly notification: NotificationHistoryItem;
  readonly onMarkAsRead: (id: string) => void;
}

function NotificationItem({
  notification,
  onMarkAsRead,
}: NotificationItemProps) {
  const isUnread = !notification.readAt;
  const messagePreview = createSnippet(notification.messageSnapshot.text);

  const formattedDate = formatNotificationDateTime(notification.notifiedAt);

  const handleClick = () => {
    if (isUnread) {
      onMarkAsRead(notification.id);
    }
  };

  return (
    <Link
      href={createMessageUrlFromId(notification.messageId)}
      onClick={handleClick}
      className={`block p-4 border-b border-neutral-border hover:bg-neutral-light transition-colors bg-white ${
        isUnread ? "!bg-info-light" : ""
      }`}
    >
      <div className="flex items-start gap-3">
        {isUnread && (
          <span className="mt-1 w-2 h-2 bg-primary rounded-full flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-xs text-neutral">{formattedDate}</span>
            {notification.distance !== undefined && (
              <span className="text-xs text-neutral">
                {Math.round(notification.distance)}m
              </span>
            )}
          </div>
          <p className="text-sm text-foreground whitespace-pre-wrap">
            {messagePreview}
          </p>
        </div>
      </div>
    </Link>
  );
}
