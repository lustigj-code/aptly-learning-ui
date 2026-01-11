/**
 * Meta Blueprint Content Scraper
 * Phase 1.1: Data Collection - FREE Implementation
 *
 * Scrapes public Meta Blueprint certification content for vertical AI training
 * Cost: $0 (uses public web scraping)
 *
 * Usage: npx tsx src/scripts/data-collection/scrape-meta-blueprint.ts
 */

import { chromium } from 'playwright';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

type BlueprintConcept = {
  id: string;
  title: string;
  topic: string;
  category: 'fundamentals' | 'advertising' | 'analytics' | 'strategy' | 'creative';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  content: string;
  keyTakeaways: string[];
  examples: string[];
  commonMisconceptions: string[];
  relatedConcepts: string[];
  examWeight: 'low' | 'medium' | 'high';
  metaSource: string;
  scrapedAt: string;
};

const OUTPUT_DIR = join(process.cwd(), 'data', 'meta-blueprint');

// Meta Blueprint URLs to scrape (public content)
const BLUEPRINT_URLS = [
  'https://www.facebook.com/business/learn',
  'https://www.facebook.com/business/learn/facebook-ads-guide',
  'https://www.facebook.com/business/learn/lessons',
  // Add more as discovered
];

/**
 * Main scraping function
 */
async function scrapeMetaBlueprint() {
  console.log('🚀 Starting Meta Blueprint scraping...');
  console.log('💰 Cost: $0 (FREE web scraping)');
  console.log('');

  // Ensure output directory exists
  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
  });

  const concepts: BlueprintConcept[] = [];

  try {
    // Scrape each URL
    for (const url of BLUEPRINT_URLS) {
      console.log(`📄 Scraping: ${url}`);

      const page = await context.newPage();
      await page.goto(url, { waitUntil: 'networkidle' });

      // Extract lesson/concept links
      const lessonLinks = await page.evaluate(() => {
        const links: string[] = [];
        document.querySelectorAll('a[href*="/learn/"]').forEach((link) => {
          const href = (link as HTMLAnchorElement).href;
          if (href && !links.includes(href)) {
            links.push(href);
          }
        });
        return links;
      });

      console.log(`  Found ${lessonLinks.length} lesson links`);

      // Scrape each lesson
      for (const lessonUrl of lessonLinks.slice(0, 100)) {
        // Limit for initial run
        try {
          await page.goto(lessonUrl, { waitUntil: 'networkidle', timeout: 30000 });

          const concept = await extractConceptData(page, lessonUrl);
          if (concept) {
            concepts.push(concept);
            console.log(`  ✅ Extracted: ${concept.title}`);
          }

          // Rate limiting - be respectful
          await page.waitForTimeout(2000);
        } catch (error) {
          console.log(`  ⚠️  Failed to scrape ${lessonUrl}: ${error}`);
        }
      }

      await page.close();
    }

    // Save results
    const outputPath = join(OUTPUT_DIR, 'concepts.json');
    writeFileSync(outputPath, JSON.stringify(concepts, null, 2));

    console.log('');
    console.log(`✅ Scraping complete!`);
    console.log(`📊 Concepts extracted: ${concepts.length}`);
    console.log(`💾 Saved to: ${outputPath}`);

    // Save individual concept files
    concepts.forEach((concept) => {
      const conceptPath = join(OUTPUT_DIR, `${concept.id}.json`);
      writeFileSync(conceptPath, JSON.stringify(concept, null, 2));
    });

    return concepts;
  } finally {
    await browser.close();
  }
}

/**
 * Extract concept data from a lesson page
 */
async function extractConceptData(page: any, url: string): Promise<BlueprintConcept | null> {
  try {
    const data = await page.evaluate(() => {
      const title = document.querySelector('h1')?.textContent?.trim() || '';
      const content =
        document.querySelector('article')?.textContent?.trim() ||
        document.querySelector('main')?.textContent?.trim() ||
        '';

      // Extract key takeaways (often in bulleted lists)
      const keyTakeaways: string[] = [];
      document.querySelectorAll('ul li, ol li').forEach((li) => {
        const text = li.textContent?.trim();
        if (text && text.length > 20 && text.length < 200) {
          keyTakeaways.push(text);
        }
      });

      // Extract examples (often in specific sections)
      const examples: string[] = [];
      document.querySelectorAll('[class*="example"], [id*="example"]').forEach((el) => {
        const text = el.textContent?.trim();
        if (text && text.length > 50) {
          examples.push(text);
        }
      });

      return { title, content, keyTakeaways: keyTakeaways.slice(0, 5), examples: examples.slice(0, 3) };
    });

    if (!data.title || !data.content) {
      return null;
    }

    // Generate concept ID from title
    const id = data.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    // Categorize based on keywords (simple heuristic)
    const category = categorizeConcept(data.title, data.content);
    const difficulty = inferDifficulty(data.content);
    const topic = extractTopic(data.title);

    const concept: BlueprintConcept = {
      id,
      title: data.title,
      topic,
      category,
      difficulty,
      content: data.content.substring(0, 5000), // Limit length
      keyTakeaways: data.keyTakeaways,
      examples: data.examples,
      commonMisconceptions: [], // Will be populated in Phase 1.3
      relatedConcepts: [], // Will be inferred from content analysis
      examWeight: 'medium', // Default, will be refined
      metaSource: url,
      scrapedAt: new Date().toISOString(),
    };

    return concept;
  } catch (error) {
    console.error(`Error extracting data: ${error}`);
    return null;
  }
}

/**
 * Categorize concept based on keywords
 */
function categorizeConcept(title: string, content: string): BlueprintConcept['category'] {
  const text = (title + ' ' + content).toLowerCase();

  if (text.includes('fundamental') || text.includes('basics') || text.includes('introduction')) {
    return 'fundamentals';
  }
  if (text.includes('ad') || text.includes('campaign') || text.includes('targeting')) {
    return 'advertising';
  }
  if (text.includes('analytics') || text.includes('metrics') || text.includes('measurement')) {
    return 'analytics';
  }
  if (text.includes('strategy') || text.includes('planning') || text.includes('objective')) {
    return 'strategy';
  }
  if (text.includes('creative') || text.includes('content') || text.includes('design')) {
    return 'creative';
  }

  return 'fundamentals';
}

/**
 * Infer difficulty from content complexity
 */
function inferDifficulty(content: string): BlueprintConcept['difficulty'] {
  // Simple heuristic based on keywords
  const advancedKeywords = ['advanced', 'complex', 'optimization', 'attribution', 'measurement'];
  const beginnerKeywords = ['introduction', 'basics', 'fundamentals', 'getting started'];

  const text = content.toLowerCase();

  if (advancedKeywords.some((kw) => text.includes(kw))) {
    return 'advanced';
  }
  if (beginnerKeywords.some((kw) => text.includes(kw))) {
    return 'beginner';
  }

  return 'intermediate';
}

/**
 * Extract main topic from title
 */
function extractTopic(title: string): string {
  // Extract key phrase (first 3-5 words typically contain topic)
  const words = title.split(/\s+/).slice(0, 5);
  return words.join(' ');
}

// CLI execution
if (require.main === module) {
  scrapeMetaBlueprint()
    .then((concepts) => {
      console.log('');
      console.log('🎉 Scraping successful!');
      console.log(`📊 Total concepts: ${concepts.length}`);
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Scraping failed:', error);
      process.exit(1);
    });
}

export { scrapeMetaBlueprint, type BlueprintConcept };
