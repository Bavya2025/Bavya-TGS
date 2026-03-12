from django.db import models
from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from .models import Location, Route, RoutePath, TollGate, TollRate, RoutePathToll, FuelRateMaster, Cadre, EligibilityRule
from .serializers import (
    LocationSerializer, RouteSerializer, RoutePathSerializer, 
    TollGateSerializer, TollRateSerializer, RoutePathTollSerializer, FuelRateMasterSerializer,
    EligibilityRuleSerializer, CadreSerializer
)
from .services import sync_geo_locations, sync_cadres
from core.permissions import IsAdmin, IsCustomAuthenticated

class LocationViewSet(viewsets.ModelViewSet):
    serializer_class = LocationSerializer

    def list(self, request, *args, **kwargs):
        # Force sync from API to ensure "API only" data freshness
        # Use a simple class-level cache to avoid hitting the API multiple times per minute
        import time
        last_sync = getattr(self.__class__, '_last_sync_time', 0)
        if time.time() - last_sync > 60: # 1 minute cooldown
            try:
                print(f"DEBUG AUTH: Starting Geo Sync triggered by {request.path}...")
                sync_geo_locations()
                print("DEBUG AUTH: Geo Sync completed.")
                self.__class__._last_sync_time = time.time()
            except Exception as e:
                print(f"Auto-sync failed: {e}")
            
        return super().list(request, *args, **kwargs)

    def get_queryset(self):
        queryset = Location.objects.all()
        loc_type = self.request.query_params.get('type')
        parent_id = self.request.query_params.get('parent')
        search = self.request.query_params.get('search', '')
        
        if loc_type:
            queryset = queryset.filter(location_type__iexact=loc_type)
        if parent_id:
            queryset = queryset.filter(parent_id=parent_id)
        
        if search:
            queryset = queryset.filter(
                models.Q(name__istartswith=search) | 
                models.Q(external_id__istartswith=search) |
                models.Q(code__istartswith=search)
            )
        
        return queryset.order_by('name')

    @action(detail=False, methods=['get'])
    def live_hierarchy(self, request):
        from api_management.services import fetch_geo_data
        data = fetch_geo_data()
        if not data or "error" in data:
             status_code = status.HTTP_503_SERVICE_UNAVAILABLE if "Timeout" in str(data.get("error", "")) else status.HTTP_502_BAD_GATEWAY
             return Response({"error": data.get("error", "Failed to fetch geo data")}, status=status_code)
        return Response(data)

    @action(detail=False, methods=['get'])
    def live_query(self, request):
        from api_management.services import fetch_geo_data
        from .services import TYPE_MAPPING
        
        full_data = fetch_geo_data()
        if not full_data or "error" in full_data:
             status_code = status.HTTP_503_SERVICE_UNAVAILABLE if "Timeout" in str(full_data.get("error", "")) else status.HTTP_502_BAD_GATEWAY
             return Response({"error": full_data.get("error", "Failed to fetch geo data")}, status=status_code)
            
        target_type = request.query_params.get('type')
        parent_id = request.query_params.get('parent')
        search_query = request.query_params.get('search', '')
        
        results = []
        
        # Mapping reverse for easier lookup
        REV_MAPPING = {}
        for k, v in TYPE_MAPPING.items():
            if v not in REV_MAPPING: REV_MAPPING[v] = []
            REV_MAPPING[v].append(k)

        def traverse(items, current_parent_id=None, level_name="Continent", parent_already_matched=False):
            if not items or not isinstance(items, list): return
            
            for item in items:
                api_id = item.get("id")
                name = str(item.get("name", ""))
                code = str(item.get("code", ""))
                ext_id = f"{level_name}-{api_id}"
                
                # Logic for parent matching
                is_this_item_the_parent = (parent_id and ext_id == parent_id)
                current_item_matches_parent = parent_already_matched or is_this_item_the_parent
                
                show_item = False
                
                # Assign a more descriptive level name if it's a generic site
                display_level = level_name
                if level_name in ['Site', 'Visiting Place', 'Landmark']:
                    if 'ERC' in name.upper(): display_level = 'ERC Center'
                    elif 'SANCTUARY' in name.upper(): display_level = 'Sanctuary'
                    elif 'POINT' in name.upper(): display_level = 'Visiting Point'
                
                    sq = search_query.lower()
                    if (name.lower().startswith(sq) or code.lower().startswith(sq) or ext_id.lower().startswith(sq)):
                        show_item = True
                elif parent_id:
                    if parent_already_matched:
                        if target_type:
                            if level_name.lower() == target_type.lower(): show_item = True
                        else:
                            # Default deep view: Show anything that looks like a final destination
                            important_levels = [
                                'Mandal', 'Village', 'Metro City', 'City', 'Town', 
                                'Site', 'Landmark', 'Visiting Place', 'Visiting Point', 
                                'ERC Center', 'Sanctuary'
                            ]
                            if level_name in important_levels or display_level in important_levels:
                                show_item = True
                elif target_type:
                    # If only type is provided (e.g. for initial Continents)
                    if level_name.lower() == target_type.lower():
                        show_item = True
                
                if show_item:
                    results.append({
                        "id": api_id,
                        "external_id": ext_id,
                        "name": name,
                        "location_type": display_level,
                        "code": item.get("code"),
                        "parent_id": current_parent_id
                    })
                
                # Recursive search in sub-lists
                for api_key, next_mapped_type in TYPE_MAPPING.items():
                    sub_items = item.get(api_key)
                    if isinstance(sub_items, list):
                        # Fix mapped type for better UI
                        if next_mapped_type == 'Site': next_mapped_type = 'Visiting Place'
                        traverse(sub_items, ext_id, next_mapped_type, current_item_matches_parent)

        traverse(full_data)
        results.sort(key=lambda x: x.get('name', '').lower())
        return Response(results[:500]) # Increased cap for deep hierarchies

    @action(detail=False, methods=['post'])
    def sync(self, request):
        stats = sync_geo_locations()
        return Response(stats)

