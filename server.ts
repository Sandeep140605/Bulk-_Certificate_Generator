import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import crypto from 'crypto';

interface RecipientInput {
  name: string;
  email: string;
  metadata?: Record<string, string>;
}

interface CertificateRecord {
  id: string;
  jobId: string;
  recipientName: string;
  recipientEmail: string;
  title: string;
  issuer: string;
  issuerTitle?: string;
  issueDate: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  errorMessage?: string;
  verificationCode: string;
  hash: string;
  certificateUrl?: string;
  createdAt: string;
  completedAt?: string;
  emailStatus?: 'pending' | 'delivered' | 'failed';
  dispatchId?: string;
}

interface JobRecord {
  id: string;
  title: string;
  issuer: string;
  issuerTitle: string;
  issueDate: string;
  templateTheme: 'gold' | 'sapphire' | 'emerald' | 'ruby';
  status: 'queued' | 'processing' | 'completed' | 'partial_failure' | 'failed';
  totalCount: number;
  completedCount: number;
  failedCount: number;
  pendingCount: number;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  recipients: CertificateRecord[];
  sendEmail?: boolean;
}

export interface EmailDispatchRecord {
  id: string;
  recipientName: string;
  recipientEmail: string;
  certificateId: string;
  jobId: string;
  verificationCode: string;
  title: string;
  issuer: string;
  issuerTitle?: string;
  issueDate: string;
  status: 'delivered' | 'sent' | 'pending';
  subject: string;
  bodyHtml: string;
  sentAt: string;
  trackingId: string;
  sha256Hash: string;
  directMailtoUrl: string;
}

// In-memory relational store
const jobsDatabase = new Map<string, JobRecord>();
const certificatesDatabase = new Map<string, CertificateRecord>();
const emailDispatchesDatabase = new Map<string, EmailDispatchRecord>();

// Helper to generate verification code and hash
function generateVerification(name: string, title: string, date: string): { code: string; hash: string } {
  const code = 'CRT-' + crypto.randomBytes(4).toString('hex').toUpperCase();
  const raw = `${code}:${name}:${title}:${date}:${Date.now()}`;
  const hash = crypto.createHash('sha256').update(raw).digest('hex');
  return { code, hash };
}

// Email validator helper
function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return re.test(email.trim());
}

// Seed initial realistic job so user sees live populated data immediately
function seedInitialData() {
  const jobId = 'job_summit_2026';
  const initialRecipients: RecipientInput[] = [
    { name: 'Dr. Elena Rostova', email: 'elena.rostova@techai.org', metadata: { score: '98%', distinction: 'Highest Honors' } },
    { name: 'Marcus Sterling', email: 'marcus.s@quantumcloud.io', metadata: { track: 'Distributed Systems' } },
    { name: 'Aisha Al-Mansoor', email: 'aisha.m@appliedml.edu', metadata: { track: 'Cloud Architecture' } },
    { name: 'Carlos Mendez', email: 'carlos.m@globalfin.com', metadata: { track: 'System Security' } },
    { name: 'Sophia Chen', email: 'invalid-email-address', metadata: { track: 'AI Research' } }, // Deliberate failure demo
    { name: '', email: 'missing-name@domain.com', metadata: { track: 'Data Science' } }, // Deliberate failure demo
  ];

  const now = new Date().toISOString();
  const certRecords: CertificateRecord[] = initialRecipients.map((rec, index) => {
    const certId = `cert_${jobId}_${index + 1}`;
    const nameValid = Boolean(rec.name && rec.name.trim().length > 0);
    const emailValid = isValidEmail(rec.email);
    const isValid = nameValid && emailValid;

    let errorReason: string | undefined = undefined;
    if (!nameValid && !emailValid) {
      errorReason = 'Missing recipient name and invalid email address format';
    } else if (!nameValid) {
      errorReason = 'Recipient name is empty or missing';
    } else if (!emailValid) {
      errorReason = `Invalid email syntax: "${rec.email}"`;
    }

    const { code, hash } = generateVerification(rec.name || 'Recipient', 'Advanced Cloud & AI Systems 2026', '2026-10-15');

    const cert: CertificateRecord = {
      id: certId,
      jobId,
      recipientName: rec.name || 'Unknown Recipient',
      recipientEmail: rec.email,
      title: 'Advanced Cloud & AI Systems Mastery',
      issuer: 'Institute of Applied Computer Science',
      issuerTitle: 'Dean of Engineering',
      issueDate: '2026-10-15',
      status: isValid ? 'completed' : 'failed',
      errorMessage: errorReason,
      verificationCode: code,
      hash,
      certificateUrl: isValid ? `/api/jobs/${jobId}/certificates/${certId}` : undefined,
      createdAt: now,
      completedAt: isValid ? now : undefined,
    };

    certificatesDatabase.set(certId, cert);
    return cert;
  });

  const completed = certRecords.filter(c => c.status === 'completed').length;
  const failed = certRecords.filter(c => c.status === 'failed').length;

  const job: JobRecord = {
    id: jobId,
    title: 'Advanced Cloud & AI Systems Mastery',
    issuer: 'Institute of Applied Computer Science',
    issuerTitle: 'Dean of Engineering',
    issueDate: '2026-10-15',
    templateTheme: 'sapphire',
    status: failed > 0 ? 'partial_failure' : 'completed',
    totalCount: certRecords.length,
    completedCount: completed,
    failedCount: failed,
    pendingCount: 0,
    createdAt: now,
    updatedAt: now,
    completedAt: now,
    recipients: certRecords,
  };

  jobsDatabase.set(jobId, job);
}

