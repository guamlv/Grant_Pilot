export const downloadICS = (events) => {
  let ics = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//GrantPilot//Grant Management//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
`;

  events.forEach(event => {
    if (!event.date) return;
    const dateStr = event.date.replace(/-/g, '');
    const uid = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}@grantpilot`;
    const nextDay = new Date(event.date);
    nextDay.setDate(nextDay.getDate() + 1);
    const endStr = nextDay.toISOString().split('T')[0].replace(/-/g, '');

    ics += `BEGIN:VEVENT
UID:${uid}
DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z
DTSTART;VALUE=DATE:${dateStr}
DTEND;VALUE=DATE:${endStr}
SUMMARY:${event.title}
DESCRIPTION:${event.description || ''}
STATUS:CONFIRMED
END:VEVENT
`;
  });

  ics += `END:VCALENDAR`;

  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'grantpilot_deadlines.ics';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
