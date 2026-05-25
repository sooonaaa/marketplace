from django.db import models

class Category(models.Model):
    id = models.CharField(max_length=50, primary_key=True)
    name = models.CharField(max_length=100)
    icon = models.CharField(max_length=10)

    def __str__(self):
        return self.name

class Product(models.Model):
    STATUS_CHOICES = [
        ('created', 'Создан'),
        ('pending', 'На рассмотрении'),
        ('published', 'Опубликован'),
        ('rejected', 'Отклонён'),
        ('removed', 'Удалён'),
    ]

    title = models.CharField(max_length=255)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    old_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    category = models.ForeignKey(Category, on_delete=models.CASCADE, related_name='products')
    seller = models.ForeignKey(
        'auth.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='seller_products',
    )
    rating = models.FloatField(default=0)
    reviews_count = models.IntegerField(default=0)
    manufacturer = models.CharField(max_length=255)
    city = models.CharField(max_length=100)
    image = models.ImageField(upload_to='products/', blank=True, null=True)
    is_local_verified = models.BooleanField(default=False)
    description = models.TextField(blank=True, default='')
    specs = models.JSONField(blank=True, default=list)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    status_reason = models.TextField(blank=True, default='')
    submitted_at = models.DateTimeField(null=True, blank=True)
    moderated_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return self.title


class ProductImage(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='gallery')
    image = models.ImageField(upload_to='products/gallery/')
    sort_order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ['sort_order', 'id']

    def __str__(self):
        return f'Image {self.pk} for {self.product_id}'
