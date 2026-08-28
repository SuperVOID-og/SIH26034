import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.api import inspections
from app.core.database import Base, engine
from app.core.config import settings

# Create database tables for development only
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="PackSure AI API",
    description="API for the AI-assisted packaged commodity compliance inspector",
    version="0.1.0",
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For hackathon/development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(inspections.router, prefix="/api/inspections", tags=["inspections"])

# Mount local_storage as /media — serves uploaded inspection images safely.
# ONLY the configured LOCAL_STORAGE_DIR root is exposed, never the full filesystem.
os.makedirs(settings.LOCAL_STORAGE_DIR, exist_ok=True)
app.mount("/media", StaticFiles(directory=settings.LOCAL_STORAGE_DIR), name="media")

@app.get("/health")
def health_check():
    return {"status": "ok"}
