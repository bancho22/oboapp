import center from "@turf/center";
import { lineString, polygon } from "@turf/helpers";

/**
 * Convert GeoJSON coordinate to Google Maps LatLng format
 * GeoJSON uses [longitude, latitude] order, Google Maps uses {lat, lng}
 *
 * @param coord - GeoJSON coordinate array [longitude, latitude]
 * @returns Google Maps LatLng object
 */
export const toLatLng = (coord: number[]): { lat: number; lng: number } => {
  if (!coord || coord.length < 2) {
    throw new Error(
      "Invalid coordinate: must be an array with at least 2 elements"
    );
  }
  if (
    typeof coord[0] !== "number" ||
    typeof coord[1] !== "number" ||
    !Number.isFinite(coord[0]) ||
    !Number.isFinite(coord[1])
  ) {
    throw new Error(
      "Invalid coordinate: longitude and latitude must be numbers"
    );
  }

  return {
    lat: coord[1], // latitude
    lng: coord[0], // longitude
  };
};

/**
 * Calculate centroid for any geometry type (Point, LineString, Polygon)
 *
 * @param geometry - GeoJSON geometry object
 * @returns Centroid as Google Maps LatLng object, or null if calculation fails
 */
export const getCentroid = (
  geometry: any
): { lat: number; lng: number } | null => {
  if (!geometry || !geometry.type) {
    return null;
  }

  try {
    switch (geometry.type) {
      case "Point": {
        if (!geometry.coordinates || !Array.isArray(geometry.coordinates)) {
          return null;
        }
        return toLatLng(geometry.coordinates);
      }
      case "LineString": {
        if (
          !geometry.coordinates ||
          !Array.isArray(geometry.coordinates) ||
          geometry.coordinates.length === 0
        ) {
          return null;
        }
        const turfLine = lineString(geometry.coordinates);
        const turfCenter = center(turfLine);
        return toLatLng(turfCenter.geometry.coordinates);
      }
      case "Polygon": {
        if (
          !geometry.coordinates ||
          !Array.isArray(geometry.coordinates) ||
          geometry.coordinates.length === 0
        ) {
          return null;
        }
        const turfPolygon = polygon(geometry.coordinates);
        const turfCenter = center(turfPolygon);
        return toLatLng(turfCenter.geometry.coordinates);
      }
      default:
        return null;
    }
  } catch (error) {
    console.error("Error calculating centroid:", error);
    return null;
  }
};

/**
 * Generate unique feature key for identifying specific features within messages
 *
 * @param messageId - The message ID
 * @param featureIndex - The index of the feature within the message's GeoJSON
 * @returns Unique feature key string
 */
export const createFeatureKey = (
  messageId: string,
  featureIndex: number
): string => {
  if (!messageId || typeof messageId !== "string") {
    throw new Error("Invalid messageId: must be a non-empty string");
  }
  if (
    typeof featureIndex !== "number" ||
    featureIndex < 0 ||
    !Number.isInteger(featureIndex)
  ) {
    throw new Error("Invalid featureIndex: must be a non-negative integer");
  }

  return `${messageId}-${featureIndex}`;
};
