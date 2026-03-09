# Flutter Role-Based Dashboard - Testing Guide

## Pre-Testing Checklist

- [ ] All new files created without errors
- [ ] No import issues or missing dependencies
- [ ] Flutter project compiles successfully
- [ ] API endpoints are accessible
- [ ] Test accounts for different roles exist

---

## Testing Scenarios

### 1. Login Flow Testing

#### Test Case 1.1: Valid Admin Login
```
Steps:
1. Open app
2. Enter admin username and password
3. Tap Login

Expected Result:
✓ Toast shows "Logged in as [Admin Name] (Role: ADMIN)"
✓ Navigates to RoleBasedDashboard
✓ All 12 modules visible
✓ Header shows user name and "ADMIN" role
```

#### Test Case 1.2: Valid Employee Login
```
Steps:
1. Open app
2. Enter employee username and password
3. Tap Login

Expected Result:
✓ Toast shows "Logged in as [Employee Name] (Role: EMPLOYEE)"
✓ Navigates to RoleBasedDashboard
✓ Only 5 modules visible (Dashboard, Trips, Policy, Approvals, Disputes)
✓ Header shows user name and "EMPLOYEE" role
```

#### Test Case 1.3: Valid Finance Login
```
Steps:
1. Open app
2. Enter finance username and password
3. Tap Login

Expected Result:
✓ Toast shows "Logged in as [Finance Name] (Role: FINANCE)"
✓ Navigates to RoleBasedDashboard
✓ 6 modules visible (Dashboard, Trips, Policy, FIMS, Settlements, Disputes)
✓ Finance-specific modules highlighted
```

#### Test Case 1.4: Valid CFO Login
```
Steps:
1. Open app
2. Enter cfo username and password
3. Tap Login

Expected Result:
✓ Dashboard shows Dashboard, Policy, CFO Room, FIMS, Disputes
✓ Management modules section visible
✓ Header shows "CFO" role
```

#### Test Case 1.5: Invalid Credentials
```
Steps:
1. Enter wrong username/password
2. Tap Login

Expected Result:
✓ Error toast appears
✓ Stays on login screen
✓ Fields can be corrected
```

---

### 2. Dashboard Layout Testing

#### Test Case 2.1: Module Grid Display
```
Steps:
1. Login as admin
2. Observe dashboard

Expected Result:
✓ Welcome section appears at top with gradient background
✓ "Main Navigation" section visible
✓ "Management Modules" section visible
✓ Modules arranged in 2-column grid
✓ All module cards have:
  - Colored icon with background
  - Title text
  - Description text
  - Top color border
  - Visible arrow icon
```

#### Test Case 2.2: Module Visibility for Different Roles
```
Steps:
1. Login as Employee → Save module count
2. Logout
3. Login as Admin → Save module count

Expected Result:
✓ Employee: 5 modules
✓ Admin: 12 modules
✓ Correct modules shown for each role
✓ No unauthorized modules displayed
```

#### Test Case 2.3: Module Card Tap Animation
```
Steps:
1. Tap on any module card

Expected Result:
✓ Card shows ripple/splash animation
✓ Color feedback visible
✓ If screen implemented: navigates to screen
✓ If screen not implemented: shows "Coming soon" toast
```

#### Test Case 2.4: Scrolling Behavior
```
Steps:
1. Scroll down on dashboard

Expected Result:
✓ Header remains fixed at top
✓ Welcome section scrolls with content
✓ Modules scroll smoothly
✓ No jank or stuttering
```

---

### 3. Header Widget Testing

#### Test Case 3.1: User Info Display
```
Steps:
1. Login and observe header
2. Navigate to dashboard

Expected Result:
✓ "Travel Governance System" title visible
✓ User name displayed correctly
✓ User role displayed (e.g., "ADMIN")
✓ User avatar shows first letter (uppercase)
✓ All text properly sized and colored
```

#### Test Case 3.2: Notification Bell Icon
```
Steps:
1. Observe header notification bell
2. Check if unread count badge shows

Expected Result:
✓ Bell icon visible
✓ If unread notifications: red badge with count
✓ If no unread: no badge
✓ Badge position correct
```

#### Test Case 3.3: Notification Dropdown Interaction
```
Steps:
1. Tap notification bell
2. Observe dropdown

Expected Result:
✓ Dropdown appears below bell icon
✓ Shows "Recent Notifications" header
✓ "Mark all as read" button visible
✓ Notifications list displays properly
✓ Each notification shows:
  - Title
  - Message
  - Timestamp
  - Unread indicator (dot)
```

#### Test Case 3.4: Mark All as Read
```
Steps:
1. Tap notification bell
2. Tap "Mark all as read" button
3. Observe notifications

Expected Result:
✓ API call sent successfully
✓ All notifications unread indicators disappear
✓ Unread count badge disappears
✓ UI updates immediately
```

#### Test Case 3.5: Notification Dropdown Close
```
Steps:
1. Tap bell to open
2. Tap outside dropdown (or ESC)

Expected Result:
✓ Dropdown closes
✓ Click outside area closes it
✓ Opening other menus closes this one
```

