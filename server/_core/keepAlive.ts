/**
 * Render Web Service 24/7 Keep-Alive Helper
 *
 * Render Free tier web services go to sleep after 15 minutes of inactivity.
 * This background heartbeat sends a lightweight external HTTP ping to the public URL
 * every 10 minutes so Render's edge router registers activity and resets the idle timer.
 */

export interface KeepAliveHandle {
  initialTimer: NodeJS.Timeout;
  periodicTimer: NodeJS.Timeout;
  stop: () => void;
}

export function startKeepAlive(): KeepAliveHandle | undefined {
  const isProduction = process.env.NODE_ENV === "production";
  const explicitEnable = process.env.ENABLE_KEEP_ALIVE === "true";

  if (!isProduction && !explicitEnable) {
    return undefined;
  }

  // Determine external URL (Render automatically sets RENDER_EXTERNAL_URL in production)
  const baseExternalUrl =
    process.env.KEEP_ALIVE_URL ||
    process.env.RENDER_EXTERNAL_URL ||
    "https://accshop-767l.onrender.com";

  const targetEndpoint = baseExternalUrl.endsWith("/api/health")
    ? baseExternalUrl
    : `${baseExternalUrl.replace(/\/$/, "")}/api/health`;

  const intervalMinutes = Math.max(
    3,
    Number(process.env.KEEP_ALIVE_INTERVAL_MINUTES || "10")
  );
  const intervalMs = intervalMinutes * 60 * 1000;

  console.log(
    `[KeepAlive] Configured to ping ${targetEndpoint} every ${intervalMinutes} minutes.`
  );

  // Initial ping 45 seconds after server startup
  const initialTimer = setTimeout(() => {
    void executePing(targetEndpoint);
  }, 45_000);
  if (typeof initialTimer.unref === "function") {
    initialTimer.unref();
  }

  // Periodic recurring heartbeat
  const periodicTimer = setInterval(() => {
    void executePing(targetEndpoint);
  }, intervalMs);
  if (typeof periodicTimer.unref === "function") {
    periodicTimer.unref();
  }

  return {
    initialTimer,
    periodicTimer,
    stop: () => {
      clearTimeout(initialTimer);
      clearInterval(periodicTimer);
    },
  };
}

export async function executePing(url: string): Promise<boolean> {
  try {
    const startTime = Date.now();
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": "AccShop-Internal-Heartbeat/1.0",
        "Cache-Control": "no-cache",
      },
      signal: AbortSignal.timeout(20_000),
    });

    const elapsedMs = Date.now() - startTime;
    if (response.ok) {
      console.log(
        `[KeepAlive] Heartbeat OK (${response.status}) in ${elapsedMs}ms -> ${url}`
      );
      return true;
    } else {
      console.warn(
        `[KeepAlive] Heartbeat status ${response.status} in ${elapsedMs}ms -> ${url}`
      );
      return false;
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`[KeepAlive] Heartbeat request warning: ${message}`);
    return false;
  }
}
