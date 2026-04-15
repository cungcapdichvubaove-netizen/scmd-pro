import os
from celery import Celery

# Thiết lập Django settings module cho celery
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'settings.base')

app = Celery('scmd')

# Sử dụng Redis làm Broker và Backend
# Trong môi trường thực tế, các giá trị này lấy từ biến môi trường
app.config_from_object('django.conf:settings', namespace='CELERY')

# Tự động khám phá các tasks trong các app đã đăng ký
app.autodiscover_tasks()

# Cấu hình Queue và Retry mặc định
app.conf.task_queues = {
    'default': {
        'exchange': 'default',
        'routing_key': 'default',
    },
    'high_priority': {
        'exchange': 'high_priority',
        'routing_key': 'high_priority',
    }
}

app.conf.task_default_queue = 'default'
app.conf.task_soft_time_limit = 300 # 5 phút
app.conf.task_time_limit = 600 # 10 phút
