from django.contrib import admin

from .models import User, Form, Question, Option, Settings, Response, Answer


class UserAdmin(admin.ModelAdmin):
    list_display = ["id", "username", "email", "date_joined", "is_active", "is_staff", "is_superuser"]


class FormAdmin(admin.ModelAdmin):
    list_display = ["id", "title", "description", "created_by", "created_at", "updated_at"]


class QuestionAdmin(admin.ModelAdmin):
    list_display = ["id", "form", "order", "type", "text", "is_required"]


class OptionAdmin(admin.ModelAdmin):
    list_display = ["id", "question", "order", "text"]


class SettingsAdmin(admin.ModelAdmin):
    list_display = ["form", "is_open", "authenticated_response", "multiple_response"]


class ResponseAdmin(admin.ModelAdmin):
    list_display = ["id", "form", "user", "created_at"]


class AnswerAdmin(admin.ModelAdmin):
    list_display = ["id", "response", "question", "text"]


admin.site.register(User, UserAdmin)
admin.site.register(Form, FormAdmin)
admin.site.register(Question, QuestionAdmin)
admin.site.register(Option, OptionAdmin)
admin.site.register(Settings, SettingsAdmin)
admin.site.register(Response, ResponseAdmin)
admin.site.register(Answer, AnswerAdmin)
