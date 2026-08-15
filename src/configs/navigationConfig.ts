import i18n from '@i18n';
import { FuseNavItemType } from '@fuse/core/FuseNavigation/types/FuseNavItemType';
import SettingsAppNavigation from '../app/(control-panel)/apps/settings/lib/constants/SettingsAppNavigation';
import ar from './navigation-i18n/ar';
import en from './navigation-i18n/en';
import tr from './navigation-i18n/tr';

i18n.addResourceBundle('en', 'navigation', en);
i18n.addResourceBundle('tr', 'navigation', tr);
i18n.addResourceBundle('ar', 'navigation', ar);

/**
 * Main application navigation. Template-only demos are intentionally excluded.
 */
const navigationConfig: FuseNavItemType[] = [
	{
		id: 'dashboards',
		title: 'Dashboards',
		type: 'group',
		icon: 'lucide:layout-dashboard',
		translate: 'DASHBOARDS',
		children: [
			{
				id: 'dashboards.project',
				title: 'Operations',
				type: 'item',
				icon: 'lucide:clipboard-check',
				url: '/dashboards/project'
			},
			{
				id: 'dashboards.analytics',
				title: 'Analytics',
				type: 'item',
				icon: 'lucide:chart-pie',
				url: '/dashboards/analytics'
			}
		]
	},
	{
		id: 'management',
		title: 'Management',
		type: 'group',
		icon: 'lucide:briefcase-business',
		children: [
			{
				id: 'apps.calendar',
				title: 'Calendar',
				type: 'item',
				icon: 'lucide:calendar',
				url: '/apps/calendar',
				translate: 'CALENDAR'
			},
			{
				id: 'apps.contacts',
				title: 'Customers',
				type: 'item',
				icon: 'lucide:users',
				url: '/apps/contacts'
			},
			{
				id: 'apps.ecommerce',
				title: 'Commerce',
				type: 'collapse',
				icon: 'lucide:shopping-cart',
				url: '/apps/e-commerce/products',
				children: [
					{
						id: 'e-commerce-products',
						title: 'Products',
						type: 'item',
						url: '/apps/e-commerce/products',
						end: true
					},
					{
						id: 'e-commerce-new-product',
						title: 'New Product',
						type: 'item',
						url: '/apps/e-commerce/products/new'
					},
					{
						id: 'e-commerce-orders',
						title: 'Orders',
						type: 'item',
						url: '/apps/e-commerce/orders',
						end: true
					}
				]
			},
			{
				id: 'apps.notifications',
				title: 'Notifications',
				type: 'item',
				icon: 'lucide:bell',
				url: '/apps/notifications'
			},
			{
				id: 'apps.profile',
				title: 'Profile',
				type: 'item',
				icon: 'lucide:circle-user',
				url: '/apps/profile'
			},
			{
				...SettingsAppNavigation,
				type: 'item'
			}
		]
	}
];

export default navigationConfig;
