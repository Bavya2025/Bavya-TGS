from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import GuestHouseView, GuestHouseDetailView, RoomBookingView
from .views_items import (
    RoomViewSet, KitchenViewSet, CookViewSet, 
    LaundryViewSet, ContactViewSet
)

router = DefaultRouter()
router.register(r'rooms', RoomViewSet)
router.register(r'kitchens', KitchenViewSet)
router.register(r'cooks', CookViewSet)
router.register(r'laundries', LaundryViewSet)
router.register(r'contacts', ContactViewSet)

urlpatterns = [
    path('', GuestHouseView.as_view(), name='guesthouse-list-create'),
    path('items/', include(router.urls)), 
    path('<str:pk>', GuestHouseDetailView.as_view(), name='guesthouse-detail'),
    path('rooms/<int:room_id>/bookings', RoomBookingView.as_view(), name='room-bookings'),
]
