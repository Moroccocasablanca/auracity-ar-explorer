// Browser-only: 3D MapLibre map of Bra (keyless OpenFreeMap vector tiles). Import via React.lazy behind <ClientOnly>.
import { useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?url";
import Supercluster from "supercluster";
import { useNavigate } from "@tanstack/react-router";
import { BRA_CENTER } from "@/lib/location";
import type { NodeRow } from "@/lib/nodes";
import { isGardenObject } from "@/lib/node-rules";
import { systemConfig, venueFeaturesEnabled } from "@/lib/systemConfig";
import { isOpenNow } from "@/lib/geo";
import { nodeHours } from "@/lib/nodes";
import type { MapAppearance } from "@/lib/map-appearance";
import { placeStyle } from "@/lib/place-style";
import { directionsUrl, telHref } from "@/lib/services";
import type { Poi } from "@/lib/poi";
import type { MyAvatar } from "@/lib/avatar";
const charTree = "/mascots/tree.png"; // modern 3D characters (made with AI)
const charBench = "/mascots/bench.png";

maplibregl.setWorkerUrl(workerUrl);

const VIEW_KEY = "aura_map_view";
const savedView = (): "2d" | "3d" => {
  try {
    return localStorage.getItem(VIEW_KEY) === "2d" ? "2d" : "3d";
  } catch {
    return "3d";
  }
};

const STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";
const NEAR_METERS = systemConfig.proximityLoadingRadiusMeters;

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

const esc = (x: string) => x.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] as string);


type Pin = { html: string; w: number; h: number };

/** One coherent palette so the colourful stops pop: soft pastel map by day, deep indigo map by night. */
const PALETTE = {
  day: { bg: "#eef2f6", park: "#c6e8c0", water: "#9fd0f2", road: "#ffffff", b: ["#f6f3fb", "#dcd8f1", "#bfb9e8"], flat: "#e4dcf3", flatLine: "#b9aedb", text: "#2c1f4a", halo: "#ffffff" },
  night: { bg: "#151b3a", park: "#1f3d3b", water: "#1b3b6b", road: "#4b54a8", b: ["#363b78", "#4a4f98", "#6166b8"], flat: "#343a78", flatLine: "#5a61b4", text: "#f1efff", halo: "#151b3a" },
} as const;

function applyPalette(m: maplibregl.Map, mode: "day" | "night") {
  const p = PALETTE[mode];
  for (const layer of m.getStyle().layers ?? []) {
    const id = layer.id;
    try {
      if (id === "aura-building-flat") {
        m.setPaintProperty(id, "fill-color", p.flat);
        m.setPaintProperty(id, "fill-outline-color", p.flatLine);
      } else if (layer.type === "background") m.setPaintProperty(id, "background-color", p.bg);
      else if (layer.type === "fill" && /water/.test(id)) m.setPaintProperty(id, "fill-color", p.water);
      else if (layer.type === "fill" && /park|landcover|wood|grass/.test(id)) m.setPaintProperty(id, "fill-color", p.park);
      else if (layer.type === "fill-extrusion") {
        m.setPaintProperty(id, "fill-extrusion-color", ["interpolate", ["linear"], ["coalesce", ["get", "render_height"], 0], 0, p.b[0], 20, p.b[1], 60, p.b[2]]);
        m.setPaintProperty(id, "fill-extrusion-opacity", 0.96);
        m.setPaintProperty(id, "fill-extrusion-height", ["*", 1.35, ["max", 9, ["coalesce", ["get", "render_height"], 0]]]);
      } else if (layer.type === "line" && /^(road|bridge|tunnel)/.test(id) && !/casing|outline|path|rail/.test(id)) m.setPaintProperty(id, "line-color", p.road);
      else if (layer.type === "symbol" && /^(poi|airport|label_other)|transit|shield/.test(id)) {
        // The base map draws its own shop icons and area names: they pile up under ours, so only streets, water and towns stay.
        m.setLayoutProperty(id, "visibility", "none");
      } else if (layer.type === "symbol" && /^highway-name/.test(id)) {
        m.setLayoutProperty(id, "text-size", ["interpolate", ["linear"], ["zoom"], 13, 11, 16, 15, 19, 20]);
        m.setPaintProperty(id, "text-color", p.text);
        m.setPaintProperty(id, "text-halo-color", p.halo);
        m.setPaintProperty(id, "text-halo-width", 2.2);
      }
    } catch {
      /* some style layers may not accept a property: ignore */
    }
  }
}

