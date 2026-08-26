from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import inspections
from app.core.database import Base, engine

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

@app.get("/health")
def health_check():
    return {"status": "ok"}
