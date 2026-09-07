import type { Metadata } from 'next';

/**
 * Set NEXT_PUBLIC_BASE_URL to the public origin in every deployed environment.
 * Absolute URLs in canonical, Open Graph and sitemap entries are built from it,
 * so a stale value silently points crawlers at the wrong host.
 */
export const siteUrl = (process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000').replace(/\/$/, '');

export const siteConfig = {
	name: 'IcyPlay',
	/** Shown in the browser tab on the landing page. */
	title: 'IcyPlay - Booking',
	description:
		'Discover and reserve badminton, basketball, pickleball, tennis and volleyball courts near you. Real-time availability, instant booking and verified venues.',
	keywords: [
		'court booking',
		'sports facility booking',
		'badminton court',
		'basketball court',
		'pickleball court',
		'tennis court',
		'volleyball court',
		'book a court online'
	],
	locale: 'en_PH',
	twitter: '@icyplay'
} as const;

type MetadataOverrides = {
	title?: string;
	description?: string;
	/** Path relative to the site root, for example "/terms". */
	path?: string;
	/** Auth and account screens have nothing to offer a search engine. */
	noIndex?: boolean;
};

/**
 * Builds page metadata on top of the site defaults. Open Graph and Twitter
 * images come from the app/opengraph-image file convention, so they are not
 * repeated here.
 */
function generateMetadata(overrides: MetadataOverrides = {}): Metadata {
	const title = overrides.title ?? siteConfig.title;
	const description = overrides.description ?? siteConfig.description;
	const path = overrides.path;

	return {
		metadataBase: new URL(siteUrl),
		title: overrides.title
			? title
			: {
					default: siteConfig.title,
					template: `%s | ${siteConfig.name}`
				},
		description,
		applicationName: siteConfig.name,
		keywords: [...siteConfig.keywords],
		authors: [{ name: siteConfig.name, url: siteUrl }],
		creator: siteConfig.name,
		publisher: siteConfig.name,
		referrer: 'origin-when-cross-origin',
		...(path ? { alternates: { canonical: path } } : {}),
		robots: overrides.noIndex
			? { index: false, follow: false, nocache: true }
			: {
					index: true,
					follow: true,
					googleBot: {
						index: true,
						follow: true,
						'max-image-preview': 'large',
						'max-snippet': -1,
						'max-video-preview': -1
					}
				},
		icons: {
			icon: '/favicon.ico',
			shortcut: '/favicon.ico',
			apple: '/assets/images/logo/IcyPlay%20Logo.png'
		},
		manifest: '/manifest.json',
		openGraph: {
			type: 'website',
			siteName: siteConfig.name,
			locale: siteConfig.locale,
			...(path ? { url: path } : {}),
			title,
			description
		},
		twitter: {
			card: 'summary_large_image',
			site: siteConfig.twitter,
			creator: siteConfig.twitter,
			title,
			description
		},
		formatDetection: { telephone: false, address: false, email: false }
	};
}

export default generateMetadata;
