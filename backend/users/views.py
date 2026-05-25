from decimal import Decimal
from datetime import date, datetime, timedelta

from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.db import transaction
from django.db import models
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
    SavedPaymentCard,
    SupportTicket,
)

STATUS_LABELS = {
    'placed': 'Оформлен',
    'assembling': 'Собирается',
    'awaiting_shipment': 'Ожидает отправки',
    'in_delivery': 'В службе доставки',
    'awaiting_seller': 'Ожидает у продавца',
    'received': 'Получен',
    'cancelled': 'Отменён',
}

STATUS_COLORS = {
    'placed': '#8A9A8E',
    'assembling': '#8A9A8E',
    'awaiting_shipment': '#FAAD14',
    'in_delivery': '#FAAD14',
    'awaiting_seller': '#FAAD14',
    'received': '#6A9D77',
    'cancelled': '#FF4D4F',
}

DELIVERY_LABELS = {
    'pickup': 'Самовывоз у продавца',
    'courier': 'Доставка курьером',
}

GENDER_LABELS = {'male': 'Мужской', 'female': 'Женский'}
BUSINESS_FORM_LABELS = {
    'self_employed': 'Самозанятый',
    'individual': 'Индивидуальный предприниматель',
}


def _parse_birth_date(value):
    if not value:
        return None
    s = str(value).strip()
    for fmt in ('%d.%m.%Y', '%Y-%m-%d'):
        try:
            return datetime.strptime(s, fmt).date()
        except ValueError:
            continue
    return None


def _format_birth_date(d):
    return d.strftime('%d.%m.%Y') if d else ''


def _display_name(user):
    parts = [user.first_name, user.last_name]
    return ' '.join(p for p in parts if p).strip() or user.email


def _auth_response(user):
    profile, _ = UserProfile.objects.get_or_create(user=user)
    refresh = RefreshToken.for_user(user)
    return {
        'access': str(refresh.access_token),
        'refresh': str(refresh),
        'name': _display_name(user),
        'first_name': user.first_name,
        'last_name': user.last_name,
        'email': user.email,
        'role': profile.role,
    }


def _profile_data(user):
    profile, _ = UserProfile.objects.get_or_create(user=user)
    data = {
        'first_name': user.first_name,
        'last_name': user.last_name,
        'name': _display_name(user),
        'email': user.email,
        'phone': profile.phone,
        'city': profile.city,
        'birth_date': _format_birth_date(profile.birth_date),
        'gender': profile.gender,
        'gender_label': GENDER_LABELS.get(profile.gender, ''),
        'role': profile.role,
        'reg_date': user.date_joined.strftime('%d.%m.%Y'),
    }
    if profile.role == 'seller':
        data['patronymic'] = profile.patronymic
        data['business_form'] = profile.business_form
        data['business_form_label'] = BUSINESS_FORM_LABELS.get(profile.business_form, '')
        data['inn'] = profile.inn
    return data


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
    returned = ReturnRequestItem.objects.filter(order_item_id=item.id).exists()
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
        'returned': returned,
    }


def _order_data(request, order):
    received = None
    if order.status == 'received' and order.received_at:
        received = order.received_at.strftime('%d.%m.%Y')
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
    first_name = str(request.data.get('first_name', '')).strip()
    last_name = str(request.data.get('last_name', '')).strip()
    email = request.data.get('email', '')
    phone = request.data.get('phone', '')
    password = request.data.get('password', '')

    if not first_name or not last_name:
        return Response({'error': 'Укажите имя и фамилию'}, status=400)
    if not email or not password:
        return Response({'error': 'Email и пароль обязательны'}, status=400)

    if User.objects.filter(email=email).exists():
        return Response({'error': 'Пользователь с таким email уже существует'}, status=400)

    user = User.objects.create_user(
        username=email,
        email=email,
        password=password,
        first_name=first_name,
        last_name=last_name,
    )
    UserProfile.objects.create(user=user, phone=phone, role='user')

    return Response(_auth_response(user), status=201)


