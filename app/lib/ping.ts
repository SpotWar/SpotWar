import { supabase } from './supabase';

/**
 * A row of the `ping` smoke-test table (see supabase/migrations/*_ping.sql).
 * Only the columns the round-trip renders are typed here.
 */
export type Ping = {
  id: string;
  note: string | null;
  created_at: string;
};

/**
 * Insert one ping row, then read the latest row back — the Expo ↔ Supabase
 * round-trip that is the DoD for 86badf56w. Returns the row that was read back
 * (not necessarily the one inserted, if other clients wrote concurrently),
 * which is enough to prove read + write both work end to end.
 *
 * Throws on any Supabase error so the caller can surface it; the most likely
 * cause in dev is missing RLS policies (an unconfigured client yields a network
 * error instead).
 */
export async function pingRoundTrip(): Promise<Ping> {
  const { error: insertError } = await supabase
    .from('ping')
    .insert({ note: 'hello from app' });
  if (insertError) {
    throw new Error(`ping insert failed: ${insertError.message}`);
  }

  const { data, error: selectError } = await supabase
    .from('ping')
    .select('id, note, created_at')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  if (selectError) {
    throw new Error(`ping select failed: ${selectError.message}`);
  }

  return data as Ping;
}
