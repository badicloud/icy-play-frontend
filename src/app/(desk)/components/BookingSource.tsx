"use client";

import { createContext, useContext } from "react";

/**
 * Which door the court pages are being read through.
 *
 * The venue desk and the platform admin look at the same three things — a
 * court's diary, a court's list, and one booking in full — and the server
 * answers both from the same queries. What differs is the gate: a desk may
 * only open the courts it works, and an admin works none of them but may open
 * any.
 *
 * Carried in context rather than passed down, because the reader is a fact
 * about the whole page and not about any one component in it. Threading it as
 * a prop would mean a calendar taking a parameter it does not use, to hand to
 * a row that does not use it either, to reach the history expander four levels
 * down that does.
 *
 * "desk" is the default deliberately. Every existing caller is the desk, and a
 * default that widens what somebody can read is a default that grants access
 * by omission.
 */
export type BookingSource = "desk" | "admin";

const Source = createContext<BookingSource>("desk");

export function BookingSourceProvider({
  source,
  children,
}: {
  source: BookingSource;
  children: React.ReactNode;
}) {
  return <Source.Provider value={source}>{children}</Source.Provider>;
}

export function useBookingSource() {
  return useContext(Source);
}
