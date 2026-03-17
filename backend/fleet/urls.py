from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import FleetHubViewSet, VehicleViewSet, DriverViewSet, VehicleBookingViewSet, FleetItemViewSet

router = DefaultRouter()
router.register(r'hub', FleetHubViewSet)
router.register(r'vehicles', VehicleViewSet)
router.register(r'drivers', DriverViewSet)
router.register(r'bookings', VehicleBookingViewSet)

fleet_items = FleetItemViewSet.as_view({
    'post': 'create_vehicle',
})

urlpatterns = [
    path('', include(router.urls)),
    # Dedicated endpoints for item management to match GuestHouse pattern
    path('items/vehicles/', FleetItemViewSet.as_view({'post': 'create_vehicle'})),
    path('items/vehicles/<int:pk>/', FleetItemViewSet.as_view({'put': 'update_vehicle', 'delete': 'delete_vehicle'})),
    path('items/drivers/', FleetItemViewSet.as_view({'post': 'create_driver'})),
    path('items/drivers/<int:pk>/', FleetItemViewSet.as_view({'put': 'update_driver', 'delete': 'delete_driver'})),
]
