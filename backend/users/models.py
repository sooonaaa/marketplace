from django.db import models
from django.contrib.auth.models import User
from products.models import Product


class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    phone = models.CharField(max_length=30, blank=True, default='')
    city = models.CharField(max_length=100, blank=True, default='г. Чебоксары')

    def __str__(self):
        return self.user.email


class Order(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Оформлен'),
        ('shipping', 'В пути'),
        ('delivered', 'Доставлен'),
        ('cancelled', 'Отменён'),
    ]
    DELIVERY_TYPE_CHOICES = [
        ('pickup', 'Самовывоз от продавца'),
        ('courier', 'Доставка курьером'),
    ]
    PAYMENT_CHOICES = [
        ('card', 'Банковская карта'),
        ('sbp', 'СБП'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='orders')
    created_at = models.DateTimeField(auto_now_add=True)
    received_at = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    total = models.DecimalField(max_digits=10, decimal_places=2)
    delivery_type = models.CharField(max_length=20, choices=DELIVERY_TYPE_CHOICES, default='pickup')
    delivery_method = models.CharField(max_length=255)
    delivery_address = models.CharField(max_length=500, blank=True, default='')
    payment_method = models.CharField(max_length=20, choices=PAYMENT_CHOICES, default='card')
    promo_code = models.CharField(max_length=50, blank=True, default='')
    address_city = models.CharField(max_length=100, blank=True, default='')
    address_street = models.CharField(max_length=200, blank=True, default='')
    address_house = models.CharField(max_length=20, blank=True, default='')
    address_flat = models.CharField(max_length=20, blank=True, default='')
    address_intercom = models.CharField(max_length=30, blank=True, default='')
    address_entrance = models.CharField(max_length=10, blank=True, default='')
    address_floor = models.CharField(max_length=10, blank=True, default='')

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'Order #{self.pk} — {self.user.email}'


class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.SET_NULL, null=True, blank=True)
    product_id_snapshot = models.IntegerField(null=True, blank=True)
    title = models.CharField(max_length=255)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    quantity = models.DecimalField(max_digits=10, decimal_places=2, default=1)
    image_url = models.CharField(max_length=500, blank=True, default='')

    def __str__(self):
        return self.title


class ProductReview(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='product_reviews')
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='reviews')
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='reviews')
    rating = models.PositiveSmallIntegerField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [('user', 'product')]

    def __str__(self):
        return f'{self.user.email} — {self.product_id}: {self.rating}'


class ReturnRequest(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='return_requests')
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='return_requests')
    created_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, default='pending')

    def __str__(self):
        return f'Return #{self.pk} for order {self.order_id}'


class ReturnRequestItem(models.Model):
    return_request = models.ForeignKey(ReturnRequest, on_delete=models.CASCADE, related_name='items')
    order_item = models.ForeignKey(OrderItem, on_delete=models.CASCADE, related_name='return_items')
    reason = models.TextField()

    def __str__(self):
        return f'Return item {self.order_item_id}'


class ReturnRequestPhoto(models.Model):
    PHOTO_TYPES = [
        ('product', 'Товар'),
        ('packaging', 'Упаковка'),
    ]
    return_item = models.ForeignKey(ReturnRequestItem, on_delete=models.CASCADE, related_name='photos')
    photo_type = models.CharField(max_length=20, choices=PHOTO_TYPES)
    image = models.ImageField(upload_to='returns/')

    def __str__(self):
        return f'{self.photo_type} photo'
