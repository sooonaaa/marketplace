from django.db import models
from django.contrib.auth.models import User
from products.models import Product


class UserProfile(models.Model):
    ROLE_CHOICES = [
        ('user', 'Покупатель'),
        ('seller', 'Продавец'),
        ('admin', 'Администратор'),
    ]
    GENDER_CHOICES = [
        ('male', 'Мужской'),
        ('female', 'Женский'),
    ]
    BUSINESS_FORM_CHOICES = [
        ('self_employed', 'Самозанятый'),
        ('individual', 'Индивидуальный предприниматель'),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    phone = models.CharField(max_length=30, blank=True, default='')
    city = models.CharField(max_length=100, blank=True, default='г. Чебоксары')
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='user')
    birth_date = models.DateField(null=True, blank=True)
    gender = models.CharField(max_length=10, blank=True, default='')
    patronymic = models.CharField(max_length=100, blank=True, default='')
    business_form = models.CharField(max_length=30, blank=True, default='')
    inn = models.CharField(max_length=12, blank=True, default='')
    seller_needs_verification = models.BooleanField(default=False)

    def __str__(self):
        return self.user.email


class Order(models.Model):
    STATUS_CHOICES = [
        ('placed', 'Оформлен'),
        ('assembling', 'Собирается'),
        ('awaiting_shipment', 'Ожидает отправки'),
        ('in_delivery', 'В службе доставки'),
        ('awaiting_seller', 'Ожидает у продавца'),
        ('received', 'Получен'),
        ('cancelled', 'Отменён'),
    ]
    DELIVERY_TYPE_CHOICES = [
        ('pickup', 'Самовывоз у продавца'),
        ('courier', 'Доставка курьером'),
    ]
    PAYMENT_CHOICES = [
        ('card', 'Банковская карта'),
        ('sbp', 'СБП'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='orders')
    created_at = models.DateTimeField(auto_now_add=True)
    received_at = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='placed')
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
    cancellation_reason = models.TextField(blank=True, default='')

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
    STATUS_CHOICES = [
        ('pending', 'На модерации'),
        ('published', 'Опубликован'),
        ('rejected', 'Отклонён'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='product_reviews')
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='reviews')
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='reviews')
    rating = models.PositiveSmallIntegerField()
    text = models.TextField(blank=True, default='')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
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

    class Meta:
        unique_together = [('order_item',)]

    def __str__(self):
        return f'Return item {self.order_item_id}'


class SavedPaymentCard(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='saved_card')
    last_four = models.CharField(max_length=4)
    holder_name = models.CharField(max_length=100)
    exp_month = models.CharField(max_length=2)
    exp_year = models.CharField(max_length=4)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'**** {self.last_four}'


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


class Promotion(models.Model):
    TYPE_CHOICES = [
        ('bogo_1_2', 'Акция 1 = 2'),
        ('bogo_2_3', 'Акция 2 = 3'),
        ('discount', 'Скидка на товар'),
        ('promo_code', 'Промокод'),
    ]
    seller = models.ForeignKey(User, on_delete=models.CASCADE, related_name='promotions')
    title = models.CharField(max_length=200)
    promotion_type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='discount')
    promo_code = models.CharField(max_length=50, blank=True, default='')
    discount_percent = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    discount_amount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    products = models.ManyToManyField(Product, blank=True, related_name='promotions')
    starts_at = models.DateField(null=True, blank=True)
    ends_at = models.DateField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title


class SupportTicket(models.Model):
    STATUS_CHOICES = [
        ('open', 'Открыто'),
        ('closed', 'Закрыто'),
    ]
    user = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name='support_tickets'
    )
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    phone = models.CharField(max_length=30)
    email = models.EmailField()
    description = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='open')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'Обращение #{self.pk} — {self.email}'


class SiteVisit(models.Model):
    visited_at = models.DateTimeField(auto_now_add=True)
    path = models.CharField(max_length=255, blank=True, default='/')
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)

    class Meta:
        ordering = ['-visited_at']


class PasswordResetCode(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='password_resets')
    email = models.EmailField()
    code = models.CharField(max_length=6)
    reset_token = models.CharField(max_length=64, unique=True)
    is_verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    last_sent_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
