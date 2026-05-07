export type UserRole = 'admin' | 'teacher' | 'student';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: any;
}

export interface StudentDetails {
  id: string;
  userId: string;
  department: string;
  semester: string;
}

export interface TeacherDetails {
  id: string;
  userId: string;
  subject: string;
}

export interface ClassRoom {
  id: string;
  name: string;
  subject: string;
  teacherId: string;
}

export interface AttendanceRecord {
  id: string;
  studentId: string;
  classId: string;
  date: string;
  status: 'present' | 'absent';
}

export interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  login: () => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
}
