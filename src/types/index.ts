export type CertificateTheme = 'gold' | 'sapphire' | 'emerald' | 'ruby';

export type JobStatus = 'queued' | 'processing' | 'completed' | 'partial_failure' | 'failed';

export type CertificateStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface RecipientInput {
  name: string;
  email: string;
  metadata?: Record<string, string>;
}

export interface CertificateRecord {
  id: string;
  jobId: string;
  recipientName: string;
  recipientEmail: string;
  title: string;
  issuer: string;
  issuerTitle?: string;
  issueDate: string;
  status: CertificateStatus;
  errorMessage?: string;
  verificationCode: string;
  hash: string;
  certificateUrl?: string;
  createdAt: string;
  completedAt?: string;
  emailStatus?: 'pending' | 'delivered' | 'failed';
  dispatchId?: string;
}

export interface JobRecord {
  id: string;
  title: string;
  issuer: string;
  issuerTitle: string;
  issueDate: string;
  templateTheme: CertificateTheme;
  status: JobStatus;
  totalCount: number;
  completedCount: number;
  failedCount: number;
  pendingCount: number;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  recipients?: CertificateRecord[];
  sendEmail?: boolean;
}

export interface TestResultItem {
  name: string;
  requirementNumber: number;
  description: string;
  passed: boolean;
  durationMs: number;
  details: string;
  assertions: string[];
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

export interface TestSuiteResponse {
  allPassed: boolean;
  totalTests: number;
  passedCount: number;
  failedCount: number;
  totalDurationMs: number;
  timestamp: string;
  tests: TestResultItem[];
}
