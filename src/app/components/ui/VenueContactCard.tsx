/**
 * Who to ring about a booking or an open play, on the checkout's last step:
 * the venue's name, its number and its email. The customer paid the venue
 * directly, so the venue is the one to speak to about anything from here.
 *
 * Links rather than text, so on a phone a tap rings the number or opens the
 * mail. Renders nothing when the venue has left neither.
 */
function VenueContactCard({
  venueName,
  phone,
  email,
}: {
  venueName: string;
  phone: string | null;
  email: string | null;
}) {
  const hasPhone = Boolean(phone?.trim());
  const hasEmail = Boolean(email?.trim());

  if (!hasPhone && !hasEmail) {
    return null;
  }

  return (
    <section className="mt-5 rounded-[24px] border border-slate-200 bg-white p-6">
      <h2 className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Contact the venue</h2>
      <p className="mt-2 text-lg font-bold text-[#071955]">{venueName}</p>

      <dl className="mt-3 space-y-2 text-sm">
        {hasPhone && (
          <div className="flex flex-wrap items-baseline gap-x-3">
            <dt className="w-16 font-semibold text-slate-500">Phone</dt>
            <dd>
              <a
                href={`tel:${phone!.replace(/\s+/g, "")}`}
                className="font-bold text-[#164eaa] underline underline-offset-2"
              >
                {phone}
              </a>
            </dd>
          </div>
        )}

        {hasEmail && (
          <div className="flex flex-wrap items-baseline gap-x-3">
            <dt className="w-16 font-semibold text-slate-500">Email</dt>
            <dd className="min-w-0 break-all">
              <a href={`mailto:${email}`} className="font-bold text-[#164eaa] underline underline-offset-2">
                {email}
              </a>
            </dd>
          </div>
        )}
      </dl>
    </section>
  );
}

export default VenueContactCard;
