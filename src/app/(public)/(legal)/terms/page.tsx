import LegalPageLayout from "../LegalPageLayout";
import generateMetadata from "@/utils/generateMetadata";

export const metadata = generateMetadata({
  title: "Terms of Service",
  description:
    "The terms that govern your use of IcyPlay for booking sports courts and managing facilities.",
  path: "/terms",
});

const sections = [
  {
    title: "Acceptance and eligibility",
    content: (
      <>
        <p>
          By creating an account, accessing IcyPlay, or making or managing a
          booking, you agree to these Terms and our Privacy Policy. You must
          provide accurate information, have legal capacity to enter into this
          agreement, and use the Platform only for lawful purposes.
        </p>
        <p>
          If you act for a facility or business, you confirm that you are
          authorized to bind that organization.
        </p>
      </>
    ),
  },
  {
    title: "What IcyPlay provides",
    content: (
      <>
        <p>
          IcyPlay is a technology platform that helps customers discover sports
          facilities, view schedules, request or create court bookings, upload
          payment receipts, and receive booking updates. It also gives facility
          owners tools to manage facilities, courts, availability, payment
          instructions, receipt verification, bookings, and reports.
        </p>
        <p>
          Unless expressly stated otherwise, IcyPlay does not own or operate
          listed facilities and is not the provider of the underlying court
          rental or sports service.
        </p>
      </>
    ),
  },
  {
    title: "Accounts and security",
    content: (
      <ul>
        <li>
          Keep your login credentials confidential and notify IcyPlay promptly
          of suspected unauthorized access.
        </li>
        <li>
          You are responsible for activity performed through your account,
          except to the extent caused by IcyPlay's failure to use reasonable
          security measures.
        </li>
        <li>
          IcyPlay may verify account information and may suspend duplicate,
          fraudulent, misleading, or compromised accounts.
        </li>
      </ul>
    ),
  },
  {
    title: "Bookings and facility rules",
    content: (
      <>
        <p>
          A booking is subject to availability, facility acceptance or payment
          verification, displayed prices, time limits, house rules, and any
          cancellation policy shown before confirmation. Customers must arrive
          on time and follow reasonable safety, conduct, equipment, age, and
          venue requirements.
        </p>
        <p>
          Facility owners are responsible for the accuracy of their listings,
          schedules, prices, amenities, rules, and availability, and for
          honoring confirmed bookings except where cancellation is permitted.
        </p>
      </>
    ),
  },
  {
    title: "Payments, receipts, and platform fees",
    content: (
      <>
        <p>
          Under the current IcyPlay workflow, customers pay the facility owner
          directly using the owner's displayed QR code or payment instructions.
          IcyPlay does not directly receive, hold, or settle the customer's
          court-rental payment.
        </p>
        <p>
          The displayed amount may include the court rental and an applicable
          platform fee. Customers must upload authentic and readable proof of
          payment. The facility owner is responsible for verifying or rejecting
          the receipt. False or altered receipts may result in booking
          rejection, suspension, or legal action.
        </p>
      </>
    ),
  },
  {
    title: "Cancellations, refunds, and disputes",
    content: (
      <>
        <p>
          The cancellation, rescheduling, no-show, and refund terms disclosed
          for the selected facility or booking apply. Because payment is made
          directly to the facility owner, the facility owner is generally
          responsible for approved refunds. IcyPlay may assist with records and
          communication but does not guarantee a refund or resolve every
          dispute.
        </p>
        <p>
          Facility owners must apply their published policies fairly and comply
          with applicable consumer laws.
        </p>
      </>
    ),
  },
  {
    title: "Facility-owner obligations",
    content: (
      <ul>
        <li>
          Maintain lawful authority to list and operate each facility and court.
        </li>
        <li>
          Provide accurate payment details and protect customer receipts and
          personal information.
        </li>
        <li>Verify payments promptly and keep booking statuses accurate.</li>
        <li>
          Maintain safe premises, permits, insurance, and compliance required
          for operations.
        </li>
        <li>
          Pay platform charges billed under the facility owner's commercial
          agreement.
        </li>
      </ul>
    ),
  },
  {
    title: "Prohibited conduct",
    content: (
      <ul>
        <li>
          Fraud, fake bookings, altered receipts, chargeback abuse,
          impersonation, harassment, or unsafe conduct.
        </li>
        <li>
          Scraping, reverse engineering, malware, unauthorized access, or
          interference with Platform operation.
        </li>
        <li>
          Using another person's data without authority or posting unlawful,
          misleading, or infringing content.
        </li>
        <li>
          Circumventing applicable Platform fees or manipulating availability,
          prices, reviews, or reports.
        </li>
      </ul>
    ),
  },
  {
    title: "Content and intellectual property",
    content: (
      <>
        <p>
          IcyPlay and its licensors own the Platform software, branding,
          interface, and related materials. We grant you a limited, revocable,
          non-transferable right to use the Platform for its intended purpose.
        </p>
        <p>
          You retain ownership of content you submit, but grant IcyPlay a
          non-exclusive license to host, process, reproduce, and display it as
          necessary to operate, secure, and improve the Platform. You confirm
          that you have the right to submit that content.
        </p>
      </>
    ),
  },
  {
    title: "Service availability and changes",
    content: (
      <p>
        The Platform may occasionally be unavailable for maintenance, security,
        connectivity, or events outside reasonable control. IcyPlay may change
        features or these Terms and will provide reasonable notice when a
        material change affects users. Continued use after the effective date of
        updated Terms constitutes acceptance where permitted by law.
      </p>
    ),
  },
  {
    title: "Disclaimers and limitation of liability",
    content: (
      <>
        <p>
          The Platform is provided on an “as available” basis. To the extent
          permitted by law, IcyPlay does not guarantee uninterrupted access,
          facility quality, participant conduct, or that every listing or user
          submission is error-free.
        </p>
        <p>
          IcyPlay is not responsible for injury, property loss, facility
          closure, or disputes arising from the underlying sports service except
          where caused by IcyPlay's own unlawful act, gross negligence, or
          willful misconduct. Nothing in these Terms excludes rights or
          liabilities that cannot legally be excluded.
        </p>
      </>
    ),
  },
  {
    title: "Suspension and termination",
    content: (
      <p>
        You may stop using the Platform and request account closure. IcyPlay may
        restrict or terminate access for breach, fraud, security risk, legal
        requirements, or harm to users or the Platform. Provisions intended to
        survive—such as payment obligations, intellectual property, dispute, and
        liability provisions—remain effective.
      </p>
    ),
  },
  {
    title: "Governing law and contact",
    content: (
      <p>
        These Terms are governed by the laws of the Republic of the Philippines.
        The parties should first attempt good-faith resolution through IcyPlay's
        published support channels. Nothing limits a consumer's right to seek
        relief from a competent court or government authority.
      </p>
    ),
  },
];

export default function TermsPage() {
  return (
    <LegalPageLayout
      title="Terms of Service"
      summary="These Terms govern the use of IcyPlay by customers, facility owners, and authorized representatives. They explain the Platform's role, booking and payment responsibilities, acceptable use, and account rules."
      sections={sections}
    />
  );
}
