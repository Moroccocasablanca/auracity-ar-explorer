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
import { activePromo } from "@/lib/merchant";
import { systemConfig, venueFeaturesEnabled } from "@/config/systemConfig";
import { isOpenNow } from "@/utils/geo";
import { nodeHours } from "@/lib/nodes";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Baby, Beef, Camera, Castle, Church, Clapperboard, Coffee, Compass, Crown, Drama, Dumbbell, Flame, Flower2, HeartPulse, Hospital, IceCreamCone, Landmark, Mail, Pill, Sandwich, ShieldCheck, ShoppingBag, Stethoscope, TreePine, Trophy, Utensils, Waves, Wine, type LucideIcon } from "lucide-react";
import type { MapAppearance } from "@/lib/map-appearance";
import { placeStyle } from "@/lib/place-style";
import { directionsUrl, telHref } from "@/lib/services";
import type { Poi } from "@/lib/poi";
import type { MyAvatar } from "@/lib/avatar";
/** From this zoom level the photos of monuments and venues are shown; farther away they are simple badges (level of detail). */
const PHOTO_ZOOM = 16;
const charTree = "/mascots/tree.webp"; // modern 3D characters (made with AI)
const charBench = "/mascots/bench.webp";

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
  day: { bg: "#eef2f6", land: "#f1ece3", park: "#c6e8c0", water: "#9fd0f2", road: "#ffffff", b: ["#f6f0e6", "#f1e2cc", "#ecd2b8", "#f3e3d2", "#d9d3c3"], flat: "#f0e4d1", flatLine: "#d3c0a0", text: "#2c1f4a", halo: "#ffffff" },
  night: { bg: "#151b3a", land: "#1c2250", park: "#1f3d3b", water: "#1b3b6b", road: "#4b54a8", b: ["#3a3a72", "#4a3f7c", "#563f7e", "#3d4a82", "#4b5189"], flat: "#343a78", flatLine: "#5a61b4", text: "#f1efff", halo: "#151b3a" },
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
      else if (layer.type === "fill" && /building/.test(id)) { m.setPaintProperty(id, "fill-color", p.flat); m.setPaintProperty(id, "fill-outline-color", p.flatLine); }
      else if (layer.type === "fill") m.setPaintProperty(id, "fill-color", p.land);
      else if (layer.type === "fill-extrusion") {
        // warm, light town colours: low houses cream, taller ones ochre then terracotta (the tiles carry no house ids, so the height decides)
        const h: maplibregl.ExpressionSpecification = ["to-number", ["coalesce", ["get", "render_height"], 0], 0];
        m.setPaintProperty(id, "fill-extrusion-color", ["interpolate", ["linear"], h, 0, p.b[0], 12, p.b[3], 22, p.b[1], 40, p.b[2]] as maplibregl.ExpressionSpecification);
        m.setPaintProperty(id, "fill-extrusion-opacity", 0.94);
        // only a soft relief (a third of the real height, never a tower): the town looks like a drawn map, not a pile of bricks
        m.setPaintProperty(id, "fill-extrusion-height", ["min", 16, ["*", 0.32, ["max", 8, ["coalesce", ["get", "render_height"], 0]]]]);
        m.setPaintProperty(id, "fill-extrusion-vertical-gradient", true);
      } else if (layer.type === "line" && /^(road|bridge|tunnel)/.test(id) && !/casing|outline|path|rail/.test(id)) m.setPaintProperty(id, "line-color", p.road);
      else if (layer.type === "symbol" && /^(poi|airport|label_other)|transit|shield/.test(id)) {
        // The base map draws its own shop icons and area names: they pile up under ours, so only streets, water and towns stay.
        m.setLayoutProperty(id, "visibility", "none");
      } else if (layer.type === "symbol" && /^(place|water|waterway|label)/.test(id)) {
        m.setPaintProperty(id, "text-color", p.text);
        m.setPaintProperty(id, "text-halo-color", p.halo);
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
/** The land itself: real hills from free elevation tiles, soft shading on them, and a sky that fades into the horizon. Bra sits on the Roero hills: the map shows it. */
const SKY = {
  day: { "sky-color": "#8cc8f5", "horizon-color": "#fff1de", "fog-color": "#f6eefc", "sky-horizon-blend": 0.55, "horizon-fog-blend": 0.7, "fog-ground-blend": 0.35 },
  night: { "sky-color": "#0b1030", "horizon-color": "#3a3c8a", "fog-color": "#1a1f4d", "sky-horizon-blend": 0.6, "horizon-fog-blend": 0.7, "fog-ground-blend": 0.4 },
} as const;
function addLand(m: maplibregl.Map, mode: "day" | "night") {
  try {
    if (!m.getSource("aura-dem")) {
      m.addSource("aura-dem", { type: "raster-dem", tiles: ["https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"], encoding: "terrarium", tileSize: 256, maxzoom: 14, attribution: "Terrain: Mapzen / AWS" });
      const firstRoad = (m.getStyle().layers ?? []).find((l) => l.type === "line")?.id;
      m.addLayer({ id: "aura-hills", type: "hillshade", source: "aura-dem", paint: { "hillshade-exaggeration": 0.42, "hillshade-shadow-color": mode === "night" ? "#0a0d2c" : "#7b6f9e", "hillshade-highlight-color": mode === "night" ? "#3a3f8f" : "#fffaf0", "hillshade-illumination-direction": 315 } }, firstRoad);
    }
    m.setTerrain({ source: "aura-dem", exaggeration: 1.6 });
    m.setSky(SKY[mode]);
    m.setPaintProperty("aura-hills", "hillshade-shadow-color", mode === "night" ? "#0a0d2c" : "#7b6f9e");
    m.setPaintProperty("aura-hills", "hillshade-highlight-color", mode === "night" ? "#3a3f8f" : "#fffaf0");
  } catch (e) { console.warn("aura land", e); }
}


/** Realistic view like Google/Apple: real aerial photos (Esri World Imagery, the whole world) draped on the 3D hills,
 *  with streets, names and our markers on top. The drawn map (palette) stays one tap away. */
const SAT_TILES = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
function applySatellite(m: maplibregl.Map, on: boolean, mode: "day" | "night") {
  try {
    if (on && !m.getSource("aura-sat")) {
      m.addSource("aura-sat", { type: "raster", tiles: [SAT_TILES], tileSize: 256, maxzoom: 19, attribution: "Imagery © Esri, Maxar, Earthstar Geographics" });
      const firstLine = (m.getStyle().layers ?? []).find((l) => l.type === "line")?.id;
      m.addLayer({ id: "aura-sat", type: "raster", source: "aura-sat", paint: { "raster-fade-duration": 0 } }, firstLine);
    }
    if (m.getLayer("aura-sat")) {
      m.setLayoutProperty("aura-sat", "visibility", on ? "visible" : "none");
      // at night the photo is dimmed and cooled, so the lit markers still glow
      m.setPaintProperty("aura-sat", "raster-brightness-max", mode === "night" ? 0.42 : 1);
      m.setPaintProperty("aura-sat", "raster-saturation", mode === "night" ? -0.35 : 0.1);
      m.setPaintProperty("aura-sat", "raster-contrast", mode === "night" ? 0.1 : 0.05);
    }
    for (const layer of m.getStyle().layers ?? []) {
      const id = layer.id;
      if (id === "aura-sat") continue;
      // the photo already shows the real roofs, fields and river: drawn areas and drawn houses go away while it is on
      if (layer.type === "fill" || layer.type === "fill-extrusion" || layer.type === "hillshade") m.setLayoutProperty(id, "visibility", on ? "none" : "visible");
      else if (layer.type === "line" && /^(road|bridge|tunnel)/.test(id) && !/casing|outline|rail/.test(id)) m.setPaintProperty(id, "line-opacity", on ? 0.45 : 1);
    }
  } catch (e) { console.warn("aura satellite", e); }
}

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
  // Places never pile on top of each other either: the most important one stays, the others step aside until you zoom in.
  const keptIcons: DOMRect[] = [];
  for (const e of items) {
    if (e.classList.contains("aura-svc")) continue;
    e.classList.remove("aura-mk-off");
    const r = e.getBoundingClientRect(); // the marker's own box: it does not shrink while the pop-in animation is running
    if (r.width === 0) continue;
    const hit = keptIcons.some((k) => k.left < r.right + 3 && k.right > r.left - 3 && k.top < r.bottom + 3 && k.bottom > r.top - 3);
    e.classList.toggle("aura-mk-off", hit);
    if (!hit) keptIcons.push(r);
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

/** Photo address that is safe to use: the stored address may already contain %20 (never encode it twice) and Wikimedia photos are asked at the size needed (a small thumbnail for a pin loads in a blink instead of a 900 px picture). */
function photoSrc(url: string, width: number): string {
  let u = url;
  try { u = encodeURI(decodeURI(url)); } catch { /* keep as stored */ }
  return u.includes("Special:FilePath") ? `${u.split("?")[0]}?width=${width}` : u;
}

/** Clean line icon that says what a place is (same family as the rest of the app); the old picture shows only for a name without a line icon. */
const LINE: Record<string, LucideIcon> = {
  aed: HeartPulse, bank: Landmark, bar: Wine, wine: Wine, cafe: Coffee, carabinieri: ShieldCheck, police: ShieldCheck, castle: Castle, church: Church,
  cinema: Clapperboard, theatre: Drama, clinic: Stethoscope, hospital: Hospital, deli: Beef, fire: Flame, gym: Dumbbell, sports: Trophy, icecream: IceCreamCone,
  memorial: Flower2, museum: Landmark, townhall: Landmark, palace: Crown, park: TreePine, pharmacy: Pill, playground: Baby, pool: Waves, post: Mail,
  restaurant: Utensils, streetfood: Sandwich, shop: ShoppingBag, camera_with_flash: Camera, compass: Compass,
};
const lineCache = new Map<string, string>();
const icon3d = (name: string) => {
  const Ic = LINE[name];
  if (!Ic) return `<img class="aura-ico3d" src="/icons3d/${name}.webp" alt="" decoding="async" draggable="false" />`;
  let h = lineCache.get(name);
  if (!h) {
    h = renderToStaticMarkup(createElement(Ic, { className: "aura-ico3d aura-ico-line", strokeWidth: 1.9, "aria-hidden": true }));
    lineCache.set(name, h);
  }
  return h;
};

/** Small round badge in the category colour with a white symbol: easy to read at small size. Monuments get a double ring. */
function stopPin(color: string, symbol: string, big: boolean, mon = false, icon?: string): Pin {
  const sz = mon ? 40 : big ? 38 : 34;
  return {
    w: sz,
    h: sz,
    html: `<span class="aura-badge${mon ? " aura-badge-mon" : ""}${big && !mon ? " aura-stop-big" : ""}" style="--pin:${color};--sz:${sz}px">${icon ? icon3d(icon) : `<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${symbol}</svg>`}</span>`,
  };
}

/** Round photo badge: the real photo of the place inside a coloured ring. */
function photoPin(color: string, url: string, big: boolean, symbol: string, icon?: string): Pin {
  const d = big ? 42 : 34;
  return {
    w: d,
    h: d,
    html: `<span class="aura-photo-stop${big ? " aura-stop-big" : ""}" style="--pin:${color};width:${d}px;height:${d}px"><svg class="aura-photo-fallback" viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${symbol}</g></svg><img src="${photoSrc(url, 120)}" alt="" decoding="async" onerror="this.style.display='none'" />${icon ? `<span class="aura-photo-chip" style="--pin:${color}">${icon3d(icon)}</span>` : ""}</span>`,
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
  /** real aerial photos instead of the drawn map */
  satellite?: boolean;
  recenter: number;
  /** when set, the map glides to this place (e.g. the pharmacy on duty) */
  focus?: { lat: number; lng: number } | null;
  onTalk: (n: NodeRow) => void;
  talkLabel: string;
  readLabel: string;
  openLabel: (open: boolean) => string;
  pois: Poi[];
  poiText: { call: string; directions: string; open: string };
  speakingId: string | null;
  /** the active filter: when it changes the map pulls back (or in) to show the places of that filter */
  fit?: string;
  /** venues with a flash offer running now -> minutes left: they get a beam of light rising to the sky */
  flash?: Record<string, number>;
  /** the visitor: label, GPS error in metres and compass heading */
  me: { label: string; accuracy: number; heading: number; avatar: MyAvatar; name: string; ring: string };
};

export default function BraMap({ nodes, pos, kindLabel, placeLabel, appearance, satellite = false, recenter, focus, onTalk, talkLabel, readLabel, openLabel, pois, poiText, speakingId, flash, fit, me: meInfo }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const shown = useRef(new Map<string, maplibregl.Marker>());
  const index = useRef<Supercluster | null>(null);
  const byId = useRef(new Map<string, NodeRow>());
  // Rebuild the markers only when the SET of places changes, not every time a new array with the same places arrives.
  const nodesKey = nodes.map((n) => n.id).join(",");
  const gardens = useRef<NodeRow[]>([]);
  const me = useRef<maplibregl.Marker | null>(null);
  const posRef = useRef(pos);
  const appearanceRef = useRef<"day" | "night">(appearance === "night" ? "night" : "day");
  appearanceRef.current = appearance === "night" ? "night" : "day";
  const satRef = useRef(satellite);
  satRef.current = satellite;
  const speakingRef = useRef(speakingId);
  const flashRef = useRef<Record<string, number>>(flash ?? {});
  flashRef.current = flash ?? {};
  const svcShown = useRef(new Map<string, maplibregl.Marker>());
  const lodHigh = useRef<boolean | null>(null);
  const [mapReady, setMapReady] = useState(false); // the "you are here" marker needs the map to exist first
  const servicesRef = useRef(pois);
  servicesRef.current = pois;
  const propsRef = useRef({ kindLabel, placeLabel, onTalk, talkLabel, readLabel, openLabel, poiText });
  const navigate = useNavigate();
  posRef.current = pos;
  speakingRef.current = speakingId;
  propsRef.current = { kindLabel, placeLabel, onTalk, talkLabel, readLabel, openLabel, poiText };

  /** Tidies the markers (hides the ones that would sit on top of another). Run after EVERY change of what is on the map, not only after the map moves:
   *  markers get their screen position one frame after they are added, so it is repeated a little later too. */
  const scheduleDeclutter = () => {
    requestAnimationFrame(() => declutter(shown.current, svcShown.current));
    setTimeout(() => declutter(shown.current, svcShown.current), 250);
    setTimeout(() => declutter(shown.current, svcShown.current), 900);
  };

  const flagClasses = (id: string, mk: maplibregl.Marker) => {
    const e = mk.getElement();
    e.classList.toggle("is-speaking", id === speakingRef.current);
    const p = posRef.current;
    const n = byId.current.get(id);
    const near = p && n ? new maplibregl.LngLat(n.lng, n.lat).distanceTo(new maplibregl.LngLat(p.lng, p.lat)) <= NEAR_METERS : false;
    e.classList.toggle("is-near", Boolean(near));
    // A flash offer is running here: beam of light to the sky, minutes left, and it always wins its spot on the map.
    const left = flashRef.current[id];
    e.classList.toggle("aura-flash", left != null);
    if (left != null) {
      e.dataset["flash"] = String(left);
      e.style.zIndex = "8";
    } else {
      delete e.dataset["flash"];
      if (e.dataset["z0"]) e.style.zIndex = e.dataset["z0"];
    }
  };

  const popupFor = (n: NodeRow, color: string, garden: boolean, monument: boolean) => {
    const { kindLabel: kl, placeLabel: pl, onTalk: talk, talkLabel: tl } = propsRef.current;
    const wrap = document.createElement("div");
    wrap.className = "aura-pop";
    if (n.image_url) {
      const img = document.createElement("img");
      img.src = photoSrc(n.image_url, 640);
      img.alt = n.name;
      img.loading = "lazy";
      wrap.appendChild(img);
    }
    // The flash offer running now, written big on the card.
    const offer = activePromo(n.id);
    if (offer) {
      const f = document.createElement("p");
      f.className = "aura-pop-flash";
      f.textContent = `\u26A1 ${offer.headline ?? offer.rawTextFromOwner} · ${offer.minutesLeft}\u2032`;
      wrap.appendChild(f);
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
      : n.image_url && (monument || featured) && (map.current?.getZoom() ?? 17) >= PHOTO_ZOOM
        ? photoPin(color, n.image_url, true, st.symbol, st.icon)
        : stopPin(color, st.symbol, featured, monument, st.icon);
    const { placeLabel: pl, talkLabel: tl } = propsRef.current;
    const e = document.createElement("div");
    e.className = "aura-mk";
    e.style.width = `${pin.w}px`;
    e.style.height = `${pin.h}px`;
    e.style.zIndex = String(monument ? 5 : featured ? 4 : garden ? 3 : 1);
    e.dataset["z0"] = e.style.zIndex;
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
      e.className = `aura-mk aura-svc${s.duty ? " aura-svc-duty" : ""}`;
      e.style.width = e.style.height = "30px";
      e.style.zIndex = "5";
      e.innerHTML = `<span class="aura-svc-badge" style="--pin:${s.bg};--edge:${s.color};color:${s.fg}">${s.icon ? icon3d(s.icon) : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${s.symbol}</svg>`}</span><span class="aura-label aura-label-svc">${s.title ? `<small style="color:color-mix(in oklab, ${s.color} 40%, #fff)">${esc(s.tag)}</small><b>${esc(s.title)}</b>` : `<b>${esc(s.tag)}</b>`}</span>`;
      const pop = document.createElement("div");
      pop.className = "aura-pop";
      const k = document.createElement("p");
      k.className = "aura-pop-kind";
      k.style.color = s.color;
      k.textContent = s.tag;
      const h = document.createElement("p");
      h.className = "aura-pop-title";
      h.textContent = s.title ?? s.tag;
      // A big coloured tile with the category icon stands where a photo would be, so the card never looks empty.
      const ico = document.createElement("div");
      ico.className = "aura-pop-ico";
      ico.style.setProperty("--pin", s.color);
      ico.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${s.symbol}</svg>`;
      pop.append(ico, k, h);
      for (const line of [s.address, s.hours, s.phone ? `Tel. ${s.phone}` : ""]) {
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
    // Level of detail: from far away places are plain badges (no photo to download or paint); the photos appear when you come closer.
    const high = m.getZoom() >= PHOTO_ZOOM;
    if (lodHigh.current !== null && lodHigh.current !== high) {
      // Only the places that HAVE a photo change look when you cross this zoom (photo in, plain badge out): redraw just those, not the whole map,
      // so zooming stays smooth and nothing flashes.
      for (const [key, mk] of shown.current) {
        const n = key.startsWith("n:") ? byId.current.get(key.slice(2)) : undefined;
        if (n && n.image_url && !isGardenObject(n) && (n.kind === "monument" || (n.kind === "business" && venueFeaturesEnabled(n.subscribed)))) {
          mk.remove();
          shown.current.delete(key);
        }
      }
    }
    lodHigh.current = high;
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
      minZoom: 11,
      maxZoom: 19.5,
      maxBounds: [[7.6, 44.55], [8.15, 44.82]], // Bra + paesi vicini (Alba, Cherasco, Sommariva, Pocapaglia)
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
    // Markers get their screen position one frame after they are added, so tidy up again a little later too.
    const tidy = scheduleDeclutter;
    m.on("idle", tidy);
    m.on("moveend", () => {
      refresh();
      refreshServices();
      tidy();
    });
    m.on("zoom", () => labels());
    m.once("style.load", () => { applyPalette(m, appearanceRef.current); });
    m.on("load", () => {
      // Map credits stay available behind the small "i" button but start closed, so they never cover the map.
      m.getContainer().querySelector(".maplibregl-ctrl-attrib")?.classList.remove("maplibregl-compact-show");
      m.getContainer().querySelector(".maplibregl-ctrl-attrib")?.removeAttribute("open");
      addFlatBuildings(m);
      for (const l of m.getStyle().layers ?? []) if (l.type === "fill-extrusion") m.setLayerZoomRange(l.id, 15, 24);
      applyPalette(m, appearanceRef.current);
      addLand(m, appearanceRef.current);
      applySatellite(m, satRef.current, appearanceRef.current);
      // a low sun from the side: walls get light and shade, roofs stay bright, so the houses read as houses and not as bricks
      try { m.setLight({ anchor: "viewport", position: [1.4, 215, 38], intensity: 0.28, color: appearanceRef.current === "day" ? "#fff1dc" : "#9aa3ff" }); } catch { /* an older style: keep the default light */ }
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
    if (import.meta.env.DEV || location.search.includes("debug")) (window as unknown as { __auraMap?: maplibregl.Map }).__auraMap = m;
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
    const idx = new Supercluster({ radius: 44, maxZoom: 14 }) /* shops and places are never hidden in a number bubble once you are in town */;
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
    scheduleDeclutter();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodesKey, kindLabel, talkLabel]);

  useEffect(() => {
    for (const mk of svcShown.current.values()) mk.remove();
    svcShown.current.clear();
    refreshServices();
    scheduleDeclutter();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pois]);

  // The position changes all the time on a phone: only the cheap "you are near" flags are refreshed for it, never the full tidy-up.
  useEffect(() => {
    for (const [key, mk] of shown.current) if (key.startsWith("n:")) flagClasses(key.slice(2), mk);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speakingId, pos]);
  useEffect(() => {
    for (const [key, mk] of shown.current) if (key.startsWith("n:")) flagClasses(key.slice(2), mk);
    scheduleDeclutter();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flash]);

  useEffect(() => {
    const m = map.current;
    if (!m) return;
    const mode = appearance === "night" ? "night" : "day";
    // the terrain tiles keep isStyleLoaded() false for long stretches: apply at once and again when the map is idle, so the switch never gets lost
    const go = () => { try { applyPalette(m, appearanceRef.current); addLand(m, appearanceRef.current); applySatellite(m, satRef.current, appearanceRef.current); m.setLight({ anchor: "viewport", position: [1.4, 215, 38], intensity: 0.28, color: appearanceRef.current === "day" ? "#fff1dc" : "#9aa3ff" }); } catch { /* style not ready yet */ } };
    go();
    // while the hills are loading the map refuses some colour changes: try again every 120 ms for a moment, so day/night switches at once
    // instead of staying half dark until the terrain is done
    let tries = 0;
    const again = window.setInterval(() => { go(); if (++tries >= 15) window.clearInterval(again); }, 120);
    m.once("idle", go);
    void mode;
    return () => window.clearInterval(again);
  }, [appearance, satellite]);

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

  // Fly to "you are here" ONLY when the person asked for it (the locate button, or the first fix right after opening), never on every GPS update:
  // on a phone the position changes all the time, and re-centering on each change made the map jump back and impossible to touch or move.
  const doneRecenter = useRef(0);
  useEffect(() => {
    const p = posRef.current;
    if (!mapReady || recenter <= doneRecenter.current || !p) return;
    doneRecenter.current = recenter;
    map.current?.flyTo({ center: [p.lng, p.lat], zoom: 17.5, pitch: 62, duration: 1400 });
  }, [recenter, pos, mapReady]);
  // Changing the filter (e.g. from "pharmacy on duty", which zooms in on one place, to "monuments" or "restaurants") brings the view back so the places
  // of the new filter are visible - not the whole region, just the part of Bra where they are. Nothing happens when a place is being shown on purpose.
  const lastFit = useRef<string | null>(null);
  useEffect(() => {
    const m = map.current;
    if (!m || !mapReady) return;
    if (lastFit.current === null) { lastFit.current = fit ?? ""; return; }
    if (lastFit.current === (fit ?? "")) return;
    lastFit.current = fit ?? "";
    if (fit === "duty") return; // the focus effect flies to the pharmacy
    const centre = new maplibregl.LngLat(BRA_CENTER.lng, BRA_CENTER.lat);
    const pts: [number, number][] = [];
    for (const n of nodes) pts.push([n.lng, n.lat]);
    for (const p of pois) pts.push([p.lng, p.lat]);
    const near = pts.filter(([lng, lat]) => new maplibregl.LngLat(lng, lat).distanceTo(centre) <= 2500); // the villages around Bra do not pull the view away
    if (fit === "all" || fit === "" || near.length < 2) {
      const p = posRef.current;
      m.easeTo({ center: p ? [p.lng, p.lat] : [BRA_CENTER.lng, BRA_CENTER.lat], zoom: 15.8, pitch: savedView() === "2d" ? 0 : 58, bearing: savedView() === "2d" ? 0 : -18, duration: 900 });
      return;
    }
    // Look at where most of them are: drop the farthest fifth, so a few places on the edge do not zoom the view out over the whole town.
    const med = (a: number[]) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)]!;
    const mid = new maplibregl.LngLat(med(near.map((p) => p[0])), med(near.map((p) => p[1])));
    const core = [...near].sort((p, q) => new maplibregl.LngLat(p[0], p[1]).distanceTo(mid) - new maplibregl.LngLat(q[0], q[1]).distanceTo(mid)).slice(0, Math.max(2, Math.ceil(near.length * 0.8)));
    const b = new maplibregl.LngLatBounds(core[0]!, core[0]!);
    for (const pt of core) b.extend(pt);
    // The zoom is worked out on a FLAT view: fitBounds on a tilted 3D map zooms out far too much (it tries to fit the far part of the tilt).
    const box = m.getContainer().getBoundingClientRect();
    const midLat = (b.getNorth() + b.getSouth()) / 2;
    const spanX = Math.max(60, new maplibregl.LngLat(b.getWest(), midLat).distanceTo(new maplibregl.LngLat(b.getEast(), midLat)));
    const spanY = Math.max(60, new maplibregl.LngLat(b.getCenter().lng, b.getSouth()).distanceTo(new maplibregl.LngLat(b.getCenter().lng, b.getNorth())));
    const fitZ = Math.min(Math.log2((156543.03 * Math.cos((midLat * Math.PI) / 180) * Math.max(120, box.width - 80)) / spanX), Math.log2((156543.03 * Math.cos((midLat * Math.PI) / 180) * Math.max(120, box.height - 260)) / spanY));
    if (location.search.includes("debug")) (window as unknown as { __fit?: unknown }).__fit = { fit, total: pts.length, near: near.length, spanX: Math.round(spanX), spanY: Math.round(spanY), fitZ, w: box.width, h: box.height };
    const tilt = savedView() === "2d" ? 0 : 0.5; // a tilted view shows less ground near the top
    const zoom = Math.min(16.6, Math.max(15.2, fitZ - tilt));
    m.easeTo({ center: b.getCenter(), zoom, pitch: savedView() === "2d" ? 0 : 58, bearing: savedView() === "2d" ? 0 : -18, duration: 900 });
  }, [fit, mapReady]);
  useEffect(() => {
    if (focus && mapReady) map.current?.flyTo({ center: [focus.lng, focus.lat], zoom: 16.8, pitch: 0, bearing: 0, duration: 1200 });
  }, [focus, mapReady]);

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

