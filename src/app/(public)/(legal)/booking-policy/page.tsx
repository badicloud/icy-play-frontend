import LegalPageLayout from "../LegalPageLayout";
import generateMetadata from "@/utils/generateMetadata";

export const metadata = generateMetadata({
  title: "Booking Policy",
  description:
    "What you agree to when you hold a court on IcyPlay: bookings are final, payment goes straight to the venue, and there are no refunds through the platform.",
  path: "/booking-policy",
});

const sections = [
  {
    title: "Bookings are final",
    content: (
      <>
        <p>
          <strong>
            Once a venue has confirmed your booking, it cannot be cancelled through IcyPlay and no
            refund is made through IcyPlay.
          </strong>{" "}
          Read this before you hold a court. If you are not certain of the date, the hours or the
          people, do not book yet.
        </p>
        <p>
          This is not a fee we keep or a penalty we charge. It is a consequence of how the money
          moves: it never passes through us, so there is nothing for us to give back.
        </p>
        <p>
          What you can do instead is move it. A booking can be carried to another date up to three
          times — see &ldquo;Moving a booking&rdquo; below.
        </p>
      </>
    ),
  },
  {
    title: "You pay the venue, not IcyPlay",
    content: (
      <>
        <p>
          Payment is made directly to the venue&apos;s own GCash account. IcyPlay does not receive,
          hold, process or forward your payment at any point, and has no ability to reverse one.
        </p>
        <p>
          Check the account name shown at checkout against the one your GCash app displays before
          you send anything. Money sent to the wrong number cannot be recovered by IcyPlay or by the
          venue.
        </p>
      </>
    ),
  },
  {
    title: "Holding a court",
    content: (
      <>
        <p>
          Choosing hours holds them for you while you pay. The hold lasts thirty minutes at most
          venues; a venue may set its own length, and the length that applies is shown counting down
          on the checkout page.
        </p>
        <p>
          Nothing is charged for a hold. If no payment confirmation arrives before the hold runs
          out, the hours go back on sale automatically and the booking ends. You may book them again
          if they are still free.
        </p>
        <p>
          Uploading your receipt stops the clock. From that point the booking waits on the venue
          rather than on you, and the hold will not lapse while they check it.
        </p>
      </>
    ),
  },
  {
    title: "Confirmation is a person, not a machine",
    content: (
      <>
        <p>
          A booking is not confirmed by paying. Somebody at the venue checks your payment against
          their own account and confirms it. You will be emailed when they do.
        </p>
        <p>
          Until that happens the court is held for you but not yet yours. Please do not travel to
          the venue on the strength of an unconfirmed booking.
        </p>
      </>
    ),
  },
  {
    title: "When a venue turns a booking down",
    content: (
      <>
        <p>
          A venue may decline a booking — most often because the amount received does not match the
          total, or the receipt does not correspond to a payment they can find. The hours go back on
          sale and the reason they gave is shown on your booking.
        </p>
        <p>
          Any money you actually sent is between you and the venue. Contact them using the details
          on the court&apos;s page. IcyPlay can show you what was recorded, but cannot return funds
          it never held.
        </p>
      </>
    ),
  },
  {
    title: "Moving a booking",
    content: (
      <>
        <p>
          A booking cannot be refunded, but it can be moved to another date. This is the answer to
          something coming up, and it is what to reach for instead of asking to cancel.
        </p>
        <ul>
          <li>
            <strong>Three times.</strong> After the third move the date is settled. A booking that
            can be carried forward for ever is an option on the venue&apos;s calendar rather than a
            booking, and the venue is the one turning other people away to keep holding it.
          </li>
          <li>
            <strong>More than 24 hours before it starts.</strong> Inside the last day the hour stays
            where it is. The venue has kept it free and turned others away.
          </li>
          <li>
            <strong>The hours do not change.</strong> A booking from 11am to 4pm moves to 11am to
            4pm on another date, on the same court, for the same number of days.
          </li>
          <li>
            <strong>Weekday for a weekday, weekend for a weekend</strong>, and not onto a holiday.
            Courts are priced differently on those days, and a move that changed the price would be
            a second payment or a refund rather than a move.
          </li>
        </ul>
        <p>
          The hours you leave go straight back on sale, and the total stays exactly as it was.
          Nothing further is charged and nothing is returned.
        </p>
      </>
    ),
  },
  {
    title: "No-shows and closures",
    content: (
      <>
        <p>
          Not turning up does not entitle you to a refund or a replacement booking. If you know you
          cannot make it, move the booking while you still can.
        </p>
        <p>
          If the venue cancels or closes — maintenance, weather, or anything else on their side —
          what happens next is between you and them, and we would expect them to make it right.
        </p>
      </>
    ),
  },
  {
    title: "Platform fee",
    content: (
      <>
        <p>
          A small platform fee applies per booked hour. It is shown separately from the court&apos;s
          own rate wherever a price appears — on the availability grid, at checkout, and on your
          booking — and is included in the total you send the venue.
        </p>
        <p>
          The fee follows the booking. It is not refundable through IcyPlay for the same reason
          nothing else is: we did not receive it from you.
        </p>
      </>
    ),
  },
  {
    title: "What the venue is responsible for",
    content: (
      <>
        <p>
          The court, its condition, its opening hours, the rates it charges and the conduct of its
          staff are the venue&apos;s responsibility. IcyPlay lists what venues tell us and records
          what was agreed; it does not operate the courts.
        </p>
        <p>
          House rules and safety measures published on a court&apos;s page form part of your booking.
        </p>
      </>
    ),
  },
];

function Page() {
  return (
    <LegalPageLayout
      backHref="/#courts"
      backLabel="Back to courts"
      title="Booking Policy"
      summary="Bookings made through IcyPlay are final once confirmed. You pay the venue directly, so IcyPlay holds none of your money and cannot refund it. Please read this before you hold a court."
      sections={sections}
    />
  );
}

export default Page;
