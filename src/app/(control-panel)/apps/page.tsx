import { redirect } from 'next/navigation';

function AppsPage() {
	redirect('/apps/calendar');
	return null;
}

export default AppsPage;
