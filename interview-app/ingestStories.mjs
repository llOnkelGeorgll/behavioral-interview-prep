import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const workspaceRoot = path.resolve(__dirname, '..');
const experienceDir = path.resolve(workspaceRoot, 'experience');
const companyValuesDir = path.resolve(workspaceRoot, 'company-values');
const outputDir = path.resolve(__dirname, './src/data');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// 1. Ingest Experience Stories
const stories = [];
if (fs.existsSync(experienceDir)) {
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
}
const storiesOutputFile = path.join(outputDir, 'stories.json');
fs.writeFileSync(storiesOutputFile, JSON.stringify(stories, null, 2));
console.log(`Ingested ${stories.length} stories into ${storiesOutputFile}`);

// 2. Ingest Company Values
const companies = [];

const formatTitle = (str) => {
  return str
    .replace(/[_.-]/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

if (fs.existsSync(companyValuesDir)) {
  const items = fs.readdirSync(companyValuesDir);

  for (const item of items) {
    const itemPath = path.join(companyValuesDir, item);
    const stat = fs.statSync(itemPath);

    if (stat.isDirectory()) {
      // Case A: Directory-based company principles (like /company-values/amazon/)
      const companyId = item.toLowerCase();
      const companyName = item === 'aws' ? 'AWS' : formatTitle(item);
      const values = [];

      const valFiles = fs.readdirSync(itemPath).filter(f => !f.startsWith('.'));
      for (const valFile of valFiles) {
        const valPath = path.join(itemPath, valFile);
        if (fs.statSync(valPath).isFile()) {
          const rawContent = fs.readFileSync(valPath, 'utf-8');
          const valueTitle = formatTitle(valFile.replace(/\.md$/, ''));
          
          // Use first paragraph as brief description, full text as content
          const paragraphs = rawContent.split(/\n\n+/).map(p => p.trim()).filter(Boolean);
          const description = paragraphs[0] || '';

          values.push({
            id: valFile.replace(/\.md$/, '').replace(/\s+/g, '_').toLowerCase(),
            title: valueTitle,
            description: description,
            content: rawContent
          });
        }
      }

      companies.push({
        id: companyId,
        name: companyName,
        values
      });

    } else if (stat.isFile() && item.endsWith('.md')) {
      // Case B: Single markdown file company principles (like /company-values/google.md)
      const companyId = item.replace('.md', '').toLowerCase();
      const companyName = companyId === 'aws' ? 'AWS' : formatTitle(companyId);
      const values = [];

      const fileContent = fs.readFileSync(itemPath, 'utf-8');
      const sections = fileContent.split(/^##\s+/m);
      
      // Skip index 0 as it's the title/intro of the company document
      for (let i = 1; i < sections.length; i++) {
        const section = sections[i];
        const lines = section.split('\n');
        const valueTitle = lines[0].trim();
        const valueContent = lines.slice(1).join('\n').trim();
        
        const paragraphs = valueContent.split(/\n\n+/).map(p => p.trim()).filter(Boolean);
        const description = paragraphs[0] || '';

        values.push({
          id: valueTitle.replace(/\s+/g, '_').toLowerCase(),
          title: valueTitle,
          description: description,
          content: valueContent
        });
      }

      companies.push({
        id: companyId,
        name: companyName,
        values
      });
    }
  }
}

const companiesOutputFile = path.join(outputDir, 'companies.json');
fs.writeFileSync(companiesOutputFile, JSON.stringify(companies, null, 2));
console.log(`Ingested ${companies.length} companies into ${companiesOutputFile}`);
