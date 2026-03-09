# Role-Based Dashboard - Visual Layout Guide

## Overall Screen Structure

```
┌──────────────────────────────────┐
│      AppHeaderWidget              │  ← Header Section (Fixed Height)
├──────────────────────────────────┤
│                                  │
│  ┌──────────────────────────┐   │
│  │  Welcome Section         │   │  ← Welcome Greeting with User Avatar
│  │  You have X modules      │   │     (Gradient Orange Background)
│  └──────────────────────────┘   │
│                                  │
│                                  │
│  Main Navigation                 │  ← Section Title
│  ┌──────────┐  ┌──────────┐    │
│  │ Dashboard│  │  Trips   │    │  ← Module Cards (2 Column Grid)
│  └──────────┘  └──────────┘    │
│  ┌──────────┐                  │
│  │ Policy   │                  │
│  └──────────┘                  │
│                                  │
│  Management Modules              │  ← Section Title (if user has access)
│  ┌──────────┐  ┌──────────┐    │
│  │ Approvals│  │FIMS      │    │  ← More Module Cards (2 Column Grid)
│  └──────────┘  └──────────┘    │
│  ┌──────────┐  ┌──────────┐    │
│  │Settlement│  │ CFO Room │    │
│  └──────────┘  └──────────┘    │
│  ┌──────────┐  ┌──────────┐    │
│  │Org Setti │  │ Users    │    │
│  └──────────┘  └──────────┘    │
│  ┌──────────┐  ┌──────────┐    │
│  │ Guest Ho │  │ API      │    │
│  └──────────┘  └──────────┘    │
│                                  │
│  (ScrollView allows scrolling)   │
└──────────────────────────────────┘
```

---

## Header Widget Structure

```
┌──────────────────────────────────┐
│  TravelGovernanceSystem  🔔   👤 │  ← Title | Notifications | Profile
│  John Doe • ADMIN                │  ← User Info
└──────────────────────────────────┘

Interaction Points:
- 🔔 → Show notifications dropdown
- 👤 → Show profile menu
```

### Notifications Dropdown

```
┌─────────────────────────┐
│ Recent Notifications    │ Mark all as read
├─────────────────────────┤
│ [Message 1 Title]     ● │  ← Unread indicator
│ Message 1 description   │
│ 5 minutes ago           │
├─────────────────────────┤
│ [Message 2 Title]       │
│ Message 2 description   │
│ 1 hour ago              │
├─────────────────────────┤
│ [Message 3 Title]       │
│ Message 3 description   │
│ 2 hours ago             │
└─────────────────────────┘
```

### Profile Dropdown

```
┌──────────────────┐
│ John Doe         │
│ ADMIN            │
├──────────────────┤
│ 👤 My Profile    │
├──────────────────┤
│ 🚪 Logout        │
└──────────────────┘
```

---

## Module Card Structure

```
Individual Card:
┌──────────────────────┐
│ ■ (color indicator)  │  ← Top border in module color
├──────────────────────┤
│                      │
│  [Icon Background]   │  ← 48x48 icon with colored background
│   🎯 (Material Icon) │
│                      │
│  Module Title        │  ← Bold, dark text
│  Module Description  │  ← Light gray text
│                      │
│                →     │  ← Arrow indicator (right aligned)
└──────────────────────┘

Colors:
- Top border: module.iconColor
- Icon background: module.backgroundColor
- Title: Black (Colors.black87)
- Description: Gray (Colors.grey[600])
- Arrow: module.iconColor (opacity 0.6)
```

---

## Welcome Section

```
┌───────────────────────────────────────┐
│ Welcome back, John Doe!       ╭─────╮ │
│ You have access to 12 modules │  J  │ │  ← J = first letter of name
│                               ╰─────╯ │
└───────────────────────────────────────┘

Colors:
- Background: Gradient Orange (#EF7139 → #FF9500)
- Text: White
- Avatar: White text on orange background
```

---

## Module Grid Layout

### 2-Column Layout

```
┌────────────┬────────────┐
│  Module 1  │  Module 2  │  ← 2 columns
├────────────┼────────────┤
│  Module 3  │  Module 4  │
├────────────┼────────────┤
│  Module 5  │  Module 6  │
├────────────┼────────────┤
│  Module 7  │  Module 8  │  (and so on...)
└────────────┴────────────┘

Grid Properties:
- crossAxisCount: 2
- crossAxisSpacing: 16px
- mainAxisSpacing: 16px
- childAspectRatio: 0.92
```

---

## Complete Module List Example

### For Admin User:
```
┌─────────────────────────────────┐
│    Welcome back, Admin!          │
│    You have access to 12 modules │
└─────────────────────────────────┘

MAIN NAVIGATION
┌──────────────┬──────────────┐
│ 📊 Dashboard │ ✈️ Trips    │
├──────────────┼──────────────┤
│ 📚 Policy    │              │
└──────────────┴──────────────┘

MANAGEMENT MODULES
┌──────────────┬──────────────┐
│ 📈 Approvals │ 💰 FIMS      │
├──────────────┼──────────────┤
│ 💳 Settlem.  │ 📊 CFO Room  │
├──────────────┼──────────────┤
│ ⚙️  Org Sett.│ 👥 Users     │
├──────────────┼──────────────┤
│ 🏠 Guest Ho. │ 🔌 API       │
├──────────────┼──────────────┤
│ ⚠️  Disputes │              │
└──────────────┴──────────────┘
```

