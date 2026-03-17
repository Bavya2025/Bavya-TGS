from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from .models import ChatSession, ChatMessage, SupportTicket
from .services import get_bot_response

class ChatBotViewSet(viewsets.ViewSet):
    """
    ViewSet for handling chatbot interactions.
    """
    
    @action(detail=False, methods=['post'])
    def message(self, request):
        user = getattr(request, 'custom_user', None)
        message_text = request.data.get('message')
        session_id = request.data.get('session_id', 'global-default')
        
        if not message_text:
            return Response({"error": "Message is required"}, status=status.HTTP_400_BAD_REQUEST)

        # v12.5: Restore requested_lang to fix NameError
        requested_lang = request.data.get('language', 'en')
        # v12.5: Receive reply, language, and detected_lang from services
        reply, effective_lang, detected_lang = get_bot_response(user, message_text, session_id, language=requested_lang)
        
        return Response({
            "reply": reply,
            "session_id": session_id,
            "language": effective_lang,
            "detected_language": detected_lang
        })

    @action(detail=False, methods=['get'])
    def history(self, request):
        session_id = request.query_params.get('session_id')
        if not session_id:
            return Response({"error": "Session ID required"}, status=400)
            
        messages = ChatMessage.objects.filter(session__session_id=session_id).order_by('timestamp')
        data = [{"sender": m.sender, "text": m.message, "time": m.timestamp} for m in messages]
        return Response(data)

class SupportTicketViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing support tickets.
    """
    queryset = SupportTicket.objects.all()
    
    def get_queryset(self):
        user = getattr(self.request, 'custom_user', None)
        if not user:
            return SupportTicket.objects.none()
            
        # If admin, show all, otherwise show only own
        role_name = user.role.name.lower() if user.role else ''
        if any(kw in role_name for kw in ['admin', 'superuser']):
            return SupportTicket.objects.all().order_by('-created_at')
            
        return SupportTicket.objects.filter(user=user).order_by('-created_at')

    def perform_create(self, serializer):
        user = getattr(self.request, 'custom_user', None)
        serializer.save(user=user)
