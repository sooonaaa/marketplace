from datetime import date, timedelta
from decimal import Decimal

from django.contrib.auth.models import User
from django.core.management.base import BaseCommand

from products.models import Product
from users.models import Order, OrderItem


class Command(BaseCommand):
    help = 'Создаёт демо-заказы для первого пользователя в БД'

    def handle(self, *args, **options):
        user = User.objects.first()
        if not user:
            self.stdout.write(self.style.WARNING('Нет пользователей. Сначала зарегистрируйтесь.'))
            return

        if Order.objects.filter(user=user).exists():
            self.stdout.write(self.style.SUCCESS('Заказы уже существуют.'))
            return

        products = list(Product.objects.all()[:3])
        if len(products) < 1:
            self.stdout.write(self.style.WARNING('Недостаточно товаров в каталоге.'))
            return

        def image_for(p):
            if p.image:
                return f'http://localhost:8000{p.image.url}'
            return ''

        order1 = Order.objects.create(
            user=user,
            status='delivered',
            total=Decimal('1250'),
            delivery_type='pickup',
            delivery_method='Самовывоз от продавца',
            delivery_address='',
            payment_method='card',
            received_at=date.today() - timedelta(days=3),
        )
        OrderItem.objects.create(
            order=order1,
            product=products[0],
            product_id_snapshot=products[0].id,
            title=products[0].title,
            price=products[0].price,
            quantity=2,
            image_url=image_for(products[0]),
        )
        if len(products) > 1:
            OrderItem.objects.create(
                order=order1,
                product=products[1],
                product_id_snapshot=products[1].id,
                title=products[1].title,
                price=products[1].price,
                quantity=1,
                image_url=image_for(products[1]),
            )

        p2 = products[2] if len(products) > 2 else products[0]
        order2 = Order.objects.create(
            user=user,
            status='shipping',
            total=p2.price,
            delivery_type='courier',
            delivery_method='Доставка курьером',
            delivery_address='г. Чебоксары, ул. К. Маркса, д. 12, кв. 45',
            payment_method='sbp',
            address_city='г. Чебоксары',
            address_street='ул. К. Маркса',
            address_house='12',
            address_flat='45',
            received_at=date.today() + timedelta(days=2),
        )
        OrderItem.objects.create(
            order=order2,
            product=p2,
            product_id_snapshot=p2.id,
            title=p2.title,
            price=p2.price,
            quantity=1,
            image_url=image_for(p2),
        )

        self.stdout.write(self.style.SUCCESS(f'Созданы демо-заказы для {user.email}'))
