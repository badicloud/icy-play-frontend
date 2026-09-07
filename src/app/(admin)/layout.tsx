import type { Metadata } from 'next';
import RoleGuard from '@auth/RoleGuard';

export const metadata: Metadata = {
	title: 'Platform admin',
	robots: { index: false, follow: false, nocache: true }
};

function Layout({ children }: { children: React.ReactNode }) {
	return <RoleGuard roles={['PlatformAdmin']}>{children}</RoleGuard>;
}

export default Layout;
