import Link from 'next/link';
import HeaderAccountMenu from './components/ui/HeaderAccountMenu';
import generateMetadata from '@/utils/generateMetadata';

export const metadata = generateMetadata({ path: '/' });

const navItems = ['Courts', 'How It Works', 'For Facility Owners', 'Pricing', 'Help Center'];

const searchFields = [
	{ label: 'Type of Court', value: 'Select sport', icon: 'court' },
	{ label: 'Date', value: 'Select date', icon: 'calendar' },
	{ label: 'Time', value: 'Select time', icon: 'clock' },
	{ label: 'Location', value: 'Enter location', icon: 'pin' }
];

const sports = [
	{ name: 'Badminton', icon: 'badminton' },
	{ name: 'Basketball', icon: 'basketball' },
	{ name: 'Pickleball', icon: 'pickleball' },
	{ name: 'Tennis', icon: 'tennis' },
	{ name: 'Volleyball', icon: 'volleyball' },
	{ name: 'Taekwondo', icon: 'taekwondo' }
];

const features = [
	{
		title: 'Thousands of Courts',
		description: 'Discover verified sports courts nearby, from neighborhood gyms to premium clubs.',
		icon: 'map'
	},
	{
		title: 'Real-Time Availability',
		description: 'See open slots instantly and reserve the exact time your group needs.',
		icon: 'calendar-check'
	},
	{
		title: 'Safe & Secure',
		description: 'Protected checkout, trusted venues, and clear booking confirmations.',
		icon: 'shield'
	},
	{
		title: 'For Everyone',
		description: 'Built for solo players, teams, coaches, clubs, and court operators.',
		icon: 'users'
	}
];

function Icon({ name, className = 'h-6 w-6' }: { name: string; className?: string }) {
	const props = {
		className,
		viewBox: '0 0 24 24',
		fill: 'none',
		xmlns: 'http://www.w3.org/2000/svg',
		'aria-hidden': true
	};

	switch (name) {
		case 'court':
			return (
				<svg {...props}>
					<circle
						cx="12"
						cy="12"
						r="8"
						stroke="currentColor"
						strokeWidth="1.8"
					/>
					<path
						d="M12 4v16M4 12h16M7 6.5c2.6 2.5 2.6 8.5 0 11M17 6.5c-2.6 2.5-2.6 8.5 0 11"
						stroke="currentColor"
						strokeWidth="1.5"
						strokeLinecap="round"
					/>
				</svg>
			);
		case 'calendar':
		case 'calendar-check':
			return (
				<svg {...props}>
					<rect
						x="4"
						y="5"
						width="16"
						height="15"
						rx="4"
						stroke="currentColor"
						strokeWidth="1.8"
					/>
					<path
						d="M8 3v4M16 3v4M4 10h16"
						stroke="currentColor"
						strokeWidth="1.8"
						strokeLinecap="round"
					/>
					{name === 'calendar-check' && (
						<path
							d="m8.5 15 2.2 2.1 4.8-5"
							stroke="currentColor"
							strokeWidth="1.8"
							strokeLinecap="round"
							strokeLinejoin="round"
						/>
					)}
				</svg>
			);
		case 'clock':
			return (
				<svg {...props}>
					<circle
						cx="12"
						cy="12"
						r="8"
						stroke="currentColor"
						strokeWidth="1.8"
					/>
					<path
						d="M12 7v5l3 2"
						stroke="currentColor"
						strokeWidth="1.8"
						strokeLinecap="round"
					/>
				</svg>
			);
		case 'pin':
		case 'map':
			return (
				<svg {...props}>
					<path
						d="M19 10c0 5-7 10-7 10S5 15 5 10a7 7 0 1 1 14 0Z"
						stroke="currentColor"
						strokeWidth="1.8"
					/>
					<circle
						cx="12"
						cy="10"
						r="2.4"
						stroke="currentColor"
						strokeWidth="1.8"
					/>
				</svg>
			);
		case 'search':
			return (
				<svg {...props}>
					<circle
						cx="11"
						cy="11"
						r="6"
						stroke="currentColor"
						strokeWidth="2"
					/>
					<path
						d="m16 16 4 4"
						stroke="currentColor"
						strokeWidth="2"
						strokeLinecap="round"
					/>
				</svg>
			);
		case 'chevron':
			return (
				<svg {...props}>
					<path
						d="m7 10 5 5 5-5"
						stroke="currentColor"
						strokeWidth="2"
						strokeLinecap="round"
						strokeLinejoin="round"
					/>
				</svg>
			);
		case 'shield':
			return (
				<svg {...props}>
					<path
						d="M12 3 20 6v6c0 5-3.4 7.7-8 9-4.6-1.3-8-4-8-9V6l8-3Z"
						stroke="currentColor"
						strokeWidth="1.8"
					/>
					<path
						d="m8.5 12 2.2 2.2 4.8-5"
						stroke="currentColor"
						strokeWidth="1.8"
						strokeLinecap="round"
						strokeLinejoin="round"
					/>
				</svg>
			);
		case 'users':
			return (
				<svg {...props}>
					<circle
						cx="12"
						cy="8"
						r="3"
						stroke="currentColor"
						strokeWidth="1.8"
					/>
					<path
						d="M6 20v-1.5a6 6 0 0 1 12 0V20M5.5 11a2.6 2.6 0 0 0 0 5M18.5 11a2.6 2.6 0 0 1 0 5"
						stroke="currentColor"
						strokeWidth="1.8"
						strokeLinecap="round"
					/>
				</svg>
			);
		case 'arrow':
			return (
				<svg {...props}>
					<path
						d="M5 12h14M13 6l6 6-6 6"
						stroke="currentColor"
						strokeWidth="2"
						strokeLinecap="round"
						strokeLinejoin="round"
					/>
				</svg>
			);
		default:
			return null;
	}
}

