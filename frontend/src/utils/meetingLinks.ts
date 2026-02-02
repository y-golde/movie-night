/**
 * Generate calendar and map links for meetings
 */

export const generateGoogleCalendarLink = (
  title: string,
  startTime: Date,
  location?: string,
  description?: string
): string => {
  const formatDate = (date: Date): string => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${formatDate(startTime)}/${formatDate(new Date(startTime.getTime() + 3 * 60 * 60 * 1000))}`, // 3 hour duration
    details: description || '',
    location: location || '',
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
};

export const generateICalLink = (
  title: string,
  startTime: Date,
  location?: string,
  description?: string
): string => {
  const formatDate = (date: Date): string => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  const endTime = new Date(startTime.getTime() + 3 * 60 * 60 * 1000); // 3 hour duration

  const icalContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Movie Night//EN',
    'BEGIN:VEVENT',
    `DTSTART:${formatDate(startTime)}`,
    `DTEND:${formatDate(endTime)}`,
    `SUMMARY:${title}`,
    `DESCRIPTION:${description || ''}`,
    `LOCATION:${location || ''}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\n');

  const blob = new Blob([icalContent], { type: 'text/calendar' });
  return URL.createObjectURL(blob);
};

export const generateGoogleMapsLink = (address: string): string => {
  const encodedAddress = encodeURIComponent(address);
  return `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
};

export const generateWazeLink = (address: string): string => {
  const encodedAddress = encodeURIComponent(address);
  return `https://waze.com/ul?q=${encodedAddress}`;
};
