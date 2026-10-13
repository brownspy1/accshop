const RESEND_API = "https://api.resend.com";

export type ResendDomain = { id: string; name: string; status: string; sendingEnabled: boolean };
export class ResendApiError extends Error {
  constructor(readonly code: string, readonly ambiguous: boolean = false) {
    super(`Resend request failed (${code}).`);
    this.name = "ResendApiError";
  }
}

async function apiJson(apiKey: string, path: string, options: { method?: "GET" | "POST"; body?: unknown; idempotencyKey?: string } = {}) {
  if (!apiKey || apiKey.length > 2048) throw new ResendApiError("credentials_unavailable");
  const headers: Record<string, string> = { Authorization: `Bearer ${apiKey}`, Accept: "application/json" };
  if (options.body !== undefined) headers["Content-Type"] = "application/json";
  if (options.idempotencyKey) headers["Idempotency-Key"] = options.idempotencyKey;
  let response: Response;
  try {
    response = await fetch(`${RESEND_API}${path}`, {
      method: options.method ?? "GET",
      headers,
      ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
      signal: AbortSignal.timeout(12_000),
      redirect: "error",
    });
  } catch {
    throw new ResendApiError("network_or_timeout", options.method === "POST");
  }
  let body: unknown;
  try { body = await response.json(); }
  catch { throw new ResendApiError(`http_${response.status}_invalid_response`, options.method === "POST" && response.status >= 500); }
  if (!response.ok) throw new ResendApiError(`http_${response.status}`, options.method === "POST" && (response.status >= 500 || response.status === 408 || response.status === 409));
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new ResendApiError("invalid_response", options.method === "POST");
  return body as Record<string, unknown>;
}

export async function listResendDomains(apiKey: string): Promise<ResendDomain[]> {
  const body = await apiJson(apiKey, "/domains");
  if (!Array.isArray(body.data)) throw new ResendApiError("invalid_domain_list");
  return body.data.flatMap((entry: unknown) => {
    if (!entry || typeof entry !== "object") return [];
    const row = entry as Record<string, unknown>;
    if (typeof row.id !== "string" || typeof row.name !== "string" || typeof row.status !== "string") return [];
    const capabilities = row.capabilities && typeof row.capabilities === "object" ? row.capabilities as Record<string, unknown> : {};
    return [{ id: row.id, name: row.name.toLowerCase(), status: row.status, sendingEnabled: capabilities.sending === "enabled" }];
  });
}

export function verifiedSenderDomain(fromAddress: string, domains: ResendDomain[]) {
  const email = /<([^<>\s]+)>/.exec(fromAddress)?.[1] ?? fromAddress.trim();
  if (!/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(email)) return null;
  const domain = email.slice(email.lastIndexOf("@") + 1).toLowerCase();
  return domains.find(item => item.status === "verified" && item.sendingEnabled && (domain === item.name || domain.endsWith(`.${item.name}`))) ?? null;
}

export async function sendResendEmail(apiKey: string, input: {
  from: string;
  to: string;
  subject: string;
  html: string;
  text: string;
  idempotencyKey: string;
}) {
  if (!input.idempotencyKey || input.idempotencyKey.length > 256 || /[\r\n]/.test(input.from + input.to + input.subject)) {
    throw new ResendApiError("invalid_message");
  }
  const body = await apiJson(apiKey, "/emails", {
    method: "POST",
    idempotencyKey: input.idempotencyKey,
    body: { from: input.from, to: [input.to], subject: input.subject, html: input.html, text: input.text },
  });
  if (typeof body.id !== "string" || !body.id) throw new ResendApiError("sent_response_missing_id", true);
  return { id: body.id };
}