/** Seen from above, tall shaded blocks turn into noise: below ~15° of tilt buildings switch to a clean flat fill with an outline. */
function addFlatBuildings(m: maplibregl.Map) {
  if (m.getLayer("aura-building-flat")) return;
  const layers = m.getStyle().layers ?? [];
  const before = layers.find((l) => l.type === "line" && /^(tunnel|road|bridge)/.test(l.id))?.id;
  m.addLayer(
    { id: "aura-building-flat", type: "fill", source: "openmaptiles", "source-layer": "building", minzoom: 13, layout: { visibility: "none" }, paint: { "fill-color": "#e4dcf3", "fill-outline-color": "#b9aedb" } },
    before,
  );
}

function syncPitch(m: maplibregl.Map) {
  const flat = m.getPitch() < 15;
  if (!m.getLayer("aura-building-flat")) return;
  m.setLayoutProperty("aura-building-flat", "visibility", flat ? "visible" : "none");
  for (const l of m.getStyle().layers ?? []) if (l.type === "fill-extrusion") m.setLayoutProperty(l.id, "visibility", flat ? "none" : "visible");
}

/** Hides map labels that would overlap a more important one, so the map never fills with text. */
function declutter(shown: Map<string, maplibregl.Marker>, services?: Map<string, maplibregl.Marker>) {
  // Places first (by importance), then services such as pharmacies: the lesser label is the one that gives way.
  const byZ = (m: Map<string, maplibregl.Marker>) => [...m.values()].map((mk) => mk.getElement()).sort((a, b) => Number(b.style.zIndex || 0) - Number(a.style.zIndex || 0));
  const items = [...byZ(shown), ...(services ? byZ(services) : [])];
  for (const e of items) e.querySelector(".aura-label")?.classList.remove("aura-label-off");
  // Icons come first: a label is never allowed to sit on top of any icon (its own or a neighbour's), nor on another label.
  const icons = items.map((e) => ({ e, r: e.querySelector(":scope > :not(.aura-label)")?.getBoundingClientRect() })).filter((x): x is { e: HTMLElement; r: DOMRect } => !!x.r && x.r.width > 0);
  // Services (pool, pharmacy...) never sit on top of a place: if they overlap one, they step aside until you zoom in.
  const placeIcons = icons.filter((i) => !i.e.classList.contains("aura-svc"));
  for (const i of icons) {
    if (!i.e.classList.contains("aura-svc")) continue;
    const hit = placeIcons.some((p) => p.r.left < i.r.right + 2 && p.r.right > i.r.left - 2 && p.r.top < i.r.bottom + 2 && p.r.bottom > i.r.top - 2);
    i.e.classList.toggle("aura-mk-off", hit);
  }
  const taken: DOMRect[] = [];
  // The filter chips and tool buttons now live outside the map; only the 2D/3D switch floats on it, so labels keep away from it.
  const box = items[0]?.closest(".maplibregl-map")?.getBoundingClientRect();
  const zones: DOMRect[] = [];
  if (box) {
    const seg = document.querySelector(".aura-viewseg")?.getBoundingClientRect();
    if (seg) zones.push(new DOMRect(seg.left - 4, seg.top - 4, seg.width + 8, seg.height + 8));
  }
  const overlap = (r: DOMRect, t: DOMRect, pad = 4) => r.left < t.right + pad && r.right > t.left - pad && r.top < t.bottom + pad && r.bottom > t.top - pad;
  for (const e of items) {
    const lab = e.querySelector(".aura-label");
    if (!lab) continue;
    // Try above the icon first, then below it, and only hide the label if neither spot is free.
    const blocked = (r: DOMRect) => taken.some((t) => overlap(r, t)) || icons.some((i) => i.e !== e && overlap(r, i.r, 2)) || zones.some((z) => overlap(r, z, 0)) || (!!box && (r.left < box.left + 2 || r.right > box.right - 2 || r.bottom > box.bottom - 10));
    lab.classList.remove("aura-label-below");
    let r = lab.getBoundingClientRect();
    if (r.width === 0) continue;
    if (blocked(r)) {
      lab.classList.add("aura-label-below");
      r = lab.getBoundingClientRect();
    }
    if (blocked(r)) lab.classList.add("aura-label-off");
    else taken.push(r);
  }
}

