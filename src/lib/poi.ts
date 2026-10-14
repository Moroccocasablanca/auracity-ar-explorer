// A point of interest drawn on the map as a small round badge (services, gyms, playgrounds...).
export type Poi = {
  id: string;
  lat: number;
  lng: number;
  title: string | null;
  tag: string;
  color: string;
  bg: string;
  fg: string;
  symbol: string;
  /** name of a 3D icon in /icons3d (falls back to the flat symbol) */
  icon?: string | undefined;
  minZoom: number;
  phone?: string | undefined;
  address?: string | undefined;
  hours?: string | undefined;
  /** internal page to open (e.g. /attivita/w123) */
  open?: string | undefined;
};
