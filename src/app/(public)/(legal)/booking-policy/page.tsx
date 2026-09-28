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
          What you can do instead is ask to move it — to another court, other hours, or another
          date — which the venue approves. Each venue sets how many times one booking may be moved
          and how close to its start moves stop. See &ldquo;Moving a booking&rdquo; below.
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
          Choosing hours holds them for you while you pay. <strong>Each venue sets how long its own
          hold lasts</strong>, anywhere between five minutes and four hours — many keep it short,
          on the reasoning that paying by GCash takes a minute. The length that applies to your
          booking is shown counting down on the checkout page, and that countdown is the one that
          counts.
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
        <p>
          <strong>Each venue also sets how far ahead its courts can be booked</strong> — between a
          week and a month, today included, and fifteen days unless the venue says otherwise. The
          booking page shows only those days, and a date beyond them cannot be booked.
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
          A booking cannot be refunded, but it can be moved — to another court, to other hours, or
          to another date. This is the answer to something coming up, and it is what to reach for
          instead of asking to cancel.
        </p>
        <p>
          <strong>Every move is a request the venue approves.</strong> Until they do, your booking
          stays exactly where it is and the hours you asked for are held for you. If they decline
          it, nothing about your booking changes, you are told why, and the request is not counted
          against your moves.
        </p>
        <ul>
          <li>
            <strong>Only within the same venue, and the same sport.</strong> A move changes where
            in the building you are playing and when; it is not a way to swap what you booked for
            something else somewhere else.
          </li>
          <li>
            <strong>How much you booked does not change.</strong> An hourly booking moves the same
            number of hours it has, and a booking sold by the day moves the same number of days.
            Where those hours or days land is yours to choose. A move changes when and where a
            booking is, never how much of it there is.
          </li>
          <li>
            <strong>Not inside the venue&apos;s notice.</strong> Each venue sets how close to its
            start a booking can still be moved — between one day (24 hours) and a week, and two
            days unless the venue says otherwise. Once your booking is closer to its start than
            that, it can no longer be moved until it is under way. Your booking shows the notice
            its venue uses.
          </li>
          <li>
            <strong>An hourly booking can move before it starts, or while it is being played.</strong>{" "}
            A court that fails at two o&apos;clock is exactly when a move is worth most, and the
            whole hours still to come can go somewhere else. Once it is under way,{" "}
            <strong>only the court can change</strong> — the remaining hours travel at the times
            they already have, and are priced against the new court at those times. Once the last
            hour has been played there is nothing left to move.
          </li>
          <li>
            <strong>A whole day or a run of days must move before it begins.</strong> Once the first
            day is under way it stays where it is. Moving it at noon would leave you with a morning
            on one court and an afternoon on another, which is not what you booked.
          </li>
          <li>
            <strong>A limited number of times</strong>, set by each venue. Only moves the venue
            approves are counted. A booking that can be carried forward for ever is an option on the
            venue&apos;s calendar rather than a booking, and the venue is the one turning other
            people away to keep holding it.
          </li>
        </ul>
        <p>
          <strong>If the new court or the new hours cost more</strong>, you pay the difference and
          nothing else — you are buying no extra hours, so the platform fee does not change either.
          You are told what it comes to before you commit to anything, and the hours are held for
          you while you pay. <strong>The booking moves only once the venue has seen the
          payment</strong> and approved the move, and the venue can decline it, in which case your
          booking stays exactly where it was and you are told why. Any money you sent for the
          difference is with the venue, so ask them for it back.
        </p>
        <p>
          <strong>If they cost less</strong>, nothing is charged and nothing is returned. There are
          no refunds on this platform, and a move is what there is instead.
        </p>
        <p>
          A booking already being played moves only the hours still to come. The hours you have had
          stay on the court you had them on, at what they cost. The hours you leave go back on sale.
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
          cannot make it, ask to move the booking while you still can — before the venue&apos;s
          notice closes.
        </p>
        <p>
          If the venue cancels or closes — maintenance, weather, or anything else on their side —
          what happens next is between you and them, and we would expect them to make it right.
        </p>
        <p>
          A venue cannot move your booking for you. If a court develops a problem they will ask you
          to request a move yourself, and the move is then yours to ask for and yours to refuse.
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
      backHref="/#venues"
      backLabel="Back to courts"
      title="Booking Policy"
      summary="Bookings made through IcyPlay are final once confirmed. You pay the venue directly, so IcyPlay holds none of your money and cannot refund it. Please read this before you hold a court."
      sections={sections}
    />
  );
}

export default Page;
