import { useEffect, useState } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../hooks/useAuth';
import { BookOpen, Users, CalendarCheck, CheckCircle2 } from 'lucide-react';

export default function TeacherDashboard() {
  const { user } = useAuth();
  const [classes, setClasses] = useState<any[]>([]);

  useEffect(() => {
    const fetchClasses = async () => {
      if (!user) return;
      const q = query(collection(db, 'classes'), where('teacherId', '==', user.id));
      const snap = await getDocs(q);
      setClasses(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };
    fetchClasses();
  }, [user]);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <TeacherStatCard 
          label="Assigned Classes" 
          value={classes.length} 
          icon={BookOpen} 
          color="blue"
        />
        <TeacherStatCard 
          label="Total Students" 
          value={classes.length * 40} // Placeholder calculation
          icon={Users} 
          color="indigo"
        />
        <TeacherStatCard 
          label="Attendance Today" 
          value="Pending" 
          icon={CalendarCheck} 
          color="amber"
        />
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8">
        <h3 className="text-lg font-bold text-slate-900 mb-6">Today's Schedule</h3>
        <div className="space-y-4">
          {classes.length > 0 ? classes.map((cls) => (
            <div key={cls.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-blue-200 transition-colors cursor-pointer group">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-blue-600 shadow-sm border border-slate-100 italic font-serif group-hover:scale-110 transition-transform">
                  {cls.name.charAt(0)}
                </div>
                <div>
                  <h4 className="font-bold text-slate-900">{cls.name}</h4>
                  <p className="text-sm text-slate-500">{cls.subject}</p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right hidden sm:block">
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Status</p>
                  <p className="text-sm font-semibold text-amber-500">Not Marked</p>
                </div>
                <button className="bg-white hover:bg-slate-50 text-slate-900 border border-slate-200 px-6 py-2 rounded-xl text-sm font-bold shadow-sm transition-all hover:shadow-md">
                  Mark Attendance
                </button>
              </div>
            </div>
          )) : (
            <div className="text-center py-12 text-slate-400">
              <BookOpen size={40} className="mx-auto mb-4 opacity-20" />
              <p>No classes assigned yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TeacherStatCard({ label, value, icon: Icon, color }: any) {
  const colors: any = {
    blue: 'bg-blue-600 text-white',
    indigo: 'bg-indigo-600 text-white',
    amber: 'bg-amber-500 text-white',
  };

  return (
    <div className={`${colors[color]} p-8 rounded-3xl shadow-lg relative overflow-hidden group`}>
      <div className="relative z-10">
        <p className="text-white/70 text-sm font-medium uppercase tracking-wider mb-2">{label}</p>
        <p className="text-4xl font-bold">{value}</p>
      </div>
      <Icon className="absolute -bottom-4 -right-4 w-24 h-24 text-white/10 group-hover:scale-110 transition-transform" />
    </div>
  );
}