#### Test Case 3.6: Empty Notifications
```
Steps:
1. If no notifications exist, tap bell

Expected Result:
✓ Dropdown shows "All caught up!"
✓ Empty state icon displays
✓ No "Mark all as read" button
✓ Professional empty state message
```

---

### 4. Profile Menu Testing

#### Test Case 4.1: Profile Avatar Tap
```
Steps:
1. Tap profile avatar in header

Expected Result:
✓ Profile dropdown appears
✓ Shows user name
✓ Shows user role
✓ "My Profile" option visible
✓ "Logout" option visible (red text)
```

#### Test Case 4.2: Profile Menu Items
```
Steps:
1. Open profile dropdown
2. Observe menu items

Expected Result:
✓ User info clearly displayed
✓ "My Profile" is clickable
✓ "Logout" button is red (danger color)
✓ Icons visible next to text
✓ Proper padding and spacing
```

#### Test Case 4.3: Close Profile Menu
```
Steps:
1. Open profile menu
2. Click outside or tap elsewhere

Expected Result:
✓ Menu closes
✓ Opening notification dropdown closes this
✓ Clicking avatar again toggles menu
```

#### Test Case 4.4: Logout Functionality
```
Steps:
1. Open profile menu
2. Tap "Logout"

Expected Result:
✓ Token is cleared
✓ Navigates to LoginScreen
✓ Cannot go back with back button
✓ All session data cleared
✓ Must re-login to access dashboard
```

---

### 5. Responsive Design Testing

#### Test Case 5.1: Small Phone (320px)
```
Steps:
1. Run app in small phone (480x800)
2. Check layout

Expected Result:
✓ Header text doesn't overflow
✓ Module cards fit in 2 columns
✓ No horizontal scroll
✓ Text readable
✓ Buttons easily tappable (48px+ minimum)
```

#### Test Case 5.2: Standard Phone (412px)
```
Steps:
1. Run app on standard Android phone
2. Check layout and functionality

Expected Result:
✓ All elements visible without scrolling (except content)
✓ Headers properly positioned
✓ Module cards well-spaced
✓ All interactions work smoothly
```

#### Test Case 5.3: Large Phone (600px)
```
Steps:
1. Run app on large phone
2. Check scaling

Expected Result:
✓ Cards scale appropriately
✓ No excessive whitespace
✓ Layout remains centered
✓ Professional appearance maintained
```

#### Test Case 5.4: Tablet (1024px)
```
Steps:
1. Run app in tablet mode

Expected Result:
✓ 2-column layout maintained (or could be adjusted)
✓ Cards visible without scrolling (main ones)
✓ Header properly spaced
✓ Usable on larger screens
```

#### Test Case 5.5: Landscape Orientation
```
Steps:
1. Rotate phone to landscape
2. Check layout

Expected Result:
✓ Header adapts to landscape
✓ Content layout adjusts
✓ No broken layouts
✓ Modules still visible
✓ Header text still readable
```

---

### 6. Module-Specific Behavior

#### Test Case 6.1: Main Navigation Section
```
Steps:
1. Login and observe Main Navigation section

Expected Result:
✓ Always shows Dashboard, Trips, Policy
✓ Visible to all roles that have access
✓ Positioned above Management Modules
✓ Section title: "Main Navigation"
```

#### Test Case 6.2: Management Modules Section
```
Steps:
1. Login as admin
2. Observe Management Modules section

Expected Result:
✓ Shows 9 additional modules
✓ Section title: "Management Modules"
✓ Below Main Navigation section
```

#### Test Case 6.3: No Modules Available
```
Steps:
1. Create test user with no module access
2. Login and check dashboard

Expected Result:
✓ Empty state message appears
✓ Lock icon displayed
✓ "No modules available" message
✓ Professional empty state handling
```

#### Test Case 6.4: Module Card Colors
```
Steps:
1. View various module cards
2. Check for unique colors

Expected Result:
✓ Each module has unique color scheme
✓ Icons have distinct colors
✓ Backgrounds are suitably light
✓ No color clashing
✓ Professional appearance
```

---

### 7. Error Handling Testing

#### Test Case 7.1: Network Error During Login
```
Steps:
1. Disable network
2. Try to login

Expected Result:
✓ Error message displays
✓ Helpful error text
✓ User can retry
✓ No crash
```

#### Test Case 7.2: Notification Fetch Failure
```
Steps:
1. Disable network after login
2. Tap notification bell

Expected Result:
✓ Shows loading state
✓ Error message or empty state
✓ Bell icon still visible
✓ No crash
```

#### Test Case 7.3: Invalid API Response
```
Steps:
1. Mock API to return invalid data
2. Navigate to dashboard

Expected Result:
✓ Gracefully handles bad data
✓ Empty state or safe fallback
✓ No null pointer exceptions
✓ Logs errors to console
```

#### Test Case 7.4: Missing User Data
```
Steps:
1. Login with incomplete user data
2. Check header display

Expected Result:
✓ Defaults gracefully
✓ Shows "S" avatar if no name
✓ Shows "EMPLOYEE" if no role
✓ No missing text crashes
```

---

### 8. Performance Testing