class RouteViewSet(viewsets.ModelViewSet):
    queryset = Route.objects.all()
    def get_queryset(self):
        queryset = Route.objects.all()
        search = self.request.query_params.get('search', '')
        if search:
            queryset = queryset.filter(
                models.Q(name__icontains=search) |
                models.Q(route_code__icontains=search) |
                models.Q(source__name__icontains=search) |
                models.Q(destination__name__icontains=search)
            )
        return queryset.order_by('-id')

    serializer_class = RouteSerializer

    def create(self, request, *args, **kwargs):
        data = request.data.copy()
        
        # Helper to resolve location from ID (PK or External ID)
        def resolve_location(val):
            if not val: return None
            # If it's a digit, try finding by PK first
            if str(val).isdigit():
                loc = Location.objects.filter(pk=val).first()
                if loc: return loc
            
            # Try finding by exact external_id
            loc = Location.objects.filter(external_id=val).first()
            if loc: return loc

            # Try finding by suffix match
            stripped = str(val).split('-', 1)[-1] if '-' in str(val) else str(val)
            if stripped.isdigit():
                loc = Location.objects.filter(external_id__endswith=f"-{stripped}").first()
                if loc: return loc
            
            # If still not found, try a quick sync from the API
            import time
            last_sync = getattr(self.__class__, '_last_create_sync', 0)
            if time.time() - last_sync > 60: # Cooldown
                from .services import sync_geo_locations
                sync_geo_locations()
                setattr(self.__class__, '_last_create_sync', time.time())
                # Try finding one more time
                return Location.objects.filter(external_id__endswith=f"-{stripped}").first()
            
            return None

        source_loc = resolve_location(data.get('source'))
        dest_loc = resolve_location(data.get('destination'))

        if source_loc: data['source'] = source_loc.pk
        if dest_loc: data['destination'] = dest_loc.pk
        
        # Prevent exact duplicates
        if source_loc and dest_loc:
            existing_route = Route.objects.filter(source=source_loc, destination=dest_loc).first()
            if existing_route:
                return Response(
                    {"detail": "A route already exists between these locations. You can configure multiple paths internally."},
                    status=status.HTTP_400_BAD_REQUEST
                )

        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def perform_create(self, serializer):
        primary_route = serializer.save()
        
        # Auto-create reverse route
        Route.objects.get_or_create(
            source=primary_route.destination,
            destination=primary_route.source
        )

    @action(detail=False, methods=['get'])
    def find_paths(self, request):
        source_name = request.query_params.get('source')
        dest_name = request.query_params.get('destination')
        
        if not source_name or not dest_name:
            return Response({"error": "Source and destination are required"}, status=400)
            
        # Find routes that match source and destination names
        matching_routes = Route.objects.filter(
            source__name__iexact=source_name, 
            destination__name__iexact=dest_name
        )
        
        paths = RoutePath.objects.filter(route__in=matching_routes)
        serializer = RoutePathSerializer(paths, many=True)
        return Response(serializer.data)

