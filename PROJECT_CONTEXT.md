# CivicConnect — Project Context & Implementation Progress

**Last Updated:** October 13, 2026  
**Active Git Branch:** `feature/backend-api`  
**Academic Context:** 5th-Semester Computer Science Engineering (MDC Project)  
**Primary Goal:** Defensible, working prototype of an AI-assisted Municipal Grievance Triage and Spatio-Temporal Duplicate Complaint Detection System for Jammu Municipal Corporation (75 Wards).

---

## 1. System Architecture Overview

The system follows a decoupled **Hybrid Architecture**:

```text
                           ┌─────────────────────────────┐
                           │    React Frontend (Vite)    │
                           │         (Port 5173)         │
                           └──────────────┬──────────────┘
                                          │ REST / JSON (JWT)
                                          ▼
                           ┌─────────────────────────────┐
                           │ Node.js + Express Gateway   │
                           │  backend/api/ (Port 5000)   │
                           └───────┬─────────────┬───────┘
           Geospatial Queries (2dsphere)   │             │ Internal HTTP
                                           ▼             ▼ (POST /triage)
                           ┌────────────────┐   ┌────────────────────────┐
                           │    MongoDB     │   │   FastAPI ML Service   │
                           │ (Mongoose ODM) │   │ backend/ml-service/    │
                           │                │   │      (Port 8000)       │
                           └────────────────┘   └────────────────────────┘
```

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Leaflet, Recharts. Fully built UI with citizen reporting wizard, ward heatmaps, and city administration dashboard.
- **Node.js Gateway (`backend/api`):** JavaScript (ES Modules), Express, Mongoose, JWT authentication, RBAC, Multer, request validation, complaint lifecycle management, and MongoDB 2dsphere indexing.
- **ML Service (`backend/ml-service`):** Python, FastAPI, Sentence Transformers (`all-MiniLM-L6-v2`), scikit-learn. Handles category classification and spatio-temporal duplicate retrieval.

---

## 2. Work Completed So Far

### A. Repository & Version Control Setup
- Branched off `main` into a dedicated feature branch: **`feature/backend-api`**.
- Cleaned up `.gitignore` to properly exclude `node_modules/`, Python virtual environments (`.venv/`, `__pycache__/`), and local secrets (`.env`).
- Removed obsolete single-file backend skeleton (`backend/app`).

### B. Node.js Gateway Scaffolding (`backend/api`)
- Initialized `package.json` with modern ES Modules (`"type": "module"`).
- Installed core dependencies:
  - `express`: REST server
  - `mongoose`: MongoDB ODM
  - `jsonwebtoken` & `bcryptjs`: Security & authentication
  - `cors`: Allowed origins for Vite dev server (`http://localhost:5173`)
  - `dotenv` & `morgan`: Configuration and HTTP logging
  - `nodemon`: Development auto-reload
- Created configuration and environment templates:
  - `.env` & `.env.example` (configured for ports, MongoDB URI, JWT secret, FastAPI service URL).
  - `src/config/db.js`: Mongoose connection handler with graceful error diagnostics.

### C. Backend Directory & File Structure Created
The complete skeleton has been laid out (ready for logic implementation):

```text
CivicConnect/
├── backend/
│   ├── api/                           # Node.js + Express REST API Gateway
│   │   ├── package.json
│   │   ├── .env
│   │   ├── .env.example
│   │   └── src/
│   │       ├── server.js              # Application entry point
│   │       ├── config/
│   │       │   └── db.js              # MongoDB connection
│   │       ├── models/
│   │       │   ├── User.js            # User schema (RBAC: CITIZEN, CITY_ADMIN, etc.)
│   │       │   ├── Ward.js            # 75 Jammu municipal wards schema
│   │       │   └── Grievance.js       # Complaint schema (GeoJSON 2dsphere index)
│   │       ├── middleware/
│   │       │   ├── auth.js            # JWT verification & optional auth
│   │       │   ├── rbac.js            # Role-based access control
│   │       │   └── errorHandler.js    # Global error handling middleware
│   │       ├── controllers/
│   │       │   ├── authController.js       # Login, register, me, logout stubs
│   │       │   ├── grievanceController.js  # CRUD, duplicate check, support stubs
│   │       │   ├── wardController.js       # Ward list & details stubs
│   │       │   └── analyticsController.js  # Overview statistics stubs
│   │       ├── routes/
│   │       │   ├── authRoutes.js           # /api/auth routes
│   │       │   ├── grievanceRoutes.js      # /api/complaints routes
│   │       │   ├── wardRoutes.js           # /api/wards routes
│   │       │   └── analyticsRoutes.js      # /api/analytics routes
│   │       ├── services/
│   │       │   └── fastapiClient.js   # HTTP client calling FastAPI ML endpoints
│   │       └── seeds/
│   │           └── seedData.js        # Seed script for 75 wards & demo admin
│   │
│   └── ml-service/                    # Python + FastAPI ML Pipeline
│       ├── requirements.txt           # fastapi, uvicorn, sentence-transformers, scikit-learn, etc.
│       ├── .env.example
│       ├── data/                      # Dataset CSVs and benchmarks (.gitkeep)
│       ├── models/                    # Saved .joblib model artifacts (.gitkeep)
│       ├── scripts/
│       │   ├── generate_datasets.py   # Multi-persona synthetic data generator
│       │   ├── train_classifier.py    # Baseline vs Proposed model trainer & evaluator
│       │   └── evaluate_retrieval.py  # Precision@K, Recall@K, threshold curve evaluator
│       └── app/
│           ├── main.py                # FastAPI entry point
│           ├── config.py              # ML service configuration
│           ├── routers/
│           │   ├── triage.py          # /api/v1/triage/classify endpoint
│           │   └── duplicates.py      # /api/v1/triage/duplicates endpoint
│           └── services/
│               ├── classifier.py      # Category inference engine
│               └── retriever.py       # Embedding vector search & spatio-temporal scorer
│
├── frontend/                          # Existing React 18 + Vite Frontend
└── PROJECT_CONTEXT.md                 # This document
```

