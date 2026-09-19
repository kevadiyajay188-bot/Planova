# Planova
# Planova — ClubOps AI

AI-powered event operations platform for college clubs.

## 📌 About

Planova helps college clubs manage their complete event lifecycle from one platform.

It manages:

- Events
- Tasks
- Volunteers
- Meetings
- Deadlines
- Documents
- Risks
- Announcements
- Budgets

The platform also uses AI to analyze previous event data and assist with planning and event operations.

## 🤖 AI Features

- AI-assisted event planning
- Historical event analysis
- Task recommendations
- Volunteer recommendations
- Meeting transcript processing
- Automatic action-item extraction
- Risk identification
- Budget analysis
- Document/knowledge search using RAG
- AI-powered announcements
- AI actions through controlled tools

## 👥 User Roles

| Role | Access |
|---|---|
| Admin / President | Full access |
| Team Lead / Coordinator | Tasks, volunteers, meetings, announcements |
| Volunteer | Assigned tasks, meetings, updates |
| Web User | Public events and RSVP |

## 🔐 Authentication

- Secure login
- Role-based access control
- Protected backend APIs
- Password hashing
- Role-based dashboard access
- AI actions respect user permissions

## 🧠 AI Workflow

```text
User Request
     ↓
AI understands context
     ↓
Retrieve previous event data
     ↓
Retrieve relevant documents
     ↓
AI generates recommendation
     ↓
Permission validation
     ↓
Confirmation if required
     ↓
Perform action
     ↓
Update database
     ↓
AI Activity Log
``` 