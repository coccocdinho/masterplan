import "server-only";
import jwt from "jsonwebtoken";

// Thin Google Sheets v4 client over fetch (service-account JWT, no googleapis dependency).

let cached = null; // { token, exp }

function loadKey() {
  const b64 = process.env.GOOGLE_SA_KEY_B64;
  if (!b64) throw new Error("Thiếu GOOGLE_SA_KEY_B64.");
  try {
    return JSON.parse(Buffer.from(b64, "base64").toString("utf8"));
  } catch {
    throw new Error("GOOGLE_SA_KEY_B64 không hợp lệ.");
  }
}

export function sheetId() {
  const id = process.env.GOOGLE_SHEET_ID;
  if (!id) throw new Error("Thiếu GOOGLE_SHEET_ID.");
  return id;
}

export function sheetsConfigured() {
  return !!(process.env.GOOGLE_SA_KEY_B64 && process.env.GOOGLE_SHEET_ID);
}

async function accessToken() {
  const now = Math.floor(Date.now() / 1000);
  if (cached && cached.exp - 60 > now) return cached.token;
  const key = loadKey();
  const assertion = jwt.sign(
    { iss: key.client_email, scope: "https://www.googleapis.com/auth/spreadsheets", aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 },
    key.private_key,
    { algorithm: "RS256" }
  );
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
  });
  const j = await r.json();
  if (!j.access_token) throw new Error(`Không lấy được token Google: ${j.error_description || j.error || r.status}`);
  cached = { token: j.access_token, exp: now + (j.expires_in || 3600) };
  return cached.token;
}

async function call(path, { method = "GET", body } = {}) {
  const token = await accessToken();
  const r = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId()}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`Google Sheets ${r.status}: ${j.error?.message || "lỗi không xác định"}`);
  return j;
}

/** [{ gid, title, index, hidden }] */
export async function listTabs() {
  const j = await call("?fields=sheets.properties(sheetId,title,index,hidden,sheetType)");
  return (j.sheets || [])
    .map((s) => s.properties)
    .filter((p) => p.sheetType === "GRID")
    .map((p) => ({ gid: p.sheetId, title: p.title, index: p.index, hidden: !!p.hidden }));
}

const q = (title) => `'${title.replace(/'/g, "''")}'`;

/** Raw grid values for many tabs in one call. Returns { [title]: any[][] } — dates as serial numbers. */
export async function readTabs(titles, lastCol = "Z") {
  if (!titles.length) return {};
  const params = new URLSearchParams({ valueRenderOption: "UNFORMATTED_VALUE", dateTimeRenderOption: "SERIAL_NUMBER" });
  titles.forEach((t) => params.append("ranges", `${q(t)}!A1:${lastCol}2000`));
  const j = await call(`/values:batchGet?${params.toString()}`);
  const out = {};
  (j.valueRanges || []).forEach((vr, i) => { out[titles[i]] = vr.values || []; });
  return out;
}

/** writes: [{ tab, range: "K4" | "B4:H4", values: [[...]] }] — RAW so existing cell formats (dates) are kept. */
export async function writeCells(writes) {
  if (!writes.length) return;
  for (let i = 0; i < writes.length; i += 400) {
    await call("/values:batchUpdate", {
      method: "POST",
      body: {
        valueInputOption: "RAW",
        data: writes.slice(i, i + 400).map((w) => ({ range: `${q(w.tab)}!${w.range}`, values: w.values })),
      },
    });
  }
}

export async function clearRange(tab, range) {
  await call(`/values/${encodeURIComponent(`${q(tab)}!${range}`)}:clear`, { method: "POST", body: {} });
}

/** Duplicates a tab under a new title and returns the new tab's { gid, title }. */
export async function duplicateTab(sourceGid, newTitle) {
  const j = await call(":batchUpdate", {
    method: "POST",
    body: { requests: [{ duplicateSheet: { sourceSheetId: sourceGid, newSheetName: newTitle } }] },
  });
  const p = j.replies?.[0]?.duplicateSheet?.properties;
  return { gid: p.sheetId, title: p.title };
}

export async function addBlankTab(title) {
  const j = await call(":batchUpdate", {
    method: "POST",
    body: { requests: [{ addSheet: { properties: { title, gridProperties: { frozenRowCount: 3 } } } }] },
  });
  const p = j.replies?.[0]?.addSheet?.properties;
  return { gid: p.sheetId, title: p.title };
}

// Sheets serial date (days since 1899-12-30) <-> ISO yyyy-mm-dd.
export function serialToIso(n) {
  if (typeof n !== "number" || !isFinite(n)) return "";
  const d = new Date(Math.round((n - 25569) * 86400) * 1000);
  return d.toISOString().slice(0, 10);
}
export function isoToSerial(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return "";
  return Math.round(Date.UTC(y, m - 1, d) / 86400000) + 25569;
}

/** 0-based column index -> A1 letters. */
export function colLetter(i) {
  let s = "";
  for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
}
