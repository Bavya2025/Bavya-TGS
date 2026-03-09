from rest_framework import generics, viewsets, status, serializers
from rest_framework.response import Response
from .models import Trip, Expense, TravelClaim, TravelAdvance, TripOdometer, Dispute, PolicyDocument
from .serializers import (
    TripSerializer, ExpenseSerializer, TravelClaimSerializer, 
    TravelAdvanceSerializer, TripOdometerSerializer, DisputeSerializer,
    PolicyDocumentSerializer, PolicyDocumentDetailSerializer
)
from rest_framework.permissions import AllowAny
from django.db.models import Q
import base64
import binascii
from api_management.utils import encrypt_key, decrypt_key
from django.utils import timezone
from rest_framework.views import APIView
from django.db.models import Sum
from core.models import Notification, User
from core.permissions import IsCustomAuthenticated
import requests

def decode_id(encoded_id):
    import base64
    import binascii
    
    if not encoded_id:
        return None
        
    try:
        # Check if it's already a numeric-looking ID or doesn't look like base64
        if encoded_id.isdigit():
            return encoded_id
            
        padding = 4 - (len(encoded_id) % 4)
        if padding != 4:
            encoded_id += '=' * padding
        
        encoded_id = encoded_id.replace('-', '+').replace('_', '/')
        
        decoded_bytes = base64.b64decode(encoded_id)
        return decoded_bytes.decode('utf-8')
    except (binascii.Error, UnicodeDecodeError, ValueError):
        return encoded_id

def _is_finance_head(user):
    """Checks if a user is the Finance Head."""
    user_role = (user.role.name.lower() if user.role else '')
    dept = user.department.lower()
    desig = user.designation.lower()
    return 'head' in dept and 'finance' in dept or 'head' in desig and 'finance' in desig or 'cfo' in user_role

def _is_finance_executive(user):
    """Checks if a user is a Finance Executive."""
    if _is_finance_head(user): return False
    user_role = (user.role.name.lower() if user.role else '')
    dept = user.department.lower()
    desig = user.designation.lower()
    return 'finance' in user_role or 'finance' in dept or 'finance' in desig

def _is_hr(user):
    """Checks if a user is an HR user."""
    user_role = (user.role.name.lower() if user.role else '')
    dept = user.department.lower()
    desig = user.designation.lower()
    return 'hr' in user_role or 'hr' in dept or 'hr' in desig

def _get_finance_users():
    """Returns a list of users who should be treated as Finance."""
    all_users = User.objects.filter(is_active=True).select_related('role')
    return [u for u in all_users if _is_finance_executive(u) or _is_finance_head(u)]

def _get_hr_users():
    """Returns a list of users who should be treated as HR."""
    all_users = User.objects.filter(is_active=True).select_related('role')
    return [u for u in all_users if _is_hr(u)]

def get_finance_head(user, exclude_user=None):
    """Finds a finance approver (Head of Finance)."""
    all_finance = _get_finance_users()
    heads = [u for u in all_finance if _is_finance_head(u)]
    if exclude_user:
        heads = [u for u in heads if u.id != exclude_user.id]
    
    if heads:
        return heads[0]
    # Fallback to any finance user if no head found
    return all_finance[0] if all_finance else None

def get_finance_executive(user, exclude_user=None):
    """Finds a finance executive."""
    all_finance = _get_finance_users()
    execs = [u for u in all_finance if _is_finance_executive(u)]
    if exclude_user:
         execs = [u for u in execs if u.id != exclude_user.id]
         
    if execs:
        return execs[0]
    return all_finance[0] if all_finance else None

def get_hr_head(user):
    """Finds an HR approver (Head of HR)."""
    all_hr = _get_hr_users()
    # Try local HR first
    local_hr = [u for u in all_hr if u.base_location == user.base_location]
    if local_hr:
        return local_hr[0]
    
    return all_hr[0] if all_hr else None

    local_heads = [u for u in heads if u.base_location == user.base_location]
    return local_heads[0] if local_heads else (heads[0] if heads else None)

def notify_hr(title, message):
    """Notify all users with HR role."""
    hr_users = User.objects.filter(role__name__icontains='hr')
    for hr in hr_users:
        Notification.objects.create(
            user=hr,
            title=title,
            message=message,
            type='info'
        )


def update_trip_lifecycle(trip, title, description):
    """Helper to append events to the Trip's JSON lifecycle field."""
    if not trip:
        return
    event = {
        "title": title,
        "status": "completed",
        "date": timezone.now().strftime("%b %d, %Y"),
        "description": description
    }
    events = trip.lifecycle_events
    if not isinstance(events, list):
        events = []
    
    # Avoid duplicate events with same title
    if not any(e.get('title') == title for e in events):
        events.append(event)
        trip.lifecycle_events = events
        trip.save(update_fields=['lifecycle_events'])

def decode_id(value):
    if not value:
        return value
    try:
        standard_base64 = value.replace('-', '+').replace('_', '/')
        missing_padding = len(standard_base64) % 4
        if missing_padding:
            standard_base64 += '=' * (4 - missing_padding)
        return base64.b64decode(standard_base64).decode('utf-8')
    except (binascii.Error, UnicodeDecodeError, ValueError):
        return value





class TripListCreateView(generics.ListCreateAPIView):
    serializer_class = TripSerializer
    permission_classes = [IsCustomAuthenticated]

    def get_queryset(self):
        user = getattr(self.request, 'custom_user', None)
        if not user:
            return Trip.objects.none()
            
        all_trips = self.request.query_params.get('all') == 'true'
        user_role = user.role.name.lower() if user.role else ''
        
        if all_trips and user_role in ['admin', 'guesthousemanager']:
            return Trip.objects.all().order_by('-created_at')
            
        return Trip.objects.filter(user=user).order_by('-created_at')

    def perform_create(self, serializer):
        user = getattr(self.request, 'custom_user', None)
        
        if not user:
            from rest_framework.exceptions import AuthenticationFailed
            raise AuthenticationFailed("Authentication required. Please login to create a trip.")
        
        
        # Admin / Superuser skip approvals
        user_role = user.role.name.lower() if user.role else ''
        if user_role in ['admin', 'superuser', 'it-admin']:
            trip = serializer.save(
                user=user,
                status='Approved',
                current_approver=None,
                hierarchy_level=0
            )
            update_trip_lifecycle(trip, "Auto-Approved", "Trip request auto-approved for Administrator.")
            return

        # Use dynamic properties for managers
        reporting_manager = user.reporting_manager
        senior_manager = user.senior_manager
        hod_director = user.hod_director
        
        def is_admin(u):
            if not u or not u.role:
                return False
            return u.role.name.lower() in ['admin', 'it-admin', 'superuser', 'it admin', 'system administrator']
        
        # Logic to find first available approver
        current_approver = reporting_manager if not is_admin(reporting_manager) else None
        h_level = 1
        
        if not current_approver:
            current_approver = senior_manager if not is_admin(senior_manager) else None
            h_level = 2
        
        if not current_approver:
            current_approver = hod_director if not is_admin(hod_director) else None
            h_level = 3
            
        if not current_approver:
            # User is likely an Admin or doesn't have a manager in HR
            # Check for selected users' reporting manager with high seniority
            members_list = serializer.validated_data.get('members', [])
            potential_managers = []
            
            import re
            for m_str in members_list:
                # Extract ID from "Name (ID) - Desig"
                match = re.search(r'\((.*?)\)', m_str)
                if match:
                    member_id = match.group(1)
                    # We don't use objects.get because user might not be in our DB yet
                    # Shell user uses _get_or_create_shell_user which is safe
                    member_user = User._get_or_create_shell_user(member_id)
                    manager = member_user.reporting_manager if member_user else None
                    if manager and not is_admin(manager):
                        potential_managers.append(manager)
            
            if potential_managers:
                # Sort by level_rank (lower is more senior)
                potential_managers.sort(key=lambda m: getattr(m, 'level_rank', 99))
                current_approver = potential_managers[0]
                h_level = 1 # Start level 1 for the team's manager
            else:
                # Absolute fallback: If no managers even for team, go to HR
                current_approver = get_hr_head(user)
                h_level = 1
        
        # Set status to 'Pending' so it shows up in manager's 'Pending' filters
        trip = serializer.save(
            user=user,
            status='Pending',
            current_approver=current_approver,
            hierarchy_level=h_level,
            # Populate snapshots for resilience
            user_name=user.name,
            user_designation=user.designation,
            user_department=user.department,
            reporting_manager_name=reporting_manager.name if reporting_manager else None,
            senior_manager_name=senior_manager.name if senior_manager else None,
            hod_director_name=hod_director.name if hod_director else None
        )

        if current_approver:
            Notification.objects.create(
                user=current_approver,
                title="New Trip Request",
                message=f"{user.name} has submitted a new trip request to {trip.destination}.",
                type='info'
            )
        
        # Notify Guest House Managers if room is requested
        if trip.accommodation_requests and any('Room' in r for r in trip.accommodation_requests):
            gh_managers = User.objects.filter(role__name='GuestHouseManager', is_active=True)
            for manager in gh_managers:
                Notification.objects.create(
                    user=manager,
                    title="Room Request Received",
                    message=f"{user.name} has requested a room for trip {trip.trip_id} to {trip.destination}.",
                    type='info'
                )

        # Notify HR
        notify_hr("New Trip Request", f"{user.name} has raised a new trip request to {trip.destination} (ID: {trip.trip_id}).")

        # Notify Fleet Managers if vehicle is requested
        if trip.accommodation_requests and any('Vehicle' in r for r in trip.accommodation_requests):
            fleet_notifees = User.objects.filter(Q(role__name='Admin') | Q(role__name='GuestHouseManager'), is_active=True)
            for manager in fleet_notifees:
                Notification.objects.create(
                    user=manager,
                    title="Vehicle Request Received",
                    message=f"{user.name} has requested a company vehicle for trip {trip.trip_id} to {trip.destination}.",
                    type='info'
                )

