from datetime import timedelta
from decimal import Decimal

from django.contrib.auth.models import User
from django.db.models import Avg, Count, F, Sum
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from products.category_specs import PRODUCT_STATUS_LABELS
from products.models import Product
from .models import (
    Order,
    OrderItem,
    ProductReview,
    SiteVisit,
    SupportTicket,
    UserProfile,
)
from .views import BUSINESS_FORM_LABELS, GENDER_LABELS, _format_birth_date, _parse_birth_date

STATUS_LABELS = PRODUCT_STATUS_LABELS


def _require_admin(user):
    profile, _ = UserProfile.objects.get_or_create(user=user)
    if profile.role != 'admin':
        return None
    return profile


def _seller_info(user):
    profile, _ = UserProfile.objects.get_or_create(user=user)
    return {
        'id': user.id,
        'first_name': user.first_name,
        'last_name': user.last_name,
        'patronymic': profile.patronymic,
        'email': user.email,
        'phone': profile.phone,
        'business_form': profile.business_form,
        'business_form_label': BUSINESS_FORM_LABELS.get(profile.business_form, ''),
        'inn': profile.inn,
        'reg_date': user.date_joined.strftime('%d.%m.%Y'),
        'seller_needs_verification': profile.seller_needs_verification,
    }


def _product_admin_payload(request, product):
    from .seller_views import _product_payload
    data = _product_payload(request, product)
    data['seller'] = _seller_info(product.seller) if product.seller else None
    show_seller = False
    if product.seller:
        sp, _ = UserProfile.objects.get_or_create(user=product.seller)
        other_published = Product.objects.filter(
            seller=product.seller, status='published'
        ).exclude(pk=product.pk).exists()
        show_seller = sp.seller_needs_verification or not other_published
    data['show_seller_details'] = show_seller
    return data


def _user_admin_payload(user):
    profile, _ = UserProfile.objects.get_or_create(user=user)
    data = {
        'id': user.id,
        'first_name': user.first_name,
        'last_name': user.last_name,
        'email': user.email,
        'phone': profile.phone,
        'city': profile.city,
        'role': profile.role,
        'role_label': dict(UserProfile.ROLE_CHOICES).get(profile.role, profile.role),
        'birth_date': _format_birth_date(profile.birth_date),
        'gender': profile.gender,
        'gender_label': GENDER_LABELS.get(profile.gender, ''),
        'reg_date': user.date_joined.strftime('%d.%m.%Y'),
    }
    if profile.role == 'seller':
        data['patronymic'] = profile.patronymic
        data['business_form'] = profile.business_form
        data['business_form_label'] = BUSINESS_FORM_LABELS.get(profile.business_form, '')
        data['inn'] = profile.inn
    return data


