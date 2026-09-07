import type { MetadataRoute } from 'next';
import { siteUrl } from '../utils/generateMetadata';

/**
 * Only pages a visitor can reach without signing in belong here. Court and
 * facility pages should be added once public discovery ships.
 */
export default function sitemap(): MetadataRoute.Sitemap {
	const lastModified = new Date();

	return [
		{
			url: `${siteUrl}/`,
			lastModified,
			changeFrequency: 'weekly',
			priority: 1
		},
		{
			url: `${siteUrl}/terms`,
			lastModified,
			changeFrequency: 'yearly',
			priority: 0.3
		},
		{
			url: `${siteUrl}/privacy`,
			lastModified,
			changeFrequency: 'yearly',
			priority: 0.3
		}
	];
}
