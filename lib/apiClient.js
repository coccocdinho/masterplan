"use client";

export async function apiFetch(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    credentials: "include",
  });
  let body = null;
  try { body = await res.json(); } catch {}
  if (!res.ok) throw new Error(body?.error || `Lỗi ${res.status}`);
  return body;
}

export const apiGet = (url) => apiFetch(url);
export const apiPost = (url, data) => apiFetch(url, { method: "POST", body: JSON.stringify(data || {}) });
export const apiPatch = (url, data) => apiFetch(url, { method: "PATCH", body: JSON.stringify(data || {}) });
export const apiDelete = (url) => apiFetch(url, { method: "DELETE" });
