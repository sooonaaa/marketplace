import io
import json
from datetime import date
from decimal import Decimal

from django.db.models import Q, Sum
from django.utils import timezone
from django.http import HttpResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from products.models import Category, Product, ProductImage
from products.category_specs import PRODUCT_STATUS_LABELS, build_specs_from_form
from .models import Order, OrderItem, Promotion, ReturnRequest, UserProfile

STATUS_LABELS = {
    'placed': 'Оформлен',
    'assembling': 'Собирается',
    'awaiting_shipment': 'Ожидает отправки',
    'in_delivery': 'В службе доставки',
    'awaiting_seller': 'Ожидает у продавца',
    'received': 'Получен',
    'cancelled': 'Отменён',
}

PICKUP_STATUSES = ['placed', 'assembling', 'awaiting_seller', 'received']
COURIER_STATUSES = ['placed', 'assembling', 'awaiting_shipment', 'in_delivery', 'received']


def _require_seller(user):
    profile, _ = UserProfile.objects.get_or_create(user=user)
    if profile.role not in ('seller', 'admin'):
        return None
    return profile


def _product_image_url(request, product):
    if product and product.image:
        return request.build_absolute_uri(product.image.url)
    return ''


def _product_payload(request, product):
    images = []
    for img in product.gallery.all():
        images.append(request.build_absolute_uri(img.image.url))
    main = _product_image_url(request, product)
    if main and main not in images:
        images.insert(0, main)
    elif main:
        images = [main] if not images else images
    return {
        'id': product.id,
        'title': product.title,
        'price': float(product.price),
        'old_price': float(product.old_price) if product.old_price else None,
        'category': product.category_id,
        'manufacturer': product.manufacturer,
        'city': product.city,
        'rating': product.rating,
        'reviews_count': product.reviews_count,
        'is_local_verified': product.is_local_verified,
        'description': product.description,
        'specs': product.specs or [],
        'image': main,
        'images': images,
        'status': product.status,
        'status_label': PRODUCT_STATUS_LABELS.get(product.status, product.status),
        'status_reason': product.status_reason or '',
    }


def _seller_order_data(request, order, seller_id):
    items = order.items.filter(Q(product__seller_id=seller_id))
    buyer = order.user
    try:
        profile = buyer.profile
    except UserProfile.DoesNotExist:
        profile = None
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
        'deliveryType': order.delivery_type,
        'deliveryMethod': order.delivery_method,
        'buyerName': f'{buyer.first_name} {buyer.last_name}'.strip() or buyer.email,
        'buyerPhone': profile.phone if profile else '',
        'total': float(sum(i.price * i.quantity for i in items)),
        'items': [
            {'id': i.id, 'title': i.title, 'quantity': float(i.quantity), 'price': float(i.price)}
            for i in items
        ],
        'allowedStatuses': COURIER_STATUSES if order.delivery_type == 'courier' else PICKUP_STATUSES,
    }