class TripBookingSearchView(generics.ListAPIView):
    serializer_class = TripSerializer
    permission_classes = [IsCustomAuthenticated] 

    def get_queryset(self):
        user = getattr(self.request, 'custom_user', None)
        if not user:
            return Trip.objects.none()

        # Users only search their own trips in this view
        queryset = Trip.objects.filter(user=user)

        search_query = self.request.query_params.get('search', None)
        if search_query:
            try:
                import base64
                padding = len(search_query) % 4
                if padding: 
                    search_query += '=' * (4 - padding)
                search_query = base64.b64decode(search_query).decode('utf-8')
            except Exception as e:
                print(f"Decoding error: {e}")
                pass

            queryset = queryset.filter(
                Q(trip_id__istartswith=search_query) | 
                Q(purpose__istartswith=search_query) | 
                Q(source__istartswith=search_query) | 
                Q(destination__istartswith=search_query) | 
                Q(trip_leader__istartswith=search_query)
            )
        
        return queryset

class TripDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Trip.objects.all()
    serializer_class = TripSerializer
    permission_classes = [IsCustomAuthenticated]
    lookup_field = 'trip_id'

    def get_object(self):
        if 'trip_id' in self.kwargs:
            self.kwargs['trip_id'] = decode_id(self.kwargs['trip_id'])
        
        obj = super().get_object()
        user = getattr(self.request, 'custom_user', None)
        
        if not user:
            self.permission_denied(self.request, message="Not authenticated")
            
        user_role = (user.role.name.lower() if user.role else '')
        is_admin = user_role in ['admin', 'it-admin', 'superuser']
        is_finance = user_role in ['finance', 'cfo']
        is_gh_manager = user_role == 'guesthousemanager'
        
        # Authorization check: Owner, Managers in the hierarchy, Current Approver, Finance, Guest House Manager, or Admin
        is_owner = (obj.user == user)
        # Check if the current user is any of the requester's managers or the current approver
        is_manager = user in [obj.user.reporting_manager, obj.user.senior_manager, obj.user.hod_director, obj.current_approver]
        
        if not (is_owner or is_manager or is_admin or is_finance or is_gh_manager):
             self.permission_denied(self.request, message="Not authorized to view this trip details")
             
        return obj

class ApprovalCountView(APIView):
    permission_classes = [IsCustomAuthenticated]

    def get(self, request):
        user = getattr(request, 'custom_user', None)
        if not user:
            return Response({"count": 0})
        
        user_role = (user.role.name.lower() if user.role else '')
        is_admin = user_role in ['admin', 'it-admin', 'superuser']
        is_finance = 'finance' in user_role
        
        if is_admin:
            trip_count = Trip.objects.filter(status__in=['Pending', 'Submitted', 'Forwarded']).count()
            advance_count = TravelAdvance.objects.filter(status__in=['Pending', 'Submitted', 'Forwarded']).count()
            claim_count = TravelClaim.objects.filter(status__in=['Pending', 'Submitted', 'Forwarded']).count()
        elif is_finance:
            if user.office_level == 1:
                # Finance Head counts
                trip_count = 0
                advance_count = TravelAdvance.objects.filter(status='PENDING_HEAD').count()
                claim_count = TravelClaim.objects.filter(status='PENDING_HEAD').count()
            else:
                # Finance Executive counts
                trip_count = 0
                pending_money_statuses = ['PENDING_EXECUTIVE', 'HR Approved', 'REJECTED_BY_HEAD', 'PENDING_FINAL_RELEASE', 'Approved', 'Under Process']
                advance_count = TravelAdvance.objects.filter(status__in=pending_money_statuses).count()
                claim_count = TravelClaim.objects.filter(status__in=pending_money_statuses).count()
        else:
            # Manager counts
            trip_count = Trip.objects.filter(current_approver=user, status__in=['Pending', 'Submitted', 'Forwarded', 'Manager Approved']).count()
            advance_count = TravelAdvance.objects.filter(current_approver=user, status__in=['Pending', 'Submitted', 'Forwarded', 'Manager Approved']).count()
            claim_count = TravelClaim.objects.filter(current_approver=user, status__in=['Pending', 'Submitted', 'Forwarded', 'Manager Approved']).count()
            
        return Response({
            "total": trip_count + advance_count + claim_count,
            "trips": trip_count,
            "advances": advance_count,
            "claims": claim_count
        })


