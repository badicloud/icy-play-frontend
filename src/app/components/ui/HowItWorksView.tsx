import Link from "next/link";
import { anchor } from "@/app/(public)/(legal)/LegalPageLayout";
import PublicFooter from "./PublicFooter";
import PublicHeader from "./PublicHeader";

/**
 * The four things that happen between wanting a court and having one.
 *
 * Written from what the system actually does rather than from what sounds
 * reassuring. A customer who is told "instant booking" and then meets a
 * thirty-minute hold and a person checking a receipt feels misled by the page,
 * not helped by it.
 */
const steps = [
  {
    title: "Find a court",
    body: "Search by sport, city or venue. Every court shows what it costs an hour, when it is open, and whether it is covered — before you pick anything.",
  },
  {
    title: "Pick your hours",
    body: "Take single hours, a whole day, or a run of up to seven days. The grid shows what is already taken, and adds up what you are choosing as you go — the court, the platform fee, and the total.",
  },
  {
    title: "Pay the venue",
    body: "You pay the venue directly by GCash, using their own number or QR code. IcyPlay never handles the money. Send them a screenshot of the confirmation and the court is yours while they check it.",
  },
  {
    title: "Somebody confirms it",
    body: "A person at the venue checks the payment against their account and confirms the booking. You get an email the moment they do. Turn up and play.",
  },
];

const rates = [
  {
    label: "Standard",
    always: true,
    body: "The ordinary hourly rate for that sport on that court. Every court has one, and it is what you pay whenever none of the others below applies.",
  },
  {
    label: "Peak",
    always: false,
    body: "A busier window the venue sets — often weekday evenings — charged at a higher rate inside those hours only.",
  },
  {
    label: "Weekend",
    always: false,
    body: "Saturdays and Sundays, if the venue prices them differently from the rest of the week.",
  },
  {
    label: "Holiday",
    always: false,
    body: "Days on the Philippine holiday calendar the platform keeps.",
  },
];

const questions = [
  {
    q: "What does the hold mean?",
    a: "Choosing hours holds them for you while you pay — thirty minutes at most venues, and the venue can set its own. If nothing arrives in that time the hours go back on sale and nothing is charged. Uploading your receipt stops the clock: from then on you are waiting on the venue, not the other way round.",
    policy: "Holding a court",
  },
  {
    q: "Can I cancel?",
    a: "No, and there are no refunds through IcyPlay — you pay the venue directly, so we never hold your money and have nothing to give back. What you can do instead is move the booking to another date.",
    policy: "Bookings are final",
  },
  {
    q: "How do I move a booking?",
    a: "Open it from My bookings and pick another date — up to three times, as long as it is more than 24 hours before it starts. The hours, the court and the number of days stay exactly as they are, which is what keeps the total identical: nothing further is charged and nothing is returned. A weekday booking moves to a weekday and a weekend one to a weekend, because those days are priced differently. The hours you leave go straight back on sale.",
    policy: "Moving a booking",
  },
  {
    q: "What is the platform fee?",
    a: "A small amount per booked hour, shown separately from the court's own rate everywhere it appears — on the grid, at checkout, and on your booking. It is part of what you send the venue, and the venue settles with IcyPlay afterwards.",
    policy: "Platform fee",
  },
  {
    q: "Why does a court appear more than once?",
    a: "A single floor is often marked out for more than one sport, and sometimes into several playable courts — a hall might be one basketball court or three pickleball courts. Each of those is listed separately, at its own price. Booking any one of them takes the whole floor for that hour, so the rest stop being available.",
  },
  {
    q: "What if my payment is not accepted?",
    a: "The venue can turn a booking down — a wrong amount, or a receipt that does not match what they received. The hours go straight back on sale and you are not charged. It shows on your bookings with the reason they gave.",
    policy: "When a venue turns a booking down",
  },
] as { q: string; a: string; policy?: string }[];

/**
 * Its own page rather than a strip on the landing page.
 *
 * The honest answer to "how does this work" runs to several hundred words — a
 * hold, a fee, a person checking a receipt — and none of that fits in three
 * cards without becoming the kind of reassurance that turns into a complaint
 * later.
 */
