"use client";

/**
 * 공통 fetch 래퍼
 * - JSON 파싱
 * - HTTP 에러를 예외로 던짐
 * - 401 시 로그인으로 리다이렉트(브라우저 환경)
 * - abortSignal 지원
 */
export async function fetchJson<T = unknown>(
  input: string | URL | Request,
  init: RequestInit & { json?: any } = {}
): Promise<T> {
  const { json, ...rest } = init;
  const headers = new Headers(rest.headers || {});
  if (json !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(input, {
    credentials: "include",
    ...rest,
    headers,
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  });

  const isJson =
    res.headers.get("content-type")?.includes("application/json") ?? false;
  const data = isJson ? await res.json().catch(() => null) : null;

  if (!res.ok) {
    const message = (data as any)?.error || res.statusText || "Request failed";
    if (res.status === 401 && typeof window !== "undefined") {
      // 세션 만료 시 로그인으로 이동
      const redirect = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.href = `/login?redirect=${redirect}`;
    }
    throw Object.assign(new Error(message), { status: res.status, data });
  }

  return data as T;
}
