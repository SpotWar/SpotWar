import { ATHLETE } from "../data/athlete.js";

/** Strava webhook event payload (https://developers.strava.com/docs/webhooks/). */
export interface StravaWebhookEvent {
  aspect_type: "create" | "update" | "delete";
  event_time: number; // unix seconds
  object_id: number; // activity or athlete id
  object_type: "activity" | "athlete";
  owner_id: number; // athlete id
  subscription_id: number;
  updates: Record<string, string>;
}

export interface SimulateOptions {
  objectId?: number;
  ownerId?: number;
  aspectType?: StravaWebhookEvent["aspect_type"];
  objectType?: StravaWebhookEvent["object_type"];
}

const SUBSCRIPTION_ID = 120_475;

export function buildWebhookEvent(opts: SimulateOptions = {}): StravaWebhookEvent {
  return {
    aspect_type: opts.aspectType ?? "create",
    // Date is fine here (runtime server, not a workflow script).
    event_time: Math.floor(Date.now() / 1000),
    object_id: opts.objectId ?? 9_001,
    object_type: opts.objectType ?? "activity",
    owner_id: opts.ownerId ?? ATHLETE.id,
    subscription_id: SUBSCRIPTION_ID,
    updates: {},
  };
}

export interface DispatchResult {
  delivered: boolean;
  targetUrl: string;
  status?: number;
  responseBody?: string;
  error?: string;
}

/**
 * POST a webhook event to the local Supabase Edge Function receiver, forwarding
 * the anon key as a Bearer token (Edge Functions require an Authorization header
 * by default). Failures are returned, not thrown, so /simulate-webhook always
 * answers with what happened downstream.
 */
export async function dispatchWebhook(
  event: StravaWebhookEvent,
  targetUrl: string,
  anonKey?: string,
): Promise<DispatchResult> {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (anonKey) {
    headers["authorization"] = `Bearer ${anonKey}`;
    headers["apikey"] = anonKey;
  }
  try {
    const res = await fetch(targetUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(event),
    });
    return {
      delivered: res.ok,
      targetUrl,
      status: res.status,
      responseBody: (await res.text()).slice(0, 1000),
    };
  } catch (err) {
    return {
      delivered: false,
      targetUrl,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
