import { adminDb } from "@/lib/firebase-admin";
import { ExtractedData } from "@/lib/types";

/**
 * Step 3: Store extracted addresses in the message
 */
export async function storeAddressesInMessage(
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
