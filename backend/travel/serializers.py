from rest_framework import serializers
from .models import (
    Trip, TripOdometer, Expense, TravelClaim, TravelAdvance, Dispute, PolicyDocument, BulkActivityBatch, JobReport,
    TravelModeMaster, BookingTypeMaster, AirlineMaster, BusTypeMaster, IntercityCabVehicleMaster, TravelProviderMaster,
    LocalTravelModeMaster, LocalProviderMaster,
    StayTypeMaster, RoomTypeMaster, MealCategoryMaster, MealTypeMaster, IncidentalTypeMaster,
    CustomMasterDefinition, CustomMasterValue, MasterModule, TripTracking,
    TravelOperatorMaster, TravelClassMaster, TravelVehicleMaster, LocalSubTypeMaster
)
from api_management.utils import encrypt_key, decrypt_key

# --- MASTER SERIALIZERS ---

class TripTrackingSerializer(serializers.ModelSerializer):
    class Meta:
        model = TripTracking
        fields = ['id', 'trip', 'latitude', 'longitude', 'timestamp', 'accuracy', 'speed']

class TravelModeMasterSerializer(serializers.ModelSerializer):
    class Meta:
        model = TravelModeMaster
        fields = '__all__'

class BookingTypeMasterSerializer(serializers.ModelSerializer):
    class Meta:
        model = BookingTypeMaster
        fields = '__all__'

class AirlineMasterSerializer(serializers.ModelSerializer):
    class Meta:
        model = AirlineMaster
        fields = '__all__'


class BusTypeMasterSerializer(serializers.ModelSerializer):
    class Meta:
        model = BusTypeMaster
        fields = '__all__'

class IntercityCabVehicleMasterSerializer(serializers.ModelSerializer):
    class Meta:
        model = IntercityCabVehicleMaster
        fields = '__all__'

class TravelProviderMasterSerializer(serializers.ModelSerializer):
    class Meta:
        model = TravelProviderMaster
        fields = '__all__'


class LocalTravelModeMasterSerializer(serializers.ModelSerializer):
    class Meta:
        model = LocalTravelModeMaster
        fields = '__all__'

class LocalSubTypeMasterSerializer(serializers.ModelSerializer):
    class Meta:
        model = LocalSubTypeMaster
        fields = '__all__'

class TravelOperatorMasterSerializer(serializers.ModelSerializer):
    class Meta:
        model = TravelOperatorMaster
        fields = '__all__'

class TravelClassMasterSerializer(serializers.ModelSerializer):
    class Meta:
        model = TravelClassMaster
        fields = '__all__'

class TravelVehicleMasterSerializer(serializers.ModelSerializer):
    class Meta:
        model = TravelVehicleMaster
        fields = '__all__'


class LocalProviderMasterSerializer(serializers.ModelSerializer):
    class Meta:
        model = LocalProviderMaster
        fields = '__all__'

class StayTypeMasterSerializer(serializers.ModelSerializer):
    class Meta:
        model = StayTypeMaster
        fields = '__all__'

class RoomTypeMasterSerializer(serializers.ModelSerializer):
    class Meta:
        model = RoomTypeMaster
        fields = '__all__'

class MealCategoryMasterSerializer(serializers.ModelSerializer):
    class Meta:
        model = MealCategoryMaster
        fields = '__all__'

class MealTypeMasterSerializer(serializers.ModelSerializer):
    class Meta:
        model = MealTypeMaster
        fields = '__all__'

from rest_framework.validators import UniqueValidator

class IncidentalTypeMasterSerializer(serializers.ModelSerializer):
    expense_type = serializers.CharField(validators=[UniqueValidator(queryset=IncidentalTypeMaster.all_objects.all(), message="This Expense Type already exists.")])
    class Meta:
        model = IncidentalTypeMaster
        fields = '__all__'

class MasterModuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = MasterModule
        fields = '__all__'

class CustomMasterDefinitionSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomMasterDefinition
        fields = '__all__'

