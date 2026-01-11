"use client";

import React, { useEffect, useState, useRef } from "react";
import { MarkerClusterer } from "@googlemaps/markerclusterer";
import { trackEvent } from "@/lib/analytics";
import { Message } from "@/lib/types";
import { createFeatureKey } from "@/lib/geometry-utils";
import { extractFeaturesFromMessages, FeatureData } from "@/lib/feature-utils";
import { createMarkerIcon, createClusterIcon } from "@/lib/marker-config";
import GeometryRenderer from "./GeometryRenderer";

interface GeoJSONLayerProps {
  readonly messages: Message[];
  readonly onFeatureClick?: (messageId: string) => void;
  readonly map?: google.maps.Map | null;
  readonly currentZoom: number;
}

export default function GeoJSONLayer({
  messages,
  onFeatureClick,
  map,
  currentZoom,
}: GeoJSONLayerProps) {
  const [selectedFeature, setSelectedFeature] = useState<string | null>(null);
  const [hoveredFeature, setHoveredFeature] = useState<string | null>(null);
  const [unclusteredFeatures, setUnclusteredFeatures] = useState<Set<string>>(
    new Set()
  );
  const clustererRef = useRef<MarkerClusterer | null>(null);
  const markersRef = useRef<Map<string, google.maps.Marker>>(new Map());

  // Extract all features with centroids
  const features = extractFeaturesFromMessages(messages);

  // Create and manage markers with clustering
  useEffect(() => {
    if (!map) return;

    // Clear existing markers and clusterer
    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current.clear();
    if (clustererRef.current) {
      clustererRef.current.clearMarkers();
    }

    // Create markers for all features
    const markers: google.maps.Marker[] = [];
    features.forEach((feature) => {
      const key = createFeatureKey(feature.messageId, feature.featureIndex);

      const marker = new google.maps.Marker({
        position: feature.centroid,
        map: null, // Will be managed by clusterer
        icon: createMarkerIcon(false),
        title:
          feature.properties?.address ||
          feature.properties?.street_name ||
          "Маркер",
        zIndex: 10,
      });

      // Store feature data in marker
      (marker as any).featureData = feature;
      (marker as any).featureKey = key;

      // Click handler
      marker.addListener("click", () => {
        setSelectedFeature(key);
        if (onFeatureClick) {
          trackEvent({
            name: "map_feature_clicked",
            params: {
              message_id: feature.messageId,
              geometry_type: feature.geometry.type,
            },
          });
          onFeatureClick(feature.messageId);
        }
      });

      // Hover handlers
      marker.addListener("mouseover", () => {
        setHoveredFeature(key);
        marker.setIcon(createMarkerIcon(true));
      });

      marker.addListener("mouseout", () => {
        setHoveredFeature(null);
        marker.setIcon(createMarkerIcon(false));
      });

      markers.push(marker);
      markersRef.current.set(key, marker);
    });

    // Create clusterer with aggressive clustering settings
    if (markers.length > 0) {
      const clusterer = new MarkerClusterer({
        map: map,
        markers,
        algorithmOptions: {
          maxZoom: 17, // Cluster until zoom level 17
        },
        renderer: {
          render: ({ count, position, markers: clusterMarkers }) => {
            // When rendering, track which markers are in this cluster
            if (count > 1) {
              // This is a real cluster - hide full geometry for these features
              clusterMarkers?.forEach((marker) => {
                const key = (marker as any).featureKey;
                if (key) {
                  setUnclusteredFeatures((prev) => {
                    const next = new Set(prev);
                    next.delete(key);
                    return next;
                  });
                }
              });
            }

            // Create red cluster marker matching our pin color
            const { icon, label } = createClusterIcon(count);
            return new google.maps.Marker({
              position,
              icon,
              label,
              zIndex: Number(google.maps.Marker.MAX_ZINDEX) + count,
            });
          },
        },
      });

      clustererRef.current = clusterer;

      // Initialize all features as unclustered, then renderer will remove clustered ones
      const allKeys = new Set(markersRef.current.keys());
      setUnclusteredFeatures(allKeys);

      // Listen to map zoom/bounds changes to update unclustered state
      const updateUnclusteredState = () => {
        setTimeout(() => {
          const allKeys = new Set(markersRef.current.keys());
          setUnclusteredFeatures(allKeys);
        }, 100); // Small delay to let clusterer finish rendering
      };

      map.addListener("zoom_changed", updateUnclusteredState);
      map.addListener("bounds_changed", updateUnclusteredState);
    }

    return () => {
      // Cleanup
      markersRef.current.forEach((marker) => marker.setMap(null));
      markersRef.current.clear();
      if (clustererRef.current) {
        clustererRef.current.clearMarkers();
        clustererRef.current = null;
      }
    };
  }, [messages, onFeatureClick, map]);

  // Only show full geometry at high zoom levels (>=15) to avoid visual clutter
  const shouldShowFullGeometry = currentZoom >= 15;

  return (
    <GeometryRenderer
      features={features}
      selectedFeature={selectedFeature}
      hoveredFeature={hoveredFeature}
      shouldShowFullGeometry={shouldShowFullGeometry}
      unclusteredFeatures={unclusteredFeatures}
    />
  );
}
