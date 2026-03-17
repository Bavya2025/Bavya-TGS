from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    TripListCreateView, TravelListCreateView, TripDetailView, ExpenseViewSet, TravelClaimViewSet, 
    TravelAdvanceViewSet, TripOdometerViewSet, DashboardStatsView,
    ApprovalsView, ApprovalCountView, TripBookingSearchView, DisputeViewSet,
    PolicyDocumentViewSet, TripSettlementView, CFOWarRoomView, BulkActivityBatchViewSet, JobReportViewSet,
    TripTrackingView,
    TravelModeMasterViewSet, BookingTypeMasterViewSet, AirlineMasterViewSet,
    FlightClassMasterSerializer, FlightClassMasterViewSet, TrainClassMasterViewSet, BusOperatorMasterViewSet, BusTypeMasterViewSet,
    IntercityCabVehicleMasterViewSet, TravelProviderMasterViewSet,
    TrainProviderMasterViewSet, BusProviderMasterViewSet, IntercityCabProviderMasterViewSet,
    LocalTravelModeMasterViewSet, LocalCarSubTypeMasterViewSet, LocalBikeSubTypeMasterViewSet,
    LocalProviderMasterViewSet, StayTypeMasterViewSet, RoomTypeMasterViewSet,
    MealCategoryMasterViewSet, MealTypeMasterViewSet, IncidentalTypeMasterViewSet,
    CustomMasterDefinitionViewSet, CustomMasterValueViewSet, MasterModuleViewSet
)
from .views_export import ExpenseStatementPDFView, ExpenseStatementExcelView

router = DefaultRouter()
router.register(r'expenses', ExpenseViewSet)
router.register(r'claims', TravelClaimViewSet)
router.register(r'advances', TravelAdvanceViewSet)
router.register(r'odometers', TripOdometerViewSet)
router.register(r'disputes', DisputeViewSet)
router.register(r'policies', PolicyDocumentViewSet)
router.register(r'bulk-activities', BulkActivityBatchViewSet)
router.register(r'job-reports', JobReportViewSet)

# Master route registers (Travel)
router.register(r'travel-mode-masters', TravelModeMasterViewSet)
router.register(r'booking-type-masters', BookingTypeMasterViewSet)
router.register(r'airline-masters', AirlineMasterViewSet)
router.register(r'flight-class-masters', FlightClassMasterViewSet)
router.register(r'train-class-masters', TrainClassMasterViewSet)
router.register(r'bus-operator-masters', BusOperatorMasterViewSet)
router.register(r'bus-type-masters', BusTypeMasterViewSet)
router.register(r'intercity-cab-vehicle-masters', IntercityCabVehicleMasterViewSet)
router.register(r'travel-provider-masters', TravelProviderMasterViewSet)
router.register(r'train-provider-masters', TrainProviderMasterViewSet)
router.register(r'bus-provider-masters', BusProviderMasterViewSet)
router.register(r'intercity-cab-provider-masters', IntercityCabProviderMasterViewSet)

# Master route registers (Local)
router.register(r'local-travel-mode-masters', LocalTravelModeMasterViewSet)
router.register(r'local-car-subtype-masters', LocalCarSubTypeMasterViewSet)
router.register(r'local-bike-subtype-masters', LocalBikeSubTypeMasterViewSet)
router.register(r'local-provider-masters', LocalProviderMasterViewSet)

# Master route registers (Stay)
router.register(r'stay-type-masters', StayTypeMasterViewSet)
router.register(r'room-type-masters', RoomTypeMasterViewSet)

# Master route registers (Food)
router.register(r'meal-category-masters', MealCategoryMasterViewSet)
router.register(r'meal-type-masters', MealTypeMasterViewSet)

# Master route registers (Incidental)
router.register(r'incidental-type-masters', IncidentalTypeMasterViewSet)

# Master route registers (Custom/Dynamic)
router.register(r'master-modules', MasterModuleViewSet)
router.register(r'custom-master-definitions', CustomMasterDefinitionViewSet)
router.register(r'custom-master-values', CustomMasterValueViewSet)


urlpatterns = [
    path('trips/', TripListCreateView.as_view(), name='trip-list-create'),
    path('travels/', TravelListCreateView.as_view(), name='travel-list-create'),
    path('travels/<str:trip_id>/', TripDetailView.as_view(), name='travel-detail'),
    path('trips/approvals/', ApprovalsView.as_view(), name='trip-approvals-list'),
    path('trips/search/', TripBookingSearchView.as_view(), name='trip-search'),
    path('trips/<str:trip_id>/', TripDetailView.as_view(), name='trip-detail'),
    path('trips/<str:trip_id>/tracking/', TripTrackingView.as_view(), name='trip-tracking'),
    path('trips/<str:trip_id>/export/pdf/',   ExpenseStatementPDFView.as_view(),   name='trip-export-pdf'),
    path('trips/<str:trip_id>/export/excel/', ExpenseStatementExcelView.as_view(), name='trip-export-excel'),
    path('dashboard-stats/', DashboardStatsView.as_view(), name='dashboard-stats'),
    path('approvals/', ApprovalsView.as_view(), name='approvals'),
    path('approvals/count/', ApprovalCountView.as_view(), name='approvals-count'),
    path('settlement/', TripSettlementView.as_view(), name='trip-settlement'),
    path('war-room/', CFOWarRoomView.as_view(), name='war-room'),
    path('', include(router.urls)),
]
