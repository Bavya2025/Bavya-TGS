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
        fields = [
            'id', 'name', 'address', 'location', 'pincode', 'is_active', 
            'latitude', 'longitude', 'image', 'description', 'created_at',
            'vehicles', 'drivers',
            'continent_id', 'country_id', 'state_id', 'district_id', 
            'mandal_id', 'cluster_id', 'visiting_location_id'
        ]
        read_only_fields = ('created_at',)
