from rest_framework import viewsets
from django.db import models
from .models import Category, Product
from .serializers import CategorySerializer, ProductSerializer

class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer

class ProductViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer

    def get_queryset(self):
        qs = Product.objects.all()
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