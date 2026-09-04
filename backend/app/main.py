import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.api import inspections, dashboard
from app.core.database import Base, engine
from app.core.config import settings
import os
import mimetypes

from fastapi import HTTPException, Response
from supabase import create_client

# Create database tables for development only
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="PackSure AI API",
    description="API for the AI-assisted packaged commodity compliance inspector",
    version="0.1.0",
)
supabase = create_client(
    os.environ["SUPABASE_URL"],
    os.environ["SUPABASE_SECRET_KEY"]
)

STORAGE_BUCKET = os.environ.get(
    "SUPABASE_STORAGE_BUCKET",
    "packsure-evidence"
)
@app.get("/media/{file_path:path}")
def get_media(file_path: str):
    # Only allow inspection evidence paths
    if not file_path.startswith("inspections/"):
        raise HTTPException(
            status_code=400,
            detail="Invalid media path"
        )

    if ".." in file_path.split("/"):
        raise HTTPException(
            status_code=400,
            detail="Invalid media path"
        )

    try:
        file_bytes = (
            supabase.storage
            .from_(STORAGE_BUCKET)
            .download(file_path)
        )

        media_type, _ = mimetypes.guess_type(file_path)

        # Explicit fallback for WebP
        if file_path.lower().endswith(".webp"):
            media_type = "image/webp"

        return Response(
            content=file_bytes,
            media_type=media_type or "application/octet-stream",
            headers={
                "Cache-Control": "private, max-age=3600"
            }
        )

    except Exception as e:
        raise HTTPException(
            status_code=404,
            detail=f"Media not found: {str(e)}"
        )

# Configure CORS
allowed_origins = [
    origin.strip().rstrip("/")
    for origin in settings.CORS_ORIGINS.split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(dashboard.router, prefix="/api/dashboard", tags=["dashboard"])
app.include_router(inspections.router, prefix="/api/inspections", tags=["inspections"])

# Mount local_storage as /media — serves uploaded inspection images safely.
# ONLY the configured LOCAL_STORAGE_DIR root is exposed, never the full filesystem.
os.makedirs(settings.LOCAL_STORAGE_DIR, exist_ok=True)
# app.mount("/media", StaticFiles(directory=settings.LOCAL_STORAGE_DIR), name="media")

@app.get("/health")
def health_check():
    return {"status": "ok"}