def _update_product_rating(product):
    qs = ProductReview.objects.filter(product=product, status='published')
    product.reviews_count = qs.count()
    avg = qs.aggregate(avg=Avg('rating'))['avg']
    product.rating = round(float(avg), 1) if avg is not None else 0
    product.save(update_fields=['reviews_count', 'rating'])


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_tickets(request):
    if not _require_admin(request.user):
        return Response({'error': 'Доступ только для администратора'}, status=403)
    tickets = SupportTicket.objects.select_related('user').order_by('-created_at')
    return Response([
        {
            'id': t.id,
            'first_name': t.first_name,
            'last_name': t.last_name,
            'phone': t.phone,
            'email': t.email,
            'description': t.description,
            'status': t.status,
            'created_at': t.created_at.strftime('%d.%m.%Y %H:%M'),
            'user_id': t.user_id,
        }
        for t in tickets
    ])


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def admin_ticket_close(request, ticket_id):
    if not _require_admin(request.user):
        return Response({'error': 'Доступ только для администратора'}, status=403)
    try:
        ticket = SupportTicket.objects.get(pk=ticket_id)
    except SupportTicket.DoesNotExist:
        return Response({'error': 'Обращение не найдено'}, status=404)
    ticket.status = 'closed'
    ticket.save(update_fields=['status'])
    return Response({'success': True})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_product_submissions(request):
    if not _require_admin(request.user):
        return Response({'error': 'Доступ только для администратора'}, status=403)
    products = Product.objects.filter(status='pending').select_related('seller', 'category').prefetch_related('gallery')
    return Response([_product_admin_payload(request, p) for p in products])


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def admin_product_moderate(request, product_id):
    if not _require_admin(request.user):
        return Response({'error': 'Доступ только для администратора'}, status=403)
    action = request.data.get('action')
    reason = str(request.data.get('reason', '')).strip()
    try:
        product = Product.objects.get(pk=product_id)
    except Product.DoesNotExist:
        return Response({'error': 'Товар не найден'}, status=404)

    if action == 'approve':
        product.status = 'published'
        product.status_reason = ''
        product.moderated_at = timezone.now()
        product.save(update_fields=['status', 'status_reason', 'moderated_at'])
        if product.seller:
            profile, _ = UserProfile.objects.get_or_create(user=product.seller)
            profile.seller_needs_verification = False
            profile.save(update_fields=['seller_needs_verification'])
        return Response({'success': True, 'status': 'published'})
    if action == 'reject':
        if not reason:
            return Response({'error': 'Укажите причину отклонения'}, status=400)
        product.status = 'rejected'
        product.status_reason = reason
        product.moderated_at = timezone.now()
        product.save(update_fields=['status', 'status_reason', 'moderated_at'])
        return Response({'success': True, 'status': 'rejected'})
    return Response({'error': 'Укажите action: approve или reject'}, status=400)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_products(request):
    if not _require_admin(request.user):
        return Response({'error': 'Доступ только для администратора'}, status=403)
    status_filter = request.query_params.get('status')
    qs = Product.objects.select_related('seller', 'category').prefetch_related('gallery').order_by('-id')
    if status_filter:
        qs = qs.filter(status=status_filter)
    return Response([_product_admin_payload(request, p) for p in qs])


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def admin_product_remove(request, product_id):
    if not _require_admin(request.user):
        return Response({'error': 'Доступ только для администратора'}, status=403)
    reason = str(request.data.get('reason', '')).strip()
    if not reason:
        return Response({'error': 'Укажите причину удаления'}, status=400)
    try:
        product = Product.objects.get(pk=product_id)
    except Product.DoesNotExist:
        return Response({'error': 'Товар не найден'}, status=404)
    product.status = 'removed'
    product.status_reason = reason
    product.moderated_at = timezone.now()
    product.save(update_fields=['status', 'status_reason', 'moderated_at'])
    return Response({'success': True})


