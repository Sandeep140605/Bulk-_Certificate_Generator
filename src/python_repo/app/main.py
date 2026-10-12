"""
FastAPI Application Entry Point.
Exposes endpoints for job submission, status polling, certificate retrieval, and verification.
"""
from datetime import datetime
import uuid
from typing import List, Optional
from fastapi import FastAPI, Depends, HTTPException, BackgroundTasks, status, Query, Response
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from .database import engine, get_db, Base, SessionLocal
from .models import Job, RecipientCertificate, JobStatusEnum, CertificateStatusEnum
from .schemas import (
    BulkJobCreateRequest,
    JobCreationResponse,
    JobStatusResponse,
    CertificateDetailResponse,
    PublicVerificationResponse,
)
from .tasks import process_bulk_job_task
from .generator import generate_verification_tokens

# Initialize database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Bulk Certificate Generator API",
    description="High-throughput asynchronous bulk certificate generator with partial failure isolation and cryptographic verification.",
    version="1.0.0",
)

# Enable CORS for web clients
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post(
    "/api/jobs",
    response_model=JobCreationResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Accept Bulk Certificate Generation Request",
)
def create_bulk_generation_job(
    request: BulkJobCreateRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """
    Submits a batch of recipients for certificate generation.
    Returns HTTP 202 Accepted and begins asynchronous background rendering.
    """
    job_id = f"job_{uuid.uuid4().hex[:8]}"

    job = Job(
        id=job_id,
        title=request.title,
        issuer=request.issuer,
        issuer_title=request.issuer_title or "Authorized Official",
        issue_date=request.issue_date,
        template_theme=request.template_theme or "gold",
        status=JobStatusEnum.QUEUED,
        total_count=len(request.recipients),
        pending_count=len(request.recipients),
        completed_count=0,
        failed_count=0,
    )
    db.add(job)

    # Pre-create certificate records
    for idx, rec in enumerate(request.recipients):
        code, sha256_hash = generate_verification_tokens(rec.name, request.title, request.issue_date)
        cert_id = f"cert_{job_id}_{idx + 1}"
        cert = RecipientCertificate(
            id=cert_id,
            job_id=job_id,
            recipient_name=rec.name,
            recipient_email=rec.email,
            status=CertificateStatusEnum.PENDING,
            verification_code=code,
            sha256_hash=sha256_hash,
        )
        db.add(cert)

    db.commit()

    # Schedule background processing task
    background_tasks.add_task(process_bulk_job_task, job_id, SessionLocal)

    return JobCreationResponse(
        job_id=job.id,
        status=job.status.value,
        message="Bulk certificate generation request accepted for processing.",
        total_recipients=job.total_count,
        created_at=job.created_at,
        links={
            "status_url": f"/api/jobs/{job.id}",
            "certificates_url": f"/api/jobs/{job.id}/certificates",
        },
    )


@app.get(
    "/api/jobs/{job_id}",
    response_model=JobStatusResponse,
    summary="Track Job Status & Progress",
)
def get_job_status(job_id: str, db: Session = Depends(get_db)):
    """
    Retrieves real-time progress, counters, and detailed recipient records with failure reasons.
    """
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail=f"Job '{job_id}' not found.")

    progress_pct = (
        round(((job.completed_count + job.failed_count) / job.total_count) * 100)
        if job.total_count > 0
        else 0
    )

    certs_response = [
        CertificateDetailResponse(
            id=c.id,
            job_id=c.job_id,
            recipient_name=c.recipient_name,
            recipient_email=c.recipient_email,
            status=c.status.value,
            error_message=c.error_message,
            verification_code=c.verification_code,
            sha256_hash=c.sha256_hash,
            certificate_url=f"/api/jobs/{job.id}/certificates/{c.id}" if c.status == CertificateStatusEnum.COMPLETED else None,
            created_at=c.created_at,
            completed_at=c.completed_at,
        )
        for c in job.certificates
    ]

    return JobStatusResponse(
        id=job.id,
        title=job.title,
        issuer=job.issuer,
        issuer_title=job.issuer_title,
        issue_date=job.issue_date,
        template_theme=job.template_theme,
        status=job.status.value,
        progress_percentage=progress_pct,
        total_count=job.total_count,
        completed_count=job.completed_count,
        failed_count=job.failed_count,
        pending_count=job.pending_count,
        created_at=job.created_at,
        updated_at=job.updated_at,
        completed_at=job.completed_at,
        recipients=certs_response,
    )


