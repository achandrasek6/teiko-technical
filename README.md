# Teiko Clinical Analytics Pipeline & Dashboard

This repository contains a full-stack data pipeline and interactive dashboard designed to analyze immune cell populations from clinical trial data for the drug candidate *miraclib*.

## Prerequisites

This project is built to run flawlessly in GitHub Codespaces or any standard Linux/Mac/Windows environment.
It requires **Python 3.8+** and **Node.js 18+**.
(Java is also required if the Nextflow pipeline is run locally, though it should be pre-installed in GitHub Codespaces).

## Setup & Execution

A `Makefile` is provided that acts as the universal entry point for all operations, strictly following the rubric requirements. **Please enter the following commands sequentially into the GitHub Codespaces terminal:**

1. **Setup Dependencies:**
   ```bash
   make setup
   ```
   This will install all Python dependencies (`pandas`, `scipy`, `matplotlib`, `seaborn`, `fastapi`, `uvicorn`), install all React frontend dependencies (`react`, `vite`, `plotly.js`), and download the Nextflow executable for pipeline orchestration.

2. **Run Data Pipeline:**
   ```bash
   make pipeline
   ```
   This triggers the Nextflow orchestration (`main.nf`), which sequentially executes the full analysis from start to finish without manual intervention:
   * **Part 1:** Runs `load_data.py` to initialize the SQLite database and ingest `cell-count.csv`.
   * **Part 2-4:** Runs `src/analysis/run_analysis.py` to perform relative frequency calculations, rigorous statistical significance testing (comparing responders vs non-responders), and complex subset SQL querying.
   * **Outputs:** The pipeline directly populates the `teiko.db` database for the interactive dashboard. Additionally, to strictly satisfy the requirement of generating output files, the pipeline exports all results as static files into the **`outputs/`** directory (including `.csv` tables and `.png` boxplots for each immune cell population).

3. **Launch Interactive Dashboard:**
   ```bash
   make dashboard
   ```
   This concurrently starts the FastAPI backend server on port 8000 and the Vite/React frontend server on port 5173. 
   **Dashboard Link:** Since this is running in GitHub Codespaces, typing `localhost:5173` directly into a browser will not work. Instead, wait for the **"Open in Browser" popout notification** in the bottom right corner of Codespaces, or navigate to the **"Ports"** tab in the bottom panel and **Ctrl + Left Click** (or Cmd + Click on Mac) the automatically forwarded address for port `5173`.

---

## Relational Database Schema & Scalability

To scale efficiently to hundreds of projects and thousands of samples, the wide-format CSV data was normalized into a highly robust relational SQLite schema:

* **`subjects`**: Contains patient-level metadata (subject_id, project_id, age, sex, condition, treatment, response).
* **`samples`**: Contains sample-level metadata (sample_id, subject_id, sample_type, time_from_treatment_start) establishing a one-to-many relationship with subjects.
* **`cell_counts`**: Stores the actual cytometry data in a *long format* (`sample_id`, `population`, `count`).
  
**Scalability Rationale:** 
A "long format" schema for `cell_counts` is exponentially more scalable than wide format (having a separate column for every cell type like `b_cell`, `cd8_t_cell`). If 50 new spectral flow cytometry markers are added tomorrow, or the project scales up to 10,000 samples across 100 projects, the schema structure **does not need to change at all**; new rows are simply appended. 

Furthermore, this relational design prevents massive data duplication. Patient demographics (like age and sex) are stored exactly once in the `subjects` table, rather than being redundantly repeated across every single sample and every single cell population measurement. This makes various types of complex analytics (e.g., grouping by project, joining subject response outcomes to specific longitudinal sample timepoints) highly efficient through standard SQL joins.

---

## Code Structure & Design Overview

A highly modular, "production-level" software architecture was chosen, utilizing a decoupled Backend and Frontend, rather than a single monolithic script. 

