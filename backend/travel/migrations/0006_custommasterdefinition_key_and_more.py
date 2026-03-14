from django.db import migrations, models
from django.utils.text import slugify


def populate_definition_keys(apps, schema_editor):
    CustomMasterDefinition = apps.get_model('travel', 'CustomMasterDefinition')
    used_keys = set(
        CustomMasterDefinition.objects.exclude(key__isnull=True).exclude(key='').values_list('key', flat=True)
    )

    for definition in CustomMasterDefinition.objects.all().order_by('id'):
        if definition.key:
            continue

        base_key = slugify(definition.table_name).replace('-', '_') or f"master_{definition.id}"
        candidate = base_key
        suffix = 2
        while candidate in used_keys:
            candidate = f"{base_key}_{suffix}"
            suffix += 1

        definition.key = candidate
        definition.save(update_fields=['key'])
        used_keys.add(candidate)


class Migration(migrations.Migration):

    dependencies = [
        ('travel', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='custommasterdefinition',
            name='api_endpoint',
            field=models.CharField(blank=True, max_length=255, null=True),
        ),
        migrations.AddField(
            model_name='custommasterdefinition',
            name='fields_list',
            field=models.TextField(default='name,code'),
        ),
        migrations.AddField(
            model_name='custommasterdefinition',
            name='key',
            field=models.CharField(blank=True, max_length=100, null=True, unique=True),
        ),
        migrations.AddField(
            model_name='custommasterdefinition',
            name='module',
            field=models.CharField(blank=True, max_length=50, null=True),
        ),
        migrations.AddField(
            model_name='custommastervalue',
            name='extra_data',
            field=models.JSONField(blank=True, default=dict),
        ),
        migrations.RunPython(populate_definition_keys, migrations.RunPython.noop),
    ]
