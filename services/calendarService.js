import crypto from "crypto";

class CalendarService {
  constructor() {
    this.timezone = "UTC";
  }

  /**
   * Generate ICS calendar event for demo session
   */
  generateDemoSessionEvent(userDetails, sessionDetails, zoomDetails) {
    const eventId = this.generateEventId();
    const startTime = new Date(zoomDetails.scheduled_for);
    const endTime = new Date(
      startTime.getTime() + (sessionDetails.session_duration || 60) * 60 * 1000,
    );

    const icsContent = this.createICSContent({
      uid: eventId,
      title: `Medh Demo Session - ${sessionDetails.course_category.replace("_", " ").toUpperCase()}`,
      description: this.createEventDescription(
        userDetails,
        sessionDetails,
        zoomDetails,
      ),
      startTime,
      endTime,
      location: zoomDetails.meeting_url,
      organizer: {
        name: "Medh Learning Platform",
        email: process.env.EMAIL_FROM || "noreply@medh.co",
      },
      attendee: {
        name: userDetails.full_name,
        email: userDetails.email,
      },
    });

    return {
      event_id: eventId,
      event_url: this.generateEventUrl(eventId),
      ics_content: icsContent,
      start_time: startTime,
      end_time: endTime,
    };
  }

  /**
   * Create ICS file content
   */
  createICSContent(eventData) {
    const formatDate = (date) => {
      return date
        .toISOString()
        .replace(/[-:]/g, "")
        .replace(/\.\d{3}/, "");
    };

    const escapeText = (text) => {
      return text.replace(/[,;\\]/g, "\\$&").replace(/\n/g, "\\n");
    };

    const icsLines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Medh Learning Platform//Demo Session//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:REQUEST",
      "BEGIN:VEVENT",
      `UID:${eventData.uid}`,
      `DTSTART:${formatDate(eventData.startTime)}`,
      `DTEND:${formatDate(eventData.endTime)}`,
      `DTSTAMP:${formatDate(new Date())}`,
      `SUMMARY:${escapeText(eventData.title)}`,
      `DESCRIPTION:${escapeText(eventData.description)}`,
      `LOCATION:${escapeText(eventData.location)}`,
      `ORGANIZER;CN=${eventData.organizer.name}:MAILTO:${eventData.organizer.email}`,
      `ATTENDEE;CN=${eventData.attendee.name};RSVP=TRUE:MAILTO:${eventData.attendee.email}`,
      "STATUS:CONFIRMED",
      "SEQUENCE:0",
      "PRIORITY:5",
      "CLASS:PUBLIC",
      "TRANSP:OPAQUE",
      "BEGIN:VALARM",
      "TRIGGER:-PT15M",
      "ACTION:DISPLAY",
      "DESCRIPTION:Demo session reminder - 15 minutes",
      "END:VALARM",
      "BEGIN:VALARM",
      "TRIGGER:-PT1H",
      "ACTION:EMAIL",
      "DESCRIPTION:Demo session reminder - 1 hour",
      `SUMMARY:Upcoming Demo Session: ${escapeText(eventData.title)}`,
      `ATTENDEE:MAILTO:${eventData.attendee.email}`,
      "END:VALARM",
      "END:VEVENT",
      "END:VCALENDAR",
    ];

    return icsLines.join("\r\n");
  }

  /**
   * Create event description
   */
  createEventDescription(userDetails, sessionDetails, zoomDetails) {
    const description = [
      `Welcome to your Medh Learning Platform demo session!`,
      ``,
      `📚 Course Category: ${sessionDetails.course_category.replace("_", " ").toUpperCase()}`,
      `📊 Level: ${sessionDetails.grade_level.toUpperCase()}`,
      `⏱️ Duration: ${sessionDetails.session_duration || 60} minutes`,
      ``,
      `🔗 Join Zoom Meeting: ${zoomDetails.meeting_url}`,
      `🔑 Meeting Password: ${zoomDetails.meeting_password}`,
      `📱 Meeting ID: ${zoomDetails.meeting_id}`,
      ``,
      `📝 What to expect:`,
      `- Overview of the ${sessionDetails.course_category.replace("_", " ")} curriculum`,
      `- Live demonstration of key concepts`,
      `- Q&A session tailored to your ${sessionDetails.grade_level} level`,
      `- Next steps for enrollment`,
      ``,
      `💡 Preparation tips:`,
      `- Test your audio/video before the session`,
      `- Prepare any questions you'd like to ask`,
      `- Have a notebook ready for taking notes`,
      ``,
      `📞 Need help? Contact us at support@medh.co`,
      ``,
      `We're excited to show you what Medh Learning Platform has to offer!`,
    ];

    return description.join("\\n");
  }

  /**
   * Generate unique event ID
   */
  generateEventId() {
    const timestamp = Date.now().toString(36);
    const randomStr = crypto.randomBytes(8).toString("hex");
    return `medh-demo-${timestamp}-${randomStr}@medh.co`;
  }

  /**
   * Generate event URL (for calendar integration)
   */
  generateEventUrl(eventId) {
    const baseUrl = process.env.FRONTEND_URL || "https://app.medh.co";
    return `${baseUrl}/demo/calendar-event/${eventId}`;
  }

  /**
   * Generate Google Calendar URL
   */
  generateGoogleCalendarUrl(eventData) {
    const formatGoogleDate = (date) => {
      return date
        .toISOString()
        .replace(/[-:]/g, "")
        .replace(/\.\d{3}Z/, "Z");
    };

    const params = new URLSearchParams({
      action: "TEMPLATE",
      text: eventData.title,
      dates: `${formatGoogleDate(eventData.startTime)}/${formatGoogleDate(eventData.endTime)}`,
      details: eventData.description.replace(/\\n/g, "\n"),
      location: eventData.location,
      trp: "false",
    });

    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  }

  /**
   * Generate Outlook Calendar URL
   */
  generateOutlookCalendarUrl(eventData) {
    const formatOutlookDate = (date) => {
      return date.toISOString();
    };

    const params = new URLSearchParams({
      subject: eventData.title,
      startdt: formatOutlookDate(eventData.startTime),
      enddt: formatOutlookDate(eventData.endTime),
      body: eventData.description.replace(/\\n/g, "\n"),
      location: eventData.location,
      allday: "false",
    });

    return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
  }

  /**
   * Generate calendar integration URLs
   */
  generateCalendarUrls(eventData) {
    return {
      google: this.generateGoogleCalendarUrl(eventData),
      outlook: this.generateOutlookCalendarUrl(eventData),
      ics_download: `${process.env.BACKEND_URL || "https://api.medh.co"}/api/v1/demo/calendar/${eventData.uid}.ics`,
    };
  }
}

export default new CalendarService();
