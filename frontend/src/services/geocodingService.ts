import { Coordinates } from '../types/grievance';

export interface GeocodedAddressResult {
  fullAddress: string;
  road?: string;
  suburb?: string;
  neighbourhood?: string;
  city?: string;
  state?: string;
  postcode?: string;
  displayName: string;
  localityHint?: string;
}

// In-memory cache to prevent redundant network requests
const geocodeCache = new Map<string, GeocodedAddressResult>();
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL_MS = 800;

/**
 * Reverse geocodes coordinates to a readable street address using OpenStreetMap Nominatim.
 * Adheres to Nominatim usage policy (rate-throttled, cached, non-blocking on failure).
 */
export async function reverseGeocode(coords: Coordinates): Promise<GeocodedAddressResult | null> {
  const cacheKey = `${coords.latitude.toFixed(4)},${coords.longitude.toFixed(4)}`;

  if (geocodeCache.has(cacheKey)) {
    return geocodeCache.get(cacheKey)!;
  }

  // Enforce minimal throttle interval to prevent flooding Nominatim during map clicks
  const now = Date.now();
  const timeSinceLast = now - lastRequestTime;
  if (timeSinceLast < MIN_REQUEST_INTERVAL_MS) {
    await new Promise((resolve) => setTimeout(resolve, MIN_REQUEST_INTERVAL_MS - timeSinceLast));
  }
  lastRequestTime = Date.now();

  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${coords.latitude}&lon=${coords.longitude}&addressdetails=1&zoom=18`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000); // 6s timeout

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(`Reverse geocoding responded with status: ${response.status}`);
      return null;
    }

    const data = await response.json();
    if (!data || !data.address) {
      return null;
    }

    const addr = data.address;
    const road = addr.road || addr.pedestrian || addr.path || addr.street;
    const neighbourhood = addr.neighbourhood || addr.suburb || addr.residential;
    const suburb = addr.suburb || addr.city_district || addr.district;
    const city = addr.city || addr.town || addr.village || 'Jammu';
    const state = addr.state || 'Jammu and Kashmir';
    const postcode = addr.postcode;

    // Construct a concise, clean civic address
    const parts: string[] = [];
    if (road) parts.push(road);
    if (neighbourhood && neighbourhood !== road) parts.push(neighbourhood);
    if (suburb && suburb !== neighbourhood && suburb !== road) parts.push(suburb);
    if (city && !parts.includes(city)) parts.push(city);
    if (postcode) parts.push(postcode);

    const fullAddress = parts.length > 0 ? parts.join(', ') : data.display_name;

    const localityHint = suburb || neighbourhood || road || '';

    const result: GeocodedAddressResult = {
      fullAddress,
      road,
      suburb,
      neighbourhood,
      city,
      state,
      postcode,
      displayName: data.display_name,
      localityHint,
    };

    geocodeCache.set(cacheKey, result);
    return result;
  } catch (err) {
    // Network errors or timeout must fail gracefully without disrupting form flow
    console.warn('Reverse geocoding failed or timed out:', err);
    return null;
  }
}
