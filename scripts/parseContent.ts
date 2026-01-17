/**
 * Content Ingestion Pipeline
 *
 * Parses docx/pptx files from /tmp/fsm_content/ and generates
 * TypeScript course data files matching fsmCourse.ts structure.
 *
 * Usage: npx tsx scripts/parseContent.ts
 *
 * Input: /tmp/fsm_content/scripts_1/ and /tmp/fsm_content/scripts_2/
 * Output: src/data/fsmCourseC3.ts, src/data/fsmCourseC5.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import JSZip from 'jszip';

// ============================================
// TYPES
// ============================================

interface ParsedAtom {
  courseId: string;      // C3, C5
  moduleId: number;      // M1, M2, etc.
  lessonId: number;      // L1, L2, etc.
  atomId: number;        // A1, A2, etc.
  subAtomId?: number;    // A2.1, A2.2 (optional)
  title: string;
  type: 'video' | 'reading' | 'quiz';
  hasIVQ: boolean;       // In-Video Quiz
  content: string;
  filePath: string;
}

interface CourseStructure {
  courseId: string;
  courseName: string;
  modules: Map<number, {
    lessons: Map<number, ParsedAtom[]>
  }>;
}

// ============================================
// FILENAME PARSING
// ============================================

/**
 * Parse filename to extract course structure
 * Example: FSM.V3.C5.M1.L1.A3 - Data and Reports to Evaluate Performance - Video.docx
 */
function parseFilename(filename: string): {
  courseId: string;
  moduleNum: number;
  lessonNum: number;
  atomNum: number;
  subAtomNum?: number;
  title: string;
  type: 'video' | 'reading' | 'quiz';
  hasIVQ: boolean;
} | null {
  // Match pattern: FSM.V3.C[course].M[module].L[lesson].A[atom] - [Title] - [Type].docx
  const regex = /FSM\.(?:V3\.)?C(\d+)\.M(\d+)\.L(\d+)\.A(\d+)(?:\.(\d+))?\s*-\s*(.+?)\s*-\s*(.+?)\.(?:docx|pptx)$/i;
  const match = filename.match(regex);

  if (!match) {
    // Try alternate pattern without version
    const altRegex = /FSM\.C(\d+)\.M(\d+)\.L(\d+)\.A(\d+)(?:\.(\d+))?\s*-\s*(.+?)\.(?:docx|pptx)$/i;
    const altMatch = filename.match(altRegex);
    if (altMatch) {
      const [, course, module, lesson, atom, subAtom, titleAndType] = altMatch;
      const type = inferType(titleAndType, filename);
      return {
        courseId: `C${course}`,
        moduleNum: parseInt(module),
        lessonNum: parseInt(lesson),
        atomNum: parseInt(atom),
        subAtomNum: subAtom ? parseInt(subAtom) : undefined,
        title: cleanTitle(titleAndType),
        type,
        hasIVQ: titleAndType.toLowerCase().includes('ivq'),
      };
    }
    return null;
  }

  const [, course, module, lesson, atom, subAtom, title, typeStr] = match;

  return {
    courseId: `C${course}`,
    moduleNum: parseInt(module),
    lessonNum: parseInt(lesson),
    atomNum: parseInt(atom),
    subAtomNum: subAtom ? parseInt(subAtom) : undefined,
    title: cleanTitle(title),
    type: inferType(typeStr, filename),
    hasIVQ: typeStr.toLowerCase().includes('ivq'),
  };
}

function inferType(typeStr: string, filename: string): 'video' | 'reading' | 'quiz' {
  const lower = typeStr.toLowerCase();
  const lowerFilename = filename.toLowerCase();

  if (lower.includes('quiz') || lower.includes('ivq')) return 'quiz';
  if (lower.includes('video')) return 'video';
  if (lower.includes('reading')) return 'reading';
  if (lowerFilename.endsWith('.pptx')) return 'reading'; // PPT slides are reading content
  return 'reading'; // Default
}

function cleanTitle(title: string): string {
  return title
    .replace(/\s*-\s*TH\s*_?\s*SC\s*_?\s*A?$/i, '')
    .replace(/\s*-\s*TH\s*_?\s*A?$/i, '')
    .replace(/\s*w\/?_?\s*IVQ$/i, '')
    .replace(/\s*\(Applied\)$/i, '')
    .trim();
}

// ============================================
// DOCX PARSING (via JSZip)
// ============================================

