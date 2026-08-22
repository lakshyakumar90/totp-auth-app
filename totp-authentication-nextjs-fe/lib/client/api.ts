export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

/**
 * Client fetch wrapper. All requests go through Next.js API routes so the
 * httpOnly auth cookie is attached by the server proxy. A 401 means the
 * session is gone (refresh already attempted server-side) -> redirect.
 */
export async function api<T = unknown>(
  path: string,
  init: { method?: string; body?: unknown } = {},
): Promise<T> {
  const res = await fetch(path, {
    method: init.method ?? "GET",
    headers: init.body === undefined ? undefined : { "Content-Type": "application/json" },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    cache: "no-store",
  });

  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    if (res.status === 401 && typeof window !== "undefined") {
      const returnTo = encodeURIComponent(
        `${window.location.pathname}${window.location.search}`,
      );
      window.location.href = `/login?next=${returnTo}`;
      throw new ApiError("Session expired", 401);
    }
    const message =
      (data as { message?: string } | null)?.message ?? "Request failed";
    throw new ApiError(message, res.status);
  }

  return data as T;
}

export const http = {
  get: <T>(path: string) => api<T>(path),
  post: <T>(path: string, body: unknown) =>
    api<T>(path, { method: "POST", body }),
  del: <T>(path: string) => api<T>(path, { method: "DELETE" }),
};