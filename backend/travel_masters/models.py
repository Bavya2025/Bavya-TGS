from django.db import models
from travel.models import SoftDeleteModel

class Location(SoftDeleteModel):
    external_id = models.CharField(max_length=50, unique=True)
    name = models.CharField(max_length=200)
    location_type = models.CharField(max_length=50) # Continent, Country, Region, State, City, Site
    code = models.CharField(max_length=50, null=True, blank=True)
    parent_id = models.CharField(max_length=50, null=True, blank=True)
    
    def __str__(self):
        return f"{self.name} ({self.location_type})"

class Route(SoftDeleteModel):
    route_code = models.CharField(max_length=20, unique=True, null=True, blank=True)
    name = models.CharField(max_length=255, blank=True)
    source = models.ForeignKey(Location, on_delete=models.CASCADE, related_name='routes_starting_here')
    destination = models.ForeignKey(Location, on_delete=models.CASCADE, related_name='routes_ending_here')
    
    def save(self, *args, **kwargs):
        # 1. Update Name (Clean Format: SOURCE-DEST)
        source_label = self.source.code or self.source.name
        dest_label = self.destination.code or self.destination.name
        self.name = f"{source_label} TO {dest_label}".upper()

        # 2. Assign Route Code (Starts from 10001)
        if not self.route_code:
            while True:
                # Find the highest existing route code that is actually a number
                last_route = Route.all_objects.exclude(route_code__isnull=True).exclude(route_code='').order_by('-route_code').first()
                if last_route and last_route.route_code and last_route.route_code.isdigit():
                    next_code = str(int(last_route.route_code) + 1)
                else:
                    next_code = "10001"
                
                # Double check to prevent IntegrityError specifically if ordering by string was weird
                if not Route.all_objects.filter(route_code=next_code).exists():
                    self.route_code = next_code
                    break
                else:
                    # In case of string order collision (e.g. '9999' > '10000'), increment until free
                    # We just need to find the max by casting to integer if possible, but an iterative check is safer
                    max_code = 10000
                    for r in Route.all_objects.exclude(route_code__isnull=True).exclude(route_code='').values_list('route_code', flat=True):
                        if r.isdigit() and int(r) > max_code:
                            max_code = int(r)
                    self.route_code = str(max_code + 1)
                    break
                
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name

class RoutePath(SoftDeleteModel):
    route = models.ForeignKey(Route, on_delete=models.CASCADE, related_name='paths')
    path_name = models.CharField(max_length=255, help_text="e.g., Via NH-44")
    via_locations = models.JSONField(default=list, help_text="Ordered list of location IDs")
    is_default = models.BooleanField(default=False)
    distance_km = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    latitude = models.DecimalField(max_digits=12, decimal_places=9, null=True, blank=True)
    longitude = models.DecimalField(max_digits=12, decimal_places=9, null=True, blank=True)
    
    def __str__(self):
        return f"{self.route.name} - {self.path_name}"

class TollGate(SoftDeleteModel):
    gate_code = models.CharField(max_length=4, unique=True, null=True, blank=True, help_text="Auto-generated 4-digit gate code")
    registered_id = models.CharField(max_length=50, null=True, blank=True, help_text="Manual Registered ID")
    name = models.CharField(max_length=200, unique=True)
    location = models.OneToOneField(Location, on_delete=models.SET_NULL, null=True, blank=True)
    gps_coordinates = models.CharField(max_length=100, blank=True)

    def save(self, *args, **kwargs):
        if not self.gate_code:
            while True:
                last = TollGate.all_objects.exclude(gate_code__isnull=True).exclude(gate_code='').order_by('-gate_code').first()
                if last and last.gate_code and last.gate_code.isdigit():
                    next_code = str(int(last.gate_code) + 1).zfill(4)
                else:
                    next_code = "1001"
                
                if not TollGate.all_objects.filter(gate_code=next_code).exists():
                    self.gate_code = next_code
                    break
                else:
                    max_code = 1000
                    for g in TollGate.all_objects.exclude(gate_code__isnull=True).exclude(gate_code='').values_list('gate_code', flat=True):
                        if g.isdigit() and int(g) > max_code:
                            max_code = int(g)
                    self.gate_code = str(max_code + 1).zfill(4)
                    break
        super().save(*args, **kwargs)

    def __str__(self):
        return f"[{self.gate_code}] {self.name}"

class TollRate(SoftDeleteModel):
    toll_gate = models.ForeignKey(TollGate, on_delete=models.CASCADE, related_name='rates')
    travel_mode = models.CharField(max_length=50) # e.g. 2 Wheeler, 4 Wheeler, etc.
    journey_type = models.CharField(max_length=20, default='UP', help_text="UP, DOWN, or TO_AND_FRO")
    rate = models.DecimalField(max_digits=10, decimal_places=2)
    
    def __str__(self):
        return f"{self.toll_gate.name} - {self.travel_mode}: {self.rate}"

class RoutePathToll(SoftDeleteModel):
    path = models.ForeignKey(RoutePath, on_delete=models.CASCADE, related_name='toll_assignments')
    toll_gate = models.ForeignKey(TollGate, on_delete=models.CASCADE)
    order = models.IntegerField(default=0)

    class Meta:
        ordering = ['order']
