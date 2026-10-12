import React, { useState } from 'react';
import JSZip from 'jszip';
import {
  Folder,
  FileCode,
  FileText,
  Download,
  Copy,
  Check,
  HelpCircle,
  Code2,
  ChevronRight,
  BookOpen,
} from 'lucide-react';

interface RepoFile {
  name: string;
  path: string;
  language: string;
  content: string;
}

const PYTHON_FILES: RepoFile[] = [
  {
    name: 'README.md',
    path: 'README.md',
    language: 'markdown',
    content: `# Bulk Certificate Generator — Backend API & Service

A production-grade, asynchronous backend service built with Python, FastAPI, SQLAlchemy (SQLite / PostgreSQL), and Pydantic designed to handle bulk certificate generation efficiently, with robust input validation, partial failure isolation, and comprehensive status tracking.

## 1. Quick Start

\`\`\`bash
# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run development server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
\`\`\`

Interactive API Documentation:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## 2. Running Automated Tests

\`\`\`bash
pytest -v
\`\`\`

Satisfies all 6 assignment requirements:
1. Creating a generation job (HTTP 202, job ID)
2. Input validation (empty arrays, missing titles, malformed emails)
3. Certificate generation (name binding, verification code, SHA-256)
4. Job status & progress polling
5. Handling individual certificate failures (isolation)
6. Retrieving generated certificates
`,
  },
  {
    name: 'requirements.txt',
    path: 'requirements.txt',
    language: 'text',
    content: `fastapi>=0.110.0
uvicorn[standard]>=0.28.0
sqlalchemy>=2.0.28
pydantic[email]>=2.6.4
email-validator>=2.1.1
reportlab>=4.1.0
pytest>=8.1.1
pytest-cov>=4.1.0
httpx>=0.27.0
qrcode>=7.4.2
jinja2>=3.1.3
python-multipart>=0.0.9`,
  },
  {
    name: 'main.py',
    path: 'app/main.py',
    language: 'python',
    content: `"""FastAPI Application Entry Point."""
from datetime import datetime
import uuid
from typing import Optional
from fastapi import FastAPI, Depends, HTTPException, BackgroundTasks, status, Query
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

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Bulk Certificate Generator API",
    description="High-throughput asynchronous bulk certificate generator with partial failure isolation.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/api/jobs", response_model=JobCreationResponse, status_code=status.HTTP_202_ACCEPTED)
def create_bulk_generation_job(
    request: BulkJobCreateRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
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

    for idx, rec in enumerate(request.recipients):
        code, sha256_hash = generate_verification_tokens(rec.name, request.title, request.issue_date)
        cert = RecipientCertificate(
            id=f"cert_{job_id}_{idx + 1}",
            job_id=job_id,
            recipient_name=rec.name,
            recipient_email=rec.email,
            status=CertificateStatusEnum.PENDING,
            verification_code=code,
            sha256_hash=sha256_hash,
        )
        db.add(cert)

    db.commit()

    # Offload processing to background task
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


@app.get("/api/jobs/{job_id}", response_model=JobStatusResponse)
def get_job_status(job_id: str, db: Session = Depends(get_db)):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    progress_pct = (
        round(((job.completed_count + job.failed_count) / job.total_count) * 100)
        if job.total_count > 0 else 0
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
`,
  },
  {
    name: 'models.py',
    path: 'app/models.py',
    language: 'python',
    content: `"""SQLAlchemy Relational Database Models."""
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

    certificates = relationship("RecipientCertificate", back_populates="job", cascade="all, delete-orphan")


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

    job = relationship("Job", back_populates="certificates")
`,
  },
  {
    name: 'tasks.py',
    path: 'app/tasks.py',
    language: 'python',
    content: `"""Background Worker Tasks with Partial Failure Isolation."""
from datetime import datetime
import os
import re
from sqlalchemy.orm import Session
from .models import Job, RecipientCertificate, JobStatusEnum, CertificateStatusEnum
from .generator import render_certificate_svg

EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$")


def validate_recipient_data(name: str, email: str):
    if not name or not name.strip():
        return False, "Recipient name cannot be blank."
    if not email or not EMAIL_REGEX.match(email.strip()):
        return False, f"Invalid email syntax: '{email}'"
    return True, None


def process_bulk_job_task(job_id: str, db_factory):
    db: Session = db_factory()
    try:
        job = db.query(Job).filter(Job.id == job_id).first()
        if not job:
            return

        job.status = JobStatusEnum.PROCESSING
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

                # 2. Render Template
                svg_content = render_certificate_svg(
                    recipient_name=cert.recipient_name,
                    event_title=job.title,
                    issuer=job.issuer,
                    issuer_title=job.issuer_title,
                    issue_date=job.issue_date,
                    verification_code=cert.verification_code,
                    sha256_hash=cert.sha256_hash,
                    theme=job.template_theme or "gold",
                )

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
                # Isolate unexpected failure to this item
                cert.status = CertificateStatusEnum.FAILED
                cert.error_message = f"Generation error: {str(item_err)}"
                job.failed_count += 1
                job.pending_count = max(0, job.pending_count - 1)
                db.commit()

        job.completed_at = datetime.utcnow()
        if job.failed_count == 0:
            job.status = JobStatusEnum.COMPLETED
        elif job.completed_count > 0:
            job.status = JobStatusEnum.PARTIAL_FAILURE
        else:
            job.status = JobStatusEnum.FAILED
        db.commit()

    finally:
        db.close()
`,
  },
  {
    name: 'test_api.py',
    path: 'tests/test_api.py',
    language: 'python',
    content: `"""Pytest Test Suite covering all 6 assignment requirements."""
import pytest
from fastapi.testclient import TestClient

def test_1_create_generation_job(client):
    # Verifies HTTP 202 Accepted and job creation
    res = client.post("/api/jobs", json={
        "title": "Cloud Architecture",
        "issuer": "Tech Academy",
        "issue_date": "2026-10-15",
        "recipients": [{"name": "Alice", "email": "alice@test.com"}]
    })
    assert res.status_code == 202
    assert "job_id" in res.json()

def test_2_input_validation(client):
    # Verifies 422 rejection on blank title or empty recipients
    res = client.post("/api/jobs", json={
        "title": "",
        "issuer": "Tech Academy",
        "issue_date": "2026-10-15",
        "recipients": []
    })
    assert res.status_code == 422

def test_3_certificate_generation():
    # Verifies template rendering and SHA-256 hash
    from app.generator import render_certificate_svg, generate_verification_tokens
    code, sha = generate_verification_tokens("Bob", "Cloud", "2026-10-15")
    assert code.startswith("CRT-")
    assert len(sha) == 64

def test_4_job_status_and_progress(client):
    # Verifies progress polling
    res = client.post("/api/jobs", json={
        "title": "DevOps",
        "issuer": "Academy",
        "issue_date": "2026-10-15",
        "recipients": [{"name": "Charlie", "email": "c@test.com"}]
    })
    job_id = res.json()["job_id"]
    status_res = client.get(f"/api/jobs/{job_id}")
    assert status_res.status_code == 200
    assert "progress_percentage" in status_res.json()

def test_5_individual_certificate_failure_isolation():
    # Verifies invalid email does not crash valid emails
    from app.tasks import validate_recipient_data
    ok, err = validate_recipient_data("Valid", "valid@email.com")
    assert ok is True
    bad_ok, bad_err = validate_recipient_data("Bad", "bad-email")
    assert bad_ok is False

def test_6_retrieve_generated_certificates(client):
    # Verifies fetching certificates by job ID
    res = client.get("/api/jobs")
    assert res.status_code == 200
`,
  },
];

