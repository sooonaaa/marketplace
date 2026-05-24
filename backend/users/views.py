from decimal import Decimal
from datetime import date, timedelta

from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.db import transaction
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from products.models import Product
from rest_framework_simplejwt.tokens import RefreshToken

from .models import (
    UserProfile,
    Order,
    OrderItem,
    ProductReview,
    ReturnRequest,
    ReturnRequestItem,
    ReturnRequestPhoto,
)

STATUS_LABELS = {
    'pending': 'Оформлен',
    'shipping': 'В пути',
    'delivered': 'Доставлен',
    'cancelled': 'Отменён',
}

STATUS_COLORS = {
    'pending': '#8A9A8E',
    'shipping': '#FAAD14',
    'delivered': '#6A9D77',
    'cancelled': '#FF4D4F',
}

DELIVERY_LABELS = {
    'pickup': 'Самовывоз от продавца',
    'courier': 'Доставка курьером',
}


def _auth_response(user):
    refresh = RefreshToken.for_user(user)
    return {
        'access': str(refresh.access_token),
        'refresh': str(refresh),
        'name': user.first_name,
        'email': user.email,
    }


def _profile_data(user):
    profile, _ = UserProfile.objects.get_or_create(user=user)
    return {
        'name': user.first_name or user.username,
        'email': user.email,
        'phone': profile.phone,
        'city': profile.city,
        'reg_date': user.date_joined.strftime('%d.%m.%Y'),
    }


def _product_image_url(request, product):
    if product and product.image:
        return request.build_absolute_uri(product.image.url)
    return ''


def _order_item_data(request, item, user_id):
    image = item.image_url
    if not image and item.product:
        image = _product_image_url(request, item.product)
    product_id = item.product_id_snapshot or (item.product_id if item.product_id else None)
    reviewed = False
    if product_id and user_id:
        reviewed = ProductReview.objects.filter(
            user_id=user_id,
            product_id=product_id,
        ).exists()
    return {
        'id': item.id,
        'productId': product_id,
        'title': item.title,
        'price': float(item.price),
        'quantity': float(item.quantity),
        'image': image,
        'reviewed': reviewed,
    }


def _order_data(request, order):
    received = order.received_at.strftime('%d.%m.%Y') if order.received_at else None
    return {
        'id': order.pk,
        'orderNumber': f'№ {order.pk}',
        'date': order.created_at.strftime('%d.%m.%Y'),
        'receivedAt': received,
        'status': STATUS_LABELS.get(order.status, order.status),
        'statusKey': order.status,
        'statusColor': STATUS_COLORS.get(order.status, '#8A9A8E'),
        'total': float(order.total),
        'deliveryType': order.delivery_type,
        'deliveryMethod': order.delivery_method or DELIVERY_LABELS.get(order.delivery_type, ''),
        'deliveryAddress': order.delivery_address,
        'paymentMethod': order.payment_method,
        'items': [_order_item_data(request, item, order.user_id) for item in order.items.all()],
    }


def _format_courier_address(data):
    parts = [
        data.get('address_city', ''),
        data.get('address_street', ''),
        f"д. {data.get('address_house', '')}" if data.get('address_house') else '',
        f"кв. {data.get('address_flat', '')}" if data.get('address_flat') else '',
    ]
    extra = []
    if data.get('address_intercom'):
        extra.append(f"домофон {data['address_intercom']}")
    if data.get('address_entrance'):
        extra.append(f"подъезд {data['address_entrance']}")
    if data.get('address_floor'):
        extra.append(f"этаж {data['address_floor']}")
    base = ', '.join(p for p in parts if p and p.strip())
    if extra:
        base += ' (' + ', '.join(extra) + ')'
    return base


@api_view(['POST'])
def register(request):
    name = request.data.get('name', '')
    email = request.data.get('email', '')
    phone = request.data.get('phone', '')
    password = request.data.get('password', '')

    if not email or not password:
        return Response({'error': 'Email и пароль обязательны'}, status=400)

    if User.objects.filter(email=email).exists():
        return Response({'error': 'Пользователь с таким email уже существует'}, status=400)

    user = User.objects.create_user(
        username=email,
        email=email,
        password=password,
        first_name=name,
    )
    UserProfile.objects.create(user=user, phone=phone)

    return Response(_auth_response(user), status=201)


