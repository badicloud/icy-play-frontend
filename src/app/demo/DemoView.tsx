import Link from "next/link";
import DemoNav, { DemoStep } from "./DemoNav";

/**
 * The walkthrough shown to a prospective client.
 *
 * Built from what the platform actually does today, with what is not built yet
 * said out loud rather than left for them to discover. A demo that oversells is
 * a contract renegotiated in month two.
 */

type Section = {
  id: string;
  eyebrow: string;
  title: string;
  lede: string;
};

const sections: Section[] = [
  { id: "flexibility", eyebrow: "01", title: "One floor, many courts", lede: "The thing most booking systems cannot do." },
  { id: "booking", eyebrow: "02", title: "Booking that fits how people play", lede: "An hour, a day, or a week of days." },
  { id: "onboarding", eyebrow: "03", title: "Getting a venue on", lede: "From a business permit to a bookable hour." },
  { id: "payments", eyebrow: "04", title: "Money, and who holds it", lede: "GCash today, direct payment next." },
  { id: "desk", eyebrow: "05", title: "The venue's desk", lede: "Where a venue runs its day." },
  { id: "pricing", eyebrow: "06", title: "Pricing, and what it costs a venue", lede: "₱15 an hour, 3% back for maintenance, billed on your cycle." },
  { id: "roadmap", eyebrow: "07", title: "What is built, and what is next", lede: "Said plainly." },
];

function Stat({ figure, label }: { figure: string; label: string }) {
  return (
    <div className="rounded-3xl border border-white/15 bg-white/5 px-6 py-5">
      <p className="text-3xl font-black tracking-tight text-white">{figure}</p>
      <p className="mt-1 text-sm font-semibold text-blue-200">{label}</p>
    </div>
  );
}

function Card({
  title,
  children,
  tone = "plain",
}: {
  title: string;
  children: React.ReactNode;
  tone?: "plain" | "accent";
}) {
  return (
    <div
      className={`rounded-3xl border p-6 ${
        tone === "accent" ? "border-blue-200 bg-blue-50" : "border-slate-200 bg-white"
      }`}
    >
      <h3 className="text-lg font-bold text-[#071955]">{title}</h3>
      <div className="mt-3 space-y-3 leading-7 font-medium text-slate-600">{children}</div>
    </div>
  );
}

function Band({ section, children }: { section: Section; children: React.ReactNode }) {
  const at = sections.indexOf(section);

  return (
    <section id={section.id} className="scroll-mt-20 border-t border-slate-200 py-14 lg:py-20">
      <p className="text-sm font-black tracking-[0.2em] text-[#2563EB]">{section.eyebrow}</p>
      <h2 className="mt-3 text-3xl font-black tracking-tight text-[#071955] sm:text-4xl">
        {section.title}
      </h2>
      <p className="mt-2 text-lg font-medium text-slate-600">{section.lede}</p>
      <div className="mt-8">{children}</div>

      <DemoStep previous={sections[at - 1]} next={sections[at + 1]} />
    </section>
  );
}

