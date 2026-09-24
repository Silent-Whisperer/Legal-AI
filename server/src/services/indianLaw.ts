import { DocumentClassificationNature, IndianLegalChecks } from '../types.ts';

export function computeIndianLegalChecks(
  rawText: string,
  docTitle: string,
  classificationNature: DocumentClassificationNature
): IndianLegalChecks | undefined {
  if (classificationNature !== 'CONTRACTUAL') {
    return undefined;
  }

  const combined = (rawText + ' ' + docTitle).toLowerCase();
  const isIndian = /\b(?:india|indian|bengaluru|bangalore|mumbai|delhi|pune|karnataka|maharashtra|tamil\s+nadu|chennai|hyderabad|telangana|gurgaon|noida|kolkata|west\s+bengal|rupee|rupees|rs\.?|inr|₹|lakh|lakhs|crore|crores|indian\s+contract\s+act|model\s+tenancy\s+act)\b/i.test(combined);

  if (!isIndian) {
    return undefined;
  }

  const isMaharashtra = /\b(?:maharashtra|mumbai|pune|thane|navi\s+mumbai|leave\s+and\s+license)\b/i.test(combined);
  const isKarnataka = /\b(?:karnataka|bengaluru|bangalore|mysuru)\b/i.test(combined);
  const isTamilNadu = /\b(?:tamil\s+nadu|chennai|coimbatore|madurai)\b/i.test(combined);
  const isDelhi = /\b(?:delhi|new\s+delhi|ncr|noida|gurgaon|gurugram)\b/i.test(combined);

  // Check 12+ months vs 11 months for Section 17 Registration Act 1908
  const isTwelveMonthsOrMore = /\b(?:12\s*months?|24\s*months?|36\s*months?|1\s*year|2\s*years?|3\s*years?|multi-year|yearly)\b/i.test(combined);
  const isElevenMonths = /\b(?:11\s*months?|eleven\s*months?)\b/i.test(combined);

  const isMandatoryRegistration = isTwelveMonthsOrMore && !isElevenMonths;

  const registrationActSection17 = {
    isMandatoryRegistration,
    statutoryBasis: 'Section 17(1)(d) read with Section 49, Registration Act, 1908',
    summary: isMandatoryRegistration
      ? 'Under Section 17(1)(d) of the Registration Act 1908, leases of immovable property from year to year, or for any term exceeding one year (12+ months), or reserving a yearly rent, require MANDATORY registration before the Sub-Registrar.'
      : 'Agreements executed for 11 months do not trigger mandatory registration under Section 17 of the Registration Act 1908, but remain subject to state stamp duty requirements.',
    consequencesIfNotRegistered: isMandatoryRegistration
      ? 'Under Section 49 of the Registration Act 1908, an unregistered 12+ month lease cannot affect immovable property or be received as primary evidence of any transaction affecting such property in court.'
      : 'An unregistered 11-month agreement can be admitted in evidence if adequately stamped under applicable State Stamp Act schedules.'
  };

  // State Tenancy Framework
  let jurisdictionName = 'National / State Rent Framework';
  let applicableAct = 'State Rent Control Act & Model Tenancy Act';
  let depositRule = 'Security deposit subject to local customary guidelines.';
  let complianceNote = 'Ensure agreement complies with local state rent authority procedures.';
  let stateTenancySpecifics: string[] = [
    'Tenancy relationships governed by state-specific rent control and model tenancy legislation',
    'Advance written notice required for landlord property inspections'
  ];

  if (isMaharashtra) {
    jurisdictionName = 'Maharashtra';
    applicableAct = 'Maharashtra Rent Control Act 1999 (Leave & License §§ 24 & 55)';
    depositRule = 'Interest-free refundable security deposit must be returned in full upon licensee handing over vacant possession.';
    complianceNote = 'Section 55 imposes a statutory obligation on the licensor/landlord to register the leave and license agreement in writing. Section 24 allows summary eviction before the Competent Authority upon expiry.';
    stateTenancySpecifics = [
      'Section 55 makes written and registered agreement compulsory on the licensor',
      'Section 24 summary procedure before the Competent Authority on license expiry',
      'Prompt return of interest-free security deposit upon handing over key possession'
    ];
  } else if (isKarnataka) {
    jurisdictionName = 'Karnataka';
    applicableAct = 'Karnataka Model Tenancy Act & Karnataka Rent Act 1999';
    depositRule = 'Model Tenancy Act § 11 caps residential security deposits at a maximum of 2 months rent (commercial capped at 6 months). Customary 10-month deposits in Bengaluru are legally non-compliant under the Model Act.';
    complianceNote = 'Requires mandatory 24-hour advance written notice before physical entry and statutory deposit refund within 30 days after tenant vacates.';
    stateTenancySpecifics = [
      'Model Tenancy Act benchmarks residential security deposits at maximum 2 months rent',
      'Mandatory 24-hour advance written notice before physical entry for inspection',
      'Statutory deposit refund required within 30 days after handing over vacant possession'
    ];
  } else if (isTamilNadu) {
    jurisdictionName = 'Tamil Nadu';
    applicableAct = 'Tamil Nadu Regulation of Rights and Responsibilities of Landlords and Tenants Act, 2017';
    depositRule = 'Security deposit capped at a maximum of 3 months rent.';
    complianceNote = 'Mandatory tenancy registration with the Rent Authority portal (tenancy.tn.gov.in) within 90 days of execution.';
    stateTenancySpecifics = [
      'Mandatory registration on Tamil Nadu Tenancy portal within 90 days',
      'Security deposit capped at maximum 3 months rent',
      'Strict dispute resolution through Rent Court / Rent Tribunal'
    ];
  } else if (isDelhi) {
    jurisdictionName = 'Delhi / NCR';
    applicableAct = 'Delhi Rent Control Act 1958 & Transfer of Property Act 1882';
    depositRule = 'Standard customary practice of 1–2 months security deposit.';
    complianceNote = 'Properties outside DRC rent thresholds fall under Transfer of Property Act 1882 with standard eviction proceedings.';
    stateTenancySpecifics = [
      'Tenancy notice periods governed by Section 106 Transfer of Property Act 1882',
      'Standard 15-day notice for month-to-month leases without contrary agreement'
    ];
  }

  // Stamp paper notice
  const stampDutyNotice = 'Under the Indian Stamp Act 1899 and respective State Stamp Acts, legal agreements must be executed on non-judicial e-stamp paper of appropriate denomination (e.g., ₹100, ₹200, ₹500, or percentage-based) to be legally admissible under Section 35.';

  // Non-compete notice under Section 27
  const hasNonCompete = /\b(?:non-compete|competing\s+business|restraint\s+of\s+trade|shall\s+not\s+compete)\b/i.test(combined);
  const nonCompeteNotice = hasNonCompete
    ? 'Under Section 27 of the Indian Contract Act 1872 and Supreme Court precedent (Percept D\'Mark v. Zaheer Khan), all post-employment non-compete covenants are void ab initio and completely unenforceable in India.'
    : undefined;

  // Deposit forfeiture notice under Section 74
  const hasForfeiture = /\b(?:forfeit|forfeiture|lock-in)\b/i.test(combined) && /\b(?:deposit|caution\s+money)\b/i.test(combined);
  const depositForfeitureNotice = hasForfeiture
    ? 'Under Section 74 of the Indian Contract Act 1872 (Kailash Nath Associates v. DDA), automatic forfeiture of a security deposit without proving actual financial loss constitutes an illegal penal clause.'
    : undefined;

  return {
    isIndianJurisdiction: true,
    registrationRequired: isMandatoryRegistration,
    registrationNotice: registrationActSection17.summary,
    registrationActSection17,
    stateTenancyAct: applicableAct,
    stateTenancyFramework: {
      jurisdiction: jurisdictionName,
      applicableAct,
      depositRule,
      complianceNote
    },
    stateTenancySpecifics,
    stampDutyNotice,
    nonCompeteNotice,
    depositForfeitureNotice
  };
}
