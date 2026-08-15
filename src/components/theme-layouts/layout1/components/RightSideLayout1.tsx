import { lazy, memo, Suspense } from 'react';

const QuickPanel = lazy(() => import('@/components/theme-layouts/components/quickPanel/QuickPanel'));
const NotificationPanel = lazy(
	() => import('@/app/(control-panel)/apps/notifications/components/views/NotificationPanel')
);

/**
 * The right side layout 1.
 */
function RightSideLayout1() {
	return (
		<Suspense>
			<QuickPanel />

			<NotificationPanel />
		</Suspense>
	);
}

export default memo(RightSideLayout1);