def _return_payload(request, return_req, seller_id):
    items = []
    for item in return_req.items.select_related('order_item', 'order_item__product').prefetch_related('photos'):
        product = item.order_item.product
        if product and product.seller_id != seller_id:
            continue
        photos = [
            {'type': p.photo_type, 'url': request.build_absolute_uri(p.image.url) if p.image else ''}
            for p in item.photos.all()
        ]
        items.append({
            'id': item.id,
            'productTitle': item.order_item.title,
            'quantity': float(item.order_item.quantity),
            'reason': item.reason,
            'photos': photos,
        })
    if not items:
        return None
    buyer = return_req.user
    return {
        'id': return_req.id,
        'orderId': return_req.order_id,
        'status': return_req.status,
        'createdAt': return_req.created_at.strftime('%d.%m.%Y %H:%M'),
        'buyerName': f'{buyer.first_name} {buyer.last_name}'.strip() or buyer.email,
        'buyerEmail': buyer.email,
        'items': items,
    }


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def seller_products(request):
    if not _require_seller(request.user):
        return Response({'error': 'Доступ только для продавцов'}, status=403)

    if request.method == 'GET':
        products = Product.objects.filter(seller=request.user).select_related('category').prefetch_related('gallery')
        return Response([_product_payload(request, p) for p in products])

    title = str(request.data.get('title', '')).strip()
    price = request.data.get('price')
    category_id = request.data.get('category')
    if not title or price is None or not category_id:
        return Response({'error': 'Заполните название, цену и категорию'}, status=400)
    try:
        category = Category.objects.get(pk=category_id)
    except Category.DoesNotExist:
        return Response({'error': 'Категория не найдена'}, status=400)

    try:
        price_int = int(Decimal(str(price)))
    except (TypeError, ValueError):
        return Response({'error': 'Цена должна быть целым числом'}, status=400)
    if price_int <= 1:
        return Response({'error': 'Цена должна быть больше 1'}, status=400)

    specs_raw = request.data.get('specs', [])
    if isinstance(specs_raw, str):
        try:
            specs_raw = json.loads(specs_raw)
        except json.JSONDecodeError:
            specs_raw = []
    if isinstance(specs_raw, dict):
        built = build_specs_from_form(category_id, specs_raw)
        if built is None:
            return Response({'error': 'Заполните обязательные характеристики'}, status=400)
        specs_raw = built
    elif not isinstance(specs_raw, list) or not specs_raw:
        return Response({'error': 'Укажите характеристики товара'}, status=400)

    profile, _ = UserProfile.objects.get_or_create(user=request.user)
    had_published = Product.objects.filter(seller=request.user, status='published').exists()
    if not had_published:
        profile.seller_needs_verification = True
        profile.save(update_fields=['seller_needs_verification'])

    product = Product.objects.create(
        title=title,
        price=Decimal(str(price_int)),
        old_price=Decimal(str(request.data['old_price'])) if request.data.get('old_price') else None,
        category=category,
        seller=request.user,
        manufacturer=str(request.data.get('manufacturer', '')).strip() or request.user.first_name,
        city=str(request.data.get('city', '')).strip() or 'г. Чебоксары',
        description=str(request.data.get('description', '')).strip(),
        specs=specs_raw,
        is_local_verified=bool(request.data.get('is_local_verified', True)),
        status='pending',
        submitted_at=timezone.now(),
    )
    gallery_files = request.FILES.getlist('images') or request.FILES.getlist('images[]')
    if not gallery_files and request.FILES.get('image'):
        gallery_files = [request.FILES['image']]
    if len(gallery_files) < 1:
        return Response({'error': 'Добавьте минимум 1 фото товара'}, status=400)
    if len(gallery_files) > 10:
        return Response({'error': 'Не более 10 фотографий'}, status=400)

    for idx, img in enumerate(gallery_files[:10]):
        pi = ProductImage.objects.create(product=product, image=img, sort_order=idx)
        if idx == 0 and not product.image:
            product.image = pi.image
            product.save(update_fields=['image'])

    return Response(_product_payload(request, product), status=201)


