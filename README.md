# Dot's of Love Pet Sitting Website

A professional pet sitting business website with admin panel for managing gallery, rates, and contact requests.

## File Structure

```
pet-sitting-website/
├── public/
│   ├── index.html              # Main HTML structure
│   ├── css/
│   │   ├── main.css           # Core styles and layout
│   │   ├── components.css     # Gallery, modal, and component styles
│   │   └── admin.css          # Admin panel specific styles
│   ├── js/
│   │   ├── api.js             # API helper functions and configuration
│   │   ├── main.js            # Core navigation and app logic
│   │   ├── gallery.js         # Gallery and modal functionality
│   │   ├── contact.js         # Contact form handling
│   │   └── admin.js           # Admin panel functionality
│   └── uploads/               # User uploaded images (created by server)
├── data/                      # Database storage (created by server)
│   └── contacts.db           # SQLite database
├── server.js                 # Backend Express server
├── package.json              # Node.js dependencies
└── README.md                 # This file
```

## Features

### Public Website
- **About Page**: Dynamic services loaded from rates database
- **Gallery**: Pet photos with image carousel modal
- **Rates**: Current pricing for services
- **Contact Form**: Customer inquiry submission with validation
- **Testimonials**: Customer reviews section

### Admin Panel
- **Gallery Management**: Add/edit/delete pet photos and stories
- **Rates Management**: Manage service pricing and descriptions
- **Contact Requests**: View customer inquiries
- **Authentication**: Secure login with session management

## Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Variables
Create a `.env` file with:
```env
ADMIN_PASSWORD=your_secure_password
SENDGRID_API_KEY=your_sendgrid_key
JWT_SECRET=your_jwt_secret
NODE_ENV=production
```

### 3. Database Setup
The SQLite database will be created automatically on first run with default rates.

### 4. Run the Application
```bash
# Development
npm run dev

# Production
npm start
```

## Deployment

### Railway Deployment
1. Connect your GitHub repository to Railway
2. Set environment variables in Railway dashboard
3. Add `railway.toml` for persistent storage:

```toml
[build]
buildCommand = "npm install"

[deploy]
startCommand = "npm start"

[volumes]
data = "/app/data"
```

### File Upload Storage
- Images are stored in `/uploads` directory
- Database files in `/data` directory
- Both directories persist between deployments with proper volume configuration

## API Endpoints

### Public Endpoints
- `GET /api/gallery` - Get all pets with images
- `GET /api/rates` - Get active service rates
- `POST /api/contact` - Submit contact form

### Admin Endpoints (Require Authentication)
- `POST /api/admin/auth` - Admin login
- `GET /api/admin/validate` - Validate token
- `GET /api/admin/contacts` - Get contact requests
- Gallery: `GET/POST/PUT/DELETE /api/admin/gallery`
- Rates: `GET/POST/PUT/DELETE /api/admin/rates`

## Development Notes

### Adding New Features
1. **New Page**: Add HTML section in `index.html`, styles in appropriate CSS file
2. **New API**: Add endpoint in `server.js`, helper function in `api.js`
3. **New Component**: Add styles in `components.css`, functionality in appropriate JS file

### Code Organization
- **CSS**: Organized by purpose (main layout, components, admin)
- **JavaScript**: Modular by functionality area
- **API**: Centralized in `api.js` with consistent error handling

### Browser Support
- Modern browsers (ES6+ features used)
- Responsive design for mobile devices
- Progressive enhancement for JavaScript features

## Security Features
- JWT-based admin authentication
- File upload validation (type and size)
- CORS configuration
- Input sanitization and validation
- Session timeout management

## Maintenance

### Database Backup
```bash
# Backup database
cp data/contacts.db data/contacts_backup_$(date +%Y%m%d).db
```

### Log Monitoring
- Server logs show database operations
- Email delivery status
- Authentication attempts

### Performance
- Images served statically by Express
- Database queries optimized with indexes
- CSS/JS files can be minified for production