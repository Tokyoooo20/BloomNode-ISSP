# Responsive Design Guide - BloomNode

This document outlines the responsive design strategy and utility classes available in the BloomNode application.

## Breakpoint Strategy

We use a **mobile-first** approach with the following breakpoints:

| Breakpoint | Size | Device Type | Usage |
|------------|------|-------------|-------|
| `xs` | 475px | Large phones | Extra small devices |
| `sm` | 640px | Small tablets | Small devices (default Tailwind) |
| `md` | 768px | Tablets | Medium devices |
| `lg` | 1024px | Small laptops | Large devices |
| `xl` | 1280px | Desktops | Extra large devices |
| `2xl` | 1536px | Large desktops | 2X Extra large devices |

### Mobile-First Approach

Always write styles for mobile first, then enhance for larger screens:

```jsx
// ✅ Good - Mobile first
<div className="text-sm sm:text-base lg:text-lg">
  Responsive text
</div>

// ❌ Bad - Desktop first
<div className="text-lg lg:text-sm">
  Not mobile-first
</div>
```

## Responsive Utility Classes

### Text Sizes

Use these classes for responsive text sizing:

- `.text-responsive-xs` - Extra small on mobile, small on tablet+
- `.text-responsive-sm` - Small on mobile, base on tablet+
- `.text-responsive-base` - Base on mobile, large on tablet+
- `.text-responsive-lg` - Large on mobile, XL on tablet+
- `.text-responsive-xl` - XL on mobile, 2XL on tablet+
- `.text-responsive-2xl` - 2XL on mobile, 3XL on tablet+

### Spacing

- `.padding-responsive` - Responsive padding (px-4 py-4 → px-6 py-6 → px-8 py-8)
- `.padding-responsive-x` - Responsive horizontal padding
- `.padding-responsive-y` - Responsive vertical padding
- `.margin-responsive` - Responsive margins
- `.space-responsive` - Responsive space between children
- `.gap-responsive` - Responsive gap in flex/grid

### Layout

- `.container-responsive` - Full-width container with responsive padding
- `.flex-responsive` - Flex column on mobile, row on tablet+
- `.grid-responsive` - 1 column mobile → 2 tablet → 3 desktop
- `.grid-responsive-2` - 1 column mobile → 2 desktop
- `.grid-responsive-3` - 1 column mobile → 2 tablet → 3 desktop
- `.grid-responsive-4` - 1 column mobile → 2 tablet → 4 desktop

### Visibility

- `.hide-mobile` - Hidden on mobile, visible on tablet+
- `.show-mobile` - Visible on mobile, hidden on tablet+
- `.hide-tablet` - Hidden on tablet, visible on desktop+
- `.show-tablet` - Visible on tablet, hidden on desktop+

### Components

- `.sidebar-responsive` - Responsive sidebar (hidden on mobile, visible on desktop)
- `.sidebar-responsive-open` - Open state for mobile sidebar
- `.table-responsive-wrapper` - Wrapper for horizontally scrollable tables
- `.table-responsive` - Responsive table styling
- `.modal-responsive` - Responsive modal sizing
- `.card-responsive` - Responsive card with padding

### Form Elements

- `.btn-responsive` - Responsive button with proper tap targets
- `.input-responsive` - Responsive input field
- `.form-group-responsive` - Responsive form group spacing

### Navigation

- `.nav-responsive` - Responsive navigation (column mobile, row desktop)
- `.dropdown-responsive` - Responsive dropdown positioning

## Common Patterns

### 1. Responsive Grid Cards

```jsx
<div className="grid-responsive">
  <div className="card-responsive">Card 1</div>
  <div className="card-responsive">Card 2</div>
  <div className="card-responsive">Card 3</div>
</div>
```

### 2. Responsive Sidebar Layout

```jsx
<div className="flex">
  {/* Sidebar - hidden on mobile */}
  <aside className="sidebar-responsive lg:translate-x-0">
    {/* Sidebar content */}
  </aside>
  
  {/* Main content */}
  <main className="flex-1 lg:ml-64">
    {/* Main content */}
  </main>
</div>
```

### 3. Responsive Table

```jsx
<div className="table-responsive-wrapper">
  <table className="table-responsive">
    {/* Table content */}
  </table>
</div>
```

### 4. Responsive Form

```jsx
<form className="space-y-4">
  <div className="form-group-responsive">
    <label className="text-responsive-sm">Label</label>
    <input className="input-responsive" />
  </div>
  <button className="btn-responsive">Submit</button>
</form>
```

### 5. Responsive Navigation

```jsx
<nav className="nav-responsive">
  <a href="/">Home</a>
  <a href="/about">About</a>
  <a href="/contact">Contact</a>
</nav>
```

## Touch-Friendly Guidelines

### Minimum Tap Target Size

All interactive elements should have a minimum size of **44x44px** on mobile:

```jsx
// ✅ Good - Uses tap-target utility
<button className="btn-responsive tap-target">
  Click me
</button>

// ✅ Good - Explicit min-height/min-width
<button className="min-h-[44px] min-w-[44px]">
  Click me
</button>
```

### Spacing Between Touch Targets

Maintain at least **8px spacing** between touch targets to prevent accidental taps.

## Responsive Images

Always use responsive images:

```jsx
<img 
  src="image.jpg" 
  alt="Description"
  className="w-full h-auto"
/>
```

## Responsive Tables

For complex tables, use horizontal scroll on mobile:

```jsx
<div className="table-responsive-wrapper">
  <table className="table-responsive">
    {/* Table content */}
  </table>
</div>
```

Alternatively, convert to card view on mobile:

```jsx
{/* Desktop: Table */}
<div className="hidden md:block">
  <table>{/* Table */}</table>
</div>

{/* Mobile: Cards */}
<div className="md:hidden space-y-4">
  {data.map(item => (
    <div className="card-responsive">{/* Card content */}</div>
  ))}
</div>
```

## Modal Responsiveness

Modals should be:
- Full-width on mobile (with padding)
- Centered with max-width on desktop
- Scrollable if content exceeds viewport

```jsx
<div className="modal-responsive">
  {/* Modal content */}
</div>
```

## Testing Checklist

When implementing responsive design, test:

- [ ] Mobile (320px - 480px)
- [ ] Tablet (768px - 1024px)
- [ ] Desktop (1024px+)
- [ ] Landscape orientation
- [ ] Portrait orientation
- [ ] Touch interactions
- [ ] Horizontal scrolling (if applicable)
- [ ] Text readability
- [ ] Button/input sizes
- [ ] Navigation menu behavior
- [ ] Modal/dropdown positioning

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile Safari (iOS 12+)
- Chrome Mobile (Android 8+)

## Performance Considerations

- Use `will-change` sparingly
- Prefer CSS transforms over position changes
- Use `transform` and `opacity` for animations
- Avoid layout shifts during responsive changes
- Test on actual devices when possible

## Resources

- [Tailwind CSS Responsive Design](https://tailwindcss.com/docs/responsive-design)
- [MDN Responsive Design](https://developer.mozilla.org/en-US/docs/Learn/CSS/CSS_layout/Responsive_Design)
- [Web.dev Responsive Design](https://web.dev/responsive-web-design-basics/)

