from django.db import models

class Category(models.Model):
    id = models.CharField(max_length=50, primary_key=True)
    name = models.CharField(max_length=100)
    icon = models.CharField(max_length=10)

    def __str__(self):
        return self.name

class Product(models.Model):
    title = models.CharField(max_length=255)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    old_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    category = models.ForeignKey(Category, on_delete=models.CASCADE, related_name='products')
    rating = models.FloatField(default=0)
    reviews_count = models.IntegerField(default=0)
    manufacturer = models.CharField(max_length=255)
    city = models.CharField(max_length=100)
    image = models.ImageField(upload_to='products/', blank=True, null=True)
    is_local_verified = models.BooleanField(default=False)

    def __str__(self):
        return self.title