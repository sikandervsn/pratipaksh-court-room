export interface Sample {
  id: string;
  label: string;
  side: string;
  state: string;
  text: string;
}

export const RENTAL_SAMPLE = `RENTAL AGREEMENT

This Rental Agreement is made at Bengaluru on 1st December 2026 between Mr. Rakesh Malhotra, residing at 14, 5th Cross, Indiranagar, Bengaluru (hereinafter "the LANDLORD") and Ms. Ananya Iyer, residing at Flat 3B, Lakeview Residency, HSR Layout, Bengaluru (hereinafter "the TENANT").

1. TERM: The Landlord lets the residential flat No. 3B, Lakeview Residency, HSR Layout, Bengaluru to the Tenant for a period of eleven (11) months commencing 1st December 2026.

2. RENT: The monthly rent shall be Rs. 35,000/- payable on or before the 5th of every month. The Landlord may increase the rent at any time during the term by giving 7 days' notice, and the Tenant shall pay the increased rent.

3. SECURITY DEPOSIT: The Tenant has paid an interest-free security deposit of Rs. 3,50,000/- (ten months' rent). The deposit shall be refunded within 90 days after the Tenant vacates, after deducting painting charges of one month's rent, cleaning charges, and any other amounts the Landlord deems fit. The Landlord's decision on deductions shall be final.

4. LOCK-IN AND TERMINATION: There is a lock-in of 11 months for the Tenant. If the Tenant vacates for any reason before 11 months, the entire security deposit shall stand forfeited. The Landlord may terminate this agreement at any time by giving 15 days' notice without assigning any reason.

5. LATE PAYMENT: If rent is delayed beyond the 5th, the Tenant shall pay a penalty of Rs. 1,000/- per day. If rent remains unpaid for 10 days, the Landlord shall be entitled to disconnect electricity and water supply to the premises until payment.

6. INSPECTION: The Landlord or his agents may enter and inspect the premises at any time without prior notice.

7. REPAIRS: All repairs of whatever nature, including structural repairs, seepage, plumbing and electrical faults, shall be done by the Tenant at her own cost.

8. GUESTS AND USE: The Tenant shall not have overnight guests without prior written permission of the Landlord.

9. INDEMNITY: The Tenant shall indemnify the Landlord against all losses, damages and claims of whatever nature arising in relation to the premises, howsoever caused, including due to the Landlord's own negligence.

10. CLAIMS: Any claim by the Tenant arising out of this Agreement, including for refund of deposit, must be made in writing within 30 days of vacating, failing which the claim shall stand waived and extinguished forever.

11. ARBITRATION: All disputes shall be referred to the sole arbitration of a person nominated by the Landlord, whose decision shall be final and binding. The seat of arbitration shall be Delhi.

12. CRIMINAL LIABILITY: Any misrepresentation by the Tenant regarding her employment or income shall be treated as cheating punishable under Section 420 IPC, and the Landlord may lodge a complaint under Section 154 CrPC.

13. Both parties have read and understood the terms of this agreement and sign it out of their own free will.

LANDLORD: Rakesh Malhotra          TENANT: Ananya Iyer
Witnesses: 1. ____________  2. ____________`;

export const EMPLOYMENT_SAMPLE = `EMPLOYMENT AGREEMENT

This Employment Agreement is entered into on 10 November 2026 between NexaByte Technologies Pvt. Ltd., a company incorporated under the Companies Act, 2013, having its registered office at Pune (the "Company"), and Mr. Arjun Deshpande (the "Employee").

1. POSITION: The Employee is appointed as Senior Software Engineer at an annual CTC of Rs. 24,00,000/-.

2. PROBATION: The Employee shall be on probation for 12 months, extendable at the sole discretion of the Company. During probation the Company may terminate employment without notice or any payment.

3. NOTICE PERIOD: After confirmation, the Employee must give 90 days' notice to resign. The Company may terminate the Employee with 7 days' notice. The Company may at its discretion refuse to accept the resignation.

4. SERVICE BOND: The Employee shall serve the Company for a minimum of 3 years. If the Employee leaves before 3 years for any reason, he shall pay the Company Rs. 5,00,000/- as liquidated damages, irrespective of any loss suffered by the Company.

5. NON-COMPETE: For 2 years after leaving the Company for any reason, the Employee shall not join, consult for, or start any business in the software industry anywhere in India.

6. FULL AND FINAL SETTLEMENT: Full and final settlement, including unpaid salary, shall be processed within 90 days of the last working day, only after the Employee obtains clearance from all departments.

7. DEDUCTIONS: The Company may deduct from salary any amount it considers due from the Employee, including training costs, without limit.

8. INTELLECTUAL PROPERTY: All inventions, code and works created by the Employee at any time during employment, including on personal time and personal devices unrelated to Company business, shall belong exclusively to the Company.

9. MONITORING: The Employee consents to the Company monitoring all personal devices, personal email and social media accounts, during and after employment, for any purpose the Company deems fit.

10. JURISDICTION: The Employee waives the right to approach any court, tribunal or labour authority in respect of any dispute; all disputes shall be decided finally by the Company's HR Head.

11. GOVERNING LAW: This agreement is governed by the laws of India.

For NexaByte Technologies Pvt. Ltd.        Employee
(Authorised Signatory)                      Arjun Deshpande`;

export const SAMPLES: Sample[] = [
  { id: "rental", label: "🏠 Rental agreement (Bengaluru)", side: "Tenant", state: "Karnataka", text: RENTAL_SAMPLE },
  { id: "employment", label: "💼 Employment contract (Pune)", side: "Employee", state: "Maharashtra", text: EMPLOYMENT_SAMPLE },
];
