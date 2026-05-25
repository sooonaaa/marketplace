import re
import secrets
import string
from datetime import timedelta

from django.conf import settings
from django.contrib.auth.models import User
from django.core.mail import send_mail
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .models import PasswordResetCode, UserProfile


def _normalize_phone(phone: str) -> str:
    digits = re.sub(r'\D', '', phone)
    if digits.startswith('8'):
        digits = '7' + digits[1:]
    if len(digits) == 10:
        digits = '7' + digits
    return digits


def _validate_password(password: str):
    if len(password) < 6 or len(password) > 20:
        return 'Пароль: от 6 до 20 символов'
    if not re.match(r'^[a-zA-Z0-9]+$', password):
        return 'Пароль: только латинские буквы и цифры'
    if not re.search(r'[A-Z]', password):
        return 'Нужна минимум одна заглавная буква'
    if not re.search(r'[0-9]', password):
        return 'Нужна минимум одна цифра'
    return None


def _find_user(email, first_name, last_name, phone, role, patronymic=''):
    try:
        user = User.objects.get(email__iexact=email.strip())
    except User.DoesNotExist:
        return None
    profile, _ = UserProfile.objects.get_or_create(user=user)
    if role == 'seller' and profile.role != 'seller':
        return None
    if role == 'user' and profile.role == 'seller':
        return None
    if user.first_name.strip().lower() != first_name.strip().lower():
        return None
    if user.last_name.strip().lower() != last_name.strip().lower():
        return None
    if role == 'seller' and profile.patronymic.strip().lower() != patronymic.strip().lower():
        return None
    if _normalize_phone(profile.phone) != _normalize_phone(phone):
        return None
    return user


def _send_code_email(email: str, code: str):
    subject = 'ChuvashMP — код восстановления пароля'
    message = (
        f'Ваш код подтверждения: {code}\n\n'
        f'Код действует 15 минут. Запрашивать новый код можно не чаще одного раза в минуту.\n\n'
        f'Если вы не запрашивали восстановление пароля, проигнорируйте это письмо.'
    )
    send_mail(
        subject,
        message,
        getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@chuvashmp.local'),
        [email],
        fail_silently=False,
    )


@api_view(['POST'])
@permission_classes([AllowAny])
def password_reset_request(request):
    email = str(request.data.get('email', '')).strip()
    first_name = str(request.data.get('first_name', '')).strip()
    last_name = str(request.data.get('last_name', '')).strip()
    patronymic = str(request.data.get('patronymic', '')).strip()
    phone = str(request.data.get('phone', '')).strip()
    role = request.data.get('role', 'user')

    if not all([email, first_name, last_name, phone]):
        return Response({'error': 'Заполните все обязательные поля'}, status=400)
    if role == 'seller' and not patronymic:
        return Response({'error': 'Укажите отчество'}, status=400)

    user = _find_user(email, first_name, last_name, phone, role, patronymic)
    if not user:
        return Response({'error': 'Данные не совпадают с учётной записью'}, status=400)

    last = PasswordResetCode.objects.filter(user=user, email__iexact=email).order_by('-last_sent_at').first()
    if last and timezone.now() - last.last_sent_at < timedelta(seconds=60):
        return Response({'error': 'Новый код можно запросить через 1 минуту'}, status=429)

    code = ''.join(secrets.choice(string.digits) for _ in range(6))
    reset_token = secrets.token_urlsafe(32)
    expires = timezone.now() + timedelta(minutes=15)

    PasswordResetCode.objects.filter(user=user, is_verified=False).delete()
    record = PasswordResetCode.objects.create(
        user=user,
        email=email,
        code=code,
        reset_token=reset_token,
        expires_at=expires,
    )

    try:
        _send_code_email(email, code)
    except Exception:
        if settings.DEBUG:
            print(f'[DEV] Password reset code for {email}: {code}')
        else:
            return Response({'error': 'Не удалось отправить письмо. Проверьте настройки почты.'}, status=500)

    return Response({
        'success': True,
        'message': 'Код отправлен на email',
        'reset_token': record.reset_token,
        'dev_code': code if settings.DEBUG else None,
    })


@api_view(['POST'])
@permission_classes([AllowAny])
def password_reset_verify(request):
    reset_token = str(request.data.get('reset_token', '')).strip()
    code = str(request.data.get('code', '')).strip()

    if not reset_token or len(code) != 6:
        return Response({'error': 'Укажите код из 6 цифр'}, status=400)

    try:
        record = PasswordResetCode.objects.get(reset_token=reset_token, is_verified=False)
    except PasswordResetCode.DoesNotExist:
        return Response({'error': 'Запрос не найден. Отправьте форму заново.'}, status=404)

    if timezone.now() > record.expires_at:
        return Response({'error': 'Код истёк. Запросите новый.'}, status=400)
    if record.code != code:
        return Response({'error': 'Неверный код'}, status=400)

    record.is_verified = True
    record.save(update_fields=['is_verified'])
    return Response({'success': True, 'reset_token': record.reset_token})


@api_view(['POST'])
@permission_classes([AllowAny])
def password_reset_confirm(request):
    reset_token = str(request.data.get('reset_token', '')).strip()
    password = str(request.data.get('password', ''))

    err = _validate_password(password)
    if err:
        return Response({'error': err}, status=400)

    try:
        record = PasswordResetCode.objects.get(reset_token=reset_token, is_verified=True)
    except PasswordResetCode.DoesNotExist:
        return Response({'error': 'Сначала подтвердите код из письма'}, status=400)

    if timezone.now() > record.expires_at + timedelta(minutes=30):
        return Response({'error': 'Сессия восстановления истекла'}, status=400)

    user = record.user
    user.set_password(password)
    user.save()
    PasswordResetCode.objects.filter(user=user).delete()
    return Response({'success': True})
