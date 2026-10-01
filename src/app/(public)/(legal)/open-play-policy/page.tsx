import LegalPageLayout from "../LegalPageLayout";
import generateMetadata from "@/utils/generateMetadata";

export const metadata = generateMetadata({
  title: "Open Play Policy",
  description:
    "What you agree to when you join an open play on IcyPlay: you pay the venue directly, you are registered once the venue confirms your payment, and there are no refunds through IcyPlay.",
  path: "/open-play-policy",
});

const sections = [
  {
    title: "What open play is",
    content: (
      <>
        <p>
          An open play is a group session run by a venue on one of its courts. Instead of renting the whole
          court, you pay a registration fee per player and play with whoever else has joined. The venue sets
          the sport, the level, the most players it will take, the fee and the hours.
        </p>
        <p>
          The venue runs the session. IcyPlay lists it, takes your registration and passes your payment
          receipt to the venue to check.
        </p>
      </>
    ),
  },
  {
    title: "You pay the venue, not IcyPlay",
    content: (
      <>
        <p>
          Payment is made directly to the venue&apos;s own GCash account. IcyPlay does not receive, hold,
          process or forward your payment at any point, and has no ability to reverse one.
        </p>
        <p>
          Check the account name shown when you pay against the one your GCash app displays before you send
          anything. Money sent to the wrong number cannot be recovered by IcyPlay or by the venue.
        </p>
      </>
    ),
  },
  {
    title: "No refunds through IcyPlay",
    content: (
      <>
        <p>
          <strong>
            There are no refunds through IcyPlay for an open play registration, because IcyPlay never holds
            your money.
          </strong>{" "}
          If you cannot make a session, or something is wrong with your payment, speak to the venue directly.
          Whether they refund, move you to another date or do neither is their decision.
        </p>
        <p>
          The venue&apos;s phone number and email are shown on your registration, and in every email we send
          you about it.
        </p>
      </>
    ),
  },
  {
    title: "Your spot is held while you pay",
    content: (
      <>
        <p>
          When you proceed to payment, your spot is held for you for a set time, the same time the venue
          holds a court for a booking. The time left is shown on the page. Send your GCash receipt before it
          runs out and your spot stays held while the venue checks it.
        </p>
        <p>
          If the time runs out with no receipt, your spot is released for somebody else. Nothing is charged,
          and you can register again if there is still a spot.
        </p>
      </>
    ),
  },
  {
    title: "You are registered once the venue confirms",
    content: (
      <>
        <p>
          <strong>
            You are registered for an open play only once the venue has checked your receipt and confirmed
            it.
          </strong>{" "}
          Until then your spot is kept for you, but you are not registered. We email you the moment the venue
          confirms, and your registration shows it too.
        </p>
        <p>Please do not come to play before you have the confirmation.</p>
      </>
    ),
  },
  {
    title: "If the venue turns your payment down",
    content: (
      <>
        <p>
          The venue may turn a payment down, for example if the money has not arrived, the amount is wrong or
          the receipt cannot be read. If they do, you are not registered, your spot is released, and we email
          you the reason they gave.
        </p>
        <p>If you did send money, speak to the venue about it: you paid them directly.</p>
      </>
    ),
  },
  {
    title: "Registration closes before each session",
    content: (
      <>
        <p>
          Each open play closes registration a set time before each session starts, on the venue&apos;s own
          clock. After that, the session cannot be joined through IcyPlay. The time is shown on each date.
        </p>
      </>
    ),
  },
  {
    title: "Early-bird prices and the platform fee",
    content: (
      <>
        <p>
          Some open plays have an early-bird price for players who register a set time before each session.
          The discount comes off the venue&apos;s fee only, and it is shown before you proceed.
        </p>
        <p>
          Each registration carries IcyPlay&apos;s platform fee on top of the venue&apos;s fee. It is shown as
          its own line and included in the total you send the venue. It is not refundable through IcyPlay for
          the same reason nothing else is: we did not receive it from you.
        </p>
      </>
    ),
  },
  {
    title: "Cancelled sessions",
    content: (
      <>
        <p>
          A venue may cancel a session or end an open play. If a session you registered for is cancelled,
          speak to the venue about your payment: any refund, or a move to another date, is theirs to arrange.
        </p>
      </>
    ),
  },
  {
    title: "What the venue is responsible for",
    content: (
      <>
        <p>
          The session, the court, its condition, who plays, the level of play, the hours and the conduct of
          its staff are the venue&apos;s responsibility. IcyPlay lists what venues tell us and records what
          was agreed; it does not run the sessions.
        </p>
        <p>House rules and safety measures published on a venue&apos;s page form part of your registration.</p>
      </>
    ),
  },
];

function Page() {
  return (
    <LegalPageLayout
      backHref="/open-play"
      backLabel="Back to open play"
      title="Open Play Policy"
      effectiveDate="September 30, 2026"
      summary="You pay the venue directly, so IcyPlay holds none of your money and cannot refund it. Your spot is held while you pay, and you are registered only once the venue confirms your payment. Please read this before you join an open play."
      sections={sections}
    />
  );
}

export default Page;
