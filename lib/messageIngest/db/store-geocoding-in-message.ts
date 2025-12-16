import { adminDb } from "@/lib/firebase-admin";
import { Address } from "@/lib/types";

/**
 * Step 5: Store geocoding results in the message
 */
export async function storeGeocodingInMessage(
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
