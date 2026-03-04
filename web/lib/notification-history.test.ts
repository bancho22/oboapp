import { beforeEach, describe, expect, it, vi } from "vitest";
import type { User } from "firebase/auth";
import {
  fetchNotificationHistory,
  fetchUnreadNotificationCount,
  formatNotificationDateTime,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "./notification-history";

describe("notification-history", () => {
  const user = {
    getIdToken: vi.fn().mockResolvedValue("token-123"),
  } as unknown as User;

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it("fetches paginated notification history", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          items: [{ id: "n1" }],
          hasMore: true,
          nextOffset: 20,
        }),
        { status: 200 },
      ),
    );

    const page = await fetchNotificationHistory(user, 20);

    expect(page.items).toHaveLength(1);
    expect(page.hasMore).toBe(true);
    expect(page.nextOffset).toBe(20);
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/notifications/history?limit=20&offset=20",
      expect.any(Object),
    );
  });

  it("marks single notification as read", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      new Response(null, { status: 200 }),
    );

    await markNotificationAsRead(user, "notif-1");

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/notifications/mark-read",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("marks all notifications as read", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      new Response(null, { status: 200 }),
    );

    await markAllNotificationsAsRead(user);

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/notifications/mark-all-read",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("fetches unread count", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      new Response(JSON.stringify({ count: 7 }), { status: 200 }),
    );

    const count = await fetchUnreadNotificationCount(user);

    expect(count).toBe(7);
  });

  it("formats BG notification date", () => {
    const formatted = formatNotificationDateTime("2026-03-04T10:30:00.000Z");
    expect(formatted).toContain(" ");
    expect(formatted.length).toBeGreaterThan(4);
  });
});
