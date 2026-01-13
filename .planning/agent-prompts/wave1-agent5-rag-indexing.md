# Agent 1-5: RAG Auto-Indexing

## Mission
Create automatic course content indexing so RAG stays up-to-date when content changes.

## Working Directory
`/Users/juleslustig/Projects/_Aptly/aptlylearning app/aptly-learning`

## Pre-Read (MANDATORY)
Before writing any code, read these files:
```
src/lib/rag/pedagogicalChunker.ts    # Chunking logic
src/lib/rag/contentIndexer.ts        # Indexing functions
src/lib/rag/vectorStore.ts           # Vector storage
src/lib/rag/embeddings.ts            # Embedding generation
src/app/api/admin/rag/index/route.ts # Manual index endpoint
```

## Current State
- Manual indexing endpoint exists at `/api/admin/rag/index`
- Content changes don't trigger re-indexing
- RAG can return stale content

## Changes to Make

### 1. Create `src/lib/rag/autoIndexer.ts`
Purpose: Watch for content changes and trigger indexing

```typescript
import { indexContent, deleteFromIndex } from './contentIndexer';
import { chunkContent } from './pedagogicalChunker';

// Index a single atom when created/updated
export async function indexAtom(atomId: string, content: AtomContent): Promise<void> {
  const chunks = await chunkContent(content);
  await indexContent(atomId, chunks);

  // Log for monitoring
  console.log(`Indexed atom ${atomId}: ${chunks.length} chunks`);
}

// Index entire lesson
export async function indexLesson(lessonId: string): Promise<void> {
  const lesson = await getLesson(lessonId);
  for (const atom of lesson.atoms) {
    await indexAtom(atom.id, atom.content);
  }
}

// Index entire course
export async function indexCourse(courseId: string): Promise<IndexResult> {
  const course = await getCourse(courseId);
  let totalChunks = 0;

  for (const module of course.modules) {
    for (const lesson of module.lessons) {
      for (const atom of lesson.atoms) {
        const chunks = await chunkContent(atom.content);
        await indexContent(atom.id, chunks);
        totalChunks += chunks.length;
      }
    }
  }

  return { courseId, totalChunks, indexedAt: new Date() };
}

// Remove from index when content deleted
export async function removeFromIndex(contentId: string): Promise<void> {
  await deleteFromIndex(contentId);
}

// Incremental re-index (only changed content)
export async function incrementalIndex(
  courseId: string,
  since: Date
): Promise<IndexResult> {
  const changedContent = await getContentChangedSince(courseId, since);

  for (const content of changedContent) {
    if (content.deleted) {
      await removeFromIndex(content.id);
    } else {
      await indexAtom(content.id, content);
    }
  }

  return {
    courseId,
    itemsProcessed: changedContent.length,
    indexedAt: new Date()
  };
}

// Check if content needs re-indexing
export async function needsReindex(contentId: string): Promise<boolean> {
  const content = await getContent(contentId);
  const indexRecord = await getIndexRecord(contentId);

  if (!indexRecord) return true;

  return content.updatedAt > indexRecord.indexedAt;
}
```

### 2. Wire indexing to content CRUD operations
Modify course/lesson/atom API routes:

**`src/app/api/admin/content/atoms/route.ts`** (or wherever atom CRUD lives):

```typescript
import { indexAtom, removeFromIndex } from '@/lib/rag/autoIndexer';

// In POST handler (create atom):
export async function POST(request: Request) {
  // ... existing create logic
  const atom = await createAtom(data);

  // Auto-index after successful create
  await indexAtom(atom.id, atom.content).catch(error => {
    console.error('Auto-index failed:', error);
    // Don't fail the request, just log
  });

  return NextResponse.json(atom);
}

// In PUT handler (update atom):
export async function PUT(request: Request) {
  // ... existing update logic
  const atom = await updateAtom(atomId, data);

  // Re-index after update
  await indexAtom(atom.id, atom.content).catch(console.error);

  return NextResponse.json(atom);
}

// In DELETE handler:
export async function DELETE(request: Request) {
  const { atomId } = await request.json();

  // Remove from index before deleting
  await removeFromIndex(atomId).catch(console.error);

  await deleteAtom(atomId);
  return NextResponse.json({ success: true });
}
```