/** Small round badge in the category colour with a white symbol: easy to read at small size. Monuments get a double ring. */
function stopPin(color: string, symbol: string, big: boolean, mon = false): Pin {
  const sz = mon ? 38 : big ? 32 : 26;
  return {
    w: sz,
    h: sz,
    html: `<span class="aura-badge${mon ? " aura-badge-mon" : ""}${big && !mon ? " aura-stop-big" : ""}" style="--pin:${color};--sz:${sz}px"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${symbol}</svg></span>`,
  };
}

/** Round photo badge: the real photo of the place inside a coloured ring. */
function photoPin(color: string, url: string, big: boolean, symbol: string): Pin {
  const d = big ? 42 : 34;
  return {
    w: d,
    h: d,
    html: `<span class="aura-photo-stop${big ? " aura-stop-big" : ""}" style="--pin:${color};width:${d}px;height:${d}px"><svg class="aura-photo-fallback" viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${symbol}</g></svg><img src="${encodeURI(url)}" alt="" loading="lazy" onerror="this.style.display='none'" /></span>`,
  };
}

function charPin(color: string, kind: string): Pin {
  return {
    w: 46,
    h: 54,
    html: `<span class="aura-char" style="--pin:${color}"><i class="aura-kid-star">★</i><img src="${kind === "tree" ? charTree : charBench}" alt="" /><em></em></span>`,
  };
}

function clusterEl(count: number) {
  const size = count < 10 ? 32 : count < 50 ? 38 : 44;
  const el = document.createElement("div");
  el.className = "aura-mk";
  el.style.width = el.style.height = `${size}px`;
  el.innerHTML = `<span class="aura-cluster" style="width:${size}px;height:${size}px"><b>${count}</b></span>`;
  return el;
}

type Props = {
  nodes: NodeRow[];
  pos: { lat: number; lng: number } | null;
  kindLabel: (k: string) => string;
  placeLabel: (n: NodeRow) => string;
  appearance: MapAppearance;
  recenter: number;
  onTalk: (n: NodeRow) => void;
  talkLabel: string;
  readLabel: string;
  openLabel: (open: boolean) => string;
  pois: Poi[];
  poiText: { call: string; directions: string; open: string };
  speakingId: string | null;
  /** the visitor: label, GPS error in metres and compass heading */
  me: { label: string; accuracy: number; heading: number; avatar: MyAvatar; name: string; ring: string };
};

