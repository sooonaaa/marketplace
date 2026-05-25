from django.contrib import admin
from .models import (
    UserProfile,
    Order,
    OrderItem,
    ProductReview,
    ReturnRequest,
    ReturnRequestItem,
    ReturnRequestPhoto,
    SavedPaymentCard,
    Promotion,
)


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 1


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'phone', 'city')


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'status', 'total', 'delivery_type', 'created_at', 'received_at')
    inlines = [OrderItemInline]


@admin.register(ProductReview)
class ProductReviewAdmin(admin.ModelAdmin):
    list_display = ('user', 'product', 'order', 'rating', 'created_at')


class ReturnRequestPhotoInline(admin.TabularInline):
    model = ReturnRequestPhoto
    extra = 0


class ReturnRequestItemInline(admin.TabularInline):
    model = ReturnRequestItem
    extra = 0


@admin.register(ReturnRequest)
class ReturnRequestAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'order', 'status', 'created_at')
    inlines = [ReturnRequestItemInline]


@admin.register(SavedPaymentCard)
class SavedPaymentCardAdmin(admin.ModelAdmin):
    list_display = ('user', 'last_four', 'holder_name', 'exp_month', 'exp_year', 'created_at')


@admin.register(Promotion)
class PromotionAdmin(admin.ModelAdmin):
    list_display = ('title', 'promo_code', 'seller', 'is_active', 'created_at')
