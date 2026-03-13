import time
import datetime
from django.core.management.base import BaseCommand
from django.utils import timezone
from notifications.models import Reminder, Notification, PushSubscription
from pywebpush import webpush, WebPushException
import json
from django.conf import settings

class Command(BaseCommand):
    help = 'Runs a scheduler to check for due reminders and send notifications'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Notification scheduler started...'))
        
        while True:
            try:
                self.process_reminders()
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'Error in scheduler: {str(e)}'))
            
            # Run every minute
            time.sleep(60)

    def process_reminders(self):
        now = timezone.now()
        due_reminders = Reminder.objects.filter(remind_at__lte=now, is_sent=False)
        
        if not due_reminders.exists():
            return

        self.stdout.write(f"Processing {due_reminders.count()} due reminders...")

        for reminder in due_reminders:
            # 1. Create In-App Notification (using local time for display)
            local_time = timezone.localtime(reminder.remind_at)
            Notification.objects.create(
                user=reminder.user,
                title=reminder.title,
                message=f"{reminder.message} (Triggered at: {local_time.strftime('%H:%M')})" if reminder.message else f"Reminder triggered at {local_time.strftime('%H:%M')}",
                type='info'
            )
            
            # 2. Send Web Push Notification
            self.send_push_notification(reminder)
            
            # 3. Mark as sent
            reminder.is_sent = True
            reminder.save()
            
            self.stdout.write(self.style.SUCCESS(f"Sent reminder: {reminder.title} to {reminder.user.employee_id}"))

    def send_push_notification(self, reminder):
        subscriptions = PushSubscription.objects.filter(user=reminder.user)
        local_time = timezone.localtime(reminder.remind_at)
        payload = {
            "title": "Trip Reminder",
            "body": f"{reminder.title} (Trigger Time: {local_time.strftime('%H:%M')})",
            "icon": "/logo.png",
            "badge": "/logo.png",
            "data": {
                "reminder_id": reminder.id,
                "trip_id": reminder.trip_id if reminder.trip else None,
                "category": reminder.category,
                "url": f"/trip-story/{reminder.trip_id}" if reminder.trip else "/"
            },
            "actions": [
                {
                    "action": "stop",
                    "title": "Stop Alarm"
                },
                {
                    "action": "snooze",
                    "title": "Snooze 5m"
                }
            ]
        }

        for sub in subscriptions:
            try:
                webpush(
                    subscription_info={
                        "endpoint": sub.endpoint,
                        "keys": {
                            "p256dh": sub.p256dh,
                            "auth": sub.auth
                        }
                    },
                    data=json.dumps(payload),
                    vapid_private_key=settings.VAPID_PRIVATE_KEY,
                    vapid_claims={
                        "sub": settings.VAPID_CLAIM_EMAIL
                    }
                )
                self.stdout.write(self.style.SUCCESS(f"Push sent to {sub.browser} for {reminder.user.employee_id}"))
            except WebPushException as ex:
                self.stdout.write(self.style.WARNING(f"Push failed for {sub.browser}: {ex}"))
                # If 410 Gone, the subscription is expired
                if ex.response is not None and ex.response.status_code == 410:
                    sub.delete()
