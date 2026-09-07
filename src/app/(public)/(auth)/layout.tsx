import type { Metadata } from 'next';

// Robots only: each route below sets its own title, and adding one here would
// be folded into the root title template and render as "IcyPlay | IcyPlay".
export const metadata: Metadata = {
	robots: { index: false, follow: false, nocache: true }
};

function Layout({ children }: { children: React.ReactNode }) {
	return children;
}

export default Layout;
