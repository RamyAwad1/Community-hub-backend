Community Hub Backend API
This repository contains the backend API for the Community Hub application. It provides RESTful endpoints for user management, event creation, event approval, and other core functionalities, serving data to the frontend application.

🚀 Features
Custom User Authentication: Secure registration and login using JWTs, bcrypt for password hashing.

Role-Based Authorization: Middleware to protect routes based on user roles (user, organizer, admin).

User Management: Endpoints for creating/updating user profiles and fetching current user data.

Event Management:

Publicly accessible endpoints to browse all approved events and view individual event details.

Protected endpoints for organizers/admins to create new events.

Protected endpoints for admins to approve pending events.

PostgreSQL Database: Persistent storage for user, event, and registration data.

CORS Enabled: Configured to allow requests from your frontend application.

🛠️ Technologies Used
Node.js: JavaScript runtime environment.

Express.js: Web application framework for building RESTful APIs.

PostgreSQL: Relational database management system.

pg (node-postgres): PostgreSQL client for Node.js.

dotenv: For loading environment variables from a .env file.

cors: Express middleware for Cross-Origin Resource Sharing.

bcryptjs: For hashing and comparing passwords securely.

jsonwebtoken: For creating and verifying JSON Web Tokens (JWTs) for authentication.

📦 Installation & Setup
Follow these steps to get the backend API up and running on your local machine.

Prerequisites
Node.js (LTS version recommended)

npm or Yarn (package manager)

PostgreSQL database server installed and running.

1. Clone the Repository
(Assuming you have the repository cloned, if not, replace with your actual clone command)

git clone <your-backend-repo-url>
cd community-hub/backend # Navigate into your backend directory

2. Install Dependencies
npm install
# OR
yarn install

3. Database Setup
Ensure you have a PostgreSQL server running.

Create a Database
Open your PostgreSQL client (e.g., psql, pgAdmin, or your preferred tool) and create a new database.

CREATE DATABASE community_hub_db;

Configure Environment Variables
Create a .env file in the root of your backend/ directory with the following content. Replace the placeholder values with your actual PostgreSQL credentials and a strong JWT secret.

# .env file

# PostgreSQL Database Configuration
DB_USER=your_pg_username   # e.g., postgres
DB_HOST=localhost          # or your PostgreSQL host IP if it's on a different machine
DB_DATABASE=community_hub_db # The name of the database you created
DB_PASSWORD=your_pg_password # Your PostgreSQL user's password
DB_PORT=5432               # Default PostgreSQL port

# Custom JWT Authentication Configuration
JWT_SECRET=YOUR_VERY_STRONG_RANDOM_SECRET_KEY # CHANGE THIS! Use a long, random string.
JWT_EXPIRES_IN=1d # Token expiry time (e.g., 1h, 1d, 7d)

Important: The JWT_SECRET should be a long, complex, and random string. Do NOT use easily guessable phrases. You can generate one using an online tool or a command like node -e "console.log(require('crypto').randomBytes(32).toString('hex'))".

Apply Database Schema
Execute the SQL statements from your schema file to create the necessary tables in your community_hub_db database.

File: community-hub-postgresql-schema (from our previous discussion)

-- Table: users
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    password_hash TEXT NOT NULL, -- Stores the hashed password
    role TEXT NOT NULL DEFAULT 'user',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_users_email ON users (email);

-- Table: events
CREATE TABLE events (
    event_id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    date DATE NOT NULL,
    time TIME NOT NULL,
    location TEXT NOT NULL,
    organizer_id INT NOT NULL,
    capacity INT,
    status TEXT NOT NULL DEFAULT 'pending',
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT fk_organizer FOREIGN KEY (organizer_id) REFERENCES users (user_id) ON DELETE CASCADE
);
CREATE INDEX idx_events_date ON events (date);
CREATE INDEX idx_events_organizer_id ON events (organizer_id);
CREATE INDEX idx_events_status ON events (status);

-- Table: registrations
CREATE TABLE registrations (
    registration_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    event_id INT NOT NULL,
    registered_at TIMESTAMPTZ DEFAULT NOW(),
    status TEXT DEFAULT 'registered',
    UNIQUE (user_id, event_id),
    CONSTRAINT fk_registration_user FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE,
    CONSTRAINT fk_registration_event FOREIGN KEY (event_id) REFERENCES events (event_id) ON DELETE CASCADE
);
CREATE INDEX idx_registrations_user_id ON registrations (user_id);
CREATE INDEX idx_registrations_event_id ON registrations (event_id);

4. Running the API
node server.js
# OR (if you have nodemon installed for development)
nodemon server.js

The backend API should now be running at http://localhost:5000.

💻 API Endpoints
All API endpoints are prefixed with /api.

Authentication (/api/auth)
POST /api/auth/register

Description: Registers a new user.

Body: { "email": "string", "name": "string", "password": "string", "role": "user" | "organizer" | "admin" (optional, defaults to 'user') }

Response: { "message": "User registered.", "user": {}, "token": "jwt_token" }

Notes: For initial testing, you can register admin@example.com and organizer@example.com to get those roles.

POST /api/auth/login

Description: Logs in a user and returns a JWT.

Body: { "email": "string", "password": "string" }

Response: { "message": "Login successful.", "user": {}, "token": "jwt_token" }

Users (/api/users) - Protected Routes (Requires JWT in Authorization: Bearer <token> header)
GET /api/users/profile

Description: Retrieves the profile of the currently authenticated user.

Access: Authenticated Users, Organizers, Admins.

Response: { "user_id": int, "email": "string", "name": "string", "role": "string", ... }

PUT /api/users/profile

Description: Updates the profile of the currently authenticated user.

Body: { "name": "string" (optional), "email": "string" (optional) }

Access: Authenticated Users, Organizers, Admins.

Response: { "user_id": int, "email": "string", "name": "string", "role": "string" }

Events (/api/events)
GET /api/events

Description: Retrieves a list of all approved public events.

Access: Public.

Response: [{ event_object_1 }, { event_object_2 }, ...]

GET /api/events/:id

Description: Retrieves details for a single event by ID.

Access: Public.

Response: { event_object }

POST /api/events

Description: Creates a new event. The event will initially have a 'pending' status.

Body: { "title": "string", "description": "string", "date": "YYYY-MM-DD", "time": "HH:MM", "location": "string", "capacity": int (optional), "image_url": "string" (optional) }

Access: Authenticated Organizers, Admins.

Response: { new_event_object }

PUT /api/events/:id/approve

Description: Approves a pending event, changing its status to 'approved'.

Access: Authenticated Admins.

Response: { "message": "Event approved!", "event": { approved_event_object } }

Admin-Only Test (/api/admin-only)
GET /api/admin-only

Description: A test endpoint to verify admin role access.

Access: Authenticated Admins.

Response: { "message": "Welcome, admin! DB ID: <user_id>." }

Health Check (/health)
GET /health

Description: Simple endpoint to check if the backend is running.

Access: Public.

Response: Backend is healthy!

📄 Key Backend Files & Structure
server.js: The main entry point of the Express.js application, sets up middleware, connects to the database, and integrates all API routes.

.env: Environment configuration file (crucial for database credentials and JWT secret).

db.js: Centralized PostgreSQL connection pool setup.

middleware/auth.middleware.js: Contains custom JWT authentication and role-based authorization middleware (authenticateToken, authorizeRole).

routes/auth.routes.js: Handles user registration and login functionalities.

routes/users.routes.js: Manages user profile fetching and updating.

routes/events.routes.js: Handles event-related CRUD operations (public read, protected create/approve).