from django.contrib.auth.models import AbstractUser
from django.core.exceptions import ValidationError
from django.core.validators import RegexValidator
from django.db import models
from django.utils import timezone


class User(AbstractUser):
    pass


class Form(models.Model):
    id = models.BigAutoField(auto_created=True, primary_key=True, verbose_name="ID")
    title = models.CharField(max_length=256, validators=[RegexValidator(regex=".*\\S+.*")])
    description = models.CharField(max_length=1024, blank=True, validators=[RegexValidator(regex=".*\\S+.*")])
    created_by = models.ForeignKey(User, on_delete=models.CASCADE)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(blank=True, null=True)

    def serialize(self):
        """
        Custom serialization (instead of Django’s serialization framework) for custom properties
        """
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "created_by": self.created_by.username,
            "created_at": self.created_at.strftime("%b %d %Y, %I:%M %p"),
            "updated_at": self.updated_at.strftime("%b %d %Y, %I:%M %p") if self.updated_at else None,
            "settings": self.settings.serialize(),
            "questions": [question.serialize() for question in self.questions.all()],
        }

    def __str__(self):
        return f"{self.title} ({self.id})"


class Question(models.Model):
    class QuestionType(models.TextChoices):
        SHORT_TEXT = "SHORT_TEXT", "Short text"
        LONG_TEXT = "LONG_TEXT", "Long text"
        RADIO = "RADIO", "Radio"
        CHECKBOX = "CHECKBOX", "Checkbox"

    id = models.BigAutoField(auto_created=True, primary_key=True, verbose_name="ID")
    form = models.ForeignKey(Form, on_delete=models.CASCADE, related_name="questions")
    text = models.CharField(max_length=256, validators=[RegexValidator(regex=".*\\S+.*")])
    type = models.CharField(max_length=48, choices=QuestionType.choices)
    is_required = models.BooleanField(default=True)
    order = models.IntegerField()

    class Meta:
        ordering = ["order"]
        unique_together = [["form", "order"]]

    def serialize(self):
        """
        Custom serialization (instead of Django’s serialization framework) for custom properties
        """
        return {
            "id": self.id,
            "text": self.text,
            "type": self.type,
            "is_required": self.is_required,
            "order": self.order,
            "options": [option.serialize() for option in self.options.all()]
        }

    def __str__(self):
        return f"{self.order}. {self.text} ({self.id})"


class Option(models.Model):
    id = models.BigAutoField(auto_created=True, primary_key=True, verbose_name="ID")
    question = models.ForeignKey(Question, on_delete=models.CASCADE, related_name="options")
    text = models.CharField(max_length=256, validators=[RegexValidator(regex=".*\\S+.*")])
    order = models.IntegerField()

    class Meta:
        ordering = ["order"]
        unique_together = [["question", "text"], ["question", "order"]]

    def serialize(self):
        """
        Custom serialization (instead of Django’s serialization framework) for custom properties
        """
        return {
            "id": self.id,
            "text": self.text,
            "order": self.order,
        }

    def __str__(self):
        return f"{self.order}. {self.text} ({self.id})"


class Settings(models.Model):
    form = models.OneToOneField(
        Form,
        on_delete=models.CASCADE,
        primary_key=True,
        related_name="settings"
    )
    is_open = models.BooleanField(default=True)
    authenticated_response = models.BooleanField(default=False)
    multiple_response = models.BooleanField(default=True)

    class Meta:
        verbose_name_plural = "settings"

    def serialize(self):
        """
        Custom serialization (instead of Django’s serialization framework) for custom properties
        """
        return {
            "is_open": self.is_open,
            "authenticated_response": self.authenticated_response,
            "multiple_response": self.multiple_response,
        }

    @property
    def is_another_response_allowed(self):
        return (self.is_open and
                (not self.authenticated_response or (self.authenticated_response and self.multiple_response)))

    def __str__(self):
        return f"Settings for {self.form.id}"


class Response(models.Model):
    id = models.BigAutoField(auto_created=True, primary_key=True, verbose_name="ID")
    form = models.ForeignKey(Form, on_delete=models.CASCADE)
    user = models.ForeignKey(User, blank=True, null=True, on_delete=models.CASCADE)
    created_at = models.DateTimeField(default=timezone.now)

    def clean(self):
        super().clean()

        if self.form.settings.authenticated_response and not self.user:
            raise ValidationError({"user": "User is required for authenticated responses"})

    def answers_as_dict(self):
        """
        Converts answers to a dict with the question ID as the key root, and the answer as the value.

        - In case of short and long text question type, the text is used as the answer value.
        - In case of radio question type, the chosen option ID is used as the answer value.
        - In case of checkbox question type, the list of the chosen option IDs is used as the answer value.
        """
        answers = {}

        for answer in self.answers.all():
            if answer.question.type in [Question.QuestionType.SHORT_TEXT, Question.QuestionType.LONG_TEXT]:
                answers.setdefault(answer.question.id, answer.text)
            elif answer.question.type == Question.QuestionType.RADIO:
                answers.setdefault(answer.question.id, answer.choices.all()[0].id)
            elif answer.question.type == Question.QuestionType.CHECKBOX:  # checkbox questions
                answers.setdefault(answer.question.id, [option.id for option in answer.choices.all()])
            else:
                raise ValueError(f"Question type {answer.question.type} not supported")

        return answers

    def __str__(self):
        return f"{self.form.title} ({self.form.id}) - {self.id}"


class Answer(models.Model):
    id = models.BigAutoField(auto_created=True, primary_key=True, verbose_name="ID")
    response = models.ForeignKey(Response, on_delete=models.CASCADE, related_name="answers")
    question = models.ForeignKey(Question, on_delete=models.CASCADE, related_name="answers")
    text = models.TextField(blank=True, validators=[RegexValidator(regex=".*\\S+.*")])
    choices = models.ManyToManyField(Option, blank=True)

    def clean(self):
        super().clean()

        if self.response.form != self.question.form:
            message = "Answer for a question of a form different form the response"
            raise ValidationError({"response": message, "question": message})

        for option in self.choices.all():
            if option.question != self.question:
                raise ValidationError({"choices": "Option does not belong to the question"})

        if self.question.is_required:
            if self.question.type in [Question.QuestionType.SHORT_TEXT,
                                      Question.QuestionType.LONG_TEXT] and not self.text:
                raise ValidationError({"text": "Text required for short or long text question"})

            if self.question.type == Question.QuestionType.RADIO and self.choices.count() != 1:
                raise ValidationError({"choices": "Unique option required for radio question"})

            if self.question.type == Question.QuestionType.CHECKBOX and self.choices.count() == 0:
                raise ValidationError({"choices": "At least one option required for checkbox question"})

    def __str__(self):
        return f"Answer ({self.id}) for {self.question}"
