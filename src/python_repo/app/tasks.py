"""
Asynchronous background worker tasks for bulk certificate processing.
Enforces per-recipient error boundaries so that individual failures NEVER fail the entire job.
"""
from datetime import datetime
import os
import re
from sqlalchemy.orm import Session
from .models import Job, RecipientCertificate, JobStatusEnum, CertificateStatusEnum
from .generator import render_certificate_svg


EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$")


def validate_recipient_data(name: str, email: str) -> Tuple[bool, Optional[str]]:
    """Validates individual recipient data at runtime."""
    if not name or not name.strip():
        return False, "Recipient name cannot be blank or missing."
    if not email or not EMAIL_REGEX.match(email.strip()):
        return False, f"Invalid email syntax: '{email}'"
    return True, None


def process_bulk_job_task(job_id: str, db_factory):
    """
    Background worker function that processes each certificate sequentially or concurrently.
    Each certificate has its own try/except block to isolate failures.
    """
    db: Session = db_factory()
    try:
        job = db.query(Job).filter(Job.id == job_id).first()
        if not job:
            return

        job.status = JobStatusEnum.PROCESSING
        job.updated_at = datetime.utcnow()
        db.commit()

        storage_dir = f"./generated_certs/{job.id}"
        os.makedirs(storage_dir, exist_ok=True)

        for cert in job.certificates:
            try:
                # 1. Validation check
                is_valid, error_msg = validate_recipient_data(cert.recipient_name, cert.recipient_email)
                if not is_valid:
                    cert.status = CertificateStatusEnum.FAILED
                    cert.error_message = error_msg
                    job.failed_count += 1
                    job.pending_count = max(0, job.pending_count - 1)
                    db.commit()
                    continue

                # 2. Render Certificate
                svg_content = render_certificate_svg(
                    recipient_name=cert.recipient_name,
                    event_title=job.title,
                    issuer=job.issuer,
                    issuer_title=job.issuer_title,
                    issue_date=job.issue_date,
                    verification_code=cert.verification_code,
                    sha256_hash=cert.sha256_hash,
                    theme=job.template_theme or "gold"
                )

                # 3. Persist output
                file_path = os.path.join(storage_dir, f"{cert.id}.svg")
                with open(file_path, "w", encoding="utf-8") as f:
                    f.write(svg_content)

                cert.file_path = file_path
                cert.status = CertificateStatusEnum.COMPLETED
                cert.completed_at = datetime.utcnow()
                job.completed_count += 1
                job.pending_count = max(0, job.pending_count - 1)
                db.commit()

            except Exception as item_err:
                # Isolate unexpected rendering failure to this recipient
                cert.status = CertificateStatusEnum.FAILED
                cert.error_message = f"Generation exception: {str(item_err)}"
                job.failed_count += 1
                job.pending_count = max(0, job.pending_count - 1)
                db.commit()

        # Update final job state
        job.completed_at = datetime.utcnow()
        job.updated_at = datetime.utcnow()
        if job.failed_count == 0:
            job.status = JobStatusEnum.COMPLETED
        elif job.completed_count > 0:
            job.status = JobStatusEnum.PARTIAL_FAILURE
        else:
            job.status = JobStatusEnum.FAILED

        db.commit()

    finally:
        db.close()
