# Interpreter Call Center Dashboard

A comprehensive dashboard system for tracking interpreter records and call data in a call center environment.

## Features

### 📊 Dashboard
- Real-time statistics for active interpreters, daily calls, missed calls
- Visual charts and graphs for data analysis
- Performance metrics and completion rates
- User distribution analytics

### 👥 Interpreters Management
- View all interpreters with online/offline status
- Track call history and performance metrics
- Individual interpreter detail pages with filters (daily/weekly/monthly/yearly)
- Monitor missed calls and response times

### 🧑‍💼 Customer Analytics
- Identify active users with high call volumes
- Detect neglected users with high cancellation/missed call rates
- Customer detail pages with complete call history
- Geographic and demographic analysis

## Technology Stack

### Backend
- **PHP** with PDO for MySQL database connectivity
- **Node.js/Express** as API proxy server
- **MySQL** database with provided credentials

### Frontend
- **React 19** with modern hooks
- **React Router** for navigation
- **Tailwind CSS** for beautiful, responsive design
- **Recharts** for interactive charts and graphs
- **Lucide React** for modern icons

## Database Schema

The system connects to an existing MySQL database with the following tables:

1. **customers** - Customer information and profiles
2. **interpreter** - Interpreter details and status
3. **monitoring_sessions** - Call session records
4. **interpreter_notification_responses** - Missed call tracking

## Installation & Setup

### Prerequisites
- PHP 7.4+ with PDO MySQL extension
- Node.js 16+
- MySQL database access
- Composer (optional, for PHP dependencies)

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install Node.js dependencies:
```bash
npm install
```

3. Start the backend server:
```bash
npm start
```

The backend will run on `http://localhost:3001`

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd InterpretersDashboard
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

The frontend will run on `http://localhost:5173`

## Database Configuration

The database connection is configured in `backend/config.php` with the provided credentials:

```php
private $host = "127.0.0.1";
private $port = "3306";
private $database = "staging7connecthear8org6_staging";
private $username = "staging7connecthear8org6_staging";
private $password = "Abcd!234Abcd!234";
```

## API Endpoints

### Dashboard Statistics
- `GET /api/dashboard-stats` - Get dashboard overview statistics

### Interpreters
- `GET /api/interpreters` - Get all interpreters with performance metrics
- `GET /api/interpreter-details?id={id}&filter={filter}` - Get detailed interpreter information

### Customers
- `GET /api/customers` - Get all customers with call analytics
- `GET /api/customer-details?id={id}` - Get detailed customer information

## Features Overview

### 🎯 Key Metrics Tracked
- Active interpreter count
- Daily call volumes
- Missed call rates
- Customer satisfaction metrics
- Response times
- Geographic distribution

### 📈 Analytics & Reports
- Real-time dashboard with live statistics
- Historical trend analysis
- Performance comparison charts
- Customer segmentation
- Interpreter efficiency reports

### 🔍 Advanced Filtering
- Time-based filters (daily, weekly, monthly, yearly)
- Status-based filtering
- Geographic filtering
- Performance-based sorting

### 📱 Responsive Design
- Mobile-friendly interface
- Tablet-optimized layouts
- Desktop-optimized experience
- Modern, clean UI with Tailwind CSS

## Usage

1. **Start both servers** (backend on port 3001, frontend on port 5173)
2. **Open your browser** and navigate to `http://localhost:5173`
3. **Navigate through the sections** using the top navigation bar:
   - Dashboard: Overview statistics and charts
   - Interpreters: Manage and monitor interpreters
   - Customers: Analyze customer data and identify issues

## Security Notes

- Database credentials are stored in the backend configuration
- CORS is enabled for development (configure appropriately for production)
- Input validation and sanitization should be implemented for production use

## Development

### Adding New Features
1. Add new API endpoints in `backend/api.php`
2. Create corresponding API service functions in `frontend/src/services/api.js`
3. Build React components in `frontend/src/pages/` or `frontend/src/components/`

### Customizing Charts
- Charts are built using Recharts
- Modify chart data structures in individual page components
- Update chart configurations for different visualizations

## Production Deployment

For production deployment:

1. Configure proper CORS settings
2. Implement authentication and authorization
3. Set up HTTPS
4. Configure database connection pooling
5. Implement proper error handling and logging
6. Set up monitoring and alerting

## Support

This dashboard is designed to work with the existing call center database structure. For any issues or questions regarding the database schema or API endpoints, please refer to the database documentation or contact the development team.
"# Interpreter-Dashboard" 
