// Browser-only: Leaflet map of Bra. Import this module only via React.lazy behind <ClientOnly>.
import { useEffect, useRef } from "react";
import L from "leaflet";
import { useNavigate } from "@tanstack/react-router";
import { BRA_CENTER } from "@/lib/location";
import type { NodeRow } from "@/lib/nodes";

const KIND_COLOR_VAR: Record<string, string> = {
  business: "--kind-business",
  monument: "--kind-monument",
  street: "--kind-street",
  service: "--kind-service",
  bench: "--kind-bench",
};

function cssVar(name: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || "currentColor";
}

export default function BraMap({
  nodes,
  pos,
  kindLabel,
}: {
  nodes: NodeRow[];
  pos: { lat: number; lng: number } | null;
  kindLabel: (k: string) => string;
}) {
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
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
      subdomains: "abcd",
      maxZoom: 20,
    }).addTo(m);
    L.control.zoom({ position: "topright" }).addTo(m);
    layer.current = L.layerGroup().addTo(m);
    map.current = m;
    return () => {
      m.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    const g = layer.current;
    if (!g) return;
    g.clearLayers();
    for (const n of nodes) {
      const color = cssVar(KIND_COLOR_VAR[n.kind] ?? "--primary");
      const icon = L.divIcon({
        className: "",
        iconSize: [28, 28],
        iconAnchor: [14, 14],
        html: `<span class="aura-pin" style="--pin:${color}"><span></span></span>`,
      });
      const marker = L.marker([n.lat, n.lng], { icon, title: n.name }).addTo(g);
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
      marker.bindPopup(wrap, { closeButton: false, maxWidth: 240 });
    }
  }, [nodes, kindLabel, navigate]);

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

  return <div ref={el} className="aura-map h-full w-full" />;
}
