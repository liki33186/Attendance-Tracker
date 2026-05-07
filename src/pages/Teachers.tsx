import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, serverTimestamp, setDoc, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Search, Plus, UserSquare2, Mail, BookOpen, Loader2, Trash2, Calendar, ShieldCheck } from 'lucide-react';
import Modal from '../components/Modal';

export default function Teachers() {
  const [teachers, setTeachers] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<any>(null);
  const [targetClassId, setTargetClassId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [addFormData, setAddFormData] = useState({
    name: '',
    email: '',
    subject: ''
  });

  useEffect(() => {
    fetchTeachers();
    fetchClasses();
  }, []);

  const fetchTeachers = async () => {
    setLoading(true);
    try {
      const uQ = query(collection(db, 'users'), where('role', '==', 'teacher'));
      const tQ = collection(db, 'teachers');
      
      const [uSnap, tSnap] = await Promise.all([getDocs(uQ), getDocs(tQ)]);
      
      const detailsMap = tSnap.docs.reduce((acc, doc) => {
        const data = doc.data();
        acc[data.userId] = data;
        return acc;
      }, {} as any);

      const teacherBatch = uSnap.docs.map(uDoc => ({
        id: uDoc.id,
        ...uDoc.data(),
        ...(detailsMap[uDoc.id] || {})
      }));

      setTeachers(teacherBatch);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchClasses = async () => {
    try {
      const snap = await getDocs(collection(db, 'classes'));
      setClasses(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error(err);
    }
  };

  const handleAssign = async () => {
    if (!targetClassId || !selectedTeacher) return;
    setSubmitting(true);
    try {
      await updateDoc(doc(db, 'classes', targetClassId), {
        teacherId: selectedTeacher.id
      });
      alert('Teacher assigned successfully!');
      setIsAssignModalOpen(false);
      setTargetClassId('');
      fetchClasses();
    } catch (err) {
      console.error(err);
      alert('Assignment failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const userRef = await addDoc(collection(db, 'users'), {
        name: addFormData.name,
        email: addFormData.email,
        role: 'teacher',
        createdAt: serverTimestamp()
      });
      await setDoc(doc(db, 'teachers', userRef.id), {
        userId: userRef.id,
        subject: addFormData.subject
      });
      
      setIsAddModalOpen(false);
      setAddFormData({ name: '', email: '', subject: '' });
      fetchTeachers();
    } catch (err) {
      console.error(err);
      alert('Failed to add teacher.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTeacher = async (teacherId: string) => {
    if (!window.confirm('Are you sure you want to remove this faculty record?')) return;
    
    try {
      await deleteDoc(doc(db, 'users', teacherId));
      await deleteDoc(doc(db, 'teachers', teacherId));
      fetchTeachers();
    } catch (err) {
      console.error(err);
      alert('Failed to delete teacher.');
    }
  };

  const openProfile = (teacher: any) => {
    setSelectedTeacher(teacher);
    setIsProfileModalOpen(true);
  };

  const openAssign = (teacher: any) => {
    setSelectedTeacher(teacher);
    setIsAssignModalOpen(true);
  };

  const filteredTeachers = teachers.filter(t => 
    t.name.toLowerCase().includes(search.toLowerCase()) || 
    t.subject?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text"
            placeholder="Search teachers by name or subject..."
            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl outline-none focus:border-blue-500 shadow-sm transition-all"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 self-start sm:self-auto"
        >
          <Plus size={18} />
          Add Teacher
        </button>
      </div>

      {loading ? (
        <div className="p-20 flex flex-col items-center justify-center gap-4">
          <Loader2 className="animate-spin text-blue-600" size={32} />
          <p className="text-slate-400 font-medium">Loading faculty members...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTeachers.map((teacher) => (
            <div key={teacher.id} className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8 hover:shadow-md transition-shadow group">
              <div className="flex items-start justify-between mb-6">
                <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110">
                  <UserSquare2 size={32} />
                </div>
                <div className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest">
                  Active
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-black text-slate-900 leading-tight">{teacher.name}</h3>
                  <div className="flex items-center gap-2 text-slate-400 text-sm mt-1">
                    <BookOpen size={14} />
                    <span className="font-medium">{teacher.subject || 'Not Assigned'}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-slate-500 text-sm bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <Mail size={16} />
                  <span className="truncate">{teacher.email}</span>
                </div>

                <div className="flex gap-2 pt-2">
                  <button 
                    onClick={() => openProfile(teacher)}
                    className="flex-1 py-3 text-sm font-bold text-blue-600 border border-blue-100 rounded-xl hover:bg-blue-50 transition-all"
                  >
                    Profile
                  </button>
                  <button 
                    onClick={() => openAssign(teacher)}
                    className="flex-1 py-3 text-sm font-bold text-slate-600 border border-slate-100 rounded-xl hover:bg-slate-50 transition-all"
                  >
                    Assign
                  </button>
                </div>
              </div>
            </div>
          ))}
          {filteredTeachers.length === 0 && (
            <div className="col-span-full py-20 text-center text-slate-400 font-medium italic">
              No faculty records found.
            </div>
          )}
        </div>
      )}

      <Modal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)}
        title="Register Faculty Member"
      >
        <form onSubmit={handleAddTeacher} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Teacher Name</label>
            <input 
              required
              className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 px-4 text-sm outline-none focus:border-blue-500 transition-all"
              placeholder="e.g. Dr. Robert Wilson"
              value={addFormData.name}
              onChange={(e) => setAddFormData({...addFormData, name: e.target.value})}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Email Address</label>
            <input 
              required
              type="email"
              className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 px-4 text-sm outline-none focus:border-blue-500 transition-all"
              placeholder="e.g. robert@institute.com"
              value={addFormData.email}
              onChange={(e) => setAddFormData({...addFormData, email: e.target.value})}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Primary Subject</label>
            <input 
              required
              className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 px-4 text-sm outline-none focus:border-blue-500 transition-all"
              placeholder="e.g. Advanced Mathematics"
              value={addFormData.subject}
              onChange={(e) => setAddFormData({...addFormData, subject: e.target.value})}
            />
          </div>
          <button 
            type="submit"
            disabled={submitting}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-bold transition-all shadow-lg shadow-blue-100 mt-4 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting && <Loader2 size={16} className="animate-spin" />}
            {submitting ? 'Registering...' : 'Register Teacher'}
          </button>
        </form>
      </Modal>

      <Modal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        title="Faculty Profile"
      >
        {selectedTeacher && (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white">
                <UserSquare2 size={32} />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900">{selectedTeacher.name}</h3>
                <p className="text-blue-600 font-bold text-sm tracking-wide uppercase">{selectedTeacher.subject}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-3">
                <Mail className="text-slate-400" size={18} />
                <div className="flex-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Email</p>
                  <p className="text-sm font-semibold text-slate-700">{selectedTeacher.email}</p>
                </div>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-3">
                <Calendar className="text-slate-400" size={18} />
                <div className="flex-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Status</p>
                  <p className="text-sm font-semibold text-emerald-600 flex items-center gap-1">
                    <ShieldCheck size={14} /> Active Personnel
                  </p>
                </div>
              </div>
            </div>

            <button 
              onClick={() => {
                handleDeleteTeacher(selectedTeacher.id);
                setIsProfileModalOpen(false);
              }}
              className="w-full flex items-center justify-center gap-2 py-4 text-sm font-bold text-red-600 bg-red-50 rounded-2xl hover:bg-red-100 transition-all"
            >
              <Trash2 size={18} />
              Remove from Faculty
            </button>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        title="Assign to Class"
      >
        {selectedTeacher && (
          <div className="space-y-6">
            <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl">
              <p className="text-sm text-blue-800 font-medium leading-relaxed">
                Connect <span className="font-black underline">{selectedTeacher.name}</span> to an existing academic session.
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Select Class</label>
                <select 
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 text-sm outline-none focus:border-blue-500 transition-all font-medium appearance-none"
                  value={targetClassId}
                  onChange={(e) => setTargetClassId(e.target.value)}
                >
                  <option value="">Choose a Class</option>
                  {classes.map(cls => (
                    <option key={cls.id} value={cls.id}>{cls.name} ({cls.subject})</option>
                  ))}
                </select>
              </div>
              
              <p className="text-xs text-slate-400 text-center leading-relaxed italic">
                Note: This will override any teacher currently assigned to the selected class.
              </p>
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => setIsAssignModalOpen(false)}
                className="flex-1 py-4 text-sm font-bold text-slate-500 hover:bg-slate-50 rounded-2xl transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={handleAssign}
                disabled={submitting || !targetClassId}
                className="flex-[2] bg-blue-600 text-white py-4 rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting && <Loader2 size={16} className="animate-spin" />}
                Confirm Assignment
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

