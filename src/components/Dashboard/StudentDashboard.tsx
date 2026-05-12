import { useEffect, useState } from 'react';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../hooks/useAuth';
import { GraduationCap, Calendar, CheckSquare, Award } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

export default function StudentDashboard() {
  const [isMounted, setIsMounted] = useState(false);
  const { user } = useAuth();
  const [attendance, setAttendance] = useState<any[]>([]);
  const [subjectAttendance, setSubjectAttendance] = useState<any[]>([]);
  const [stats, setStats] = useState({ present: 0, total: 0 });

  useEffect(() => {
    const fetchAttendance = async () => {
      if (!user) return;
      
      // Fetch classes first
      const classesSnap = await getDocs(collection(db, 'classes'));
      const classesMap = classesSnap.docs.reduce((acc, doc) => {
        acc[doc.id] = doc.data();
        return acc;
      }, {} as any);

      const q = query(
        collection(db, 'attendance'), 
        where('studentId', '==', user.id),
        orderBy('date', 'desc')
      );
      const allSnap = await getDocs(q);
      const allRecords = allSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      
      setAttendance(allRecords.slice(0, 5).map(rec => ({
        ...rec,
        className: classesMap[rec.classId]?.name || 'Unknown Class'
      })));

      // Calculate stats
      const presentCount = allRecords.filter((d: any) => d.status === 'present').length;
      setStats({ present: presentCount, total: allRecords.length });

      // Calculate subject-wise attendance
      const subjectMap = allRecords.reduce((acc: any, rec: any) => {
        const classInfo = classesMap[rec.classId];
        if (!classInfo) return acc; // Skip orphaned records for deleted classes
        
        if (!acc[rec.classId]) {
          acc[rec.classId] = { present: 0, total: 0, name: classInfo.name };
        }
        acc[rec.classId].total += 1;
        if (rec.status === 'present') acc[rec.classId].present += 1;
        return acc;
      }, {} as any);

      const subjectList = Object.entries(subjectMap).map(([id, data]: [string, any]) => ({
        id,
        ...data,
        percentage: Number(((data.present / data.total) * 100).toFixed(1))
      }));
      setSubjectAttendance(subjectList);
    };
    fetchAttendance();
    setIsMounted(true);
  }, [user]);

  const percentage = stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0;

  const chartData = [
    { name: 'Present', value: stats.present || 85 },
    { name: 'Absent', value: (stats.total - stats.present) || 15 },
  ];
  const COLORS = ['#2563eb', '#f1f5f9'];

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-1 bg-white p-8 rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center">
          <h3 className="text-lg font-bold text-slate-900 mb-6">Overall Presence</h3>
          <div className="relative w-48 h-48 mb-6">
            {isMounted && (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            )}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <p className="text-3xl font-black text-slate-900">{percentage}%</p>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Attendance</p>
            </div>
          </div>
          <div className="flex gap-4 w-full">
            <div className="flex-1 bg-blue-50 p-3 rounded-2xl">
              <p className="text-[10px] font-bold text-blue-500 uppercase">Present</p>
              <p className="text-xl font-bold text-blue-700">{stats.present}</p>
            </div>
            <div className="flex-1 bg-slate-50 p-3 rounded-2xl">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Total</p>
              <p className="text-xl font-bold text-slate-700">{stats.total}</p>
            </div>
          </div>
        </div>

        <div className="lg:col-span-3 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StudentCard title="Level" value="Semester 4" icon={GraduationCap} />
            <StudentCard title="Status" value="On Track" icon={Award} />
            <StudentCard title="Next Evaluation" value="June 15" icon={Calendar} />
          </div>

          <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 mb-6">Subject Performance</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {subjectAttendance.map((subject) => (
                <div key={subject.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-bold text-slate-900 text-sm truncate">{subject.name}</span>
                    <span className={`text-xs font-black px-2 py-1 rounded-lg ${subject.percentage >= 75 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      {subject.percentage}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-500 ${subject.percentage >= 75 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                      style={{ width: `${subject.percentage}%` }}
                    />
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Attendance Rate</span>
                    <span className="text-[10px] text-slate-500 font-bold uppercase">{subject.present}/{subject.total} Sessions</span>
                  </div>
                </div>
              ))}
              {subjectAttendance.length === 0 && (
                <div className="col-span-full py-6 text-center border-2 border-dashed border-slate-100 rounded-3xl">
                  <p className="text-slate-400 text-sm italic">No subject data available yet. Start attending sessions!</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-lg font-bold text-slate-900">Recent Records</h3>
              <button className="text-blue-600 text-sm font-bold hover:underline">View History</button>
            </div>
            <div className="space-y-4">
              {attendance.map((rec) => (
                <div key={rec.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl ${rec.status === 'present' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                      <CheckSquare size={18} />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">{rec.className}</p>
                      <p className="text-xs text-slate-500">{rec.date}</p>
                    </div>
                  </div>
                  <div className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${rec.status === 'present' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
                    {rec.status}
                  </div>
                </div>
              ))}
              {attendance.length === 0 && (
                <p className="text-center py-8 text-slate-400 italic">No recent attendance data.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StudentCard({ title, value, icon: Icon }: any) {
  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
      <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl">
        <Icon size={24} />
      </div>
      <div>
        <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">{title}</p>
        <p className="text-lg font-bold text-slate-900">{value}</p>
      </div>
    </div>
  );
}
