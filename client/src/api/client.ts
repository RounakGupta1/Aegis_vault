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

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "";

export async function api<T>(path: string, init: RequestInit = {}): Promise<ApiResult<T>> {
  const headers = new Headers(init.headers);

  if (!(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const method = (init.method ?? "GET").toUpperCase();

  if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
    headers.set("X-CSRF-Token", csrfToken());
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    credentials: "include",
    headers,
  });

  let json: ApiResult<T>;

  try {
    json = (await response.json()) as ApiResult<T>;
  } catch {
    throw new Error(
      response.ok ? "Invalid server response" : `Request failed (${response.status})`,
    );
  }

  if (!response.ok || !json.success) {
    throw new Error(json.message || "Request failed");
  }

  return json;
}