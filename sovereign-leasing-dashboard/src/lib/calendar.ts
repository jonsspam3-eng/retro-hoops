export interface CalendarProvider {
  providerName: string;
  createShowingEvent(input: {
    leadId: string;
    title: string;
    startsAt?: string | null;
    endsAt?: string | null;
    location?: string | null;
    notes?: string | null;
  }): Promise<{ ok: boolean; eventId?: string; message: string }>;
}

class MockCalendarProvider implements CalendarProvider {
  providerName = "MOCK_CALENDAR";

  async createShowingEvent(input: {
    leadId: string;
    title: string;
    startsAt?: string | null;
    endsAt?: string | null;
    location?: string | null;
    notes?: string | null;
  }): Promise<{ ok: boolean; eventId?: string; message: string }> {
    return {
      ok: true,
      eventId: `mock_event_${input.leadId}`,
      message: "Calendar placeholder only. No external calendar event was created.",
    };
  }
}

export const mockCalendarProvider: CalendarProvider = new MockCalendarProvider();

export function getCalendarProvider(): CalendarProvider {
  return mockCalendarProvider;
}

export async function createShowingEventPlaceholder(input: {
  leadId: string;
  title: string;
  startsAt?: string | null;
  endsAt?: string | null;
  location?: string | null;
  notes?: string | null;
}) {
  return getCalendarProvider().createShowingEvent(input);
}
