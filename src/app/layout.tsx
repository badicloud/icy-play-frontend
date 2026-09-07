import type { Viewport } from 'next';
import clsx from 'clsx';
import { Montserrat } from 'next/font/google';
import 'src/styles/splash-screen.css';
import 'src/styles/index.css';
import '../../public/assets/fonts/material-design-icons/MaterialIconsOutlined.css';
import '../../public/assets/fonts/meteocons/style.css';
import '../../public/assets/styles/prism.css';
import { SessionProvider } from 'next-auth/react';
import { auth } from '@auth/authJs';
import { IcyPlayAuthProvider } from '@auth/contexts/IcyPlayAuthContext/IcyPlayAuthProvider';
import generateMetadata from '../utils/generateMetadata';
import App from './App';

const montserrat = Montserrat({
	subsets: ['latin'],
	variable: '--font-montserrat',
	display: 'swap'
});

// eslint-disable-next-line react-refresh/only-export-components
export const metadata = generateMetadata();

// eslint-disable-next-line react-refresh/only-export-components
export const viewport: Viewport = {
	width: 'device-width',
	initialScale: 1,
	themeColor: '#2563EB'
};

export default async function RootLayout({
	children
}: Readonly<{
	children: React.ReactNode;
}>) {
	const session = await auth();

	return (
		<html lang="en">
			<head>
				<meta charSet="utf-8" />
				<base href="/" />
				{/*
					manifest.json provides metadata used when your web app is added to the
					homescreen on Android. See https://developers.google.com/web/fundamentals/engage-and-retain/web-app-manifest/
				*/}
				<noscript id="emotion-insertion-point" />
			</head>
			<body
				id="root"
				className={clsx('loading', montserrat.className, montserrat.variable)}
			>
				<SessionProvider
					basePath="/auth"
					session={session}
				>
					<IcyPlayAuthProvider>
						<App>{children}</App>
					</IcyPlayAuthProvider>
				</SessionProvider>
			</body>
		</html>
	);
}
