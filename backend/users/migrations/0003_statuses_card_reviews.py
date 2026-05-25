# Generated migration for order statuses, reviews text, saved cards, return uniqueness

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


def migrate_order_statuses(apps, schema_editor):
    Order = apps.get_model('users', 'Order')
    for order in Order.objects.all():
        old = order.status
        if old == 'pending':
            order.status = 'placed'
        elif old == 'shipping':
            order.status = 'in_delivery' if order.delivery_type == 'courier' else 'assembling'
        elif old == 'delivered':
            order.status = 'delivered' if order.delivery_type == 'courier' else 'received'
        elif old == 'cancelled':
            order.status = 'cancelled'
        else:
            order.status = 'placed'
        if order.delivery_type == 'pickup' and order.delivery_method:
            if 'пункт' in order.delivery_method.lower() or 'от продавца' in order.delivery_method.lower():
                order.delivery_method = 'Самовывоз у продавца'
        order.save(update_fields=['status', 'delivery_method'])


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0002_order_extended_reviews_returns'),
    ]

    operations = [
        migrations.AddField(
            model_name='order',
            name='cancellation_reason',
            field=models.TextField(blank=True, default=''),
        ),
        migrations.AddField(
            model_name='productreview',
            name='text',
            field=models.TextField(blank=True, default=''),
        ),
        migrations.CreateModel(
            name='SavedPaymentCard',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('last_four', models.CharField(max_length=4)),
                ('holder_name', models.CharField(max_length=100)),
                ('exp_month', models.CharField(max_length=2)),
                ('exp_year', models.CharField(max_length=4)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('user', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='saved_card', to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.AlterField(
            model_name='order',
            name='status',
            field=models.CharField(
                choices=[
                    ('placed', 'Оформлен'),
                    ('assembling', 'Собирается'),
                    ('awaiting_shipment', 'Ожидает отправки'),
                    ('in_delivery', 'В службе доставки'),
                    ('delivered', 'Доставлен'),
                    ('awaiting_seller', 'Ожидает у продавца'),
                    ('received', 'Получен'),
                    ('cancelled', 'Отменён'),
                ],
                default='placed',
                max_length=30,
            ),
        ),
        migrations.AlterField(
            model_name='order',
            name='delivery_type',
            field=models.CharField(
                choices=[('pickup', 'Самовывоз у продавца'), ('courier', 'Доставка курьером')],
                default='pickup',
                max_length=20,
            ),
        ),
        migrations.RunPython(migrate_order_statuses, migrations.RunPython.noop),
        migrations.AlterUniqueTogether(
            name='returnrequestitem',
            unique_together={('order_item',)},
        ),
    ]