class ApprovalsView(APIView):
    permission_classes = [IsCustomAuthenticated]

    def get(self, request):
        user = getattr(request, 'custom_user', None)
        if not user:
            return Response({"error": "User not found"}, status=401)
        
        user_role = (user.role.name.lower() if user.role else '')
        is_admin = user_role in ['admin', 'it-admin', 'superuser']
        is_finance = _is_finance_executive(user) or _is_finance_head(user)
        is_hr = _is_hr(user)
        is_finance_head = _is_finance_head(user)
        
        tab = request.query_params.get('tab', 'pending')
        type_filter = request.query_params.get('type', 'all') 
        
        trips = Trip.objects.none()
        advances = TravelAdvance.objects.none()
        claims = TravelClaim.objects.none()
        disputes = Dispute.objects.none()

        if tab == 'history':
            from core.models import AuditLog
            # Include 'UPDATE' to capture older approvals or edits made by managers
            involved_logs = AuditLog.objects.filter(user=user, action__in=['APPROVE', 'FORWARD', 'REJECT', 'UPDATE'])
            
            trip_pks = involved_logs.filter(model_name='Trip').values_list('object_id', flat=True)
            advance_pks_raw = involved_logs.filter(model_name='TravelAdvance').values_list('object_id', flat=True)
            claim_pks_raw = involved_logs.filter(model_name='TravelClaim').values_list('object_id', flat=True)
            
            # Convert string IDs to integers for numeric primary keys
            advance_pks = [int(pk) for pk in advance_pks_raw if pk and pk.isdigit()]
            claim_pks = [int(pk) for pk in claim_pks_raw if pk and pk.isdigit()]
            
            trips = Trip.objects.filter(trip_id__in=trip_pks)
            advances = TravelAdvance.objects.filter(id__in=advance_pks)
            claims = TravelClaim.objects.filter(id__in=claim_pks)
            
            # Admins see everything in history
            if is_admin:
                history_statuses = ['Approved', 'Rejected', 'Resolved', 'Paid', 'HR Approved', 'Manager Approved', 'COMPLETED']
                trips = Trip.objects.filter(status__in=history_statuses)
                advances = TravelAdvance.objects.filter(status__in=history_statuses)
                claims = TravelClaim.objects.filter(status__in=history_statuses)
        else:
            # Pending Tab
            if is_admin:
                finance_pending = ['PENDING_EXECUTIVE', 'PENDING_HEAD', 'PENDING_FINAL_RELEASE', 'REJECTED_BY_HEAD']
                trips = Trip.objects.filter(status__in=['Pending', 'Submitted', 'Forwarded', 'Manager Approved', 'HR Approved'] + finance_pending)
                advances = TravelAdvance.objects.filter(status__in=['Pending', 'Submitted', 'Forwarded', 'Manager Approved', 'HR Approved'] + finance_pending)
                claims = TravelClaim.objects.filter(status__in=['Pending', 'Submitted', 'Forwarded', 'Manager Approved', 'HR Approved'] + finance_pending)
            elif is_finance:
                if is_finance_head:
                    advances = TravelAdvance.objects.filter(status='PENDING_HEAD')
                    claims = TravelClaim.objects.filter(status='PENDING_HEAD')
                else:
                    pending_money_statuses = ['PENDING_EXECUTIVE', 'REJECTED_BY_HEAD', 'PENDING_FINAL_RELEASE']
                    advances = TravelAdvance.objects.filter(status__in=pending_money_statuses)
                    claims = TravelClaim.objects.filter(status__in=pending_money_statuses)
                
                # Filter by project/dept if needed
                finance_dept = user.department
                if finance_dept and finance_dept.lower() not in ['finance', 'finance department', 'accounts', 'finance head dept', 'finance executive dept']:
                    advances = advances.filter(trip__project_code__istartswith=finance_dept)
                    claims = claims.filter(trip__project_code__istartswith=finance_dept)
            elif is_hr:
                # HR verification stage
                trips = Trip.objects.filter(status='Manager Approved')
                advances = TravelAdvance.objects.filter(status='Manager Approved')
                claims = TravelClaim.objects.filter(status='Manager Approved')
            else:
                # Regular hierarchy
                trips = Trip.objects.filter(current_approver=user, status__in=['Pending', 'Submitted', 'Forwarded'])
                advances = TravelAdvance.objects.filter(current_approver=user, status__in=['Pending', 'Submitted', 'Forwarded'])
                claims = TravelClaim.objects.filter(current_approver=user, status__in=['Pending', 'Submitted', 'Forwarded'])
        
        tasks = []
        # Support filtering by type if specified
        if type_filter in ['all', 'trip']:
            for t in trips.order_by('-created_at'):
                tasks.append({
                    "id": f"TRIP-{t.trip_id}", "db_id": t.trip_id, "type": "Trip",
                    "requester": t.user.name if t.user else "Unknown", "purpose": t.purpose,
                    "status": t.status, "date": t.created_at.strftime("%b %d, %Y"),
                    "hierarchy_level": t.hierarchy_level,
                    "trip_id": t.trip_id,
                    "cost": t.cost_estimate,
                    "details": {
                        "source": t.source, "destination": t.destination, 
                        "start_date": t.start_date.strftime("%b %d, %Y"),
                        "end_date": t.end_date.strftime("%b %d, %Y"),
                        "travel_mode": t.travel_mode,
                        "composition": t.composition,
                        "vehicle_type": t.vehicle_type,
                        "purpose": t.purpose
                    }
                })
            
        if type_filter in ['all', 'advance']:
            for a in advances.order_by('-created_at'):
                tasks.append({
                    "id": f"ADV-{a.id}", "db_id": a.id, "type": "Money Top-up / Advance",
                    "requester": a.trip.user.name if a.trip.user else "Unknown",
                    "purpose": f"Advance: {a.purpose}", "cost": f"₹{a.requested_amount}",
                    "status": a.status, "date": a.created_at.strftime("%b %d, %Y"),
                    "hierarchy_level": a.hierarchy_level,
                    "trip_id": a.trip.trip_id,
                    "details": {
                        "source": a.trip.source,
                        "destination": a.trip.destination,
                        "requested_amount": str(a.requested_amount),
                        "hr_approved_amount": str(a.hr_approved_amount or 0),
                        "hr_remarks": a.hr_remarks or "",
                        "executive_approved_amount": str(a.executive_approved_amount),
                        "reason": a.purpose,
                        "trip_destination": a.trip.destination,
                        "trip_id": a.trip.trip_id,
                        "start_date": a.trip.start_date.strftime("%b %d, %Y") if a.trip.start_date else "N/A",
                        "end_date": a.trip.end_date.strftime("%b %d, %Y") if a.trip.end_date else "N/A",
                    }
                })

        if type_filter in ['all', 'expense', 'mileage']:
            for c in claims.order_by('-created_at'):
                tasks.append({
                    "id": f"CLAIM-{c.id}", "db_id": c.id, "type": "Expense Claim",
                    "requester": c.trip.user.name if c.trip.user else "Unknown",
                    "purpose": f"Claim for {c.trip.destination}", "cost": f"₹{c.total_amount}",
                    "status": c.status, "date": c.created_at.strftime("%b %d, %Y"),
                    "hierarchy_level": c.hierarchy_level,
                    "trip_id": c.trip.trip_id,
                    "details": {
                        "source": c.trip.source,
                        "destination": c.trip.destination,
                        "total_amount": str(c.total_amount),
                        "requested_amount": str(c.total_amount),
                        "approved_amount": str(c.approved_amount),
                        "hr_approved_amount": str(c.hr_approved_amount or 0),
                        "hr_remarks": getattr(c, 'hr_remarks', c.remarks) or "",
                        "executive_approved_amount": str(c.executive_approved_amount),
                        "trip_id": c.trip.trip_id,
                        "start_date": c.trip.start_date.strftime("%b %d, %Y") if c.trip.start_date else "N/A",
                        "end_date": c.trip.end_date.strftime("%b %d, %Y") if c.trip.end_date else "N/A",
                        "expenses": [
                            {
                                "id": e.id,
                                "category": e.category,
                                "date": e.date.strftime("%b %d, %Y"),
                                "amount": str(e.amount),
                                "description": e.description,
                                "status": e.status,
                                "receipt_image": e.receipt_image,
                                "rm_remarks": e.rm_remarks or "",
                                "hr_remarks": e.hr_remarks or "",
                                "finance_remarks": e.finance_remarks or ""
                            } for e in c.trip.expenses.all()
                        ]
                    }
                })

        for d in disputes.order_by('-created_at'):
            tasks.append({
                "id": f"DISPUTE-{d.id}", "db_id": d.id, "type": "Dispute",
                "requester": d.raised_by.name if d.raised_by else "Unknown",
                "purpose": f"Dispute: {d.category}", "status": d.status,
                "date": d.created_at.strftime("%b %d, %Y")
            })

        return Response(tasks)

    def post(self, request):
        user = getattr(request, 'custom_user', None)
        task_id = request.data.get('id')
        action = request.data.get('action') 
        
        if not task_id or not action:
            return Response({"error": "ID and Action required"}, status=400)
            
        if action == 'UpdateItem':
            item_id = request.data.get('item_id')
            item_status = request.data.get('item_status')
            remarks = request.data.get('remarks', '')
            if item_id:
                from .models import Expense
                expense = Expense.objects.filter(id=item_id).first()
                if expense:
                    update_fields = {'status': item_status}
                    # Determine which remarks field to update based on user role
                    user_role = user.role.name.upper() if user and user.role else ""
                    if "FINANCE" in user_role:
                        update_fields['finance_remarks'] = remarks
                    elif "HR" in user_role:
                        update_fields['hr_remarks'] = remarks
                    else:
                        update_fields['rm_remarks'] = remarks
                    
                    Expense.objects.filter(id=item_id).update(**update_fields)
                    return Response({"message": f"Item {item_id} set to {item_status} with remarks"})
            return Response({"error": "Item ID required or not found"}, status=400)

        try:
            if task_id.startswith('TRIP-'):
                obj = Trip.objects.get(trip_id=task_id.replace('TRIP-', ''))
            elif task_id.startswith('ADV-'):
                obj = TravelAdvance.objects.get(id=task_id.replace('ADV-', ''))
            elif task_id.startswith('CLAIM-'):
                obj = TravelClaim.objects.get(id=task_id.replace('CLAIM-', ''))
            elif task_id.startswith('DISPUTE-'):
                obj = Dispute.objects.get(id=task_id.replace('DISPUTE-', ''))
            else:
                return Response({"error": "Invalid task ID"}, status=400)
            
            self._handle_workflow(obj, action, user, request.data)
            return Response({"message": f"Task processed successfully: {action}"})
        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response({"error": str(e)}, status=400)

    def _handle_workflow(self, obj, action, user, data=None):
        """Generic multi-level workflow handler"""
        # Determine requester 
        requester = obj.user if hasattr(obj, 'user') else obj.trip.user
        request_type = "Trip" if isinstance(obj, Trip) else ("Advance" if isinstance(obj, TravelAdvance) else "Expense Claim")
        
        from core.models import AuditLog
        if action == 'Reject':
            reason = data.get('remarks') if data else ''
            obj.status = 'Rejected'
            obj.rejection_reason = reason
            obj.rejected_by = user
            obj.current_approver = None
            obj.save()
            
            AuditLog.objects.create(
                user=user, action='REJECT', model_name=obj.__class__.__name__,
                object_id=str(obj.pk), object_repr=str(obj),
                details={'reason': reason}
            )

            # --- Notifications ---
            obj_id = getattr(obj, 'trip_id', str(obj.pk))
            # 1. To Requester
            Notification.objects.create(
                user=requester,
                title=f"{request_type} Rejected",
                message=f"Your {request_type} ({obj_id}) was rejected by {user.name}. Reason: {reason or 'Not specified'}",
                type='error'
            )
            # 2. To Previous Approvers
            prev_approver_ids = AuditLog.objects.filter(
                model_name=obj.__class__.__name__,
                object_id=str(obj.pk),
                action='APPROVE'
            ).values_list('user', flat=True).distinct()

            for app_id in prev_approver_ids:
                if app_id and app_id != user.id:
                    try:
                        app_user = User.objects.get(id=app_id)
                        Notification.objects.create(
                            user=app_user,
                            title=f"{request_type} Rejected by {user.name}",
                            message=f"{requester.name}'s {request_type} ({obj_id}) which you approved has been rejected. Reason: {reason or 'Not specified'}",
                            type='warning'
                        )
                    except User.DoesNotExist: continue

        # Security Check: Only current_approver or assigned role can perform actions
        user_role = user.role.name.lower() if user.role else ''
        is_admin = user_role in ['admin', 'it-admin', 'superuser']
        is_hr = _is_hr(user)
        is_finance_exec = _is_finance_executive(user)
        is_finance_head = _is_finance_head(user)
        is_finance = is_finance_exec or is_finance_head

        if not is_admin:
            authorized = False
            if obj.current_approver == user:
                authorized = True
            elif is_hr and obj.status == 'Manager Approved':
                authorized = True
            elif is_finance_exec and obj.status in ['PENDING_EXECUTIVE', 'REJECTED_BY_HEAD', 'PENDING_FINAL_RELEASE']:
                authorized = True
            elif is_finance_head and obj.status == 'PENDING_HEAD':
                authorized = True
            
            if not authorized:
                raise Exception("You are not authorized to perform this action on this request.")

        if action == 'Forward':
            # This is now mostly handled by 'Approve' automatic progression, 
            # but we keep it for manual overrides if needed by admins.
            mgr_l2 = getattr(obj, 'senior_manager', None)
            mgr_l3 = getattr(obj, 'hod_director', None)
            
            next_approver = None
            next_level = obj.hierarchy_level
            
            if obj.hierarchy_level == 1:
                next_approver = mgr_l2 or mgr_l3
                next_level = 2 if mgr_l2 else 3
            elif obj.hierarchy_level == 2:
                next_approver = mgr_l3
                next_level = 3
            
            if not next_approver:
                raise Exception("There is no higher-level manager to forward this request to.")

            obj.current_approver = next_approver
            obj.hierarchy_level = next_level
            obj.save()
            
            AuditLog.objects.create(
                user=user, action='FORWARD', model_name=obj.__class__.__name__,
                object_id=str(obj.pk), object_repr=str(obj),
                details={'to': str(next_approver)}
            )
            return Response({"message": "Forwarded successfully"})

        if action == 'Approve':
            is_hr = _is_hr(user)
            is_finance = _is_finance_executive(user) or _is_finance_head(user)
            from core.models import AuditLog
            AuditLog.objects.create(
                user=user, action='APPROVE', model_name=obj.__class__.__name__,
                object_id=str(obj.pk), object_repr=str(obj)
            )
            
            # --- STAGE 1: Management Hierarchy ---
            if not is_hr and not is_finance:
                trip = obj if isinstance(obj, Trip) else getattr(obj, 'trip', None)
                if trip:
                    level = getattr(obj, 'hierarchy_level', 1)
                    
                    # If this is a claim, calculate the approved total based on item statuses
                    if isinstance(obj, TravelClaim):
                        from django.db.models import Sum
                        # Re-calculate approved total from items not marked as Rejected
                        # We assume anything not 'Rejected' is 'Approved' or 'Pending' (which defaults to OK in this step)
                        # Actually, better to strictly count only 'Approved' or 'Pending'
                        approved_sum = obj.trip.expenses.exclude(status='Rejected').aggregate(s=Sum('amount'))['s'] or 0
                        obj.approved_amount = approved_sum
                        obj.save()
                        
                        rejected_items = obj.trip.expenses.filter(status='Rejected')
                        rej_msg = f" with {rejected_items.count()} items rejected" if rejected_items.exists() else ""
                        update_trip_lifecycle(trip, f"Level {level} Approval", f"Approved by {user.name}{rej_msg}. Net Approved: ₹{approved_sum}.")
                    else:
                        update_trip_lifecycle(trip, f"Level {level} Approval", f"Approved by {user.name}.")
                
                next_approver = None
                
                # Try explicit levels first
                if obj.hierarchy_level == 1:
                    next_approver = getattr(obj, 'senior_manager', None) or getattr(obj, 'hod_director', None)
                elif obj.hierarchy_level == 2:
                    next_approver = getattr(obj, 'hod_director', None)
                
                # DYNAMIC FALLBACK: If no explicit level but current user has a manager
                if not next_approver:
                    # Use dynamic property to find manager
                    potential_manager = user.reporting_manager
                    
                    # Ensure we don't route back to requester or to a non-existent manager
                    if potential_manager and potential_manager != user and potential_manager != requester:
                        next_approver = potential_manager
                
                if next_approver:
                    # Move to next manager in chain
                    obj.current_approver = next_approver
                    obj.hierarchy_level += 1
                    obj.save()
                    
                    Notification.objects.create(
                        user=next_approver,
                        title=f"Pending Approval: {request_type}",
                        message=f"{requester.name}'s {request_type} requires your review (Forwarded from {user.name}).",
                        type='info'
                    )

                    Notification.objects.create(
                        user=requester,
                        title=f"Approved by {user.name}",
                        message=f"Your {request_type} has been approved by {user.name} and forwarded to {next_approver.name} for the next level review.",
                        type='success'
                    )
                else:
                    # End of Management Chain -> Move to HR Approval
                    hr_head = get_hr_head(requester)
                    obj.status = 'Manager Approved'
                    obj.current_approver = hr_head
                    obj.save()
                    
                    Notification.objects.create(
                        user=requester,
                        title=f"Management Approved",
                        message=f"Your {request_type} has been approved by management and sent to HR for verification.",
                        type='success'
                    )

                    # Notify Guest House Managers if room request exists and this is a Trip
                    if isinstance(obj, Trip) and obj.accommodation_requests and 'Request for Room' in obj.accommodation_requests:
                        gh_managers = User.objects.filter(role__name='GuestHouseManager')
                        for ghm in gh_managers:
                            Notification.objects.create(
                                user=ghm,
                                title="Pending Room Request",
                                message=f"{requester.name}'s trip to {obj.destination} is management-approved. Room booking may be initiated.",
                                type='info'
                            )
                    
                    if hr_head:
                        Notification.objects.create(
                            user=hr_head,
                            title=f"HR Verification Required",
                            message=f"{requester.name}'s {request_type} is management-approved and awaits your verification.",
                            type='info'
                        )
                return Response({"message": "Sent to HR for verification"})

            # --- STAGE 2: HR Approval ---
            elif is_hr:
                trip = obj if isinstance(obj, Trip) else getattr(obj, 'trip', None)
                if trip:
                    update_trip_lifecycle(trip, "Ticket Booking", f"HR ({user.name}) has verified travel logistics.")
                
                if isinstance(obj, Trip):
                    # --- TRIP ENDS AT HR ---
                    obj.status = 'Approved'
                    obj.current_approver = None
                    obj.save()
                    
                    Notification.objects.create(
                        user=requester,
                        title="Trip Approved",
                        message=f"Your Trip to {obj.destination} has been final-approved by HR.",
                        type='success'
                    )

                    # Notify Guest House Managers if room request exists
                    if obj.accommodation_requests and 'Request for Room' in obj.accommodation_requests:
                        gh_managers = User.objects.filter(role__name='GuestHouseManager')
                        for ghm in gh_managers:
                            Notification.objects.create(
                                user=ghm,
                                title="Room Request Ready",
                                message=f"Trip {obj.trip_id} to {obj.destination} has been approved. Room booking is now required.",
                                type='info'
                            )
                else:
                    # --- MONEY REQUESTS MOVE TO FINANCE EXECUTIVE ---
                    # Capture HR specific fields
                    hr_amt = data.get('hr_approved_amount')
                    hr_rem = data.get('hr_remarks') or data.get('remarks')
                    
                    if hasattr(obj, 'hr_approved_amount'):
                        obj.hr_approved_amount = hr_amt if hr_amt is not None else getattr(obj, 'requested_amount', getattr(obj, 'total_amount', 0))
                    if hasattr(obj, 'hr_remarks'):
                        obj.hr_remarks = hr_rem
                    
                    finance_exec = get_finance_executive(requester, exclude_user=user)
                    obj.status = 'PENDING_EXECUTIVE'
                    obj.current_approver = finance_exec
                    obj.save()
                    
                    Notification.objects.create(
                        user=requester,
                        title=f"HR Verified",
                        message=f"Your {request_type} has been verified by HR and sent to Finance Executive for verification.",
                        type='success'
                    )
                    
                    if finance_exec:
                        Notification.objects.create(
                            user=finance_exec,
                            title=f"Finance Verification Required",
                            message=f"{requester.name}'s {request_type} is HR-verified and awaits your verification.",
                            type='info'
                        )
                return Response({"message": "HR recommendation processed"})
            # --- STAGE 3: Finance Approval ---
            elif is_finance:
                trip = obj if isinstance(obj, Trip) else getattr(obj, 'trip', None)
                
                # Case A: Finance Executive Verification (Finance Executive 1)
                if _is_finance_executive(user) and obj.status in ['PENDING_EXECUTIVE', 'HR Approved', 'REJECTED_BY_HEAD', 'Approved', 'Under Process']:
                    exec_amount = data.get('approved_amount') or data.get('executive_approved_amount')
                    if exec_amount is None:
                        exec_amount = getattr(obj, 'requested_amount', getattr(obj, 'total_amount', 0))
                    
                    obj.executive_approved_amount = exec_amount
                    obj.sent_by_executive = user
                    obj.status = 'PENDING_HEAD'
                    obj.current_approver = get_finance_head(requester, exclude_user=user)
                    obj.save()
                    
                    if trip:
                        update_trip_lifecycle(trip, "Finance Verified", f"Verified by Executive {user.name}. Amount recommended: ₹{exec_amount}.")
                    
                    Notification.objects.create(
                        user=obj.current_approver,
                        title="Finance Authorization Required",
                        message=f"{requester.name}'s request verified by executive and awaits your authorization.",
                        type='info'
                    )
                    return Response({"message": "Verified and sent to Head"})

                # Case B: Finance Head Authorization (from PENDING_HEAD)
                if _is_finance_head(user) and obj.status == 'PENDING_HEAD':
                    if action == 'Approve':
                        obj.status = 'PENDING_FINAL_RELEASE'
                        obj.head_action = 'Approved'
                        
                        # Forward to OTHER finance executive (Finance Executive 2)
                        all_fin_users = _get_finance_users()
                        other_execs = [u for u in all_fin_users if not _is_finance_head(u) and u != obj.sent_by_executive]
                        final_exec = other_execs[0] if other_execs else obj.sent_by_executive
                        
                        obj.current_approver = final_exec
                        obj.final_executive = final_exec
                        obj.save()
                        
                        if trip:
                            update_trip_lifecycle(trip, "Finance Authorized", f"Authorized by Head {user.name}. Sent to {final_exec.name if final_exec else 'Executive'} for payout.")
                    
                    elif action == 'Reject':
                        obj.status = 'REJECTED_BY_HEAD'
                        obj.head_action = 'Rejected'
                        obj.current_approver = obj.sent_by_executive
                        obj.save()
                        
                        if trip:
                            update_trip_lifecycle(trip, "Head Rejected", f"Rejected by Finance Head {user.name}. Returned to Executive for revision.")
                    return Response({"message": "Head action processed"})

                # Case C: Transfer action handled below in Finance Specific Actions section
                pass

                return Response({"message": "No specific finance action matched"}, status=200)

        # Finance Specific Actions
        if action == 'UnderProcess':
            obj.status = 'Under Process'
            obj.save()
            Notification.objects.create(
                user=requester,
                title="Finance: Under Process",
                message=f"Your {request_type} is under process by Finance Team.",
                type='info'
            )
            return Response({"message": "Under process updated"})

        if action in ['Transfer', 'Pay']:
            # Security: Only finance can perform transfers, and usually only for finalized requests
            if not _is_finance_executive(user) and not _is_finance_head(user):
                raise PermissionDenied("Only Finance can process transfers.")
            
            # Additional check: If it has a final_executive assigned, only they should pay
            if hasattr(obj, 'final_executive') and obj.final_executive and obj.final_executive != user and not _is_finance_head(user):
                raise PermissionDenied(f"This payout is assigned to {obj.final_executive.name}.")

            if data:
                payment_mode = data.get('payment_mode')
                transaction_id = data.get('transaction_id')
                amount = getattr(obj, 'executive_approved_amount', getattr(obj, 'approved_amount', 0))
                
                # Capture details
                if hasattr(obj, 'payment_mode'): obj.payment_mode = payment_mode
                if hasattr(obj, 'transaction_id'): obj.transaction_id = transaction_id
                if hasattr(obj, 'payment_date'): obj.payment_date = data.get('payment_date') or timezone.now()
                if hasattr(obj, 'finance_remarks'): obj.finance_remarks = data.get('remarks', '')
                if hasattr(obj, 'processed_by'): obj.processed_by = user
            
            obj.status = 'COMPLETED'
            obj.current_approver = None
            obj.save()
            
            # Record Lifecycle Event
            trip = obj if isinstance(obj, Trip) else getattr(obj, 'trip', None)
            if trip:
                update_trip_lifecycle(trip, "Settlement", f"Final Transfer completed by {user.name}.")
            
            Notification.objects.create(
                user=requester,
                title="Amount Credited",
                message=f"Your {request_type} has been fully approved and the amount has been credited to your account.",
                type='success'
            )
            return Response({"message": "Transfer completed and phase closed."})

        if action == 'RejectByFinance':
            reason = data.get('remarks', 'No reason provided') if data else ""
            obj.status = 'Rejected by Finance'
            obj.rejection_reason = reason
            obj.rejected_by = user
            if hasattr(obj, 'finance_remarks'): obj.finance_remarks = reason
            obj.save()

            # Record in AuditLog
            from core.models import AuditLog
            AuditLog.objects.create(
                user=user, action='REJECT', model_name=obj.__class__.__name__,
                object_id=str(obj.pk), object_repr=str(obj),
                details={'reason': reason}
            )

            # --- Notifications ---
            obj_id = getattr(obj, 'trip_id', str(obj.pk))
            # 1. To Requester
            Notification.objects.create(
                user=requester,
                title="Finance: Request Rejected",
                message=f"Your {request_type} ({obj_id}) was rejected by Finance ({user.name}). Reason: {reason}",
                type='error'
            )
            # 2. To Previous Approvers
            prev_approver_ids = AuditLog.objects.filter(
                model_name=obj.__class__.__name__,
                object_id=str(obj.pk),
                action='APPROVE'
            ).values_list('user', flat=True).distinct()

            for app_id in prev_approver_ids:
                if app_id and app_id != user.id:
                    try:
                        app_user = User.objects.get(id=app_id)
                        Notification.objects.create(
                            user=app_user,
                            title=f"{request_type} Rejected by Finance",
                            message=f"{requester.name}'s {request_type} ({obj_id}) which you approved has been rejected by {user.name}. Reason: {reason}",
                            type='warning'
                        )
                    except User.DoesNotExist: continue

            return Response({"message": "Rejected by Finance"})

