from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from .models import Room, Kitchen, Cook, LaundryService, Contact
from .serializers import (
    RoomSerializer, KitchenSerializer, CookSerializer, 
    LaundrySerializer, ContactSerializer
)
from core.permissions import IsGuestHouseManager

class BaseItemViewSet(viewsets.ModelViewSet):
    permission_classes = [IsGuestHouseManager]

    def perform_create(self, serializer):
        guesthouse_id = self.request.data.get('guesthouse')
        if not guesthouse_id:
            from rest_framework.exceptions import ValidationError
            raise ValidationError({'guesthouse': 'Guest House ID is required.'})

        model_class = self.get_queryset().model
        duplicate = False
        if model_class.__name__ == 'Room':
            number = serializer.validated_data.get('number')
            if model_class.objects.filter(guesthouse_id=guesthouse_id, number=number).exists():
                duplicate = True
                field = 'number'
        elif model_class.__name__ in ['Kitchen', 'LaundryService', 'Cook']:
             name = serializer.validated_data.get('name')
             if name and model_class.objects.filter(guesthouse_id=guesthouse_id, name__iexact=name).exists():
                 duplicate = True
                 field = 'name'
        elif model_class.__name__ == 'Contact':
             phone = serializer.validated_data.get('phone')
             if model_class.objects.filter(guesthouse_id=guesthouse_id, phone=phone).exists():
                 duplicate = True
                 field = 'phone'

        if duplicate:
             from rest_framework.exceptions import ValidationError
             raise ValidationError({field: f'Item with this {field} already exists in this Guest House.'})

        serializer.save(guesthouse_id=guesthouse_id)

class RoomViewSet(BaseItemViewSet):
    queryset = Room.objects.all()
    serializer_class = RoomSerializer

class KitchenViewSet(BaseItemViewSet):
    queryset = Kitchen.objects.all()
    serializer_class = KitchenSerializer

class CookViewSet(BaseItemViewSet):
    queryset = Cook.objects.all()
    serializer_class = CookSerializer

class LaundryViewSet(BaseItemViewSet):
    queryset = LaundryService.objects.all()
    serializer_class = LaundrySerializer

class ContactViewSet(BaseItemViewSet):
    queryset = Contact.objects.all()
    serializer_class = ContactSerializer
