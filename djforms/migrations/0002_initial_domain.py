# Generated by Django 4.2.6 on 2023-10-23 10:41

from django.conf import settings
import django.core.validators
from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone


class Migration(migrations.Migration):

    dependencies = [
        ('djforms', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='Form',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('title', models.CharField(max_length=256, validators=[django.core.validators.RegexValidator(regex='.*\\S+.*')])),
                ('description', models.CharField(blank=True, max_length=1024, validators=[django.core.validators.RegexValidator(regex='.*\\S+.*')])),
                ('created_at', models.DateTimeField(default=django.utils.timezone.now)),
                ('updated_at', models.DateTimeField(blank=True, null=True)),
                ('created_by', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.CreateModel(
            name='Settings',
            fields=[
                ('form', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, primary_key=True, related_name='settings', serialize=False, to='djforms.form')),
                ('is_open', models.BooleanField(default=True)),
                ('authenticated_response', models.BooleanField(default=False)),
                ('multiple_response', models.BooleanField(default=True)),
            ],
        ),
        migrations.CreateModel(
            name='Response',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(default=django.utils.timezone.now)),
                ('form', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='djforms.form')),
                ('user', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.CreateModel(
            name='Question',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('text', models.CharField(max_length=256, validators=[django.core.validators.RegexValidator(regex='.*\\S+.*')])),
                ('type', models.CharField(choices=[('SHORT_TEXT', 'Short text'), ('LONG_TEXT', 'Long text'), ('RADIO', 'Radio'), ('CHECKBOX', 'Checkbox')], max_length=48)),
                ('is_required', models.BooleanField(default=True)),
                ('order', models.IntegerField()),
                ('form', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='questions', to='djforms.form')),
            ],
            options={
                'ordering': ['order'],
                'unique_together': {('form', 'order')},
            },
        ),
        migrations.CreateModel(
            name='Option',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('text', models.CharField(max_length=256, validators=[django.core.validators.RegexValidator(regex='.*\\S+.*')])),
                ('order', models.IntegerField()),
                ('question', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='options', to='djforms.question')),
            ],
            options={
                'ordering': ['order'],
                'unique_together': {('question', 'text'), ('question', 'order')},
            },
        ),
        migrations.CreateModel(
            name='Answer',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('text', models.TextField(blank=True, validators=[django.core.validators.RegexValidator(regex='.*\\S+.*')])),
                ('choices', models.ManyToManyField(blank=True, to='djforms.option')),
                ('question', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='answers', to='djforms.question')),
                ('response', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='answers', to='djforms.response')),
            ],
        ),
    ]