### 3. Create background re-indexing job
`src/lib/rag/backgroundIndexer.ts`:

```typescript
// For periodic full re-index (run via cron)
export async function runBackgroundReindex(): Promise<void> {
  const courses = await getAllCourses();

  for (const course of courses) {
    const lastIndexTime = await getLastIndexTime(course.id);

    if (shouldReindex(lastIndexTime)) {
      await incrementalIndex(course.id, lastIndexTime);
      await updateLastIndexTime(course.id);
    }
  }
}

function shouldReindex(lastIndexTime: Date | null): boolean {
  if (!lastIndexTime) return true;

  const hoursSinceIndex = (Date.now() - lastIndexTime.getTime()) / (1000 * 60 * 60);
  return hoursSinceIndex > 24; // Re-index daily
}
```

### 4. Add indexing status to admin dashboard
Create `src/components/admin/IndexingStatus.tsx`:

```typescript
import { useState, useEffect } from 'react';

export function IndexingStatus() {
  const [status, setStatus] = useState<IndexStatus | null>(null);

  useEffect(() => {
    fetch('/api/admin/rag/status')
      .then(r => r.json())
      .then(setStatus);
  }, []);

  if (!status) return <div>Loading...</div>;

  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <h3 className="font-semibold mb-4">RAG Index Status</h3>

      <div className="space-y-2">
        <div className="flex justify-between">
          <span>Total Documents</span>
          <span className="font-mono">{status.totalDocuments}</span>
        </div>
        <div className="flex justify-between">
          <span>Total Chunks</span>
          <span className="font-mono">{status.totalChunks}</span>
        </div>
        <div className="flex justify-between">
          <span>Last Full Index</span>
          <span className="text-gray-600">
            {formatRelativeTime(status.lastFullIndex)}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Pending Updates</span>
          <span className={status.pendingUpdates > 0 ? 'text-yellow-600' : ''}>
            {status.pendingUpdates}
          </span>
        </div>
      </div>

      <button
        onClick={() => fetch('/api/admin/rag/index', { method: 'POST' })}
        className="mt-4 w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
      >
        Trigger Full Re-index
      </button>
    </div>
  );
}
```

### 5. Create status API endpoint
`src/app/api/admin/rag/status/route.ts`:

```typescript
export async function GET() {
  const status = await getIndexStatus();
  return NextResponse.json(status);
}

async function getIndexStatus(): Promise<IndexStatus> {
  // Query Firestore for index metadata
  const indexMeta = await getIndexMetadata();

  return {
    totalDocuments: indexMeta.documentCount,
    totalChunks: indexMeta.chunkCount,
    lastFullIndex: indexMeta.lastFullIndexAt,
    pendingUpdates: await countPendingIndexUpdates(),
  };
}
```

## Verification Steps

1. `npm run build` - Must compile
2. `npm run lint` - Must pass
3. Manual test: Create new atom via admin, verify it's indexed
4. Manual test: Update atom content, verify re-indexed
5. Manual test: Delete atom, verify removed from index
6. Manual test: Check admin dashboard shows correct status
7. Query RAG for newly added content, verify it's found

## Do NOT Modify
- `src/lib/rag/pedagogicalChunker.ts` (chunking logic is correct)
- `src/lib/rag/vectorStore.ts` (storage is correct)
- `src/lib/rag/embeddings.ts` (embeddings are correct)

## Output
When complete:
- Content changes automatically trigger indexing
- Admin can see indexing status
- RAG always returns up-to-date content
- No manual re-indexing needed for content updates
