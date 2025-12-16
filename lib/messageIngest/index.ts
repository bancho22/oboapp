import { Message } from "../types";
import {
  storeIncomingMessage,
  storeAddressesInMessage,
  storeGeocodingInMessage,
  storeGeoJsonInMessage,
} from "./db";

export { extractAddressesFromMessage } from "./extract-addresses";
export {
  geocodeAddressesFromExtractedData,
  type GeocodingResult,
} from "./geocode-addresses";
export { convertMessageGeocodingToGeoJson } from "./convert-to-geojson";
export { verifyAuthToken, validateMessageText } from "./helpers";
export { buildMessageResponse } from "./build-response";

/**
 * Execute the full message ingest pipeline
 * @param text - The message text to process
 * @param source - The source of the message (e.g., 'web-interface', 'api', etc.)
 * @param userId - The ID of the user creating the message
 * @param userEmail - The email of the user creating the message (can be null)
 * @returns The processed message with geocoding and GeoJSON data
 */
export async function messageIngest(
  text: string,
  source: string,
  userId: string,
  userEmail: string | null
): Promise<Message> {
  // Step 1: Store incoming message
  const messageId = await storeIncomingMessage(text, userId, userEmail, source);

  // Step 2: Extract addresses from message
  const { extractAddressesFromMessage } = await import("./extract-addresses");
  const extractedData = await extractAddressesFromMessage(text);

  // Step 3: Store extracted addresses in message
  await storeAddressesInMessage(messageId, extractedData);

  // Step 4: Geocode addresses
  const { geocodeAddressesFromExtractedData } = await import(
    "./geocode-addresses"
  );
  const { preGeocodedMap, addresses } = await geocodeAddressesFromExtractedData(
    extractedData
  );

  // Step 5: Store geocoding results in message
  await storeGeocodingInMessage(messageId, addresses);

  // Step 6: Convert to GeoJSON
  const { convertMessageGeocodingToGeoJson } = await import(
    "./convert-to-geojson"
  );
  const geoJson = await convertMessageGeocodingToGeoJson(
    extractedData,
    preGeocodedMap
  );

  // Step 7: Store GeoJSON in message
  await storeGeoJsonInMessage(messageId, geoJson);

  // Build and return response
  const { buildMessageResponse } = await import("./build-response");
  const newMessage = await buildMessageResponse(
    messageId,
    text,
    addresses,
    extractedData,
    geoJson
  );

  return newMessage;
}
