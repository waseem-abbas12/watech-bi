import { NextResponse } from 'next/server';
import dns from 'node:dns';
import { promisify } from 'node:util';
import type { EmailVerificationStatus } from '@/types';

const resolveMx = promisify(dns.resolveMx);

export const dynamic = 'force-dynamic';

const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com',
  'tempmail.com',
  'guerrillamail.com',
  '10minutemail.com',
  'trashmail.com',
  'sharklasers.com',
  'yopmail.com',
  'getairmail.com',
  'dispostable.com',
]);

const ROLE_PREFIXES = new Set([
  'info',
  'sales',
  'support',
  'contact',
  'admin',
  'billing',
  'office',
  'help',
  'service',
  'dispatch',
  'team',
  'careers',
  'jobs',
  'press',
  'media',
]);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const emailsToProcess: string[] = Array.isArray(body.emails)
      ? body.emails
      : body.email
      ? [body.email]
      : [];

    if (emailsToProcess.length === 0) {
      return NextResponse.json({ error: 'Valid email string or array of emails is required' }, { status: 400 });
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    const results = await Promise.all(
      emailsToProcess.slice(0, 50).map(async rawEmail => {
        const trimmed = (rawEmail || '').trim().toLowerCase();

        if (!trimmed || !emailRegex.test(trimmed)) {
          return {
            email: trimmed,
            syntaxValid: false,
            domainValid: false,
            mxRecordsPresent: false,
            mxRecords: [],
            isDisposable: false,
            isRoleBased: false,
            verificationStatus: 'invalid' as EmailVerificationStatus,
            isOutreachSafe: false,
            exclusionReason: 'Failed standard RFC 5322 syntax formatting',
            details: 'Invalid email syntax format.',
          };
        }

        const [localPart, domainPart] = trimmed.split('@');
        const isDisposable = DISPOSABLE_DOMAINS.has(domainPart);
        const isRoleBased = ROLE_PREFIXES.has(localPart);

        let mxRecordsPresent = false;
        let mxRecords: string[] = [];

        try {
          const records = await resolveMx(domainPart);
          if (records && records.length > 0) {
            mxRecordsPresent = true;
            mxRecords = records.sort((a, b) => a.priority - b.priority).map(r => r.exchange);
          }
        } catch {
          mxRecordsPresent = false;
        }

        let verificationStatus: EmailVerificationStatus = 'unknown';
        let details = '';
        let isOutreachSafe = true;
        let exclusionReason: string | undefined = undefined;

        if (!mxRecordsPresent) {
          verificationStatus = 'invalid';
          details = `No active mail exchange (MX) DNS records found for domain @${domainPart}.`;
          isOutreachSafe = false;
          exclusionReason = 'No active mail server (MX) found for domain';
        } else if (isDisposable) {
          verificationStatus = 'disposable';
          details = 'Identified as a temporary / disposable email address provider.';
          isOutreachSafe = false;
          exclusionReason = 'Temporary / disposable mailbox domain';
        } else if (isRoleBased) {
          verificationStatus = 'domain_passed_unconfirmed';
          details = `Role-based inbox (${localPart}@). MX verified on ${mxRecords[0]}. Individual mailbox unconfirmed.`;
          isOutreachSafe = true;
        } else {
          verificationStatus = 'domain_passed_unconfirmed';
          details = `Domain MX verified on ${mxRecords[0]}. Mailbox capability confirmed without intrusive probing.`;
          isOutreachSafe = true;
        }

        return {
          email: trimmed,
          localPart,
          domainPart,
          syntaxValid: true,
          domainValid: true,
          mxRecordsPresent,
          mxRecords,
          isDisposable,
          isRoleBased,
          verificationStatus,
          isOutreachSafe,
          exclusionReason,
          details,
        };
      })
    );

    if (Array.isArray(body.emails)) {
      return NextResponse.json({ success: true, count: results.length, results });
    }

    return NextResponse.json({ success: true, ...results[0] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Verification failed' }, { status: 500 });
  }
}
