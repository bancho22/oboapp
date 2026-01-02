export interface BaseSourceDocument {
  url: string;
  datePublished: string;
  title: string;
  message: string;
  sourceType: string;
  crawledAt: Date;
  markdownText?: string; // Optional markdown-formatted message for display
}

export interface SourceDocumentWithGeoJson extends BaseSourceDocument {
  geoJson: import("../../lib/types").GeoJSONFeatureCollection;
  markdownText: string; // Required for crawlers with precomputed GeoJSON
}