@api_view(['POST'])
def register_seller(request):
    first_name = str(request.data.get('first_name', '')).strip()
    last_name = str(request.data.get('last_name', '')).strip()
    patronymic = str(request.data.get('patronymic', '')).strip()
    email = request.data.get('email', '')
    phone = request.data.get('phone', '')
    password = request.data.get('password', '')
    business_form = request.data.get('business_form', '')
    inn = str(request.data.get('inn', '')).replace(' ', '')

    if not all([first_name, last_name, patronymic, email, password]):
        return Response({'error': 'Заполните обязательные поля'}, status=400)
    if business_form not in ('self_employed', 'individual'):
        return Response({'error': 'Выберите форму организации бизнеса'}, status=400)
    if len(inn) != 12 or not inn.isdigit():
        return Response({'error': 'ИНН должен содержать ровно 12 цифр'}, status=400)
    if User.objects.filter(email=email).exists():
        return Response({'error': 'Пользователь с таким email уже существует'}, status=400)

    user = User.objects.create_user(
        username=email,
        email=email,
        password=password,
        first_name=first_name,
        last_name=last_name,
    )
    UserProfile.objects.create(
        user=user,
        phone=phone,
        role='seller',
        patronymic=patronymic,
        business_form=business_form,
        inn=inn,
        seller_needs_verification=True,
    )
    return Response(_auth_response(user), status=201)


@api_view(['POST'])
def login(request):
    email = request.data.get('email', '')
    password = request.data.get('password', '')
    expected_role = request.data.get('role')

    user = authenticate(username=email, password=password)
    if user is None:
        return Response({'error': 'Неверный логин или пароль'}, status=400)

    profile, _ = UserProfile.objects.get_or_create(user=user)
    if profile.role == 'admin':
        return Response(_auth_response(user))
    if expected_role == 'seller' and profile.role != 'seller':
        return Response({'error': 'Этот аккаунт не зарегистрирован как продавец'}, status=400)
    if expected_role == 'user' and profile.role == 'seller':
        return Response({'error': 'Используйте вход для продавца'}, status=400)

    return Response(_auth_response(user))


@api_view(['GET', 'PATCH'])
@permission_classes([IsAuthenticated])
def me(request):
    if request.method == 'GET':
        return Response(_profile_data(request.user))

    profile, _ = UserProfile.objects.get_or_create(user=request.user)
    if 'first_name' in request.data:
        request.user.first_name = str(request.data['first_name']).strip()
    if 'last_name' in request.data:
        request.user.last_name = str(request.data['last_name']).strip()
    if 'phone' in request.data:
        profile.phone = str(request.data['phone']).strip()
    if 'city' in request.data:
        profile.city = str(request.data['city']).strip()
    if 'birth_date' in request.data:
        profile.birth_date = _parse_birth_date(request.data['birth_date'])
    if 'gender' in request.data:
        g = str(request.data['gender']).strip()
        profile.gender = g if g in ('male', 'female') else ''
    if profile.role == 'seller' and any(
        k in request.data for k in ('first_name', 'last_name', 'phone', 'patronymic', 'business_form', 'inn')
    ):
        profile.seller_needs_verification = True
    request.user.save()
    profile.save()
    return Response(_profile_data(request.user))


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def orders_list(request):
    profile, _ = UserProfile.objects.get_or_create(user=request.user)
    if profile.role in ('seller', 'admin'):
        return Response({'error': 'Доступно только покупателям'}, status=403)
    orders = Order.objects.filter(user=request.user).prefetch_related('items', 'items__product')
    return Response([_order_data(request, order) for order in orders])


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_order(request):
    profile, _ = UserProfile.objects.get_or_create(user=request.user)
    if profile.role in ('seller', 'admin'):
        return Response({'error': 'Недоступно для этой роли'}, status=403)

    items_data = request.data.get('items', [])
    payment_method = request.data.get('payment_method', '')
    delivery_type = request.data.get('delivery_type', '')
    promo_code = request.data.get('promo_code', '')

    if payment_method not in ('card', 'sbp'):
        return Response({'error': 'Выберите способ оплаты'}, status=400)
    if delivery_type not in ('pickup', 'courier'):
        return Response({'error': 'Выберите способ получения'}, status=400)

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
    delivery_address = _format_courier_address(request.data) if delivery_type == 'courier' else ''

    with transaction.atomic():
        order = Order.objects.create(
            user=request.user,
            total=total,
            status='placed',
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
            received_at=None,
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

    if not _order_allows_review_return(order):
        return Response({'error': 'Оценить товары можно только после получения заказа'}, status=400)

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

    text = (request.data.get('text') or '').strip()

    if ProductReview.objects.filter(user=request.user, product=product).exists():
        return Response({'error': 'Вы уже оценили этот товар'}, status=400)

    ProductReview.objects.create(
        user=request.user,
        product=product,
        order=order,
        rating=rating,
        text=text,
        status='pending',
    )
    return Response({'success': True, 'message': 'Отзыв отправлен на модерацию'})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def submit_return(request, order_id):
    try:
        order = Order.objects.get(pk=order_id, user=request.user)
    except Order.DoesNotExist:
        return Response({'error': 'Заказ не найден'}, status=404)

    if not _order_allows_review_return(order):
        return Response({'error': 'Вернуть товары можно только после получения заказа'}, status=400)

    items_json = request.data.get('items')
    if not items_json:
        return Response({'error': 'Выберите товары для возврата'}, status=400)

    import json
    try:
        items_list = json.loads(items_json) if isinstance(items_json, str) else items_json
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

            if ReturnRequestItem.objects.filter(order_item=order_item).exists():
                return Response(
                    {'error': f'По товару «{order_item.title}» заявка на возврат уже создана'},
                    status=400,
                )

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
                    return_item=return_item, photo_type='product', image=img,
                )
            for img in packaging_photos[:3]:
                ReturnRequestPhoto.objects.create(
                    return_item=return_item, photo_type='packaging', image=img,
                )

    return Response({'success': True, 'message': 'Заявка на возврат отправлена'})


