from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    LocationViewSet, RouteViewSet, RoutePathViewSet, 
    TollGateViewSet, TollRateViewSet, RoutePathTollViewSet, FuelRateMasterViewSet
)

router = DefaultRouter()
router.register(r'locations', LocationViewSet, basename='location')
router.register(r'routes', RouteViewSet)
router.register(r'route-paths', RoutePathViewSet)
router.register(r'toll-gates', TollGateViewSet)
router.register(r'toll-rates', TollRateViewSet)
router.register(r'route-path-tolls', RoutePathTollViewSet)
router.register(r'fuel-rate-masters', FuelRateMasterViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
