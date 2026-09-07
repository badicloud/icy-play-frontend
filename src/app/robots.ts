import type { MetadataRoute } from 'next';
import { siteUrl } from '../utils/generateMetadata';

export default function robots(): MetadataRoute.Robots {
	return {
		rules: [
			{
				userAgent: '*',
				allow: '/',
				// Account, authentication and the operator console hold nothing a
				// search engine should index.
				disallow: [
					'/api/',
					'/auth/',
					'/account',
					'/sign-in',
					'/sign-up',
					'/sign-out',
					'/forgot-password',
					'/reset-password',
					'/verify-email',
					'/verify-email-sent',
					'/dashboards/',
					'/apps/',
					'/pages/',
					'/auth-role-examples/',
					'/documentation/'
				]
			}
		],
		sitemap: `${siteUrl}/sitemap.xml`
	};
}
