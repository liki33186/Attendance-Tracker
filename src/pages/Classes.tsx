import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, serverTimestamp, query, where, deleteDoc, doc, writeBatch } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { BookOpen, Plus, User, Search, Loader2, ListChecks, Trash2 } from 'lucide-react';
import Modal from '../components/Modal';

export default function Classes() {
  const { user: currentUser } = useAuth();
  const [classes, setClasses] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    teacherId: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const classSnap = await getDocs(collection(db, 'classes'));
      const teacherSnap = await getDocs(query(collection(db, 'users'), where('role', '==', 'teacher')));
      
      setClasses(classSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setTeachers(teacherSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.subject || !formData.teacherId) return;
    setSubmitting(true);
    try {
      await addDoc(collection(db, 'classes'), {
        ...formData,
        createdAt: serverTimestamp()
      });
      setFormData({ name: '', subject: '', teacherId: '' });
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (classId: string) => {
    setSubmitting(true);
    try {
      const batch = writeBatch(db);
      batch.delete(doc(db, 'classes', classId));
      
      const attendanceQ = query(collection(db, 'attendance'), where('classId', '==', classId));
      const attSnap = await getDocs(attendanceQ);
      attSnap.docs.forEach(d => batch.delete(d.ref));
      
      await batch.commit();
      setDeleteConfirmId(null);
      fetchData();
    } catch (err) {
      console.error(err);
      handleFirestoreError(err, OperationType.DELETE, `classes/${classId}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-slate-400 font-bold uppercase tracking-widest text-xs">Curriculum Entities</h2>
        {currentUser?.role === 'admin' && (
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
          >
            <Plus size={16} />
            Create New Class
          </button>
        )}
      </div>

      {loading ? (
        <div className="p-20 flex flex-col items-center justify-center gap-4">
          <Loader2 className="animate-spin text-blue-600" size={32} />
          <p className="text-slate-400 font-medium">Syncing class data...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {classes.map((cls) => (
            <div key={cls.id} className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 group transition-all hover:shadow-xl hover:-translate-y-1 relative">
              {currentUser?.role === 'admin' && (
                <div className="absolute top-4 right-4 z-10">
                  {deleteConfirmId === cls.id ? (
                    <div className="flex items-center gap-1 animate-in fade-in slide-in-from-right-2 bg-white p-1 rounded-xl shadow-sm border border-slate-100">
                      <button 
                        onClick={() => handleDelete(cls.id)}
                        disabled={submitting}
                        className="px-2 py-1 bg-red-600 text-white text-[10px] font-bold rounded-lg hover:bg-red-700 transition-colors"
                      >
                        Confirm
                      </button>
                      <button 
                        onClick={() => setDeleteConfirmId(null)}
                        className="px-2 py-1 bg-slate-200 text-slate-600 text-[10px] font-bold rounded-lg hover:bg-slate-300 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => setDeleteConfirmId(cls.id)}
                      disabled={submitting}
                      className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100 disabled:opacity-0"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              )}
              <div className="w-12 h-12 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center mb-6 group-hover:bg-blue-600 group-hover:text-white transition-all">
                <BookOpen size={24} />
              </div>
              <h3 className="text-lg font-black text-slate-900 leading-tight mb-1 uppercase tracking-tight">{cls.name}</h3>
              <p className="text-sm font-medium text-slate-400 mb-4">{cls.subject}</p>
              
              <div className="flex items-center gap-2 mt-6 pt-6 border-t border-slate-50">
                <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-md flex items-center justify-center">
                  <User size={12} />
                </div>
                <span className="text-xs font-bold text-slate-600">
                  {teachers.find(t => t.id === cls.teacherId)?.name || 'Unassigned'}
                </span>
              </div>
            </div>
          ))}
          {classes.length === 0 && (
            <div className="col-span-full py-20 text-center text-slate-400 border-2 border-dashed border-slate-100 rounded-3xl">
              <BookOpen size={48} className="mx-auto opacity-10 mb-4" />
              <p className="font-medium">Design your first class to get started.</p>
            </div>
          )}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="New Academic Class">
        <form onSubmit={handleCreate} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Class Name</label>
            <input 
              required
              className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 text-sm outline-none focus:border-blue-500 transition-all font-medium"
              placeholder="e.g. CS101 - Introduction to C"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Course Subject</label>
            <input 
              required
              className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 text-sm outline-none focus:border-blue-500 transition-all font-medium"
              placeholder="e.g. Computer Science"
              value={formData.subject}
              onChange={(e) => setFormData({...formData, subject: e.target.value})}
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Assigned Teacher</label>
            <select 
              required
              className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 text-sm outline-none focus:border-blue-500 transition-all font-medium appearance-none"
              value={formData.teacherId}
              onChange={(e) => setFormData({...formData, teacherId: e.target.value})}
            >
              <option value="">Choose a Faculty Member</option>
              {teachers.map(t => (
                <option key={t.id} value={t.id}>{t.name} ({t.email})</option>
              ))}
            </select>
          </div>
          
          <button 
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-blue-100 mt-4"
          >
            Finalize Creation
          </button>
        </form>
      </Modal>
    </div>
  );
}
