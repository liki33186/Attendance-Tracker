import { useAuth } from '../hooks/useAuth';
import AdminDashboard from '../components/Dashboard/AdminDashboard';
import TeacherDashboard from '../components/Dashboard/TeacherDashboard';
import StudentDashboard from '../components/Dashboard/StudentDashboard';

export default function Dashboard() {
  const { user } = useAuth();

  if (user?.role === 'admin') return <AdminDashboard />;
  if (user?.role === 'teacher') return <TeacherDashboard />;
  if (user?.role === 'student') return <StudentDashboard />;

  return (
    <div className="flex items-center justify-center h-64">
      <p className="text-slate-500">Assigning role access...</p>
    </div>
  );
}