class CustomMasterValueSerializer(serializers.ModelSerializer):
    def validate(self, attrs):
        definition = attrs.get('definition') or getattr(self.instance, 'definition', None)
        raw_name = attrs.get('name', getattr(self.instance, 'name', ''))
        name = raw_name.strip() if isinstance(raw_name, str) else raw_name

        if not definition or not name:
            return attrs

        attrs['name'] = name
        existing_qs = CustomMasterValue.all_objects.filter(definition=definition, name=name)
        if self.instance:
            existing_qs = existing_qs.exclude(pk=self.instance.pk)

        active_match = existing_qs.filter(is_deleted=False).first()
        if active_match:
            raise serializers.ValidationError({
                'name': 'This value already exists in the selected master table.'
            })

        deleted_match = existing_qs.filter(is_deleted=True).first()
        if deleted_match and not self.instance:
            attrs['_restore_existing'] = deleted_match

        return attrs

    def create(self, validated_data):
        restore_existing = validated_data.pop('_restore_existing', None)
        if restore_existing:
            restore_existing.name = validated_data.get('name', restore_existing.name)
            restore_existing.code = validated_data.get('code', restore_existing.code)
            restore_existing.status = validated_data.get('status', restore_existing.status)
            restore_existing.is_deleted = False
            restore_existing.deleted_at = None
            restore_existing.save()
            return restore_existing

        return super().create(validated_data)

    class Meta:
        model = CustomMasterValue
        fields = '__all__'
        validators = []

# --- CORE SERIALIZERS ---

class PolicyDocumentSerializer(serializers.ModelSerializer):
    uploaded_by_name = serializers.ReadOnlyField(source='uploaded_by.name')

    class Meta:
        model = PolicyDocument
        fields = [
            'id', 'title', 'category', 'uploaded_by', 'uploaded_by_name', 'created_at', 'updated_at',
            'file_name_en', 'file_size_en',
            'file_name_te', 'file_size_te',
            'file_name_hi', 'file_size_hi',
            'file_content_en', 'file_content_te', 'file_content_hi'
        ]
        extra_kwargs = {
            'file_content_en': {'write_only': True},
            'file_content_te': {'write_only': True},
            'file_content_hi': {'write_only': True}
        }

class PolicyDocumentDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = PolicyDocument
        fields = '__all__'

class TripOdometerSerializer(serializers.ModelSerializer):
    class Meta:
        model = TripOdometer
        fields = [
            'id', 'trip', 'start_odo_reading', 'start_odo_image', 'start_odo_lat', 'start_odo_long',
            'end_odo_reading', 'end_odo_image', 'end_odo_lat', 'end_odo_long',
            'updated_at'
        ]

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        if representation.get('start_odo_image'):
            representation['start_odo_image'] = decrypt_key(representation['start_odo_image'])
        if representation.get('end_odo_image'):
            representation['end_odo_image'] = decrypt_key(representation['end_odo_image'])
        return representation

    def to_internal_value(self, data):
        if data.get('start_odo_image'):
            data['start_odo_image'] = encrypt_key(data['start_odo_image'])
        if data.get('end_odo_image'):
            data['end_odo_image'] = encrypt_key(data['end_odo_image'])
        return super().to_internal_value(data)

class ExpenseSerializer(serializers.ModelSerializer):
    user_name = serializers.ReadOnlyField(source='trip.user_name')
    trip_user_id = serializers.ReadOnlyField(source='trip.user.employee_id')

    class Meta:
        model = Expense
        fields = '__all__'

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        if representation.get('receipt_image'):
            representation['receipt_image'] = decrypt_key(representation['receipt_image'])
        return representation

    def to_internal_value(self, data):
        if data.get('receipt_image'):
            data['receipt_image'] = encrypt_key(data['receipt_image'])
        return super().to_internal_value(data)

