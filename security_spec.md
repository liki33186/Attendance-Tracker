# Security Specification: Simple Attendance Tracker

## Data Invariants
1. A **User** must have a unique email and a valid role (`admin`, `teacher`, `student`).
2. A **Student** profile must link to an existing `users` document.
3. A **Teacher** profile must link to an existing `users` document.
4. An **Attendance** record must link to a valid `student` and `class`.
5. Only **Admins** can create/delete users and profiles.
6. **Teachers** can only `write` attendance for classes they teach.
7. **Students** can only `read` their own specific attendance records.

## The Dirty Dozen Payloads (Target: DENY)

1. **Role Escalation**: `PATCH /users/{uid} { "role": "admin" }` (by student).
2. **Identity Spoofing**: `POST /attendance { "studentId": "victim_uid", ... }` (by other student).
3. **Cross-Teacher Sabotage**: `POST /attendance { "classId": "other_teacher_class", ... }` (by teacher A).
4. **Orphaned Registration**: `POST /students { "userId": "non_existent_id", ... }` (missing auth).
5. **System Infiltration**: `POST /users { "email": "evil@hacker.com", "role": "admin" }` (public write).
6. **Time Travel**: `POST /attendance { "date": "2099-01-01", ... }` (future date).
7. **Resource Exhaustion**: `POST /users/large_id { "name": "A" * 1000000 }` (massive string).
8. **Malicious ID Injection**: `POST /users/../root_file { ... }` (path traversal).
9. **Terminal State Break**: `PATCH /attendance/{id} { "status": "present" }` where record was locked (if implemented).
10. **Shadow Field Injection**: `POST /users { "isVerified": true, "role": "student" }`.
11. **Bulk Data Scrape**: `GET /users` (list all users by student).
12. **Unauthorized Deletion**: `DELETE /classes/{id}` (by teacher).

## Tests
- Verified by: `firestore.rules.test.ts` (drafting logic below).
