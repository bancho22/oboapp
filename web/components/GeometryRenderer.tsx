"use client";

import React from "react";
import { Polyline, Polygon } from "@react-google-maps/api";
import { toLatLng, createFeatureKey } from "@/lib/geometry-utils";
import { FeatureData } from "@/lib/feature-utils";
import { getGeometryStyle } from "@/lib/marker-config";

/**
 * Props for the GeometryRenderer component
 */
export interface GeometryRendererProps {
  readonly features: FeatureData[];
  readonly selectedFeature: string | null;
  readonly hoveredFeature: string | null;
  readonly shouldShowFullGeometry: boolean;
  readonly unclusteredFeatures: Set<string>;
}

/**
 * Renders geometry features (LineString and Polygon) as Polyline and Polygon components
 *
 * Handles rendering of unclustered features and selected features with proper styling
 * based on hover and selection state.
 */
export default function GeometryRenderer({
  features,
  selectedFeature,
  hoveredFeature,
  shouldShowFullGeometry,
  unclusteredFeatures,
}: GeometryRendererProps) {
  // Early return if geometry shouldn't be shown
  if (!shouldShowFullGeometry) {
    return null;
  }

  // Get unclustered feature data for rendering full geometry
  const unclusteredFeatureData = features.filter((feature) => {
    const key = createFeatureKey(feature.messageId, feature.featureIndex);
    return unclusteredFeatures.has(key);
  });

  // Get selected feature data
  const selectedFeatureData = selectedFeature
    ? features.find(
        (f) => createFeatureKey(f.messageId, f.featureIndex) === selectedFeature
      )
    : null;

  return (
    <>
      {/* Render full geometry for unclustered features (not in clusters) */}
      {unclusteredFeatureData.map((feature) => {
        const key = createFeatureKey(feature.messageId, feature.featureIndex);
        const isHovered = hoveredFeature === key;
        const isSelected = selectedFeature === key;

        if (feature.geometry.type === "LineString") {
          return (
            <Polyline
              key={key}
              path={feature.geometry.coordinates.map(toLatLng)}
              options={{
                ...getGeometryStyle("LineString", isHovered, isSelected),
                clickable: false,
              }}
            />
          );
        }

        if (feature.geometry.type === "Polygon") {
          return (
            <Polygon
              key={key}
              paths={feature.geometry.coordinates[0].map(toLatLng)}
              options={{
                ...getGeometryStyle("Polygon", isHovered, isSelected),
                clickable: false,
              }}
            />
          );
        }

        return null;
      })}

      {/* Also render selected feature if it's different from unclustered ones */}
      {selectedFeatureData && !unclusteredFeatures.has(selectedFeature!) && (
        <>
          {selectedFeatureData.geometry.type === "LineString" && (
            <Polyline
              key={`selected-${selectedFeature}`}
              path={selectedFeatureData.geometry.coordinates.map(toLatLng)}
              options={{
                ...getGeometryStyle("LineString", false, true),
                clickable: false,
              }}
            />
          )}
          {selectedFeatureData.geometry.type === "Polygon" && (
            <Polygon
              key={`selected-${selectedFeature}`}
              paths={selectedFeatureData.geometry.coordinates[0].map(toLatLng)}
              options={{
                ...getGeometryStyle("Polygon", false, true),
                clickable: false,
              }}
            />
          )}
        </>
      )}
    </>
  );
}
