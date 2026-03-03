import { describe, it, expect, vi, beforeEach } from "vitest";
import type { User } from "firebase/auth";
import { fetchWithAuth, getAuthHeaderValue } from "./auth-fetch";

describe("auth-fetch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it("builds bearer auth header from Firebase token", async () => {
    const user = {
      getIdToken: vi.fn().mockResolvedValue("id-token-123"),
    } as unknown as User;

    const authHeader = await getAuthHeaderValue(user);

    expect(authHeader).toBe("Bearer id-token-123");
    expect(user.getIdToken).toHaveBeenCalledTimes(1);
  });

  it("adds Authorization header while preserving existing headers", async () => {
    const user = {
      getIdToken: vi.fn().mockResolvedValue("id-token-123"),
    } as unknown as User;

    const response = new Response(JSON.stringify({ ok: true }), {
      status: 200,
    });
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(response);

    await fetchWithAuth(user, "/api/test", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ hello: "world" }),
    });

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/test",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ hello: "world" }),
      }),
    );

    const [, requestInit] = (global.fetch as ReturnType<typeof vi.fn>).mock
      .calls[0] as [string, RequestInit];
    const headers = requestInit.headers as Headers;

    expect(headers.get("Authorization")).toBe("Bearer id-token-123");
    expect(headers.get("Content-Type")).toBe("application/json");
  });
});
