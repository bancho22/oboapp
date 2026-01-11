/**
 * Marker icon and geometry style configuration utilities
 * Extracted from GeoJSONLayer for better reusability and testing
 */

import { colors, opacity } from "@/lib/colors";

/**
 * Default GeoJSON styles for different geometry types and states
 */
export const GEOJSON_STYLES = {
  lineString: {
    strokeColor: colors.primary.red,
    strokeOpacity: opacity.default,
    strokeWeight: 3,
    zIndex: 5,
  },
  lineStringHover: {
    strokeColor: colors.primary.red,
    strokeOpacity: opacity.hover,
    strokeWeight: 4,
    zIndex: 6,
  },
  polygon: {
    strokeColor: colors.primary.red,
    strokeOpacity: opacity.default,
    strokeWeight: 2,
    fillColor: colors.primary.red,
    fillOpacity: opacity.fill,
    zIndex: 5,
  },
  polygonHover: {
    strokeColor: colors.primary.red,
    strokeOpacity: opacity.hover,
    strokeWeight: 3,
    fillColor: colors.primary.red,
    fillOpacity: opacity.fillHover,
    zIndex: 6,
  },
} as const;

/**
 * Configuration for marker icons
 */
export interface MarkerIconConfig {
  readonly path: string;
  readonly fillColor: string;
  readonly fillOpacity: number;
  readonly strokeWeight: number;
  readonly strokeColor: string;
  readonly scale: number;
}

/**
 * Configuration for cluster marker icons
 */
export interface ClusterIconConfig {
  readonly path: string | google.maps.SymbolPath;
  readonly fillColor: string;
  readonly fillOpacity: number;
  readonly strokeColor: string;
  readonly strokeWeight: number;
  readonly scale: number;
}

/**
 * Configuration for cluster marker labels
 */
export interface ClusterLabelConfig {
  readonly text: string;
  readonly color: string;
  readonly fontSize: string;
  readonly fontWeight: string;
}

/**
 * Geometry style configuration
 */
export interface GeometryStyleConfig {
  readonly strokeColor: string;
  readonly strokeOpacity: number;
  readonly strokeWeight: number;
  readonly fillColor?: string;
  readonly fillOpacity?: number;
  readonly zIndex: number;
}

/**
 * Creates a marker icon configuration
 * @param isHovered - Whether the marker is being hovered over
 * @param customColors - Optional custom color palette (defaults to app colors)
 * @param customOpacity - Optional custom opacity values (defaults to app opacity)
 * @returns Marker icon configuration
 */
export function createMarkerIcon(
  isHovered: boolean = false,
  customColors = colors,
  customOpacity = opacity
): MarkerIconConfig {
  return {
    path: "M 0,0 m -8,0 a 8,8 0 1,0 16,0 a 8,8 0 1,0 -16,0",
    fillColor: customColors.primary.red,
    fillOpacity: isHovered ? customOpacity.hover : customOpacity.default,
    strokeWeight: 2,
    strokeColor: customColors.map.stroke,
    scale: isHovered ? 1.2 : 1,
  };
}

/**
 * Creates a cluster marker icon configuration
 * @param count - Number of markers in the cluster
 * @param customColors - Optional custom color palette (defaults to app colors)
 * @returns Cluster icon and label configuration
 */
export function createClusterIcon(
  count: number,
  customColors = colors
): { icon: ClusterIconConfig; label: ClusterLabelConfig } {
  // Scale cluster size based on count, with min/max bounds
  const scale = Math.min(15 + count / 2, 25);

  // Use CIRCLE symbol path, fallback to string for testing
  const symbolPath =
    typeof google !== "undefined" && google.maps
      ? google.maps.SymbolPath.CIRCLE
      : ("CIRCLE" as any);

  return {
    icon: {
      path: symbolPath,
      fillColor: customColors.primary.red,
      fillOpacity: 0.9,
      strokeColor: customColors.map.stroke,
      strokeWeight: 2,
      scale,
    },
    label: {
      text: String(count),
      color: "white",
      fontSize: "12px",
      fontWeight: "bold",
    },
  };
}

/**
 * Gets geometry style configuration based on type and state
 * @param geometryType - Type of geometry ('LineString' or 'Polygon')
 * @param isHovered - Whether the geometry is being hovered over
 * @param isSelected - Whether the geometry is selected
 * @returns Geometry style configuration
 */
export function getGeometryStyle(
  geometryType: "LineString" | "Polygon",
  isHovered: boolean = false,
  isSelected: boolean = false
): GeometryStyleConfig {
  const useHoverState = isHovered || isSelected;

  if (geometryType === "LineString") {
    return useHoverState
      ? GEOJSON_STYLES.lineStringHover
      : GEOJSON_STYLES.lineString;
  }

  if (geometryType === "Polygon") {
    return useHoverState ? GEOJSON_STYLES.polygonHover : GEOJSON_STYLES.polygon;
  }

  // Default fallback (should not reach here with proper typing)
  return GEOJSON_STYLES.lineString;
}

/**
 * Creates customizable geometry styles
 * @param geometryType - Type of geometry
 * @param options - Style customization options
 * @returns Custom geometry style configuration
 */
export function createCustomGeometryStyle(
  geometryType: "LineString" | "Polygon",
  options: {
    strokeColor?: string;
    strokeOpacity?: number;
    strokeWeight?: number;
    fillColor?: string;
    fillOpacity?: number;
    zIndex?: number;
  } = {}
): GeometryStyleConfig {
  const baseStyle = getGeometryStyle(geometryType);

  return {
    ...baseStyle,
    ...options,
  };
}

/**
 * Type definitions for export
 */
export type GeometryType = "LineString" | "Polygon";
