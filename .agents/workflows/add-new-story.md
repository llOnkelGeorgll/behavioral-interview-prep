---
description: Add a new behavioral interview story
---

When the user asks you to add a new story or answer a new behavioral interview question, follow these exact steps to ensure it matches the expected structure and is pushed to the local web app.

1. **Read Current Target Company**
   - Check the file `target_company.txt` at the root of the workspace to identify the active target company (e.g. `amazon`, `google`, `netflix`). Default to `amazon` if not specified.
   - Look up the principles/values in the corresponding directory `company-values/<target_company>/` or file `company-values/<target_company>.md`.

2. **Analyze the Request**
   - Match the user's raw story with the core values/principles of the active target company.
   - Draft 2-3 potential behavioral questions this story would perfectly answer based on the target company's values.

3. **Create the Story Document**
   - Create a single, new Markdown file inside the `/experience/` directory. Use a clear, snake_case filename (e.g., `experience/story_10_new_topic.md`).
   - The document MUST contain these specific headings in this order:
     - `# [Catchy Title of the Story]`
     - `## Highlighted Company Values` (Bulleted list of principles/values)
     - `## Potential Behavioral Questions` (Bulleted list)
     - `## Quick Speaker Notes (Keywords)` (Punchy, bulleted speaker notes for S, T, A, R, and L tags)
     - `## The Story (STAR-L Format)` (Fully written out paragraphs for Situation, Task, Action, Result, and Lesson Learned)

4. **Ingest the Story into the Web App**
   - From the workspace root directory, run the ingestion script using the npm script:
   
// turbo
```bash
npm run dev
```
   *(Note: Running `npm run dev` at the root automatically triggers `node ingestStories.mjs` to rebuild the stories database and launches the development server. Alternatively, if the dev server is already running, run `npm run ingest` at the root).*

5. **Verify and Inform**
   - Inform the user that the story has been successfully added and processed.
   - Remind the user that the updated story is immediately searchable in their live web app at `http://localhost:5173`.