class TravelClaimSerializer(serializers.ModelSerializer):
    expenses = ExpenseSerializer(many=True, read_only=True, source='trip.expenses')
    
    user_name = serializers.SerializerMethodField()
    reporting_manager_name = serializers.SerializerMethodField()
    processed_by_name = serializers.CharField(source='processed_by.name', read_only=True)

    class Meta:
        model = TravelClaim
        fields = [
            'id', 'trip', 'total_amount', 'approved_amount', 'status', 'expenses', 'user_name',
            'current_approver', 'hierarchy_level', 'submitted_at', 'remarks',
            'payment_mode', 'transaction_id', 'receipt_file', 'payment_date',
            'processed_by', 'processed_by_name', 'finance_remarks',
            'reporting_manager_name', 'senior_manager_name', 'hod_director_name'
        ]
        read_only_fields = ['submitted_at', 'processed_by']

    def get_user_name(self, obj):
        # Priority: 1. Claim Snapshot, 2. Trip Snapshot, 3. API Fallback
        if obj.user_name: return obj.user_name
        if obj.trip and obj.trip.user_name: return obj.trip.user_name
        return obj.trip.user.name if obj.trip and obj.trip.user else 'Unknown User'

    def get_reporting_manager_name(self, obj):
        # Priority: 1. Claim Snapshot, 2. Trip Snapshot, 3. API Fallback
        if obj.reporting_manager_name: return obj.reporting_manager_name
        if obj.trip and obj.trip.reporting_manager_name: return obj.trip.reporting_manager_name
        return obj.trip.user.reporting_manager.name if obj.trip and obj.trip.user and obj.trip.user.reporting_manager else None

class TravelAdvanceSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()
    reporting_manager_name = serializers.SerializerMethodField()

    class Meta:
        model = TravelAdvance
        fields = '__all__'

    def get_user_name(self, obj):
        # Priority: 1. Advance Snapshot, 2. Trip Snapshot, 3. API Fallback
        if obj.user_name: return obj.user_name
        if obj.trip and obj.trip.user_name: return obj.trip.user_name
        return obj.trip.user.name if obj.trip and obj.trip.user else 'Unknown User'

    def get_reporting_manager_name(self, obj):
        # Priority: 1. Advance Snapshot, 2. Trip Snapshot, 3. API Fallback
        if obj.reporting_manager_name: return obj.reporting_manager_name
        if obj.trip and obj.trip.reporting_manager_name: return obj.trip.reporting_manager_name
        return obj.trip.user.reporting_manager.name if obj.trip and obj.trip.user and obj.trip.user.reporting_manager else None

class DisputeSerializer(serializers.ModelSerializer):
    trip_id_display = serializers.CharField(source='trip.trip_id', read_only=True)
    raised_by_name = serializers.ReadOnlyField(source='raised_by.name')
    expense_category = serializers.CharField(source='expense.category', read_only=True)

    class Meta:
        model = Dispute
        fields = ['id', 'trip', 'trip_id_display', 'expense', 'expense_category', 'raised_by', 'raised_by_name', 'category', 'reason', 'status', 'admin_comment', 'created_at', 'updated_at']
        read_only_fields = ['raised_by', 'status', 'admin_comment', 'created_at', 'updated_at', 'expense_category']

class JobReportSerializer(serializers.ModelSerializer):
    user_name = serializers.ReadOnlyField(source='user.name')

    class Meta:
        model = JobReport
        fields = '__all__'

class BulkActivityBatchSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()
    reporting_manager_name = serializers.SerializerMethodField()
    trip_id_display = serializers.CharField(source='trip.trip_id', read_only=True)

    class Meta:
        model = BulkActivityBatch
        fields = '__all__'

    def get_user_name(self, obj):
        return obj.user.name if obj.user else 'Unknown'

    def get_reporting_manager_name(self, obj):
        return obj.user.reporting_manager.name if obj.user and obj.user.reporting_manager else 'N/A'

