# Overview

This is a Liga MX (Mexican Soccer League) application that uses Firebase as its backend-as-a-service platform. The project provides authentication, database, and storage capabilities through Firebase services. The application appears to be designed for web deployment with support for Replit hosting environments.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Pure JavaScript with ES6 Modules**: The application uses modern JavaScript with ES6 module imports, loaded directly from CDN (Firebase SDK 10.7.1)
- **Static Web Application**: Client-side only architecture with no apparent server-side rendering

## Authentication & Authorization
- **Firebase Authentication**: Implements Google OAuth 2.0 as the primary authentication mechanism
- **Google Sign-In Provider**: Configured with 'select_account' prompt to allow users to choose between multiple Google accounts
- **Domain Authorization**: Includes error handling for unauthorized domains, particularly designed to work with Replit's dynamic domain system
- **Testing Configuration**: Auth verification is enabled (not disabled for testing), indicating production-ready security settings

**Design Rationale**: Google authentication was chosen for its simplicity and widespread user adoption. The `select_account` parameter improves user experience for users with multiple Google accounts.

## Data Storage
- **Cloud Firestore**: NoSQL document database for storing application data
- **Firebase Storage**: Cloud storage service for handling file uploads (images, documents, etc.)

**Design Rationale**: Firebase's real-time database capabilities and automatic scaling make it suitable for dynamic sports data that may need live updates.

## Deployment Considerations
- **Replit-Optimized**: Special handling for Replit's dynamic domain system with domain authorization error handling
- **CDN-Based Dependencies**: All Firebase libraries loaded from Google's CDN rather than npm packages, reducing build complexity

# External Dependencies

## Third-Party Services
- **Firebase Platform** (v10.7.1)
  - Firebase Authentication
  - Cloud Firestore
  - Firebase Storage
  - Project ID: `ligamx-daf3d`

## Authentication Provider
- **Google OAuth 2.0**: Primary identity provider for user authentication

## CDN Dependencies
- Firebase SDK modules loaded from `https://www.gstatic.com/firebasejs/10.7.1/`
  - firebase-app.js
  - firebase-auth.js
  - firebase-firestore.js
  - firebase-storage.js

## Configuration Notes
- Firebase API keys and configuration are exposed client-side (standard practice for Firebase web applications)
- Domain authorization requires manual configuration in Firebase Console for new deployment domains
- The application is configured for the `ligamx-daf3d.firebaseapp.com` domain with support for additional authorized domains