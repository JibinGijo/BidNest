# BidNest - Online Auction Platform

BidNest is a modern, real-time auction platform built with React, Supabase, and TypeScript. It provides a secure and intuitive environment for users to create, manage, and participate in online auctions.

## Features

### User Features
- **User Authentication**
  - Email-based registration and login
  - Secure password management
  - Profile customization

- **Auction Management**
  - Create and manage auction listings
  - Upload product images
  - Set starting prices
  - Monitor active auctions

- **Bidding System**
  - Real-time bid updates
  - Automatic bid validation
  - Bid history tracking
  - Auction expiration management

- **Interactive Chat Support**
  - AI-powered chatbot
  - Context-aware responses
  - Instant help and guidance

### Admin Features
- **Dashboard**
  - User management
  - Listing oversight
  - Transaction monitoring
  - Analytics and reporting

## Technology Stack

- **Frontend**
  - React 18
  - TypeScript
  - Tailwind CSS
  - Lucide React (icons)
  - React Router DOM

- **Backend**
  - Supabase (Backend as a Service)
  - PostgreSQL Database
  - Real-time subscriptions
  - Row Level Security (RLS)

- **Storage**
  - Supabase Storage
  - Image optimization
  - Secure file management

## Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- Supabase account

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/bidnest.git
cd bidnest
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env` file in the root directory and add your Supabase credentials:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Start the development server:
```bash
npm run dev
```

## Project Structure

```
bidnest/
├── src/
│   ├── components/     # Reusable UI components
│   ├── context/       # React context providers
│   ├── lib/           # Utility functions and configurations
│   ├── pages/         # Page components
│   └── types/         # TypeScript type definitions
├── supabase/
│   └── migrations/    # Database migrations
└── public/           # Static assets
```

## Key Features Implementation

### Authentication
- Secure email-based authentication
- Protected routes for authenticated users
- Admin-specific routes and permissions

### Real-time Updates
- Live bid updates using Supabase subscriptions
- Automatic auction status updates
- Instant notification system

### Data Security
- Row Level Security (RLS) policies
- Secure file storage
- Data validation and sanitization

### User Experience
- Responsive design
- Interactive UI components
- Form validation
- Error handling
- Loading states

## Database Schema

### Core Tables
- `profiles`: User profiles and settings
- `listings`: Auction listings and details
- `bids`: Bid history and tracking

### Security
- RLS policies for data access control
- Foreign key constraints
- Automated triggers for data consistency

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Built with [Vite](https://vitejs.dev/)
- Powered by [Supabase](https://supabase.com/)
- Icons by [Lucide](https://lucide.dev/)
- Styling with [Tailwind CSS](https://tailwindcss.com/)
