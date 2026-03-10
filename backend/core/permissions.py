from rest_framework import permissions

class IsCustomAuthenticated(permissions.BasePermission):

    def has_permission(self, request, view):
        return bool(getattr(request, 'custom_user', None)) or getattr(request, 'is_api_key_authenticated', False)
class IsAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        user = getattr(request, 'custom_user', None)
        if not user or not user.role:
            return False

        role_name = user.role.name.lower() if user.role else ''
        is_superuser = getattr(user, 'is_superuser', False)
        
        return role_name in ['admin', 'it-admin', 'superuser'] or is_superuser

class IsGuestHouseManager(permissions.BasePermission):
    def has_permission(self, request, view):
        user = getattr(request, 'custom_user', None)
        if not user or not user.role:
            return False

        role_name = user.role.name.lower() if user.role else ''
        is_superuser = getattr(user, 'is_superuser', False)
        
        return role_name in ['admin', 'it-admin', 'superuser', 'guesthousemanager'] or is_superuser