class ExpenseViewSet(viewsets.ModelViewSet):
    queryset = Expense.objects.all()
    serializer_class = ExpenseSerializer
    permission_classes = [IsCustomAuthenticated]
    http_method_names = ['get', 'post', 'patch', 'put', 'head', 'options']

    def get_queryset(self):
        user = getattr(self.request, 'custom_user', None)
        if not user:
            return Expense.objects.none()
            
        is_admin = hasattr(user, 'role') and user.role.name.lower() in ['admin', 'superuser']
        
        if is_admin:
            queryset = self.queryset
        else:
            queryset = self.queryset.filter(trip__user=user)
            
        trip_id = self.request.query_params.get('trip_id')
        if trip_id:
            trip_id = decode_id(trip_id)
            queryset = queryset.filter(trip__trip_id=trip_id)
        return queryset

    def perform_create(self, serializer):
        user = getattr(self.request, 'custom_user', None)
        trip = serializer.validated_data.get('trip')
        if trip and trip.user != user:
            raise serializers.ValidationError("Unauthorized trip association")
        serializer.save()

class PolicyDocumentViewSet(viewsets.ModelViewSet):
    queryset = PolicyDocument.objects.all()
    serializer_class = PolicyDocumentSerializer
    permission_classes = [IsCustomAuthenticated]

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return PolicyDocumentDetailSerializer
        return PolicyDocumentSerializer

    def get_queryset(self):
        # Always return a fresh queryset; returning the class-level queryset
        # directly can reuse a cached empty result across requests.
        return PolicyDocument.objects.all()

    def perform_create(self, serializer):
        user = getattr(self.request, 'custom_user', None)
        serializer.save(uploaded_by=user)

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            from core.permissions import IsAdmin
            return [IsAdmin()]
        return [IsCustomAuthenticated()]

