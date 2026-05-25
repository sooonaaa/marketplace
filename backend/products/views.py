from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import models
from .models import Category, Product
from .serializers import CategorySerializer, ProductSerializer
from .category_specs import get_category_spec_templates, PRODUCT_STATUS_LABELS


class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer

    @action(detail=True, methods=['get'])
    def spec_fields(self, request, pk=None):
        category = self.get_object()
        return Response(get_category_spec_templates(category.pk))


class ProductViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Product.objects.filter(status='published')
    serializer_class = ProductSerializer

    def get_queryset(self):
        qs = Product.objects.filter(status='published')
        category = self.request.query_params.get('category')
        search = self.request.query_params.get('search')

        if category and category != 'all':
            qs = qs.filter(category_id=category)

        if search:
            qs = qs.filter(
                models.Q(title__icontains=search) |
                models.Q(manufacturer__icontains=search) |
                models.Q(city__icontains=search)
            )

        return qs

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.status != 'published':
            return Response({'detail': 'Товар недоступен'}, status=404)
        return super().retrieve(request, *args, **kwargs)

    @action(detail=True, methods=['get'])
    def reviews(self, request, pk=None):
        from users.models import ProductReview

        product = self.get_object()
        if product.status != 'published':
            return Response([])
        reviews = (
            ProductReview.objects.filter(product=product, status='published')
            .select_related('user')
            .order_by('-created_at')
        )
        data = [
            {
                'id': review.pk,
                'author': _review_author(review.user),
                'first_name': review.user.first_name,
                'last_name': review.user.last_name,
                'rating': review.rating,
                'text': review.text,
                'date': review.created_at.strftime('%d.%m.%Y'),
            }
            for review in reviews
        ]
        return Response(data)


def _review_author(user):
    name = f'{user.first_name} {user.last_name}'.strip()
    return name or user.email.split('@')[0]
