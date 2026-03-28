# ConnectDot - File Upload + Metadata Manager

A full-stack web application for uploading files with metadata, powered by:

- **Frontend**: React 19 (Vite)
- **Backend**: Node.js + Express
- **Database**: PostgreSQL
- **File Storage**: MinIO (S3-compatible)
- **Reverse Proxy**: Nginx
- **Containerization**: Docker + Docker Compose

## Features

- Upload files with title and description
- List all uploaded files
- Download files
- Responsive, modern UI
- Production-ready Docker setup

## Quick Start

1. **Clone & Setup**
   ```bash
   git clone <repo>
   cd ConnectDot
   cp .env.example .env
   # Edit .env if needed (defaults work)
   ```

2. **Run with Docker**
   ```bash
   docker compose up -d --build
   ```

3. **Access the App**
   - Web UI: http://localhost
   - Backend API: http://localhost/api/health
   - MinIO Console: http://localhost:9001 (minioadmin/minioadmin)

## Architecture

```
Nginx (port 80)
├── Frontend (React)
├── /api/* → Backend (5000)
└── /storage/* → MinIO (9000)
```

**Services**:
- `postgres`: PostgreSQL 16 (connectdot DB)
- `minio`: Object storage
- `backend`: Node.js API
- `frontend`: React build served by Nginx
- `nginx`: Reverse proxy

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| POST | `/api/upload-file` | Upload file (multipart/form-data, field: `file`) |
| GET | `/api/get-file/:filePath` | Download file |
| POST | `/api/metadata` | Save `{title, description, filePath}` |
| GET | `/api/metadata` | List all metadata |

## Development

### Backend
```bash
cd backend
npm run dev  # nodemon
```

### Frontend
```bash
cd frontend
npm run dev  # http://localhost:5173
```

## Volumes & Persistence

- `postgres_data`: DB data
- `minio_data`: File storage

## Troubleshooting

- **DB not ready**: Check `docker compose logs postgres`
- **MinIO bucket**: Auto-created
- **Uploads dir**: Created in backend container
- **CORS issues**: Handled by backend middleware

## Tech Stack Details

- Backend: Express 5, Multer, PG, MinIO SDK
- Frontend: React 19, Axios, CSS Grid
- No external auth/CDN needed

Enjoy your file manager! 🚀
