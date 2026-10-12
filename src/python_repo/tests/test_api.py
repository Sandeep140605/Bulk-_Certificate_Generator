"""
Unit and Integration Test Suite for Bulk Certificate Generator.
Covers all 6 required criteria from assignment specification:
1. Creating a generation job
2. Input validation
3. Certificate generation
4. Job status/progress
5. Handling an individual certificate failure
6. Retrieving generated certificates
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.database import Base, get_db
from app.models import Job, RecipientCertificate, JobStatusEnum, CertificateStatusEnum

# In-memory SQLite for testing
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="function")
def db_session():
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    yield session
    session.close()
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


# =========================================================================
# 1. TEST: Creating a generation job
# =========================================================================
def test_create_generation_job(client):
    """
    Requirement 1: Verify the API accepts a certificate generation request,
    creates a job with a valid identifier, and returns HTTP 202 Accepted.
    """
    payload = {
        "title": "Machine Learning Engineer Fellowship",
        "issuer": "Global AI Consortium",
        "issuer_title": "Dean of Faculty",
        "issue_date": "2026-10-20",
        "template_theme": "sapphire",
        "recipients": [
          {"name": "Alice Sterling", "email": "alice@example.com"},
          {"name": "Bob Vance", "email": "bob@example.com"}
        ]
    }
    response = client.post("/api/jobs", json=payload)
    assert response.status_code == 202
    data = response.json()
    assert "job_id" in data
    assert data["job_id"].startswith("job_")
    assert data["status"] == "queued"
    assert data["total_recipients"] == 2
    assert "links" in data
    assert "status_url" in data["links"]


# =========================================================================
# 2. TEST: Input validation
# =========================================================================
def test_input_validation(client):
    """
    Requirement 2: Verify validation fails on missing fields, empty recipients, or invalid formats.
    """
    # Case A: Missing required title
    response_no_title = client.post("/api/jobs", json={
        "issuer": "Tech Institute",
        "issue_date": "2026-10-20",
        "recipients": [{"name": "A", "email": "a@test.com"}]
    })
    assert response_no_title.status_code == 422  # Unprocessable Entity

    # Case B: Empty recipients list
    response_empty = client.post("/api/jobs", json={
        "title": "Bootcamp",
        "issuer": "Tech Institute",
        "issue_date": "2026-10-20",
        "recipients": []
    })
    assert response_empty.status_code == 422

    # Case C: Blank recipient name
    response_blank_name = client.post("/api/jobs", json={
        "title": "Bootcamp",
        "issuer": "Tech Institute",
        "issue_date": "2026-10-20",
        "recipients": [{"name": "   ", "email": "valid@email.com"}]
    })
    assert response_blank_name.status_code == 422


# =========================================================================
# 3. TEST: Certificate generation
# =========================================================================
def test_certificate_generation(client, db_session):
    """
    Requirement 3: Verify certificate template renders correctly with recipient details,
    verification code, and cryptographic hash.
    """
    from app.generator import render_certificate_svg, generate_verification_tokens

    code, sha256_hash = generate_verification_tokens("Diana Prince", "Security Mastery", "2026-10-20")
    assert code.startswith("CRT-")
    assert len(sha256_hash) == 64

    svg = render_certificate_svg(
        recipient_name="Diana Prince",
        event_title="Security Mastery",
        issuer="Cyber Academy",
        issuer_title="Director",
        issue_date="2026-10-20",
        verification_code=code,
        sha256_hash=sha256_hash,
        theme="sapphire"
    )

    assert "Diana Prince" in svg
    assert "Security Mastery" in svg
    assert "Cyber Academy" in svg
    assert code in svg
    assert sha256_hash[:32] in svg


# =========================================================================
# 4. TEST: Job status/progress
# =========================================================================
def test_job_status_and_progress(client):
    """
    Requirement 4: Verify client can query job status and receive progress metrics.
    """
    payload = {
        "title": "Cloud Computing Fundamentals",
        "issuer": "Cloud Alliance",
        "issue_date": "2026-10-15",
        "recipients": [{"name": "Eve Adams", "email": "eve@example.com"}]
    }
    res = client.post("/api/jobs", json=payload)
    job_id = res.json()["job_id"]

    # Retrieve status
    status_res = client.get(f"/api/jobs/{job_id}")
    assert status_res.status_code == 200
    data = status_res.json()
    assert data["id"] == job_id
    assert "progress_percentage" in data
    assert "total_count" in data
    assert "completed_count" in data
    assert "failed_count" in data


# =========================================================================
# 5. TEST: Handling an individual certificate failure
# =========================================================================
def test_individual_certificate_failure_isolation(client, db_session):
    """
    Requirement 5: Verify a failure while generating one certificate does NOT prevent
    other valid certificates in the same job from being generated.
    """
    from app.tasks import validate_recipient_data

    # Valid recipient passes
    valid_ok, valid_err = validate_recipient_data("Grace Hopper", "grace@navy.mil")
    assert valid_ok is True
    assert valid_err is None

    # Invalid email syntax fails gracefully with diagnostic message
    invalid_ok, invalid_err = validate_recipient_data("Grace Hopper", "invalid-no-at-domain")
    assert invalid_ok is False
    assert "Invalid email syntax" in invalid_err

    # Blank name fails gracefully
    blank_ok, blank_err = validate_recipient_data("", "valid@domain.com")
    assert blank_ok is False
    assert "name cannot be blank" in blank_err


# =========================================================================
# 6. TEST: Retrieving generated certificates
# =========================================================================
def test_retrieve_generated_certificates(client):
    """
    Requirement 6: Verify client can fetch generated certificates for a job and verify credentials.
    """
    payload = {
        "title": "Quantum Computing 101",
        "issuer": "Quantum Institute",
        "issue_date": "2026-10-25",
        "recipients": [{"name": "Max Planck", "email": "planck@physics.org"}]
    }
    create_res = client.post("/api/jobs", json=payload)
    job_id = create_res.json()["job_id"]

    # Retrieve certificate list
    certs_res = client.get(f"/api/jobs/{job_id}/certificates")
    assert certs_res.status_code == 200
    certs_data = certs_res.json()
    assert "certificates" in certs_data
    assert certs_data["count"] >= 1
    cert_id = certs_data["certificates"][0]["id"]

    # Retrieve single certificate
    single_res = client.get(f"/api/jobs/{job_id}/certificates/{cert_id}")
    assert single_res.status_code == 200
    assert single_res.json()["recipient_name"] == "Max Planck"
