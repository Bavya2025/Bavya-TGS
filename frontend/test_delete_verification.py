import os
import django
import sys

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'tgs_backend.settings')
django.setup()

from travel.models import TravelModeMaster

def test_soft_delete():
    print("--- Starting Soft Delete Test ---")
    
    # 1. Create a test record
    mode_name = 'TEST_SOFT_DELETE_MODE'
    mode, created = TravelModeMaster.all_objects.get_or_create(mode_name=mode_name)
    print(f"Record created/found: {mode.mode_name} (ID: {mode.id})")
    
    # 2. Perform delete
    print("Performing deletion...")
    mode.delete()
    
    # 3. Check visibility via default manager (objects)
    is_visible = TravelModeMaster.objects.filter(mode_name=mode_name).exists()
    print(f"Visible in UI (objects): {is_visible}")
    
    # 4. Check presence in database via all_objects
    record = TravelModeMaster.all_objects.filter(mode_name=mode_name).first()
    if record:
        print(f"Record still in DB: Yes")
        print(f"Column is_deleted: {record.is_deleted}")
        print(f"Column deleted_at: {record.deleted_at}")
    else:
        print("Record NOT in DB (Hard Deleted)")

    # 5. Cleanup
    # record.delete_permanent() # If you have such a method, otherwise skip
    print("--- Test Complete ---")

if __name__ == "__main__":
    test_soft_delete()
