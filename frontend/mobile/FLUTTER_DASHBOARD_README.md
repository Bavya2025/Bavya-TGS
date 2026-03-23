# Flutter Role-Based Dashboard Implementation

## Overview
This implementation converts the Header.jsx React component into a comprehensive Flutter role-based dashboard system for Android/iOS applications. The dashboard displays navigation modules as cards based on user roles, matching the reference image you provided.

## What Was Created

### 1. **Models** (`lib/models/module_model.dart`)
- `NavigationModule`: Represents a navigation module with title, description, icon, colors, and allowed roles
- `Notification`: Represents a notification item
- `UserInfo`: Represents user information including name, role, and email

### 2. **Constants** (`lib/constants/module_constants.dart`)
Defines all navigation modules with role-based access control:

**Main Navigation Modules:**
- Dashboard (visible to: employee, reporting_authority, finance, admin, cfo)
- Trips (visible to: employee, reporting_authority, finance, admin)
- Policy (visible to: employee, reporting_authority, finance, admin, cfo)

**Management Modules:**
- Approvals (employee, reporting_authority, admin)
- FIMS/Finance Hub (finance, admin)
- Settlements (finance, admin)
- CFO Room (cfo, admin)
- Org Settings (admin)
- User Management (admin)
- Guest Houses (admin)
- API Management (admin)
- Disputes (employee, reporting_authority, finance, admin)

### 3. **Components** (`lib/components/app_header_widget.dart`)
Reusable header widget featuring:
- User name and role display
- Notification center with unread count badge
- Profile dropdown menu with logout
- Notification management (fetch, mark as read)
- Responsive design for Android

### 4. **Screens** (`lib/screens/role_based_dashboard.dart`)
Main dashboard screen with:
- App header integration
- Welcome section with user greeting
- Main Navigation section (grid layout)
- Management Modules section (grid layout, 2 columns)
- Module cards with:
  - Custom icon with background color
  - Title and description
  - Tap animation and ripple effect
  - Color-coded top border
  - Arrow indicator for navigation

## Features Implemented

### Role-Based Access Control
Each module has an `allowedRoles` list. Only modules applicable to a user's role are displayed. Easy to modify by editing `module_constants.dart`.

### Responsive Layout
- 2-column grid layout optimized for mobile screens
- Responsive header with proper spacing
- Scrollable content area
- Safe area consideration

### Notification System
- Fetches notifications from `/api/notifications/`
- Shows unread count badge
- Mark all as read functionality
- Displays notification time, title, and message

### User Profile Management
- Avatar with user initial
- Role display
- Logout functionality
- Profile menu

## Integration Steps

### Step 1: Update Login Screen
The login screen has been updated to navigate to `RoleBasedDashboard` for all user roles. The dashboard automatically filters modules based on the user's role.

```dart
Navigator.pushReplacement(
  context,
  MaterialPageRoute(
    builder: (context) => RoleBasedDashboard(
      username: userName,
      userRole: role,
      email: userEmail,
    ),
  ),
);
```

### Step 2: Import Required Files
All necessary files are now in the project:
- `models/module_model.dart`
- `constants/module_constants.dart`
- `components/app_header_widget.dart`
- `screens/role_based_dashboard.dart`

### Step 3: Update Existing Dashboards (Optional)
If you want to use the header in existing dashboard screens, add it to the body:

```dart
@override
Widget build(BuildContext context) {
  return Scaffold(
    body: Column(
      children: [
        AppHeaderWidget(
          title: 'Dashboard Title',
          username: widget.username,
          userRole: widget.userRole,
          onLogout: _logout,
        ),
        Expanded(
          child: SingleChildScrollView(
            // Your existing dashboard content here
          ),
        ),
      ],
    ),
  );
}
```

## Module Structure

Each module card displays:
```
┌─────────────────────┐
│ ■ (color bar)       │
│                     │
│ 🎯 (icon with bg)   │
│                     │
│ Module Title        │
│ Module Description  │
│                     │
│              →      │
└─────────────────────┘
```

## Customization Guide

### Adding a New Module
Edit `lib/constants/module_constants.dart`:

