from rest_framework import serializers
from .models import (
    Location, Route, RoutePath, TollGate, TollRate, RoutePathToll, 
    FuelRateMaster, Cadre, EligibilityRule, Circle, Jurisdiction
)

class FuelRateMasterSerializer(serializers.ModelSerializer):
    class Meta:
        model = FuelRateMaster
        fields = '__all__'
        # Disable auto-generated unique_together validator because it doesn't
        # account for soft-deleted rows (is_deleted=True). We handle it manually below.
        validators = []

    def validate(self, attrs):
        state = attrs.get('state')
        vehicle_type = attrs.get('vehicle_type')
        instance = self.instance  # None on create, existing object on update

        if state and vehicle_type:
            qs = FuelRateMaster.objects.filter(
                state__iexact=state,
                vehicle_type__iexact=vehicle_type,
                is_deleted=False
            )
            if instance:
                qs = qs.exclude(pk=instance.pk)
            if qs.exists():
                raise serializers.ValidationError({
                    'non_field_errors': [
                        f"A fuel rate for '{state}' ({vehicle_type}) already exists. Please edit the existing entry instead."
                    ]
                })
        return attrs

class LocationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Location
        fields = '__all__'

class TollRateSerializer(serializers.ModelSerializer):
    class Meta:
        model = TollRate
        fields = ['id', 'toll_gate', 'travel_mode', 'journey_type', 'rate']

class TollGateSerializer(serializers.ModelSerializer):
    rates = TollRateSerializer(many=True, read_only=True)
    location_name = serializers.ReadOnlyField(source='location.name')
    location_external_id = serializers.ReadOnlyField(source='location.external_id')
    gate_code = serializers.SerializerMethodField()

    def get_gate_code(self, obj):
        return obj.gate_code

    class Meta:
        model = TollGate
        fields = ['id', 'gate_code', 'registered_id', 'name', 'location', 'gps_coordinates', 'rates', 'location_name', 'location_external_id']

    def validate(self, attrs):
        instance = self.instance
        name = attrs.get('name')
        location = attrs.get('location')

        if name:
            qs = TollGate.objects.filter(name__iexact=name)
            if instance:
                qs = qs.exclude(pk=instance.pk)
            if qs.exists():
                raise serializers.ValidationError({'name': 'A toll gate with this name already exists.'})

        if location:
            qs = TollGate.objects.filter(location=location)
            if instance:
                qs = qs.exclude(pk=instance.pk)
            if qs.exists():
                raise serializers.ValidationError({'location': 'A toll gate already exists at this location.'})

        return attrs

class RoutePathTollSerializer(serializers.ModelSerializer):
    toll_gate_name = serializers.ReadOnlyField(source='toll_gate.name')
    gate_code = serializers.SerializerMethodField()
    location_name = serializers.ReadOnlyField(source='toll_gate.location.name')
    rates = TollRateSerializer(source='toll_gate.rates', many=True, read_only=True)
    
    def get_gate_code(self, obj):
        return obj.toll_gate.gate_code if obj.toll_gate else None
    
    class Meta:
        model = RoutePathToll
        fields = ['id', 'path', 'toll_gate', 'order', 'toll_gate_name', 'gate_code', 'location_name', 'rates']

class RoutePathSerializer(serializers.ModelSerializer):
    toll_assignments = RoutePathTollSerializer(many=True, read_only=True)
    source_name = serializers.ReadOnlyField(source='route.source.name')
    destination_name = serializers.ReadOnlyField(source='route.destination.name')
    via_location_names = serializers.SerializerMethodField()
    via_locations_data = serializers.SerializerMethodField()
    
    class Meta:
        model = RoutePath
        fields = [
            'id', 'route', 'path_name', 'via_locations', 'is_default', 
            'distance_km', 'segment_data', 'latitude', 'longitude', 
            'toll_assignments', 'source_name', 'destination_name', 
            'via_location_names', 'via_locations_data'
        ]

    def get_via_location_names(self, obj):
        if not obj.via_locations or not isinstance(obj.via_locations, list):
            return []
        
        names = []
        for vid in obj.via_locations:
            loc = None
            if str(vid).isdigit():
                loc = Location.objects.filter(pk=vid).first()
            else:
                loc = Location.objects.filter(external_id=vid).first()
            
            if loc:
                names.append(loc.name)
            else:
                names.append(str(vid))
        return names

    def get_via_locations_data(self, obj):
        if not obj.via_locations or not isinstance(obj.via_locations, list):
            return []
        
        data = []
        for vid in obj.via_locations:
            loc = None
            if str(vid).isdigit():
                loc = Location.objects.filter(pk=vid).first()
            else:
                loc = Location.objects.filter(external_id=vid).first()
            
            if loc:
                data.append({
                    'id': loc.id,
                    'name': loc.name,
                    'code': loc.code or 'HUB',
                    'location_type': loc.location_type
                })
        return data

class RouteSerializer(serializers.ModelSerializer):
    paths = RoutePathSerializer(many=True, read_only=True)
    source_name = serializers.ReadOnlyField(source='source.name')
    destination_name = serializers.ReadOnlyField(source='destination.name')
    source_external_id = serializers.ReadOnlyField(source='source.external_id')
    destination_external_id = serializers.ReadOnlyField(source='destination.external_id')
    variant_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Route
        fields = '__all__'
        extra_kwargs = {'name': {'required': False}}

    def get_variant_count(self, obj):
        return obj.paths.count()

class CadreSerializer(serializers.ModelSerializer):
    class Meta:
        model = Cadre
        fields = '__all__'

class EligibilityRuleSerializer(serializers.ModelSerializer):
    cadre_name = serializers.CharField(source='cadre.name', read_only=True)
    
    class Meta:
        model = EligibilityRule
        fields = '__all__'

class CircleSerializer(serializers.ModelSerializer):
    state_name = serializers.ReadOnlyField(source='state.name')
    
    class Meta:
        model = Circle
        fields = '__all__'

class JurisdictionSerializer(serializers.ModelSerializer):
    circle_name = serializers.ReadOnlyField(source='circle.name')
    state_name = serializers.ReadOnlyField(source='circle.state.name')
    state_id = serializers.ReadOnlyField(source='circle.state.id')
    state_external_id = serializers.ReadOnlyField(source='circle.state.external_id')
    district_names = serializers.SerializerMethodField()
    
    class Meta:
        model = Jurisdiction
        fields = '__all__'

    def get_district_names(self, obj):
        return [d.name for d in obj.districts.all()]

