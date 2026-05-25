from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


def publish_existing_reviews(apps, schema_editor):
    ProductReview = apps.get_model('users', 'ProductReview')
    ProductReview.objects.all().update(status='published')


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0005_promotion_extended'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name='userprofile',
            name='seller_needs_verification',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='productreview',
            name='status',
            field=models.CharField(
                choices=[
                    ('pending', 'На модерации'),
                    ('published', 'Опубликован'),
                    ('rejected', 'Отклонён'),
                ],
                default='pending',
                max_length=20,
            ),
        ),
        migrations.RunPython(publish_existing_reviews, migrations.RunPython.noop),
        migrations.CreateModel(
            name='SupportTicket',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('first_name', models.CharField(max_length=100)),
                ('last_name', models.CharField(max_length=100)),
                ('phone', models.CharField(max_length=30)),
                ('email', models.EmailField(max_length=254)),
                ('description', models.TextField()),
                ('status', models.CharField(
                    choices=[('open', 'Открыто'), ('closed', 'Закрыто')],
                    default='open',
                    max_length=20,
                )),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('user', models.ForeignKey(
                    blank=True,
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='support_tickets',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={'ordering': ['-created_at']},
        ),
        migrations.CreateModel(
            name='SiteVisit',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('visited_at', models.DateTimeField(auto_now_add=True)),
                ('path', models.CharField(blank=True, default='/', max_length=255)),
                ('user', models.ForeignKey(
                    blank=True,
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={'ordering': ['-visited_at']},
        ),
    ]
