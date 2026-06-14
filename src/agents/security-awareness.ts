/**
 * Security Awareness Agent
 * Designs training programmes, phishing simulations, KPIs.
 */

interface AwarenessModule {
  id: string;
  title: string;
  audience: string[];
  duration: string;
  frequency: string;
  topics: string[];
  delivery: 'e-learning' | 'live-workshop' | 'video' | 'email-newsletter' | 'simulation';
  kpis: string[];
}

interface PhishingSimulation {
  name: string;
  difficulty: 'easy' | 'medium' | 'hard';
  template: string;
  targetAudience: string;
  successMetric: string;
  reportingInstructions: string;
}

export class SecurityAwarenessAgent {
  readonly role = 'security-awareness' as const;
  readonly capabilities = [
    'training-programme-design',
    'phishing-simulation',
    'security-culture-assessment',
    'kpi-dashboard',
    'policy-communication',
    'board-briefing',
  ];

  buildTrainingProgramme(): AwarenessModule[] {
    return [
      {
        id: 'AWARE-001',
        title: 'Security Fundamentals',
        audience: ['all-staff'],
        duration: '45 min',
        frequency: 'Annual + on-boarding',
        topics: [
          'Password hygiene and password managers',
          'Multi-factor authentication setup and use',
          'Recognising phishing emails and links',
          'Safe browsing and public Wi-Fi risks',
          'Clean desk and screen-lock policy',
          'Reporting security incidents',
        ],
        delivery: 'e-learning',
        kpis: ['Completion rate ≥95%', 'Assessment pass rate ≥80%', 'Phishing click rate ≤5% post-training'],
      },
      {
        id: 'AWARE-002',
        title: 'Phishing & Social Engineering',
        audience: ['all-staff'],
        duration: '20 min simulation + debrief',
        frequency: 'Quarterly',
        topics: [
          'Spear-phishing recognition',
          'Vishing (voice phishing) defence',
          'Smishing (SMS phishing)',
          'Pretexting and impersonation tactics',
          'How to report suspicious contact',
        ],
        delivery: 'simulation',
        kpis: ['Click rate <5%', 'Report rate >30%', 'Credential submission rate <1%'],
      },
      {
        id: 'AWARE-003',
        title: 'Secure Development Practices',
        audience: ['engineering', 'devops'],
        duration: '2 hours',
        frequency: 'Annual + on-boarding',
        topics: [
          'OWASP Top 10 — recognition and prevention',
          'Secrets management (never hardcode credentials)',
          'Supply chain security (dependency vetting)',
          'Secure code review checklist',
          'Responsible disclosure and bug bounty',
        ],
        delivery: 'live-workshop',
        kpis: ['SAST finding rate reduction ≥20% YoY', 'Secure code review completion rate ≥90%'],
      },
      {
        id: 'AWARE-004',
        title: 'Privileged User Security',
        audience: ['it-admins', 'senior-engineering', 'finance'],
        duration: '90 min',
        frequency: 'Annual',
        topics: [
          'PAM and just-in-time access',
          'Insider threat recognition and reporting',
          'Privileged credential hygiene',
          'Responding to social engineering targeting admins',
          'Incident response responsibilities',
        ],
        delivery: 'live-workshop',
        kpis: ['100% PAM adoption for privileged accounts', 'Zero shared credentials', 'Insider threat reporting awareness ≥90%'],
      },
      {
        id: 'AWARE-005',
        title: 'Data Protection & Privacy',
        audience: ['all-staff', 'customer-facing', 'hr', 'legal'],
        duration: '30 min',
        frequency: 'Annual',
        topics: [
          'What is personal data (PII, PHI, SPI)',
          'GDPR / CCPA rights and obligations',
          'Data classification and handling',
          'Data breach reporting (72-hour rule)',
          'Third-party data sharing restrictions',
        ],
        delivery: 'e-learning',
        kpis: ['Completion rate ≥95%', 'Data breach reports via proper channel ≥90%', 'DPO awareness ≥80%'],
      },
      {
        id: 'AWARE-006',
        title: 'AI & GenAI Security',
        audience: ['all-staff'],
        duration: '20 min',
        frequency: 'Annual + when policy updated',
        topics: [
          'Risks of entering sensitive data into public AI tools',
          'Prompt injection awareness',
          'Approved AI tools and shadow AI policy',
          'Deepfake and AI-generated phishing',
          'Data residency considerations for AI services',
        ],
        delivery: 'e-learning',
        kpis: ['Shadow AI tool usage reduction', 'AI data-handling policy awareness ≥90%'],
      },
    ];
  }