class TripSerializer(serializers.ModelSerializer):
    advances = TravelAdvanceSerializer(many=True, read_only=True)
    expenses = ExpenseSerializer(many=True, read_only=True)
    odometer = TripOdometerSerializer(read_only=True, source='odometer_details')
    reporting_manager_name = serializers.SerializerMethodField()
    user_name = serializers.SerializerMethodField()
    user_emp_id = serializers.ReadOnlyField(source='user.employee_id')
    claim = TravelClaimSerializer(read_only=True)
    total_approved_advance = serializers.SerializerMethodField()
    total_expenses = serializers.SerializerMethodField()
    wallet_balance = serializers.SerializerMethodField()
    user_bank_name = serializers.ReadOnlyField(source='user.bank_name')
    user_account_no = serializers.ReadOnlyField(source='user.account_no')
    user_ifsc_code = serializers.ReadOnlyField(source='user.ifsc_code')
    user_base_location = serializers.ReadOnlyField(source='user.base_location')
    route_path_name = serializers.ReadOnlyField(source='route_path.path_name')

    has_gh_booking = serializers.SerializerMethodField()
    has_vehicle_booking = serializers.SerializerMethodField()
    job_reports = JobReportSerializer(many=True, read_only=True)
    activity_batches = BulkActivityBatchSerializer(many=True, read_only=True)

    class Meta:
        model = Trip
        fields = [
            'trip_id', 'user', 'user_name', 'user_emp_id', 'user_bank_name', 'user_account_no', 'user_ifsc_code', 'user_base_location',
            'purpose', 'destination', 'start_date', 'end_date',
            'status', 'cost_estimate', 'source', 'travel_mode', 'composition',
            'trip_leader', 'en_route', 'route_path', 'route_path_name', 'project_code', 'consider_as_local', 'accommodation_requests',
            'vehicle_type', 'members', 'lifecycle_events', 'created_at', 'updated_at',
            'advances', 'expenses', 'odometer', 'claim', 'reporting_manager_name',
            'current_approver', 'total_approved_advance', 'total_expenses', 'wallet_balance', 'has_gh_booking', 'has_vehicle_booking',
            'rejection_reason', 'rejected_by', 'fuel_rate_snapshot', 'job_reports', 'activity_batches'
        ]
    def get_user_name(self, obj):
        # Use snapshot if available, otherwise fallback to dynamic property
        return obj.user_name or (obj.user.name if obj.user else 'Unknown User')

    def get_reporting_manager_name(self, obj):
        # Use snapshot if available, otherwise fallback to dynamic property
        return obj.reporting_manager_name or (obj.user.reporting_manager.name if obj.user and obj.user.reporting_manager else None)

    def get_total_approved_advance(self, obj):
        return sum(
            (float(a.executive_approved_amount) if float(a.executive_approved_amount) > 0 else float(a.requested_amount))
            for a in obj.advances.filter(status__in=['Paid', 'Transferred', 'COMPLETED'])
        )

    def get_total_expenses(self, obj):
        return float(sum(e.amount for e in obj.expenses.all()))

    def get_wallet_balance(self, obj):
        return float(self.get_total_approved_advance(obj)) - float(self.get_total_expenses(obj))

    def get_has_gh_booking(self, obj):
        return obj.room_bookings.exists()
    
    def get_has_vehicle_booking(self, obj):
        return obj.vehicle_bookings.exists()

    def validate(self, attrs):
        source = attrs.get('source')
        destination = attrs.get('destination')
        
        is_local = attrs.get('consider_as_local', False)
        
        if not is_local and source and destination and str(source).strip().lower() == str(destination).strip().lower():
            raise serializers.ValidationError({
                "to": "Source and Destination cannot be the same.",
                "from": "Source and Destination cannot be the same."
            })
            
        return attrs


from core.models import LoginHistory, AuditLog

class LoginHistorySerializer(serializers.ModelSerializer):
    user_name = serializers.ReadOnlyField(source='user.name')
    user_email = serializers.ReadOnlyField(source='user.email')

    class Meta:
        model = LoginHistory
        fields = ['id', 'user', 'user_name', 'user_email', 'login_time', 'logout_time', 'ip_address', 'user_agent']

class AuditLogSerializer(serializers.ModelSerializer):
    user_name = serializers.ReadOnlyField(source='user.name')

    class Meta:
        model = AuditLog
        fields = ['id', 'user', 'user_name', 'action', 'model_name', 'object_id', 'object_repr', 'timestamp', 'details', 'ip_address']
