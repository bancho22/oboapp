#!/usr/bin/env node
/**
 * Re-processes finalized messages that have no GeoJSON (i.e. appeared on the
 * /ingest-errors page).
 *
 * Steps:
 *  1. Fetch all finalized messages without geoJson
 *  2. Group them by sourceDocumentId
 *  3. For each source: delete ALL messages from that source (so the
 *     "already ingested" guard in from-sources.ts won't block re-ingestion),
 *     then re-run messageIngest directly against the source document.
 *
 * Usage:
 *   pnpm tsx ingest/tmp/reprocess-failed-messages.ts            # dry-run (safe)
 *   pnpm tsx ingest/tmp/reprocess-failed-messages.ts --execute  # actually run
 */

import dotenv from "dotenv";
import { resolve } from "node:path";
import type { OboDb } from "@oboapp/db";

dotenv.config({ path: resolve(process.cwd(), ".env.local") });

const DRY_RUN = !process.argv.includes("--execute");

type MsgDoc = Record<string, unknown>;

function isFailedMessage(doc: MsgDoc): boolean {
  const geoJson = doc.geoJson;
  if (!geoJson) return true;
  if (typeof geoJson === "string" && geoJson.trim() === "") return true;
  if (
    typeof geoJson === "object" &&
    "features" in geoJson &&
    Array.isArray((geoJson as { features: unknown[] }).features) &&
    (geoJson as { features: unknown[] }).features.length === 0
  )
    return true;
  return false;
}

function groupBySource(failed: MsgDoc[]): Map<string, MsgDoc[]> {
  const bySource = new Map<string, MsgDoc[]>();
  for (const msg of failed) {
    const sid = msg.sourceDocumentId as string | undefined;
    if (!sid) {
      console.warn(
        `⚠️  Message ${msg._id as string} has no sourceDocumentId — skipping`,
      );
      continue;
    }
    const bucket = bySource.get(sid);
    if (bucket) {
      bucket.push(msg);
    } else {
      bySource.set(sid, [msg]);
    }
  }
  return bySource;
}

function parseTimestamp(value: unknown): Date | undefined {
  if (value instanceof Date) return value;
  return value ? new Date(value as string) : undefined;
}

async function processSource(
  db: OboDb,
  sourceDocumentId: string,
  msgs: MsgDoc[],
): Promise<void> {
  console.log(`\n─── Source: ${sourceDocumentId}`);
  for (const m of msgs) {
    const snippet = ((m.text ?? m.plainText ?? "") as string).slice(0, 80);
    console.log(`  📄 ${m._id as string}  "${snippet}..."`);
  }

  const source = await db.sources.findById(sourceDocumentId);
  if (!source) {
    console.warn(`  ⚠️  Source document not found — skipping`);
    return;
  }

  if (!source.locality) {
    console.warn(`  ⚠️  Source missing locality field — skipping`);
    return;
  }

  if (DRY_RUN) {
    console.log(
      `  [dry-run] Would delete ${msgs.length} message(s) and re-ingest from "${source.sourceType as string}"`,
    );
    return;
  }

  // Fetch ALL messages with this sourceDocumentId (may include successful siblings
  // from a filterAndSplit that also need to be re-created consistently)
  const allMsgsForSource = await db.messages.findBySourceDocumentIds(
    [sourceDocumentId],
    ["_id", "sourceDocumentId"],
  );

  console.log(
    `  🗑️  Deleting ${allMsgsForSource.length} message(s) for this source...`,
  );
  for (const m of allMsgsForSource) {
    await db.messages.deleteOne(m._id as string);
  }

  // Parse precomputed geoJson if present
  let geoJson = null;
  if (source.geoJson) {
    geoJson =
      typeof source.geoJson === "string"
        ? JSON.parse(source.geoJson)
        : source.geoJson;
  }

  const crawledAt =
    source.crawledAt instanceof Date
      ? source.crawledAt
      : new Date(
          (source.crawledAt as string | number | undefined) ?? Date.now(),
        );

  const timespanStart = parseTimestamp(source.timespanStart);
  const timespanEnd = parseTimestamp(source.timespanEnd);

  const userFacingUrl =
    source.deepLinkUrl === undefined
      ? (source.url as string)
      : (source.deepLinkUrl as string) || undefined;

  console.log(
    `  🔄 Re-ingesting from source "${source.sourceType as string}"...`,
  );
  const { messageIngest } = await import("../messageIngest/index");

  const result = await messageIngest(
    source.message as string,
    source.sourceType as string,
    {
      precomputedGeoJson: geoJson,
      sourceUrl: userFacingUrl,
      sourceDocumentId,
      crawledAt,
      markdownText: source.markdownText as string | undefined,
      categories: source.categories as string[] | undefined,
      isRelevant: source.isRelevant as boolean | undefined,
      timespanStart,
      timespanEnd,
      cityWide: source.cityWide as boolean | undefined,
      locality: source.locality as string,
    },
  );

  const created = result.messages.map((m) => m.id).join(", ");
  console.log(
    `  ✅ Done — created ${result.messages.length} message(s): ${created}`,
  );
}

async function main() {
  const { getDb } = await import("../lib/db");
  const db = await getDb();

  console.log(`\n🔍 Fetching finalized messages without GeoJSON...\n`);

  // Same query as the ingest-errors API route
  const allFinalized = await db.messages.findMany({
    where: [{ field: "finalizedAt", op: ">", value: new Date(0) }],
    orderBy: [{ field: "finalizedAt", direction: "desc" }],
    limit: 500,
  });

  const failed = allFinalized.filter(isFailedMessage);

  if (failed.length === 0) {
    console.log("✅ No failed messages found. Nothing to do.");
    return;
  }

  const bySource = groupBySource(failed);
  console.log(
    `Found ${failed.length} failed message(s) across ${bySource.size} source(s)\n`,
  );

  for (const [sourceDocumentId, msgs] of bySource) {
    await processSource(db, sourceDocumentId, msgs);
  }

  if (DRY_RUN) {
    console.log(
      `\n⚠️  DRY RUN — no changes made. Re-run with --execute to apply.\n`,
    );
  } else {
    console.log(`\n✅ Re-processing complete.\n`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