function SportIcon({ name }: { name: string }) {
	return (
		<img
			src={`/assets/icons/${name}.svg`}
			alt=""
			className="h-10 w-10 object-contain"
			aria-hidden
		/>
	);
}

export default function LandingPage() {
	return (
		<main className="min-h-screen bg-white text-slate-950">
			<header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3 lg:px-8">
				<Link
					href="/"
					className="flex items-center"
					aria-label="IcyPlay home"
				>
					<img
						src="/assets/images/logo/IcyPlay%20Logo.png"
						alt="IcyPlay"
						className="h-20 w-auto object-contain"
					/>
				</Link>

				<nav className="hidden items-center gap-10 text-base font-semibold text-slate-700 lg:flex">
					{navItems.map((item) => (
						<Link
							key={item}
							href={`#${item.toLowerCase().replace(/\s+/g, '-')}`}
							className="transition hover:text-[#2563EB]"
						>
							{item}
						</Link>
					))}
				</nav>

				<div className="flex items-center gap-3">
					<Link
						href="/dashboards/project"
						className="rounded-full bg-[#2563EB] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700"
					>
						Become a Partner
					</Link>
					<HeaderAccountMenu />
				</div>
			</header>

			<section className="mx-auto max-w-7xl px-6 pb-12 pt-0 lg:px-8 lg:pb-16">
				<div className="grid items-center gap-8 lg:grid-cols-[0.95fr_1.05fr]">
					<div>
						<div className="mb-7 inline-flex rounded-full border border-blue-100 bg-blue-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#2563EB]">
							Play more. Manage less.
						</div>

						<h1 className="max-w-4xl text-[40px] font-bold leading-[1.08] tracking-normal text-slate-950 sm:text-[52px] lg:text-[62px]">
							Find. Book. <span className="text-[#2563EB]">Play.</span> Any Court, Anytime.
						</h1>

						<p className="mt-5 max-w-xl text-lg leading-8 text-slate-600">
							Discover and reserve your favorite sports courts with ease. IcyPlay brings court discovery,
							availability, bookings, and payment verification into one seamless experience.
						</p>

					</div>

					<div className="relative min-h-[330px] lg:min-h-[410px]">
						<img
							src="/assets/images/landing/icyplay_hero_illustration.svg"
							alt="IcyPlay sports court booking illustration"
							className="absolute inset-0 h-full w-full object-contain"
						/>
					</div>
				</div>

				<section
					id="search"
					className="relative z-10 mt-8 rounded-[18px] border border-blue-100 bg-white p-3 shadow-[0_22px_70px_rgba(37,99,235,0.12)]"
				>
					<div className="grid gap-0 lg:grid-cols-[repeat(4,minmax(0,1fr))_210px]">
						{searchFields.map((field, index) => (
							<button
								key={field.label}
								type="button"
								className="group flex min-h-[74px] items-center justify-between gap-4 px-6 py-3 text-left transition hover:bg-blue-50/50 lg:border-r lg:border-blue-100"
							>
								<span className="flex min-w-0 items-center gap-5">
									<span className="flex h-11 w-11 shrink-0 items-center justify-center text-[#2563EB] transition group-hover:scale-105">
										<Icon
											name={field.icon}
											className="h-9 w-9"
										/>
									</span>
									<span className="min-w-0">
										<span className="block text-sm font-bold text-[#071A55]">{field.label}</span>
										<span className="mt-1 block truncate text-base font-medium text-[#4B5C93]">
											{field.value}
										</span>
									</span>
								</span>
								{index < searchFields.length && (
									<Icon
										name="chevron"
										className="h-5 w-5 shrink-0 text-[#4B5C93]"
									/>
								)}
							</button>
						))}

						<button
							type="button"
							className="flex min-h-[74px] items-center justify-center gap-4 rounded-xl bg-[#2563EB] px-7 py-3 text-lg font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700"
						>
							<Icon
								name="search"
								className="h-8 w-8"
							/>
							Find Courts
						</button>
					</div>
				</section>

				<section
					id="courts"
					className="pt-16"
				>
					<div className="mb-7 flex items-end justify-between gap-4">
						<div>
							<p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#2563EB]">Popular sports</p>
							<h2 className="mt-3 text-3xl font-bold tracking-normal text-slate-950">Choose your court</h2>
						</div>
						<Link
							href="#"
							className="hidden items-center gap-2 text-sm font-semibold text-[#2563EB] sm:flex"
						>
							View all
							<Icon
								name="arrow"
								className="h-4 w-4"
							/>
						</Link>
					</div>

					<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
						{sports.map((sport) => (
							<button
								key={sport.name}
								type="button"
								className="flex min-h-[116px] flex-col items-start justify-between rounded-[24px] border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl hover:shadow-slate-200/70"
							>
								<SportIcon name={sport.icon} />
								<span className="text-base font-semibold text-slate-950">{sport.name}</span>
							</button>
						))}
					</div>
				</section>

				<section
					id="how-it-works"
					className="pt-16"
				>
					<div className="rounded-[24px] border border-slate-200 bg-slate-50 p-6 lg:p-8">
						<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
							{features.map((feature) => (
								<div
									key={feature.title}
									className="rounded-[24px] bg-white p-6 shadow-sm ring-1 ring-slate-200/70"
								>
									<div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-[#2563EB]">
										<Icon name={feature.icon} />
									</div>
									<h3 className="text-lg font-semibold text-slate-950">{feature.title}</h3>
									<p className="mt-3 text-sm leading-6 text-slate-600">{feature.description}</p>
								</div>
							))}
						</div>
					</div>
				</section>
			</section>
		</main>
	);
}
