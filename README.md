# CivicConnect&#x20;

**A civic issue reporting and management platform for Jammu, Jammu & Kashmir, India.**

CivicConnect aims to make it easier for citizens to report municipal problems, identify potentially duplicate complaints, and help civic authorities manage and resolve local issues efficiently.

The platform focuses on location-aware grievance reporting, interactive maps, structured complaint management, and administrative dashboards.

## 📌 Table of Contents

- [Overview](#-overview)
- [Problem Statement](#-problem-statement)
- [Features](#-features)
- [Technology Stack](#-technology-stack)
- [Architecture](#-architecture)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Environment Configuration](#-environment-configuration)
- [Running the Application](#-running-the-application)
- [Backend and Database](#-backend-and-database)
- [Development Workflow](#-development-workflow)
- [Current Status](#-current-status)
- [Future Enhancements](#-future-enhancements)
- [Contributing](#-contributing)
- [License](#-license)

## 🌐 Overview

CivicConnect is designed to connect citizens with municipal authorities through a centralized civic grievance management system.

Citizens can report problems such as potholes, damaged roads, broken streetlights, garbage accumulation, and drainage issues. Reports can include descriptions, photographs, and geographic coordinates to help authorities identify the location of each problem.

The platform also aims to identify potentially duplicate reports so citizens can support an existing complaint rather than creating unnecessary duplicates.

## 🎯 Problem Statement

Municipal authorities often face challenges when collecting, organizing, and resolving civic complaints. Traditional reporting processes can be cumbersome, while multiple citizens may report the same issue independently.

Without accurate location information and duplicate detection, authorities may struggle to prioritize complaints, identify recurring problems, and allocate resources efficiently.

CivicConnect aims to address these challenges through an accessible reporting interface, geospatial complaint management, and a centralized administrative dashboard.

## ✨ Features

### Citizen Interface

- Civic issue reporting workflow.
- Complaint descriptions and image attachment support in the interface.
- Interactive map for selecting issue locations.
- Location selection and coordinate handling.
- GPS-based location assistance and manual map selection.
- Potential duplicate complaint alerts.
- Citizen dashboard for viewing relevant complaint information.
- Citizen authentication interface.

### Administrative Interface

- Centralized City Admin console.
- Complaint management and status monitoring.
- Complaint filtering and search workflows.
- Ward-based filtering and map views.
- Dashboard statistics and analytics visualizations.
- Activity and administrative settings pages.
- Complaint detail views and status indicators.

### Location and Mapping

- Interactive map powered by Leaflet.
- Location marker selection and adjustment.
- Geographic coordinate handling.
- Jammu ward data for location-related workflows.
- Reverse-geocoding support where configured.

### Development and Testing

- Mock users and grievance records for frontend development.
- Mock authentication support for interface testing.
- Reusable UI components and shared layouts.
- Centralized frontend API and service modules.

**Note:** Some interfaces currently use mock data. The availability of a frontend screen does not necessarily mean its functionality is connected to a persistent backend yet.

## 🛠️ Technology Stack

| Layer               | Technologies            |
| ------------------- | ----------------------- |
| Frontend            | React, TypeScript, Vite |
| Styling             | Tailwind CSS            |
| Routing             | React Router            |
| Icons               | Lucide React            |
| Maps                | Leaflet, React Leaflet  |
| Charts              | Recharts                |
| Backend             | Python, FastAPI         |
| Database plan       | PostgreSQL with PostGIS |
| ORM plan            | SQLAlchemy              |
| Migrations plan     | Alembic                 |
| Authentication plan | JWT                     |
| Version control     | Git and GitHub          |

The database, authentication, and backend components are being developed separately from the frontend. Planned technologies may change as implementation progresses.

## 🏗️ Architecture

The intended high-level architecture is:

```text
                    CivicConnect
                         |
              +----------+----------+
              |                     |
        React Frontend         FastAPI Backend
        TypeScript + Vite       Python REST API
              |                     |
              |               +-----+------+
              |               |            |
              |           Authentication  Grievance
              |               Services     Services
              |                            |
              |                      SQLAlchemy ORM
              |                            |
              |                    PostgreSQL + PostGIS
              |
       Interactive Map
       Citizen Interface
       Admin Dashboard
```

During frontend development, mock services and local demonstration data can be used without requiring a fully integrated backend.

## 📂 Project Structure

The main repository structure is organized as follows:

```text
CivicConnect/
├── backend/
│   └── app/
│       ├── config.py
│       ├── database.py
│       └── ...                 # Other backend modules
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/
│   │   │   ├── grievance/
│   │   │   ├── layout/
│   │   │   └── map/
│   │   ├── context/
│   │   ├── data/
│   │   ├── pages/
│   │   │   ├── admin/
│   │   │   └── citizen/
│   │   ├── services/
│   │   ├── types/
│   │   ├── App.tsx
│   │   ├── index.css
│   │   └── main.tsx
│   ├── .env.example
│   ├── index.html
│   ├── package.json
│   ├── package-lock.json
│   ├── vite.config.ts
│   └── ...
│
├── .gitignore
└── README.md
```

### Important frontend directories

| Directory               | Responsibility                                                     |
| ----------------------- | ------------------------------------------------------------------ |
| `components/common/`    | Reusable buttons, cards, badges, modals, and shared UI elements    |
| `components/grievance/` | Complaint cards, details, duplicate alerts, and location selection |
| `components/map/`       | Interactive map components                                         |
| `components/layout/`    | Shared citizen and admin layouts                                   |
| `context/`              | Shared authentication state                                        |
| `data/`                 | Jammu ward information and mock development data                   |
| `pages/`                | Main application pages                                             |
| `pages/admin/`          | Administrative dashboard and management pages                      |
| `pages/citizen/`        | Citizen-facing dashboard pages                                     |
| `services/`             | API client, authentication, geocoding, and grievance services      |
| `types/`                | Shared TypeScript data types                                       |

## 🚀 Getting Started

Follow these steps to download and run CivicConnect on your own computer.

### Prerequisites

Install the following:

- **Git** — to clone the repository.
- **Node.js and npm** — to install and run the frontend.
- **Python** — required for backend development.
- A code editor such as Visual Studio Code.

Use a Node.js version compatible with the Vite project. Node.js 18+ is a reasonable starting point for this setup.

Check your installations:

```bash
git --version
node --version
npm --version
python --version
```

On some systems, use `python3 --version` instead of `python --version`.

### 1. Clone the repository

Open a terminal and run:

```bash
git clone https://github.com/shivam6714/CivicConnect.git
cd CivicConnect
```

This downloads the repository and enters the project directory.

### 2. Open the project

If Visual Studio Code is installed:

```bash
code .
```

Alternatively, open the `CivicConnect` folder manually in your editor.

### 3. Install frontend dependencies

Navigate to the frontend directory:

```bash
cd frontend
npm install
```

This installs the packages listed in `package.json`.

### 4. Configure frontend environment variables

Create a local `.env` file from the example.

**Windows PowerShell:**

```powershell
Copy-Item .env.example .env
```

**macOS/Linux:**

```bash
cp .env.example .env
```

The example configuration enables mock data, allowing the frontend to be explored during development without a fully integrated backend.

### 5. Start the frontend

From inside the `frontend` directory:

```bash
npm run dev
```

Vite will display a local development URL in the terminal. Open that URL in your browser, typically:

```text
http://localhost:5173
```

Keep the terminal running while using the application.

## ⚙️ Environment Configuration

The frontend example file is located at `frontend/.env.example`.

```dotenv
# FastAPI backend base URL
VITE_API_BASE_URL=http://localhost:8000

# Enable mock data during frontend development
VITE_USE_MOCK_DATA=true

# Default map center
VITE_DEFAULT_MAP_LAT=32.7266
VITE_DEFAULT_MAP_LNG=74.8570
VITE_DEFAULT_MAP_ZOOM=13
```

| Variable                | Description                                |
| ----------------------- | ------------------------------------------ |
| `VITE_API_BASE_URL`     | Base URL intended for backend API requests |
| `VITE_USE_MOCK_DATA`    | Enables the configured mock-data mode      |
| `VITE_DEFAULT_MAP_LAT`  | Default map latitude                       |
| `VITE_DEFAULT_MAP_LNG`  | Default map longitude                      |
| `VITE_DEFAULT_MAP_ZOOM` | Default map zoom level                     |

Vite exposes variables prefixed with `VITE_` to frontend code. **Never put passwords, private API keys, database credentials, or other secrets in these variables.**

After changing environment variables, restart the Vite development server.

## ▶️ Running the Application

### Frontend development

```bash
cd frontend
npm install
npm run dev
```

### Production build

To compile TypeScript and generate an optimized frontend build:

```bash
cd frontend
npm run build
```

The generated production files are placed in `frontend/dist/`.

### Preview the production build

After creating the build:

```bash
npm run preview
```

Vite will print the preview URL in the terminal.

## 🐍 Backend and Database

The backend is being developed separately using FastAPI and Python. PostgreSQL with PostGIS is the planned database layer for storing and querying geographic complaint data.

The repository's backend implementation and dependencies may evolve. Before starting the backend, inspect the files under `backend/app/` and follow the dependency and application-entry-point instructions provided by the current backend implementation.

The intended local backend address is:

```text
http://localhost:8000
```

FastAPI normally provides interactive API documentation at:

```text
http://localhost:8000/docs
```

These URLs are useful once the backend server is configured and running. They do not imply that all endpoints or database operations are already implemented.

### Database setup

The planned database setup includes:

- PostgreSQL installation and configuration.
- PostGIS extension for geographic operations.
- Database connection configuration.
- Schema creation and migrations.
- Spatial queries for finding nearby complaints.

Use the database name, credentials, migration commands, and environment variables specified by the current backend configuration. Do not commit your local database credentials or `.env` files.

## 🧪 Development Workflow

When working on the project:

1. Create a feature branch for your changes.
2. Install dependencies for the part of the application you're modifying.
3. Make changes and test them locally.
4. Run the frontend production build before submitting frontend changes.
5. Review your Git diff and ensure no secrets or generated files are included.
6. Commit your work with a descriptive message.
7. Push your branch and open a Pull Request.

Example:

```bash
git switch -c feature/my-change
git status
git add <files-you-intend-to-commit>
git diff --cached
git commit -m "feat: describe the change"
git push -u origin feature/my-change
```

Replace `feature/my-change` and the commit message with values appropriate for your work.

### Useful frontend commands

| Command           | Purpose                           |
| ----------------- | --------------------------------- |
| `npm install`     | Install dependencies              |
| `npm run dev`     | Start the development server      |
| `npm run build`   | Type-check and build the frontend |
| `npm run preview` | Preview the production build      |

## 📍 Current Status

CivicConnect is under active development.

The frontend includes citizen-facing workflows, a centralized administrative interface, grievance-related components, interactive mapping, and reusable UI services.

Mock data is retained to support development and testing while backend integration progresses.

The broader project roadmap includes persistent grievance storage, authentication, geospatial duplicate detection, and integration between the frontend and backend.

## 🔮 Future Enhancements

Planned areas for continued development include:

- Complete integration with the FastAPI backend.
- PostgreSQL and PostGIS-backed grievance persistence.
- Secure authentication and authorization.
- Improved duplicate complaint detection using location and issue information.
- Citizen support for existing reports.
- Image-assisted duplicate verification.
- Real-time complaint status updates and notifications.
- Improved accessibility and responsive design.
- Performance optimization and production deployment.
- Automated testing and continuous integration.

These items represent development goals and should not be interpreted as already completed features.

## 🤝 Contributing

Contributions and suggestions are welcome.

To propose a change:

1. Fork the repository or create a feature branch if you have collaborator access.
2. Implement the change.
3. Test your changes locally.
4. Open a Pull Request with a clear summary and testing notes.

Please keep commits focused and avoid including generated build folders, installed dependencies, local environment files, or secrets.

---

**Built to make civic issue reporting and management more accessible, transparent, and location-aware.**
