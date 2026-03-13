/*
 * TGS Service Worker for Push Notifications
 */

self.addEventListener('push', function(event) {
    console.log('[Service Worker] Push Received.');
    console.log(`[Service Worker] Push had this data: "${event.data.text()}"`);

    let data = {};
    try {
        data = event.data.json();
    } catch (e) {
        data = {
            title: 'TGS Notification',
            body: event.data.text()
        };
    }

    const title = data.title || 'TGS Alert';
    const options = {
        body: data.body || 'You have a new message from TGS.',
        icon: '/logo.png',
        badge: '/logo.png',
        data: data, // Preserve the full metadata object
        vibrate: [100, 50, 100],
        actions: data.actions || [
            {
                action: 'open',
                title: 'Open App'
            },
            {
                action: 'close',
                title: 'Close'
            }
        ]
    };

    event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function(event) {
    console.log('[Service Worker] Notification click Received.');

    const action = event.action;
    const notification = event.notification;
    const data = notification.data || {};
    
    notification.close();

    if (action === 'close') return;

    if (action === 'stop') {
        // Just closing is enough for 'stop' as it was already marked as sent by scheduler
        return;
    }

    if (action === 'snooze') {
        const snoozePromise = (async () => {
            try {
                // 1. Acknowledge current reminder first to clear duplicate check
                if (data.reminder_id) {
                    await fetch(`/api/notifications/reminders/${data.reminder_id}/`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ acknowledged: true })
                    });
                }

                // 2. Create the snoozed reminder
                const response = await fetch('/api/notifications/reminders/', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        title: `[SNOOZED] ${notification.title}`,
                        message: data.body || '',
                        remind_at: new Date(Date.now() + 5 * 60000).toISOString(),
                        category: data.category || 'other',
                        trip: data.trip_id || data.trip || null
                    })
                });
                
                if (!response.ok) throw new Error('Snooze failed');
                console.log('Snooze successful');
            } catch (err) {
                console.error('Snooze error:', err);
            }
        })();
        
        event.waitUntil(snoozePromise);
        return;
    }

    const urlToOpen = data.url || '/';

    event.waitUntil(
        clients.matchAll({
            type: 'window'
        }).then(function(clientList) {
            for (let i = 0; i < clientList.length; i++) {
                let client = clientList[i];
                if (client.url === urlToOpen && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});
