---
description: Research the core values and principles of a target company and set up the workspace for it
---

When the user asks you to research a company's core values, or configure the project for a new company (e.g., Google, Netflix, Meta, Microsoft), follow these exact steps to compile their principles and configure the active target.

1. **Research Company Values**
   - Use the `search_web` tool to search for:
     - `"[Company Name] core values"`
     - `"[Company Name] leadership principles"`
     - `"[Company Name] corporate culture values"`
   - Gather official descriptions, definitions, behavioral indicators, and definitions associated with each value.

2. **Create the Company Values Folder**
   - Create a directory for the company under `company-values/` using a lowercase, snake_case name (e.g., `company-values/google/`).
   - Create Markdown files inside that directory representing the company's core principles (e.g., `company-values/google/respect.md` or `company-values/google/googlyness.md`).
   - Each file should include:
     - `# [Principle Name]`
     - **Definition:** [Official definition/description]
     - **Behavioral Indicators:** [Bullet points of what they look for]
     - **Sample Interview Questions:** [2-3 common behavioral interview questions targeting this principle]

3. **Update Active Target Configuration**
   - Write the lowercase, snake_case name of the company into `target_company.txt` at the root of the workspace. For example, if setting up for Google, write `google`.
   - This informs the `/add-new-story` workflow of the active target company.

4. **Summarize and Align**
   - Provide a clean markdown summary of the company's core values to the user in your chat.
   - Prompt the user to start mapping their experience to these values, recommending they use `/add-new-story` for adding tailored stories.
