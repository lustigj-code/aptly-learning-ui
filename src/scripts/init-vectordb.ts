/**
 * Initialize Vector Database
 * Phase 3: Execute RAG system setup
 */

import { initializeMetaBlueprintVectorDB } from '@/lib/ai/vectordb/chroma';

async function main() {
  console.log('🚀 Initializing Vector Database...');
  const vectorDB = await initializeMetaBlueprintVectorDB();
  const stats = await vectorDB.getStats('meta_blueprint');
  console.log(`✅ Initialized with ${stats.documentCount} chunks`);
}

main();
