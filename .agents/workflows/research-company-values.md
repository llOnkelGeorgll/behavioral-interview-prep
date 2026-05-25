---
description: Research the core values and principles of a target company and set up the workspace for it
---

When the user asks you to research a company's core values, or when you are triggered in the background to check for pending research requests, follow these exact steps to compile their principles, configure the active target, and clean up request files.

## Scenario A: Manual Trigger (User Request)
If the user explicitly asks you to research a company (e.g., "Research Netflix and set up my project for it"), proceed directly to **Step 2: Research Company Values** below.

## Scenario B: Background Listener Trigger (Scheduled Polling)
If you are triggered by a background timer or cron job to check for pending requests:
1. Run the check command from the workspace root:
   ```bash
   node scripts/check_pending.mjs
   ```
2. Parse the JSON output:
   - If `"pending": false`, terminate execution quietly without sending messages to the user.
   - If `"pending": true`, extract the `"company"` name and proceed to **Step 2: Research Company Values** using that company.
   - After completing all steps, **delete the pending file** by running:
     ```bash
     rm .pending_research.json
     ```
   - Send a friendly message notifying the user that the background research for the company is complete.

---

## Step 2: Research Company Values
1. Use the `search_web` tool to search for:
   - `"[Company Name] core values"`
   - `"[Company Name] leadership principles"`
   - `"[Company Name] corporate culture values"`
2. Gather official descriptions, definitions, and behavioral expectations associated with each value.

---

## Step 3: Create the Company Values Folder
1. Create a directory for the company under `company-values/` using a lowercase, snake_case name (e.g., `company-values/google/` or `company-values/netflix/`).
2. Create Markdown files inside that directory representing the company's core principles (e.g., `company-values/google/respect.md` or `company-values/netflix/freedom_responsibility.md`).
3. Each file should include:
   - `# [Principle Name]`
   - **Definition:** [Official definition/description]
   - **Behavioral Indicators:** [Bullet points of what they look for]
   - **Sample Interview Questions:** [2-3 common behavioral interview questions targeting this principle]

---

## Step 4: Update Active Target & Ingest Data
1. Write the lowercase, snake_case name of the company into `target_company.txt` at the root of the workspace. For example, if setting up for Google, write `google`.
2. Run the ingestion script from the workspace root to compile the new company values into the React app database:
   ```bash
   npm run ingest
   ```

---

## Step 5: Summarize and Align
- Provide a clean markdown summary of the company's core values in your chat.
- Tell the user that the company is now fully loaded in the **Practice Interview** selector and ready for mock interviews.
- Recommend that they map their experience to these values using `/add-new-story`.
