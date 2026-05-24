from django.urls import path
from . import views

urlpatterns = [
    path('register/', views.register),
    path('login/', views.login),
    path('me/', views.me),
    path('orders/', views.orders_list),
    path('orders/create/', views.create_order),
    path('orders/<int:order_id>/review/', views.submit_review),
    path('orders/<int:order_id>/return/', views.submit_return),
]