class TravelClaimViewSet(viewsets.ModelViewSet):
    queryset = TravelClaim.objects.all()
    serializer_class = TravelClaimSerializer
    permission_classes = [IsCustomAuthenticated]

    def get_queryset(self):
        user = getattr(self.request, 'custom_user', None)
        if not user:
            return TravelClaim.objects.none()
            
        is_admin = hasattr(user, 'role') and user.role.name.lower() in ['admin', 'superuser']
        
        if is_admin:
            queryset = self.queryset
        else:
            queryset = self.queryset.filter(trip__user=user)
            
        trip_id = self.request.query_params.get('trip_id')
        if trip_id:
            trip_id = decode_id(trip_id)
            queryset = queryset.filter(trip__trip_id=trip_id)
        return queryset

    def perform_create(self, serializer):
        user = getattr(self.request, 'custom_user', None)
        trip = serializer.validated_data.get('trip')
        if trip and trip.user != user:
            raise serializers.ValidationError("Unauthorized trip association")
        
        reporting_manager = user.reporting_manager
        senior_manager = user.senior_manager
        hod_director = user.hod_director
        
        # Logic to find first available approver
        current_approver = reporting_manager
        h_level = 1
        
        if not current_approver:
            current_approver = senior_manager
            h_level = 2
        
        if not current_approver:
            current_approver = hod_director
            h_level = 3
            
        if not current_approver:
            # If no managers at all, go to HR
            current_approver = get_hr_head(user)

        claim = serializer.save(
            status='Submitted',
            current_approver=current_approver,
            hierarchy_level=h_level,
            submitted_at=timezone.now(),
            # Populate snapshots for resilience
            user_name=user.name,
            user_designation=user.designation,
            user_department=user.department,
            reporting_manager_name=reporting_manager.name if reporting_manager else None,
            senior_manager_name=senior_manager.name if senior_manager else None,
            hod_director_name=hod_director.name if hod_director else None
        )
        
        if current_approver:
            Notification.objects.create(
                user=current_approver,
                title="New Expense Claim",
                message=f"{user.name} has submitted an expense claim for Trip {claim.trip.trip_id}.",
                type='info'
            )
            
        # Notify HR
        notify_hr("New Expense Claim", f"{user.name} has submitted an expense claim for Trip {claim.trip.trip_id}.")
            
        self._update_trip_lifecycle(claim.trip)

    def perform_update(self, serializer):
        claim = serializer.save()
        if claim.status == 'Submitted':
            self._update_trip_lifecycle(claim.trip)

    def _update_trip_lifecycle(self, trip):
        update_trip_lifecycle(trip, "Settlement", "Travel reimbursement claim submitted for review.")

