from rest_framework import serializers
from .models import (
    GuestHouse, Room, Kitchen, Cook, LaundryService, Contact, RoomBooking
)

class RoomBookingSerializer(serializers.ModelSerializer):
    class Meta:
        model = RoomBooking
        fields = ['id', 'start_date', 'end_date', 'guest_name', 'trip', 'booking_type', 'remarks', 'created_at']


class RoomSerializer(serializers.ModelSerializer):
    bookings = RoomBookingSerializer(many=True, read_only=True)

    class Meta:
        model = Room
        fields = ['id', 'number', 'room_type', 'status', 'notes', 'bookings']


class KitchenSerializer(serializers.ModelSerializer):
    class Meta:
        model = Kitchen
        fields = ['id', 'name', 'status', 'notes']


class CookSerializer(serializers.ModelSerializer):
    class Meta:
        model = Cook
        fields = ['id', 'name', 'phone', 'specialty', 'status', 'availability', 'source']


class LaundrySerializer(serializers.ModelSerializer):
    class Meta:
        model = LaundryService
        fields = ['id', 'name', 'phone', 'status', 'notes']


class ContactSerializer(serializers.ModelSerializer):
    class Meta:
        model = Contact
        fields = ['id', 'label', 'phone', 'email', 'is_active']


class GuestHouseSerializer(serializers.ModelSerializer):
    rooms = RoomSerializer(many=True, required=False)
    kitchens = KitchenSerializer(many=True, required=False)
    cooks = CookSerializer(many=True, required=False)
    laundries = LaundrySerializer(many=True, required=False)
    contacts = ContactSerializer(many=True, required=False)

    class Meta:
        model = GuestHouse
        fields = [
            'id', 'name', 'address', 'location', 'pincode', 'is_active', 
            'latitude', 'longitude', 'image', 'description', 'created_at', 
            'rooms', 'kitchens', 'cooks', 'laundries', 'contacts',
            'continent_id', 'country_id', 'state_id', 'district_id', 
            'mandal_id', 'cluster_id', 'visiting_location_id'
        ]
        read_only_fields = ('created_at',)

    def validate(self, data):
        if 'rooms' in data:
            room_identifiers = [r.get('number').lower() for r in data['rooms'] if r.get('number')]
            if len(room_identifiers) != len(set(room_identifiers)):
                raise serializers.ValidationError({"rooms": "Duplicate room numbers are not allowed."})

        if 'kitchens' in data:
            kitchen_names = [k.get('name').lower() for k in data['kitchens'] if k.get('name')]
            if len(kitchen_names) != len(set(kitchen_names)):
                raise serializers.ValidationError({"kitchens": "Duplicate kitchen names are not allowed."})
        if 'cooks' in data:
            cook_names = [c.get('name').lower() for c in data['cooks'] if c.get('name')]
            if len(cook_names) != len(set(cook_names)):
                 raise serializers.ValidationError({"cooks": "Duplicate cook names are not allowed."})
        if 'laundries' in data:
            laundry_names = [l.get('name').lower() for l in data['laundries'] if l.get('name')]
            if len(laundry_names) != len(set(laundry_names)):
                raise serializers.ValidationError({"laundries": "Duplicate laundry names are not allowed."})

        if 'contacts' in data:
            contact_phones = [c.get('phone') for c in data['contacts'] if c.get('phone')]
            if len(contact_phones) != len(set(contact_phones)):
                raise serializers.ValidationError({"contacts": "Duplicate contact phone numbers are not allowed."})

        return data

    def validate_location(self, value):
        normalized_location = value.strip()
        if not normalized_location:
            return normalized_location

        duplicates = GuestHouse.objects.filter(location__iexact=normalized_location)
        if self.instance:
            duplicates = duplicates.exclude(pk=self.instance.pk)

        if duplicates.exists():
            raise serializers.ValidationError(
                "A guest house is already registered for this location."
            )

        return normalized_location

    def create(self, validated_data):
        rooms_data = validated_data.pop('rooms', [])
        kitchens_data = validated_data.pop('kitchens', [])
        cooks_data = validated_data.pop('cooks', [])
        laundries_data = validated_data.pop('laundries', [])
        contacts_data = validated_data.pop('contacts', [])

        gh = GuestHouse.objects.create(**validated_data)

        for r in rooms_data:
            Room.objects.create(guesthouse=gh, **r)

        for k in kitchens_data:
            Kitchen.objects.create(guesthouse=gh, **k)

        for c in cooks_data:
            Cook.objects.create(guesthouse=gh, **c)

        for l in laundries_data:
            LaundryService.objects.create(guesthouse=gh, **l)

        for ct in contacts_data:
            Contact.objects.create(guesthouse=gh, **ct)

        return gh

    def update(self, instance, validated_data):
        rooms_data = validated_data.pop('rooms', None)
        kitchens_data = validated_data.pop('kitchens', None)
        cooks_data = validated_data.pop('cooks', None)
        laundries_data = validated_data.pop('laundries', None)
        contacts_data = validated_data.pop('contacts', None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if rooms_data is not None:
            instance.rooms.all().delete()
            for r in rooms_data:
                Room.objects.create(guesthouse=instance, **r)
        
        if kitchens_data is not None:
            instance.kitchens.all().delete()
            for k in kitchens_data:
                Kitchen.objects.create(guesthouse=instance, **k)

        if cooks_data is not None:
            instance.cooks.all().delete()
            for c in cooks_data:
                Cook.objects.create(guesthouse=instance, **c)

        if laundries_data is not None:
            instance.laundries.all().delete()
            for l in laundries_data:
                LaundryService.objects.create(guesthouse=instance, **l)

        if contacts_data is not None:
            instance.contacts.all().delete()
            for ct in contacts_data:
                Contact.objects.create(guesthouse=instance, **ct)

        return instance
