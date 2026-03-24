import smtplib
import os
import requests
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from django.conf import settings

from .models import ExternalNotificationLog

def send_account_creation_notification(user, plain_password):
    """
    Orchestrates the notification flow and LOGS the results.
    """
    subject = "Welcome to Bavya TGS - Your Account is Ready"
    body = f"""
    Hello {user.name},
    
    Your account on the Bavya Travel Governance System has been created successfully.
    
    Your Login Credentials:
    - Employee ID: {user.employee_id}
    - Temp Password: {plain_password}
    
    Please login to the TGS Portal with your credentials and change your password at your earliest convenience.
    
    Regards,
    TGS Administration Team
    """

    # 1. Try EMAIL
    if user.email:
        success, error = send_email_smtp(user.email, subject, body)
        ExternalNotificationLog.objects.create(
            user=user,
            type='EMAIL',
            recipient=user.email,
            status='SENT' if success else 'FAILED',
            error_details=error if not success else None
        )
        if success:
            print(f"Account notification sent via EMAIL to {user.email}")
            return True
    
    # 2. Try SMS as Fallback
    if user.phone:
        success, error = send_sms_gateway(user.phone, f"Welcome to TGS! ID: {user.employee_id}, Pass: {plain_password}. Please login to your TGS portal to continue.")
        ExternalNotificationLog.objects.create(
            user=user,
            type='SMS',
            recipient=user.phone,
            status='SENT' if success else 'FAILED',
            error_details=str(error) if not success else None
        )
        if success:
            print(f"Account notification sent via SMS to {user.phone}")
            return True

    print(f"No notification sent for {user.employee_id} - No contact info found.")
    return False

def send_email_smtp(to_email, subject, body):
    """Sends email using SMTP settings from .env and returns (Success, ErrorMsg)"""
    host = os.getenv('EMAIL_HOST')
    port = os.getenv('EMAIL_PORT', 587)
    user = os.getenv('EMAIL_HOST_USER')
    password = os.getenv('EMAIL_HOST_PASSWORD')
    from_email = os.getenv('EMAIL_FROM', user)
    display_name = "Bavya TGS"

    if not all([host, user, password]):
        return False, "SMTP Configuration missing in .env"

    try:
        msg = MIMEMultipart()
        msg['From'] = f"{display_name} <{from_email}>"
        msg['To'] = to_email
        msg['Subject'] = subject
        msg.attach(MIMEText(body, 'plain'))

        server = smtplib.SMTP(host, int(port))
        server.starttls()
        server.login(user, password)
        server.send_message(msg)
        server.quit()
        return True, None
    except Exception as e:
        return False, str(e)

def send_sms_gateway(phone_number, message):
    """
    Sends SMS and returns (Success, ErrorMsg)
    """
    api_url = os.getenv('SMS_GATEWAY_URL')
    api_key = os.getenv('SMS_API_KEY')
    sender_id = os.getenv('SMS_SENDER_ID', 'BAVTGS')
    
    if not all([api_url, api_key]):
        return False, "SMS Gateway configuration missing in .env"

    try:
        payload = {
            'apikey': api_key,
            'numbers': phone_number,
            'message': message,
            'sender': sender_id
        }
        
        response = requests.post(api_url, data=payload, timeout=10)
        if response.status_code == 200:
            return True, None
        return False, f"Status {response.status_code}: {response.text}"
    except Exception as e:
        return False, str(e)
