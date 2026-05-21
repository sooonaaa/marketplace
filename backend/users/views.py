from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken

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
        first_name=name
    )

    refresh = RefreshToken.for_user(user)
    return Response({
        'access': str(refresh.access_token),
        'refresh': str(refresh),
        'name': user.first_name,
        'email': user.email,
    }, status=201)


@api_view(['POST'])
def login(request):
    from django.contrib.auth import authenticate
    email = request.data.get('email', '')
    password = request.data.get('password', '')

    user = authenticate(username=email, password=password)
    if user is None:
        return Response({'error': 'Неверный логин или пароль'}, status=400)

    refresh = RefreshToken.for_user(user)
    return Response({
        'access': str(refresh.access_token),
        'refresh': str(refresh),
        'name': user.first_name,
        'email': user.email,
    })