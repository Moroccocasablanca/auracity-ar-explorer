// Browser-only: Leaflet map of Bra. Import this module only via React.lazy behind <ClientOnly>.
import { useEffect, useRef } from "react";
import L from "leaflet";
import { useNavigate } from "@tanstack/react-router";
import { BRA_CENTER } from "@/lib/location";
import type { NodeRow } from "@/lib/nodes";
import { isGardenObject } from "@/lib/node-rules";
import type { MapAppearance } from "@/lib/map-appearance";

const KIND_COLOR_VAR: Record<string, string> = {
  business: "--kind-business",
  monument: "--kind-monument",
  street: "--kind-street",
  service: "--kind-service",
  bench: "--kind-bench",
  tree: "--kind-tree",
};

function cssVar(name: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || "currentColor";
}

export default function BraMap({
  nodes,
  pos,
  kindLabel,
  appearance,
  recenter,
  onTalk,
  talkLabel,
  speakingId,
}: {
  nodes: NodeRow[];
  pos: { lat: number; lng: number } | null;
  kindLabel: (k: string) => string;
  appearance: MapAppearance;
  recenter: number;
  onTalk: (n: NodeRow) => void;
  talkLabel: string;
  speakingId: string | null;
}) {
  const markers = useRef(new Map<string, L.Marker>());
  const tiles = useRef<L.TileLayer | null>(null);
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  const me = useRef<L.CircleMarker | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!el.current || map.current) return;
    const m = L.map(el.current, {
      center: [BRA_CENTER.lat, BRA_CENTER.lng],
      zoom: 16,
      minZoom: 13,
      maxZoom: 19,
      zoomControl: false,
      maxBounds: L.latLngBounds([44.64, 7.74], [44.76, 7.96]),
      maxBoundsViscosity: 0.8,
    });
    L.control.zoom({ position: "topright" }).addTo(m);
    layer.current = L.layerGroup().addTo(m);
    map.current = m;
    return () => {
      m.remove();
      map.current = null;
    };
  }, []);

  // Full OpenStreetMap detail; night look comes from a CSS filter so street names stay readable.
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    tiles.current?.remove();
    tiles.current = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
      className: "aura-tiles",
    }).addTo(m);
  }, [appearance]);

  useEffect(() => {
    const g = layer.current;
    if (!g) return;
    g.clearLayers();
    markers.current.clear();
    for (const n of nodes) {
      const garden = isGardenObject(n);
      const color = cssVar(KIND_COLOR_VAR[n.kind] ?? "--primary");
      const icon = garden
        ? L.divIcon({
            className: "",
            iconSize: [44, 44],
            iconAnchor: [22, 22],
            html: `<span class="aura-face-pin" style="--pin:${color}"><i></i><i></i><b></b></span>`,
          })
        : n.kind === "business" && !n.subscribed
          ? L.divIcon({
              className: "",
              iconSize: [14, 14],
              iconAnchor: [7, 7],
              html: `<span class="aura-dot" style="--pin:${color}"></span>`,
            })
          : L.divIcon({
              className: "",
              iconSize: n.kind === "business" ? [40, 40] : [28, 28],
              iconAnchor: n.kind === "business" ? [20, 20] : [14, 14],
              html: `<span class="aura-pin${n.kind === "business" ? " aura-pin-vip" : ""}" style="--pin:${color}"><span></span></span>`,
            });
      const marker = L.marker([n.lat, n.lng], { icon, title: n.name, zIndexOffset: n.kind === "business" && n.subscribed ? 1000 : 0 }).addTo(g);
      markers.current.set(n.id, marker);
      const wrap = document.createElement("div");
      wrap.className = "aura-pop";
      if (n.image_url) {
        const img = document.createElement("img");
        img.src = n.image_url;
        img.alt = n.name;
        img.loading = "lazy";
        wrap.appendChild(img);
      }
      const k = document.createElement("p");
      k.className = "aura-pop-kind";
      k.style.color = color;
      k.textContent = kindLabel(n.kind);
      const h = document.createElement("button");
      h.type = "button";
      h.className = "aura-pop-title";
      h.textContent = `${n.name} →`;
      h.onclick = () => navigate({ to: "/node/$slug", params: { slug: n.slug } });
      wrap.append(k, h);
      if (n.address) {
        const a = document.createElement("p");
        a.className = "aura-pop-addr";
        a.textContent = n.address;
        wrap.append(a);
      }
      if (garden) {
        const talk = document.createElement("button");
        talk.type = "button";
        talk.className = "aura-pop-talk";
        talk.textContent = `▶ ${talkLabel}`;
        talk.onclick = () => onTalk(n);
        wrap.append(talk);
      }
      marker.bindPopup(wrap, { closeButton: false, maxWidth: 240 });
    }
  }, [nodes, kindLabel, navigate, onTalk, talkLabel]);

  useEffect(() => {
    for (const [id, mk] of markers.current) mk.getElement()?.classList.toggle("is-speaking", id === speakingId);
  }, [speakingId, nodes]);

  useEffect(() => {
    const m = map.current;
    if (!m) return;
    if (!pos) {
      me.current?.remove();
      me.current = null;
      return;
    }
    if (!me.current) {
      me.current = L.circleMarker([pos.lat, pos.lng], {
        radius: 8,
        color: cssVar("--background"),
        weight: 3,
        fillColor: cssVar("--primary"),
        fillOpacity: 1,
      }).addTo(m);
    } else me.current.setLatLng([pos.lat, pos.lng]);
  }, [pos]);

  useEffect(() => {
    if (recenter > 0 && pos) map.current?.flyTo([pos.lat, pos.lng], 17);
  }, [recenter, pos]);

  return <div ref={el} data-map-appearance={appearance} className={`aura-map aura-map-${appearance} h-full w-full`} />;
}
