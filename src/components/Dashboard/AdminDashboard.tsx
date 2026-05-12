import { useEffect, useState, useRef } from 'react';
import { collection, onSnapshot, addDoc, serverTimestamp, setDoc, doc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Users, UserSquare2, BookOpen, CalendarCheck, TrendingUp, TrendingDown, Bell } from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area 
} from 'recharts';
import { animate, motion, AnimatePresence } from 'motion/react';

export default function AdminDashboard() {
  const [isMounted, setIsMounted] = useState(false);
  const [stats, setStats] = useState({
    students: 0,
    teachers: 0,
    classes: 0,
    attendanceToday: 0
  });

  const [subjectStats, setSubjectStats] = useState<any[]>([]);
  const [notification, setNotification] = useState<string | null>(null);
  const prevSubjectIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    setIsMounted(true);

    // Real-time listeners
    const unsubStudents = onSnapshot(collection(db, 'students'), (snap) => {
      setStats(prev => ({ ...prev, students: snap.size }));
    });

    const unsubTeachers = onSnapshot(collection(db, 'teachers'), (snap) => {
      setStats(prev => ({ ...prev, teachers: snap.size }));
    });

    const unsubClasses = onSnapshot(collection(db, 'classes'), (snap) => {
      setStats(prev => ({ ...prev, classes: snap.size }));
    });

    const unsubAttendance = onSnapshot(collection(db, 'attendance'), (attSnap) => {
      // Need classes for names
      const unsubClassesForNames = onSnapshot(collection(db, 'classes'), (classesSnap) => {
        const classes = classesSnap.docs.reduce((acc: any, d) => {
          acc[d.id] = d.data().name;
          return acc;
        }, {});

        const currentSubjectIds = new Set(Object.keys(classes));
        
        // Detect new subjects
        if (prevSubjectIds.current.size > 0) {
          const added = Array.from(currentSubjectIds).filter(id => !prevSubjectIds.current.has(id));
          if (added.length > 0) {
            const newNames = added.map(id => classes[id]).join(', ');
            setNotification(`New subject added: ${newNames}`);
            setTimeout(() => setNotification(null), 5000);
          }
        }
        prevSubjectIds.current = currentSubjectIds;

        let totalPresent = 0;
        let totalRecords = 0;

        const attendanceMap = Object.values(classes).reduce((acc: any, name: any) => {
          acc[name] = { present: 0, total: 0 };
          return acc;
        }, {});

        attSnap.docs.forEach((d) => {
          const data = d.data();
          const className = classes[data.classId];
          if (!className) return;

          attendanceMap[className].total += 1;
          totalRecords += 1;
          if (data.status === 'present') {
            attendanceMap[className].present += 1;
            totalPresent += 1;
          }
        });

        setStats(prev => ({
          ...prev,
          attendanceToday: totalRecords > 0 ? Number(((totalPresent / totalRecords) * 100).toFixed(1)) : 0
        }));

        const list = Object.entries(attendanceMap).map(([name, data]: [string, any]) => ({
          name,
          percentage: data.total > 0 ? Number(((data.present / data.total) * 100).toFixed(1)) : 0,
          color: ['bg-blue-500', 'bg-emerald-500', 'bg-indigo-500', 'bg-violet-500', 'bg-amber-500'][Math.floor(Math.random() * 5)]
        }));
        
        setSubjectStats(list);
      });

      return () => unsubClassesForNames();
    });

    return () => {
      unsubStudents();
      unsubTeachers();
      unsubClasses();
      unsubAttendance();
    };
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
      <div className="flex justify-between items-center relative">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Executive Dashboard</h2>
          <p className="text-slate-400 text-sm font-medium">Monitoring institute activities in real-time</p>
        </div>
        
        <AnimatePresence>
          {notification && (
            <motion.div 
              initial={{ opacity: 0, y: -20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.9 }}
              className="absolute top-0 right-48 flex items-center gap-3 px-6 py-3 bg-emerald-500 text-white rounded-2xl shadow-xl shadow-emerald-100 z-50"
            >
              <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center animate-pulse">
                <Bell size={18} />
              </div>
              <span className="text-sm font-bold">{notification}</span>
            </motion.div>
          )}
        </AnimatePresence>

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
            <AnimatePresence mode="popLayout">
              {subjectStats.length === 0 ? (
                <motion.p 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-slate-400 text-sm italic"
                >
                  No attendance data available
                </motion.p>
              ) : (
                subjectStats.map((sub, i) => (
                  <motion.div 
                    key={sub.name}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    layout
                    transition={{ 
                      type: "spring",
                      stiffness: 300,
                      damping: 30,
                      delay: i * 0.05 
                    }}
                  >
                    <SubjectProgress name={sub.name} percentage={sub.percentage} color={sub.color} />
                  </motion.div>
                ))
              )}
            </AnimatePresence>
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
