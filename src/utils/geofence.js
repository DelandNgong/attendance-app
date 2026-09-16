// GPS geofence check — confirms a check-in happens within a set radius of
// the training venue's known coordinates.

/** Wraps the browser's Geolocation API in a Promise. */
export function getCurrentPosition(options = { enableHighAccuracy: true, timeout: 10000 }) {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject(new Error("Geolocation is not supported on this device."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      (err) => reject(err),
      options
    );
  });
}

/**
 * Distance in meters between two lat/lng points, using the Haversine formula
 * (accounts for the Earth's curvature — fine at this scale).
 */
export function distanceInMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth's radius in meters
  const toRad = (deg) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Checks whether a given position falls within the allowed radius of the
 * training venue.
 */
export function isWithinGeofence(userLat, userLon, venueLat, venueLon, radiusMeters) {
  const distance = distanceInMeters(userLat, userLon, venueLat, venueLon);
  return { withinGeofence: distance <= radiusMeters, distanceMeters: distance };
}
