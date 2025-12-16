import { NextRequest, NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebase-admin";
import { extractAddresses } from "@/lib/ai-service";
import {
  geocodeAddresses,
  geocodeIntersectionsForStreets,
} from "@/lib/geocoding-router";
import { convertToGeoJSON } from "@/lib/geojson-service";
import {
  Message,
  Address,
  ExtractedData,
  StreetSection,
  GeoJSONFeatureCollection,
} from "@/lib/types";
import { FieldValue } from "firebase-admin/firestore";
import { STREET_GEOCODING_ALGO, PIN_GEOCODING_ALGO } from "@/lib/config";

// Internal types for the geocoding pipeline
interface GeocodingResult {
  preGeocodedMap: Map<string, { lat: number; lng: number }>;
  addresses: Address[];
}

function convertTimestamp(timestamp: any): string {
  // Handle Firestore Timestamp from Admin SDK
  if (timestamp?._seconds) {
    return new Date(timestamp._seconds * 1000).toISOString();
  }
  // Handle Firestore Timestamp from client SDK
  if (timestamp?.toDate) {
    return timestamp.toDate().toISOString();
  }
  return timestamp || new Date().toISOString();
}

/**
 * Step 1: Store the incoming message in the database
 */
async function storeIncomingMessage(
  text: string,
  userId: string,
  userEmail: string | null,
  source: string = "web-interface"
): Promise<string> {
  const messagesRef = adminDb.collection("messages");
  const docRef = await messagesRef.add({
    text,
    userId,
    userEmail,
    source,
    createdAt: FieldValue.serverTimestamp(),
  });
  console.log(`Stored incoming message with ID: ${docRef.id}`);
  return docRef.id;
}

/**
 * Step 2: Extract addresses from message text using AI
 * Pure function that uses AI to extract structured data
 */
async function extractAddressesFromMessage(
  text: string
): Promise<ExtractedData | null> {
  console.log("Extracting addresses using AI...");
  const extractedData = await extractAddresses(text);

  if (extractedData) {
    console.log(
      `Extracted ${extractedData.pins.length} pins and ${extractedData.streets.length} streets`
    );
  }

  return extractedData;
}

/**
 * Step 3: Store extracted addresses in the message
 */
async function storeAddressesInMessage(
  messageId: string,
  extractedData: ExtractedData | null
): Promise<void> {
  if (!extractedData) {
    console.log("No extracted data to store");
    return;
  }

  const messagesRef = adminDb.collection("messages");
  await messagesRef.doc(messageId).update({
    extractedData: JSON.stringify(extractedData),
  });

  console.log(`Stored extracted addresses in message ${messageId}`);
}

/**
 * Step 4: Geocode addresses from extracted data
 * Pure function that converts addresses to coordinates
 */
async function geocodeAddressesFromExtractedData(
  extractedData: ExtractedData | null
): Promise<GeocodingResult> {
  const preGeocodedMap = new Map<string, { lat: number; lng: number }>();
  let addresses: Address[] = [];

  if (!extractedData) {
    return { preGeocodedMap, addresses };
  }

  if (
    STREET_GEOCODING_ALGO === "google_directions" ||
    STREET_GEOCODING_ALGO === "overpass"
  ) {
    // Directions/Overpass-based approach: handle pins and streets separately
    console.log(`Geocoding pins using: ${PIN_GEOCODING_ALGO}`);

    // Geocode pins
    if (extractedData.pins.length > 0) {
      const pinAddresses = extractedData.pins.map((pin) => pin.address);
      const geocodedPins = await geocodeAddresses(pinAddresses);
      addresses.push(...geocodedPins);

      geocodedPins.forEach((addr) => {
        preGeocodedMap.set(addr.originalText, addr.coordinates);
      });
    }

    // Geocode street intersections
    console.log(`Geocoding streets using: ${STREET_GEOCODING_ALGO}`);
    if (extractedData.streets.length > 0) {
      const streetGeocodedMap = await geocodeIntersectionsForStreets(
        extractedData.streets
      );

      // Merge into preGeocodedMap
      streetGeocodedMap.forEach((coords, key) => {
        preGeocodedMap.set(key, coords);
      });

      // Check for missing endpoints and try fallback geocoding
      const missingEndpoints = findMissingStreetEndpoints(
        extractedData.streets,
        preGeocodedMap
      );

      if (missingEndpoints.length > 0) {
        console.log(
          `⚠️  ${missingEndpoints.length} street endpoints not found via ${STREET_GEOCODING_ALGO}, trying fallback geocoding...`
        );
        const fallbackGeocoded = await geocodeAddresses(missingEndpoints);

        fallbackGeocoded.forEach((addr) => {
          preGeocodedMap.set(addr.originalText, addr.coordinates);
          console.log(
            `   ✅ Fallback geocoded: "${addr.originalText}" → [${addr.coordinates.lat}, ${addr.coordinates.lng}]`
          );
        });
      }
    }
  } else {
    // Traditional approach: collect all addresses and geocode in one batch
    const addressesToGeocode =
      collectAllAddressesFromExtractedData(extractedData);

    console.log(
      `Collected ${addressesToGeocode.size} unique addresses to geocode`
    );

    addresses = await geocodeAddresses(Array.from(addressesToGeocode));

    console.log(
      `Successfully geocoded ${addresses.length}/${addressesToGeocode.size} addresses`
    );

    addresses.forEach((addr) => {
      preGeocodedMap.set(addr.originalText, addr.coordinates);
    });
  }

  return { preGeocodedMap, addresses };
}

/**
 * Helper: Find missing street endpoints that haven't been geocoded
 */
function findMissingStreetEndpoints(
  streets: StreetSection[],
  geocodedMap: Map<string, { lat: number; lng: number }>
): string[] {
  const missing: string[] = [];

  streets.forEach((street) => {
    if (!geocodedMap.has(street.from)) {
      missing.push(street.from);
    }
    if (!geocodedMap.has(street.to)) {
      missing.push(street.to);
    }
  });

  return missing;
}

/**
 * Helper: Collect all unique addresses from extracted data
 */
function collectAllAddressesFromExtractedData(
  extractedData: ExtractedData
): Set<string> {
  const addressesToGeocode = new Set<string>();

  // Add pin addresses
  extractedData.pins.forEach((pin) => {
    addressesToGeocode.add(pin.address);
  });

  // Add street endpoint addresses
  extractedData.streets.forEach((street) => {
    addressesToGeocode.add(street.from);
    addressesToGeocode.add(street.to);
  });

  return addressesToGeocode;
}

/**
 * Step 5: Store geocoding results in the message
 */
async function storeGeocodingInMessage(
  messageId: string,
  addresses: Address[]
): Promise<void> {
  if (addresses.length === 0) {
    console.log("No geocoded addresses to store");
    return;
  }

  const messagesRef = adminDb.collection("messages");
  await messagesRef.doc(messageId).update({
    addresses: JSON.stringify(addresses),
  });

  console.log(
    `Stored ${addresses.length} geocoded addresses in message ${messageId}`
  );
}

/**
 * Step 6: Convert geocoded data to GeoJSON
 * Pure function that creates GeoJSON from extracted data and coordinates
 */
async function convertMessageGeocodingToGeoJson(
  extractedData: ExtractedData | null,
  preGeocodedMap: Map<string, { lat: number; lng: number }>
): Promise<GeoJSONFeatureCollection | null> {
  if (!extractedData) {
    return null;
  }

  // Validate that all required addresses have been geocoded
  const missingAddresses = validateAllAddressesGeocoded(
    extractedData,
    preGeocodedMap
  );

  if (missingAddresses.length > 0) {
    console.error(
      `Missing geocoded coordinates for ${missingAddresses.length} addresses:`,
      missingAddresses
    );
    throw new Error(
      `Failed to geocode ${
        missingAddresses.length
      } addresses: ${missingAddresses.join(", ")}`
    );
  }

  const geoJson = await convertToGeoJSON(extractedData, preGeocodedMap);
  console.log(`Generated GeoJSON with ${geoJson.features.length} features`);

  return geoJson;
}

/**
 * Helper: Validate that all addresses have been geocoded
 */
function validateAllAddressesGeocoded(
  extractedData: ExtractedData,
  preGeocodedMap: Map<string, { lat: number; lng: number }>
): string[] {
  const missingAddresses: string[] = [];

  extractedData.pins.forEach((pin) => {
    if (!preGeocodedMap.has(pin.address)) {
      missingAddresses.push(pin.address);
    }
  });

  extractedData.streets.forEach((street) => {
    if (!preGeocodedMap.has(street.from)) {
      missingAddresses.push(`${street.street} from: ${street.from}`);
    }
    if (!preGeocodedMap.has(street.to)) {
      missingAddresses.push(`${street.street} to: ${street.to}`);
    }
  });

  return missingAddresses;
}

/**
 * Step 7: Store GeoJSON in the message
 */
async function storeGeoJsonInMessage(
  messageId: string,
  geoJson: GeoJSONFeatureCollection | null
): Promise<void> {
  if (!geoJson) {
    console.log("No GeoJSON to store");
    return;
  }

  const messagesRef = adminDb.collection("messages");
  await messagesRef.doc(messageId).update({
    geoJson: JSON.stringify(geoJson),
  });

  console.log(`Stored GeoJSON in message ${messageId}`);
}

/**
 * Helper: Verify authentication token and extract user info
 */
async function verifyAuthToken(authHeader: string | null): Promise<{
  userId: string;
  userEmail: string | null;
}> {
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("Missing auth token");
  }

  const token = authHeader.split("Bearer ")[1];

  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    return {
      userId: decodedToken.uid,
      userEmail: decodedToken.email || null,
    };
  } catch (error) {
    console.error("Error verifying auth token:", error);
    throw new Error("Invalid auth token");
  }
}

