from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, Float, JSON, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime
from typing import Optional

from core.database import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String, nullable=True)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    uploaded_files = relationship("UploadedFile", back_populates="user")
    analysis_results = relationship("AnalysisResult", back_populates="user")
    created_templates = relationship("AITemplate", back_populates="creator")

class UploadedFile(Base):
    __tablename__ = "uploaded_files"
    
    id = Column(Integer, primary_key=True, index=True)
    file_id = Column(String, unique=True, index=True, nullable=False)
    original_filename = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    file_type = Column(String, nullable=False)
    file_size = Column(Integer, nullable=False)
    sheets = Column(JSON, nullable=True)
    total_sheets = Column(Integer, default=1)
    columns = Column(JSON, nullable=True)
    shape = Column(JSON, nullable=True)
    data_types = Column(JSON, nullable=True)
    summary = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Foreign key
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Relationships
    user = relationship("User", back_populates="uploaded_files")
    analysis_results = relationship("AnalysisResult", back_populates="file")

class AnalysisResult(Base):
    __tablename__ = "analysis_results"
    
    id = Column(Integer, primary_key=True, index=True)
    analysis_id = Column(String, unique=True, index=True, nullable=False)
    user_query = Column(Text, nullable=False)
    success = Column(Boolean, default=False)
    
    # Classification data
    query_type = Column(String, nullable=True)
    classification_reasoning = Column(Text, nullable=True)
    user_intent = Column(Text, nullable=True)
    requires_data_filtering = Column(Boolean, default=False)
    classification_confidence = Column(Float, nullable=True)
    
    # Code analysis data
    query_understanding = Column(Text, nullable=True)
    approach = Column(Text, nullable=True)
    required_columns = Column(JSON, nullable=True)
    generated_code = Column(Text, nullable=True)
    expected_output = Column(Text, nullable=True)
    
    # Execution data
    execution_success = Column(Boolean, default=False)
    execution_output = Column(Text, nullable=True)
    visualization_created = Column(Boolean, default=False)
    file_paths = Column(JSON, nullable=True)
    
    # Final results data
    final_answer = Column(Text, nullable=True)
    summary = Column(Text, nullable=True)
    visualization_info = Column(JSON, nullable=True)
    
    # Visualization HTML content
    visualization_html = Column(Text, nullable=True)
    
    # Metadata
    retry_count = Column(Integer, default=0)
    processing_time = Column(Float, nullable=True)
    model_used = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)  # For visibility toggle
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)
    
    # Foreign keys
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    file_id = Column(Integer, ForeignKey("uploaded_files.id"), nullable=False)
    
    # Relationships
    user = relationship("User", back_populates="analysis_results")
    file = relationship("UploadedFile", back_populates="analysis_results")

class AITemplate(Base):
    __tablename__ = "ai_templates"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    prompt = Column(Text, nullable=False)
    category = Column(String, nullable=True)
    icon = Column(String, default="Brain")
    color_scheme = Column(String, default="from-blue-500 to-cyan-500")
    is_default = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    usage_count = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Foreign key - Use created_by to match existing table
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Relationships
    creator = relationship("User", back_populates="created_templates")
