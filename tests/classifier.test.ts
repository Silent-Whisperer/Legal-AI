import { describe, it, expect } from 'vitest';
import { classifyDocumentNature } from '../server/src/services/classifier.ts';

describe('Document Classification & Early Halting Engine', () => {
  it('correctly classifies a residential lease contract as CONTRACTUAL', () => {
    const leaseText = `
      RESIDENTIAL LEASE AGREEMENT
      This Agreement of Lease is made between Landlord John Doe and Tenant Jane Smith.
      The Tenant shall pay a monthly rent of $2,500 on the first day of each month.
      The security deposit shall be $5,000, refundable upon vacating.
      Tenant shall maintain the premises and not sublet without prior written consent.
    `;
    const result = classifyDocumentNature(leaseText, 'Standard Residential Lease');

    expect(result.nature).toBe('CONTRACTUAL');
    expect(result.isLegalDocument).toBe(true);
    expect(result.documentType).toBe('RESIDENTIAL_LEASE');
    expect(result.explanation).toContain('binding');
  });

  it('correctly classifies an employment offer as CONTRACTUAL', () => {
    const offerText = `
      OFFER OF EMPLOYMENT & EMPLOYEE AGREEMENT
      This agreement is made between Acme Tech Corp and Alex Johnson.
      Position: Senior AI Engineer. Gross CTC: $185,000 per annum.
      Employee shall serve a notice period of 30 days prior to resignation.
      Employee hereby agrees to hold confidential all proprietary information.
    `;
    const result = classifyDocumentNature(offerText, 'Employment Offer Letter');

    expect(result.nature).toBe('CONTRACTUAL');
    expect(result.isLegalDocument).toBe(true);
    expect(result.documentType).toBe('EMPLOYMENT_AGREEMENT');
  });

  it('correctly classifies a Non-Disclosure Agreement as CONTRACTUAL', () => {
    const ndaText = `
      MUTUAL NON-DISCLOSURE AGREEMENT
      This Non-Disclosure Agreement is entered into by and between Alpha Inc and Beta LLC.
      The parties mutually covenant to protect all confidential information.
      The receiving party shall not disclose proprietary technical data.
      Governing law: Uniform Trade Secrets Act.
    `;
    const result = classifyDocumentNature(ndaText, 'Mutual NDA');

    expect(result.nature).toBe('CONTRACTUAL');
    expect(result.isLegalDocument).toBe(true);
    expect(result.documentType).toBe('NON_DISCLOSURE_AGREEMENT');
  });

  it('correctly halts and classifies a Certificate of Achievement as NON_CONTRACTUAL', () => {
    const certText = `
      CERTIFICATE OF ACHIEVEMENT
      This certificate is proudly presented to
      Rahul Sharma
      in recognition of outstanding participation and successful completion of Build with AI Challenge.
      Certificate ID: HACK-2026-9981
      Date: 2026-09-15
      Issued by Google for Developers
    `;
    const result = classifyDocumentNature(certText, 'Certificate_Of_Completion.pdf');

    expect(result.nature).toBe('NON_CONTRACTUAL');
    expect(result.isLegalDocument).toBe(false);
    expect(result.nonLegalCategory).toBe('CERTIFICATE_OR_AWARD');
    expect(result.documentType).toBe('NON_CONTRACTUAL_RECORD');
    expect(result.detectedMetadata?.['Recipient']).toBe('Rahul Sharma');
    expect(result.detectedMetadata?.['Certificate ID']).toBe('HACK-2026-9981');
    expect(result.explanation).toContain('stopped after classification');
  });

  it('correctly classifies a Resume / CV as NON_CONTRACTUAL', () => {
    const cvText = `
      John Doe - Curriculum Vitae
      Professional Summary: Experienced Full Stack Engineer with 7 years of expertise in TypeScript and React.
      Technical Skills: Node.js, Python, PostgreSQL, Docker, Vite.
      Work Experience: Lead Architect at Cloud Solutions LLC (2022-Present).
      Education Qualifications: B.S. in Computer Science.
    `;
    const result = classifyDocumentNature(cvText, 'John_Doe_Resume.pdf');

    expect(result.nature).toBe('NON_CONTRACTUAL');
    expect(result.isLegalDocument).toBe(false);
    expect(result.nonLegalCategory).toBe('RESUME_OR_CV');
    expect(result.documentType).toBe('NON_CONTRACTUAL_RECORD');
    expect(result.explanation).toContain('Resume');
  });

  it('correctly classifies a standard commercial invoice as NON_CONTRACTUAL', () => {
    const invoiceText = `
      TAX INVOICE
      Invoice No: INV-2026-4412
      Bill of Supply
      GSTIN: 29AAAAA0000A1Z5
      Description: Web Hosting Annual Subscription
      Subtotal: $1,200.00
      Total Amount Due: $1,200.00
      Cash Receipt / Payment Received with thanks.
    `;
    const result = classifyDocumentNature(invoiceText, 'Hosting_Invoice.pdf');

    expect(result.nature).toBe('NON_CONTRACTUAL');
    expect(result.isLegalDocument).toBe(false);
    expect(result.nonLegalCategory).toBe('INVOICE_OR_RECEIPT');
  });

  it('correctly flags loose notes or fragments as UNCERTAIN', () => {
    const noteText = `
      Meeting notes from Tuesday afternoon:
      Discussed potential lease renewal options and parking space requirements.
      Maybe talk again next month.
    `;
    const result = classifyDocumentNature(noteText, 'Random_Notes.txt');

    expect(result.nature).toBe('UNCERTAIN');
    expect(result.isLegalDocument).toBe(false);
  });
});
