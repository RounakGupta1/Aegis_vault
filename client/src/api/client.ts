type ApiResult<T> = {
  success: boolean;
  message: string;
  data: T;
  errors?: unknown;
};

function csrfToken() {
  const match = document.cookie.match(/(?:^|; )aegis_csrf=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : "";
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<ApiResult<T>> {
  const headers = new Headers(init.headers);
  if (!(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  const method = (init.method ?? "GET").toUpperCase();
  if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
    headers.set("X-CSRF-Token", csrfToken());
  }
  const response = await fetch(path, {
    ...init,
    credentials: "include",
    headers,
  });
  const json = (await response.json()) as ApiResult<T>;
  if (!response.ok || !json.success) {
    throw new Error(json.message || "Request failed");
  }
  return json;
}
