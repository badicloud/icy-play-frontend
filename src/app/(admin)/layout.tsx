import type { Metadata } from 'next';
import RoleGuard from '@auth/RoleGuard';
import AdminShell from './components/AdminShell';

export const metadata: Metadata = {
	title: 'Platform admin',
	robots: { index: false, follow: false, nocache: true }
};

function Layout({ children }: { children: React.ReactNode }) {
	return (
		<RoleGuard roles={['PlatformAdmin']}>
			<AdminShell>{children}</AdminShell>
		</RoleGuard>
	);
}

export default Layout;
