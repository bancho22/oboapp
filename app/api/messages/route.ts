import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { Message } from "@/lib/types";
import {
  extractAddressesFromMessage,
  geocodeAddressesFromExtractedData,
  convertMessageGeocodingToGeoJson,
  verifyAuthToken,
  validateMessageText,
  buildMessageResponse,
} from "@/lib/pipeline";
import {
  storeIncomingMessage,
  storeAddressesInMessage,
  storeGeocodingInMessage,
  storeGeoJsonInMessage,
} from "@/lib/pipeline/db";

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
