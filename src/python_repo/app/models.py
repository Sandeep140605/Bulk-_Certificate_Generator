"""
SQLAlchemy relational models for Jobs and Recipient Certificates.
"""
from datetime import datetime
import enum
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Enum, Text
from sqlalchemy.orm import relationship
from .database import Base


class JobStatusEnum(str, enum.Enum):
    QUEUED = "queued"
    PROCESSING = "processing"
    COMPLETED = "completed"
    PARTIAL_FAILURE = "partial_failure"
    FAILED = "failed"


class CertificateStatusEnum(str, enum.Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class Job(Base):
    __tablename__ = "jobs"

    id = Column(String(64), primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    issuer = Column(String(255), nullable=False)
    issuer_title = Column(String(255), default="Authorized Official")
    issue_date = Column(String(32), nullable=False)
    template_theme = Column(String(32), default="gold")
    status = Column(Enum(JobStatusEnum), default=JobStatusEnum.QUEUED, index=True)
    
    total_count = Column(Integer, default=0)
    completed_count = Column(Integer, default=0)
    failed_count = Column(Integer, default=0)
    pending_count = Column(Integer, default=0)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    # Relationships
    certificates = relationship(
        "RecipientCertificate",
        back_populates="job",
        cascade="all, delete-orphan",
        order_by="RecipientCertificate.id"
    )


class RecipientCertificate(Base):
    __tablename__ = "recipient_certificates"

    id = Column(String(64), primary_key=True, index=True)
    job_id = Column(String(64), ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False, index=True)
    
    recipient_name = Column(String(255), nullable=False)
    recipient_email = Column(String(255), nullable=False)
    status = Column(Enum(CertificateStatusEnum), default=CertificateStatusEnum.PENDING, index=True)
    error_message = Column(Text, nullable=True)
    
    verification_code = Column(String(32), unique=True, index=True)
    sha256_hash = Column(String(64), index=True)
    file_path = Column(String(512), nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    # Reverse relationship
    job = relationship("Job", back_populates="certificates")
