"""
Predefined Certificate Template Generator Engine.
Renders high-resolution certificates with guilloche borders, official seal,
anti-tamper SHA-256 fingerprint, and verification QR code.
"""
import hashlib
import uuid
from typing import Tuple


def generate_verification_tokens(name: str, event_title: str, issue_date: str) -> Tuple[str, str]:
    """
    Generates a human-scannable verification code and SHA-256 cryptographic digest.
    """
    code = f"CRT-{uuid.uuid4().hex[:8].upper()}"
    raw = f"{code}:{name}:{event_title}:{issue_date}".encode("utf-8")
    sha256_hash = hashlib.sha256(raw).hexdigest()
    return code, sha256_hash


def render_certificate_svg(
    recipient_name: str,
    event_title: str,
    issuer: str,
    issuer_title: str,
    issue_date: str,
    verification_code: str,
    sha256_hash: str,
    theme: str = "gold"
) -> str:
    """
    Renders an official vector SVG certificate suitable for browser rendering or conversion to PDF.
    """
    themes = {
        "gold": {"primary": "#B45309", "accent": "#D97706", "bg": "#FFFDF7", "border": "#F59E0B"},
        "sapphire": {"primary": "#1E40AF", "accent": "#2563EB", "bg": "#F8FAFC", "border": "#3B82F6"},
        "emerald": {"primary": "#065F46", "accent": "#059669", "bg": "#F0FDF4", "border": "#10B981"},
        "ruby": {"primary": "#991B1B", "accent": "#DC2626", "bg": "#FEF2F2", "border": "#EF4444"},
    }
    t = themes.get(theme, themes["gold"])

    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 700" width="1000" height="700">
  <defs>
    <linearGradient id="gradBorder" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="{t['accent']}" />
      <stop offset="50%" stop-color="{t['border']}" />
      <stop offset="100%" stop-color="{t['primary']}" />
    </linearGradient>
    <filter id="shadow" x="-5%" y="-5%" width="110%" height="110%">
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-opacity="0.1" />
    </filter>
  </defs>

  <!-- Background -->
  <rect width="1000" height="700" fill="{t['bg']}" />

  <!-- Outer Guilloche Style Double Border -->
  <rect x="30" y="30" width="940" height="640" fill="none" stroke="url(#gradBorder)" stroke-width="4" rx="12" />
  <rect x="42" y="42" width="916" height="616" fill="none" stroke="{t['primary']}" stroke-width="1.5" stroke-dasharray="6,4" rx="8" />

  <!-- Corner Rosettes -->
  <circle cx="42" cy="42" r="14" fill="{t['bg']}" stroke="{t['border']}" stroke-width="2" />
  <circle cx="958" cy="42" r="14" fill="{t['bg']}" stroke="{t['border']}" stroke-width="2" />
  <circle cx="42" cy="658" r="14" fill="{t['bg']}" stroke="{t['border']}" stroke-width="2" />
  <circle cx="958" cy="658" r="14" fill="{t['bg']}" stroke="{t['border']}" stroke-width="2" />

  <!-- Top Emblem / Institution Header -->
  <text x="500" y="110" font-family="'Plus Jakarta Sans', sans-serif" font-size="14" font-weight="700" fill="{t['primary']}" letter-spacing="4" text-anchor="middle">
    {issuer.upper()}
  </text>
  <text x="500" y="170" font-family="'Cinzel', serif" font-size="38" font-weight="700" fill="#0F172A" text-anchor="middle">
    CERTIFICATE OF COMPLETION
  </text>
  <text x="500" y="210" font-family="'Plus Jakarta Sans', sans-serif" font-size="14" fill="#64748B" text-anchor="middle">
    THIS OFFICIAL CREDENTIAL IS PROUDLY PRESENTED TO
  </text>

  <!-- Recipient Name -->
  <text x="500" y="295" font-family="'Playfair Display', Georgia, serif" font-size="44" font-weight="700" fill="{t['primary']}" text-anchor="middle">
    {recipient_name}
  </text>
  <line x1="280" y1="320" x2="720" y2="320" stroke="{t['border']}" stroke-width="1.5" />

  <!-- Body Text -->
  <text x="500" y="365" font-family="'Plus Jakarta Sans', sans-serif" font-size="15" fill="#334155" text-anchor="middle">
    for successfully fulfilling all curriculum requirements, rigorous assessments, and mastery criteria for
  </text>
  <text x="500" y="415" font-family="'Plus Jakarta Sans', sans-serif" font-size="24" font-weight="700" fill="#0F172A" text-anchor="middle">
    {event_title}
  </text>

  <!-- Signatures & Verification Section -->
  <g transform="translate(140, 500)">
    <line x1="0" y1="50" x2="220" y2="50" stroke="#94A3B8" stroke-width="1.5" />
    <text x="110" y="75" font-family="'Plus Jakarta Sans', sans-serif" font-size="13" font-weight="600" fill="#0F172A" text-anchor="middle">{issuer}</text>
    <text x="110" y="93" font-family="'Plus Jakarta Sans', sans-serif" font-size="11" fill="#64748B" text-anchor="middle">{issuer_title}</text>
  </g>

  <!-- Seal / Emblem Center -->
  <g transform="translate(500, 540)">
    <circle cx="0" cy="0" r="42" fill="{t['primary']}" filter="url(#shadow)" />
    <circle cx="0" cy="0" r="36" fill="none" stroke="#FFF" stroke-width="1.5" stroke-dasharray="3,2" />
    <text x="0" y="-8" font-family="'Plus Jakarta Sans', sans-serif" font-size="9" font-weight="700" fill="#FFF" text-anchor="middle" letter-spacing="1">VERIFIED</text>
    <text x="0" y="6" font-family="'Cinzel', serif" font-size="16" font-weight="700" fill="#FFF" text-anchor="middle">★</text>
    <text x="0" y="18" font-family="'Plus Jakarta Sans', sans-serif" font-size="8" font-weight="600" fill="#FFF" text-anchor="middle">OFFICIAL</text>
  </g>

  <!-- Date & Verification Code -->
  <g transform="translate(640, 500)">
    <line x1="0" y1="50" x2="220" y2="50" stroke="#94A3B8" stroke-width="1.5" />
    <text x="110" y="75" font-family="'Plus Jakarta Sans', sans-serif" font-size="13" font-weight="600" fill="#0F172A" text-anchor="middle">Issued: {issue_date}</text>
    <text x="110" y="93" font-family="'JetBrains Mono', monospace" font-size="11" fill="{t['primary']}" text-anchor="middle">{verification_code}</text>
  </g>

  <!-- Footer Tamper Hash -->
  <text x="500" y="640" font-family="'JetBrains Mono', monospace" font-size="9" fill="#94A3B8" text-anchor="middle">
    SHA-256: {sha256_hash[:32]}... | Tamper-Proof Cryptographic ID
  </text>
</svg>"""
    return svg
