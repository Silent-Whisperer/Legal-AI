import { describe, it, expect } from 'vitest';
import { computeIndianLegalChecks } from '../server/src/services/indianLaw.ts';

describe('Indian Statutory Legal Compliance Engine', () => {
  it('correctly assesses an 11-month agreement as not requiring mandatory registration under Section 17', () => {
    const text = `
      LEAVE AND LICENSE AGREEMENT
      Executed in Bengaluru, Karnataka, India.
      The license shall be for a duration of 11 months only.
      Monthly license fee: Rs. 45,000 per month.
      Refundable security deposit: Rs. 90,000.
    `;
    const result = computeIndianLegalChecks(text, '11 Month Rental Agreement', 'CONTRACTUAL');

    expect(result).toBeDefined();
    expect(result?.isIndianJurisdiction).toBe(true);
    expect(result?.registrationRequired).toBe(false);
    expect(result?.registrationActSection17.isMandatoryRegistration).toBe(false);
    expect(result?.registrationNotice).toContain('11 months do not trigger mandatory registration');
  });

  it('correctly mandates registration under Section 17(1)(d) and Section 49 for a 24-month lease', () => {
    const text = `
      RESIDENTIAL LEASE AGREEMENT
      Property in Mumbai, Maharashtra, India.
      Term of Lease: 24 months commencing from October 1, 2026.
      Monthly rent: Rs. 85,000.
      Security deposit: Rs. 2,00,000.
    `;
    const result = computeIndianLegalChecks(text, '2 Year Lease Deed', 'CONTRACTUAL');

    expect(result).toBeDefined();
    expect(result?.registrationRequired).toBe(true);
    expect(result?.registrationActSection17.isMandatoryRegistration).toBe(true);
    expect(result?.registrationActSection17.statutoryBasis).toContain('Section 17(1)(d)');
    expect(result?.registrationActSection17.consequencesIfNotRegistered).toContain('Section 49');
  });

  it('detects Maharashtra Rent Control Act 1999 provisions for Mumbai/Pune agreements', () => {
    const text = `
      LEAVE AND LICENSE AGREEMENT
      This agreement is executed at Pune, Maharashtra, between Licensor and Licensee.
      Duration: 11 months. Monthly license fee: ₹35,000.
    `;
    const result = computeIndianLegalChecks(text, 'Pune Rental Agreement', 'CONTRACTUAL');

    expect(result).toBeDefined();
    expect(result?.stateTenancyFramework.jurisdiction).toBe('Maharashtra');
    expect(result?.stateTenancyAct).toContain('Maharashtra Rent Control Act 1999');
    expect(result?.stateTenancyFramework.complianceNote).toContain('Section 55');
  });

  it('flags post-employment non-compete clauses as void ab initio under Section 27', () => {
    const text = `
      EMPLOYMENT AGREEMENT (Bengaluru, India)
      Employee agrees that for a period of 2 years post termination, they shall not compete
      or engage in any competing business within India.
    `;
    const result = computeIndianLegalChecks(text, 'Tech Employment Agreement', 'CONTRACTUAL');

    expect(result?.nonCompeteNotice).toBeDefined();
    expect(result?.nonCompeteNotice).toContain('Section 27 of the Indian Contract Act 1872');
    expect(result?.nonCompeteNotice).toContain('void ab initio');
  });

  it('returns undefined for non-Indian or non-contractual documents', () => {
    const usLease = `
      CALIFORNIA RESIDENTIAL LEASE AGREEMENT
      San Francisco, CA 94105. Monthly rent: $3,200.
    `;
    const result1 = computeIndianLegalChecks(usLease, 'SF Lease', 'CONTRACTUAL');
    expect(result1).toBeUndefined();

    const indianCert = `
      Certificate of Merit awarded in New Delhi, India.
    `;
    const result2 = computeIndianLegalChecks(indianCert, 'Certificate', 'NON_CONTRACTUAL');
    expect(result2).toBeUndefined();
  });
});
