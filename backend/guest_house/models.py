from django.db import models

class GuestHouse(models.Model):
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


class Room(models.Model):
    ROOM_TYPE_CHOICES = [
        ('single', 'Single'),
        ('double', 'Double'),
        ('suite', 'Suite'),
    ]
    STATUS_CHOICES = [
        ('available', 'Available'),
        ('occupied', 'Occupied'),
        ('maintenance', 'Maintenance'),
    ]

    guesthouse = models.ForeignKey(GuestHouse, on_delete=models.CASCADE, related_name='rooms')
    number = models.CharField(max_length=50)
    room_type = models.CharField(max_length=20, choices=ROOM_TYPE_CHOICES, default='single')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='available')
    notes = models.TextField(blank=True)

    def __str__(self):
        return f"{self.guesthouse.name} - {self.number} ({self.status})"

    class Meta:
        unique_together = ('guesthouse', 'number')


class Kitchen(models.Model):
    guesthouse = models.ForeignKey(GuestHouse, on_delete=models.CASCADE, related_name='kitchens')
    name = models.CharField(max_length=150, blank=True)
    status = models.CharField(max_length=50, default='Available')
    notes = models.TextField(blank=True)

    def __str__(self):
        return f"Kitchen {self.name} @ {self.guesthouse.name}"

    class Meta:
        unique_together = ('guesthouse', 'name')


class Cook(models.Model):
    guesthouse = models.ForeignKey(GuestHouse, on_delete=models.CASCADE, related_name='cooks')
    name = models.CharField(max_length=150)
    phone = models.CharField(max_length=50, blank=True)
    specialty = models.CharField(max_length=200, blank=True)
    status = models.CharField(max_length=50, default='Available')
    availability = models.CharField(max_length=50, default='Available')
    source = models.CharField(max_length=100, default='In House')

    def __str__(self):
        return f"{self.name} ({self.guesthouse.name})"

    class Meta:
        unique_together = ('guesthouse', 'name')


class LaundryService(models.Model):
    guesthouse = models.ForeignKey(GuestHouse, on_delete=models.CASCADE, related_name='laundries')
    name = models.CharField(max_length=150, blank=True)
    phone = models.CharField(max_length=50, blank=True)
    status = models.CharField(max_length=50, default='Available')
    notes = models.TextField(blank=True)

    def __str__(self):
        return f"Laundry {self.name} @ {self.guesthouse.name}"

    class Meta:
        unique_together = ('guesthouse', 'name')


class Contact(models.Model):
    guesthouse = models.ForeignKey(GuestHouse, on_delete=models.CASCADE, related_name='contacts')
    label = models.CharField(max_length=100, blank=True)
    phone = models.CharField(max_length=50)
    email = models.EmailField(blank=True, null=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.label or 'Contact'} {self.phone} @ {self.guesthouse.name}"

    class Meta:
        unique_together = ('guesthouse', 'phone')


class RoomBooking(models.Model):
    room = models.ForeignKey(Room, on_delete=models.CASCADE, related_name='bookings')
    trip = models.ForeignKey('travel.Trip', on_delete=models.SET_NULL, null=True, blank=True, related_name='room_bookings')
    booking_type = models.CharField(max_length=50, default='Official')
    start_date = models.DateTimeField()
    end_date = models.DateTimeField()
    guest_name = models.CharField(max_length=200, blank=True)
    guest_phone = models.CharField(max_length=20, blank=True)
    guest_count = models.IntegerField(default=1)
    remarks = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def status_on_date(self, date):
        return self.start_date <= date <= self.end_date

    def __str__(self):
        return f"Booking {self.room.number} {self.start_date}..{self.end_date}"