function HowItWorksView() {
  return (
    <main className="min-h-screen bg-[#f5f9ff]">
      <PublicHeader />

      <div className="mx-auto max-w-4xl px-6 py-12 lg:px-8 lg:py-16">
        <p className="text-sm font-bold tracking-[0.16em] text-[#2563EB] uppercase">
          How it works
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-[#071955] sm:text-5xl">
          Book a court in four steps
        </h1>
        <p className="mt-4 max-w-2xl text-lg leading-8 font-medium text-slate-600">
          You choose the hours, you pay the venue, and somebody at the venue confirms it. IcyPlay
          is the part in between — the availability, the prices, and the paperwork.
        </p>

        <ol className="mt-10 grid gap-4 sm:grid-cols-2">
          {steps.map((step, index) => (
            <li
              key={step.title}
              className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#2563EB] text-sm font-extrabold text-white">
                {index + 1}
              </span>
              <h2 className="mt-4 text-lg font-bold text-[#071955]">{step.title}</h2>
              <p className="mt-2 leading-7 font-medium text-slate-600">{step.body}</p>
            </li>
          ))}
        </ol>

        <section className="mt-12 rounded-3xl border border-blue-200 bg-blue-50 p-6 lg:p-8">
          <h2 className="text-xl font-bold text-[#071955]">
            The money goes straight to the venue
          </h2>
          <p className="mt-3 leading-7 font-medium text-slate-700">
            IcyPlay does not take your payment, hold it, or pass it on. You send it to the venue&apos;s
            own GCash account, and the screenshot you upload is what they check it against. That is
            why a booking is not confirmed the second you pay — a person has to look.
          </p>
          <p className="mt-3 leading-7 font-medium text-slate-700">
            Check the account name on the checkout page against the one in your GCash app before you
            send anything. Money sent to the wrong number is not something anybody can undo.
          </p>
        </section>

        <section className="mt-12">
          <h2 className="text-2xl font-black tracking-tight text-[#071955]">
            What you pay, and why it changes
          </h2>
          <p className="mt-3 max-w-2xl leading-7 font-medium text-slate-600">
            Venues set their own rates. Every court has a standard rate; the other three are{" "}
            <strong className="font-bold text-[#071955]">only charged if that venue has set them</strong>
            . Where one is not set, the standard rate applies — a venue that charges the same all
            week has one rate, not four.
          </p>

          <dl className="mt-6 divide-y divide-slate-100 rounded-3xl border border-slate-200 bg-white">
            {rates.map((rate) => (
              <div key={rate.label} className="flex flex-wrap gap-x-6 gap-y-1 px-6 py-4">
                <dt className="w-32 shrink-0">
                  <span className="block font-bold text-[#071955]">{rate.label}</span>
                  <span
                    className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-bold ${
                      rate.always ? "bg-blue-50 text-[#1264f7]" : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {rate.always ? "Every court" : "If offered"}
                  </span>
                </dt>
                <dd className="min-w-0 flex-1 leading-7 font-medium text-slate-600">{rate.body}</dd>
              </div>
            ))}
          </dl>

          <p className="mt-4 max-w-2xl leading-7 font-medium text-slate-600">
            Whichever rate applies is named on every hour you pick and on every line of your
            booking, so the total is never a surprise. A court&apos;s page lists only the rates that
            venue actually charges — if you see one rate there, that is the only one there is.
          </p>
        </section>

        <section className="mt-12">
          <h2 className="text-2xl font-black tracking-tight text-[#071955]">
            Questions people actually ask
          </h2>

          <div className="mt-6 space-y-3">
            {questions.map((entry) => (
              <details
                key={entry.q}
                className="group rounded-3xl border border-slate-200 bg-white px-6 py-5"
              >
                <summary className="flex cursor-pointer items-center justify-between gap-4 font-bold text-[#071955] marker:content-['']">
                  {entry.q}
                  <span
                    aria-hidden
                    className="shrink-0 text-xl leading-none text-slate-400 transition group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <p className="mt-3 leading-7 font-medium text-slate-600">{entry.a}</p>
                {entry.policy && (
                  <p className="mt-3 text-sm font-semibold">
                    <Link
                      href={`/booking-policy#${anchor(entry.policy)}`}
                      className="text-[#164eaa] underline-offset-2 hover:underline"
                    >
                      Booking policy · {entry.policy} &rarr;
                    </Link>
                  </p>
                )}
              </details>
            ))}
          </div>
        </section>

        <section className="mt-12 rounded-3xl border border-slate-200 bg-white p-6 lg:p-8">
          <h2 className="text-xl font-bold text-[#071955]">Run a court?</h2>
          <p className="mt-3 max-w-2xl leading-7 font-medium text-slate-600">
            List your venue, set your own rates and peak hours, and mark a floor out into as many
            playable courts as it takes. Bookings and payments come to a desk of your own, where you
            or the staff you put on it check each receipt and confirm.
          </p>
          <Link
            href="/sign-up"
            className="mt-5 inline-block rounded-full bg-[#2563EB] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700"
          >
            Become a partner
          </Link>
        </section>

        <div className="mt-12 flex flex-wrap gap-3">
          <Link
            href="/#courts"
            className="inline-block rounded-full bg-[#2563EB] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700"
          >
            Find a court
          </Link>
          <Link
            href="/bookings"
            className="inline-block rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300"
          >
            My bookings
          </Link>
        </div>
      </div>

      <PublicFooter />
    </main>
  );
}

export default HowItWorksView;