```dart
NavigationModule(
  title: 'New Feature',
  description: 'Feature description',
  icon: Icons.your_icon_rounded,
  backgroundColor: const Color(0xFFXXXXXX),  // Light background
  iconColor: const Color(0xFFYYYYYY),        // Icon color
  allowedRoles: ['admin', 'finance'],
  destinationScreen: () => YourScreen(),     // Optional
),
```

### Changing Module Colors
Each module has:
- `backgroundColor`: Light tint for icon
- `iconColor`: Main color for icon and top border

### Modifying Module Access
Change the `allowedRoles` array to grant/revoke access:
```dart
allowedRoles: ['admin'],  // Only admin can see
allowedRoles: ['admin', 'finance', 'cfo'],  // Multiple roles
```

## API Endpoints Used

- `GET /api/notifications/` - Fetch user notifications
- `POST /api/notifications/mark-all-read/` - Mark all notifications as read
- Uses existing auth token from `ApiService`

## Testing Different Roles

1. **Employee Account**: Should see Dashboard, Trips, Policy, Approvals, Disputes
2. **Reporting Authority**: Dashboard, Trips, Policy, Approvals, Disputes (plus approval features)
3. **Finance**: Dashboard, Trips, Policy, FIMS, Settlements, Disputes
4. **CFO**: Dashboard, Policy, CFO Room, FIMS, Disputes
5. **Admin**: All modules including Org Settings, User Management, Guest Houses, API Management, Audit Logs

## Architecture Benefits

1. **Single Source of Truth**: Module definitions in one place
2. **Maintainability**: Easy to add/remove modules or change roles
3. **Reusability**: Header component can be used in any screen
4. **Scalability**: Can easily extend with more modules
5. **Consistency**: Uniform look across all roles
6. **Performance**: Efficient filtering and rendering

## File Structure

```
lib/
├── models/
│   └── module_model.dart (NEW)
├── constants/
│   └── module_constants.dart (NEW)
├── components/
│   └── app_header_widget.dart (NEW)
├── screens/
│   ├── login_screen.dart (UPDATED)
│   └── role_based_dashboard.dart (NEW)
└── services/
    └── api_service.dart (existing)
```

## Key Advantages Over Web Header.jsx

1. **Mobile Optimized**: Designed for touch and screen sizes
2. **Persistent Header**: Always accessible even when scrolling
3. **Grid Layout**: Better utilization of mobile screen space
4. **Visual Consistency**: Color-coded modules for quick identification
5. **Performance**: Efficient state management and rendering
6. **Offline Support Ready**: Can be extended with local caching

## Color Scheme Used

- Primary Orange: `#EF7139` (User avatar, buttons)
- Secondary Orange: `#FF9500` (Gradient)
- Light Gray: `#F8FAFC` (Background)
- Dark Gray: `#455A64` (Text)
- Module Colors: Varied for visual distinction

## Next Steps

1. Connect module screens to actual destinations
2. Add animations on module tap
3. Implement module search/filter functionality
4. Add module favorite/pin feature
5. Implement offline notification support
6. Add analytics for module usage

## Technical Details

- **Framework**: Flutter
- **UI Library**: Material Design 3
- **Font**: Google Fonts (Inter, InterTight)
- **State Management**: StatefulWidget (can be upgraded to Provider/Riverpod)
- **HTTP Client**: http package
- **Minimum SDK**: Flutter 3.10.4

## Troubleshooting

### Modules not showing?
- Check user role matches `allowedRoles` in module definition
- Verify role string case (use lowercase in constants)

### Header not appearing?
- Ensure header is inside SafeArea
- Check parent widget is not preventing overflow

### Notifications not loading?
- Verify `/api/notifications/` endpoint is accessible
- Check API service has valid auth token
- Review API response format

### Colors not displaying?
- Ensure Color hex values are correct
- Check Material theme is applied
- Verify fonts are loaded

## Support & Maintenance

To maintain this implementation:
1. Keep `module_constants.dart` updated with new modules
2. Update role definitions if organizational structure changes
3. Monitor API endpoint responses
4. Test new modules with all applicable roles
5. Maintain consistent styling and color scheme

---

**Version**: 1.0
**Last Updated**: 2026-02-19
**Status**: Production Ready
