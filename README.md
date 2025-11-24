# Calendar

## Project Information
- Course: COMP3810SEF 
- Group: Group 62
- Members: SHAM Hoi Laam (13902788), LEE Ka Mei (14077641), Ng Tsz Chung (14029225)
- Deployed URL: https://comp3810sef-group62-2.onrender.com/ 

## Project File Overview
- server.js: Main server file that integrates Express, MongoDB, and Passport. It handles user authentication (Google OAuth and username/password), session management, and provides RESTful APIs for calendar event CRUD operations.
- package.json: List all dependencies used in the project, including: express, mongoose, passport, bcrypt, connect-mongo, ejs.
- views/: EJS template files for rendering UI, including: login.ejs for login page, register.ejs for registration page, calendar.ejs for main calendar interface.

# Operation Guide
## Login/Logout Flow
1.  Users can choose:
    - Google Login: /auth/google
    - Username/Password Login: /login
2. Register a new account: /register
3. After successful login, users are redirected to /calendar
4. Logout via /logout

# Web-Based CRUD Flow
On the  page:
• 	Create: Click “Add Event” to open a form and create a new event
•   Read: Events are automatically loaded and displayed on the calendar 
• 	Update: Click an existing event to edit its title, date, or description
• 	Delete: Click “Delete” to remove an event

# RESTful API Guide
| Function     | Method | URL               | Description              |
|--------------|--------|-------------------|--------------------------|
| Get Events   | GET    | /api/events       | Returns all user events  |
| Create Event | POST   | /api/events       | Create new event         |
| Update Event | PUT    | /api/events/:id   | Updates event            |
| Delete Event | DELETE | /api/events/:id   | Deletes event            |

# API Testing with curl

## Step 1: Register a test account
curl -X POST http://localhost:3000/register \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=test&password=testtest"

## Step 2: Log in and store session cookie
curl -c cookie.txt -X POST http://localhost:3000/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -H "Accept: application/json" \
  -d "username=test&password=testtest"

## Step 3: Send authenticated request to create an event
- Create an event
curl -b cookie.txt -X POST http://localhost:3000/api/events \
  -H "Content-Type: application/json" \
  -d '{ "title": "Meeting", "date": "2025-11-25", "description": "Team sync" }'

- Read all events
curl -b cookie.txt -X GET http://localhost:3000/api/events

- Update an event
curl -b cookie.txt -X PUT http://localhost:3000/api/events/<event_id> \
  -H "Content-Type: application/json" \
  -d "{\"title\":\"Updated Meeting\",\"date\":\"2025-11-26\",\"description\":\"Updated team sync\"}"

- Delete an event
curl -b cookie.txt -X DELETE http://localhost:3000/api/events/<event_id>