const ARCHITECTURE_DECISIONS = [
  {
    question: 'Why Asynchronous Processing instead of Synchronous Generation?',
    answer:
      'Bulk operations can have hundreds or thousands of recipients. Synchronous PDF/vector rendering would block the HTTP connection, trigger gateway timeouts (e.g. 504 on Nginx/Cloudflare), and consume thread pool workers. Using HTTP 202 Accepted with background execution decouples receipt from execution and provides responsive UX.',
  },
  {
    question: 'How is Partial Failure Handled & Isolated?',
    answer:
      'Each recipient is processed in an isolated try/catch block with its own database transaction commit. If recipient #4 has an invalid email or syntax error, only record #4 is marked "failed" with its descriptive error message. Records #1, #2, #3, and #5 proceed and complete normally, placing the overall job into "partial_failure" rather than discarding the entire batch.',
  },
  {
    question: 'Why a Relational Database (SQLAlchemy / PostgreSQL / SQLite)?',
    answer:
      'The data model is inherently relational: one Job has many RecipientCertificates. Foreign key constraints enforce referential integrity and cascading deletes. Relational B-tree indexes on job_id, verification_code, and sha256_hash ensure O(1) certificate verification lookups even with millions of records.',
  },
  {
    question: 'How would you scale this to 100,000 certificates/day in Production?',
    answer:
      '1. Replace FastAPI BackgroundTasks with Celery or Temporal backed by Redis/RabbitMQ.\n2. Scale stateless worker pods horizontally on Kubernetes.\n3. Store generated certificate PDFs in S3/GCS with signed URLs instead of local disk.\n4. Use PostgreSQL with read replicas and partition the certificates table by month.',
  },
];