class TravelAdvanceViewSet(viewsets.ModelViewSet):
    queryset = TravelAdvance.objects.all()
    serializer_class = TravelAdvanceSerializer

    def get_queryset(self):
        user = getattr(self.request, 'custom_user', None)
        if not user:
            return TravelAdvance.objects.none()
            
        is_admin = hasattr(user, 'role') and user.role.name.lower() in ['admin', 'superuser']
        
        if is_admin:
            queryset = self.queryset
        else:
            queryset = self.queryset.filter(trip__user=user)
            
        trip_id = self.request.query_params.get('trip_id')
        if trip_id:
            trip_id = decode_id(trip_id)
            queryset = queryset.filter(trip__trip_id=trip_id)
        return queryset

    def perform_create(self, serializer):
        user = getattr(self.request, 'custom_user', None)
        trip = serializer.validated_data.get('trip')
        if trip and trip.user != user:
            raise serializers.ValidationError("Unauthorized trip association")
            
        reporting_manager = user.reporting_manager
        senior_manager = user.senior_manager
        hod_director = user.hod_director

        # Logic to find first available approver
        current_approver = reporting_manager
        h_level = 1
        
        if not current_approver:
            current_approver = senior_manager
            h_level = 2
        
        if not current_approver:
            current_approver = hod_director
            h_level = 3
            
        if not current_approver:
            # If no managers at all, go to HR
            current_approver = get_hr_head(user)

        advance = serializer.save(
            status='Submitted',
            current_approver=current_approver,
            hierarchy_level=h_level,
            submitted_at=timezone.now(),
            # Populate snapshots for resilience
            user_name=user.name,
            user_designation=user.designation,
            user_department=user.department,
            reporting_manager_name=reporting_manager.name if reporting_manager else None,
            senior_manager_name=senior_manager.name if senior_manager else None,
            hod_director_name=hod_director.name if hod_director else None
        )
        
        if current_approver:
            Notification.objects.create(
                user=current_approver,
                title="New Advance Request",
                message=f"{user.name} has requested an advance of ₹{advance.requested_amount} for Trip {advance.trip.trip_id}.",
                type='info'
            )
            
        # Notify HR
        notify_hr("New Advance Request", f"{user.name} has requested an advance of ₹{advance.requested_amount} for Trip {advance.trip.trip_id}.")

        self._update_trip_lifecycle(advance)

    def perform_update(self, serializer):
        advance = serializer.save()
        if advance.status == 'Submitted':
            self._update_trip_lifecycle(advance)

    def _update_trip_lifecycle(self, advance):
        update_trip_lifecycle(advance.trip, "Advance Requested", f"Pre-trip advance of ₹{advance.requested_amount} requested for: {advance.purpose[:40]}...")