CANCEL_REASON_STATUSES = {
    'pickup': {'placed', 'assembling', 'awaiting_seller'},
    'courier': {'placed', 'assembling'},
}
CANCEL_INFO_STATUSES = {'courier': {'awaiting_shipment', 'in_delivery'}}
FINAL_ORDER_STATUSES = {
    'pickup': {'received'},
    'courier': {'received'},
}


def _order_allows_review_return(order):
    return order.status in FINAL_ORDER_STATUSES.get(order.delivery_type, set())


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def payment_card(request):
    if request.method == 'GET':
        try:
            card = request.user.saved_card
            return Response({
                'lastFour': card.last_four,
                'holderName': card.holder_name,
                'expMonth': card.exp_month,
                'expYear': card.exp_year,
            })
        except SavedPaymentCard.DoesNotExist:
            return Response({'saved': False})

    card_number = str(request.data.get('card_number', '')).replace(' ', '')
    holder_name = str(request.data.get('holder_name', '')).strip()
    exp_month = str(request.data.get('exp_month', '')).strip()
    exp_year = str(request.data.get('exp_year', '')).strip()

    if len(card_number) < 13:
        return Response({'error': 'Некорректный номер карты'}, status=400)
    if not holder_name:
        return Response({'error': 'Укажите имя держателя карты'}, status=400)

    last_four = card_number[-4:]
    SavedPaymentCard.objects.update_or_create(
        user=request.user,
        defaults={
            'last_four': last_four,
            'holder_name': holder_name,
            'exp_month': exp_month,
            'exp_year': exp_year,
        },
    )
    return Response({'success': True, 'lastFour': last_four})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def cancel_order(request, order_id):
    try:
        order = Order.objects.get(pk=order_id, user=request.user)
    except Order.DoesNotExist:
        return Response({'error': 'Заказ не найден'}, status=404)

    if order.status == 'cancelled':
        return Response({'error': 'Заказ уже отменён'}, status=400)

    if order.status in CANCEL_INFO_STATUSES.get(order.delivery_type, set()):
        return Response(
            {
                'error': 'in_transit',
                'message': 'Заказ уже в пути или готовится к отправке. Обратитесь в службу поддержки.',
            },
            status=400,
        )

    allowed = CANCEL_REASON_STATUSES.get(order.delivery_type, set())
    if order.status not in allowed:
        return Response({'error': 'Этот заказ нельзя отменить'}, status=400)

    reason = (request.data.get('reason') or '').strip()
    custom_reason = (request.data.get('custom_reason') or '').strip()
    if not reason:
        return Response({'error': 'Укажите причину отмены'}, status=400)

    order.status = 'cancelled'
    order.cancellation_reason = f'{reason}. {custom_reason}'.strip() if custom_reason else reason
    order.save(update_fields=['status', 'cancellation_reason'])
    return Response(_order_data(request, order))


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def support_ticket(request):
    first_name = str(request.data.get('first_name', '')).strip()
    last_name = str(request.data.get('last_name', '')).strip()
    phone = str(request.data.get('phone', '')).strip()
    email = str(request.data.get('email', '')).strip()
    description = str(request.data.get('description', '')).strip()

    if not all([first_name, last_name, phone, email, description]):
        return Response({'error': 'Заполните все поля'}, status=400)

    SupportTicket.objects.create(
        user=request.user,
        first_name=first_name,
        last_name=last_name,
        phone=phone,
        email=email,
        description=description,
    )
    return Response({'success': True}, status=201)
