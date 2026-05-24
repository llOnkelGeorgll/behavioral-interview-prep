import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const experienceDir = path.resolve(__dirname, '../experience');
const outputDir = path.resolve(__dirname, './src/data');
const outputFile = path.join(outputDir, 'stories.json');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const stories = [];
const files = fs.readdirSync(experienceDir).filter(file => file.endsWith('.md'));

for (const file of files) {
  const content = fs.readFileSync(path.join(experienceDir, file), 'utf-8');
  
  // Extract a title for display using the first heading
  const titleMatch = content.match(/^#\s+(.+)$/m);
  let title = file.replace('.md', '').replace(/[_]/g, ' ');
  if (titleMatch) {
    title = titleMatch[1];
  }
  
  stories.push({
    id: file,
    title,
    content
  });
}

fs.writeFileSync(outputFile, JSON.stringify(stories, null, 2));
console.log(`Ingested ${stories.length} stories into ${outputFile}`);
