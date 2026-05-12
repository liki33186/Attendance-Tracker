import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, serverTimestamp, setDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { formatDate } from '../lib/utils';
import { 
  Calendar, 
  MapPin, 
  CheckCircle2, 
  XCircle, 
  ChevronRight, 
  Users, 
  ArrowLeft,
  Loader2,
  FileText,
  Award
} from 'lucide-react';
import { motion } from 'motion/react';

export default function Attendance() {
  const { user } = useAuth();
  const [classes, setClasses] = useState<any[]>([]);
  const [markedClasses, setMarkedClasses] = useState<Set<string>>(new Set());
  const [selectedClass, setSelectedClass] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<{ [studentId: string]: 'present' | 'absent' }>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    fetchInitialData();
  }, [user]);

  const fetchInitialData = async () => {
    if (!user) return;
    setLoading(true);
    const today = formatDate(new Date());
    try {
      let classBatch: any[] = [];
      
      // Fetch classes first to build a map for lookup
      const classesSnap = await getDocs(collection(db, 'classes'));
      const classesMap = classesSnap.docs.reduce((acc, doc) => {
        acc[doc.id] = doc.data();
        return acc;
      }, {} as any);

      if (user.role === 'teacher') {
        const q = query(collection(db, 'classes'), where('teacherId', '==', user.id));
        const snap = await getDocs(q);
        classBatch = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      } else if (user.role === 'student') {
        const q = query(collection(db, 'attendance'), where('studentId', '==', user.id));
        const snap = await getDocs(q);
        const historyData = snap.docs.map(doc => {
          const data = doc.data();
          const cls = classesMap[data.classId];
          if (!cls) return null;
          return { 
            id: doc.id, 
            ...data,
            className: cls.name
          };
        }).filter(Boolean);
        setHistory(historyData);
      } else {
        const snap = await getDocs(collection(db, 'classes'));
        classBatch = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      }
      setClasses(classBatch);

      if (user.role !== 'student') {
        const attendanceQ = query(collection(db, 'attendance'), where('date', '==', today));
        const attendanceSnap = await getDocs(attendanceQ);
        const markedIds = new Set(attendanceSnap.docs.map(d => d.data().classId));
        setMarkedClasses(markedIds);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectClass = async (cls: any) => {
    setSelectedClass(cls);
    setLoading(true);
    try {
      // In a real app, students would be enrolled in classes. 
      // For this sample, we'll fetch all students.
      const q = query(collection(db, 'users'), where('role', '==', 'student'));
      const snap = await getDocs(q);
      const studentBatch = await Promise.all(snap.docs.map(async (uDoc) => {
        const detailSnap = await getDocs(query(collection(db, 'students'), where('userId', '==', uDoc.id)));
        return { id: uDoc.id, ...uDoc.data(), ...(detailSnap.docs[0]?.data() || {}) };
      }));
      setStudents(studentBatch);

      // Check if already marked for today
      const today = formatDate(new Date());
      const attendanceQ = query(
        collection(db, 'attendance'), 
        where('classId', '==', cls.id), 
        where('date', '==', today)
      );
      const attendanceSnap = await getDocs(attendanceQ);
      const existing = attendanceSnap.docs.reduce((acc, curr) => {
        const data = curr.data();
        acc[data.studentId] = data.status;
        return acc;
      }, {} as any);
      
      // Default to present for others if not marked
      const initialAttendance = studentBatch.reduce((acc, s) => {
        acc[s.id] = existing[s.id] || 'present';
        return acc;
      }, {} as any);
      
      setAttendance(initialAttendance);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleAttendance = (studentId: string) => {
    setAttendance(prev => ({
      ...prev,
      [studentId]: prev[studentId] === 'present' ? 'absent' : 'present'
    }));
  };

  const submitAttendance = async () => {
    setSubmitting(true);
    const today = formatDate(new Date());
    try {
      for (const [studentId, status] of Object.entries(attendance)) {
        // Check if record exists for update, or just create new (in demo we create)
        // Ideally we use a composite key or query first
        await addDoc(collection(db, 'attendance'), {
          studentId,
          classId: selectedClass.id,
          date: today,
          status,
          markedBy: user?.id,
          createdAt: serverTimestamp()
        });
      }
      alert('Attendance marked successfully!');
      setSelectedClass(null);
      fetchInitialData();
    } catch (err) {
      console.error(err);
      alert('Failed to mark attendance.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && !selectedClass) {
    return (
      <div className="p-20 flex flex-col items-center justify-center gap-4">
        <Loader2 className="animate-spin text-blue-600" size={32} />
        <p className="text-slate-400 font-medium">Preparing attendance registers...</p>
      </div>
    );
  }

  if (user?.role === 'student') {
    // Calculate subject summary
    const subjectSummary = history.reduce((acc: any, rec: any) => {
      if (!acc[rec.classId]) {
        acc[rec.classId] = { present: 0, total: 0, name: rec.className };
      }
      acc[rec.classId].total += 1;
      if (rec.status === 'present') acc[rec.classId].present += 1;
      return acc;
    }, {} as any);

    return (
      <div className="space-y-8">
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-6 font-serif italic text-blue-600 tracking-tight flex items-center gap-2">
            <Award size={20} /> Academic Standing
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Object.values(subjectSummary).map((sub: any, i) => {
              const perc = Number(((sub.present / sub.total) * 100).toFixed(1));
              return (
                <div key={i} className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="flex justify-between items-start mb-4">
                    <p className="text-sm font-black text-slate-800 truncate pr-2 uppercase italic">{sub.name}</p>
                    <span className={`text-[10px] font-black px-2 py-1 rounded-lg ${perc >= 75 ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-100' : 'bg-amber-500 text-white shadow-lg shadow-amber-100'}`}>
                      {perc}%
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden mb-3">
                    <div className={`h-full ${perc >= 75 ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${perc}%` }} />
                  </div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{sub.present} / {sub.total} Sessions</p>
                </div>
              );
            })}
            {Object.keys(subjectSummary).length === 0 && (
              <div className="col-span-full text-center py-4">
                <p className="text-slate-400 text-sm font-medium">No performance data yet.</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-6 font-serif italic text-blue-600 tracking-tight flex items-center gap-2">
            <FileText size={20} /> My Attendance History
          </h3>
          <div className="space-y-4">
            {history.sort((a,b) => b.date.localeCompare(a.date)).map((rec) => (
              <div key={rec.id} className="flex items-center justify-between p-5 bg-slate-50 rounded-2xl border border-slate-100 group transition-all hover:bg-white hover:shadow-md">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 ${rec.status === 'present' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                    {rec.status === 'present' ? <CheckCircle2 size={24} /> : <XCircle size={24} />}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 tracking-tight">{rec.className}</h4>
                    <p className="text-sm text-slate-500 flex items-center gap-1">
                      <Calendar size={14} /> {rec.date}
                    </p>
                  </div>
                </div>
                <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${rec.status === 'present' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
                  {rec.status}
                </div>
              </div>
            ))}
            {history.length === 0 && (
              <div className="text-center py-12">
                <Calendar size={48} className="mx-auto text-slate-200 mb-4" />
                <p className="text-slate-400 italic">No attendance records found yet.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {!selectedClass ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {classes.map((cls) => (
            <div 
              key={cls.id} 
              onClick={() => handleSelectClass(cls)}
              className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8 hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer group"
            >
              <div className="flex items-start justify-between mb-8">
                <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 shadow-sm border border-blue-100">
                  <Users size={32} />
                </div>
                <div className="p-2bg-slate-50 rounded-xl">
                  <ChevronRight size={20} className="text-slate-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                </div>
              </div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight mb-2 leading-tight uppercase font-serif italic text-blue-600">{cls.name}</h3>
              <p className="text-slate-500 text-sm font-medium flex items-center gap-2">
                <MapPin size={14} className="text-slate-300" />
                Subject: {cls.subject}
              </p>
              <div className="mt-8 pt-6 border-t border-slate-50 flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Attendance Status</span>
                {markedClasses.has(cls.id) ? (
                  <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md flex items-center gap-1">
                    <CheckCircle2 size={12} /> Today's Marked
                  </span>
                ) : (
                  <span className="text-xs font-bold text-amber-500 bg-amber-50 px-2 py-1 rounded-md">Today's Not Marked</span>
                )}
              </div>
            </div>
          ))}
          {classes.length === 0 && (
            <div className="col-span-full py-20 bg-white rounded-3xl border border-slate-100 text-center">
              <Calendar size={48} className="mx-auto text-slate-100 mb-4" />
              <p className="text-slate-400 font-medium">No classes found to manage attendance.</p>
            </div>
          )}
        </div>
      ) : (
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden"
        >
          <div className="px-8 py-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between sticky top-0 z-20">
            <div className="flex items-center gap-6">
              <button 
                onClick={() => setSelectedClass(null)}
                className="p-2 hover:bg-slate-200 rounded-xl transition-colors text-slate-600"
              >
                <ArrowLeft size={20} />
              </button>
              <div>
                <h3 className="text-xl font-black text-slate-900 tracking-tighter uppercase">{selectedClass.name}</h3>
                <p className="text-xs text-slate-500 font-bold tracking-widest flex items-center gap-2">
                   <Calendar size={12} /> {formatDate(new Date())} <span className="opacity-30">|</span> <Users size={12} /> {students.length} Students
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button 
                onClick={submitAttendance}
                disabled={submitting}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-200 disabled:opacity-50 transition-all active:scale-95 flex items-center gap-2"
              >
                {submitting ? <Loader2 size={16} className="animate-spin" /> : 'Confirm Register'}
              </button>
            </div>
          </div>

          <div className="divide-y divide-slate-50">
            {students.map((student) => (
              <div 
                key={student.id} 
                onClick={() => toggleAttendance(student.id)}
                className="flex items-center justify-between p-6 hover:bg-slate-50 transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${attendance[student.id] === 'present' ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-slate-100 text-slate-400 border border-slate-200'}`}>
                    {attendance[student.id] === 'present' ? <CheckCircle2 size={24} /> : <XCircle size={24} />}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors uppercase tracking-tight">{student.name}</h4>
                    <p className="text-xs text-slate-500 font-medium">#{student.id.slice(-6).toUpperCase()} <span className="opacity-30 mx-2">|</span> {student.department} - Sem {student.semester}</p>
                  </div>
                </div>
                
                <div className={`flex items-center gap-4 px-6 py-2 rounded-2xl transition-all ${attendance[student.id] === 'present' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                   <span className="text-xs font-black uppercase tracking-widest">{attendance[student.id]}</span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
