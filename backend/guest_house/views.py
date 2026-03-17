from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .models import GuestHouse, Room, RoomBooking
from .serializers import (
    GuestHouseSerializer, RoomBookingSerializer
)
from rest_framework.permissions import IsAuthenticated
from core.permissions import IsAdmin, IsCustomAuthenticated, IsGuestHouseManager
from notifications.models import Notification

class GuestHouseView(APIView):
    def get_permissions(self):
        if self.request.method == 'GET':
            return [IsCustomAuthenticated()]
        return [IsGuestHouseManager()]

    def get(self, request):
        gh_qs = GuestHouse.objects.all()
        serializer = GuestHouseSerializer(gh_qs, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = GuestHouseSerializer(data=request.data)
        if serializer.is_valid():
            gh = serializer.save()
            return Response(GuestHouseSerializer(gh).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class GuestHouseDetailView(APIView):
    def get_permissions(self):
        if self.request.method == 'GET':
            return [IsCustomAuthenticated()]
        return [IsGuestHouseManager()]

    def decode_id(self, encoded_id):
        import base64
        import binascii
        
        if not encoded_id:
            return None
            
        try:
            padding = 4 - (len(encoded_id) % 4)
            if padding != 4:
                encoded_id += '=' * padding
            
            encoded_id = encoded_id.replace('-', '+').replace('_', '/')
            
            decoded_bytes = base64.b64decode(encoded_id)
            return decoded_bytes.decode('utf-8')
        except (binascii.Error, UnicodeDecodeError, ValueError):
            return encoded_id

    def get_object(self, pk):
        decoded_pk = self.decode_id(pk)
        try:
            return GuestHouse.objects.get(pk=decoded_pk)
        except (GuestHouse.DoesNotExist, ValueError):
            return None

    def get(self, request, pk):
        gh = self.get_object(pk)
        if not gh:
            return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
        serializer = GuestHouseSerializer(gh)
        return Response(serializer.data)

    def put(self, request, pk):
        gh = self.get_object(pk)
        if not gh:
            return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
        serializer = GuestHouseSerializer(gh, data=request.data)
        if serializer.is_valid():
            gh = serializer.save()
            return Response(GuestHouseSerializer(gh).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        gh = self.get_object(pk)
        if not gh:
            return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
        gh.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class RoomBookingView(APIView):
    def get_permissions(self):
        # Allow both GET and POST for authenticated users 
        # (POST will be validated against trip ownership in the method)
        return [IsCustomAuthenticated()]

    def get(self, request, room_id):
        bookings = RoomBooking.objects.filter(room_id=room_id).order_by('-created_at')
        serializer = RoomBookingSerializer(bookings, many=True)
        return Response(serializer.data)

    def post(self, request, room_id):
        user = getattr(request, 'custom_user', None)
        is_manager = any(kw in (user.role.name.lower() if user and user.role else '') 
                         for kw in ['admin', 'superuser', 'guesthousemanager'])
        
        data = request.data.copy()
        serializer = RoomBookingSerializer(data=data)
        if serializer.is_valid():
            trip = serializer.validated_data.get('trip')
            
            # Security: If not a manager, ensure the trip belongs to the logged-in user
            if not is_manager:
                if not trip or trip.user != user:
                    return Response({'error': 'You can only book rooms for your own trips.'}, 
                                    status=status.HTTP_403_FORBIDDEN)

            start = serializer.validated_data['start_date']
            end = serializer.validated_data['end_date']
            
            overlap = RoomBooking.objects.filter(room_id=room_id).filter(
                start_date__lte=end,
                end_date__gte=start
            ).exists()
            if overlap:
                return Response({'error': 'Room already booked during this period'}, status=status.HTTP_400_BAD_REQUEST)

            try:
                room = Room.objects.get(pk=room_id)
            except Room.DoesNotExist:
                return Response({'error': 'Room not found'}, status=status.HTTP_404_NOT_FOUND)

            booking = RoomBooking.objects.create(room=room, **serializer.validated_data)

            # Notify user about room booking
            if booking.trip and booking.trip.user:
                Notification.objects.create(
                    user=booking.trip.user,
                    title="Room Booked",
                    message=f"A room ({room.number}) has been booked for your trip {booking.trip.trip_id} at {room.guesthouse.name}.",
                    type='success'
                )

            from django.utils import timezone
            today = timezone.now().date()
            if booking.start_date.date() <= today <= booking.end_date.date():
                room.status = 'occupied'
                room.save()

            return Response(RoomBookingSerializer(booking).data, status=status.HTTP_201_CREATED)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