/**
 * Helper: Validate message text
 */
function validateMessageText(text: any): void {
  if (!text || typeof text !== "string") {
    throw new Error("Invalid message text");
  }

  if (text.length > 5000) {
    throw new Error("Message text is too long (max 5000 characters)");
  }
}

/**
 * Helper: Build the final message response
 */
async function buildMessageResponse(
  messageId: string,
  text: string,
  addresses: Address[],
  extractedData: ExtractedData | null,
  geoJson: GeoJSONFeatureCollection | null
): Promise<Message> {
  return {
    id: messageId,
    text,
    addresses,
    extractedData: extractedData || undefined,
    geoJson: geoJson || undefined,
    createdAt: new Date().toISOString(),
  };
}

export async function GET() {
  try {
    // Use Admin SDK for reading messages
    const messagesRef = adminDb.collection("messages");
    const snapshot = await messagesRef.orderBy("createdAt", "desc").get();

    const messages: Message[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      messages.push({
        id: doc.id,
        text: data.text,
        addresses: data.addresses ? JSON.parse(data.addresses) : [],
        extractedData: data.extractedData
          ? JSON.parse(data.extractedData)
          : undefined,
        geoJson: data.geoJson ? JSON.parse(data.geoJson) : undefined,
        createdAt: convertTimestamp(data.createdAt),
      });
    });

    return NextResponse.json({ messages });
  } catch (error) {
    console.error("Error fetching messages:", error);
    return NextResponse.json(
      { error: "Failed to fetch messages" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Authentication
    const authHeader = request.headers.get("authorization");
    const { userId, userEmail } = await verifyAuthToken(authHeader);

    // Parse and validate request
    const { text } = await request.json();
    validateMessageText(text);

    // Execute the pipeline
    // Step 1: Store incoming message
    const messageId = await storeIncomingMessage(text, userId, userEmail);

    // Step 2: Extract addresses from message
    const extractedData = await extractAddressesFromMessage(text);

    // Step 3: Store extracted addresses in message
    await storeAddressesInMessage(messageId, extractedData);

    // Step 4: Geocode addresses
    const { preGeocodedMap, addresses } =
      await geocodeAddressesFromExtractedData(extractedData);

    // Step 5: Store geocoding results in message
    await storeGeocodingInMessage(messageId, addresses);

    // Step 6: Convert to GeoJSON
    const geoJson = await convertMessageGeocodingToGeoJson(
      extractedData,
      preGeocodedMap
    );

    // Step 7: Store GeoJSON in message
    await storeGeoJsonInMessage(messageId, geoJson);

    // Build and return response
    const newMessage = await buildMessageResponse(
      messageId,
      text,
      addresses,
      extractedData,
      geoJson
    );

    return NextResponse.json({ message: newMessage }, { status: 201 });
  } catch (error) {
    console.error("Error creating message:", error);

    // Handle specific error types
    if (
      error instanceof Error &&
      (error.message === "Missing auth token" ||
        error.message === "Invalid auth token")
    ) {
      return NextResponse.json(
        { error: `Unauthorized - ${error.message}` },
        { status: 401 }
      );
    }

    if (
      error instanceof Error &&
      (error.message === "Invalid message text" ||
        error.message.includes("Message text is too long"))
    ) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (error instanceof Error && error.message.includes("Failed to geocode")) {
      return NextResponse.json(
        {
          error: "Failed to geocode some addresses",
          details: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create message" },
      { status: 500 }
    );
  }
}