class DisputeViewSet(viewsets.ModelViewSet):
    queryset = Dispute.objects.all()
    serializer_class = DisputeSerializer
    permission_classes = [IsCustomAuthenticated]

    def get_queryset(self):
        user = getattr(self.request, 'custom_user', None)
        if not user:
            return Dispute.objects.none()
        
        if hasattr(user, 'role') and user.role.name.lower() in ['admin', 'superuser']:
            return Dispute.objects.all()
        
        return Dispute.objects.filter(raised_by=user)

    def perform_create(self, serializer):
        user = getattr(self.request, 'custom_user', None)
        serializer.save(raised_by=user)

class TripOdometerViewSet(viewsets.ModelViewSet):
    queryset = TripOdometer.objects.all()
    serializer_class = TripOdometerSerializer
    permission_classes = [IsCustomAuthenticated]

    def get_queryset(self):
        user = getattr(self.request, 'custom_user', None)
        if not user:
            return TripOdometer.objects.none()
            
        is_admin = hasattr(user, 'role') and user.role.name.lower() in ['admin', 'superuser']
        
        if is_admin:
            queryset = self.queryset
        else:
            queryset = self.queryset.filter(trip__user=user)
            
        trip_id = self.request.query_params.get('trip_id')
        if trip_id:
            trip_id = decode_id(trip_id)
            queryset = queryset.filter(trip__trip_id=trip_id)
        return queryset

    def perform_create(self, serializer):
        user = getattr(self.request, 'custom_user', None)
        trip = serializer.validated_data.get('trip')
        if trip and trip.user != user:
            raise serializers.ValidationError("Unauthorized trip association")
            
            
        odo = serializer.save()
        if odo.start_odo_reading:
            trip = odo.trip
            trip.status = 'On-Going'
            trip.save(update_fields=['status'])
            update_trip_lifecycle(trip, "Journey Started", f"Trip journey started with odometer reading {odo.start_odo_reading} KM.")

    def perform_update(self, serializer):
        odo = serializer.save()
        if odo.end_odo_reading:
            trip = odo.trip
            trip.status = 'Completed'
            trip.save(update_fields=['status'])
            update_trip_lifecycle(trip, "Journey Ended", f"Trip journey completed with final odometer reading {odo.end_odo_reading} KM.")

class DashboardStatsView(APIView):
    permission_classes = [IsCustomAuthenticated]

    def get(self, request):
        user = getattr(request, 'custom_user', None)
        if not user:
            return Response({"error": "User not found"}, status=401)
        
        is_admin = user.role.name.lower() == 'admin'
        is_gh_manager = user.role.name.lower() == 'guesthousemanager'
        
        if is_admin or is_gh_manager:
            trips = Trip.objects.all()
            base_expenses = Expense.objects.all()
        else:
            trips = Trip.objects.filter(user=user)
            base_expenses = Expense.objects.filter(trip__user=user)

        total_trips = trips.count()
        in_review = trips.filter(status='Pending').count()
        
        # Count tasks awaiting this user's approval
        pending_action = 0
        is_hr = _is_hr(user)
        is_fin_head = _is_finance_head(user)
        is_fin_exec = _is_finance_executive(user)
        is_finance = is_fin_head or is_fin_exec

        if not is_admin:
            pending_action += Trip.objects.filter(current_approver=user).count()
            pending_action += TravelAdvance.objects.filter(current_approver=user).count()
            pending_action += TravelClaim.objects.filter(current_approver=user).count()
            
            # For Finance, count specific stages they act on
            if is_fin_head:
                pending_action += TravelAdvance.objects.filter(status='PENDING_HEAD').count()
                pending_action += TravelClaim.objects.filter(status='PENDING_HEAD').count()
            elif is_fin_exec:
                money_statuses = ['PENDING_EXECUTIVE', 'REJECTED_BY_HEAD', 'PENDING_FINAL_RELEASE']
                pending_action += TravelAdvance.objects.filter(status__in=money_statuses).count()
                pending_action += TravelClaim.objects.filter(status__in=money_statuses).count()
            elif is_hr:
                pending_action += Trip.objects.filter(status='Manager Approved').count()
            elif is_gh_manager:
                # For GH Manager, count trips that need room booking
                pending_action += Trip.objects.filter(
                    accommodation_requests__contains='Request for Room',
                    status__in=['Manager Approved', 'Approved']
                ).exclude(room_bookings__isnull=False).distinct().count()
        
        total_expenses = float(base_expenses.aggregate(Sum('amount'))['amount__sum'] or 0)
        
        approved_expenses = float(base_expenses.filter(
            trip__claim__status__in=['Approved', 'Paid']
        ).aggregate(Sum('amount'))['amount__sum'] or 0)
        
        categories = base_expenses.values('category').annotate(total=Sum('amount'))
        
        recent_trips = trips.order_by('-created_at')[:5]
        recent_data = [{
            "id": t.trip_id,
            "title": f"Trip to {t.destination}",
            "subtitle": f"{t.user_name or t.user.employee_id} - {t.purpose}" if (is_admin or is_gh_manager) and t.user else t.purpose,
            "status": t.status,
            "amount": t.cost_estimate
        } for t in recent_trips]

        kpis = [
            { "title": 'Total Trips', "value": str(total_trips), "label": 'Managed trips' if is_admin or is_finance or is_gh_manager else 'Your trips', "icon": 'Briefcase', "color": 'orange' },
            { "title": 'Approved Expenses', "value": f"₹{approved_expenses:,.0f}", "label": 'Finalized' if is_finance else 'Confirmed', "icon": 'CreditCard', "color": 'red' },
            { "title": 'Total Spend' if not is_finance else 'Total Disbursements', "value": f"₹{total_expenses:,.0f}", "label": 'Recorded', "icon": 'TrendingUp', "color": 'magenta' },
            { 
                "title": 'Action Required' if pending_action > 0 else 'In Review', 
                "value": str(pending_action if pending_action > 0 else in_review), 
                "label": 'Pending your action' if pending_action > 0 else 'Pending trips', 
                "icon": 'Clock', 
                "color": 'yellow' 
            }
        ]

        if is_finance:
            # Shift to vibrant functional colors (strictly within supported index.css classes)
            kpis[0]['color'] = 'orange'
            kpis[1]['color'] = 'magenta'
            kpis[1]['title'] = 'Net Payouts'
            kpis[2]['color'] = 'red'

        return Response({
            "kpis": kpis,
            "recent_activity": recent_data,
            "is_finance_hub": is_finance,
            "expenditure_mix": [
                { 
                    "type": dict(Expense.CATEGORY_CHOICES).get(cat['category'], cat['category']), 
                    "amount": float(cat['total'] or 0), 
                    "percentage": (float(cat['total'] or 0) / total_expenses * 100) if total_expenses > 0 else 0 
                }
                for cat in categories
            ],
            "total_spend": total_expenses
        })

