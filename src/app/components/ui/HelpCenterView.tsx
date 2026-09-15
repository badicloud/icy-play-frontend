import Link from "next/link";
import { anchor } from "@/app/(public)/(legal)/LegalPageLayout";
import PublicFooter from "./PublicFooter";
import PublicHeader from "./PublicHeader";

const support = "icyplaybooking@gmail.com";

type Answer = {
  q: string;
  a: React.ReactNode;
};

type Topic = {
  id: string;
  title: string;
  blurb: string;
  answers: Answer[];
};

function Policy({ section }: { section: string }) {
  return (
    <Link
      href={`/booking-policy#${anchor(section)}`}
      className="font-bold text-[#164eaa] underline-offset-2 hover:underline"
    >
      Booking policy · {section}
    </Link>
  );
}

/**
 * What people write in about, grouped by the shape of the trouble rather than
 * by which part of the system it came from.
 *
 * Somebody whose payment has not been accepted does not know, and should not
 * have to guess, whether that is a "booking" question or a "payment" one. The
 * headings are the situations they are in.
 */
const topics: Topic[] = [
  {
    id: "account",
    title: "Your account",
    blurb: "Signing up, getting in, and getting back in.",
    answers: [
      {
        q: "I signed up but no verification email arrived",
        a: (
          <>
            Check the spam folder first — it is usually there. If it is not, sign in and ask for a
            new one from the notice at the top of the page; the previous link stops working the
            moment a new one is sent. Addresses with a typo in them cannot be fixed by us: sign up
            again with the right one.
          </>
        ),
      },
      {
        q: "I have forgotten my password",
        a: (
          <>
            Use <Link href="/forgot-password" className="font-bold text-[#164eaa] underline-offset-2 hover:underline">forgot password</Link>{" "}
            and follow the emailed link. It is good for one hour and one use. If the page says the
            link is no longer valid, ask for another — that is what has happened, not that the
            account is gone.
          </>
        ),
      },
      {
        q: "Can I change the email on my account?",
        a: (
          <>
            Not from the site yet. Write to us and we will do it, once we can confirm you are the
            person who owns both addresses.
          </>
        ),
      },
    ],
  },
  {
    id: "booking",
    title: "Booking a court",
    blurb: "From picking hours to being confirmed.",
    answers: [
      {
        q: "How does booking work, start to finish?",
        a: (
          <>
            Four steps, and{" "}
            <Link href="/how-it-works" className="font-bold text-[#164eaa] underline-offset-2 hover:underline">
              how it works
            </Link>{" "}
            walks through all of them. The short version: pick hours, pay the venue by GCash, send
            the receipt, and somebody at the venue confirms it.
          </>
        ),
      },
      {
        q: "My hold ran out while I was paying",
        a: (
          <>
            The hours went back on sale and nothing was charged. If they are still free you can book
            them again. If you had already sent the money, do not book again — write to the venue
            first, because the payment is with them. <Policy section="Holding a court" />
          </>
        ),
      },
      {
        q: "Why is the court still not confirmed?",
        a: (
          <>
            Because a person at the venue has to look at your receipt, and they may not be at the
            desk. You will be emailed the moment they confirm. Please do not travel on an
            unconfirmed booking. <Policy section="Confirmation is a person, not a machine" />
          </>
        ),
      },
      {
        q: "The hours I want are showing as taken",
        a: (
          <>
            Somebody else holds them, or the whole floor is taken by another sport. A court marked
            out for basketball and pickleball is one floor: booking either takes the other off sale
            for that hour. Try another hour, another part of the floor, or another day.
          </>
        ),
      },
    ],
  },
  {
    id: "money",
    title: "Paying, moving and refunds",
    blurb: "Where the money goes, and what can be changed afterwards.",
    answers: [
      {
        q: "Who am I actually paying?",
        a: (
          <>
            The venue, directly, into their own GCash account. IcyPlay does not receive, hold or
            forward your payment at any point. Check the account name at checkout against the one
            your GCash app shows before you send anything.{" "}
            <Policy section="You pay the venue, not IcyPlay" />
          </>
        ),
      },
      {
        q: "Can I cancel and get my money back?",
        a: (
          <>
            No. There are no refunds through IcyPlay, because we never hold your money — there is
            nothing for us to give back. What you can do instead is move the booking to another
            date. <Policy section="Bookings are final" />
          </>
        ),
      },
      {
        q: "How do I move a booking?",
        a: (
          <>
            Open it from{" "}
            <Link href="/bookings" className="font-bold text-[#164eaa] underline-offset-2 hover:underline">
              my bookings
            </Link>{" "}
            and pick another date. Up to three times, more than 24 hours before it starts, same
            hours, same court, and a weekday for a weekday or a weekend for a weekend.{" "}
            <Policy section="Moving a booking" />
          </>
        ),
      },
      {
        q: "The venue turned my booking down",
        a: (
          <>
            The reason they gave is shown on the booking, and the hours went back on sale. If you
            had already sent money, that is between you and the venue — contact them using the
            details on the court&apos;s page. <Policy section="When a venue turns a booking down" />
          </>
        ),
      },
      {
        q: "I sent the money to the wrong number",
        a: (
          <>
            Neither IcyPlay nor the venue can recover it. GCash transfers are not reversible by the
            recipient. Contact GCash support; and check the account name next time, which is why it
            is printed at checkout.
          </>
        ),
      },
    ],
  },
  {
    id: "venues",
    title: "Running a venue",
    blurb: "For owners and the people on their desk.",
    answers: [
      {
        q: "How do I list my courts?",
        a: (
          <>
            Start with{" "}
            <Link href="/sign-up" className="font-bold text-[#164eaa] underline-offset-2 hover:underline">
              become a partner
            </Link>
            . We will take your business details and documents, and once the platform has checked
            them your venue can be set up: courts, opening hours, rates and photos.
          </>
        ),
      },
      {
        q: "Who can confirm payments?",
        a: (
          <>
            You, and anybody you put on that venue&apos;s desk. Each attendant gets their own sign-in
            and sees only the venues they work. Add them from your venue&apos;s page in the console.
          </>
        ),
      },
      {
        q: "One floor, several sports — how do I set that up?",
        a: (
          <>
            Give the court each sport it takes, and say how many playable courts it makes for each.
            A hall might be one basketball court or three pickleball courts. Booking any one of them
            takes the floor, so the others come off sale for that hour.
          </>
        ),
      },
      {
        q: "Where do I see what is booked?",
        a: (
          <>
            On the venue desk: a diary per court for what is on today, this week or this month, and
            a list for everything else, including what fell through.
          </>
        ),
      },
    ],
  },
];

