from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import FleetHub, Vehicle, Driver, VehicleBooking
from .serializers import FleetHubSerializer, VehicleSerializer, DriverSerializer, VehicleBookingSerializer

class FleetHubViewSet(viewsets.ModelViewSet):
    queryset = FleetHub.objects.prefetch_related('vehicles__bookings', 'drivers').all()
    serializer_class = FleetHubSerializer

class VehicleViewSet(viewsets.ModelViewSet):
    queryset = Vehicle.objects.all()
    serializer_class = VehicleSerializer

    @action(detail=True, methods=['post'])
    def bookings(self, request, pk=None):
        from core.models import Notification
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
