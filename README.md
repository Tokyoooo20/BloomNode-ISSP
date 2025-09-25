# BloomNode Frontend

A modern React.js frontend application with beautiful login and signup pages.

## Features

- ✨ Modern, responsive UI design
- 🎨 Beautiful gradient color schemes
- 🔐 Login and Signup forms (frontend only)
- 🚀 React Router for navigation
- 📱 Mobile-friendly responsive design
- 🎭 Glassmorphism design elements

## Getting Started

### Prerequisites

- Node.js (version 14 or higher)
- npm or yarn

### Installation

1. Navigate to the project directory:
```bash
cd BloomNode
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

4. Open your browser and visit `http://localhost:3000`

## Project Structure

```
src/
├── components/
│   ├── Login.js          # Login page component
│   ├── Signup.js         # Signup page component
│   └── Auth.css          # Shared styling for auth components
├── App.js                # Main app component with routing
├── App.css               # App-specific styles
├── index.js              # React entry point
└── index.css             # Global styles
```

## Available Routes

- `/login` - Login page
- `/signup` - Signup page
- `/` - Redirects to login page

## Color Scheme

The application uses a beautiful gradient color palette:
- Primary: Purple to blue gradient (#667eea to #764ba2)
- Secondary: Pink accent (#f093fb)
- Background: Multi-layered gradient with glassmorphism effects

## Next Steps

This is currently a frontend-only implementation. To connect to a backend:

1. Add API service functions
2. Implement authentication state management
3. Connect forms to backend endpoints
4. Add protected routes

## Technologies Used

- React 18
- React Router DOM
- Modern CSS with gradients and glassmorphism
- Responsive design principles