@api_view(['PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def seller_product_detail(request, product_id):
    if not _require_seller(request.user):
        return Response({'error': 'Доступ только для продавцов'}, status=403)
    try:
        product = Product.objects.get(pk=product_id, seller=request.user)
    except Product.DoesNotExist:
        return Response({'error': 'Товар не найден'}, status=404)

    if request.method == 'DELETE':
        product.delete()
        return Response({'success': True})

    for field, attr in [('title', 'title'), ('manufacturer', 'manufacturer'), ('city', 'city'), ('description', 'description')]:
        if field in request.data:
            setattr(product, attr, str(request.data[field]).strip())
    if 'price' in request.data:
        product.price = Decimal(str(request.data['price']))
    if 'old_price' in request.data:
        val = request.data['old_price']
        product.old_price = Decimal(str(val)) if val not in (None, '', 'null') else None
    if 'category' in request.data:
        try:
            product.category = Category.objects.get(pk=request.data['category'])
        except Category.DoesNotExist:
            return Response({'error': 'Категория не найдена'}, status=400)
    if 'specs' in request.data:
        specs_raw = request.data['specs']
        if isinstance(specs_raw, str):
            specs_raw = json.loads(specs_raw)
        product.specs = specs_raw
    if request.FILES.get('image'):
        product.image = request.FILES['image']
    product.save()
    return Response(_product_payload(request, product))


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def seller_orders(request):
    if not _require_seller(request.user):
        return Response({'error': 'Доступ только для продавцов'}, status=403)

    order_ids = Order.objects.filter(
        items__product__seller=request.user
    ).distinct().values_list('id', flat=True)
    orders = Order.objects.filter(id__in=order_ids).prefetch_related('items', 'user', 'user__profile')
    return Response([_seller_order_data(request, o, request.user.id) for o in orders])


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def seller_order_status(request, order_id):
    if not _require_seller(request.user):
        return Response({'error': 'Доступ только для продавцов'}, status=403)

    new_status = request.data.get('status')
    if not new_status:
        return Response({'error': 'Укажите статус'}, status=400)

    try:
        order = Order.objects.get(pk=order_id)
    except Order.DoesNotExist:
        return Response({'error': 'Заказ не найден'}, status=404)

    if not order.items.filter(product__seller=request.user).exists():
        return Response({'error': 'Заказ не содержит ваших товаров'}, status=403)

    allowed = COURIER_STATUSES if order.delivery_type == 'courier' else PICKUP_STATUSES
    if new_status not in allowed:
        return Response({'error': 'Недопустимый статус'}, status=400)

    order.status = new_status
    if new_status == 'received':
        order.received_at = date.today()
        order.save(update_fields=['status', 'received_at'])
    else:
        order.save(update_fields=['status'])

    return Response(_seller_order_data(request, order, request.user.id))


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def seller_returns(request):
    if not _require_seller(request.user):
        return Response({'error': 'Доступ только для продавцов'}, status=403)

    returns = ReturnRequest.objects.filter(
        items__order_item__product__seller=request.user
    ).distinct().select_related('user', 'order').order_by('-created_at')

    result = []
    for r in returns:
        payload = _return_payload(request, r, request.user.id)
        if payload:
            result.append(payload)
    return Response(result)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def seller_return_detail(request, return_id):
    if not _require_seller(request.user):
        return Response({'error': 'Доступ только для продавцов'}, status=403)
    try:
        return_req = ReturnRequest.objects.get(pk=return_id)
    except ReturnRequest.DoesNotExist:
        return Response({'error': 'Заявка не найдена'}, status=404)

    payload = _return_payload(request, return_req, request.user.id)
    if not payload:
        return Response({'error': 'Заявка не найдена'}, status=404)
    return Response(payload)


PROMO_TYPE_LABELS = {
    'bogo_1_2': 'Акция 1 = 2',
    'bogo_2_3': 'Акция 2 = 3',
    'discount': 'Скидка на товар',
    'promo_code': 'Промокод',
}


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def seller_promotions(request):
    if not _require_seller(request.user):
        return Response({'error': 'Доступ только для продавцов'}, status=403)

    if request.method == 'GET':
        promos = Promotion.objects.filter(seller=request.user).prefetch_related('products').order_by('-created_at')
        return Response([
            {
                'id': p.id,
                'title': p.title,
                'promotion_type': p.promotion_type,
                'promotion_type_label': PROMO_TYPE_LABELS.get(p.promotion_type, p.promotion_type),
                'promo_code': p.promo_code,
                'discount_percent': float(p.discount_percent) if p.discount_percent else None,
                'product_ids': list(p.products.values_list('id', flat=True)),
                'is_active': p.is_active,
            }
            for p in promos
        ])

    promotion_type = request.data.get('promotion_type', 'discount')
    if promotion_type not in PROMO_TYPE_LABELS:
        return Response({'error': 'Неверный вид акции'}, status=400)

    product_ids = request.data.get('product_ids', [])
    if isinstance(product_ids, str):
        try:
            product_ids = json.loads(product_ids)
        except json.JSONDecodeError:
            product_ids = []
    product_ids = [int(x) for x in product_ids]
    if len(product_ids) < 1:
        return Response({'error': 'Выберите минимум 1 товар'}, status=400)

    owned = Product.objects.filter(seller=request.user, id__in=product_ids).count()
    if owned != len(product_ids):
        return Response({'error': 'Некорректный список товаров'}, status=400)

    discount_percent = None
    promo_code = ''

    if promotion_type in ('discount', 'promo_code'):
        try:
            discount_percent = int(request.data.get('discount_percent'))
        except (TypeError, ValueError):
            return Response({'error': 'Укажите скидку от 1 до 100'}, status=400)
        if discount_percent < 1 or discount_percent > 100:
            return Response({'error': 'Скидка от 1 до 100%'}, status=400)

    if promotion_type == 'promo_code':
        promo_code = str(request.data.get('promo_code', '')).strip().upper()
        if len(promo_code) < 3:
            return Response({'error': 'Промокод — минимум 3 символа'}, status=400)
        if not promo_code.isalnum():
            return Response({'error': 'Промокод: только латинские буквы и цифры'}, status=400)
        if Promotion.objects.filter(promo_code=promo_code).exists():
            return Response({'error': 'Промокод уже существует'}, status=400)

    title = PROMO_TYPE_LABELS[promotion_type]
    if promotion_type == 'promo_code':
        title = f'Промокод {promo_code}'

    promo = Promotion.objects.create(
        seller=request.user,
        title=title,
        promotion_type=promotion_type,
        promo_code=promo_code,
        discount_percent=Decimal(str(discount_percent)) if discount_percent else None,
        is_active=True,
    )
    promo.products.set(product_ids)
    return Response({'id': promo.id, 'success': True}, status=201)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def seller_promotion_delete(request, promo_id):
    if not _require_seller(request.user):
        return Response({'error': 'Доступ только для продавцов'}, status=403)
    Promotion.objects.filter(pk=promo_id, seller=request.user).delete()
    return Response({'success': True})


def _build_pdf(lines):
    """Minimal PDF with text lines (no external deps)."""
    content_lines = []
    y = 750
    for line in lines:
        safe = line.replace('\\', '\\\\').replace('(', '\\(').replace(')', '\\)')
        content_lines.append(f'BT /F1 11 Tf 50 {y} Td ({safe}) Tj ET')
        y -= 16
    stream = '\n'.join(content_lines)
    stream_bytes = stream.encode('latin-1', errors='replace')

    objects = []
    objects.append(b'1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj\n')
    objects.append(b'2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj\n')
    objects.append(
        b'3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] '
        b'/Contents 4 0 R /Resources<< /Font<< /F1 5 0 R >> >> >>endobj\n'
    )
    objects.append(
        f'4 0 obj<< /Length {len(stream_bytes)} >>stream\n'.encode()
        + stream_bytes + b'\nendstream endobj\n'
    )
    objects.append(b'5 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj\n')

    pdf = b'%PDF-1.4\n'
    offsets = [0]
    for obj in objects:
        offsets.append(len(pdf))
        pdf += obj
    xref_pos = len(pdf)
    pdf += f'xref\n0 {len(offsets)}\n0000000000 65535 f \n'.encode()
    for off in offsets[1:]:
        pdf += f'{off:010d} 00000 n \n'.encode()
    pdf += f'trailer<< /Size {len(offsets)} /Root 1 0 R >>\nstartxref\n{xref_pos}\n%%EOF'.encode()
    return pdf


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def seller_sales_report(request):
    if not _require_seller(request.user):
        return Response({'error': 'Доступ только для продавцов'}, status=403)

    seller_id = request.user.id
    lines = [
        'ChuvashMP — Отчёт по продажам',
        f'Продавец: {request.user.first_name} {request.user.last_name}',
        f'Дата формирования: {date.today().strftime("%d.%m.%Y")}',
        '',
    ]

    items = OrderItem.objects.filter(
        product__seller_id=seller_id,
        order__status='received',
    ).select_related('order', 'product')

    by_product = {}
    total_sum = Decimal('0')
    for item in items:
        key = item.title
        qty = item.quantity
        amount = item.price * qty
        total_sum += amount
        if key not in by_product:
            by_product[key] = {'qty': Decimal('0'), 'sum': Decimal('0')}
        by_product[key]['qty'] += qty
        by_product[key]['sum'] += amount

    lines.append(f'Всего продаж (полученные заказы): {len(items)} поз.')
    lines.append(f'Сумма: {float(total_sum):.2f} руб.')
    lines.append('')
    for title, data in sorted(by_product.items()):
        lines.append(f'{title}: {float(data["qty"])} шт., {float(data["sum"]):.2f} руб.')

    pdf_bytes = _build_pdf(lines)
    response = HttpResponse(pdf_bytes, content_type='application/pdf')
    response['Content-Disposition'] = 'attachment; filename="sales_report.pdf"'
    return response
