import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { exec } from 'child_process'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Global state to track the active research task
let currentTask = {
  status: 'idle', // 'idle' | 'running' | 'success' | 'error'
  company: '',
  logs: '',
  error: ''
};

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'api-research-middleware',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url === '/api/research-company' && req.method === 'POST') {
            if (currentTask.status === 'running') {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: `A research task is already running for ${currentTask.company}` }));
              return;
            }

            let body = '';
            req.on('data', chunk => {
              body += chunk;
            });
            req.on('end', () => {
              try {
                const { company } = JSON.parse(body);
                if (company && company.trim()) {
                  const companyName = company.trim();
                  
                  // Initialize current task state
                  currentTask.status = 'running';
                  currentTask.company = companyName;
                  currentTask.logs = `[API] Initializing research task for: ${companyName}...\n`;
                  currentTask.error = '';

                  // Construct command (trying agy --yolo first, falling back to agentapi new-conversation)
                  const command = `agy --yolo "/research-company-values ${companyName}" || agentapi new-conversation "/research-company-values ${companyName}"`;
                  
                  currentTask.logs += `[API] Spawning background agent session...\n`;
                  currentTask.logs += `[API] Running command: ${command}\n\n`;

                  // Spawn the process
                  const child = exec(command, { cwd: path.resolve(__dirname, '..') });

                  child.stdout.on('data', (data) => {
                    currentTask.logs += data.toString();
                  });

                  child.stderr.on('data', (data) => {
                    currentTask.logs += data.toString();
                  });

                  child.on('close', (code) => {
                    if (code === 0) {
                      currentTask.logs += `\n[API] Agent completed successfully. Running database ingestion...\n`;
                      
                      // Run database compiler
                      exec('npm run ingest', { cwd: path.resolve(__dirname, '..') }, (ingestErr, stdout, stderr) => {
                        if (ingestErr) {
                          currentTask.status = 'error';
                          currentTask.error = ingestErr.message;
                          currentTask.logs += `\n[API] Ingestion failed: ${ingestErr.message}\n`;
                        } else {
                          currentTask.status = 'success';
                          currentTask.logs += stdout;
                          currentTask.logs += `\n[API] Success! ${companyName} is now ready in the dropdown.\n`;
                        }
                      });
                    } else {
                      currentTask.status = 'error';
                      currentTask.error = `Process exited with code ${code}`;
                      currentTask.logs += `\n[API] Headless agent failed with exit code ${code}\n`;
                    }
                  });
                  
                  res.writeHead(200, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ success: true, message: `Headless agent started.` }));
                } else {
                  res.writeHead(400, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ error: 'Company name is required.' }));
                }
              } catch (err) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: err.message }));
              }
            });
          } else if (req.url === '/api/research-status' && req.method === 'GET') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(currentTask));
          } else if (req.url === '/api/companies' && req.method === 'GET') {
            const companiesPath = path.resolve(__dirname, './src/data/companies.json');
            if (fs.existsSync(companiesPath)) {
              try {
                const data = fs.readFileSync(companiesPath, 'utf-8');
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(data);
              } catch (e) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: e.message }));
              }
            } else {
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify([]));
            }
          } else if (req.url === '/api/config' && req.method === 'GET') {
            // Read local config file from root
            const configPath = path.resolve(__dirname, '../.config.json');
            if (fs.existsSync(configPath)) {
              try {
                const configData = fs.readFileSync(configPath, 'utf-8');
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(configData);
              } catch (e) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: e.message }));
              }
            } else {
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ apiKey: '', model: '' }));
            }
          } else if (req.url === '/api/config' && req.method === 'POST') {
            let body = '';
            req.on('data', chunk => {
              body += chunk;
            });
            req.on('end', () => {
              try {
                const { apiKey, model } = JSON.parse(body);
                const configPath = path.resolve(__dirname, '../.config.json');
                fs.writeFileSync(configPath, JSON.stringify({ apiKey, model }, null, 2));
                
                console.log(`[API] Saved local credentials to .config.json`);
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true }));
              } catch (err) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: err.message }));
              }
            });
          } else {
            next();
          }
        });
      }
    }
  ],
})
