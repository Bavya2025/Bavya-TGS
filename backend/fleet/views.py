from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import FleetHub, Vehicle, Driver, VehicleBooking
from .serializers import FleetHubSerializer, VehicleSerializer, DriverSerializer, VehicleBookingSerializer
from core.permissions import IsCustomAuthenticated
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from django.utils.dateparse import parse_datetime
from django.db.models import Q

class FleetHubViewSet(viewsets.ModelViewSet):
    queryset = FleetHub.objects.prefetch_related('vehicles__bookings', 'drivers').all()
    serializer_class = FleetHubSerializer

class VehicleViewSet(viewsets.ModelViewSet):
    queryset = Vehicle.objects.all()
    serializer_class = VehicleSerializer

    @action(detail=True, methods=['post'])
    def bookings(self, request, pk=None):
        from notifications.models import Notification
        from travel.models import Trip

        vehicle = self.get_object()
        data = request.data.copy()
        data['vehicle'] = vehicle.id

        # The frontend sends trip_id as the human-readable string (e.g. "TRP-2026-1843").
        # The serializer needs the DB PK (integer). Resolve it here.
        trip_id_str = data.get('trip')
        trip_obj = None
        if trip_id_str:
            try:
                trip_obj = Trip.objects.get(trip_id=trip_id_str)
                data['trip'] = trip_obj.pk
            except Trip.DoesNotExist:
                data['trip'] = None

        serializer = VehicleBookingSerializer(data=data)
        if serializer.is_valid():
            booking = serializer.save(vehicle=vehicle)

            # Notify the trip owner
            if trip_obj and trip_obj.user:
                driver_info = f" Driver: {booking.driver.name}." if booking.driver else ""
                Notification.objects.create(
                    user=trip_obj.user,
                    title="Vehicle Confirmed",
                    message=f"Vehicle {vehicle.plate_number} ({vehicle.model_name}) has been allocated for your trip {trip_obj.trip_id} to {trip_obj.destination}.{driver_info}",
                    type='info'
                )

            return Response(VehicleBookingSerializer(booking).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class DriverViewSet(viewsets.ModelViewSet):
    queryset = Driver.objects.all()
    serializer_class = DriverSerializer

class VehicleBookingViewSet(viewsets.ModelViewSet):
    queryset = VehicleBooking.objects.all()
    serializer_class = VehicleBookingSerializer

# Simple CRUD for items (Vehicles, Drivers) under a Hub context if needed
class FleetItemViewSet(viewsets.ViewSet):
    def create_vehicle(self, request):
        serializer = VehicleSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def update_vehicle(self, request, pk=None):
        try:
            vehicle = Vehicle.objects.get(pk=pk)
            serializer = VehicleSerializer(vehicle, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        except Vehicle.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

    def delete_vehicle(self, request, pk=None):
        try:
            vehicle = Vehicle.objects.get(pk=pk)
            vehicle.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Vehicle.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

    def create_driver(self, request):
        serializer = DriverSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def update_driver(self, request, pk=None):
        try:
            driver = Driver.objects.get(pk=pk)
            serializer = DriverSerializer(driver, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        except Driver.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

    def delete_driver(self, request, pk=None):
        try:
            driver = Driver.objects.get(pk=pk)
            driver.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Driver.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)


# Simple CRUD for items (Vehicles, Drivers) under a Hub context if needed


@api_view(['GET'])
@permission_classes([IsCustomAuthenticated])
def available_assets(request):
    """
    Returns vehicles and drivers that are truly free:
    - Vehicle: status='available' AND no active VehicleBooking overlapping the given date range.
    - Driver: availability='Available' AND no active VehicleBooking overlapping the given date range.

    Query params (optional):
      start_date  – ISO datetime string (e.g. 2026-03-16T00:00:00)
      end_date    – ISO datetime string
    """
    start_str = request.query_params.get('start_date')
    end_str   = request.query_params.get('end_date')
    start_dt  = parse_datetime(start_str) if start_str else None
    end_dt    = parse_datetime(end_str)   if end_str   else None

    # --- Vehicles ---
    # Step 1: base filter – only those marked available
    vehicle_qs = Vehicle.objects.filter(status='available').select_related('hub')

    # Step 2: exclude those with an overlapping booking
    if start_dt and end_dt:
        booked_vehicle_ids = VehicleBooking.objects.filter(
            start_date__lt=end_dt,
            end_date__gt=start_dt
        ).values_list('vehicle_id', flat=True)
        vehicle_qs = vehicle_qs.exclude(id__in=booked_vehicle_ids)

    # --- Drivers ---
    driver_qs = Driver.objects.filter(
        Q(availability__iexact='available') | Q(status__iexact='available')
    ).select_related('hub')

    if start_dt and end_dt:
        booked_driver_ids = VehicleBooking.objects.filter(
            start_date__lt=end_dt,
            end_date__gt=start_dt,
            driver__isnull=False
        ).values_list('driver_id', flat=True)
        driver_qs = driver_qs.exclude(id__in=booked_driver_ids)

    vehicles_data = VehicleSerializer(vehicle_qs, many=True).data
    drivers_data  = DriverSerializer(driver_qs, many=True).data

    return Response({'vehicles': vehicles_data, 'drivers': drivers_data})
