# UCR Scheduling Aid

![UCR Scheduling Aid Dashboard](docs/ucr_scheduling_aid.webp)

## Why

The goal of this project is to simplify course scheduling for UCR students.

The flow is the same for many students every quarter: Receive the schedule of courses, go through different combinations of courses and classes until they find one that is "good enough." 

However, I wanted to enable students to go past "good enough" and reach a point where they know that they have the optimal schedule for their circumstances.

### Features
- Create, plan, and share course schedules with friends using live registration data for the current quarter
- Support the degree planning process via a degree aware scheduling system (based on most recent catalog)
- Plan, visualize, and share their remaining quarters until graduation.

## How
- The first stage of the process is gaining degree requirement data from the UCR Catalog.
- The system then understands the requirements for each degree and college according to the requirement data.
- The student may input their previous quarters for more personalized suggestions or just use the course scheduler
- The course scheduler takes into account the students' major and college for course searching.
- The student can filter the attributes of the courses they want to take or just search for and add them.
- Once the student is satisfied with course selection, the system will generate the combinations and rank them.
- The student can browse, add, hide, and/or further filter the schedules.
- A student can use a saved schedule as the base for fitting in more classes as well, (i.e. I currently have CS100, CS111, MATH046, and I need an ethnicity course in the morning on MWF).

## Current Status

This project is under active development. The current frontend includes:
- A full app shell (sidebar navigation + header) built with React, TypeScript, Tailwind CSS, and shadcn/ui
- A fully built **Schedule Builder** page showing a locked weekly schedule, generated schedule combinations, and a course search panel
- Other sidebar pages (Dashboard, Course Search, Combos, Requirements, Saved Schedules, Settings) are placeholders pending future work

All data shown is currently hardcoded mock data shaped to match the planned backend API (see `backend/BACKEND_API.md`). Backend integration is not yet connected.
