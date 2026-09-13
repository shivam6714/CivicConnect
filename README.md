# CivicConnect

## Overview
CivicConnect is a civic issue reporting platform initially designed for Jammu, Jammu & Kashmir, India. The platform enables citizens to report local municipal problems—such as potholes, damaged roads, broken street lights, garbage accumulation, and drainage issues—directly to civic authorities. By combining geospatial mapping and structured complaint logging, CivicConnect aims to streamline issue reporting, prevent duplicate grievance submissions, and improve civic engagement.

## Problem Statement
In urban and developing areas like Jammu, municipal authorities often face challenges in tracking and resolving local infrastructure issues efficiently. Citizens frequently struggle with reporting civic problems through cumbersome manual procedures, or multiple citizens submit separate complaints for the exact same issue at the same spot. Conversely, existing complaint systems often lack spatial awareness, mistakenly merging different problems in the same vicinity or failing to detect identical issues nearby. This leads to administrative redundancy, slower resolution times, and citizen frustration.

## Objectives
- Provide a simple and accessible web interface for citizens in Jammu to report civic issues with photographic proof and precise location coordinates.
- Store and query civic complaints geospatially using spatial database indexing.
- Identify potential duplicate complaints in the vicinity of a reported location.
- Enable citizens to support existing complaints rather than submitting redundant reports.
- Distinguish between different types of issues occurring in close proximity to prevent false duplicate flagging.
- Provide a clean, scalable architecture suitable for future extensions such as automated image analysis and municipal workflow integration.

## Core Features
- **Photo Upload**: Citizens can attach an image capturing the civic problem.
- **Interactive Map Location Selection**: Precise pinpointing of issue coordinates using an interactive map interface.
- **Detailed Complaint Submission**: Capturing issue descriptions and relevant metadata.
- **Geospatial Storage**: Storing complaints along with latitude and longitude data for spatial queries.
- **Nearby Complaint Search**: Automatic spatial querying of existing complaints within a configurable radius of the reported location.
- **Complaint Support Option**: Ability for users to upvote or support an existing nearby complaint rather than filing a new one.
- **Fine-Grained Issue Separation**: Allowing multiple distinct complaints at or near the same location (e.g., a pothole and a broken street light 10–20 meters apart).

## Initial User Flow
1. A citizen accesses the platform and uploads an image showing the civic issue.
2. The citizen selects the exact location of the problem on an interactive map.
3. The citizen enters a description and submits the complaint information.
4. The backend receives and persists the complaint along with its geographic coordinates.
5. The system performs a geospatial query to identify existing open complaints near the reported location.
6. Identified nearby complaints are presented to the user as potential duplicates for review.
7. If an existing complaint matches the issue, the citizen can choose to support the existing report instead of creating a duplicate.
8. If the issue is distinct, the complaint is recorded as a new, independent report.

## Duplicate Complaint Detection Concept
CivicConnect approaches duplicate complaint management through a multi-stage validation model:

1. **Spatial Proximity Detection**: When a new complaint is submitted, the backend uses PostGIS queries to search for existing complaints within a defined geographic radius.
2. **Potential Duplicate Flagging**: Nearby complaints are flagged as potential duplicates rather than automatically merged. This ensures that different problems occurring at the same location (e.g., a pothole next to a malfunctioning street light) are preserved as distinct issues.
3. **Citizen Verification & Support**: The submitting citizen is presented with existing nearby reports and given the option to support an active report if it represents the same real-world issue.
4. **Planned AI / Image Analysis**: In future development phases, AI-powered image analysis will be introduced to compare uploaded images against nearby complaints to assist in verifying whether the reports depict the same physical problem.

## Planned Technology Stack

- **Frontend**: React + TypeScript
- **Backend**: FastAPI + Python
- **Database**: PostgreSQL
- **Geographic Queries**: PostGIS
- **ORM**: SQLAlchemy
- **Database Migrations**: Alembic
- **Authentication**: JWT (JSON Web Tokens)
- **AI / Image Analysis**: To be decided during development
- **Containerization**: Docker

## High-Level Architecture

```
+-------------------------------------------------------------+
|                         Frontend                            |
|             (React + TypeScript + Interactive Map)          |
+------------------------------+------------------------------+
                               |
                               | REST API (JSON / Multipart)
                               v
+-------------------------------------------------------------+
|                          Backend                            |
|                     (FastAPI + Python)                      |
|                                                             |
|   +---------------------+         +---------------------+   |
|   |  Auth & Complaint   |         | Geospatial Proximity|   |
|   |      Services       |         |   & Match Logic     |   |
|   +---------------------+         +---------------------+   |
+------------------------------+------------------------------+
                               |
                               | SQLAlchemy ORM
                               v
+-------------------------------------------------------------+
|                         Database                            |
|                  (PostgreSQL + PostGIS)                     |
|                                                             |
|   +---------------------+         +---------------------+   |
|   |  Spatial Tables     |         |  Spatial Indexing   |   |
|   |   (Geometry/Points) |         |     (GIST Index)    |   |
|   +---------------------+         +---------------------+   |
+-------------------------------------------------------------+
```

## Project Status
The project is currently in the initial design and specification phase. The core architecture, data models, and geospatial workflows are being established. AI-based duplicate image analysis is planned for subsequent iterations.
