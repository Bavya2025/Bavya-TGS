import json
from django.db.models.signals import pre_save, post_save, post_delete
from django.dispatch import receiver
from django.forms.models import model_to_dict
from django.core.serializers.json import DjangoJSONEncoder
from .models import Trip, TripOdometer, Expense, TravelClaim, TravelAdvance
from core.models import AuditLog, LoginHistory
from core.middleware import get_current_user


def serialize_instance(instance):
    data = model_to_dict(instance)
    return data

@receiver(pre_save, sender=Trip)
@receiver(pre_save, sender=TripOdometer)
@receiver(pre_save, sender=Expense)
@receiver(pre_save, sender=TravelClaim)
@receiver(pre_save, sender=TravelAdvance)
def capture_old_state(sender, instance, **kwargs):
    if instance.pk:
        try:
            old_instance = sender.objects.get(pk=instance.pk)
            instance._old_state = serialize_instance(old_instance)
        except sender.DoesNotExist:
            instance._old_state = {}
    else:
        instance._old_state = {}

@receiver(post_save, sender=Trip)
@receiver(post_save, sender=TripOdometer)
@receiver(post_save, sender=Expense)
@receiver(post_save, sender=TravelClaim)
@receiver(post_save, sender=TravelAdvance)
def log_model_changes(sender, instance, created, **kwargs):
    user = get_current_user()
    
    action = 'CREATE' if created else 'UPDATE'
    if not created and getattr(instance, 'is_deleted', False) and not instance._old_state.get('is_deleted', False):
        action = 'DELETE' 
    
    changes = {}
    if not created:
        new_state = serialize_instance(instance)
        old_state = getattr(instance, '_old_state', {})
        
        for key, value in new_state.items():
            if key not in old_state or old_state[key] != value:
                changes[key] = {'old': old_state.get(key), 'new': value}
    else:
        changes = serialize_instance(instance)

    if not changes and action == 'UPDATE':
        return 

    import inspect
    
    AuditLog.objects.create(
        user=user, 
        action=action,
        model_name=sender.__name__,
        object_id=str(instance.pk),
        object_repr=str(instance),
        details=json.loads(json.dumps(changes, cls=DjangoJSONEncoder)),
        ip_address=None 
    )

@receiver(post_delete, sender=Trip)
@receiver(post_delete, sender=TripOdometer)
@receiver(post_delete, sender=Expense)
@receiver(post_delete, sender=TravelClaim)
@receiver(post_delete, sender=TravelAdvance)
def log_hard_delete(sender, instance, **kwargs):
    AuditLog.objects.create(
        user=None,
        action='HARD_DELETE',
        model_name=sender.__name__,
        object_id=str(instance.pk),
        object_repr=str(instance),
        details=json.loads(json.dumps(serialize_instance(instance), cls=DjangoJSONEncoder))
    )
