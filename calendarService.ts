import { Grant, Task } from '../types';

export const generateICSFile = (events: Array<{ title: string, description: string, date: string, type: 'Deadline' | 'Task' }>) => {
  let icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//GrantPilot AI//Grant Management//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
`;

  events.forEach(event => {
    // Format date to YYYYMMDD
    const dateStr = event.date.replace(/-/g, '');
    
    // Create a unique ID
    const uid = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}@grantpilot.app`;
    
    // End date for full day events is usually +1 day
    const nextDay = new Date(event.date);
    nextDay.setDate(nextDay.getDate() + 1);
    const endDateStr = nextDay.toISOString().split('T')[0].replace(/-/g, '');

    icsContent += `BEGIN:VEVENT
UID:${uid}
DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z
DTSTART;VALUE=DATE:${dateStr}
DTEND;VALUE=DATE:${endDateStr}
SUMMARY:${event.type}: ${event.title}
DESCRIPTION:${event.description}
STATUS:CONFIRMED
TRANSP:TRANSPARENT
END:VEVENT
`;
  });

  icsContent += `END:VCALENDAR`;

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const link = document.createElement('a');
  link.href = window.URL.createObjectURL(blob);
  link.setAttribute('download', 'grant_schedule.ics');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};