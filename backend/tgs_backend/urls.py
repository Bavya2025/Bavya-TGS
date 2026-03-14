from django.urls import path, include
from api_management.views import ApiKeyUpdateView

urlpatterns = [
    path('api/', include(('core.urls', 'core'), namespace='core')),
    path('api/', include(('api_management.urls', 'api_management'), namespace='api_management')),
    path('api/', include(('travel.urls', 'travel'), namespace='travel')),
    path('api/guesthouse/', include(('guest_house.urls', 'guest_house'), namespace='guest_house')),
    path('api/masters/', include(('travel_masters.urls', 'travel_masters'), namespace='travel_masters')),
    path('api/fleet/', include(('fleet.urls', 'fleet'), namespace='fleet')),
    path('api/bot/', include(('chatbot.urls', 'chatbot'), namespace='chatbot')),
    path('api/notifications/', include(('notifications.urls', 'notifications'), namespace='notifications')),
    path('apikey/', ApiKeyUpdateView.as_view(), name='update-api-key'),
]
