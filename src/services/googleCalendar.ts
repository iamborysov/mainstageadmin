// Google Calendar API Service
// Використовує Google Identity Services (GIS) для OAuth 2.0

const CLIENT_ID = '96741795198-e636q1mvmqhstrofaf2ue2ugv86krd6c.apps.googleusercontent.com'; // Користувач має замінити на свій Client ID
const SCOPES = 'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events';

interface GoogleUser {
  id: string;
  name: string;
  email: string;
  picture: string;
}

interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  location?: string;
  colorId?: string;
  calendarId?: string; // ID календаря з якого прийшла подія
  calendarName?: string; // Назва календаря
}

class GoogleCalendarService {
  private tokenClient: any = null;
  private accessToken: string | null = null;
  private user: GoogleUser | null = null;
  private isInitialized = false;

  // Ініціалізація Google Identity Services
  async initialize(clientId: string = CLIENT_ID): Promise<boolean> {
    if (this.isInitialized) return true;

    return new Promise((resolve) => {
      const checkGIS = () => {
        if ((window as any).google?.accounts?.oauth2) {
          this.tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
            client_id: clientId,
            scope: SCOPES,
            callback: (tokenResponse: any) => {
              if (tokenResponse.access_token) {
                this.accessToken = tokenResponse.access_token;
                this.loadUserInfo();
              }
            },
          });
          this.isInitialized = true;
          resolve(true);
        } else {
          setTimeout(checkGIS, 100);
        }
      };
      checkGIS();
    });
  }

  // Авторизація користувача
  async signIn(): Promise<boolean> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    return new Promise((resolve) => {
      if (!this.tokenClient) {
        resolve(false);
        return;
      }

      this.tokenClient.callback = async (tokenResponse: any) => {
        if (tokenResponse.access_token) {
          this.accessToken = tokenResponse.access_token;
          await this.loadUserInfo();
          resolve(true);
        } else {
          resolve(false);
        }
      };

      this.tokenClient.requestAccessToken();
    });
  }

  // Вихід
  signOut(): void {
    this.accessToken = null;
    this.user = null;
    localStorage.removeItem('google_access_token');
    localStorage.removeItem('google_user');
  }

  // Завантаження інформації про користувача
  private async loadUserInfo(): Promise<void> {
    if (!this.accessToken) return;

    try {
      const response = await fetch(
        'https://www.googleapis.com/oauth2/v2/userinfo',
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        this.user = {
          id: data.id,
          name: data.name,
          email: data.email,
          picture: data.picture,
        };
      } else {
        // Якщо не вдалось отримати userinfo, створюємо базового користувача
        this.user = {
          id: 'unknown',
          name: 'Google User',
          email: 'unknown',
          picture: '',
        };
      }
    } catch {
      this.user = {
        id: 'unknown',
        name: 'Google User',
        email: 'unknown',
        picture: '',
      };
    }

    // Зберігаємо в localStorage
    localStorage.setItem('google_access_token', this.accessToken);
    localStorage.setItem('google_user', JSON.stringify(this.user));
  }

  // Відновлення сесії з localStorage
  restoreSession(): boolean {
    const savedToken = localStorage.getItem('google_access_token');
    const savedUser = localStorage.getItem('google_user');

    if (savedToken && savedUser) {
      this.accessToken = savedToken;
      this.user = JSON.parse(savedUser);
      return true;
    }
    return false;
  }
  
  // Перевірка чи токен ще валідний (для фонової перевірки)
  async validateToken(): Promise<boolean> {
    if (!this.accessToken) return false;

    try {
      const response = await fetch(
        'https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=' + this.accessToken
      );
      if (!response.ok) {
        console.log('Token validation failed, but keeping session');
        return false;
      }
      return true;
    } catch (error) {
      console.log('Token validation error:', error);
      return false;
    }
  }

  // Отримання подій з календаря
  async getEvents(
    timeMin: string,
    timeMax: string,
    calendarId: string = 'primary'
  ): Promise<GoogleCalendarEvent[]> {
    if (!this.accessToken) {
      throw new Error('Not authenticated');
    }

    const params = new URLSearchParams({
      timeMin,
      timeMax,
      singleEvents: 'true',
      orderBy: 'startTime',
    });

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params}`,
      {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      }
    );

    if (response.status === 401) {
      // Токен закінчився - очищаємо сесію
      this.signOut();
      throw new Error('Token expired');
    }

    if (!response.ok) {
      throw new Error('Failed to fetch events');
    }

    const data = await response.json();
    // Додаємо інформацію про календар до кожної події
    const events = (data.items || []).map((event: GoogleCalendarEvent) => ({
      ...event,
      calendarId,
    }));
    return events;
  }

  // Отримання подій з декількох календарів
  async getEventsFromMultipleCalendars(
    timeMin: string,
    timeMax: string,
    calendarIds: string[]
  ): Promise<GoogleCalendarEvent[]> {
    if (!this.accessToken) {
      throw new Error('Not authenticated');
    }

    // Отримуємо події з усіх календарів паралельно
    const eventsPromises = calendarIds.map(async (calendarId) => {
      try {
        const events = await this.getEvents(timeMin, timeMax, calendarId);
        // Додаємо інформацію про календар
        const calendarInfo = await this.getCalendarInfo(calendarId);
        return events.map(event => ({
          ...event,
          calendarId,
          calendarName: calendarInfo?.summary || calendarId,
        }));
      } catch (error) {
        console.error(`Error fetching events from calendar ${calendarId}:`, error);
        return [];
      }
    });

    const allEventsArrays = await Promise.all(eventsPromises);
    // Об'єднуємо всі події і сортуємо за часом
    const allEvents = allEventsArrays.flat();
    return allEvents.sort((a, b) => {
      const aTime = a.start.dateTime || a.start.date || '';
      const bTime = b.start.dateTime || b.start.date || '';
      return new Date(aTime).getTime() - new Date(bTime).getTime();
    });
  }

  // Отримання інформації про конкретний календар
  async getCalendarInfo(calendarId: string): Promise<{ id: string; summary: string; description?: string } | null> {
    if (!this.accessToken) {
      return null;
    }

    try {
      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}`,
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
          },
        }
      );

      if (!response.ok) {
        return null;
      }

      return await response.json();
    } catch {
      return null;
    }
  }

  // Створення події в календарі
  async createEvent(
    event: {
      summary: string;
      description?: string;
      start: { dateTime: string; timeZone: string };
      end: { dateTime: string; timeZone: string };
      location?: string;
    },
    calendarId: string = 'primary'
  ): Promise<GoogleCalendarEvent> {
    if (!this.accessToken) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      }
    );

    if (!response.ok) {
      throw new Error('Failed to create event');
    }

    return await response.json();
  }

  // Видалення події
  async deleteEvent(eventId: string, calendarId: string = 'primary'): Promise<void> {
    if (!this.accessToken) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${eventId}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to delete event');
    }
  }

  // Отримання списку календарів
  async getCalendars(): Promise<{ id: string; summary: string; primary?: boolean }[]> {
    if (!this.accessToken) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(
      'https://www.googleapis.com/calendar/v3/users/me/calendarList',
      {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch calendars');
    }

    const data = await response.json();
    return data.items || [];
  }

  // Геттери
  getUser(): GoogleUser | null {
    return this.user;
  }

  isAuthenticated(): boolean {
    return !!this.accessToken;
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }
}

// Singleton instance
export const googleCalendarService = new GoogleCalendarService();
export type { GoogleUser, GoogleCalendarEvent };
