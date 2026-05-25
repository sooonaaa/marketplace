from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('products', '0004_product_seller'),
        ('users', '0004_profile_roles_seller_promotions'),
    ]

    operations = [
        migrations.AddField(
            model_name='promotion',
            name='promotion_type',
            field=models.CharField(
                choices=[
                    ('bogo_1_2', 'Акция 1 = 2'),
                    ('bogo_2_3', 'Акция 2 = 3'),
                    ('discount', 'Скидка на товар'),
                    ('promo_code', 'Промокод'),
                ],
                default='discount',
                max_length=20,
            ),
        ),
        migrations.AlterField(
            model_name='promotion',
            name='promo_code',
            field=models.CharField(blank=True, default='', max_length=50),
        ),
        migrations.AddField(
            model_name='promotion',
            name='products',
            field=models.ManyToManyField(blank=True, related_name='promotions', to='products.product'),
        ),
    ]
