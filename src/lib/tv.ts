import { useEffect, useState } from "react";

export type TvData =
  | { status: "ok"; date: string; channels: { name: string; shows: { hour: string; title: string; minutes: number }[] }[]; source: string }
  | { status: "unavailable"; source: string };

/** Tonight's prime-time TV, refreshed by the server once a day. */
export function useTv(): TvData | null {
  const [data, setData] = useState<TvData | null>(null);
  useEffect(() => {
    let stop = false;
    fetch("/api/tv-tonight", { cache: "no-cache" })
      .then((r) => r.json() as Promise<TvData>)
      .then((j) => { if (!stop) setData(j); })
      .catch(() => { if (!stop) setData({ status: "unavailable", source: "https://www.raiplay.it/guidatv" }); });
    return () => { stop = true; };
  }, []);
  return data;
}