class RoutePathViewSet(viewsets.ModelViewSet):
    queryset = RoutePath.objects.all()
    serializer_class = RoutePathSerializer

    def get_queryset(self):
        queryset = RoutePath.objects.all()
        route_id = self.request.query_params.get('route')
        if route_id:
            queryset = queryset.filter(route=route_id)
        return queryset.order_by('id')

    def perform_create(self, serializer):
        instance = serializer.save()
        try:
            route = instance.route
            # Sync to ALL reverse routes if multiple exist
            reverse_routes = Route.objects.filter(source=route.destination, destination=route.source)
            for rev_route in reverse_routes:
                reversed_via = list(reversed(instance.via_locations)) if instance.via_locations else []
                reversed_via_strs = [str(v) for v in reversed_via]
                
                # Check for existing matching path on THIS rev_route
                exists = False
                for rp in RoutePath.objects.filter(route=rev_route):
                    if [str(v) for v in rp.via_locations] == reversed_via_strs:
                        exists = True
                        break
                
                if not exists:
                    RoutePath.objects.create(
                        route=rev_route,
                        path_name=f"Return: {instance.path_name}",
                        via_locations=reversed_via,
                        distance_km=instance.distance_km,
                        is_default=instance.is_default
                    )
        except Exception as e: print(f"Path Create Sync Error: {e}")

    def perform_update(self, serializer):
        instance = serializer.save()
        try:
            route = instance.route
            reverse_routes = Route.objects.filter(source=route.destination, destination=route.source)
            reversed_via = list(reversed(instance.via_locations)) if instance.via_locations else []
            reversed_via_strs = [str(v) for v in reversed_via]
            
            for rev_route in reverse_routes:
                # Update matching paths on reverse routes
                RoutePath.objects.filter(
                    route=rev_route,
                    # We look for paths that match the NEW reversed via pattern
                    # This helps keep existing return paths in sync with distance/default status
                    # Note: We don't filter by name as it might have been changed
                ).filter(
                    # Robust check for via_locations? JSONField filtering is tricky
                    # Let's iterate if needed or keep it simple for now
                ).update(
                    distance_km=instance.distance_km,
                    is_default=instance.is_default
                )
        except Exception as e: print(f"Path Update Sync Error: {e}")

    def perform_destroy(self, instance):
        try:
            route = instance.route
            reverse_route = Route.objects.filter(source=route.destination, destination=route.source).first()
            if reverse_route:
                reversed_via = list(reversed(instance.via_locations)) if instance.via_locations else []
                # Only delete if it's explicitly a "Return:" or matches exactly and we want strict sync
                RoutePath.objects.filter(
                    route=reverse_route, 
                    via_locations=reversed_via,
                    distance_km=instance.distance_km
                ).delete()
        except Exception as e: print(f"Path Delete Sync Error: {e}")
        instance.delete()

