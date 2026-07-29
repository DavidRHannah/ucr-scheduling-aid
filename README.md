# UCR Scheduling Aid

UCR Scheduling Aid is a web application created for UC Riverside students. It makes class registration planning fast and efficient by finding class combinations that fit according to your needs.

---

## What It Does

Planning a university a schedule by hand can be tedious and doesn't gurantee you find the best schedule according to your needs. UCR Scheduling Aid takes live course data for the upcoming quarter and ranks schedules according to your preferences.

---

## Key Features

### 1. Schedule Builder
- Select the courses you need for the term.
- See every possible schedule option.
- Lock specific sections.
- Hide full or waitlisted classes.

### 2. Preference Ranking
- Score schedules based on what fits your lifestyle:
  - Preferred days of the week for being on campus.
  - Ideal start time.
  - Density of courses 
- Each generated schedule is scored according to these preferences

### 3. Course Catalog Search
- Look up courses by keyword, course code, or department.
- View course descriptions, prerequisite requirements, and section availability.
- Click any course to open a detail view without losing your place.

### 4. Save, Edit, and Export
- Save your schedules.
- Re-open schedules to make changes or try new options.
- Export your schedule to Google Calendar, Apple Calendar, or Outlook via ICS.

### 5. Automatic Progress Saving
- The in-progress schedule is saved in your browser so you don't lose your progress.

---

## How to Use the App

1. Search for courses: Find the classes you need for the upcoming quarter and add them to your list.
2. Set your preferences: Choose your preferred class days, start times, and break preferences.
3. Lock favorite times: If you prefer a specific section time, lock (pin) it in place.
4. Pick your schedule: Browse the options, select your favorite, and save or export it to your calendar.

---

## Setting Up and Running the Application

If you want to run this application on your local computer, follow the instructions below.

### Requirements
- Node.js (version 18 or higher)
- MongoDB database

### Step 1: Start backend

1. Open your terminal and navigate to the backend folder:
   ```bash
   cd backend
   ```
2. Copy the configuration file template:
   ```bash
   cp .env.example .env
   ```
3. Open `.env` and set your MongoDB database connection link and security keys.
4. Install required software packages:
   ```bash
   npm install
   ```
5. Start the backend server:
   ```bash
   npm start
   ```

### Step 2: Start the Frontend

1. Open a new terminal window and navigate to the frontend folder:
   ```bash
   cd frontend
   ```
2. Install required software packages:
   ```bash
   npm install
   ```
3. Start the web application:
   ```bash
   npm run dev
   ```
4. Open the link shown in your terminal (usually `http://localhost:5173`) in your web browser.

---

## Testing and Maintenance

- Run tests:
  ```bash
  npm test
  ```
- Building frontend:
  ```bash
  npm run build
  ```
