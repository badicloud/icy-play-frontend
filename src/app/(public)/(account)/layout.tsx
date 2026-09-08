import generateMetadata from '@/utils/generateMetadata';
import AppHeader from '@/app/components/ui/AppHeader';
import PublicNav from '@/app/components/ui/PublicNav';

export const metadata = generateMetadata({ title: 'My account', noIndex: true });

function Layout({ children }: { children: React.ReactNode }) {
	return (
		<div className="min-h-screen bg-[#f5f9ff]">
			<AppHeader nav={<PublicNav />} />
			{children}
		</div>
	);
}

export default Layout;
