from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    TripListCreateView, TripDetailView, ExpenseViewSet, TravelClaimViewSet, 
    TravelAdvanceViewSet, TripOdometerViewSet, DashboardStatsView,
    ApprovalsView, ApprovalCountView, TripBookingSearchView, DisputeViewSet,
    PolicyDocumentViewSet, TripSettlementView, CFOWarRoomView
)
from .views_export import ExpenseStatementPDFView, ExpenseStatementExcelView

router = DefaultRouter()
router.register(r'expenses', ExpenseViewSet)
router.register(r'claims', TravelClaimViewSet)
router.register(r'advances', TravelAdvanceViewSet)
router.register(r'odometers', TripOdometerViewSet)
router.register(r'disputes', DisputeViewSet)
router.register(r'policies', PolicyDocumentViewSet)

urlpatterns = [
    path('trips/', TripListCreateView.as_view(), name='trip-list-create'),
    path('trips/search/', TripBookingSearchView.as_view(), name='trip-search'),
    path('trips/<str:trip_id>/', TripDetailView.as_view(), name='trip-detail'),
    path('trips/<str:trip_id>/export/pdf/',   ExpenseStatementPDFView.as_view(),   name='trip-export-pdf'),
    path('trips/<str:trip_id>/export/excel/', ExpenseStatementExcelView.as_view(), name='trip-export-excel'),
    path('dashboard-stats/', DashboardStatsView.as_view(), name='dashboard-stats'),
    path('approvals/', ApprovalsView.as_view(), name='approvals'),
    path('approvals/count/', ApprovalCountView.as_view(), name='approvals-count'),
    path('settlement/', TripSettlementView.as_view(), name='trip-settlement'),
    path('war-room/', CFOWarRoomView.as_view(), name='war-room'),
    path('', include(router.urls)),
]
