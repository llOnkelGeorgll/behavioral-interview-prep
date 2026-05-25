import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Resolves to .pending_research.json at the workspace root
const pendingFilePath = path.resolve(__dirname, '../.pending_research.json');

if (fs.existsSync(pendingFilePath)) {
  try {
    const data = JSON.parse(fs.readFileSync(pendingFilePath, 'utf-8'));
    if (data && data.company) {
      console.log(JSON.stringify({ pending: true, company: data.company }));
      process.exit(0);
    }
  } catch (e) {
    console.log(JSON.stringify({ pending: false, error: e.message }));
    process.exit(0);
  }
}

console.log(JSON.stringify({ pending: false }));