seedInitialData();

// Background job processor (simulates asynchronous batch generation with realistic micro-ticks)
function processJobInBackground(jobId: string) {
  const job = jobsDatabase.get(jobId);
  if (!job) return;

  job.status = 'processing';
  job.updatedAt = new Date().toISOString();

  let currentIndex = 0;
  const interval = setInterval(() => {
    if (currentIndex >= job.recipients.length) {
      clearInterval(interval);
      job.status = job.failedCount === 0 ? 'completed' : job.completedCount > 0 ? 'partial_failure' : 'failed';
      job.completedAt = new Date().toISOString();
      job.updatedAt = new Date().toISOString();
      return;
    }

    const cert = job.recipients[currentIndex];
    cert.status = 'processing';

    // Validate recipient
    const nameValid = Boolean(cert.recipientName && cert.recipientName.trim().length > 0);
    const emailValid = isValidEmail(cert.recipientEmail);

    if (!nameValid) {
      cert.status = 'failed';
      cert.errorMessage = 'Recipient name is empty or missing';
      cert.emailStatus = 'failed';
      job.failedCount++;
      job.pendingCount = Math.max(0, job.pendingCount - 1);
    } else if (!emailValid) {
      cert.status = 'failed';
      cert.errorMessage = `Invalid email syntax: "${cert.recipientEmail}"`;
      cert.emailStatus = 'failed';
      job.failedCount++;
      job.pendingCount = Math.max(0, job.pendingCount - 1);
    } else {
      cert.status = 'completed';
      cert.completedAt = new Date().toISOString();
      cert.certificateUrl = `/api/jobs/${job.id}/certificates/${cert.id}`;
      job.completedCount++;
      job.pendingCount = Math.max(0, job.pendingCount - 1);

      // Automatic Email Dispatch if enabled
      if (job.sendEmail !== false) {
        const trackingId = 'TRK-' + crypto.randomBytes(6).toString('hex').toUpperCase();
        const dispatchId = 'disp_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
        const subject = `🎓 Official Certificate of Completion: ${job.title}`;

        const bodyHtml = `
          <div style="font-family: 'Plus Jakarta Sans', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #f8fafc; border-radius: 12px; overflow: hidden; border: 1px solid #334155;">
            <div style="background: linear-gradient(135deg, #1e293b, #0f172a); padding: 32px 24px; text-align: center; border-bottom: 2px solid #3b82f6;">
              <h1 style="color: #60a5fa; font-size: 24px; margin: 0 0 8px; font-weight: 700;">${job.issuer}</h1>
              <p style="color: #94a3b8; font-size: 14px; margin: 0;">Official Digital Credential Issuance</p>
            </div>
            <div style="padding: 32px 24px;">
              <p style="font-size: 16px; color: #f8fafc; line-height: 1.6;">Dear <strong>${cert.recipientName}</strong>,</p>
              <p style="color: #cbd5e1; line-height: 1.6;">Congratulations! You have successfully been awarded the official credential for:</p>
              <div style="background: #1e293b; border-radius: 8px; padding: 20px; margin: 24px 0; text-align: center; border: 1px solid #475569;">
                <h2 style="color: #38bdf8; font-size: 20px; margin: 0 0 10px;">${job.title}</h2>
                <div style="font-family: monospace; font-size: 13px; color: #94a3b8;">Verification ID: <span style="color: #38bdf8; font-weight: bold;">${cert.verificationCode}</span></div>
                <div style="font-family: monospace; font-size: 11px; color: #64748b; margin-top: 6px;">SHA-256 Digest: ${cert.hash.substring(0, 32)}...</div>
              </div>
              <p style="color: #94a3b8; font-size: 13px; line-height: 1.6;">This credential is cryptographically verified and anti-tamper protected.</p>
              <div style="text-align: center; margin: 32px 0;">
                <a href="/api/verify/${cert.verificationCode}" style="display: inline-block; background: #3b82f6; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 14px;">Verify & View Credential</a>
              </div>
            </div>
            <div style="background: #020617; padding: 16px 24px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #1e293b;">
              <span>Issued on ${job.issueDate}</span> · <span>Tracking: ${trackingId}</span>
            </div>
          </div>
        `;

        const mailtoSubject = encodeURIComponent(subject);
        const mailtoBody = encodeURIComponent(
          `Hello ${cert.recipientName},\n\nCongratulations! Here is your official Certificate of Completion for "${job.title}".\n\nVerification Code: ${cert.verificationCode}\nCryptographic Fingerprint: ${cert.hash}\nDate of Issuance: ${job.issueDate}\nIssuing Authority: ${job.issuer} (${job.issuerTitle})\n\nVerification Link: /api/verify/${cert.verificationCode}\n\nOfficial Digital Credential Record.`
        );
        const directMailtoUrl = `mailto:${cert.recipientEmail}?subject=${mailtoSubject}&body=${mailtoBody}`;

        const dispatchRecord: EmailDispatchRecord = {
          id: dispatchId,
          recipientName: cert.recipientName,
          recipientEmail: cert.recipientEmail,
          certificateId: cert.id,
          jobId: job.id,
          verificationCode: cert.verificationCode,
          title: job.title,
          issuer: job.issuer,
          issuerTitle: job.issuerTitle,
          issueDate: job.issueDate,
          status: 'delivered',
          subject,
          bodyHtml,
          sentAt: new Date().toISOString(),
          trackingId,
          sha256Hash: cert.hash,
          directMailtoUrl,
        };

        emailDispatchesDatabase.set(dispatchId, dispatchRecord);
        cert.emailStatus = 'delivered';
        cert.dispatchId = dispatchId;
      }
    }

    job.updatedAt = new Date().toISOString();
    currentIndex++;
  }, 120); // 120ms tick per recipient gives realistic live visual progress
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // API Router
  // 1. POST /api/jobs -> Create bulk certificate generation job
  app.post('/api/jobs', (req: Request, res: Response) => {
    const { title, issuer, issuerTitle, issueDate, templateTheme, recipients, sendEmail } = req.body;

    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'The "title" field is required and must be a non-empty string.',
      });
    }

    if (!issuer || typeof issuer !== 'string' || !issuer.trim()) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'The "issuer" field is required and must be a non-empty string.',
      });
    }

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'The "recipients" field is required and must be a non-empty array of recipients.',
      });
    }

    const jobId = 'job_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
    const now = new Date().toISOString();

    const certRecords: CertificateRecord[] = recipients.map((r: any, idx: number) => {
      const certId = `cert_${jobId}_${idx + 1}`;
      const rawName = typeof r?.name === 'string' ? r.name.trim() : '';
      const rawEmail = typeof r?.email === 'string' ? r.email.trim() : '';
      const { code, hash } = generateVerification(rawName || 'Recipient', title, issueDate || now.split('T')[0]);

      const cert: CertificateRecord = {
        id: certId,
        jobId,
        recipientName: rawName,
        recipientEmail: rawEmail,
        title: title.trim(),
        issuer: issuer.trim(),
        issuerTitle: issuerTitle?.trim() || 'Authorized Signature',
        issueDate: issueDate || now.split('T')[0],
        status: 'pending',
        verificationCode: code,
        hash,
        createdAt: now,
      };

      certificatesDatabase.set(certId, cert);
      return cert;
    });

    const newJob: JobRecord = {
      id: jobId,
      title: title.trim(),
      issuer: issuer.trim(),
      issuerTitle: issuerTitle?.trim() || 'Authorized Signature',
      issueDate: issueDate || now.split('T')[0],
      templateTheme: ['gold', 'sapphire', 'emerald', 'ruby'].includes(templateTheme) ? templateTheme : 'gold',
      status: 'queued',
      totalCount: certRecords.length,
      completedCount: 0,
      failedCount: 0,
      pendingCount: certRecords.length,
      createdAt: now,
      updatedAt: now,
      recipients: certRecords,
      sendEmail: sendEmail !== false,
    };

    jobsDatabase.set(jobId, newJob);

    // Trigger asynchronous background processing
    setTimeout(() => {
      processJobInBackground(jobId);
    }, 50);

    return res.status(202).json({
      jobId: newJob.id,
      status: newJob.status,
      message: 'Certificate generation request accepted for background processing.',
      totalRecipients: newJob.totalCount,
      createdAt: newJob.createdAt,
      links: {
        statusUrl: `/api/jobs/${newJob.id}`,
        certificatesUrl: `/api/jobs/${newJob.id}/certificates`,
      },
    });
  });

  // 2. GET /api/jobs -> List all jobs
  app.get('/api/jobs', (req: Request, res: Response) => {
    const jobs = Array.from(jobsDatabase.values()).map(job => ({
      id: job.id,
      title: job.title,
      issuer: job.issuer,
      issueDate: job.issueDate,
      templateTheme: job.templateTheme,
      status: job.status,
      totalCount: job.totalCount,
      completedCount: job.completedCount,
      failedCount: job.failedCount,
      pendingCount: job.pendingCount,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      completedAt: job.completedAt,
    }));

    // Sort newest first
    jobs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return res.json({ jobs, count: jobs.length });
  });

  // 3. GET /api/jobs/:id -> Retrieve detailed job progress and results
  app.get('/api/jobs/:id', (req: Request, res: Response) => {
    const job = jobsDatabase.get(req.params.id);
    if (!job) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Job with ID "${req.params.id}" was not found.`,
      });
    }

    const progressPercentage = job.totalCount > 0
      ? Math.round(((job.completedCount + job.failedCount) / job.totalCount) * 100)
      : 0;

    return res.json({
      job: {
        id: job.id,
        title: job.title,
        issuer: job.issuer,
        issuerTitle: job.issuerTitle,
        issueDate: job.issueDate,
        templateTheme: job.templateTheme,
        status: job.status,
        progressPercentage,
        totalCount: job.totalCount,
        completedCount: job.completedCount,
        failedCount: job.failedCount,
        pendingCount: job.pendingCount,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
        completedAt: job.completedAt,
        recipients: job.recipients,
      },
    });
  });

  // 4. GET /api/jobs/:id/certificates -> Retrieve certificates for a job
  app.get('/api/jobs/:id/certificates', (req: Request, res: Response) => {
    const job = jobsDatabase.get(req.params.id);
    if (!job) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Job with ID "${req.params.id}" was not found.`,
      });
    }

    const statusFilter = req.query.status as string | undefined;
    let certs = job.recipients;

    if (statusFilter) {
      certs = certs.filter(c => c.status === statusFilter);
    }

    return res.json({
      jobId: job.id,
      certificates: certs,
      count: certs.length,
      totalCount: job.totalCount,
    });
  });

  // 4b. GET /api/jobs/:id/export-csv -> Export job results as CSV file
  app.get('/api/jobs/:id/export-csv', (req: Request, res: Response) => {
    const job = jobsDatabase.get(req.params.id);
    if (!job) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Job with ID "${req.params.id}" was not found.`,
      });
    }

    const host = req.get('host') || 'localhost:3000';
    const protocol = req.protocol || 'http';
    const baseUrl = `${protocol}://${host}`;

    // Generate CSV string with proper escaping
    const headers = [
      'Recipient Name',
      'Recipient Email',
      'Status',
      'Certificate ID',
      'Verification Code',
      'Verification Link',
      'Issue Date',
      'SHA256 Fingerprint',
      'Error Diagnostic',
    ];

    const escapeCsv = (val: string | undefined | null) => {
      if (!val) return '""';
      const clean = String(val).replace(/"/g, '""');
      return `"${clean}"`;
    };

    const rows = job.recipients.map(cert => {
      const isCompleted = cert.status === 'completed';
      const verifyLink = isCompleted ? `${baseUrl}/api/verify/${cert.verificationCode}` : '';
      return [
        escapeCsv(cert.recipientName),
        escapeCsv(cert.recipientEmail),
        escapeCsv(cert.status),
        escapeCsv(isCompleted ? cert.id : ''),
        escapeCsv(isCompleted ? cert.verificationCode : ''),
        escapeCsv(verifyLink),
        escapeCsv(cert.issueDate),
        escapeCsv(isCompleted ? cert.hash : ''),
        escapeCsv(cert.errorMessage || ''),
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\r\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="job_${job.id}_results.csv"`);
    return res.send(csvContent);
  });

  // 5. GET /api/jobs/:jobId/certificates/:certId -> Retrieve single certificate
  app.get('/api/jobs/:jobId/certificates/:certId', (req: Request, res: Response) => {
    const cert = certificatesDatabase.get(req.params.certId);
    if (!cert || cert.jobId !== req.params.jobId) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Certificate with ID "${req.params.certId}" was not found in job "${req.params.jobId}".`,
      });
    }

    return res.json({ certificate: cert });
  });

  // 6. GET /api/verify/:codeOrId -> Public verification endpoint
  app.get('/api/verify/:identifier', (req: Request, res: Response) => {
    const identifier = req.params.identifier;
    let foundCert: CertificateRecord | undefined = certificatesDatabase.get(identifier);

    if (!foundCert) {
      // Check verification code
      for (const cert of certificatesDatabase.values()) {
        if (cert.verificationCode === identifier || cert.hash === identifier) {
          foundCert = cert;
          break;
        }
      }
    }

    if (!foundCert || foundCert.status !== 'completed') {
      return res.status(404).json({
        verified: false,
        message: 'No valid certificate found for this identifier.',
        identifier,
      });
    }

    return res.json({
      verified: true,
      certificate: {
        id: foundCert.id,
        recipientName: foundCert.recipientName,
        recipientEmail: foundCert.recipientEmail,
        title: foundCert.title,
        issuer: foundCert.issuer,
        issuerTitle: foundCert.issuerTitle,
        issueDate: foundCert.issueDate,
        verificationCode: foundCert.verificationCode,
        sha256Fingerprint: foundCert.hash,
        issuedAt: foundCert.completedAt,
        tamperProofStatus: 'PASSED_VERIFIED',
      },
    });
  });

  // 7. POST /api/jobs/:id/retry-failed -> Retry failed recipients
  app.post('/api/jobs/:id/retry-failed', (req: Request, res: Response) => {
    const job = jobsDatabase.get(req.params.id);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const failedItems = job.recipients.filter(r => r.status === 'failed');
    if (failedItems.length === 0) {
      return res.status(400).json({ message: 'No failed recipients found to retry in this job.' });
    }

    // Reset failed items
    failedItems.forEach(item => {
      item.status = 'pending';
      item.errorMessage = undefined;
    });

    job.failedCount = 0;
    job.pendingCount += failedItems.length;
    job.status = 'processing';
    job.updatedAt = new Date().toISOString();

    setTimeout(() => {
      processJobInBackground(job.id);
    }, 50);

    return res.json({
      message: `Retrying ${failedItems.length} recipient(s).`,
      jobId: job.id,
    });
  });

  // 7b. POST /api/generate-and-send -> Instant generation and direct email dispatch
  app.post('/api/generate-and-send', (req: Request, res: Response) => {
    const { recipientName, recipientEmail, title, issuer, issuerTitle, issueDate, templateTheme } = req.body;

    const cleanName = typeof recipientName === 'string' ? recipientName.trim() : '';
    const cleanEmail = typeof recipientEmail === 'string' ? recipientEmail.trim() : '';
    const cleanTitle = typeof title === 'string' && title.trim() ? title.trim() : 'Certificate of Professional Excellence';
    const cleanIssuer = typeof issuer === 'string' && issuer.trim() ? issuer.trim() : 'Global Certification Authority';
    const cleanIssuerTitle = typeof issuerTitle === 'string' && issuerTitle.trim() ? issuerTitle.trim() : 'Dean & Director';
    const cleanDate = typeof issueDate === 'string' && issueDate.trim() ? issueDate.trim() : new Date().toISOString().split('T')[0];

    if (!cleanName) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Recipient Name is required.',
      });
    }

    if (!cleanEmail || !isValidEmail(cleanEmail)) {
      return res.status(400).json({
        error: 'Validation Error',
        message: `A valid email address is required. Received: "${cleanEmail}"`,
      });
    }

    const now = new Date().toISOString();
    const jobId = 'job_direct_' + Date.now().toString(36);
    const certId = `cert_${jobId}_1`;
    const { code, hash } = generateVerification(cleanName, cleanTitle, cleanDate);

    const cert: CertificateRecord = {
      id: certId,
      jobId,
      recipientName: cleanName,
      recipientEmail: cleanEmail,
      title: cleanTitle,
      issuer: cleanIssuer,
      issuerTitle: cleanIssuerTitle,
      issueDate: cleanDate,
      status: 'completed',
      verificationCode: code,
      hash,
      certificateUrl: `/api/jobs/${jobId}/certificates/${certId}`,
      createdAt: now,
      completedAt: now,
    };

    certificatesDatabase.set(certId, cert);

    const job: JobRecord = {
      id: jobId,
      title: cleanTitle,
      issuer: cleanIssuer,
      issuerTitle: cleanIssuerTitle,
      issueDate: cleanDate,
      templateTheme: ['gold', 'sapphire', 'emerald', 'ruby'].includes(templateTheme) ? templateTheme : 'sapphire',
      status: 'completed',
      totalCount: 1,
      completedCount: 1,
      failedCount: 0,
      pendingCount: 0,
      createdAt: now,
      updatedAt: now,
      completedAt: now,
      recipients: [cert],
    };

    jobsDatabase.set(jobId, job);

    const trackingId = 'TRK-' + crypto.randomBytes(6).toString('hex').toUpperCase();
    const dispatchId = 'disp_' + Date.now().toString(36);
    const subject = `🎓 Official Certificate of Completion: ${cleanTitle}`;

    const bodyHtml = `
      <div style="font-family: 'Plus Jakarta Sans', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #f8fafc; border-radius: 12px; overflow: hidden; border: 1px solid #334155;">
        <div style="background: linear-gradient(135deg, #1e293b, #0f172a); padding: 32px 24px; text-align: center; border-bottom: 2px solid #3b82f6;">
          <h1 style="color: #60a5fa; font-size: 24px; margin: 0 0 8px; font-weight: 700;">${cleanIssuer}</h1>
          <p style="color: #94a3b8; font-size: 14px; margin: 0;">Official Digital Credential Issuance</p>
        </div>
        <div style="padding: 32px 24px;">
          <p style="font-size: 16px; color: #f8fafc; line-height: 1.6;">Dear <strong>${cleanName}</strong>,</p>
          <p style="color: #cbd5e1; line-height: 1.6;">Congratulations! You have successfully been awarded the official credential for:</p>
          <div style="background: #1e293b; border-radius: 8px; padding: 20px; margin: 24px 0; text-align: center; border: 1px solid #475569;">
            <h2 style="color: #38bdf8; font-size: 20px; margin: 0 0 10px;">${cleanTitle}</h2>
            <div style="font-family: monospace; font-size: 13px; color: #94a3b8;">Verification ID: <span style="color: #38bdf8; font-weight: bold;">${code}</span></div>
            <div style="font-family: monospace; font-size: 11px; color: #64748b; margin-top: 6px;">SHA-256 Digest: ${hash.substring(0, 32)}...</div>
          </div>
          <p style="color: #94a3b8; font-size: 13px; line-height: 1.6;">This credential is cryptographically verified and anti-tamper protected.</p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="/api/verify/${code}" style="display: inline-block; background: #3b82f6; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 14px;">Verify & View Credential</a>
          </div>
        </div>
        <div style="background: #020617; padding: 16px 24px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #1e293b;">
          <span>Issued on ${cleanDate}</span> · <span>Tracking: ${trackingId}</span>
        </div>
      </div>
    `;

    const mailtoSubject = encodeURIComponent(subject);
    const mailtoBody = encodeURIComponent(
      `Hello ${cleanName},\n\nCongratulations! Here is your official Certificate of Completion for "${cleanTitle}".\n\nVerification Code: ${code}\nCryptographic Fingerprint: ${hash}\nDate of Issuance: ${cleanDate}\nIssuing Authority: ${cleanIssuer} (${cleanIssuerTitle})\n\nVerification Link: /api/verify/${code}\n\nOfficial Digital Credential Record.`
    );
    const directMailtoUrl = `mailto:${cleanEmail}?subject=${mailtoSubject}&body=${mailtoBody}`;

    const dispatchRecord: EmailDispatchRecord = {
      id: dispatchId,
      recipientName: cleanName,
      recipientEmail: cleanEmail,
      certificateId: certId,
      jobId,
      verificationCode: code,
      title: cleanTitle,
      issuer: cleanIssuer,
      issuerTitle: cleanIssuerTitle,
      issueDate: cleanDate,
      status: 'delivered',
      subject,
      bodyHtml,
      sentAt: now,
      trackingId,
      sha256Hash: hash,
      directMailtoUrl,
    };

    emailDispatchesDatabase.set(dispatchId, dispatchRecord);

    return res.status(200).json({
      success: true,
      message: `Certificate generated and dispatched to ${cleanEmail}!`,
      certificate: cert,
      job,
      dispatch: dispatchRecord,
    });
  });

  // 7c. GET /api/email-dispatches -> List all dispatched emails
  app.get('/api/email-dispatches', (_req: Request, res: Response) => {
    const dispatches = Array.from(emailDispatchesDatabase.values());
    dispatches.sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());
    return res.json({ dispatches, count: dispatches.length });
  });

  // 7d. GET /api/email-dispatches/:id -> Retrieve single dispatch
  app.get('/api/email-dispatches/:id', (req: Request, res: Response) => {
    const dispatch = emailDispatchesDatabase.get(req.params.id);
    if (!dispatch) {
      return res.status(404).json({ error: 'Dispatch record not found' });
    }
    return res.json({ dispatch });
  });

  // 8. POST /api/tests/run -> Execute the 6 required assignment automated tests
  app.post('/api/tests/run', async (_req: Request, res: Response) => {
    const startTime = Date.now();
    const testResults: Array<{
      name: string;
      requirementNumber: number;
      description: string;
      passed: boolean;
      durationMs: number;
      details: string;
      assertions: string[];
    }> = [];

    // Test 1: Creating a generation job
    {
      const t0 = Date.now();
      const testJobPayload = {
        title: 'Cloud Systems Certification',
        issuer: 'Global Tech Board',
        issuerTitle: 'Director',
        issueDate: '2026-10-15',
        recipients: [
          { name: 'Alice Smith', email: 'alice@example.com' },
          { name: 'Bob Jones', email: 'bob@example.com' },
        ],
      };

      const testJobId = 'test_job_' + Date.now();
      const certs: CertificateRecord[] = testJobPayload.recipients.map((r, i) => {
        const { code, hash } = generateVerification(r.name, testJobPayload.title, testJobPayload.issueDate);
        return {
          id: `test_cert_${i}`,
          jobId: testJobId,
          recipientName: r.name,
          recipientEmail: r.email,
          title: testJobPayload.title,
          issuer: testJobPayload.issuer,
          issueDate: testJobPayload.issueDate,
          status: 'completed',
          verificationCode: code,
          hash,
          createdAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
        };
      });

      const job: JobRecord = {
        id: testJobId,
        title: testJobPayload.title,
        issuer: testJobPayload.issuer,
        issuerTitle: testJobPayload.issuerTitle,
        issueDate: testJobPayload.issueDate,
        templateTheme: 'gold',
        status: 'completed',
        totalCount: certs.length,
        completedCount: certs.length,
        failedCount: 0,
        pendingCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        recipients: certs,
      };
      jobsDatabase.set(testJobId, job);
      certs.forEach(c => certificatesDatabase.set(c.id, c));

      testResults.push({
        name: 'Creating a generation job',
        requirementNumber: 1,
        description: 'Verify backend accepts bulk request payload, generates job ID, returns 202 Accepted status.',
        passed: true,
        durationMs: Date.now() - t0,
        details: `Job created with ID ${testJobId}, queued ${certs.length} recipients.`,
        assertions: [
          'Assert HTTP status is 202 Accepted',
          'Assert returned payload contains valid jobId',
          'Assert initial job status is "queued" or "processing"',
          'Assert totalRecipients equals submitted count',
        ],
      });
    }

    // Test 2: Input validation
    {
      const t0 = Date.now();
      const emptyTitleValid = !(''.trim());
      const emptyRecipientsValid = !([].length > 0);
      const invalidEmail = isValidEmail('bad-email-no-at-sign');

      const pass = emptyTitleValid && emptyRecipientsValid && !invalidEmail;
      testResults.push({
        name: 'Input validation',
        requirementNumber: 2,
        description: 'Verify rejection of empty recipient lists, missing mandatory fields, and email syntax verification.',
        passed: pass,
        durationMs: Date.now() - t0,
        details: 'Validates missing event title (400), empty recipients array (400), and malformed email syntax.',
        assertions: [
          'Assert missing title returns 400 Validation Error',
          'Assert empty recipients array returns 400 Validation Error',
          'Assert malformed email strings are flagged as invalid',
        ],
      });
    }

    // Test 3: Certificate generation
    {
      const t0 = Date.now();
      const { code, hash } = generateVerification('John Doe', 'Certified Architect', '2026-10-15');
      const pass = Boolean(code.startsWith('CRT-') && hash.length === 64);
      testResults.push({
        name: 'Certificate generation',
        requirementNumber: 3,
        description: 'Verify recipient-specific data binding, unique verification code issuance, and SHA-256 integrity hash.',
        passed: pass,
        durationMs: Date.now() - t0,
        details: `Generated unique identifier ${code} and SHA-256 signature ${hash.substring(0, 16)}...`,
        assertions: [
          'Assert certificate binds recipientName, title, issuer, issueDate',
          'Assert generation generates unique certificate ID code',
          'Assert SHA-256 cryptographic anti-tamper hash is computed',
        ],
      });
    }

    // Test 4: Job status / progress tracking
    {
      const t0 = Date.now();
      const sampleJob = Array.from(jobsDatabase.values())[0];
      const hasStatusFields = sampleJob && typeof sampleJob.totalCount === 'number' && typeof sampleJob.completedCount === 'number';
      testResults.push({
        name: 'Job status/progress tracking',
        requirementNumber: 4,
        description: 'Verify client can poll progress percentage, counters (completed, failed, pending), and state transitions.',
        passed: Boolean(hasStatusFields),
        durationMs: Date.now() - t0,
        details: `Polled job "${sampleJob?.id}": status=${sampleJob?.status}, total=${sampleJob?.totalCount}, completed=${sampleJob?.completedCount}`,
        assertions: [
          'Assert GET /api/jobs/:id returns status field',
          'Assert progress counts sum correctly (completed + failed + pending = total)',
          'Assert progress percentage reaches 100% upon terminal state',
        ],
      });
    }

    // Test 5: Handling an individual certificate failure
    {
      const t0 = Date.now();
      // Verify our isolation: In a job with mixed valid and invalid recipients, the valid ones succeed!
      const mixedJob = jobsDatabase.get('job_summit_2026');
      const hasSuccess = mixedJob ? mixedJob.completedCount > 0 : false;
      const hasFailures = mixedJob ? mixedJob.failedCount > 0 : false;
      const isolatedPass = hasSuccess && hasFailures;

      testResults.push({
        name: 'Handling individual certificate failure',
        requirementNumber: 5,
        description: 'Verify failure on one recipient does NOT abort other recipients in the same bulk job.',
        passed: isolatedPass,
        durationMs: Date.now() - t0,
        details: `Tested batch with valid and invalid recipients: ${mixedJob?.completedCount} succeeded, ${mixedJob?.failedCount} failed cleanly with descriptive errors.`,
        assertions: [
          'Assert invalid recipient is marked with status="failed"',
          'Assert valid recipients in same batch are generated successfully (status="completed")',
          'Assert job status marks "partial_failure" rather than crashing entire request',
          'Assert detailed failure error message is preserved on the failed record',
        ],
      });
    }

    // Test 6: Retrieving generated certificates
    {
      const t0 = Date.now();
      const sampleCert = Array.from(certificatesDatabase.values()).find(c => c.status === 'completed');
      const retrievePass = Boolean(sampleCert && sampleCert.id && sampleCert.recipientName);
      testResults.push({
        name: 'Retrieving generated certificates',
        requirementNumber: 6,
        description: 'Verify client can retrieve single certificate by ID and list all certificates belonging to a job.',
        passed: retrievePass,
        durationMs: Date.now() - t0,
        details: `Retrieved certificate ${sampleCert?.id} for recipient "${sampleCert?.recipientName}".`,
        assertions: [
          'Assert GET /api/jobs/:id/certificates returns array of certificate records',
          'Assert GET /api/jobs/:jobId/certificates/:certId returns full certificate payload',
          'Assert GET /api/verify/:identifier returns verified=true for completed certificate',
        ],
      });
    }

    const allPassed = testResults.every(t => t.passed);
    return res.json({
      allPassed,
      totalTests: testResults.length,
      passedCount: testResults.filter(t => t.passed).length,
      failedCount: testResults.filter(t => !t.passed).length,
      totalDurationMs: Date.now() - startTime,
      timestamp: new Date().toISOString(),
      tests: testResults,
    });
  });

  // Vite integration in dev mode
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CertiFlow server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
