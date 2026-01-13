import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/apiAuth'
import { adminDb } from '@/lib/firebase/admin'
import JSZip from 'jszip'

// Helper to trigger RAG auto-indexing
async function triggerRAGIndexing(courseId: string): Promise<void> {
  try {
    const { forceReindexCourse } = await import('@/lib/rag/backgroundIndexer')
    // Fire and forget - don't block the response
    forceReindexCourse(courseId).catch((err) => {
      console.error(`[Upload] RAG indexing failed for ${courseId}:`, err)
    })
  } catch (error) {
    console.warn('[Upload] RAG auto-indexing not available:', error)
  }
}

// Types for course manifest
type CourseManifest = {
  version: string
  course: {
    id?: string
    title: string
    description: string
    objectives?: string[]
    estimatedHours?: number
    prerequisites?: string[]
  }
  options?: {
    autoTranscribe?: boolean
    autoGenerateQuizzes?: boolean
    autoGenerateSummaries?: boolean
    mapToKnowledgeGraph?: boolean
  }
}

type UploadJob = {
  id: string
  status: 'uploading' | 'parsing' | 'processing' | 'complete' | 'failed'
  courseId?: string
  courseName: string
  progress: number
  currentStep: string
  errors: string[]
  createdAt: Date
  completedAt?: Date
  createdBy: string
  fileCount: number
  options: CourseManifest['options']
}

