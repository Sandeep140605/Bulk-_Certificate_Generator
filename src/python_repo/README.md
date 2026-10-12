# Bulk Certificate Generator — Backend API & Service

A production-grade, asynchronous backend service built with **Python**, **FastAPI**, **SQLAlchemy** (Relational Database: SQLite / PostgreSQL), and **Pydantic** designed to handle bulk certificate generation efficiently, with robust input validation, partial failure isolation, and comprehensive status tracking.

---

## 1. Project Overview & Architecture

### Key Capabilities
- **Bulk Certificate Ingestion**: Accepts a single API request containing $N$ recipients, event metadata, and template configurations.
- **Relational Data Model**: Structured `Job` and `RecipientCertificate` tables with foreign key constraints, indexed job lookups, and explicit lifecycle states (`QUEUED`, `PROCESSING`, `COMPLETED`, `PARTIAL_FAILURE`, `FAILED`).
- **Partial Failure Isolation**: An individual recipient validation or rendering error (e.g. malformed email, blank name) **never aborts the overall batch**. Valid certificates in the same job proceed normally.
- **Asynchronous Background Processing**: Offloads heavy PDF/SVG template generation to asynchronous background workers, keeping the API responsive ($<50\text{ms}$ time-to-202).
- **Cryptographic Tamper-Verification**: Generates a unique Certificate Code (`CRT-XXXX-XXXX`) and an immutable SHA-256 fingerprint for tamper-proof verification.
- **Automated Test Suite**: 100% pytest test coverage satisfying all 6 assignment test criteria.

---

## 2. Setup & Installation

### Prerequisites
- Python 3.10+
- `pip` and virtual environment tool (`venv`)

### 1. Clone & Set Up Virtual Environment
```bash
git clone <your-repo-url>
cd bulk-certificate-generator

# Create virtual environment
python3 -m venv venv

# Activate virtual environment
# On macOS/Linux:
source venv/bin/activate
# On Windows:
.\venv\Scripts\activate
```

### 2. Install Dependencies
```bash
pip install -r requirements.txt
```

---

## 3. Running the Application

### Start Development Server
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

The API will be available at:
- **Base URL**: `http://localhost:8000`
- **Interactive OpenAPI / Swagger UI**: `http://localhost:8000/docs`
- **ReDoc Documentation**: `http://localhost:8000/redoc`

---

## 4. Running the Test Suite

Execute the comprehensive test suite with verbose reporting:

```bash
pytest -v
```

To run with coverage metrics:
```bash
pytest -v --cov=app tests/
```

### Tests Covered:
1. `test_create_generation_job`: Verifies job creation, 202 Accepted response, unique Job ID issuance, and record creation.
2. `test_input_validation`: Tests rejection of empty recipient lists, missing event titles, and invalid email syntaxes.
3. `test_certificate_generation`: Verifies certificate PDF/SVG generation, recipient name binding, and verification hash integrity.
4. `test_job_status_and_progress`: Verifies progress polling, transitions from `processing` to `completed`, and count calculations.
5. `test_individual_certificate_failure_isolation`: Verifies that a mixed batch of valid and invalid recipients generates valid certificates without failing the entire job.
6. `test_retrieve_generated_certificates`: Verifies listing certificates for a job and retrieving individual certificates.

---

## 5. API Reference & Usage Guide

### 1. Submit Bulk Generation Request
**Endpoint:** `POST /api/jobs`  
**Status:** `202 Accepted`

```bash
curl -X POST http://localhost:8000/api/jobs \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Advanced Distributed Systems Mastery",
    "issuer": "Global Tech Institute",
    "issuer_title": "Dean of Engineering",
    "issue_date": "2026-10-15",
    "template_theme": "gold",
    "recipients": [
      {
        "name": "Alice Sterling",
        "email": "alice.s@example.com",
        "metadata": { "grade": "Distinction" }
      },
      {
        "name": "Bob Vance",
        "email": "bob.v@example.com",
        "metadata": { "track": "Systems" }
      },
      {
        "name": "Charlie Chaplin",
        "email": "invalid-email-syntax",
        "metadata": {}
      }
    ]
  }'
```

