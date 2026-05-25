from django.core.management.base import BaseCommand
from django.db.models import Avg

from products.models import Product
from users.models import ProductReview


class Command(BaseCommand):
    def handle(self, *args, **options):
        for product in Product.objects.all():
            qs = ProductReview.objects.filter(product=product, status='published')
            product.reviews_count = qs.count()
            avg = qs.aggregate(avg=Avg('rating'))['avg']
            product.rating = round(float(avg), 1) if avg is not None else 0
            product.save(update_fields=['reviews_count', 'rating'])
        self.stdout.write(self.style.SUCCESS('Рейтинги обновлены'))
