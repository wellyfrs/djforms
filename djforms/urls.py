from django.urls import path

from . import views

urlpatterns = [
    path("", views.index, name="index"),
    path("login", views.login_view, name="login"),
    path("logout", views.logout_view, name="logout"),
    path("register", views.register, name="register"),

    path("forms/create", views.create, name="create"),

    path("forms/<slug:form_id>", views.respond, name="respond"),
    path("forms/<slug:form_id>/edit", views.edit, name="edit"),
    path("forms/<slug:form_id>/responses", views.form_responses, name="form_responses"),
    path("forms/<slug:form_id>/responses/download", views.download, name="download"),

    path("responses/", views.user_responses, name="user_responses"),
    path("responses/<slug:response_id>", views.response, name="response"),

    path("api/forms/<slug:form_id>", views.api_forms, name="api_forms"),
    path("api/forms/<slug:form_id>/settings", views.api_form_settings, name="api_form_settings"),
    path("api/forms/<slug:form_id>/responses/<slug:response_id>", views.api_form_responses, name="api_form_responses"),
]
