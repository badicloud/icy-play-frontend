import type { Metadata } from 'next';
import GuestGuard from '@auth/GuestGuard';

export const metadata: Metadata = { title: 'Forgot password' };

function Layout({ children }: { children: React.ReactNode }) {
	return <GuestGuard>{children}</GuestGuard>;
}

export default Layout;
