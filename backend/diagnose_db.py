import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'tgs_backend.settings')
django.setup()
from travel_masters.models import Location
from django.db.models import Count
results = Location.objects.values('location_type').annotate(c=Count('id'))
print("-" * 20)
print(f"Total Locations: {Location.objects.count()}")
for r in results:
    print(f"{r['location_type']}: {r['c']}")
print("-" * 20)
# Sample cluster
cluster = Location.objects.filter(location_type='Cluster').first()
if cluster:
    print(f"Sample Cluster: {cluster.name} (ID: {cluster.id}, Ext: {cluster.external_id})")
else:
    print("No Clusters found!")