async function extractTextFromDocx(filePath: string): Promise<string> {
  try {
    const data = fs.readFileSync(filePath);
    const zip = await JSZip.loadAsync(data);

    const documentXml = await zip.file('word/document.xml')?.async('string');
    if (!documentXml) return '';

    // Extract text from XML
    const text = documentXml
      .replace(/<w:p[^>]*>/g, '\n')        // Paragraphs as newlines
      .replace(/<w:br[^>]*>/g, '\n')       // Line breaks
      .replace(/<[^>]+>/g, '')             // Remove all tags
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/\n{3,}/g, '\n\n')          // Collapse multiple newlines
      .trim();

    return text;
  } catch (error) {
    console.error(`Error reading docx: ${filePath}`, error);
    return '';
  }
}

async function extractTextFromPptx(filePath: string): Promise<string> {
  try {
    const data = fs.readFileSync(filePath);
    const zip = await JSZip.loadAsync(data);

    const texts: string[] = [];

    // PPTX slides are in ppt/slides/slide*.xml
    const slideFiles = Object.keys(zip.files).filter(f =>
      f.startsWith('ppt/slides/slide') && f.endsWith('.xml')
    ).sort();

    for (const slideFile of slideFiles) {
      const slideXml = await zip.file(slideFile)?.async('string');
      if (!slideXml) continue;

      // Extract text from slide XML
      const slideText = slideXml
        .replace(/<a:p[^>]*>/g, '\n')      // Paragraphs
        .replace(/<[^>]+>/g, '')           // Remove tags
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/\n{3,}/g, '\n\n')
        .trim();

      if (slideText) texts.push(slideText);
    }

    return texts.join('\n\n---\n\n');
  } catch (error) {
    console.error(`Error reading pptx: ${filePath}`, error);
    return '';
  }
}

// ============================================
// FILE DISCOVERY
// ============================================

function findContentFiles(baseDir: string): string[] {
  const files: string[] = [];

  function walkDir(dir: string) {
    if (!fs.existsSync(dir)) return;

    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walkDir(fullPath);
      } else if (entry.name.endsWith('.docx') || entry.name.endsWith('.pptx')) {
        if (!entry.name.startsWith('~$')) { // Skip temp files
          files.push(fullPath);
        }
      }
    }
  }

  walkDir(baseDir);
  return files;
}

// ============================================
// COURSE DATA GENERATION
// ============================================

function generateAtomId(courseId: string, moduleNum: number, lessonNum: number, atomNum: number, subAtomNum?: number): string {
  const base = `fsm-${courseId.toLowerCase()}-m${moduleNum}-l${lessonNum}-a${atomNum}`;
  return subAtomNum ? `${base}-${subAtomNum}` : base;
}

function generateLessonId(courseId: string, moduleNum: number, lessonNum: number): string {
  return `fsm-${courseId.toLowerCase()}-m${moduleNum}-l${lessonNum}`;
}

function estimateReadingTime(content: string): number {
  const words = content.split(/\s+/).length;
  return Math.max(2, Math.ceil(words / 200)); // 200 WPM reading speed
}

