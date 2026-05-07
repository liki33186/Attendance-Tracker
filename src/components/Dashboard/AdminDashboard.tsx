import { useEffect, useState } from 'react';
import { collection, getDocs, addDoc, serverTimestamp, setDoc, doc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Users, UserSquare2, BookOpen, CalendarCheck, TrendingUp, TrendingDown } from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area 
} from 'recharts';

export default function AdminDashboard() {
  const [isMounted, setIsMounted] = useState(false);
  const [stats, setStats] = useState({
    students: 0,
    teachers: 0,
    classes: 0,
    attendanceToday: 0
  });

  useEffect(() => {
    const fetchStats = async () => {
      const studentsSnap = await getDocs(collection(db, 'students'));
      const teachersSnap = await getDocs(collection(db, 'teachers'));
      const classesSnap = await getDocs(collection(db, 'classes'));
      
      setStats({
        students: studentsSnap.size,
        teachers: teachersSnap.size,
        classes: classesSnap.size,
        attendanceToday: 85 // Mock stat for now
      });
    };
    fetchStats();
    setIsMounted(true);
  }, []);

  const chartData = [
    { name: 'Mon', value: 78 },
    { name: 'Tue', value: 82 },
    { name: 'Wed', value: 85 },
    { name: 'Thu', value: 89 },
    { name: 'Fri', value: 84 },
  ];

  const seedData = async () => {
    try {
      // Seed Teachers
      const teachersData = [
        { name: 'Dr. Robert Wilson', email: 'robert@institute.com', subject: 'Advanced Mathematics' },
        { name: 'Prof. Sarah Chen', email: 'sarah@institute.com', subject: 'Quantum Physics' }
      ];
      
      for (const t of teachersData) {
        const uRef = await addDoc(collection(db, 'users'), { ...t, role: 'teacher', createdAt: serverTimestamp() });
        await setDoc(doc(db, 'teachers', uRef.id), { userId: uRef.id, subject: t.subject });
      }

      // Seed Students
      const studentsData = [
        { name: 'Alice Cooper', email: 'alice@student.com', dept: 'CS', sem: '4' },
        { name: 'Bob Marley', email: 'bob@student.com', dept: 'EE', sem: '6' }
      ];

      for (const s of studentsData) {
        const uRef = await addDoc(collection(db, 'users'), { name: s.name, email: s.email, role: 'student', createdAt: serverTimestamp() });
        await setDoc(doc(db, 'students', uRef.id), { userId: uRef.id, department: s.dept, semester: s.sem });
      }

      // Seed Classes
      await addDoc(collection(db, 'classes'), { name: 'CS101', subject: 'Computer Science', teacherId: 'sample-id', createdAt: serverTimestamp() });
      
      alert('Sample data seeded successfully!');
      window.location.reload();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Executive Dashboard</h2>
          <p className="text-slate-400 text-sm font-medium">Monitoring institute activities in real-time</p>
        </div>
        <button 
          onClick={seedData}
          className="text-[10px] font-bold text-slate-400 border border-slate-200 px-4 py-2 rounded-xl hover:bg-slate-100 transition-all uppercase tracking-widest"
        >
          Seed Sample Data
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          label="Total Students" 
          value={stats.students} 
          icon={Users} 
          trend="+4.5%" 
          positive={true} 
          color="blue"
        />
        <StatCard 
          label="Total Teachers" 
          value={stats.teachers} 
          icon={UserSquare2} 
          trend="+2.1%" 
          positive={true} 
          color="indigo"
        />
        <StatCard 
          label="Active Classes" 
          value={stats.classes} 
          icon={BookOpen} 
          trend="0.0%" 
          positive={true} 
          color="violet"
        />
        <StatCard 
          label="Avg Attendance" 
          value={`${stats.attendanceToday}%`} 
          icon={CalendarCheck} 
          trend="-1.2%" 
          positive={false} 
          color="emerald"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Attendance Overview</h3>
              <p className="text-sm text-slate-500">Weekly statistics of overall attendance</p>
            </div>
            <select className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 text-sm font-medium outline-none">
              <option>Last 7 Days</option>
              <option>Last 30 Days</option>
            </select>
          </div>
          
          <div className="h-[300px]">
            {isMounted && (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                  <Tooltip 
                    contentStyle={{backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #f1f5f9', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                  />
                  <Area type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-6">Subject Statistics</h3>
          <div className="space-y-6">
            <SubjectProgress name="Mathematics" percentage={82} color="bg-blue-500" />
            <SubjectProgress name="Physics" percentage={75} color="bg-indigo-500" />
            <SubjectProgress name="Computer Science" percentage={94} color="bg-emerald-500" />
            <SubjectProgress name="English" percentage={68} color="bg-amber-500" />
            <SubjectProgress name="History" percentage={88} color="bg-violet-500" />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, trend, positive, color }: any) {
  const colorMap: any = {
    blue: 'bg-blue-50 text-blue-600',
    indigo: 'bg-indigo-50 text-indigo-600',
    violet: 'bg-violet-50 text-violet-600',
    emerald: 'bg-emerald-50 text-emerald-600',
  };

  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-2xl ${colorMap[color] || colorMap.blue}`}>
          <Icon size={24} />
        </div>
        <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${positive ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
          {positive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          {trend}
        </div>
      </div>
      <div>
        <h4 className="text-slate-500 text-sm font-medium mb-1">{label}</h4>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
      </div>
    </div>
  );
}

function SubjectProgress({ name, percentage, color }: any) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="font-medium text-slate-700">{name}</span>
        <span className="text-slate-500">{percentage}%</span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div 
          className={`h-full ${color} rounded-full`} 
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
