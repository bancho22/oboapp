import { adminDb } from "@/lib/firebase-admin";
import { GeoJSONFeatureCollection } from "@/lib/types";

/**
 * Step 7: Store GeoJSON in the message
 */
export async function storeGeoJsonInMessage(
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
