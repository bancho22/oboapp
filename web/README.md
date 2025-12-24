# Web Application

Next.js web application for **Карта Оборище** (Oborishte Map) - a civic engagement platform for residents of the Oborishte district in Sofia, Bulgaria. Aggregates and visualizes public announcements about local events, infrastructure work, and service disruptions on an interactive map.

## Tech Stack

- **Next.js 16** with React 19 and TypeScript
- **Firebase** (Authentication, Firestore, Cloud Messaging)
- **Google Maps API** for interactive mapping
- **Turf.js** for geospatial analysis

## Key Features

- Interactive map displaying geolocated messages from municipal sources
- User-defined interest zones with customizable radius
- Push notifications for new messages in areas of interest
- Progressive Web App with offline support

Backend data ingestion handled by the [`/ingest`](../ingest) folder.

Hosted on Vercel.
