ComplyVerse – Autonomous Compliance Intelligence Platform
Live Demo

Deployment: https://complyverse-final-production.up.railway.app/

Overview

ComplyVerse is an AI-powered enterprise compliance intelligence platform that helps organizations analyze regulatory documents, identify compliance risks, and generate actionable insights through an interactive dashboard.

The platform streamlines compliance workflows by enabling users to upload regulatory documents, perform AI-driven analysis, detect potential risks, and explore compliance information in an intuitive interface.

Key Features
AI-powered compliance document analysis
Upload and analyze enterprise documents
Automated compliance risk identification
Regulatory knowledge graph visualization
Explainable compliance insights
Compliance dashboard with analytics
AI-powered compliance assistant
Policy and regulation exploration
Multi-document support
Real-time analysis workflow
Supported File Formats
PDF
DOCX
TXT
CSV
Technology Stack
Frontend
React
TypeScript
Vite
Tailwind CSS
Backend
Node.js
Express
TypeScript
AI
Google Gemini API
Deployment
Railway
Installation

Clone the repository.

git clone <repository-url>
cd complyverse

Install dependencies.

npm install
Environment Variables

Create a .env file.

GEMINI_API_KEY=YOUR_GEMINI_API_KEY
APP_URL=http://localhost:3000
Run Locally

Start the development server.

npm run dev

Open your browser and navigate to:

http://localhost:3000
Build for Production
npm run build

Run the production server.

npm start
Usage
Launch the application.
Upload one or more compliance documents.
Start AI-powered analysis.
Review identified compliance risks and insights.
Explore the generated knowledge graph.
Use the AI assistant for compliance-related queries.
Download or review the generated compliance results.
Project Structure
complyverse/
├── assets/
├── src/
├── package.json
├── server.ts
├── tsconfig.json
├── vite.config.ts
├── .env
└── README.md
Future Enhancements
OCR support for scanned documents
Additional regulatory framework integrations
Real-time compliance monitoring
Collaboration and team workspaces
Advanced analytics and reporting
API integrations with enterprise systems
Deployment

Live Application

https://complyverse-final-production.up.railway.app/

License

This project is intended for educational, research, and demonstration purposes.
