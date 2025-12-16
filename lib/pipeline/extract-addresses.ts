import { extractAddresses } from "@/lib/ai-service";
import { ExtractedData } from "@/lib/types";

/**
 * Step 2: Extract addresses from message text using AI
 * Pure function that uses AI to extract structured data
 */
export async function extractAddressesFromMessage(
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