@api_view(['POST'])
def login(request):
    email = request.data.get('email', '')
    password = request.data.get('password', '')

    user = authenticate(username=email, password=password)
    if user is None:
        return Response({'error': 'Неверный логин или пароль'}, status=400)

    return Response(_auth_response(user))


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me(request):
    return Response(_profile_data(request.user))


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def orders_list(request):
    orders = (
        Order.objects.filter(user=request.user)
        .prefetch_related('items', 'items__product')
    )
    return Response([_order_data(request, order) for order in orders])


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_order(request):
    items_data = request.data.get('items', [])
    payment_method = request.data.get('payment_method', '')
    delivery_type = request.data.get('delivery_type', '')
    promo_code = request.data.get('promo_code', '')

    if payment_method not in ('card', 'sbp'):
        return Response({'error': 'Выберите способ оплаты'}, status=400)
    if delivery_type not in ('pickup', 'courier'):
        return Response({'error': 'Выберите способ доставки'}, status=400)

    if delivery_type == 'courier':
        required = ['address_city', 'address_street', 'address_house']
        for field in required:
            if not str(request.data.get(field, '')).strip():
                return Response({'error': 'Заполните адрес доставки'}, status=400)

    if not items_data:
        return Response({'error': 'Корзина пуста'}, status=400)

    total = Decimal('0')
    order_items = []

    for row in items_data:
        product_id = row.get('product_id')
        quantity = Decimal(str(row.get('quantity', 1)))
        try:
            product = Product.objects.get(pk=product_id)
        except Product.DoesNotExist:
            return Response({'error': f'Товар {product_id} не найден'}, status=400)
        line_total = product.price * quantity
        total += line_total
        order_items.append((product, quantity, line_total))

    delivery_method = DELIVERY_LABELS[delivery_type]
    delivery_address = ''
    if delivery_type == 'courier':
        delivery_address = _format_courier_address(request.data)

    with transaction.atomic():
        order = Order.objects.create(
            user=request.user,
            total=total,
            status='pending',
            delivery_type=delivery_type,
            delivery_method=delivery_method,
            delivery_address=delivery_address,
            payment_method=payment_method,
            promo_code=promo_code or '',
            address_city=request.data.get('address_city', ''),
            address_street=request.data.get('address_street', ''),
            address_house=request.data.get('address_house', ''),
            address_flat=request.data.get('address_flat', ''),
            address_intercom=request.data.get('address_intercom', ''),
            address_entrance=request.data.get('address_entrance', ''),
            address_floor=request.data.get('address_floor', ''),
            received_at=date.today() + timedelta(days=5),
        )
        for product, quantity, _ in order_items:
            OrderItem.objects.create(
                order=order,
                product=product,
                product_id_snapshot=product.id,
                title=product.title,
                price=product.price,
                quantity=quantity,
                image_url=_product_image_url(request, product),
            )

    return Response(_order_data(request, order), status=201)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def submit_review(request, order_id):
    product_id = request.data.get('product_id')
    rating = request.data.get('rating')

    try:
        order = Order.objects.get(pk=order_id, user=request.user)
    except Order.DoesNotExist:
        return Response({'error': 'Заказ не найден'}, status=404)

    if not product_id:
        return Response({'error': 'Укажите товар'}, status=400)

    try:
        rating = int(rating)
    except (TypeError, ValueError):
        return Response({'error': 'Некорректная оценка'}, status=400)

    if rating < 1 or rating > 5:
        return Response({'error': 'Оценка от 1 до 5'}, status=400)

    item_exists = order.items.filter(product_id_snapshot=product_id).exists() or order.items.filter(
        product_id=product_id
    ).exists()
    if not item_exists:
        return Response({'error': 'Товар не входит в заказ'}, status=400)

    try:
        product = Product.objects.get(pk=product_id)
    except Product.DoesNotExist:
        return Response({'error': 'Товар не найден'}, status=404)

    if ProductReview.objects.filter(user=request.user, product=product).exists():
        return Response({'error': 'Вы уже оценили этот товар'}, status=400)

    ProductReview.objects.create(
        user=request.user,
        product=product,
        order=order,
        rating=rating,
    )
    return Response({'success': True})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def submit_return(request, order_id):
    try:
        order = Order.objects.get(pk=order_id, user=request.user)
    except Order.DoesNotExist:
        return Response({'error': 'Заказ не найден'}, status=404)

    items_json = request.data.get('items')
    if not items_json:
        return Response({'error': 'Выберите товары для возврата'}, status=400)

    import json
    try:
        if isinstance(items_json, str):
            items_list = json.loads(items_json)
        else:
            items_list = items_json
    except json.JSONDecodeError:
        return Response({'error': 'Некорректные данные'}, status=400)

    if not items_list:
        return Response({'error': 'Выберите товары для возврата'}, status=400)

    with transaction.atomic():
        return_req = ReturnRequest.objects.create(user=request.user, order=order)
        for entry in items_list:
            order_item_id = entry.get('order_item_id')
            reason = (entry.get('reason') or '').strip()
            if not reason:
                return Response({'error': 'Укажите причину возврата для каждого товара'}, status=400)
            try:
                order_item = OrderItem.objects.get(pk=order_item_id, order=order)
            except OrderItem.DoesNotExist:
                return Response({'error': 'Позиция заказа не найдена'}, status=400)

            return_item = ReturnRequestItem.objects.create(
                return_request=return_req,
                order_item=order_item,
                reason=reason,
            )
            product_photos = request.FILES.getlist(f'product_{order_item_id}')
            packaging_photos = request.FILES.getlist(f'packaging_{order_item_id}')
            if len(product_photos) < 1 or len(packaging_photos) < 1:
                return Response(
                    {'error': 'Для каждого товара нужны фото товара и упаковки'},
                    status=400,
                )
            for img in product_photos[:3]:
                ReturnRequestPhoto.objects.create(
                    return_item=return_item,
                    photo_type='product',
                    image=img,
                )
            for img in packaging_photos[:3]:
                ReturnRequestPhoto.objects.create(
                    return_item=return_item,
                    photo_type='packaging',
                    image=img,
                )

    return Response({'success': True, 'message': 'Заявка на возврат отправлена'})
