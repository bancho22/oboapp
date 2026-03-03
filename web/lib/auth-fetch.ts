import type { User } from "firebase/auth";

export async function getAuthHeaderValue(user: User): Promise<string> {
  const token = await user.getIdToken();
  return `Bearer ${token}`;
}

export async function fetchWithAuth(
  user: User,
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set("Authorization", await getAuthHeaderValue(user));

  return fetch(input, {
    ...init,
    headers,
  });
}
