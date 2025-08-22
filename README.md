# Squiz Platform - Educational Quiz & Q&A Platform

A modern educational platform built with React, TypeScript, and Supabase featuring quizzes, Q&A functionality, forms, and more.

## Features

- **Interactive Quizzes**: Create and take quizzes with multiple question types
- **Q&A System**: Ask questions and get answers from the community with image support
- **Forms System**: Create and share information forms with file attachments
- **Forum**: Community discussions and shared content
- **Math Support**: LaTeX math expressions support with KaTeX
- **Multilingual**: Support for English and Azerbaijani languages
- **Responsive Design**: Mobile-first design that works on all devices
- **Image Management**: Advanced image upload with cropping capabilities
- **Full-Screen Image Viewer**: Enhanced image viewing experience

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: TailwindCSS, Framer Motion
- **Backend**: Supabase (Database, Authentication, Storage)
- **Routing**: React Router
- **State Management**: React Query (TanStack Query)
- **Math Rendering**: KaTeX, React KaTeX
- **Image Processing**: React Easy Crop
- **UI Components**: Radix UI, Custom components

## Quick Start

### Prerequisites

- Node.js 18+ 
- npm or pnpm
- Supabase account

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd squiz-platform
```

2. Install dependencies:
```bash
npm install
# or
pnpm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

Add your Supabase credentials:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Start the development server:
```bash
npm run dev
# or
pnpm dev
```

## Deployment

### Vercel (Recommended)

This project is optimized for Vercel deployment:

1. **Connect to Vercel:**
   - Go to [vercel.com](https://vercel.com)
   - Import your repository
   - Vercel will automatically detect the project settings

2. **Environment Variables:**
   Add these environment variables in Vercel dashboard:
   ```
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

3. **Deploy:**
   - Vercel will automatically build and deploy your app
   - The `vercel.json` file handles SPA routing and optimizations

### Manual Build

```bash
npm run build
```

The built files will be in the `dist` directory.

## Recent Updates

### Critical Fixes Applied

1. **Q&A Image Display Fix**
   - Fixed bucket name consistency between upload and display
   - Enhanced error handling for image loading
   - Updated all Q&A components to use `qa-images` bucket

2. **Enhanced Form Image Functionality**
   - Added full-screen image viewer with zoom controls
   - Improved image gallery for form attachments
   - Better image preview and interaction

3. **Navbar Translation Updates**
   - Added proper translation keys for "Statistics" and "Create Quiz"
   - Updated both English and Azerbaijani translations
   - Ensured consistent navigation labeling

4. **Vercel Deployment Configuration**
   - Added `vercel.json` with SPA routing support
   - Optimized build configuration for production
   - Enhanced asset caching and security headers

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── ui/             # Base UI components
│   ├── layout/         # Layout components
│   └── admin/          # Admin-specific components
├── pages/              # Page components
├── hooks/              # Custom React hooks
├── contexts/           # React contexts
├── lib/                # Utility libraries
├── locales/            # Translation files
├── services/           # API services
└── utils/              # Utility functions
```

## Features Details

### Image Management
- Advanced cropping with aspect ratio control
- Multiple storage buckets for different content types
- Automatic image optimization and compression
- Full-screen image viewer with zoom and pan
- Error handling and fallback mechanisms

### Q&A System
- Rich text and math expression support
- Image attachments for questions and answers
- Voting and reputation system
- Category-based organization
- Real-time updates

### Forms System
- Dynamic form creation
- File attachments with preview
- Access control (public/private)
- Submission tracking and analytics
- Mathematical content support

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions, please open an issue in the repository.