function generateVideoAtom(atom: ParsedAtom): string {
  const atomId = generateAtomId(atom.courseId, atom.moduleId, atom.lessonId, atom.atomId, atom.subAtomId);
  const lessonId = generateLessonId(atom.courseId, atom.moduleId, atom.lessonId);

  // Extract key points from content for takeaways
  const lines = atom.content.split('\n').filter(l => l.trim().length > 20);
  const takeaways = lines.slice(0, 4).map(l => l.trim().substring(0, 100));

  return `  {
    id: '${atomId}',
    lessonId: '${lessonId}',
    type: 'video',
    title: '${atom.title.replace(/'/g, "\\'")}',
    content: {
      videoUrl: '', // TODO: Add video URL when available
      transcript: \`${atom.content.replace(/`/g, '\\`').substring(0, 500)}...\`,
      duration: 420,
      chapters: [
        { time: 0, title: 'Introduction' },
        { time: 120, title: 'Main Content' },
        { time: 300, title: 'Summary' },
      ],
      keyTakeaways: [
${takeaways.map(t => `        '${t.replace(/'/g, "\\'")}',`).join('\n')}
      ],
    },
    estimatedMinutes: 7,
    isRequired: true,
    masteryThreshold: 80,
  }`;
}

function generateReadingAtom(atom: ParsedAtom): string {
  const atomId = generateAtomId(atom.courseId, atom.moduleId, atom.lessonId, atom.atomId, atom.subAtomId);
  const lessonId = generateLessonId(atom.courseId, atom.moduleId, atom.lessonId);

  // Convert content to markdown-friendly format
  const contentLines = atom.content.split('\n').filter(l => l.trim());
  const body = contentLines.slice(0, 20).join('\n\n');
  const highlights = contentLines.slice(0, 3).map(l => l.trim().substring(0, 80));

  return `  {
    id: '${atomId}',
    lessonId: '${lessonId}',
    type: 'reading',
    title: '${atom.title.replace(/'/g, "\\'")}',
    content: {
      body: \`# ${atom.title}

${body.replace(/`/g, '\\`')}\`,
      highlights: [
${highlights.map(h => `        '${h.replace(/'/g, "\\'")}',`).join('\n')}
      ],
      relatedResources: [],
    },
    estimatedMinutes: ${estimateReadingTime(atom.content)},
    isRequired: true,
    masteryThreshold: 70,
  }`;
}

function generateQuizAtom(atom: ParsedAtom): string {
  const atomId = generateAtomId(atom.courseId, atom.moduleId, atom.lessonId, atom.atomId, atom.subAtomId);
  const lessonId = generateLessonId(atom.courseId, atom.moduleId, atom.lessonId);

  // Parse questions from content (basic extraction)
  // In real implementation, would need more sophisticated parsing
  return `  {
    id: '${atomId}',
    lessonId: '${lessonId}',
    type: 'quiz',
    title: '${atom.title.replace(/'/g, "\\'")} Quiz',
    content: {
      questions: [
        {
          id: '${atomId}-q1',
          type: 'multiple-choice',
          question: 'Question about ${atom.title}?',
          options: ['Option A', 'Option B', 'Option C', 'Option D'],
          correctAnswer: 0,
          explanation: 'Based on the lesson content.',
          difficulty: 2,
          skills: ['${atom.courseId.toLowerCase()}-m${atom.moduleId}-skills'],
        },
      ],
      passingScore: 70,
    },
    estimatedMinutes: 3,
    isRequired: true,
    masteryThreshold: 80,
  }`;
}

// ============================================
// MAIN PIPELINE
// ============================================

async function main() {
  console.log('🚀 Starting Content Ingestion Pipeline\n');

  const contentDir = '/tmp/fsm_content';
  const outputDir = '/Users/juleslustig/Projects/_Aptly/aptlylearning app/aptly-learning/src/data';

  // Find all content files
  const files = findContentFiles(contentDir);
  console.log(`📁 Found ${files.length} content files\n`);

  // Group by course
  const courseStructures: Map<string, CourseStructure> = new Map();

  let parsed = 0;
  let skipped = 0;

  for (const filePath of files) {
    const filename = path.basename(filePath);
    const metadata = parseFilename(filename);

    if (!metadata) {
      skipped++;
      continue;
    }

    // Extract content
    const content = filePath.endsWith('.docx')
      ? await extractTextFromDocx(filePath)
      : await extractTextFromPptx(filePath);

    if (!content) {
      skipped++;
      continue;
    }

    // Add to course structure
    if (!courseStructures.has(metadata.courseId)) {
      courseStructures.set(metadata.courseId, {
        courseId: metadata.courseId,
        courseName: metadata.courseId === 'C3'
          ? 'Fundamentals of Social Media Marketing'
          : 'Measure and Optimize Social Media Marketing Campaigns',
        modules: new Map(),
      });
    }

    const course = courseStructures.get(metadata.courseId)!;

    if (!course.modules.has(metadata.moduleNum)) {
      course.modules.set(metadata.moduleNum, { lessons: new Map() });
    }

    const courseModule = course.modules.get(metadata.moduleNum)!;

    if (!courseModule.lessons.has(metadata.lessonNum)) {
      courseModule.lessons.set(metadata.lessonNum, []);
    }

    courseModule.lessons.get(metadata.lessonNum)!.push({
      courseId: metadata.courseId,
      moduleId: metadata.moduleNum,
      lessonId: metadata.lessonNum,
      atomId: metadata.atomNum,
      subAtomId: metadata.subAtomNum,
      title: metadata.title,
      type: metadata.type,
      hasIVQ: metadata.hasIVQ,
      content,
      filePath,
    });

    parsed++;
  }

  console.log(`✅ Parsed ${parsed} files, skipped ${skipped}\n`);

  // Generate TypeScript files
  for (const [courseId, course] of courseStructures) {
    console.log(`📝 Generating ${courseId}: ${course.courseName}`);

    let output = `/**
 * ${course.courseName}
 *
 * Auto-generated from content files.
 * Course ID: ${courseId}
 */

import type { Course, Module, Lesson, Atom } from '@/types'

