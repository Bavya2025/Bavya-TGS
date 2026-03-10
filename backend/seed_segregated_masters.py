import os
import django

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'tgs_backend.settings')
django.setup()

from travel.models import (
    TravelModeMaster, BookingTypeMaster, AirlineMaster, FlightClassMaster,
    TrainClassMaster, TravelProviderMaster, BusOperatorMaster, BusTypeMaster,
    IntercityCabVehicleMaster, LocalTravelModeMaster, LocalCarSubTypeMaster,
    LocalBikeSubTypeMaster, LocalProviderMaster, StayTypeMaster, RoomTypeMaster,
    MealCategoryMaster, MealTypeMaster, IncidentalTypeMaster
)

def seed_data():
    # Travel Module
    print("Seeding Travel Masters...")
    for item in ['Flight', 'Train', 'Intercity Bus', 'Intercity Cab']:
        TravelModeMaster.objects.get_or_create(mode_name=item, defaults={'status': True})
    
    for item in ['Self Booked', 'Company Booked']:
        BookingTypeMaster.objects.get_or_create(booking_type=item, defaults={'status': True})
        
    for item in ['Indigo', 'Air India', 'Vistara', 'SpiceJet', 'Akasa Air']:
        AirlineMaster.objects.get_or_create(airline_name=item, defaults={'status': True})
        
    for item in ['Economy', 'Premium Economy', 'Business', 'First Class']:
        FlightClassMaster.objects.get_or_create(class_name=item, defaults={'status': True})
        
    for item in ['Sleeper', '3AC', '2AC', '1AC', 'Chair Car']:
        TrainClassMaster.objects.get_or_create(class_name=item, defaults={'status': True})
        
    for item in ['IRCTC', 'MakeMyTrip', 'RedBus', 'Ola', 'Uber', 'Local Vendor']:
        TravelProviderMaster.objects.get_or_create(provider_name=item, defaults={'status': True})
        
    for item in ['RedBus', 'SRS', 'KSRTC', 'VRL']:
        BusOperatorMaster.objects.get_or_create(operator_name=item, defaults={'status': True})
        
    for item in ['Sleeper', 'Seater', 'AC', 'Non-AC']:
        BusTypeMaster.objects.get_or_create(bus_type=item, defaults={'status': True})
        
    for item in ['Sedan', 'SUV', 'MUV', 'Hatchback']:
        IntercityCabVehicleMaster.objects.get_or_create(vehicle_type=item, defaults={'status': True})

    # Local Conveyance
    print("Seeding Local Masters...")
    for item in ['Car / Cab', 'Bike', 'Auto', 'Bus', 'Metro', 'Own Vehicle']:
        LocalTravelModeMaster.objects.get_or_create(mode_name=item, defaults={'status': True})
        
    for item in ['Own Car', 'Company Car', 'Rented Car (With Driver)', 'Self Drive Rental', 'Ride Hailing', 'Pool Vehicle']:
        LocalCarSubTypeMaster.objects.get_or_create(sub_type=item, defaults={'status': True})
        
    for item in ['Own Bike', 'Rental Bike', 'Ride Bike']:
        LocalBikeSubTypeMaster.objects.get_or_create(sub_type=item, defaults={'status': True})
        
    for item in ['Ola', 'Uber', 'Local Taxi Vendor']:
        LocalProviderMaster.objects.get_or_create(provider_name=item, defaults={'status': True})

    # Stay & Lodging
    print("Seeding Stay Masters...")
    for item in ['Hotel Stay', 'Bavya Guest House', 'Client Provided', 'Self Stay']:
        StayTypeMaster.objects.get_or_create(stay_type=item, defaults={'status': True})
        
    for item in ['Standard', 'Deluxe', 'Executive', 'Suite', 'Guest House']:
        RoomTypeMaster.objects.get_or_create(room_type=item, defaults={'status': True})

    # Food & Refreshments
    print("Seeding Food Masters...")
    for item in ['Self Meal', 'Working Meal', 'Client Hosted']:
        MealCategoryMaster.objects.get_or_create(category_name=item, defaults={'status': True})
        
    for item in ['Breakfast', 'Lunch', 'Dinner', 'Snacks', 'Coffee', 'Tea']:
        MealTypeMaster.objects.get_or_create(meal_type=item, defaults={'status': True})

    # Incidental
    print("Seeding Incidental Masters...")
    for item in ['Parking Charges', 'Toll Charges', 'Fuel (Own Vehicle)', 'Luggage Charges', 'Porter Charges', 'Internet / WiFi']:
        IncidentalTypeMaster.objects.get_or_create(expense_type=item, defaults={'status': True})

    print("Seeding completed successfully!")

if __name__ == '__main__':
    seed_data()