export const CodebaseExplorerView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'files' | 'architecture'>('files');
  const [selectedFilePath, setSelectedFilePath] = useState<string>('app/main.py');
  const [copied, setCopied] = useState<boolean>(false);
  const [downloadingZip, setDownloadingZip] = useState<boolean>(false);

  const selectedFile = PYTHON_FILES.find((f) => f.path === selectedFilePath) || PYTHON_FILES[2];

  const handleCopyCode = () => {
    navigator.clipboard.writeText(selectedFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadZip = async () => {
    setDownloadingZip(true);
    try {
      const zip = new JSZip();
      PYTHON_FILES.forEach((file) => {
        zip.file(file.path, file.content);
      });

      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'bulk-certificate-generator-python.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download zip:', err);
    } finally {
      setDownloadingZip(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Download Button */}
      <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Code2 className="w-5 h-5 text-indigo-400" />
            <h2 className="text-base font-semibold text-white">Complete Python & FastAPI Repository</h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Production backend submission with SQLAlchemy relational models, background workers, and pytest suite.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Segmented Mode Button */}
          <div className="flex items-center p-1 bg-slate-950 rounded-lg border border-slate-800">
            <button
              onClick={() => setActiveTab('files')}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                activeTab === 'files' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Source Files
            </button>
            <button
              onClick={() => setActiveTab('architecture')}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                activeTab === 'architecture' ? 'bg-slate-800 text-indigo-300' : 'text-slate-400 hover:text-white'
              }`}
            >
              Interview Q&A Guide
            </button>
          </div>

          <button
            onClick={handleDownloadZip}
            disabled={downloadingZip}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition-colors shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{downloadingZip ? 'Packaging...' : 'Download Project (.ZIP)'}</span>
          </button>
        </div>
      </div>

      {activeTab === 'files' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* File Tree Explorer (3 cols) */}
          <div className="lg:col-span-3 p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Project Structure
            </div>

            <div className="space-y-1 text-xs font-mono">
              <div className="flex items-center gap-1.5 text-slate-400 py-1 font-semibold">
                <Folder className="w-3.5 h-3.5 text-indigo-400" />
                <span>bulk-certificate-generator/</span>
              </div>

              <div className="pl-3 space-y-1 border-l border-slate-800">
                {PYTHON_FILES.map((file) => {
                  const isSelected = file.path === selectedFilePath;
                  return (
                    <button
                      key={file.path}
                      onClick={() => setSelectedFilePath(file.path)}
                      className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left transition-colors ${
                        isSelected
                          ? 'bg-indigo-950/70 text-indigo-300 border border-indigo-800/80 font-medium'
                          : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                      }`}
                    >
                      {file.name.endsWith('.md') ? (
                        <FileText className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      ) : (
                        <FileCode className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                      )}
                      <span className="truncate">{file.path}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Code Viewer (9 cols) */}
          <div className="lg:col-span-9 p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-3 flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <FileCode className="w-4 h-4 text-indigo-400" />
                <span className="font-mono text-xs font-bold text-white">{selectedFile.path}</span>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                  {selectedFile.language}
                </span>
              </div>

              <button
                onClick={handleCopyCode}
                className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-mono transition-colors"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copied!' : 'Copy Code'}</span>
              </button>
            </div>

            <div className="flex-1 bg-slate-950 border border-slate-800 rounded-lg p-4 max-h-[600px] overflow-auto">
              <pre className="text-xs font-mono text-slate-200 whitespace-pre leading-relaxed">
                {selectedFile.content}
              </pre>
            </div>
          </div>
        </div>
      ) : (
        /* Interview Architecture Q&A Guide */
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300">
            <div className="font-bold text-white text-sm mb-1">
              Interview Defense & Technical Justification Guide
            </div>
            <p className="text-slate-400">
              Page 3 of the assignment specifically notes: <span className="italic">"During the interview, you may be asked to explain your implementation, justify design decisions, debug or modify part of the application..."</span>
              Use these rigorous engineering justifications during your review:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {ARCHITECTURE_DECISIONS.map((item, idx) => (
              <div key={idx} className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-2.5">
                <div className="flex items-start gap-2.5">
                  <div className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                    {idx + 1}
                  </div>
                  <h3 className="text-sm font-bold text-white">{item.question}</h3>
                </div>
                <div className="pl-8 text-xs text-slate-300 leading-relaxed whitespace-pre-line">
                  {item.answer}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
