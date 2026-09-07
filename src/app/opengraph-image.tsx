import { ImageResponse } from 'next/og';
import { siteConfig } from '../utils/generateMetadata';

export const alt = 'IcyPlay - find, book and play on any sports court';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/**
 * Generated at build time so social previews never depend on a static image
 * file being kept in sync with the brand.
 */
export default function OpengraphImage() {
	return new ImageResponse(
		(
			<div
				style={{
					width: '100%',
					height: '100%',
					display: 'flex',
					flexDirection: 'column',
					justifyContent: 'center',
					padding: '80px',
					backgroundColor: '#071955',
					backgroundImage:
						'radial-gradient(circle at 12% 18%, rgba(37,99,235,0.55), transparent 42%), radial-gradient(circle at 88% 82%, rgba(0,153,255,0.25), transparent 38%)',
					fontFamily: 'sans-serif'
				}}
			>
				<div style={{ display: 'flex', alignItems: 'center', fontSize: 46, fontWeight: 800 }}>
					<span style={{ color: '#ffffff' }}>Icy</span>
					<span style={{ color: '#4d9bff' }}>Play</span>
				</div>

				<div
					style={{
						display: 'flex',
						marginTop: 40,
						fontSize: 82,
						fontWeight: 800,
						lineHeight: 1.08,
						color: '#ffffff',
						letterSpacing: '-0.02em'
					}}
				>
					Find. Book. Play.
				</div>

				<div
					style={{
						display: 'flex',
						marginTop: 28,
						maxWidth: 900,
						fontSize: 32,
						lineHeight: 1.4,
						color: '#a9c4ee'
					}}
				>
					{siteConfig.description}
				</div>

				<div style={{ display: 'flex', marginTop: 48, gap: 16 }}>
					{['Badminton', 'Basketball', 'Pickleball', 'Tennis', 'Volleyball'].map((sport) => (
						<div
							key={sport}
							style={{
								display: 'flex',
								padding: '12px 24px',
								borderRadius: 999,
								border: '2px solid rgba(169,196,238,0.35)',
								fontSize: 24,
								color: '#dceaff'
							}}
						>
							{sport}
						</div>
					))}
				</div>
			</div>
		),
		{ ...size }
	);
}
