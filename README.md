# Behavioral Interview Prep & Assistant App

This repository is a comprehensive, customizable preparation environment and interactive web application designed to help you ace behavioral interviews at major technology companies (e.g., Amazon, Google, Netflix, Meta). 

It features an AI-assisted workflow to research target company core values, help draft your behavioral stories in the high-impact **STAR-L** format, and search your stories instantaneously using a local search assistant web app.

---

## Key Features

1. **Local Search Assistant App:** A sleek React web application running locally on your laptop, utilizing `fuse.js` fuzzy search. Type any keyword or question during your interview to immediately pull up the matching story.
2. **AI Agent Workflows:** Custom instruction workflows inside `/.agents/workflows/` that tell any AI agent opening this workspace how to research company values and help you write stories.
3. **Multi-Company Support:** Structure company values modularly inside `/company-values/`.
4. **Git Privacy Protection:** Root-level `.gitignore` rules prevent your personal resume PDF and stories (`experience/*.md`) from ever being committed to Git, allowing you to share the framework code safely on GitHub.

---

## Folder Structure

- `/company-values/`
  Contains directories for target companies (e.g., `/company-values/amazon/`). Each directory holds detailed documents outlining that company's leadership principles, core values, and corresponding interview questions.
  
- `/experience/`
  Your local database of behavioral stories. Markdown files (`.md`) placed here represent individual stories. A guide and template are provided at [story_template.md.example](file:///Users/georg/Antigravity%20apps/behavioral%20interview/experience/story_template.md.example). *(Note: Files in this directory are git-ignored to protect personal privacy).*

- `/interview-app/`
  The source code for the local React/Vite web application. It parses your Markdown stories and provides the search UI.

- `/.agents/workflows/`
  Workspace skills and workflows for AI coders:
  - `research-company-values.md` — Teaches the agent how to research any company's core values, save them, and update the target company config.
  - `add-new-story.md` — Teaches the agent how to parse raw experiences, draft them as STAR-L stories matching the target company's values, and ingest them into the web app.

- `target_company.txt`
  A simple configuration file at the root containing the name of the currently active target company (e.g., `amazon`, `google`).

---

## Getting Started

### 1. Installation

Clone this repository and install all dependencies (this will install dependencies for both the root and the web app automatically):

```bash
npm install
```

### 2. Research Company Values

Ask your AI coding agent to research a company's values, or do it manually. For example:
> *\"Research the core values of Google and set up my project for it.\"*

The agent will run the `/research-company-values` workflow, search the web, create the files under `/company-values/google/`, and update `target_company.txt`.

### 3. Add Your Stories

Add your stories manually in the `/experience/` folder following [story_template.md.example](file:///Users/georg/Antigravity%20apps/behavioral%20interview/experience/story_template.md.example), or ask the AI agent:
> *\"Add a new story about a time I handled a difficult stakeholder negotiation.\"*

The agent will run the `/add-new-story` workflow, structure the story matching the active target company values, and write it to `experience/`.

### 4. Run the Web Assistant

Start the local server from the root of the workspace:

```bash
npm run dev
```

This will automatically compile your experience stories into the app database and spin up the development server. Navigate to `http://localhost:5173` in your browser.
