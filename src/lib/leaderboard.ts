// Ranking of players by points. If the "leaderboard" table exists in the database the ranking is shared by everyone;
// otherwise a clearly-labelled example ranking is shown, with the player's own points in it.
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Row = { nick: string; points: number; me?: boolean };
const NICK = "aura_nick";
const DEVICE = "aura_device_id";

export const getNick = () => localStorage.getItem(NICK) ?? "";
export const setNick = (n: string) => localStorage.setItem(NICK, n.trim().slice(0, 18));
const deviceId = () => {
  let id = localStorage.getItem(DEVICE);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(DEVICE, id);
  }
  return id;
};

const EXAMPLE: Row[] = [
  { nick: "Giulia (esempio)", points: 142 },
  { nick: "Matteo (esempio)", points: 118 },
  { nick: "Chiara (esempio)", points: 97 },
  { nick: "Luca (esempio)", points: 76 },
  { nick: "Sara (esempio)", points: 51 },
  { nick: "Paolo (esempio)", points: 33 },
];

export function useLeaderboard(points: number, nick: string) {
  const [rows, setRows] = useState<Row[]>([]);
  const [shared, setShared] = useState(false);
  useEffect(() => {
    let off = false;
    (async () => {
      try {
        // Publish my points (only if the table exists and I chose a nickname).
        const db = supabase as unknown as { from: (t: string) => { select: (c: string) => { order: (c: string, o: { ascending: boolean }) => { limit: (n: number) => Promise<{ data: { nick: string; points: number; device_id: string }[] | null; error: unknown }> } }; upsert: (v: object) => Promise<{ error: unknown }> } };
        if (nick) await db.from("leaderboard").upsert({ device_id: deviceId(), nick, points, updated_at: new Date().toISOString() });
        const r = await db.from("leaderboard").select("nick, points, device_id").order("points", { ascending: false }).limit(20);
        if (off) return;
        if (r.error || !r.data) throw new Error("no table");
        setShared(true);
        setRows(r.data.map((x) => ({ nick: x.nick, points: x.points, me: x.device_id === deviceId() })));
      } catch {
        if (off) return;
        setShared(false);
        const me: Row = { nick: nick || "Tu", points, me: true };
        setRows([...EXAMPLE, me].sort((a, b) => b.points - a.points));
      }
    })();
    return () => {
      off = true;
    };
  }, [points, nick]);
  return { rows, shared };
}
