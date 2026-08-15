import mockApi from 'src/@mock-utils/mockApi';
import { CalendarEvent } from '@/app/(control-panel)/apps/calendar/api/types';

/**
 * GET api/mock/calendar/events
 */
export async function GET(req: Request) {
	const url = new URL(req.url);
	const queryParams = Object.fromEntries(url.searchParams.entries());
	const api = mockApi('calendar_events');
	const items = await api.findAll<CalendarEvent>(queryParams);

	return new Response(JSON.stringify(items), { status: 200 });
}

/**
 * POST api/mock/calendar/events
 */
export async function POST(req: Request) {
	const api = mockApi('calendar_events');
	const requestData = (await req.json()) as CalendarEvent;
	const newItem = await api.create<CalendarEvent>(requestData);

	return new Response(JSON.stringify(newItem), { status: 201 });
}