### For Finance User:
```
┌──────────────────────────────┐
│  Welcome back, Finance User!  │
│  You have access to 6 modules │
└──────────────────────────────┘

MAIN NAVIGATION
┌──────────────┬──────────────┐
│ 📊 Dashboard │ ✈️ Trips    │
├──────────────┼──────────────┤
│ 📚 Policy    │              │
└──────────────┴──────────────┘

MANAGEMENT MODULES
┌──────────────┬──────────────┐
│ 💰 FIMS      │ 💳 Settlem.  │
├──────────────┼──────────────┤
│ ⚠️  Disputes │              │
└──────────────┴──────────────┘
```

### For Employee User:
```
┌──────────────────────────────┐
│  Welcome back, Employee!      │
│  You have access to 5 modules │
└──────────────────────────────┘

MAIN NAVIGATION
┌──────────────┬──────────────┐
│ 📊 Dashboard │ ✈️ Trips    │
├──────────────┼──────────────┤
│ 📚 Policy    │              │
└──────────────┴──────────────┘

MANAGEMENT MODULES
┌──────────────┬──────────────┐
│ 📈 Approvals │ ⚠️  Disputes │
└──────────────┴──────────────┘
```

---

## Color Scheme Reference

### Primary Colors
```
Orange Primary:     #EF7139  [█ Orange]
Orange Secondary:   #FF9500  [█ Light Orange]
Background:         #F8FAFC  [█ Very Light Gray]
Text Dark:          #455A64  [█ Dark Gray]
Text Light:         #999999  [█ Medium Gray]
Success Green:      #388E3C  [█ Green]
Warning Orange:     #F57C00  [█ Dark Orange]
Info Blue:          #1976D2  [█ Blue]
Error Red:          #D32F2F  [█ Red]
```

### Module-Specific Colors
```
Dashboard:
  Background: #E3F2FD  [█ Light Blue]
  Icon:       #1976D2  [█ Blue]

Trips:
  Background: #FCE4EC  [█ Light Pink]
  Icon:       #C2185B  [█ Pink]

Policy:
  Background: #F1F8E9  [█ Light Green]
  Icon:       #388E3C  [█ Green]

FIMS/Finance:
  Background: #F1F8E9  [█ Light Green]
  Icon:       #388E3C  [█ Green]

Settlements:
  Background: #FFF3E0  [█ Light Orange]
  Icon:       #F57C00  [█ Orange]

And many more...
```

---

## Responsive Behavior

### Small Phones (< 320px)
```
Single column might be used
Or very compact 2-column layout
```

### Standard Phones (320-480px)
```
┌────┬────┐
│  1 │  2 │  ← 2 column grid (standard)
└────┴────┘
```

### Tablets/Large Screens (>480px)
```
┌────┬────┐
│  1 │  2 │  ← Still 2 column (optimized for mobile)
└────┴────┘
(Larger cards due to more space)
```

---

## Event Flow Diagram

```
User sees Dashboard
    ↓
┌─────────────────┐
│  Tap a Module   │
└─────────────────┘
    ↓
Screen shows
ripple animation
    ↓
Navigate to module
screen (if connected)
or show "Coming soon"

Alt: Tap Notifications
    ↓
Show dropdown with
notifications list
    ↓
Can "Mark all as read"
    ↓
Close dropdown

Alt: Tap Profile
    ↓
Show profile menu
    ↓
Can view profile
or Logout
    ↓
Close menu
```

---

## Typography Sizes

```
Header Title:          22px, Bold, Black
Section Titles:        18px, Bold, Black87
Module Title:          14px, Bold, Black87
Module Description:    11px, Regular, Gray600
User Name (Header):    12px, Regular, Gray600
Notifications Count:   10px, Bold, White
Timestamp:             10px, Regular, Gray500
```

---

## Spacing Guidelines

```
Outer Padding:      20px (all sides)
Grid Spacing:       16px (between modules)
Header Padding:     12px (vertical) x 20px (horizontal)
Card Padding:       16px (all sides)
Icon Size:          48x48px
Icon Padding:       8px (inside header)
Avatar Size:        32x32px
Top Border:         4px
Border Radius:      12px (cards), 8px (icons)
```

---

## Animation Details

### Tap Effect
- Scale: 0.98 (slight compress)
- Duration: 200ms
- Ripple: module.iconColor with 0.2 opacity

### Notification Badge
- Entrance: Fade in
- Number: Bold, white text on red background

### Dropdown Menus
- Entrance: Fade in from top
- Exit: Fade out
- Position: Below trigger element
- Shadow: Elevation 5+

---

## Accessibility Features

- Large touch targets (48x48px minimum)
- High contrast colors (WCAG AA compliant)
- Clear labels for all buttons
- Proper icon descriptions
- Semantic HTML structure (Flutter equivalent)
- Safe area consideration

---

## Performance Notes

- Modules loaded instantly (in-memory)
- Notifications fetched on dashboard load
- Grid optimized with NeverScrollableScrollPhysics
- Minimal re-renders
- Efficient state management

---

This layout matches your reference image while being optimized for mobile Android development!
