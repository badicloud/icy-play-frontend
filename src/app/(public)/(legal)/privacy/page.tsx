import LegalPageLayout from "../LegalPageLayout";
import generateMetadata from "@/utils/generateMetadata";

export const metadata = generateMetadata({
  title: "Privacy Policy",
  description:
    "How IcyPlay collects, uses and protects your personal information when you book a court.",
  path: "/privacy",
});

const sections = [
  {
    title: "Scope and privacy principles",
    content: (
      <p>
        This Privacy Policy explains how IcyPlay collects, uses, shares, stores,
        and protects personal data when customers, facility owners, staff, and
        visitors use the Platform. We process data for declared, specific, and
        legitimate purposes and seek to collect only information reasonably
        necessary for those purposes.
      </p>
    ),
  },
  {
    title: "Personal data we collect",
    content: (
      <ul>
        <li>
          Account data, including name, email address, phone number, role,
          password hash, and account status.
        </li>
        <li>
          Booking data, including selected facility, court, schedule, price,
          platform fee, booking status, and cancellation or dispute history.
        </li>
        <li>
          Payment-related records, such as facility-owner payment instructions
          and customer-uploaded receipts. IcyPlay does not currently collect or
          hold the customer's direct court-rental payment.
        </li>
        <li>
          Facility-owner data, including business, facility, court, schedule,
          pricing, billing, verification, and authorized representative details.
        </li>
        <li>
          Technical and usage data, such as IP address, device/browser
          information, timestamps, authentication events, logs, cookies, and
          interactions needed for security and operation.
        </li>
        <li>
          Session records for each device you sign in from, including the
          browser and operating system reported by that device, its IP address,
          and when the session was created and last used. You can view and end
          these sessions at any time from your account page.
        </li>
        <li>
          Communications, support requests, reports, feedback, and content you
          submit.
        </li>
      </ul>
    ),
  },
  {
    title: "How we use personal data",
    content: (
      <ul>
        <li>
          Create and secure accounts, authenticate users, and determine access
          permissions.
        </li>
        <li>
          Provide court search, availability, booking, receipt upload, payment
          verification, notifications, reports, and customer support.
        </li>
        <li>
          Prevent fraud, investigate altered receipts or account abuse, protect
          users, and maintain audit and security logs.
        </li>
        <li>
          Calculate and report applicable platform fees and administer
          facility-owner billing.
        </li>
        <li>
          Comply with legal obligations, respond to lawful requests, establish
          or defend legal claims, and enforce Platform rules.
        </li>
        <li>
          Analyze and improve reliability, accessibility, and user experience
          using aggregated or appropriately protected data.
        </li>
        <li>
          Send marketing only where permitted and subject to your right to opt
          out.
        </li>
      </ul>
    ),
  },
  {
    title: "Legal bases and consent",
    content: (
      <p>
        Depending on the processing activity, IcyPlay relies on your consent,
        performance of a contract or requested service, compliance with legal
        obligations, protection of lawful rights, or legitimate interests that
        do not override your fundamental rights. Where processing relies on
        consent, you may withdraw it, although withdrawal does not affect prior
        lawful processing and may prevent delivery of features that require the
        data.
      </p>
    ),
  },
  {
    title: "When we share data",
    content: (
      <>
        <p>
          We may share necessary data with the facility owner involved in your
          booking; authorized facility staff; hosting, authentication,
          communications, analytics, security, and support providers acting
          under appropriate safeguards; professional advisers; and government
          authorities when legally required.
        </p>
        <p>
          Facility owners receive booking and receipt information needed to
          verify payment and deliver the booked service. Facility owners must
          use this information only for legitimate booking, accounting, safety,
          dispute, and legal purposes.
        </p>
        <p>We do not sell personal data.</p>
      </>
    ),
  },
  {
    title: "International processing",
    content: (
      <p>
        Some service providers may process data outside the Philippines. Where
        this occurs, IcyPlay will use contractual, organizational, and technical
        safeguards reasonably designed to maintain protection consistent with
        applicable Philippine privacy requirements.
      </p>
    ),
  },
  {
    title: "Retention",
    content: (
      <p>
        We retain personal data only as long as reasonably necessary for the
        purposes described, including active accounts and bookings, payment
        verification, facility-owner billing, fraud prevention, dispute
        handling, legal claims, tax/accounting requirements, and security.
        Retention periods vary by record type. Data is securely deleted or
        anonymized when it is no longer required, subject to lawful exceptions.
      </p>
    ),
  },
  {
    title: "Security",
    content: (
      <p>
        We use reasonable organizational, physical, and technical measures
        designed to protect personal data, including access controls, password
        hashing, role-based permissions, secure transport, logging, backups, and
        incident-response procedures. No system is completely secure, so users
        should maintain strong passwords and promptly report suspicious
        activity.
      </p>
    ),
  },
  {
    title: "Your privacy rights",
    content: (
      <>
        <p>
          Subject to applicable law, you may exercise rights to be informed,
          access your data, object to certain processing, correct inaccurate
          data, request erasure or blocking, obtain portable data where
          applicable, withdraw consent, claim damages where legally available,
          and file a complaint with the National Privacy Commission.
        </p>
        <p>
          We may verify your identity and retain limited records when necessary
          to meet legal, security, contractual, or dispute obligations.
        </p>
      </>
    ),
  },
  {
    title: "Cookies and similar technologies",
    content: (
      <p>
        IcyPlay may use essential cookies or local storage for authentication,
        security, preferences, and session continuity. Optional analytics or
        marketing technologies should be activated only with any notice or
        consent required by law. Browser controls may block cookies, but
        essential Platform features may then stop working correctly.
      </p>
    ),
  },
  {
    title: "Children",
    content: (
      <p>
        The Platform is not intended for children who cannot lawfully provide
        consent or enter into the relevant transaction without a parent or
        guardian. Where a minor is permitted to participate, the responsible
        adult must supervise the account and booking and provide any legally
        required authorization.
      </p>
    ),
  },
  {
    title: "Policy changes",
    content: (
      <p>
        We may update this Policy to reflect Platform, legal, or operational
        changes. We will post the updated effective date and provide reasonable
        notice of material changes. If consent is required for a new processing
        purpose, we will request it before that processing.
      </p>
    ),
  },
  {
    title: "Contact and complaints",
    content: (
      <p>
        To exercise privacy rights or raise a privacy concern, use the official
        privacy or support contact published in the IcyPlay Platform. Please
        include enough information to identify your account and request. You may
        also lodge a complaint with the Philippine National Privacy Commission.
      </p>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <LegalPageLayout
      title="Privacy Policy"
      summary="IcyPlay respects your privacy and is committed to handling personal data transparently and responsibly in accordance with the Philippine Data Privacy Act of 2012, its Implementing Rules and Regulations, and other applicable requirements."
      sections={sections}
    />
  );
}