export async function POST(request: NextRequest) {
  // Verify admin access
  const authResult = await requireAdmin(request)
  if (authResult instanceof NextResponse) {
    return authResult
  }

  try {
    // Parse multipart form data
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    if (!file.name.endsWith('.zip')) {
      return NextResponse.json(
        { error: 'File must be a .zip file' },
        { status: 400 }
      )
    }

    // Create upload job record
    const jobRef = adminDb.collection('upload_jobs').doc()
    const job: UploadJob = {
      id: jobRef.id,
      status: 'parsing',
      courseName: file.name.replace('.zip', ''),
      progress: 10,
      currentStep: 'Parsing zip file...',
      errors: [],
      createdAt: new Date(),
      createdBy: authResult.uid,
      fileCount: 0,
      options: {},
    }
    await jobRef.set(job)

    // Parse zip file
    const arrayBuffer = await file.arrayBuffer()
    const zip = await JSZip.loadAsync(arrayBuffer)

    // Look for manifest.json
    let manifest: CourseManifest
    const manifestFile = zip.file('manifest.json')

    if (manifestFile) {
      const manifestContent = await manifestFile.async('string')
      manifest = JSON.parse(manifestContent) as CourseManifest
    } else {
      // Auto-generate manifest from folder structure
      manifest = {
        version: '1.0',
        course: {
          title: file.name.replace('.zip', '').replace(/-/g, ' ').replace(/_/g, ' '),
          description: 'Auto-generated course',
        },
        options: {
          autoTranscribe: true,
          autoGenerateQuizzes: true,
          autoGenerateSummaries: true,
          mapToKnowledgeGraph: true,
        },
      }
    }

    // Update job with options
    await jobRef.update({
      options: manifest.options || {},
      progress: 20,
      currentStep: 'Analyzing course structure...',
    })

    // Analyze zip structure
    const files = Object.keys(zip.files)
    const videoFiles = files.filter(f =>
      f.match(/\.(mp4|mov|webm|m4v)$/i) && !zip.files[f].dir
    )
    const markdownFiles = files.filter(f =>
      f.match(/\.(md|txt)$/i) && !zip.files[f].dir
    )
    const jsonFiles = files.filter(f =>
      f.match(/\.json$/i) && !zip.files[f].dir && f !== 'manifest.json'
    )

    await jobRef.update({
      fileCount: videoFiles.length + markdownFiles.length,
      progress: 30,
      currentStep: `Found ${videoFiles.length} videos, ${markdownFiles.length} text files`,
    })

    // Create course in Firestore
    const courseId = manifest.course.id || `course-${Date.now()}`
    const courseRef = adminDb.collection('courses').doc(courseId)

    // Calculate estimated hours from video count (rough estimate: 15 min per video)
    const estimatedHours = manifest.course.estimatedHours ||
      Math.ceil((videoFiles.length * 15) / 60)

    await courseRef.set({
      id: courseId,
      number: Date.now(), // Will be sorted by creation time
      title: manifest.course.title,
      description: manifest.course.description,
      objectives: manifest.course.objectives || [],
      estimatedHours,
      isLocked: false,
      prerequisites: manifest.course.prerequisites || [],
      modules: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      uploadJobId: jobRef.id,
      processingStatus: 'pending', // Will be updated when AI processing runs
    })

    await jobRef.update({
      courseId,
      progress: 40,
      currentStep: 'Created course structure',
    })

    // Parse folder structure to create modules and lessons
    const structure = await parseZipStructure(zip, courseId, videoFiles, markdownFiles)

    await jobRef.update({
      progress: 60,
      currentStep: `Creating ${structure.modules.length} modules with ${structure.totalLessons} lessons...`,
    })

    // Create modules and lessons in Firestore
    for (const courseModule of structure.modules) {
      const moduleRef = courseRef.collection('modules').doc(courseModule.id)
      await moduleRef.set({
        ...courseModule,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      for (const lesson of courseModule.lessons) {
        const lessonRef = moduleRef.collection('lessons').doc(lesson.id)
        await lessonRef.set({
          ...lesson,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
      }
    }

    await jobRef.update({
      progress: 80,
      currentStep: 'Storing media files...',
    })

    // Store file references (actual upload to Storage would happen in background)
    const pendingUploads: string[] = []
    for (const videoPath of videoFiles) {
      pendingUploads.push(videoPath)
    }

    // Mark job as complete (AI processing will be triggered separately)
    await jobRef.update({
      status: 'complete',
      progress: 100,
      currentStep: 'Upload complete! AI processing will begin shortly.',
      completedAt: new Date(),
    })

    // Trigger RAG auto-indexing (fire and forget)
    triggerRAGIndexing(courseId)

    return NextResponse.json({
      success: true,
      jobId: jobRef.id,
      courseId,
      courseName: manifest.course.title,
      stats: {
        videos: videoFiles.length,
        textFiles: markdownFiles.length,
        modules: structure.modules.length,
        lessons: structure.totalLessons,
      },
      message: `Course "${manifest.course.title}" created successfully`,
    })

  } catch (error) {
    console.error('Error processing upload:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    )
  }
}

// Helper to parse zip folder structure into modules/lessons
async function parseZipStructure(
  zip: JSZip,
  courseId: string,
  videoFiles: string[],
  markdownFiles: string[]
) {
  const modules: Array<{
    id: string
    courseId: string
    number: number
    title: string
    objectives: string[]
    estimatedMinutes: number
    lessons: Array<{
      id: string
      moduleId: string
      number: number
      title: string
      objectives: string[]
      estimatedMinutes: number
      atoms: Array<{
        id: string
        lessonId: string
        type: 'video' | 'reading'
        title: string
        content: object
        estimatedMinutes: number
        isRequired: boolean
        masteryThreshold: number
      }>
      isLocked: boolean
    }>
    isLocked: boolean
  }> = []

  let totalLessons = 0

  // Group files by folder structure
  const folderMap = new Map<string, string[]>()

  for (const filePath of [...videoFiles, ...markdownFiles]) {
    const parts = filePath.split('/')
    if (parts.length >= 2) {
      // Has folder structure
      const folder = parts.slice(0, -1).join('/')
      if (!folderMap.has(folder)) {
        folderMap.set(folder, [])
      }
      folderMap.get(folder)!.push(filePath)
    } else {
      // Root level file
      if (!folderMap.has('root')) {
        folderMap.set('root', [])
      }
      folderMap.get('root')!.push(filePath)
    }
  }

  // Convert folders to modules
  const sortedFolders = Array.from(folderMap.keys()).sort()
  let moduleNum = 1

  for (const folder of sortedFolders) {
    const files = folderMap.get(folder)!
    const folderName = folder === 'root' ? 'Main Content' :
      folder.split('/').pop()!.replace(/^\d+[-_]?/, '').replace(/[-_]/g, ' ')

    const moduleId = `${courseId}-m${moduleNum}`
    const lessons: typeof modules[0]['lessons'] = []
    let lessonNum = 1

    // Create a lesson for each video
    for (const file of files.filter(f => f.match(/\.(mp4|mov|webm|m4v)$/i))) {
      const fileName = file.split('/').pop()!
      const lessonTitle = fileName
        .replace(/\.(mp4|mov|webm|m4v)$/i, '')
        .replace(/^\d+[-_]?/, '')
        .replace(/[-_]/g, ' ')
        .trim()

      const lessonId = `${moduleId}-l${lessonNum}`

      lessons.push({
        id: lessonId,
        moduleId,
        number: lessonNum,
        title: lessonTitle || `Lesson ${lessonNum}`,
        objectives: [], // Will be populated by AI
        estimatedMinutes: 15, // Default, will be updated after transcription
        atoms: [{
          id: `${lessonId}-video`,
          lessonId,
          type: 'video',
          title: lessonTitle || `Video ${lessonNum}`,
          content: {
            videoUrl: '', // Will be filled after storage upload
            transcript: '', // Will be filled by AI transcription
            duration: 0,
            chapters: [],
            keyTakeaways: [],
            sourceFile: file,
          },
          estimatedMinutes: 15,
          isRequired: true,
          masteryThreshold: 70,
        }],
        isLocked: lessonNum > 1, // First lesson unlocked
      })
      lessonNum++
      totalLessons++
    }

    if (lessons.length > 0) {
      modules.push({
        id: moduleId,
        courseId,
        number: moduleNum,
        title: folderName,
        objectives: [],
        estimatedMinutes: lessons.reduce((sum, l) => sum + l.estimatedMinutes, 0),
        lessons,
        isLocked: moduleNum > 1,
      })
      moduleNum++
    }
  }

  // If no structure found, create a single module with all files
  if (modules.length === 0 && videoFiles.length > 0) {
    const moduleId = `${courseId}-m1`
    const lessons: typeof modules[0]['lessons'] = []

    videoFiles.forEach((file, index) => {
      const fileName = file.split('/').pop()!
      const lessonTitle = fileName
        .replace(/\.(mp4|mov|webm|m4v)$/i, '')
        .replace(/^\d+[-_]?/, '')
        .replace(/[-_]/g, ' ')
        .trim()

      const lessonId = `${moduleId}-l${index + 1}`
      lessons.push({
        id: lessonId,
        moduleId,
        number: index + 1,
        title: lessonTitle || `Lesson ${index + 1}`,
        objectives: [],
        estimatedMinutes: 15,
        atoms: [{
          id: `${lessonId}-video`,
          lessonId,
          type: 'video',
          title: lessonTitle || `Video ${index + 1}`,
          content: {
            videoUrl: '',
            transcript: '',
            duration: 0,
            chapters: [],
            keyTakeaways: [],
            sourceFile: file,
          },
          estimatedMinutes: 15,
          isRequired: true,
          masteryThreshold: 70,
        }],
        isLocked: index > 0,
      })
      totalLessons++
    })

    modules.push({
      id: moduleId,
      courseId,
      number: 1,
      title: 'Course Content',
      objectives: [],
      estimatedMinutes: lessons.length * 15,
      lessons,
      isLocked: false,
    })
  }

  return { modules, totalLessons }
}