@api_view(['GET', 'PATCH'])
@permission_classes([IsAuthenticated])
def admin_users(request):
    if not _require_admin(request.user):
        return Response({'error': 'Доступ только для администратора'}, status=403)

    if request.method == 'GET':
        role = request.query_params.get('role')
        qs = User.objects.select_related('profile').order_by('-date_joined')
        if role:
            qs = qs.filter(profile__role=role)
        return Response([_user_admin_payload(u) for u in qs])

    user_id = request.data.get('user_id')
    if not user_id:
        return Response({'error': 'Укажите user_id'}, status=400)
    try:
        user = User.objects.get(pk=user_id)
    except User.DoesNotExist:
        return Response({'error': 'Пользователь не найден'}, status=404)
    profile, _ = UserProfile.objects.get_or_create(user=user)
    if 'first_name' in request.data:
        user.first_name = str(request.data['first_name']).strip()
    if 'last_name' in request.data:
        user.last_name = str(request.data['last_name']).strip()
    if 'email' in request.data:
        user.email = str(request.data['email']).strip()
    if 'phone' in request.data:
        profile.phone = str(request.data['phone']).strip()
    if 'city' in request.data:
        profile.city = str(request.data['city']).strip()
    if 'birth_date' in request.data:
        profile.birth_date = _parse_birth_date(request.data['birth_date'])
    if 'gender' in request.data:
        g = str(request.data['gender']).strip()
        profile.gender = g if g in ('male', 'female') else ''
    if 'patronymic' in request.data:
        profile.patronymic = str(request.data['patronymic']).strip()
        profile.seller_needs_verification = True
    if 'business_form' in request.data:
        profile.business_form = str(request.data['business_form']).strip()
        profile.seller_needs_verification = True
    if 'inn' in request.data:
        profile.inn = str(request.data['inn']).strip()
        profile.seller_needs_verification = True
    if 'role' in request.data and str(request.data['role']) in ('user', 'seller', 'admin'):
        profile.role = request.data['role']
    user.save()
    profile.save()
    return Response(_user_admin_payload(user))


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_reviews(request):
    if not _require_admin(request.user):
        return Response({'error': 'Доступ только для администратора'}, status=403)
    status_filter = request.query_params.get('status', 'pending')
    reviews = (
        ProductReview.objects.filter(status=status_filter)
        .select_related('user', 'product')
        .order_by('-created_at')
    )
    return Response([
        {
            'id': r.id,
            'product_id': r.product_id,
            'product_title': r.product.title,
            'author': f'{r.user.first_name} {r.user.last_name}'.strip() or r.user.email,
            'rating': r.rating,
            'text': r.text,
            'status': r.status,
            'date': r.created_at.strftime('%d.%m.%Y'),
        }
        for r in reviews
    ])


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def admin_review_moderate(request, review_id):
    if not _require_admin(request.user):
        return Response({'error': 'Доступ только для администратора'}, status=403)
    action = request.data.get('action')
    try:
        review = ProductReview.objects.select_related('product').get(pk=review_id)
    except ProductReview.DoesNotExist:
        return Response({'error': 'Отзыв не найден'}, status=404)
    if action == 'approve':
        review.status = 'published'
        review.save(update_fields=['status'])
        _update_product_rating(review.product)
        return Response({'success': True})
    if action == 'reject':
        review.status = 'rejected'
        review.save(update_fields=['status'])
        _update_product_rating(review.product)
        return Response({'success': True})
    return Response({'error': 'action: approve или reject'}, status=400)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_analytics(request):
    if not _require_admin(request.user):
        return Response({'error': 'Доступ только для администратора'}, status=403)

    now = timezone.now()
    day_ago = now - timedelta(hours=24)
    week_ago = now - timedelta(days=7)

    visits_24h = SiteVisit.objects.filter(visited_at__gte=day_ago).count()
    visits_7d = SiteVisit.objects.filter(visited_at__gte=week_ago).count()
    new_users_24h = User.objects.filter(date_joined__gte=day_ago).count()

    received_orders = Order.objects.filter(status='received')
    sales_count_24h = received_orders.filter(received_at__gte=day_ago.date()).count()
    sales_count_total = received_orders.count()

    revenue_total = OrderItem.objects.filter(order__status='received').aggregate(
        s=Sum(F('price') * F('quantity'))
    )['s'] or Decimal('0')

    revenue_24h = OrderItem.objects.filter(
        order__status='received',
        order__received_at__gte=day_ago.date(),
    ).aggregate(s=Sum(F('price') * F('quantity')))['s'] or Decimal('0')

    pending_products = Product.objects.filter(status='pending').count()
    pending_reviews = ProductReview.objects.filter(status='pending').count()
    open_tickets = SupportTicket.objects.filter(status='open').count()

    visits_by_day = []
    for i in range(6, -1, -1):
        d_start = (now - timedelta(days=i)).replace(hour=0, minute=0, second=0, microsecond=0)
        d_end = d_start + timedelta(days=1)
        visits_by_day.append({
            'label': d_start.strftime('%d.%m'),
            'value': SiteVisit.objects.filter(visited_at__gte=d_start, visited_at__lt=d_end).count(),
        })

    sales_by_day = []
    for i in range(6, -1, -1):
        d = (now - timedelta(days=i)).date()
        cnt = Order.objects.filter(status='received', received_at=d).count()
        sales_by_day.append({'label': d.strftime('%d.%m'), 'value': cnt})

    users_by_role = UserProfile.objects.values('role').annotate(count=Count('id'))

    return Response({
        'visits_24h': visits_24h,
        'visits_7d': visits_7d,
        'new_users_24h': new_users_24h,
        'sales_count_24h': sales_count_24h,
        'sales_count_total': sales_count_total,
        'revenue_total': float(revenue_total),
        'revenue_24h': float(revenue_24h),
        'pending_products': pending_products,
        'pending_reviews': pending_reviews,
        'open_tickets': open_tickets,
        'visits_chart': visits_by_day,
        'sales_chart': sales_by_day,
        'users_by_role': list(users_by_role),
    })


@api_view(['POST'])
@permission_classes([AllowAny])
def track_visit(request):
    path = str(request.data.get('path', '/'))[:255]
    user = request.user if request.user.is_authenticated else None
    SiteVisit.objects.create(path=path, user=user)
    return Response({'success': True})
