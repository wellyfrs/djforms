from django import forms

from .models import Form, Question, Option, Settings


class FormForm(forms.ModelForm):
    class Meta:
        model = Form
        fields = ["title", "description", "updated_at"]


class QuestionForm(forms.ModelForm):
    class Meta:
        model = Question
        fields = ["form", "text", "type", "is_required", "order"]


class OptionForm(forms.ModelForm):
    class Meta:
        model = Option
        fields = ["question", "text", "order"]


class SettingsForm(forms.ModelForm):
    class Meta:
        model = Settings
        fields = ["is_open", "authenticated_response", "multiple_response"]
