from django.db import models
from travel.models import Trip

class FleetHub(models.Model):
    name = models.CharField(max_length=200)
    address = models.TextField(blank=True)
    location = models.CharField(max_length=200, blank=True)
    pincode = models.CharField(max_length=20, blank=True)
    is_active = models.BooleanField(default=True)
    latitude = models.DecimalField(max_digits=12, decimal_places=9, null=True, blank=True)
    longitude = models.DecimalField(max_digits=12, decimal_places=9, null=True, blank=True)
    image = models.TextField(blank=True, null=True)
    description = models.TextField(blank=True)

    # Hierarchical Location Fields
    continent_id = models.CharField(max_length=100, null=True, blank=True)
    country_id = models.CharField(max_length=100, null=True, blank=True)
    state_id = models.CharField(max_length=100, null=True, blank=True)
    district_id = models.CharField(max_length=100, null=True, blank=True)
    mandal_id = models.CharField(max_length=100, null=True, blank=True)
    cluster_id = models.CharField(max_length=100, null=True, blank=True)
    visiting_location_id = models.CharField(max_length=100, null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} ({self.location})"


class Vehicle(models.Model):
    VEHICLE_TYPE_CHOICES = [
        ('sedan', 'Sedan'),
        ('suv', 'SUV'),
        ('mmu', 'MMU'),
        ('ambulance', 'Ambulance'),
        ('pickup', 'Pickup Truck'),
    ]
    STATUS_CHOICES = [
        ('available', 'Available'),
        ('in_trip', 'In Trip'),
        ('maintenance', 'Maintenance'),
    ]
    FUEL_TYPE_CHOICES = [
        ('diesel', 'Diesel'),
        ('petrol', 'Petrol'),
        ('ev', 'Electric'),
        ('cng', 'CNG'),
    ]

    hub = models.ForeignKey(FleetHub, on_delete=models.CASCADE, related_name='vehicles')
    plate_number = models.CharField(max_length=50, unique=True)
    model_name = models.CharField(max_length=100)
    vehicle_type = models.CharField(max_length=20, choices=VEHICLE_TYPE_CHOICES, default='sedan')
    fuel_type = models.CharField(max_length=20, choices=FUEL_TYPE_CHOICES, default='diesel')
    capacity = models.IntegerField(default=4)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='available')
    notes = models.TextField(blank=True)

    def __str__(self):
        return f"{self.plate_number} - {self.model_name}"


class Driver(models.Model):
    hub = models.ForeignKey(FleetHub, on_delete=models.CASCADE, related_name='drivers')
    name = models.CharField(max_length=150)
    phone = models.CharField(max_length=50)
    license_number = models.CharField(max_length=100, blank=True)
    status = models.CharField(max_length=50, default='Available')
    availability = models.CharField(max_length=50, default='Available')
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.name} ({self.hub.name})"


class VehicleBooking(models.Model):
    vehicle = models.ForeignKey(Vehicle, on_delete=models.CASCADE, related_name='bookings')
    driver = models.ForeignKey(Driver, on_delete=models.SET_NULL, null=True, blank=True, related_name='bookings')
    trip = models.ForeignKey(Trip, on_delete=models.SET_NULL, null=True, blank=True, related_name='vehicle_bookings', db_constraint=False)
    booking_type = models.CharField(max_length=50, default='Official') # Official, Personal, Maintenance
    start_date = models.DateTimeField()
    end_date = models.DateTimeField()
    requester_name = models.CharField(max_length=200, blank=True)
    requester_phone = models.CharField(max_length=20, blank=True)
    remarks = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Booking {self.vehicle.plate_number} {self.start_date}..{self.end_date}"
