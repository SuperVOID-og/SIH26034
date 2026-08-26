from sqlalchemy import Column, Integer, String, DateTime, JSON, Enum as SQLEnum
from sqlalchemy.sql import func
from app.core.database import Base
from app.schemas.inspection import InspectionStatus

class Inspection(Base):
    __tablename__ = "inspections"

    id = Column(Integer, primary_key=True, index=True)
    status = Column(SQLEnum(InspectionStatus), default=InspectionStatus.CREATED)
    product_category = Column(String, nullable=True)
    package_context = Column(String, nullable=True) # e.g., 'retail', 'wholesale'
    
    # Store the paths to local images
    image_paths = Column(JSON, default=list)
    
    # Extracted data (raw from AI and then optionally corrected by Human)
    extracted_data = Column(JSON, nullable=True)
    
    # Compliance Engine Results
    compliance_score = Column(Integer, nullable=True)
    violations = Column(JSON, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
