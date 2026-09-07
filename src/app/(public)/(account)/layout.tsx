import generateMetadata from '@/utils/generateMetadata';

export const metadata = generateMetadata({ title: 'My account', noIndex: true });

function Layout({ children }: { children: React.ReactNode }) {
	return children;
}

export default Layout;