`;

    const allAtoms: string[] = [];
    const allLessons: { id: string; moduleId: number; lessonId: number; title: string }[] = [];

    // Sort modules and lessons
    const sortedModules = [...course.modules.entries()].sort((a, b) => a[0] - b[0]);

    for (const [moduleNum, module] of sortedModules) {
      const sortedLessons = [...module.lessons.entries()].sort((a, b) => a[0] - b[0]);

      for (const [lessonNum, atoms] of sortedLessons) {
        // Sort atoms by atomId
        atoms.sort((a, b) => {
          if (a.atomId !== b.atomId) return a.atomId - b.atomId;
          return (a.subAtomId || 0) - (b.subAtomId || 0);
        });

        const lessonId = generateLessonId(courseId, moduleNum, lessonNum);
        const lessonTitle = atoms[0]?.title || `Lesson ${lessonNum}`;

        allLessons.push({ id: lessonId, moduleId: moduleNum, lessonId: lessonNum, title: lessonTitle });

        output += `// ============================================\n`;
        output += `// MODULE ${moduleNum}, LESSON ${lessonNum}: ${lessonTitle.toUpperCase()}\n`;
        output += `// ============================================\n\n`;
        output += `const m${moduleNum}l${lessonNum}Atoms: Atom[] = [\n`;

        for (const atom of atoms) {
          let atomStr: string;
          switch (atom.type) {
            case 'video':
              atomStr = generateVideoAtom(atom);
              break;
            case 'quiz':
              atomStr = generateQuizAtom(atom);
              break;
            default:
              atomStr = generateReadingAtom(atom);
          }
          allAtoms.push(atomStr);
          output += atomStr + ',\n';
        }

        output += `];\n\n`;
      }
    }

    // Generate lessons array
    output += `// ============================================\n`;
    output += `// LESSONS\n`;
    output += `// ============================================\n\n`;
    output += `const lessons: Lesson[] = [\n`;

    for (const lesson of allLessons) {
      output += `  {
    id: '${lesson.id}',
    moduleId: 'fsm-${courseId.toLowerCase()}-m${lesson.moduleId}',
    number: ${lesson.lessonId},
    title: '${lesson.title.replace(/'/g, "\\'")}',
    objectives: ['Understand ${lesson.title.toLowerCase()}'],
    estimatedMinutes: m${lesson.moduleId}l${lesson.lessonId}Atoms.reduce((sum, a) => sum + a.estimatedMinutes, 0),
    atoms: m${lesson.moduleId}l${lesson.lessonId}Atoms,
    isLocked: false,
  },\n`;
    }

    output += `];\n\n`;

    // Generate modules array
    const moduleGroups = new Map<number, typeof allLessons>();
    for (const lesson of allLessons) {
      if (!moduleGroups.has(lesson.moduleId)) {
        moduleGroups.set(lesson.moduleId, []);
      }
      moduleGroups.get(lesson.moduleId)!.push(lesson);
    }

    output += `// ============================================\n`;
    output += `// MODULES\n`;
    output += `// ============================================\n\n`;
    output += `const modules: Module[] = [\n`;

    for (const [moduleNum] of [...moduleGroups.entries()].sort((a, b) => a[0] - b[0])) {
      output += `  {
    id: 'fsm-${courseId.toLowerCase()}-m${moduleNum}',
    courseId: 'fsm-${courseId.toLowerCase()}',
    number: ${moduleNum},
    title: 'Module ${moduleNum}',
    objectives: ['Complete Module ${moduleNum}'],
    estimatedMinutes: lessons.filter(l => l.moduleId === 'fsm-${courseId.toLowerCase()}-m${moduleNum}').reduce((sum, l) => sum + l.estimatedMinutes, 0),
    lessons: lessons.filter(l => l.moduleId === 'fsm-${courseId.toLowerCase()}-m${moduleNum}'),
    isLocked: false,
  },\n`;
    }

    output += `];\n\n`;

    // Generate course export
    output += `// ============================================\n`;
    output += `// COURSE EXPORT\n`;
    output += `// ============================================\n\n`;
    output += `export const fsm${courseId}Course: Course = {
  id: 'fsm-${courseId.toLowerCase()}',
  number: ${parseInt(courseId.replace('C', ''))},
  title: '${course.courseName}',
  description: 'Learn ${course.courseName.toLowerCase()}',
  objectives: ['Master ${course.courseName.toLowerCase()}'],
  estimatedHours: Math.ceil(modules.reduce((sum, m) => sum + m.estimatedMinutes, 0) / 60),
  modules,
  isLocked: false,
  prerequisites: [],
  domain: 'social-media-marketing',
};\n`;

    // Write file
    const outputPath = path.join(outputDir, `fsmCourse${courseId}.ts`);
    fs.writeFileSync(outputPath, output);
    console.log(`   ✅ Written to ${outputPath}`);
    console.log(`   📊 ${allLessons.length} lessons, ${allAtoms.length} atoms\n`);
  }

  console.log('🎉 Content ingestion complete!');
}

main().catch(console.error);
