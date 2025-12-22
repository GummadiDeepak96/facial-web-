# Login Form Visual Reference

## Login Form Layout

```
┌─────────────────────────────────────────────────────────┐
│                                                           │
│                        Login                             │
│        Welcome back! Please login to your account        │
│                                                           │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  LOGIN AS                                               │
│  ┌─────────────────┬──────────────────┬────────────────┐│
│  │ ◉ EMPLOYEE      │ ○ MANAGER        │ ○ ADMIN        ││
│  └─────────────────┴──────────────────┴────────────────┘│
│                                                           │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  EMAIL ADDRESS *                                        │
│  ┌───────────────────────────────────────────────────┐  │
│  │ Enter your email address                          │  │
│  └───────────────────────────────────────────────────┘  │
│                                                           │
│  PASSWORD *                                             │
│  ┌───────────────────────────────────────────────────┐  │
│  │ Enter your password                   👁          │  │
│  └───────────────────────────────────────────────────┘  │
│                                                           │
│              ┌─────────────────────┐                     │
│              │      Login          │                     │
│              └─────────────────────┘                     │
│                                                           │
├─────────────────────────────────────────────────────────┤
│                 Forgot Password?                        │
│  Don't have an account? Register as Candidate         │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

## Color Scheme

| Element | Color | Hex Code |
|---------|-------|----------|
| Background | Light Gray | #f8f9fa |
| Card Background | White | #ffffff |
| Text (Primary) | Dark Gray | #333333 |
| Text (Secondary) | Medium Gray | #666666 |
| Labels | Dark Gray | #333333 |
| Required Asterisk | Red | #dc3545 |
| Button Background | Blue Gradient | #667eea → #764ba2 |
| Button Text | White | #ffffff |
| Links | Blue | #667eea |
| Border | Light Gray | #e1e5e9 |
| Input Focus | Blue | #667eea |

## Radio Button States

### Default (Unselected)
```
○ EMPLOYEE
```
- Border: #e1e5e9
- Text Color: #333
- Background: white

### Hover (Not Selected)
```
╭─────────────╮
│ ○ EMPLOYEE  │
╰─────────────╯
```
- Border: #667eea (blue)
- Background: #f8f9ff (light blue)
- Text Color: #333

### Selected
```
◉ EMPLOYEE
```
- Border: #667eea (blue)
- Dot Color: #667eea (blue)
- Text Color: #667eea (blue, bold)
- Font Weight: 600

## Form Fields

### Email Input
- Placeholder: "Enter your email address"
- Border: 2px solid #e1e5e9
- Border (Focus): 2px solid #667eea
- Padding: 10px
- Border Radius: 8px

### Password Input
- Placeholder: "Enter your password"
- Border: 2px solid #e1e5e9
- Border (Focus): 2px solid #667eea
- Padding: 10px
- Border Radius: 8px
- Toggle Eye Icon: Yes

## Buttons

### Login Button
- Background: Linear gradient #667eea → #764ba2
- Text Color: White
- Padding: 11px
- Border Radius: 8px
- Hover: Opacity 0.9
- Disabled: Opacity 0.6
- Font Weight: 600
- Font Size: 16px
- Width: 100% (full width)

## Links

### Forgot Password Link
- Color: #667eea (blue)
- Text Decoration: None
- Hover: Underlined
- Font Weight: 500
- Font Size: 14px

### Register Link
- Color: #667eea (blue)
- Text Decoration: None
- Hover: Underlined
- Font Weight: 500
- Font Size: 14px

## Responsive Behavior

### Desktop (1024px+)
- Max width: 480px
- Center aligned
- Full padding
- All elements visible

### Tablet (768px - 1023px)
- Max width: 90% of viewport
- Center aligned
- Adjusted padding
- All elements visible

### Mobile (< 768px)
- Max width: 100% - 40px
- Center aligned
- Reduced padding (20px)
- Radio buttons stack if needed

## Typography

| Element | Font Size | Font Weight | Line Height |
|---------|-----------|-------------|------------|
| Login Heading | 28px | 600 | 1.2 |
| Subheading | 14px | 400 | 1.4 |
| Labels | 14px | 500 | 1.4 |
| Input Text | 16px | 400 | 1.6 |
| Button | 16px | 600 | 1.5 |
| Links | 14px | 500 | 1.4 |
| Login As Label | 13px | 600 | 1.2 |
| Radio Text | 14px | 500 | 1.4 |

## Spacing

| Element | Spacing |
|---------|---------|
| Card Padding | 30px 50px |
| Header Bottom Margin | 20px |
| Form Group Bottom Margin | 16px |
| User Type Selector Bottom Margin | 25px |
| User Type Selector Bottom Padding | 20px |
| Footer Top Padding | 15px |
| Footer Bottom Border | 1px solid #e1e5e9 |
| Radio Group Gap | 15px |
| Radio Label Gap | 8px |

## Shadows

| Element | Shadow |
|---------|--------|
| Card | 0 15px 35px rgba(0, 0, 0, 0.1) |
| Nav Link Hover | 0 4px 15px rgba(102, 126, 234, 0.3) |

## Animations

### Radio Button Hover
```css
transition: all 0.3s ease;
```

### Input Focus
```css
transition: border-color 0.3s ease;
```

### Button Hover
```css
transition: opacity 0.3s ease;
```

## Accessibility Features

- ✅ Proper form labels with `htmlFor`
- ✅ Required fields marked with asterisk
- ✅ Placeholder text for guidance
- ✅ Focus states visible (blue border)
- ✅ Contrast ratios meet WCAG AA standards
- ✅ Radio buttons properly labeled
- ✅ Error messages in toast notifications
- ✅ Loading state in button

## Validation

### Email Field
- Type: email
- Required: true
- Pattern: Standard email format

### Password Field
- Type: password
- Required: true
- Min length: (server-side validation)

### Form Submission
- Valid only if:
  - Email is filled and valid
  - Password is filled
  - One role is selected
- Shows error toast on failure
- Shows success message on success

