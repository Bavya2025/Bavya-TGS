from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = "django-insecure-2+wg90pxjk^*ntkh**68*1)h4-9t0_%lg8@&)1ihhdk6c3ev0x"
DEBUG = True
ALLOWED_HOSTS = ["*"]

INSTALLED_APPS = [
    "django.contrib.contenttypes",
    "django.contrib.staticfiles",
    
    "rest_framework",
    "corsheaders",

    "core",
    "api_management",
    "travel",
    "guest_house",
    "travel_masters",
    "fleet",
]

MIDDLEWARE = [
    "api_management.middleware.APILoggingMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "core.middleware.CustomAuthMiddleware",
    "core.middleware.ThreadLocalMiddleware",
    "travel.middleware.PageAccessMiddleware",
]

ROOT_URLCONF = "tgs_backend.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
            ],
        },
    },
]

WSGI_APPLICATION = "tgs_backend.wsgi.application"

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.mysql",
        "NAME": "tgs_v",
        "USER": "root",
        "PASSWORD": "Ramprasad1819@",
        "HOST": "localhost",
        "PORT": "3306",
    }
}

CORS_ALLOW_ALL_ORIGINS = True

DATA_UPLOAD_MAX_MEMORY_SIZE = 10485760
FILE_UPLOAD_MAX_MEMORY_SIZE = 10485760

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [],
    'DEFAULT_PERMISSION_CLASSES': [
        'core.permissions.IsCustomAuthenticated',
    ],
    'UNAUTHENTICATED_USER': None,
}

AUTH_USER_MODEL = 'core.User'

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