#### Test Case 8.1: Dashboard Load Time
```
Steps:
1. Login and time to dashboard appearance

Expected Result:
✓ Dashboard appears within 2 seconds
✓ Modules render smoothly
✓ No noticeable lag
✓ Smooth animations
```

#### Test Case 8.2: Scrolling Performance
```
Steps:
1. Scroll through all modules quickly

Expected Result:
✓ 60 FPS smooth scrolling
✓ No jank or frame drops
✓ Responsive to input
✓ Memory usage stable
```

#### Test Case 8.3: Multiple Tab Taps
```
Steps:
1. Tap modules rapidly
2. Quickly open/close menus

Expected Result:
✓ UI responds immediately
✓ No delayed clicks
✓ No animation stuttering
✓ Stable performance
```

#### Test Case 8.4: Memory Leaks
```
Steps:
1. Login/logout 10 times
2. Monitor memory usage

Expected Result:
✓ Memory usage returns to baseline
✓ No gradual increase
✓ Proper cleanup on logout
✓ No resource leaks
```

---

### 9. Accessibility Testing

#### Test Case 9.1: Touch Targets
```
Steps:
1. Check all buttons and tappable items

Expected Result:
✓ All targets at least 48x48px
✓ Easy to tap with thumb
✓ No tiny click areas
✓ Good spacing between targets
```

#### Test Case 9.2: Color Contrast
```
Steps:
1. Check text on all backgrounds

Expected Result:
✓ Text readable on backgrounds
✓ Meets WCAG AA standards
✓ No color-only indicators
✓ Sufficient brightness difference
```

#### Test Case 9.3: Text Size
```
Steps:
1. Check all text sizes

Expected Result:
✓ Headings clearly larger
✓ Body text readable
✓ Proper hierarchy
✓ No too-small text
```

#### Test Case 9.4: Icon Clarity
```
Steps:
1. Observe all icons

Expected Result:
✓ Icons are clear
✓ Multiple meanings distinguished
✓ Icons complement text
✓ No ambiguous icons
```

---

### 10. Integration Testing

#### Test Case 10.1: Header Integration
```
Steps:
1. Navigate dashboard
2. Check header persists

Expected Result:
✓ Header visible on all screens
✓ Consistent styling
✓ Works in all dashboards
✓ Proper integration
```

#### Test Case 10.2: Logout Integration
```
Steps:
1. From dashboard, logout
2. Try accessing dashboard directly

Expected Result:
✓ Returns to login screen
✓ No cached access
✓ Token truly cleared
✓ Fresh login required
```

#### Test Case 10.3: Navigation Flow
```
Steps:
1. Login → Dashboard → Tap Module
2. If module screens connected, navigate

Expected Result:
✓ Navigation smooth
✓ Header present on destination
✓ Back button works
✓ Navigation stack proper
```

---

## Test Results Template

```
┌─────────────┬──────┬─────────────────────┐
│ Test Case   │ Pass │ Notes               │
├─────────────┼──────┼─────────────────────┤
│ 1.1        │ ✓/✗  │                     │
│ 1.2        │ ✓/✗  │                     │
│ 2.1        │ ✓/✗  │                     │
│ 2.2        │ ✓/✗  │                     │
│ ...        │ ...  │ ...                 │
└─────────────┴──────┴─────────────────────┘

TOTAL TESTS: 40+
PASS RATE: ___% (Passing / Total)
STATUS: [✓ Ready for Production / ⚠ Needs Fixes / ✗ Critical Issues]
```

---

## Known Limitations

1. **Module Destination Screens**: Not connected yet (shows "Coming soon")
   - Fix: Add `destinationScreen: () => YourScreen()` to module definitions

2. **Offline Support**: Notifications require network
   - Fix: Can implement local caching with SharedPreferences

3. **Profile Screen**: "My Profile" not connected
   - Fix: Uncomment and connect to ProfilePage

4. **Push Notifications**: Polling only (no real-time)
   - Fix: Can upgrade to Firebase Cloud Messaging or WebSocket

---

## Common Issues & Solutions

### Issue: Modules not showing
**Solution**: Check API permissions, verify user role is lowercase in constants

### Issue: Header overflowing
**Solution**: Ensure SafeArea widget is used, check text max lines

### Issue: Notifications not loading
**Solution**: Verify API endpoint, check auth token, review console logs

### Issue: Layout issues on small screens
**Solution**: Use `MediaQuery.of(context).size.width` for responsive adjustments

### Issue: Animation lag
**Solution**: Profile the app with Flutter DevTools, check mounted state

---

## Performance Benchmarks

Target metrics:
- Dashboard load: < 2 seconds
- First frame time: < 1 second
- Module tap response: < 100ms
- Notification fetch: < 3 seconds
- Memory footprint: < 100MB
- Scrolling FPS: ≥ 60fps

---

## Sign-Off

- [ ] All test cases passed
- [ ] No critical issues found
- [ ] Performance acceptable
- [ ] Accessibility meets standards
- [ ] Ready for production release

**Tested By**: _______________
**Test Date**: _______________
**Approved By**: _______________

---

**Testing Guide Version**: 1.0
**Last Updated**: February 19, 2026