---

## 3. Data Models & Schemas Defined

1. **`User` (`src/models/User.js`):**
   - Fields: `name`, `email` (unique), `phone`, `password` (bcrypt hashed), `role` (`CITIZEN`, `CITY_ADMIN`, `MUNICIPAL_OFFICER`, `FIELD_ENGINEER`), `wardAssigned`, `department`.
   - Security: Password field excluded (`select: false`), `.comparePassword()` helper, safe `.toJSON()`.

2. **`Ward` (`src/models/Ward.js`):**
   - Fields: `id` (1–75), `number`, `name`, `zone` (`South Jammu`, `North Jammu`, `Old City`, `Bahu`), `councillor`, `contactNumber`, `centerCoordinates` (`latitude`, `longitude`), `approxRadiusMeters`.

3. **`Grievance` (`src/models/Grievance.js`):**
   - Identification: `trackingNumber` (e.g. `JMC-2026-1042`).
   - Core Data: `title`, `description`, `category` (6 categories + `OTHER`), `status` (`REPORTED`, `AI_TRIAGED`, `IN_PROGRESS`, `RESOLVED`, `REJECTED`, `SUPPORTED_EXISTING`), `priority` (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`).
   - Geospatial: `locationPoint` formatted as GeoJSON `Point` (`[longitude, latitude]`) with `2dsphere` index for fast spatial radius queries.
   - Compatibility: Transform virtual converting `locationPoint` to `{ latitude, longitude }` matching frontend expectations.
   - Intelligence: `aiTriageMetadata` (`confidence`, `detectedCategory`, `severityScore`, `potentialDuplicateIds`, `duplicateEvidence`).
   - Audit Trail: `timeline` (lifecycle progression with actors and notes) and `resolutionEvidence` (officer notes, photo, timestamp).

---

## 4. Key Gaps Identified & Academic Solutions

1. **Gap:** The frontend duplicate check previously sent only coordinates and category, omitting the complaint text.
   - **Fix:** Update duplicate check to accept `text` (`title + description`) + `location` + `category` so semantic similarity is evaluated alongside spatial and temporal distance.
2. **Gap:** The admin UI lacked a review panel to verify/confirm duplicate candidates.
   - **Fix:** Add an **AI Triage & Duplicate Candidate Review** card to the admin detail modal, allowing municipal officers to confirm or reject duplicate merges (Human-in-the-Loop).
3. **Gap:** No public Jammu grievance dataset exists with verified duplicate ground truth.
   - **Fix:** Document a transparent **Controlled Multi-Persona Dataset Methodology** with an explicit sub-issue taxonomy and a dedicated pairwise duplicate evaluation benchmark (true duplicates vs hard spatial negatives).

---

## 5. Upcoming Implementation Order

1. **Phase 1 (Node.js API):** Implement route handlers and controllers:
   - Wire MongoDB connection in `server.js`.
   - Auth endpoints (`/api/auth/login`, `/api/auth/me`).
   - Ward listing endpoint (`/api/wards`) and seed script with 75 Jammu wards.
   - Grievance endpoints (`/api/complaints`, `/api/complaints/:id`, `/api/complaints/:id/status`, `/api/complaints/:id/support`).
2. **Phase 2 (ML Pipeline):**
   - Run `generate_datasets.py` to create classification and duplicate benchmark datasets.
   - Train and evaluate Baseline (TF-IDF + Logistic Regression) vs Proposed (Sentence Transformers + Logistic Regression).
   - Evaluate duplicate retrieval and select the optimal similarity threshold.
3. **Phase 3 (FastAPI Service):**
   - Implement `/api/v1/triage/classify` and `/api/v1/triage/duplicates` in FastAPI.
   - Wire `backend/api/src/services/fastapiClient.js` to call FastAPI during grievance creation.
4. **Phase 4 (Frontend Connection):**
   - Point `frontend/.env` to `http://localhost:5000` (`VITE_USE_MOCK_DATA=false`).
   - Verify citizen report submission, duplicate warnings, and admin triage end-to-end.