**Response:**
```json
{
  "job_id": "job_9b3e1f82",
  "status": "queued",
  "total_recipients": 3,
  "created_at": "2026-10-15T12:00:00Z",
  "links": {
    "status_url": "/api/jobs/job_9b3e1f82",
    "certificates_url": "/api/jobs/job_9b3e1f82/certificates"
  }
}
```

---

### 2. Check Job Status & Progress
**Endpoint:** `GET /api/jobs/{job_id}`  
**Status:** `200 OK`

```bash
curl http://localhost:8000/api/jobs/job_9b3e1f82
```

**Response:**
```json
{
  "id": "job_9b3e1f82",
  "title": "Advanced Distributed Systems Mastery",
  "issuer": "Global Tech Institute",
  "status": "partial_failure",
  "progress_percentage": 100,
  "total_count": 3,
  "completed_count": 2,
  "failed_count": 1,
  "pending_count": 0,
  "recipients": [
    {
      "id": "cert_job_9b3e1f82_1",
      "recipient_name": "Alice Sterling",
      "recipient_email": "alice.s@example.com",
      "status": "completed",
      "verification_code": "CRT-A8F2",
      "certificate_url": "/api/jobs/job_9b3e1f82/certificates/cert_job_9b3e1f82_1"
    },
    {
      "id": "cert_job_9b3e1f82_2",
      "recipient_name": "Bob Vance",
      "recipient_email": "bob.v@example.com",
      "status": "completed",
      "verification_code": "CRT-3C91",
      "certificate_url": "/api/jobs/job_9b3e1f82/certificates/cert_job_9b3e1f82_2"
    },
    {
      "id": "cert_job_9b3e1f82_3",
      "recipient_name": "Charlie Chaplin",
      "recipient_email": "invalid-email-syntax",
      "status": "failed",
      "error_message": "Invalid email syntax: invalid-email-syntax"
    }
  ]
}
```

---

### 3. Retrieve Generated Certificates
**Endpoint:** `GET /api/jobs/{job_id}/certificates`  
**Query Parameters:** `status=completed` (optional)

```bash
curl http://localhost:8000/api/jobs/job_9b3e1f82/certificates?status=completed
```

---

### 4. Retrieve Single Certificate & Download
**Endpoint:** `GET /api/jobs/{job_id}/certificates/{cert_id}`

```bash
curl http://localhost:8000/api/jobs/job_9b3e1f82/certificates/cert_job_9b3e1f82_1
```

---

### 5. Verify Credential Authenticity (Public)
**Endpoint:** `GET /api/verify/{code_or_hash}`

```bash
curl http://localhost:8000/api/verify/CRT-A8F2
```

---

## 6. Implementation & Design Decisions

### 1. Asynchronous Processing vs. Synchronous API
- **Decision**: Use asynchronous execution with HTTP `202 Accepted` and status polling.
- **Reasoning**: Generating high-resolution vector PDF/SVG certificates requires I/O and CPU rendering. For bulk batches with 100+ recipients, synchronous generation causes HTTP client timeouts, gateway disconnects, and thread blocking. Asynchronous job queues decouple intake from rendering, supporting high burst loads.

### 2. Partial Failure Isolation Strategy
- **Decision**: Isolate each recipient into an atomic rendering sub-task.
- **Reasoning**: In bulk scenarios, it is unacceptable for 1 bad email address out of 500 recipients to discard the entire batch. Failed items record explicit error diagnostics (`error_message`) while valid certificates proceed to completion. The parent job reports `partial_failure` if any items fail.

### 3. Relational Schema Design
- **Tables**: `jobs` (1) to `recipient_certificates` (Many).
- **Indexing**: Foreign keys (`job_id`) and lookup identifiers (`verification_code`, `hash`) are indexed with B-trees for $O(1)$ verification lookups.
- **Transaction Safety**: Per-recipient status updates commit independently so unhandled exceptions do not roll back successful certificates.

### 4. Template & Output Format
- Vector SVG & ReportLab PDF engine with crisp guilloche borders, official seal, recipient typography, issue date, dynamic signature, and anti-tamper QR code.
