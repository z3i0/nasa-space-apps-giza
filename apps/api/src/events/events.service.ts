import { Injectable, type MessageEvent } from '@nestjs/common';
import { Subject, Observable, merge, interval } from 'rxjs';
import { filter, map } from 'rxjs/operators';

export interface MentorshipMessageEvent {
  requestId: string;
  message: unknown;
}

export interface UserNotificationEvent {
  userId: string;
  notification: unknown;
}

@Injectable()
export class EventsService {
  private readonly mentorshipMessages$ = new Subject<MentorshipMessageEvent>();
  private readonly userNotifications$ = new Subject<UserNotificationEvent>();

  emitMentorshipMessage(requestId: string, message: unknown): void {
    this.mentorshipMessages$.next({ requestId, message });
  }

  emitNotification(userId: string, notification: unknown): void {
    this.userNotifications$.next({ userId, notification });
  }

  getMentorshipMessageStream(requestId: string): Observable<MessageEvent> {
    const messages$ = this.mentorshipMessages$.asObservable().pipe(
      filter((event) => event.requestId === requestId),
      map(
        (event) =>
          ({
            type: 'message',
            data: event.message,
          }) as MessageEvent,
      ),
    );

    const heartbeat$ = interval(25000).pipe(
      map(
        () =>
          ({
            type: 'ping',
            data: { time: Date.now() },
          }) as MessageEvent,
      ),
    );

    return merge(messages$, heartbeat$);
  }

  getNotificationStream(userId: string): Observable<MessageEvent> {
    const notifications$ = this.userNotifications$.asObservable().pipe(
      filter((event) => event.userId === userId),
      map(
        (event) =>
          ({
            type: 'notification',
            data: event.notification,
          }) as MessageEvent,
      ),
    );

    const heartbeat$ = interval(25000).pipe(
      map(
        () =>
          ({
            type: 'ping',
            data: { time: Date.now() },
          }) as MessageEvent,
      ),
    );

    return merge(notifications$, heartbeat$);
  }
}