function DemoView() {
  return (
    <main className="bg-[#f5f9ff]">
      {/* ------------------------------------------------------------ hero */}
      <section className="bg-[#071955] bg-[radial-gradient(circle_at_15%_20%,rgba(22,101,255,0.5),transparent_35%),radial-gradient(circle_at_85%_80%,rgba(0,153,255,0.18),transparent_30%)]">
        <div className="mx-auto max-w-5xl px-6 py-20 lg:px-8 lg:py-28">
          <p className="text-sm font-bold tracking-[0.2em] text-blue-300 uppercase">
            IcyPlay · Platform walkthrough
          </p>
          <h1 className="mt-4 text-4xl font-black tracking-tight text-white sm:text-6xl">
            A court booking platform built around how courts are actually used
          </h1>
          <p className="mt-6 max-w-3xl text-xl leading-9 font-medium text-blue-100">
            One hall is not one court. It is a basketball court on Tuesday, three pickleball courts
            on Wednesday, and a birthday party on Saturday. IcyPlay was built to sell all of that
            from the same floor, without ever selling the same hour twice.
          </p>

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            <Stat figure="1 floor → 5 courts" label="Divided per sport, priced per sport" />
            <Stat figure="Hour · Day · Week" label="Three ways to book" />
            <Stat figure="Sports & events" label="The same court sells both" />
          </div>

          <Link
            href="/demo#flexibility"
            className="mt-12 inline-block rounded-full bg-white px-7 py-3.5 text-sm font-bold text-[#071955] transition hover:bg-blue-50"
          >
            Start the walkthrough &rarr;
          </Link>
        </div>
      </section>

      <DemoNav sections={sections} />

      <div className="mx-auto max-w-5xl px-6 lg:px-8">
        {/* ------------------------------------------------ 01 flexibility */}
        <Band section={sections[0]}>
          <div className="rounded-3xl border border-blue-200 bg-blue-50 p-6 lg:p-8">
            <p className="text-lg leading-8 font-semibold text-[#071955]">
              A venue registers <strong>one court</strong> — the physical floor. For each sport it
              takes, the venue says how many playable courts that floor makes. IcyPlay turns that
              into the things a customer can actually book.
            </p>

            <div className="mt-6 overflow-x-auto">
              <table className="w-full min-w-[34rem] border-separate border-spacing-y-2 text-left">
                <thead>
                  <tr className="text-xs font-bold tracking-wider text-slate-500 uppercase">
                    <th className="px-4">The floor</th>
                    <th className="px-4">Sport</th>
                    <th className="px-4">Divides into</th>
                    <th className="px-4">Bookable as</th>
                  </tr>
                </thead>
                <tbody className="text-sm font-semibold text-[#071955]">
                  <tr className="bg-white">
                    <td className="rounded-l-2xl px-4 py-3">Main hall</td>
                    <td className="px-4 py-3">Basketball</td>
                    <td className="px-4 py-3">1</td>
                    <td className="rounded-r-2xl px-4 py-3">Basketball</td>
                  </tr>
                  <tr className="bg-white">
                    <td className="rounded-l-2xl px-4 py-3">Main hall</td>
                    <td className="px-4 py-3">Volleyball</td>
                    <td className="px-4 py-3">1</td>
                    <td className="rounded-r-2xl px-4 py-3">Volleyball</td>
                  </tr>
                  <tr className="bg-white">
                    <td className="rounded-l-2xl px-4 py-3">Main hall</td>
                    <td className="px-4 py-3">Pickleball</td>
                    <td className="px-4 py-3">3</td>
                    <td className="rounded-r-2xl px-4 py-3">
                      Pickleball 1 · Pickleball 2 · Pickleball 3
                    </td>
                  </tr>
                  <tr className="bg-white">
                    <td className="rounded-l-2xl px-4 py-3">Main hall</td>
                    <td className="px-4 py-3">Birthday party</td>
                    <td className="px-4 py-3">1</td>
                    <td className="rounded-r-2xl px-4 py-3">Birthday party</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p className="mt-6 text-lg leading-8 font-bold text-[#071955]">
              Six things to sell. One floor. And the rule that makes it safe:
            </p>
            <p className="mt-2 leading-8 font-medium text-slate-700">
              Booking <strong>Pickleball 2</strong> at 7pm leaves Pickleball 1 and 3 on sale — and
              takes basketball, volleyball and the party off sale for that hour, because they need
              the whole floor. The platform works that out; the venue never has to.
            </p>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <Card title="Sports and events, same engine">
              <p>
                A court is set up for games and for occasions. A customer browsing for a game is
                never shown a wedding, and a venue hiring the hall out for a party uses the same
                calendar and the same money.
              </p>
            </Card>
            <Card title="Priced per sport">
              <p>
                The same floor can be ₱500 an hour for pickleball and ₱800 for basketball. The rate
                belongs to the pairing of court and sport, not to the court.
              </p>
            </Card>
            <Card title="Re-markable">
              <p>
                A floor marked out three ways today can be two tomorrow. Bookings already taken
                against the third still resolve — the record survives the re-marking.
              </p>
            </Card>
          </div>
        </Band>

        {/* ---------------------------------------------------- 02 booking */}
        <Band section={sections[1]}>
          <div className="grid gap-4 md:grid-cols-3">
            <Card title="By the hour" tone="accent">
              <p>
                Tap the hours you want on a grid that shows what is taken, what each hour costs and
                why. They need not run back to back.
              </p>
            </Card>
            <Card title="A single day">
              <p>Open to close, sold entire. A day with one hour gone cannot be hired whole.</p>
            </Card>
            <Card title="A run of days">
              <p>Up to seven consecutive days — a tournament, a camp, a league weekend.</p>
            </Card>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Card title="A booking page a person can read">
              <p>
                Thirty days ahead, fourteen on first sight. Every hour carries its own price and the
                reason for it. A floating panel adds up the court, the platform fee and the total as
                the customer picks — the fee named, never buried.
              </p>
              <p>
                Hours that have gone say <strong>Gone</strong>, not <strong>Booked</strong>: nobody
                booked them. Today stays bookable by the hour and greys out for whole days, because
                a day half gone is not a whole day.
              </p>
            </Card>
            <Card title="Never sold twice">
              <p>
                Taking a booking runs in a serializable transaction. Two customers reading
                &ldquo;free&rdquo; a millisecond apart and both writing is exactly how one court
                gets sold twice, and it is the failure a venue never forgives.
              </p>
              <p>
                Every hour is checked against the whole floor, not just the part being bought.
              </p>
            </Card>
          </div>
        </Band>

        {/* ------------------------------------------------- 03 onboarding */}
        <Band section={sections[2]}>
          <ol className="grid gap-4 md:grid-cols-2">
            {[
              [
                "The owner is onboarded",
                "Business details, a permit or DTI registration, and the contract terms — the platform rate per booked hour and the commission on it. The account is created for them and they set their own password from an emailed link; nobody here ever knows it.",
              ],
              [
                "The facility is described",
                "Address and map pin, contact details, photos, amenities, house rules, safety measures, and a time zone. Opening hours are set once for the venue, and a court that closes earlier can override them.",
              ],
              [
                "Courts are added",
                "The physical floor: name, surface, indoor or covered, capacity, minimum booking length, and the sports and events it takes — each with how many playable courts it divides into.",
              ],
              [
                "Bookable courts appear",
                "The platform creates one per sport per division, names them, and keeps them in step whenever the venue re-marks the floor. This is what a customer books and what a booking points at.",
              ],
              [
                "Rates are set",
                "Standard per sport, with optional peak, weekend and holiday rates, and a peak window per court. Anything left unset falls back to standard — a venue charging one rate has one rate, not four.",
              ],
              [
                "Payment details, and who may confirm",
                "The venue's GCash number, account name and QR code, and how long an unpaid hold survives. The owner works their own venues; staff are invited by email and see only the venues they are on.",
              ],
            ].map(([title, body], index) => (
              <li key={title} className="rounded-3xl border border-slate-200 bg-white p-6">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#2563EB] text-sm font-extrabold text-white">
                  {index + 1}
                </span>
                <h3 className="mt-4 text-lg font-bold text-[#071955]">{title}</h3>
                <p className="mt-2 leading-7 font-medium text-slate-600">{body}</p>
              </li>
            ))}
          </ol>
        </Band>

        {/* --------------------------------------------------- 04 payments */}
        <Band section={sections[3]}>
          <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6 lg:p-8">
            <p className="text-sm font-black tracking-[0.16em] text-amber-800 uppercase">
              Version 1 — today
            </p>
            <h3 className="mt-2 text-2xl font-black text-[#071955]">
              The customer pays the venue. A person confirms it.
            </h3>
            <p className="mt-3 text-lg leading-8 font-medium text-slate-700">
              IcyPlay never touches the money. The customer sends it to the venue&apos;s own GCash
              account, uploads the receipt, and somebody at the venue checks it against their
              account and confirms. No merchant account, no settlement delay, no platform holding
              funds it would have to be licensed to hold.
            </p>

            <div className="mt-6 grid gap-3 md:grid-cols-4">
              {[
                ["Pick hours", "The court is held"],
                ["Pay by GCash", "Number, name and QR shown"],
                ["Send the receipt", "The hold stops counting"],
                ["Venue confirms", "Customer is emailed"],
              ].map(([step, note], index) => (
                <div key={step} className="rounded-2xl bg-white p-4">
                  <p className="text-xs font-black text-amber-700">STEP {index + 1}</p>
                  <p className="mt-1 font-bold text-[#071955]">{step}</p>
                  <p className="mt-1 text-sm font-medium text-slate-600">{note}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Card title="The hold, and why it expires">
              <p>
                Choosing hours holds them while the customer pays — thirty minutes by default, and
                each venue sets its own between five minutes and four hours.
              </p>
              <p>
                If nothing arrives, the hours go back on sale on their own. Nothing has to run on
                time for that to be true: a hold is expired by arithmetic, not by a job that might
                be down.
              </p>
              <p>
                <strong>Uploading the receipt stops the clock.</strong> From then on the customer is
                waiting on the venue, and a venue asleep at midnight cannot cost them their court.
              </p>
            </Card>

            <Card title="Version 2 — direct payment" tone="accent">
              <p>
                Payment taken in-app, settled to the venue, and the booking confirmed the moment it
                clears. No receipt, no screenshot, nobody at a desk.
              </p>
              <p>
                Version 1 is deliberately the stepping stone: it needs no payment licence and no
                integration on the venue&apos;s side, so venues can be onboarded now. The flow the
                customer sees barely changes when V2 lands — the confirming step simply stops being
                a person.
              </p>
            </Card>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Card title="No refunds, and no need for them">
              <p>
                Because the money never passes through the platform, there is nothing for it to
                refund. Instead of cancelling, a customer can <strong>move</strong> a booking to
                another date — up to three times, more than a day ahead, same hours, same court, and
                the same kind of day so the price cannot change.
              </p>
              <p>
                The venue keeps the money and keeps a booked hour. The customer keeps their court.
                Nobody is out of pocket, and no refund rail is needed.
              </p>
            </Card>
            <Card title="Everything is on the record">
              <p>
                Who confirmed a payment, who turned one down and why, who was added to a desk, who
                changed a rate — with the before and after of every edit. Venues and the platform
                can both answer &ldquo;what happened here&rdquo; months later.
              </p>
            </Card>
          </div>
        </Band>

        {/* ------------------------------------------------------- 05 desk */}
        <Band section={sections[4]}>
          <div className="grid gap-4 md:grid-cols-2">
            <Card title="Payments waiting to be checked" tone="accent">
              <p>
                A queue, oldest first — somebody who paid an hour ago should not sit behind somebody
                who paid a minute ago. Each card opens to the receipt itself, beside the hours and
                the total it is supposed to match.
              </p>
              <p>Two answers: confirm, or turn it down with a reason that goes on the record.</p>
            </Card>
            <Card title="The court diary">
              <p>
                A calendar per court — today, the week, the month — showing what holds each hour and
                who booked it. Click an hour and the booking opens beside the calendar, not over it.
              </p>
              <p>
                And a list for the other question: everything that happened on this court, including
                what fell through, filtered by date and status.
              </p>
            </Card>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <Card title="Staff, per venue">
              <p>
                An owner with three venues has three sets of staff. Somebody on the desk at one has
                no business confirming payments at another.
              </p>
            </Card>
            <Card title="Their own sign-in">
              <p>
                Attendants are invited by email and set their own password. Nobody shares an account,
                so every confirmation has a name against it.
              </p>
            </Card>
            <Card title="Customers keep track too">
              <p>
                A booking list with the receipt attached, the hold counting down while it matters,
                and an email at every step that changes anything.
              </p>
            </Card>
          </div>
        </Band>

        {/* ---------------------------------------------------- 06 pricing */}
        <Band section={sections[5]}>
          <div className="grid gap-4 md:grid-cols-2">
            <Card title="Four rates, three of them optional">
              <p>
                <strong>Standard</strong> for the ordinary hour. <strong>Peak</strong> inside a
                window the venue sets. <strong>Weekend</strong> for Saturdays and Sundays.{" "}
                <strong>Holiday</strong> against a Philippine holiday calendar the platform keeps
                and the admin maintains.
              </p>
              <p>
                Each is per sport and per court, and any left unset falls back to standard. The rate
                that applied is written onto every booked hour, so a bill can be read back line by
                line years later.
              </p>
            </Card>

            <Card title="Maintenance, and what it costs">
              <p>
                A venue can close a court — or the whole facility — for a stretch: repairs, a
                repaint, a flooded floor. Those hours stop being bookable immediately, and anything
                already booked in them is visible to the venue so they can put it right.
              </p>
              <p>
                Because a closed hour is never sold, it never enters the billing cycle. What a venue
                owes follows what it actually took — a court out of action for a fortnight costs the
                venue nothing in platform fees for those hours.
              </p>
            </Card>
          </div>

          <div className="mt-4 rounded-3xl bg-[#071955] p-6 lg:p-9">
            <h3 className="text-2xl font-black tracking-tight text-white">What it costs a venue</h3>
            <p className="mt-2 font-medium text-blue-200">
              Agreed per owner and written into their contract.
            </p>

            <div className="mt-7 grid gap-4 md:grid-cols-3">
              <div className="rounded-3xl border border-white/15 bg-white/5 p-6">
                <p className="text-4xl font-black tracking-tight text-white">₱15</p>
                <p className="mt-1 text-sm font-bold text-blue-200">per booked hour</p>
                <p className="mt-3 leading-7 font-medium text-blue-100">
                  The platform fee. It is the standard rate and it is{" "}
                  <strong className="text-white">negotiable</strong> — a busy venue or a group of
                  them can be agreed differently, and the rate is stored against that owner.
                </p>
              </div>

              <div className="rounded-3xl border border-white/15 bg-white/5 p-6">
                <p className="text-4xl font-black tracking-tight text-white">3%</p>
                <p className="mt-1 text-sm font-bold text-blue-200">back for court maintenance</p>
                <p className="mt-3 leading-7 font-medium text-blue-100">
                  Three per cent of what IcyPlay bills goes{" "}
                  <strong className="text-white">back to the facility</strong>, towards keeping the
                  courts in the state the bookings were sold against.
                </p>
              </div>

              <div className="rounded-3xl border border-white/15 bg-white/5 p-6">
                <p className="text-4xl font-black tracking-tight text-white">Your cycle</p>
                <p className="mt-1 text-sm font-bold text-blue-200">weekly · bi-monthly · monthly</p>
                <p className="mt-3 leading-7 font-medium text-blue-100">
                  IcyPlay bills on whichever cycle suits the venue&apos;s own cash flow. A small
                  venue billed weekly and a chain billed monthly are the same platform, configured.
                </p>
              </div>
            </div>

            <div className="mt-7 rounded-3xl border border-white/15 bg-white/5 p-6">
              <p className="text-lg leading-8 font-semibold text-white">
                Nothing is deducted at the point of sale. IcyPlay sends the bill afterwards.
              </p>

              <ol className="mt-5 grid gap-3 md:grid-cols-4">
                {[
                  [
                    "The customer pays the venue",
                    "The whole amount, platform fee included, straight into the venue's GCash.",
                  ],
                  [
                    "The cycle runs",
                    "Weekly, bi-monthly or monthly — whichever that venue is set to.",
                  ],
                  [
                    "IcyPlay sends the bill",
                    "Every booked hour in the period, at the rate agreed, less the 3% maintenance credit.",
                  ],
                  [
                    "The venue settles it",
                    "Against a statement they can read line by line and check against their own takings.",
                  ],
                ].map(([step, note], index) => (
                  <li key={step} className="rounded-2xl bg-white/10 p-4">
                    <p className="text-xs font-black text-blue-300">STEP {index + 1}</p>
                    <p className="mt-1 font-bold text-white">{step}</p>
                    <p className="mt-1 text-sm leading-6 font-medium text-blue-100">{note}</p>
                  </li>
                ))}
              </ol>

              <p className="mt-5 leading-8 font-medium text-blue-100">
                So a venue&apos;s cash arrives <strong className="text-white">the day it is
                played</strong>, not weeks later, and what they owe comes as an invoice rather than
                as something taken out before they ever saw it.
              </p>
              <p className="mt-3 leading-8 font-medium text-blue-100">
                Both figures are written onto each booking when it is taken. Re-negotiating next
                month never reaches backwards into what was already agreed and already played.
              </p>
            </div>
          </div>
        </Band>

        {/* ---------------------------------------------------- 07 roadmap */}
        <Band section={sections[6]}>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-3xl border border-green-200 bg-green-50 p-6">
              <h3 className="text-lg font-black text-green-900">Built and running</h3>
              <ul className="mt-4 space-y-2 leading-7 font-medium text-green-900">
                {[
                  "Owner onboarding, facilities, courts and bookable courts",
                  "Sports and events, divisions per sport, per-sport pricing",
                  "Peak, weekend and holiday rates; maintenance closures",
                  "Hourly, single-day and multi-day booking",
                  "Holds with venue-set expiry, and expiry by arithmetic",
                  "GCash payment details, receipt upload, venue confirmation",
                  "Moving a booking instead of cancelling",
                  "Venue desk: confirmation queue, court diary and list",
                  "Attendants per venue, invited by email",
                  "Transactional email throughout; full audit trail",
                ].map((item) => (
                  <li key={item} className="flex gap-2">
                    <span aria-hidden>✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-3xl border border-slate-300 bg-white p-6">
              <h3 className="text-lg font-black text-[#071955]">Next</h3>
              <ul className="mt-4 space-y-2 leading-7 font-medium text-slate-600">
                {[
                  "Version 2 — direct in-app payment, confirmed automatically",
                  "Billing: IcyPlay-issued statements on each venue's cycle, settlement, overdue tracking",
                  "Messaging between a venue and a customer on a booking",
                  "Reports: utilisation, takings, and busiest hours per court",
                  "Customer-facing search by location and distance",
                ].map((item) => (
                  <li key={item} className="flex gap-2">
                    <span aria-hidden className="text-slate-400">
                      →
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Band>
      </div>

      <section className="bg-[#071955]">
        <div className="mx-auto max-w-5xl px-6 py-16 text-center lg:px-8">
          <h2 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
            Play more. Host more. Manage less.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg leading-8 font-medium text-blue-100">
            Every hour a venue has is already for sale to somebody. IcyPlay is the part that finds
            them, prices it, holds it, and writes it down.
          </p>
        </div>
      </section>
    </main>
  );
}

export default DemoView;
