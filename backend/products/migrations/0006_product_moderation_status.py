from django.db import migrations, models
from django.utils import timezone


def publish_existing_products(apps, schema_editor):
    Product = apps.get_model('products', 'Product')
    Product.objects.all().update(status='published', submitted_at=timezone.now())


class Migration(migrations.Migration):

    dependencies = [
        ('products', '0005_productimage'),
    ]

    operations = [
        migrations.AddField(
            model_name='product',
            name='status',
            field=models.CharField(
                choices=[
                    ('created', 'Создан'),
                    ('pending', 'На рассмотрении'),
                    ('published', 'Опубликован'),
                    ('rejected', 'Отклонён'),
                    ('removed', 'Удалён'),
                ],
                default='pending',
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name='product',
            name='status_reason',
            field=models.TextField(blank=True, default=''),
        ),
        migrations.AddField(
            model_name='product',
            name='submitted_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='product',
            name='moderated_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.RunPython(publish_existing_products, migrations.RunPython.noop),
    ]
