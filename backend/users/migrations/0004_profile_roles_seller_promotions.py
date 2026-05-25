import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


def migrate_delivered_to_received(apps, schema_editor):
    Order = apps.get_model('users', 'Order')
    Order.objects.filter(status='delivered').update(status='received')


class Migration(migrations.Migration):

    dependencies = [
        ('products', '0004_product_seller'),
        ('users', '0003_statuses_card_reviews'),
    ]

    operations = [
        migrations.AddField(
            model_name='userprofile',
            name='role',
            field=models.CharField(
                choices=[('user', 'Покупатель'), ('seller', 'Продавец'), ('admin', 'Администратор')],
                default='user',
                max_length=10,
            ),
        ),
        migrations.AddField(
            model_name='userprofile',
            name='birth_date',
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='userprofile',
            name='gender',
            field=models.CharField(blank=True, default='', max_length=10),
        ),
        migrations.AddField(
            model_name='userprofile',
            name='patronymic',
            field=models.CharField(blank=True, default='', max_length=100),
        ),
        migrations.AddField(
            model_name='userprofile',
            name='business_form',
            field=models.CharField(blank=True, default='', max_length=30),
        ),
        migrations.AddField(
            model_name='userprofile',
            name='inn',
            field=models.CharField(blank=True, default='', max_length=12),
        ),
        migrations.CreateModel(
            name='Promotion',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('title', models.CharField(max_length=200)),
                ('promo_code', models.CharField(max_length=50, unique=True)),
                ('discount_percent', models.DecimalField(blank=True, decimal_places=2, max_digits=5, null=True)),
                ('discount_amount', models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True)),
                ('starts_at', models.DateField(blank=True, null=True)),
                ('ends_at', models.DateField(blank=True, null=True)),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                (
                    'seller',
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name='promotions',
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
        ),
        migrations.RunPython(migrate_delivered_to_received, migrations.RunPython.noop),
        migrations.AlterField(
            model_name='order',
            name='status',
            field=models.CharField(
                choices=[
                    ('placed', 'Оформлен'),
                    ('assembling', 'Собирается'),
                    ('awaiting_shipment', 'Ожидает отправки'),
                    ('in_delivery', 'В службе доставки'),
                    ('awaiting_seller', 'Ожидает у продавца'),
                    ('received', 'Получен'),
                    ('cancelled', 'Отменён'),
                ],
                default='placed',
                max_length=30,
            ),
        ),
    ]