@app.get(
    "/api/jobs/{job_id}/certificates",
    summary="Retrieve Generated Certificates for a Job",
)
def get_job_certificates(
    job_id: str,
    status: Optional[str] = Query(None, description="Filter by status (e.g. completed, failed)"),
    db: Session = Depends(get_db),
):
    """Returns list of generated certificate records for a given job."""
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")

    query = db.query(RecipientCertificate).filter(RecipientCertificate.job_id == job_id)
    if status:
        query = query.filter(RecipientCertificate.status == status)

    certs = query.all()
    return {
        "job_id": job_id,
        "count": len(certs),
        "total_count": job.total_count,
        "certificates": [
            {
                "id": c.id,
                "recipient_name": c.recipient_name,
                "recipient_email": c.recipient_email,
                "status": c.status.value,
                "error_message": c.error_message,
                "verification_code": c.verification_code,
                "sha256_hash": c.sha256_hash,
                "download_url": f"/api/jobs/{job_id}/certificates/{c.id}/download" if c.file_path else None,
            }
            for c in certs
        ],
    }


@app.get(
    "/api/jobs/{job_id}/certificates/{cert_id}",
    summary="Retrieve Single Certificate",
)
def get_single_certificate(job_id: str, cert_id: str, db: Session = Depends(get_db)):
    """Retrieves full details of a specific recipient certificate."""
    cert = db.query(RecipientCertificate).filter(
        RecipientCertificate.id == cert_id,
        RecipientCertificate.job_id == job_id,
    ).first()

    if not cert:
        raise HTTPException(status_code=404, detail="Certificate not found.")

    return {
        "id": cert.id,
        "job_id": cert.job_id,
        "recipient_name": cert.recipient_name,
        "recipient_email": cert.recipient_email,
        "status": cert.status.value,
        "error_message": cert.error_message,
        "verification_code": cert.verification_code,
        "sha256_hash": cert.sha256_hash,
        "download_url": f"/api/jobs/{job_id}/certificates/{cert.id}/download" if cert.file_path else None,
    }


@app.get("/api/verify/{identifier}", response_model=PublicVerificationResponse, summary="Public Certificate Verification")
def verify_certificate(identifier: str, db: Session = Depends(get_db)):
    """
    Public endpoint to verify certificate authenticity via verification code or SHA-256 hash.
    """
    cert = db.query(RecipientCertificate).filter(
        (RecipientCertificate.verification_code == identifier) | (RecipientCertificate.sha256_hash == identifier)
    ).first()

    if not cert or cert.status != CertificateStatusEnum.COMPLETED:
        return PublicVerificationResponse(
            verified=False,
            message="No active, valid certificate found matching this identifier.",
        )

    job = cert.job
    return PublicVerificationResponse(
        verified=True,
        message="Official credential verified and intact.",
        certificate={
            "id": cert.id,
            "recipient_name": cert.recipient_name,
            "recipient_email": cert.recipient_email,
            "title": job.title,
            "issuer": job.issuer,
            "issuer_title": job.issuer_title,
            "issue_date": job.issue_date,
            "verification_code": cert.verification_code,
            "sha256_fingerprint": cert.sha256_hash,
            "issued_at": cert.completed_at.isoformat() if cert.completed_at else None,
        },
    )


@app.get("/api/jobs/{job_id}/export-csv", summary="Export Job Results as CSV")
def export_job_results_csv(job_id: str, db: Session = Depends(get_db)):
    """Exports processed job results with unique certificate IDs and verification links as a downloadable CSV."""
    import csv
    import io

    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Recipient Name",
        "Recipient Email",
        "Status",
        "Certificate ID",
        "Verification Code",
        "Verification Link",
        "Issue Date",
        "SHA256 Fingerprint",
        "Error Diagnostic",
    ])

    for c in job.certificates:
        is_completed = c.status == CertificateStatusEnum.COMPLETED
        verify_link = f"/api/verify/{c.verification_code}" if is_completed else ""
        writer.writerow([
            c.recipient_name,
            c.recipient_email,
            c.status.value,
            c.id if is_completed else "",
            c.verification_code if is_completed else "",
            verify_link,
            job.issue_date,
            c.sha256_hash if is_completed else "",
            c.error_message or "",
        ])

    csv_content = output.getvalue()
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=job_{job.id}_results.csv"}
    )

