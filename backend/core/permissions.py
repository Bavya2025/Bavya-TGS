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
        
        # Fix: Robust admin check
        is_admin = any(kw in role_name for kw in ['admin', 'it-admin', 'superuser'])
        return is_admin or is_superuser

class IsGuestHouseManager(permissions.BasePermission):
    def has_permission(self, request, view):
        user = getattr(request, 'custom_user', None)
        if not user or not user.role:
            return False

        role_name = user.role.name.lower() if user.role else ''
        is_superuser = getattr(user, 'is_superuser', False)
        
        # Fix: Robust check
        is_privileged = any(kw in role_name for kw in ['admin', 'it-admin', 'superuser', 'guesthousemanager'])
        return is_privileged or is_superuser