export default function BraMap({ nodes, pos, kindLabel, placeLabel, appearance, recenter, onTalk, talkLabel, readLabel, openLabel, pois, poiText, speakingId, me: meInfo }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const shown = useRef(new Map<string, maplibregl.Marker>());
  const index = useRef<Supercluster | null>(null);
  const byId = useRef(new Map<string, NodeRow>());
  const gardens = useRef<NodeRow[]>([]);
  const me = useRef<maplibregl.Marker | null>(null);
  const posRef = useRef(pos);
  const appearanceRef = useRef<"day" | "night">(appearance === "night" ? "night" : "day");
  appearanceRef.current = appearance === "night" ? "night" : "day";
  const speakingRef = useRef(speakingId);
  const svcShown = useRef(new Map<string, maplibregl.Marker>());
  const [mapReady, setMapReady] = useState(false); // the "you are here" marker needs the map to exist first
  const servicesRef = useRef(pois);
  servicesRef.current = pois;
  const propsRef = useRef({ kindLabel, placeLabel, onTalk, talkLabel, readLabel, openLabel, poiText });
  const navigate = useNavigate();
  posRef.current = pos;
  speakingRef.current = speakingId;
  propsRef.current = { kindLabel, placeLabel, onTalk, talkLabel, readLabel, openLabel, poiText };

  const flagClasses = (id: string, mk: maplibregl.Marker) => {
    const e = mk.getElement();
    e.classList.toggle("is-speaking", id === speakingRef.current);
    const p = posRef.current;
    const n = byId.current.get(id);
    const near = p && n ? new maplibregl.LngLat(n.lng, n.lat).distanceTo(new maplibregl.LngLat(p.lng, p.lat)) <= NEAR_METERS : false;
    e.classList.toggle("is-near", Boolean(near));
  };

  const popupFor = (n: NodeRow, color: string, garden: boolean, monument: boolean) => {
    const { kindLabel: kl, placeLabel: pl, onTalk: talk, talkLabel: tl } = propsRef.current;
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
    k.textContent = garden ? kl(n.kind) : pl(n);
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
    if (n.kind === "business") {
      const open = isOpenNow(nodeHours(n));
      const badge = document.createElement("span");
      badge.className = `aura-open ${open ? "is-open" : "is-closed"}`;
      badge.textContent = propsRef.current.openLabel(open);
      wrap.insertBefore(badge, wrap.firstChild);
    }
    if (garden || monument || n.kind === "business") {
      const t = document.createElement("button");
      t.type = "button";
      t.className = "aura-pop-talk";
      t.textContent = `▶ ${n.kind === "business" ? propsRef.current.readLabel : tl}`;
      t.onclick = () => talk(n);
      wrap.append(t);
    }
    return new maplibregl.Popup({ closeButton: false, maxWidth: "240px", offset: [0, -52], className: "aura-popup" }).setDOMContent(wrap);
  };

  const nodeMarker = (n: NodeRow) => {
    const garden = isGardenObject(n);
    const monument = n.kind === "monument";
    const featured = n.kind === "business" && venueFeaturesEnabled(n.subscribed);
    const st = placeStyle(n);
    const color = garden ? cssVar(KIND_COLOR_VAR[n.kind] ?? "--primary") : st.color;
    const pin = garden
      ? charPin(color, n.kind)
      : n.image_url && (monument || featured)
        ? photoPin(color, n.image_url, true, st.symbol)
        : stopPin(color, st.symbol, featured, monument);
    const { placeLabel: pl, talkLabel: tl } = propsRef.current;
    const e = document.createElement("div");
    e.className = "aura-mk";
    e.style.width = `${pin.w}px`;
    e.style.height = `${pin.h}px`;
    e.style.zIndex = String(featured ? 4 : garden ? 3 : monument ? 2 : 1);
    e.innerHTML = `${pin.html}<span class="aura-label${garden ? " aura-label-kid" : ""}"><small style="color:${color}">${esc(garden ? tl : pl(n))}</small><b>${esc(n.name)}</b>${n.address ? `<em>${esc(n.address.replace(/,?\s*Bra\s*$/i, ""))}</em>` : ""}</span>`;
    const popup = popupFor(n, color, garden, monument);
    // The card slides up from the bottom, so the place glides up above it instead of hiding behind it.
    popup.on("open", () => map.current?.easeTo({ center: [n.lng, n.lat], offset: [0, 150], duration: 450 }));
    const mk = new maplibregl.Marker({ element: e, anchor: "bottom" }).setLngLat([n.lng, n.lat]).setPopup(popup);
    flagClasses(n.id, mk);
    return mk;
  };

  /** Services, gyms, playgrounds...: small round badges, each shown from its own zoom level, never clustered. */
  const refreshServices = () => {
    const m = map.current;
    if (!m) return;
    const want = new Map<string, Poi>();
    const z = m.getZoom();
    const b = m.getBounds();
    for (const s of servicesRef.current) if (z >= s.minZoom && b.contains([s.lng, s.lat])) want.set(s.id, s);
    for (const [id, mk] of svcShown.current) {
      if (!want.has(id)) {
        mk.remove();
        svcShown.current.delete(id);
      }
    }
    for (const [id, s] of want) {
      if (svcShown.current.has(id)) continue;
      const { poiText: tx } = propsRef.current;
      const e = document.createElement("div");
      e.className = "aura-mk aura-svc";
      e.style.width = e.style.height = "30px";
      e.style.zIndex = "5";
      e.innerHTML = `<span class="aura-svc-badge" style="--pin:${s.bg};--edge:${s.color};color:${s.fg}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${s.symbol}</svg></span><span class="aura-label aura-label-svc">${s.title ? `<small style="color:color-mix(in oklab, ${s.color} 40%, #fff)">${esc(s.tag)}</small><b>${esc(s.title)}</b>` : `<b>${esc(s.tag)}</b>`}</span>`;
      const pop = document.createElement("div");
      pop.className = "aura-pop";
      const k = document.createElement("p");
      k.className = "aura-pop-kind";
      k.style.color = s.color;
      k.textContent = s.tag;
      const h = document.createElement("p");
      h.className = "aura-pop-title";
      h.textContent = s.title ?? s.tag;
      pop.append(k, h);
      for (const line of [s.address, s.hours]) {
        if (!line) continue;
        const a = document.createElement("p");
        a.className = "aura-pop-addr";
        a.textContent = line;
        pop.append(a);
      }
      const row = document.createElement("div");
      row.className = "aura-svc-actions";
      if (s.open) {
        const open = document.createElement("a");
        open.href = s.open;
        open.textContent = `→ ${tx.open}`;
        open.onclick = (ev) => {
          ev.preventDefault();
          navigate({ to: s.open as never });
        };
        row.append(open);
      }
      if (s.phone) {
        const call = document.createElement("a");
        call.href = telHref(s.phone);
        call.textContent = `☎ ${tx.call}`;
        row.append(call);
      }
      const dir = document.createElement("a");
      dir.href = directionsUrl(s);
      dir.target = "_blank";
      dir.rel = "noopener";
      dir.textContent = `➤ ${tx.directions}`;
      row.append(dir);
      pop.append(row);
      const mk = new maplibregl.Marker({ element: e, anchor: "center" })
        .setLngLat([s.lng, s.lat])
        .setPopup(new maplibregl.Popup({ closeButton: false, maxWidth: "240px", offset: 22, className: "aura-popup" }).setDOMContent(pop))
        .addTo(m);
      svcShown.current.set(id, mk);
    }
  };

  /** Draws only what is visible: clusters at low zoom, single stops when close enough. Gardens are never clustered. */
  const refresh = () => {
    const m = map.current;
    const idx = index.current;
    if (!m || !idx) return;
    const b = m.getBounds();
    const z = Math.round(m.getZoom());
    const clusters = idx.getClusters([b.getWest() - 0.01, b.getSouth() - 0.01, b.getEast() + 0.01, b.getNorth() + 0.01], z);
    const keep = new Set<string>();
    for (const c of clusters) {
      const [lng, lat] = c.geometry.coordinates as [number, number];
      const props = c.properties as { cluster?: boolean; cluster_id?: number; point_count?: number; id?: string };
      const key = props.cluster ? `c:${props.cluster_id}` : `n:${props.id}`;
      keep.add(key);
      if (shown.current.has(key)) continue;
      let mk: maplibregl.Marker;
      if (props.cluster) {
        const ce = clusterEl(props.point_count ?? 2);
        ce.onclick = () => m.easeTo({ center: [lng, lat], zoom: Math.min(idx.getClusterExpansionZoom(props.cluster_id as number), 19), duration: 500 });
        mk = new maplibregl.Marker({ element: ce, anchor: "center" }).setLngLat([lng, lat]);
      } else {
        const n = byId.current.get(props.id as string);
        if (!n) continue;
        mk = nodeMarker(n);
      }
      mk.addTo(m);
      shown.current.set(key, mk);
    }
    // Talking characters are never clustered: kids must always see them.
    for (const g of gardens.current) {
      const key = `n:${g.id}`;
      keep.add(key);
      if (shown.current.has(key)) continue;
      const mk = nodeMarker(g).addTo(m);
      shown.current.set(key, mk);
    }
    for (const [key, mk] of shown.current) {
      if (!keep.has(key)) {
        mk.remove();
        shown.current.delete(key);
      }
    }
  };

  useEffect(() => {
    if (!el.current || map.current) return;
    const m = new maplibregl.Map({
      container: el.current,
      style: STYLE_URL,
      center: [BRA_CENTER.lng, BRA_CENTER.lat],
      zoom: 16.2,
      pitch: savedView() === "2d" ? 0 : 58,
      bearing: savedView() === "2d" ? 0 : -18,
      maxPitch: 72,
      minPitch: 0,
      minZoom: 12.5,
      maxZoom: 19.5,
      maxBounds: [[7.72, 44.62], [7.98, 44.78]],
      attributionControl: { compact: true },
      // Smoothness on phones: cap the pixel density (a 3x screen draws 9 pixels per point), no fade, fewer cached tiles.
      pixelRatio: Math.min(window.devicePixelRatio || 1, 2),
      fadeDuration: 0,
      maxTileCacheSize: 60,
    });
    m.addControl(new maplibregl.NavigationControl({ visualizePitch: true, showZoom: false }), "bottom-right");
    const labels = () => {
      const z = m.getZoom();
      m.getContainer().classList.toggle("aura-labels", z >= 17);
      m.getContainer().classList.toggle("aura-labels-kids", z >= 15);
    };
    m.on("zoomend", labels);
    m.on("pitch", () => syncPitch(m));
    m.on("idle", () => requestAnimationFrame(() => declutter(shown.current, svcShown.current)));
    m.on("moveend", () => {
      refresh();
      refreshServices();
      requestAnimationFrame(() => declutter(shown.current, svcShown.current));
    });
    m.on("zoom", () => labels());
    m.on("load", () => {
      // Map credits stay available behind the small "i" button but start closed, so they never cover the map.
      m.getContainer().querySelector(".maplibregl-ctrl-attrib")?.classList.remove("maplibregl-compact-show");
      m.getContainer().querySelector(".maplibregl-ctrl-attrib")?.removeAttribute("open");
      addFlatBuildings(m);
      for (const l of m.getStyle().layers ?? []) if (l.type === "fill-extrusion") m.setLayerZoomRange(l.id, 15, 24);
      applyPalette(m, appearanceRef.current);
      syncPitch(m);
      for (const layer of [] as { type: string; id: string }[]) {
        if (layer.type === "fill-extrusion") {
          m.setPaintProperty(layer.id, "fill-extrusion-color", ["interpolate", ["linear"], ["get", "render_height"], 0, "#f3d9b8", 20, "#e9b98f", 60, "#d99a7a"]);
          m.setPaintProperty(layer.id, "fill-extrusion-opacity", 0.95);
          // Buildings without height data stay 3D too: minimum 9 m, and everything a little taller so the relief reads when zoomed in.
          m.setPaintProperty(layer.id, "fill-extrusion-height", ["*", 1.35, ["max", 9, ["coalesce", ["get", "render_height"], 0]]]);
        }
        // Street names must be readable: bigger, dark text with a white outline.
        if (layer.type === "symbol" && /^highway-name/.test(layer.id)) {
          m.setLayoutProperty(layer.id, "text-size", ["interpolate", ["linear"], ["zoom"], 13, 11, 16, 15, 19, 20]);
          m.setPaintProperty(layer.id, "text-color", "#2c1f4a");
          m.setPaintProperty(layer.id, "text-halo-color", "#ffffff");
          m.setPaintProperty(layer.id, "text-halo-width", 2.2);
        }
      }
      labels();
      refresh();
      refreshServices();
      requestAnimationFrame(() => declutter(shown.current, svcShown.current));
    });
    labels();
    map.current = m;
    setMapReady(true);
    if (import.meta.env.DEV) (window as unknown as { __auraMap?: maplibregl.Map }).__auraMap = m;
    return () => {
      for (const mk of shown.current.values()) mk.remove();
      shown.current.clear();
      for (const mk of svcShown.current.values()) mk.remove();
      svcShown.current.clear();
      me.current?.remove(); // the "you are here" marker belongs to this map: a new map must create its own
      me.current = null;
      m.remove();
      map.current = null;
      setMapReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // (Re)build the cluster index whenever the visible places change.
  useEffect(() => {
    const items = nodes.filter((n) => n.kind !== "street");
    byId.current = new Map(items.map((n) => [n.id, n]));
    gardens.current = items.filter(isGardenObject);
    const clusterable = items.filter((n) => !isGardenObject(n));
    const idx = new Supercluster({ radius: 70, maxZoom: 17 });
    idx.load(
      clusterable.map((n) => ({
        type: "Feature" as const,
        properties: { id: n.id },
        geometry: { type: "Point" as const, coordinates: [n.lng, n.lat] },
      })),
    );
    index.current = idx;
    for (const mk of shown.current.values()) mk.remove();
    shown.current.clear();
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, kindLabel, talkLabel]);

  useEffect(() => {
    for (const mk of svcShown.current.values()) mk.remove();
    svcShown.current.clear();
    refreshServices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pois]);

  useEffect(() => {
    for (const [key, mk] of shown.current) if (key.startsWith("n:")) flagClasses(key.slice(2), mk);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speakingId, pos]);

  useEffect(() => {
    const m = map.current;
    if (m && m.isStyleLoaded()) applyPalette(m, appearance === "night" ? "night" : "day");
  }, [appearance]);

  useEffect(() => {
    const m = map.current;
    if (!m) return;
    if (!pos) {
      me.current?.remove();
      me.current = null;
      return;
    }
    if (!me.current) {
      const d = document.createElement("div");
      d.className = "aura-me2";
      d.innerHTML = `<span class="aura-me-acc"></span><span class="aura-me-cone"></span><span class="aura-me-body"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4.2" fill="#fff"/><path d="M4 21c0-4.6 3.6-7.6 8-7.6s8 3 8 7.6Z" fill="#fff"/></svg></span><span class="aura-me-tag"></span>`;
      me.current = new maplibregl.Marker({ element: d, anchor: "center" }).setLngLat([pos.lng, pos.lat]).addTo(m);
    } else me.current.setLngLat([pos.lng, pos.lat]);
  }, [pos, mapReady]);

  // Label, GPS-error circle (true size on the map) and the direction you are facing.
  useEffect(() => {
    const m = map.current;
    const el = me.current?.getElement();
    if (!m || !el || !pos) return;
    const tag = el.querySelector<HTMLElement>(".aura-me-tag");
    if (tag) tag.textContent = meInfo.name ? `${meInfo.name} · ${meInfo.label}` : meInfo.label;
    el.style.setProperty("--ring", meInfo.ring);
    const body = el.querySelector<HTMLElement>(".aura-me-body");
    if (body) {
      const a = meInfo.avatar;
      body.textContent = "";
      body.classList.toggle("aura-me-photo", a.kind === "photo");
      if (a.kind === "photo") {
        const img = document.createElement("img");
        img.src = a.value;
        img.alt = "";
        body.append(img);
      } else if (a.kind === "emoji") {
        const sp = document.createElement("span");
        sp.className = "aura-me-emoji";
        sp.textContent = a.value;
        body.append(sp);
      } else {
        body.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4.2" fill="#fff"/><path d="M4 21c0-4.6 3.6-7.6 8-7.6s8 3 8 7.6Z" fill="#fff"/></svg>';
      }
    }
    el.querySelector<HTMLElement>(".aura-me-cone")?.style.setProperty("--h", `${meInfo.heading}deg`);
    const ring = el.querySelector<HTMLElement>(".aura-me-acc");
    const size = () => {
      if (!ring) return;
      const mpp = (156543.03392 * Math.cos((pos.lat * Math.PI) / 180)) / 2 ** m.getZoom();
      const px = Math.min(260, Math.max(44, (meInfo.accuracy * 2) / mpp));
      ring.style.width = ring.style.height = `${px}px`;
    };
    size();
    m.on("zoom", size);
    return () => void m.off("zoom", size);
  }, [pos, mapReady, meInfo.label, meInfo.name, meInfo.ring, meInfo.avatar, meInfo.accuracy, meInfo.heading]);

  useEffect(() => {
    if (recenter > 0 && pos) map.current?.flyTo({ center: [pos.lng, pos.lat], zoom: 17.5, pitch: 62, duration: 1400 });
  }, [recenter, pos, mapReady]);

  const [flat, setFlat] = useState(savedView() === "2d");
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    const on = () => setFlat(m.getPitch() < 15);
    m.on("pitchend", on);
    return () => void m.off("pitchend", on);
  }, []);
  const choose = (v: "2d" | "3d") => {
    try {
      localStorage.setItem(VIEW_KEY, v);
    } catch {
      /* the choice just is not remembered */
    }
    setFlat(v === "2d");
    map.current?.easeTo(v === "2d" ? { pitch: 0, bearing: 0, duration: 650 } : { pitch: 58, bearing: -18, duration: 650 });
  };
  return (
    <div className="relative h-full w-full">
      <div ref={el} data-map-appearance={appearance} className={`aura-map aura-map-${appearance} h-full w-full`} />
      <div className="aura-viewseg" role="group" aria-label="2D / 3D">
        <button type="button" aria-pressed={flat} className={flat ? "is-on" : ""} onClick={() => choose("2d")}>2D</button>
        <button type="button" aria-pressed={!flat} className={!flat ? "is-on" : ""} onClick={() => choose("3d")}>3D</button>
      </div>
    </div>
  );
}