class TollGateViewSet(viewsets.ModelViewSet):
    queryset = TollGate.objects.all()
    serializer_class = TollGateSerializer

    def get_queryset(self):
        queryset = TollGate.objects.all()
        search = self.request.query_params.get('search', '')
        if search:
            queryset = queryset.filter(
                models.Q(gate_code__icontains=search) |
                models.Q(name__icontains=search) |
                models.Q(location__name__icontains=search) |
                models.Q(location__code__icontains=search)
            )
        return queryset.order_by('-id')

    def resolve_location(self, val):
        """Resolve a location value to a DB pk. Accepts pk (int), external_id, or name."""
        if not val:
            return None
        val = str(val).strip()
        # 1. Try by PK
        if val.isdigit():
            return Location.objects.filter(pk=val).first()
        # 2. Try by exact external_id (e.g. "Site-42", "Mandal-7")
        loc = Location.objects.filter(external_id=val).first()
        if loc:
            return loc
        # 3. Try stripping known prefixes and match by external_id suffix
        stripped = val.split('-', 1)[-1] if '-' in val else val
        if stripped.isdigit():
            loc = Location.objects.filter(external_id__endswith=f"-{stripped}").first()
            if loc:
                return loc
        # 4. Try name match as last resort
        return Location.objects.filter(name__iexact=val).first()

    def create(self, request, *args, **kwargs):
        loc_val = request.data.get('location')
        loc = self.resolve_location(loc_val) if loc_val else None
        if loc_val and not loc:
            return Response(
                {'location': f'Could not resolve location: "{loc_val}". Please sync the Geo data first.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        data = {**request.data, 'location': loc.pk if loc else None}
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [IsCustomAuthenticated()]
        return [IsAdmin()]


    def update(self, request, *args, **kwargs):
        loc_val = request.data.get('location')
        loc = self.resolve_location(loc_val) if loc_val else None
        if loc_val and not loc:
            return Response(
                {'location': f'Could not resolve location: "{loc_val}". Please sync the Geo data first.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        data = {**request.data, 'location': loc.pk if loc else None}
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response(serializer.data)


class TollRateViewSet(viewsets.ModelViewSet):
    queryset = TollRate.objects.all()
    serializer_class = TollRateSerializer

class RoutePathTollViewSet(viewsets.ModelViewSet):
    queryset = RoutePathToll.objects.all()
    serializer_class = RoutePathTollSerializer

    def get_queryset(self):
        queryset = RoutePathToll.objects.all()
        path_id = self.request.query_params.get('path')
        if path_id:
            queryset = queryset.filter(path=path_id)
        else:
            # Require path filter to avoid showing all tolls
            return RoutePathToll.objects.none()
        return queryset.order_by('order')

    def perform_create(self, serializer):
        instance = serializer.save()
        try:
            path = instance.path
            route = path.route
            reverse_route = Route.objects.filter(source=route.destination, destination=route.source).first()
            if reverse_route:
                required_via = [str(v) for v in reversed(path.via_locations)] if path.via_locations else []
                for rp in RoutePath.objects.filter(route=reverse_route):
                    if [str(v) for v in rp.via_locations] == required_via:
                        RoutePathToll.objects.get_or_create(
                            path=rp, 
                            toll_gate=instance.toll_gate,
                            defaults={'order': RoutePathToll.objects.filter(path=rp).count() + 1}
                        )
                        break
        except Exception as e: print(f"Create Sync Error: {e}")

    def perform_destroy(self, instance):
        try:
            path = instance.path
            route = path.route
            reverse_route = Route.objects.filter(source=route.destination, destination=route.source).first()
            if reverse_route:
                required_via = [str(v) for v in reversed(path.via_locations)] if path.via_locations else []
                for rp in RoutePath.objects.filter(route=reverse_route):
                    if [str(v) for v in rp.via_locations] == required_via:
                        RoutePathToll.objects.filter(path=rp, toll_gate=instance.toll_gate).delete()
                        break
        except Exception as e: print(f"Delete Sync Error: {e}")
        instance.delete()

class FuelRateMasterViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAdmin]
    queryset = FuelRateMaster.objects.all()
    serializer_class = FuelRateMasterSerializer

    def get_queryset(self):
        queryset = FuelRateMaster.objects.all()
        state = self.request.query_params.get('state')
        vehicle_type = self.request.query_params.get('vehicle_type')
        if state:
            queryset = queryset.filter(state__iexact=state)
        if vehicle_type:
            queryset = queryset.filter(vehicle_type__iexact=vehicle_type)
        return queryset.order_by('state', 'vehicle_type')

class EligibilityRuleViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAdmin]
    queryset = EligibilityRule.objects.all()
    serializer_class = EligibilityRuleSerializer

    def get_queryset(self):
        queryset = EligibilityRule.objects.all()
        cadre = self.request.query_params.get('cadre')
        category = self.request.query_params.get('category')
        city_type = self.request.query_params.get('city_type')
        
        if cadre:
            queryset = queryset.filter(cadre__iexact=cadre)
        if category:
            queryset = queryset.filter(category__iexact=category)
        if city_type:
            queryset = queryset.filter(city_type__iexact=city_type)
            
        return queryset.order_by('cadre__name', 'category', 'city_type')

class CadreViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAdmin]
    queryset = Cadre.objects.all()
    serializer_class = CadreSerializer

    def get_queryset(self):
        queryset = Cadre.objects.all()
        search = self.request.query_params.get('search', '')
        if search:
            queryset = queryset.filter(name__icontains=search)
        return queryset.order_by('name')

    @action(detail=False, methods=['post'])
    def sync(self, request):
        stats = sync_cadres()
        if "error" in stats:
            return Response(stats, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        return Response(stats)


