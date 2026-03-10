from rest_framework import serializers
from .models import Location, Route, RoutePath, TollGate, TollRate, RoutePathToll

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
        fields = '__all__'

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
                    "id": loc.id,
                    "name": loc.name,
                    "code": loc.code,
                    "location_type": loc.location_type,
                    "external_id": loc.external_id
                })
            else:
                data.append({"id": vid, "name": str(vid), "code": "???"})
        return data

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

class RouteSerializer(serializers.ModelSerializer):
    paths = RoutePathSerializer(many=True, read_only=True)
    source_name = serializers.ReadOnlyField(source='source.name')
    destination_name = serializers.ReadOnlyField(source='destination.name')
    source_external_id = serializers.ReadOnlyField(source='source.external_id')
    destination_external_id = serializers.ReadOnlyField(source='destination.external_id')
    
    class Meta:
        model = Route
        fields = '__all__'
        extra_kwargs = {'name': {'required': False}}