  buildPhishingSimulations(): PhishingSimulation[] {
    return [
      {
        name: 'IT Help Desk Password Reset',
        difficulty: 'easy',
        template: 'Email from "IT Support" asking user to verify credentials via a linked portal. Branded with company logo.',
        targetAudience: 'General staff (baseline measurement)',
        successMetric: 'User does not click link / enters no credentials / reports to security',
        reportingInstructions: 'Forward email to security@company.com or use Phish Alert Button in email client.',
      },
      {
        name: 'CFO Wire Transfer Request',
        difficulty: 'medium',
        template: 'Spear-phishing email appearing to come from CFO requesting urgent wire transfer, with plausible business context.',
        targetAudience: 'Finance team',
        successMetric: 'User verifies via out-of-band call to known CFO number before acting',
        reportingInstructions: 'Always call-back the requester on a known number. Report to CISO.',
      },
      {
        name: 'Shared Document Notification',
        difficulty: 'medium',
        template: 'Email mimicking SharePoint/Google Drive notification for a document shared by a colleague. Link leads to credential harvester.',
        targetAudience: 'All staff',
        successMetric: 'User does not click or enter credentials. Reports suspicious link.',
        reportingInstructions: 'Hover over links before clicking. Report to security team.',
      },
      {
        name: 'AI Tool Invitation',
        difficulty: 'hard',
        template: 'Email appearing to be from approved AI vendor inviting staff to try new feature. Requires "re-authentication" with SSO.',
        targetAudience: 'Engineering and product teams',
        successMetric: 'User does not authenticate. Queries IT before proceeding. Reports.',
        reportingInstructions: 'Do not authenticate to unrecognised apps. Report to security.',
      },
    ];
  }

  buildKPIDashboard(): Array<{ metric: string; target: string; measurement: string; frequency: string }> {
    return [
      { metric: 'Phishing simulation click rate', target: '<5%', measurement: 'Simulated phishing campaign results', frequency: 'Quarterly' },
      { metric: 'Phishing simulation report rate', target: '>30%', measurement: 'Phish Alert Button / forward-to-security rate', frequency: 'Quarterly' },
      { metric: 'Security training completion rate', target: '>95%', measurement: 'LMS completion records', frequency: 'Monthly' },
      { metric: 'Mean time to report an incident', target: '<1 hour', measurement: 'Ticketing system timestamps', frequency: 'Monthly' },
      { metric: 'Repeat offenders (clicked 3+ phishing emails)', target: '0 after targeted re-training', measurement: 'Simulation history per user', frequency: 'Quarterly' },
      { metric: 'Security culture score', target: '>70/100', measurement: 'Annual security culture survey (CIS methodology)', frequency: 'Annual' },
      { metric: 'Helpdesk security tickets from staff', target: 'Increasing trend', measurement: 'Tickets tagged as security-related', frequency: 'Monthly' },
      { metric: 'Data breach incidents attributable to human error', target: 'YoY reduction', measurement: 'Incident post-mortems root cause', frequency: 'Annual' },
    ];
  }

  formatProgrammeSummary(): string {
    const modules = this.buildTrainingProgramme();
    const lines = [
      `Security Awareness Programme — ${new Date().toDateString()}`,
      `${modules.length} training modules covering all staff and specialist audiences`,
      '',
    ];
    for (const m of modules) {
      lines.push(`[${m.id}] ${m.title}`);
      lines.push(`  Audience: ${m.audience.join(', ')}  |  Duration: ${m.duration}  |  Frequency: ${m.frequency}`);
      lines.push(`  Delivery: ${m.delivery}`);
      lines.push(`  KPIs: ${m.kpis.join(' | ')}`);
      lines.push('');
    }
    return lines.join('\n');
  }
}