class TripSettlementView(APIView):
    permission_classes = [IsCustomAuthenticated]

    def get(self, request):
        user = getattr(request, 'custom_user', None)
        trip_id_enc = request.query_params.get('trip_id')
        
        if not trip_id_enc:
            # If no trip_id provided, return all trips that are ready for settlement
            # (i.e. trips with approved claims that aren't PAID/COMPLETED yet)
            # For simplicity, returning a list of all trips the user can see for now
            # but we filter for finance if they are finance
            is_finance = _is_finance_executive(user) or _is_finance_head(user)
            if is_finance:
                trips = Trip.objects.filter(status__in=['Claim Submitted', 'Manager Approved', 'Approved'])
            else:
                trips = Trip.objects.filter(user=user)
            
            data = []
            for t in trips:
                advances = TravelAdvance.objects.filter(trip=t, status='COMPLETED').aggregate(Sum('requested_amount'))['requested_amount__sum'] or 0
                claim_amt = 0
                if hasattr(t, 'claim'):
                    claim_amt = t.claim.total_amount
                
                data.append({
                    "trip_id": t.trip_id,
                    "destination": t.destination,
                    "employee": t.user.name if t.user else "Unknown",
                    "advance": float(advances),
                    "claim": float(claim_amt),
                    "balance": float(claim_amt - advances),
                    "status": t.status
                })
            return Response(data)

        trip_id = decode_id(trip_id_enc)
        try:
            trip = Trip.objects.get(trip_id=trip_id)
        except Trip.DoesNotExist:
            return Response({"error": "Trip not found"}, status=404)

        advances_list = TravelAdvance.objects.filter(trip=trip).order_at = ['created_at']
        total_advance = sum(a.requested_amount for a in advances_list if a.status == 'COMPLETED')
        
        claim_amt = 0
        claim_id = None
        claim_date = None
        if hasattr(trip, 'claim'):
            claim_amt = trip.claim.total_amount
            claim_id = f"CLAIM-{trip.claim.id}"
            claim_date = trip.claim.submitted_at.strftime("%B %d, %Y") if trip.claim.submitted_at else None

        breakdown = []
        for adv in advances_list:
            if adv.status == 'COMPLETED':
                breakdown.append({
                    "id": f"ADV-{adv.id}",
                    "type": "Advance",
                    "description": f"Advance via {adv.payment_mode or 'Bank Transfer'}",
                    "date": adv.payment_date.strftime("%B %d, %Y") if adv.payment_date else adv.created_at.strftime("%B %d, %Y"),
                    "amount": -float(adv.requested_amount),
                    "is_negative": True
                })

        if claim_amt > 0:
            breakdown.append({
                "id": claim_id,
                "type": "Claim",
                "description": f"Expense Claim: {trip.trip_id}",
                "date": claim_date or trip.updated_at.strftime("%B %d, %Y"),
                "amount": float(claim_amt),
                "is_negative": False
            })

        balance = float(claim_amt - total_advance)
        
        return Response({
            "summary": {
                "advance": float(total_advance),
                "claimTotal": float(claim_amt),
                "balance": balance,
                "type": "Payable" if balance > 0 else "Recoverable",
                "status": trip.status
            },
            "breakdown": breakdown,
            "trip": {
                "id": trip.trip_id,
                "destination": trip.destination,
                "employee": trip.user.name if trip.user else "Unknown"
            }
        })

    def post(self, request):
        # Handle Finalize & Settle action
        user = getattr(request, 'custom_user', None)
        trip_id_enc = request.data.get('trip_id')
        if not trip_id_enc:
            return Response({"error": "Trip ID required"}, status=400)
            
        trip_id = decode_id(trip_id_enc)
        try:
            trip = Trip.objects.get(trip_id=trip_id)
        except Trip.DoesNotExist:
            return Response({"error": "Trip not found"}, status=404)

        # Logic to finalize
        trip.status = 'Settled'
        trip.save()
        
        if hasattr(trip, 'claim'):
            trip.claim.status = 'Paid'
            trip.claim.save()

        update_trip_lifecycle(trip, "Final Settlement", f"Accounts settled and closed by {user.name}.")
        
        return Response({"message": "Trip account successfully settled."})

class CFOWarRoomView(APIView):
    permission_classes = [IsCustomAuthenticated]

    def get(self, request):
        now = timezone.now()
        first_day_of_current_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        
        # 1. Monthly Total Spend
        monthly_spend = Expense.objects.filter(date__gte=first_day_of_current_month.date()).aggregate(Sum('amount'))['amount__sum'] or 0
        
        # Comparison with last month
        last_month_end = first_day_of_current_month - timezone.timedelta(seconds=1)
        last_month_start = last_month_end.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        last_month_spend = Expense.objects.filter(date__gte=last_month_start.date(), date__lte=last_month_end.date()).aggregate(Sum('amount'))['amount__sum'] or 0
        
        percent_change_spend = 0
        if last_month_spend > 0:
            percent_change_spend = ((float(monthly_spend) - float(last_month_spend)) / float(last_month_spend)) * 100
        
        # 2. Avg Cost Per Trip
        total_claims = TravelClaim.objects.aggregate(Sum('total_amount'))['total_amount__sum'] or 0
        total_trips = Trip.objects.count()
        avg_cost = (float(total_claims) / total_trips) if total_trips > 0 else 0
        
        # 3. Guest House Occupancy
        from guest_house.models import Room, RoomBooking
        total_rooms = Room.objects.count()
        # Active bookings today
        active_bookings = RoomBooking.objects.filter(start_date__lte=now, end_date__gte=now).count()
        occupancy = (active_bookings / total_rooms * 100) if total_rooms > 0 else 0
        
        # 4. Policy Overrides/Disputes
        # Using Category 'Policy' in Dispute as a proxy for overrides
        policy_issues = Dispute.objects.filter(category='Policy').count()
        policy_rate = (policy_issues / total_trips * 100) if total_trips > 0 else 0

        # KPI Stats Construction
        stats = [
            { 
                "title": 'Total Spend (Monthly)', 
                "value": f"₹{monthly_spend:,.0f}", 
                "change": f"{abs(percent_change_spend):.1f}%", 
                "trend": 'up' if percent_change_spend >= 0 else 'down',
                "icon": 'IndianRupee'
            },
            { 
                "title": 'Avg Cost per Trip', 
                "value": f"₹{avg_cost:,.0f}", 
                "change": '+2.4%', # Placeholder for complexity
                "trend": 'up', 
                "icon": 'TrendingUp' 
            },
            { 
                "title": 'Guest House Occupancy', 
                "value": f"{occupancy:.1f}%", 
                "change": '+1.8%', 
                "trend": 'up', 
                "icon": 'Building2' 
            },
            { 
                "title": 'Policy Overrides', 
                "value": f"{policy_rate:.1f}%", 
                "change": '-0.2%', 
                "trend": 'down', 
                "icon": 'AlertCircle' 
            },
        ]

        # 5. Spend by Department
        dept_raw = Expense.objects.values('trip__user_department').annotate(total=Sum('amount')).order_by('-total')
        spend_by_dept = [
            { "name": d['trip__user_department'] or "Unknown", "value": float(d['total']) }
            for d in dept_raw
        ]

        # 6. Advance Aging
        advances = TravelAdvance.objects.exclude(status='COMPLETED')
        aging_buckets = { "0-30": 0, "31-60": 0, "60+": 0 }
        for adv in advances:
            days = (now - adv.created_at).days
            amt = float(adv.requested_amount)
            if days <= 30: aging_buckets["0-30"] += amt
            elif days <= 60: aging_buckets["31-60"] += amt
            else: aging_buckets["60+"] += amt
            
        aging_data = [
            { "range": '0-30 Days', "amount": aging_buckets["0-30"], "color": 'success' },
            { "range": '31-60 Days', "amount": aging_buckets["31-60"], "color": 'warning' },
            { "range": '60+ Days', "amount": aging_buckets["60+"], "color": 'danger' },
        ]

        # 7. Critical Anomalies
        anomalies = [
            { "entity": "Logistics Surge", "reason": "Local Conveyance in Metro areas up by 40%", "impact": "High", "action": "Review" },
            { "entity": "Dept Override", "reason": "Bulk travel booking policy bypassed in IT dept", "impact": "Medium", "action": "Investigate" }
        ]

        return Response({
            "stats": stats,
            "report_month": now.strftime("%B %Y"),
            "spend_by_dept": spend_by_dept,
            "aging": aging_data,
            "anomalies": anomalies
        })