### Backend Pipeline (`src/`)
* **`load_data.py`**: Located precisely in the root directory. Handles robust database initialization and data ingestion.
* **`src/analysis/`**: Modularized Python scripts representing the data engineering and data science layers. 
  * `frequencies.py` handles the relative frequency math.
  * `stats_calc.py` handles the rigorous statistical testing algorithms. 
  * `subsets.py` handles the execution of complex SQL queries.
  * `generate_exports.py` handles writing the static files to the `outputs/` folder.
* **`src/api/main.py`**: A lightning-fast FastAPI server that provides clean REST endpoints to serve the SQLite data directly to the frontend. *(Note: Auto-generated interactive Swagger API documentation is available by navigating to the "Ports" tab in Codespaces, opening the forwarded link for port `8000`, and appending `/docs` to the URL).*

**Statistical Methodology Justification:**
Rather than hardcoding a simple T-test, the backend implements a robust, dynamic decision tree for every cell population independently. It tests for normality (Shapiro-Wilk) and equal variance (Levene's). Depending on the distribution of the actual data, it dynamically executes the most mathematically sound test: an **Independent T-Test**, a **Welch's T-Test**, an **Arcsine Square Root Transformed T-Test** (ideal for percentage data), or a non-parametric **Mann-Whitney U Test**. Because biological cell frequencies are often heavily skewed, this ensures scientific accuracy.

### Frontend Dashboard (`frontend/`)
* A modern React application built with TypeScript and Vite.
* Rather than using an out-of-the-box component library, **Vanilla CSS** and `framer-motion` were utilized to implement a highly customized, premium aesthetic featuring glassmorphism elements, subtle micro-animations, and a unified design system.
* **SEO & Accessibility Hooks:** Custom React hooks dynamically append the active dashboard tab to the browser's document title (e.g., "Data Overview | Teiko Clinical"), improving browser history navigation and adhering to accessibility best practices.
* **Contextual UX & Discoverability:** Strategic hovertips and informational tooltips were implemented throughout the UI to explain complex metrics, provide statistical context, and guide users through the interactive elements, ensuring the application is intuitive even for non-technical users.
* **Enterprise-Grade Datagrids:** AG-Grid was implemented to provide power-user functionality, including complex column filtering, multi-column sorting, and column resizing.
* **State Persistence:** Custom hooks were built to seamlessly sync grid layouts (like user-adjusted column widths) with the browser's `localStorage`, ensuring a persistent user experience across sessions.
* **Interactive EDA:** Dynamic Plotly.js visualizations allow scientists to interactively explore the data distributions (zooming, panning, and dropdown for precise statistical summaries) rather than just looking at static image exports.

This decoupled architecture was chosen because it mirrors how real enterprise clinical software is built. The backend python pipeline can crunch massive datasets and execute complex bio-statistics offline, while the React dashboard provides a frictionless, lightning-fast UI to explore the results interactively.

---

## Future Enhancements & Productionization

While this pipeline and dashboard were designed to be fully functional within a local development environment, migrating this to a true enterprise production environment would involve the following enhancements:

1. **Containerization & Cloud Deployment:** The local SQLite database would be migrated to a managed cloud relational database (e.g., Supabase for PostgreSQL). The FastAPI backend would be containerized via **Docker** and deployed to a serverless compute layer (e.g., AWS Fargate), while the React frontend would be deployed to a global edge CDN (e.g., AWS CloudFront).
2. **Security & Authentication:** Given the sensitive nature of clinical trial data, robust authentication middleware (e.g., OAuth 2.0 via Okta or Auth0) would be implemented to secure all API endpoints. Additionally, to ensure strict compliance with HIPAA data privacy regulations, column-level data-at-rest encryption (using AES-256 or Python's Fernet cryptography) would be applied to any Personally Identifiable Information (PII).
3. **Automated Testing (CI/CD):** A comprehensive suite of unit and integration tests (using `pytest` for the backend and `jest` for the frontend) would be integrated into a continuous integration pipeline (e.g., GitHub Actions) to guarantee analytical accuracy and catch regressions automatically on every pull request.