/**
 * A help centre rather than a contact form.
 *
 * Most of what people write in about has an answer that does not change, and a
 * page that answers it is faster for them than an email is for us. What is left
 * over gets an address at the bottom.
 */
function HelpCenterView() {
  return (
    <main className="min-h-screen bg-[#f5f9ff]">
      <PublicHeader />

      <div className="mx-auto max-w-4xl px-6 py-12 lg:px-8 lg:py-16">
        <p className="text-sm font-bold tracking-[0.16em] text-[#2563EB] uppercase">Help centre</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-[#071955] sm:text-5xl">
          What do you need a hand with?
        </h1>
        <p className="mt-4 max-w-2xl text-lg leading-8 font-medium text-slate-600">
          The things people write in about most, answered. If yours is not here, the address at the
          bottom reaches a person.
        </p>

        <nav className="mt-8 flex flex-wrap gap-2" aria-label="Help topics">
          {topics.map((topic) => (
            <a
              key={topic.id}
              href={`#${topic.id}`}
              className="rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 transition hover:border-slate-300 hover:text-[#2563EB]"
            >
              {topic.title}
            </a>
          ))}
        </nav>

        {topics.map((topic) => (
          <section key={topic.id} id={topic.id} className="mt-12 scroll-mt-24">
            <h2 className="text-2xl font-black tracking-tight text-[#071955]">{topic.title}</h2>
            <p className="mt-2 font-medium text-slate-600">{topic.blurb}</p>

            <div className="mt-5 space-y-3">
              {topic.answers.map((answer) => (
                <details
                  key={answer.q}
                  className="group rounded-3xl border border-slate-200 bg-white px-6 py-5"
                >
                  <summary className="flex cursor-pointer items-center justify-between gap-4 font-bold text-[#071955] marker:content-['']">
                    {answer.q}
                    <span
                      aria-hidden
                      className="shrink-0 text-xl leading-none text-slate-400 transition group-open:rotate-45"
                    >
                      +
                    </span>
                  </summary>
                  <p className="mt-3 leading-7 font-medium text-slate-600">{answer.a}</p>
                </details>
              ))}
            </div>
          </section>
        ))}

        <section className="mt-12 rounded-3xl border border-blue-200 bg-blue-50 p-6 lg:p-8">
          <h2 className="text-xl font-bold text-[#071955]">Still stuck?</h2>
          <p className="mt-3 max-w-2xl leading-7 font-medium text-slate-700">
            Write to us with your booking reference — the link in your confirmation email, or the
            address of the booking page — and what you expected to happen. That is usually enough to
            answer in one reply rather than three.
          </p>
          <p className="mt-2 leading-7 font-medium text-slate-700">
            For anything about a payment you have already sent, contact the venue first. The money is
            with them.
          </p>
          <a
            href={`mailto:${support}`}
            className="mt-5 inline-block rounded-full bg-[#2563EB] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700"
          >
            Email {support}
          </a>
        </section>

        <div className="mt-12 flex flex-wrap gap-3">
          <Link
            href="/how-it-works"
            className="inline-block rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300"
          >
            How it works
          </Link>
          <Link
            href="/booking-policy"
            className="inline-block rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300"
          >
            Booking policy
          </Link>
        </div>
      </div>

      <PublicFooter />
    </main>
  );
}

export default HelpCenterView;
