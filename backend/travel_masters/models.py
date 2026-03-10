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
    
    # Removed unique_together = [['source', 'destination']] to allow duplicate routes with suffixes

    def save(self, *args, **kwargs):
        # 1. Update Name (Clean Format: SOURCE-DEST)
        source_label = self.source.code or self.source.name
        dest_label = self.destination.code or self.destination.name
        self.name = f"{source_label} TO {dest_label}".upper()

        # 2. Assign Route Code
        if not self.route_code:
            # Check if a route between these same locations already exists
            existing_route = Route.all_objects.filter(
                source=self.source, 
                destination=self.destination
            ).exclude(route_code__isnull=True).exclude(route_code='').order_by('id').first()

            if existing_route:
                # Variant Logic: B, C, D...
                base_code = existing_route.route_code
                if base_code and not base_code[-1].isdigit():
                    # If the existing matches are already variants, we need the numeric base
                    import re
                    match = re.search(r'^(\d+)', base_code)
                    if match:
                        base_code = match.group(1)

                # Count how many routes exist with this base code
                count = Route.all_objects.filter(route_code__startswith=base_code).count()
                
                # A corresponds to 0 (no suffix), B corresponds to 1 (count=1), C to 2 (count=2)...
                # Since we found at least one (existing_route), count will be >= 1
                if count >= 1:
                    suffix = chr(65 + count) # 65 is 'A', 66 is 'B'... so count=1 -> 66 ('B')
                    self.route_code = f"{base_code}{suffix}"
            
            if not self.route_code:
                # Standard Logic: Assign Fresh Numeric Code (Starts from 10001)
                while True:
                    # Find the highest existing route code that is strictly numeric
                    numeric_codes = []
                    for rc in Route.all_objects.exclude(route_code__isnull=True).exclude(route_code='').values_list('route_code', flat=True):
                        if rc.isdigit():
                            numeric_codes.append(int(rc))
                    
                    if numeric_codes:
                        next_code = str(max(numeric_codes) + 1)
                    else:
                        next_code = "10001"
                    
                    if not Route.all_objects.filter(route_code=next_code).exists():
                        self.route_code = next_code
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
    segment_data = models.JSONField(default=dict, blank=True, help_text="Breakdown of distances between points")
    
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
