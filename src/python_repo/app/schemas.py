"""
Pydantic schemas for request validation and response serialization.
"""
from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, EmailStr, field_validator


class RecipientInput(BaseModel):
    name: str = Field(..., min_length=1, max_length=255, description="Full name of recipient")
    email: str = Field(..., description="Valid recipient email address")
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict)

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        clean = v.strip()
        if not clean:
            raise ValueError("Recipient name cannot be blank or whitespace.")
        return clean

    @field_validator("email")
    @classmethod
    def validate_email_syntax(cls, v: str) -> str:
        clean = v.strip()
        if "@" not in clean or "." not in clean.split("@")[-1]:
            raise ValueError(f"Invalid email address syntax: '{clean}'")
        return clean.lower()


class BulkJobCreateRequest(BaseModel):
    title: str = Field(..., min_length=2, max_length=255, description="Event or Course Title")
    issuer: str = Field(..., min_length=2, max_length=255, description="Issuing Institution")
    issuer_title: Optional[str] = Field("Authorized Representative", max_length=128)
    issue_date: str = Field(..., description="Date of issuance (YYYY-MM-DD)")
    template_theme: Optional[str] = Field("gold", description="Template accent theme: gold, sapphire, emerald, ruby")
    recipients: List[RecipientInput] = Field(..., min_length=1, description="List of recipient records")


class JobCreationResponse(BaseModel):
    job_id: str
    status: str
    message: str
    total_recipients: int
    created_at: datetime
    links: Dict[str, str]


class CertificateDetailResponse(BaseModel):
    id: str
    job_id: str
    recipient_name: str
    recipient_email: str
    status: str
    error_message: Optional[str] = None
    verification_code: str
    sha256_hash: str
    certificate_url: Optional[str] = None
    created_at: datetime
    completed_at: Optional[datetime] = None


class JobStatusResponse(BaseModel):
    id: str
    title: str
    issuer: str
    issuer_title: str
    issue_date: str
    template_theme: str
    status: str
    progress_percentage: int
    total_count: int
    completed_count: int
    failed_count: int
    pending_count: int
    created_at: datetime
    updated_at: datetime
    completed_at: Optional[datetime] = None
    recipients: List[CertificateDetailResponse]


class PublicVerificationResponse(BaseModel):
    verified: bool
    certificate: Optional[Dict[str, Any]] = None
    message: str
