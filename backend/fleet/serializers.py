from rest_framework import serializers
from .models import FleetHub, Vehicle, Driver, VehicleBooking

class VehicleBookingSerializer(serializers.ModelSerializer):
    class Meta:
        model = VehicleBooking
        fields = '__all__'

class DriverSerializer(serializers.ModelSerializer):
    class Meta:
        model = Driver
        fields = '__all__'

class VehicleSerializer(serializers.ModelSerializer):
    bookings = VehicleBookingSerializer(many=True, read_only=True)
    class Meta:
        model = Vehicle
        fields = '__all__'

class FleetHubSerializer(serializers.ModelSerializer):
    vehicles = VehicleSerializer(many=True, read_only=True)
    drivers = DriverSerializer(many=True, read_only=True)
    
    class Meta:
        model = FleetHub
        fields = '__all__'
