from django.db import models
from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from .models import (
    Location, Route, RoutePath, TollGate, TollRate, RoutePathToll, 
    FuelRateMaster, EligibilityRule, Cadre, Circle, Jurisdiction
)
from .serializers import (
    LocationSerializer, RouteSerializer, RoutePathSerializer,
    TollGateSerializer, TollRateSerializer, RoutePathTollSerializer,
    FuelRateMasterSerializer, EligibilityRuleSerializer, CadreSerializer,
    CircleSerializer, JurisdictionSerializer
)
from .services import sync_geo_locations, sync_cadres
from api_management.services import fetch_employee_data
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
                sync_geo_locations()
                self.__class__._last_sync_time = time.time()
            except Exception as e:
                pass
            
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
        source_name = request.query_params.get('source', '').strip()
        dest_name = request.query_params.get('destination', '').strip()
        
        if not source_name or not dest_name:
            return Response({"error": "Source and destination are required"}, status=400)

        # Strip code suffix if present (e.g. "Nellore - NLR" -> "Nellore")
        source_base = source_name.split(' - ')[0].strip()
        dest_base = dest_name.split(' - ')[0].strip()
            
        # Find routes that match source and destination names
        matching_routes = Route.objects.filter(
            models.Q(source__name__iexact=source_base) | models.Q(source__name__iexact=source_name),
            models.Q(destination__name__iexact=dest_base) | models.Q(destination__name__iexact=dest_name)
        )
        
        paths = RoutePath.objects.filter(route__in=matching_routes)
        serializer = RoutePathSerializer(paths, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='toll-lookup')
    def toll_lookup(self, request):
        source_name = (request.query_params.get('source') or '').strip()
        dest_name = (request.query_params.get('destination') or '').strip()

        if not source_name or not dest_name:
            return Response({"error": "Source and destination are required."}, status=status.HTTP_400_BAD_REQUEST)

        route = Route.objects.filter(
            source__name__iexact=source_name,
            destination__name__iexact=dest_name
        ).first()

        if not route:
            return Response({
                "has_route": False,
                "has_toll_record": False,
                "has_rate_record": False,
                "manual_entry_allowed": False,
                "amount": 0,
            })

        path = route.paths.filter(is_default=True).first() or route.paths.order_by('id').first()
        if not path:
            return Response({
                "has_route": True,
                "has_toll_record": False,
                "has_rate_record": False,
                "manual_entry_allowed": False,
                "amount": 0,
            })

        assignments = path.toll_assignments.select_related('toll_gate').prefetch_related('toll_gate__rates')
        if not assignments.exists():
            return Response({
                "has_route": True,
                "has_toll_record": False,
                "has_rate_record": False,
                "manual_entry_allowed": False,
                "amount": 0,
                "path_id": path.id,
                "path_name": path.path_name,
            })

        total_amount = 0
        has_rate_record = False
        missing_rate_gate_codes = []

        for assignment in assignments:
            rate = assignment.toll_gate.rates.filter(travel_mode__iexact='4 Wheeler (Single)').first()
            if rate:
                has_rate_record = True
                total_amount += float(rate.rate or 0)
            else:
                missing_rate_gate_codes.append(assignment.toll_gate.gate_code)

        return Response({
            "has_route": True,
            "has_toll_record": True,
            "has_rate_record": has_rate_record,
            "manual_entry_allowed": not has_rate_record,
            "amount": total_amount if has_rate_record else 0,
            "path_id": path.id,
            "path_name": path.path_name,
            "missing_rate_gate_codes": [code for code in missing_rate_gate_codes if code],
        })

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

    def get_permissions(self):
        if self.action == 'my_rate':
            return [IsCustomAuthenticated()]
        return [IsAdmin()]

    @action(detail=False, methods=['get'], url_path='my_rate')
    def my_rate(self, request):
        """
        Returns the fuel rate per km for the current user's state.
        Query param: vehicle_type = '2 Wheeler' or '4 Wheeler'
        """
        user = getattr(request, 'custom_user', None)
        if not user:
            return Response({'error': 'User not found'}, status=status.HTTP_401_UNAUTHORIZED)

        # Get user's state from their office geo_location
        try:
            api_data = user._get_api_data()
            geo = (api_data or {}).get('office', {}).get('geo_location', {}) or {}
            state = geo.get('state') or geo.get('State') or ''

            # Fallback: try office name as state hint
            if not state:
                # Use office name as last resort
                office_name = (api_data or {}).get('office', {}).get('name', '')
                state = office_name
        except Exception:
            state = ''

        vehicle_type = request.query_params.get('vehicle_type', '4 Wheeler')

        if not state:
            return Response({
                'rate_per_km': None,
                'state': None,
                'vehicle_type': vehicle_type,
                'message': 'Could not determine your state from office data'
            })

        # Look up rate - try exact match first, then case-insensitive contains
        rate_obj = (
            FuelRateMaster.objects.filter(state__iexact=state, vehicle_type__iexact=vehicle_type).first() or
            FuelRateMaster.objects.filter(state__icontains=state, vehicle_type__iexact=vehicle_type).first()
        )

        if rate_obj:
            return Response({
                'rate_per_km': float(rate_obj.rate_per_km),
                'state': rate_obj.state,
                'vehicle_type': rate_obj.vehicle_type,
            })
        else:
            return Response({
                'rate_per_km': None,
                'state': state,
                'vehicle_type': vehicle_type,
                'message': f'No fuel rate configured for {state} / {vehicle_type}'
            })

class EligibilityRuleViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAdmin]
    queryset = EligibilityRule.objects.all()
    serializer_class = EligibilityRuleSerializer

    @action(detail=False, methods=['post'], url_path='bulk-save')
    def bulk_save(self, request):
        rules_data = request.data
        if not isinstance(rules_data, list):
            return Response({"error": "Expected a list of rules"}, status=status.HTTP_400_BAD_REQUEST)
        
        results = {"created": 0, "updated": 0, "errors": []}
        
        for index, data in enumerate(rules_data):
            rule_id = data.get('id')
            try:
                if rule_id:
                    instance = EligibilityRule.objects.get(pk=rule_id)
                    serializer = EligibilityRuleSerializer(instance, data=data, partial=True)
                else:
                    # Check for duplicates before creation to avoid integrity errors
                    existing = EligibilityRule.objects.filter(
                        cadre_id=data.get('cadre'),
                        category=data.get('category'),
                        city_type=data.get('city_type', 'N/A')
                    ).first()
                    
                    if existing:
                        instance = existing
                        serializer = EligibilityRuleSerializer(instance, data=data, partial=True)
                    else:
                        serializer = EligibilityRuleSerializer(data=data)
                
                if serializer.is_valid():
                    serializer.save()
                    if rule_id or existing:
                        results["updated"] += 1
                    else:
                        results["created"] += 1
                else:
                    results["errors"].append({"index": index, "errors": serializer.errors})
            except Exception as e:
                results["errors"].append({"index": index, "error": str(e)})
        
        if results["errors"]:
            return Response(results, status=status.HTTP_207_MULTI_STATUS)
        return Response(results, status=status.HTTP_200_OK)

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

class CircleViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAdmin]
    queryset = Circle.objects.all()
    serializer_class = CircleSerializer

    def get_queryset(self):
        queryset = Circle.objects.all()
        state_id = self.request.query_params.get('state')
        if state_id:
            queryset = queryset.filter(state_id=state_id)
        return queryset

class JurisdictionViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAdmin]
    queryset = Jurisdiction.objects.all()
    serializer_class = JurisdictionSerializer

    def get_queryset(self):
        queryset = Jurisdiction.objects.all()
        search = self.request.query_params.get('search', '')
        if search:
            queryset = queryset.filter(
                models.Q(project_name__icontains=search) | 
                models.Q(project_code__icontains=search) |
                models.Q(circle__name__icontains=search)
            )
        return queryset.order_by('project_name', 'circle__name')

    @action(detail=False, methods=['post'], url_path='bulk-save')
    def bulk_save(self, request):
        data_list = request.data
        if not isinstance(data_list, list):
            return Response({"error": "Expected a list of jurisdictions"}, status=status.HTTP_400_BAD_REQUEST)
        
        results = {"created": 0, "updated": 0, "errors": []}
        
        for index, data in enumerate(data_list):
            try:
                juris_id = data.get('id')
                districts = data.pop('districts', [])
                
                if juris_id:
                    instance = Jurisdiction.objects.get(pk=juris_id)
                    serializer = JurisdictionSerializer(instance, data=data, partial=True)
                else:
                    # Check for duplicates (Project + Circle)
                    existing = Jurisdiction.objects.filter(
                        project_code=data.get('project_code'),
                        circle=data.get('circle')
                    ).first()
                    
                    if existing:
                        instance = existing
                        serializer = JurisdictionSerializer(instance, data=data, partial=True)
                    else:
                        serializer = JurisdictionSerializer(data=data)
                
                if serializer.is_valid():
                    instance = serializer.save()
                    # Districts are many-to-many, serializer.save() handles them if passed correctly
                    # but sometimes it's cleaner to handle M2M explicitly if needed
                    # serializer.save() with M2M requires the data to be in the dict
                    if districts:
                        instance.districts.set(districts)
                    
                    if juris_id or (not juris_id and existing):
                        results["updated"] += 1
                    else:
                        results["created"] += 1
                else:
                    results["errors"].append({"index": index, "errors": serializer.errors})
            except Exception as e:
                results["errors"].append({"index": index, "error": str(e)})
        
        if results["errors"]:
            return Response(results, status=status.HTTP_207_MULTI_STATUS)
        return Response(results, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'])
    def projects(self, request):
        """
        Custom endpoint to get unique projects from external API (Employees API)
        """
        try:
            # Fetch all employees to extract unique projects
            data = fetch_employee_data(fetch_all_pages=True, page_size=100)
            
            if not data or "error" in data:
                return Response({"error": "Failed to fetch project data from Employee API"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

            results = data.get('results', [])
            unique_projects = {} # Use code as key to ensure uniqueness
            
            for emp in results:
                proj = emp.get('project', {})
                if proj and isinstance(proj, dict):
                    name = proj.get('name')
                    code = proj.get('code')
                    if name and code:
                        unique_projects[code] = {"name": name, "code": code}
            
            return Response(list(unique_projects.values()))
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
