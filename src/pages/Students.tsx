import React, { useState, useEffect } from 'react';
import { doc, deleteDoc, writeBatch, collection, query, where, getDocs, addDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { Search, Plus, FileUp, GraduationCap, Loader2, Trash2, Mail, Hash, BookOpen } from 'lucide-react';
import Modal from '../components/Modal';

export default function Students() {
  const { user: currentUser } = useAuth();
  const [students, setStudents] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [importText, setImportText] = useState('');
  const [addFormData, setAddFormData] = useState({
    name: '',
    email: '',
    department: '',
    semester: ''
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const uQ = query(collection(db, 'users'), where('role', '==', 'student'));
      const sQ = collection(db, 'students');
      
      const [uSnap, sSnap] = await Promise.all([getDocs(uQ), getDocs(sQ)]);
      
      const detailsMap = sSnap.docs.reduce((acc, doc) => {
        const data = doc.data();
        acc[data.userId] = data;
        return acc;
      }, {} as any);

      const studentBatch = uSnap.docs.map(uDoc => ({
        id: uDoc.id,
        ...uDoc.data(),
        ...(detailsMap[uDoc.id] || {})
      }));

      setStudents(studentBatch);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const userRef = await addDoc(collection(db, 'users'), {
        name: addFormData.name,
        email: addFormData.email,
        role: 'student',
        createdAt: serverTimestamp()
      });
      await setDoc(doc(db, 'students', userRef.id), {
        userId: userRef.id,
        department: addFormData.department,
        semester: addFormData.semester
      });
      
      setIsAddModalOpen(false);
      setAddFormData({ name: '', email: '', department: '', semester: '' });
      fetchStudents();
    } catch (err) {
      console.error(err);
      alert('Failed to add student.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBulkImport = async () => {
    const lines = importText.split('\n').filter(l => l.trim().includes(','));
    for (const line of lines) {
      const [name, email, dept, sem] = line.split(',').map(s => s.trim());
      try {
        const userRef = await addDoc(collection(db, 'users'), {
          name, email, role: 'student', createdAt: serverTimestamp()
        });
        await setDoc(doc(db, 'students', userRef.id), {
          userId: userRef.id,
          department: dept,
          semester: sem
        });
      } catch (err) {
        console.error(err);
      }
    }
    setImportText('');
    setIsImportModalOpen(false);
    fetchStudents();
  };

  const handleDeleteStudent = async (studentId: string) => {
    setSubmitting(true);
    try {
      const batch = writeBatch(db);
      
      batch.delete(doc(db, 'users', studentId));
      batch.delete(doc(db, 'students', studentId));
      
      // Also cleanup attendance for this student
      const attQ = query(collection(db, 'attendance'), where('studentId', '==', studentId));
      const attSnap = await getDocs(attQ);
      attSnap.docs.forEach(d => batch.delete(d.ref));
      
      await batch.commit();
      setDeleteConfirmId(null);
      fetchStudents();
    } catch (err: any) {
      console.error('Delete error:', err);
      handleFirestoreError(err, OperationType.DELETE, `users/${studentId}`);
    } finally {
      setSubmitting(false);
    }
  };

  const openProfile = (student: any) => {
    setSelectedStudent(student);
    setIsViewModalOpen(true);
  };

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase()) || 
    s.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text"
            placeholder="Search students by name or email..."
            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl outline-none focus:border-blue-500 shadow-sm transition-all"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        {currentUser?.role === 'admin' && (
          <div className="flex gap-3">
            <button 
              onClick={() => setIsImportModalOpen(true)}
              className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 text-slate-700 font-bold rounded-2xl hover:bg-slate-50 transition-all shadow-sm"
            >
              <FileUp size={18} />
              Bulk Import
            </button>
            <button 
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
            >
              <Plus size={18} />
              Add Student
            </button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-20 flex flex-col items-center justify-center gap-4">
            <Loader2 className="animate-spin text-blue-600" size={32} />
            <p className="text-slate-400 font-medium tracking-tight">Syncing records...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-8 py-5 text-xs font-bold text-slate-400 uppercase tracking-widest">Student</th>
                  <th className="px-8 py-5 text-xs font-bold text-slate-400 uppercase tracking-widest">Department</th>
                  <th className="px-8 py-5 text-xs font-bold text-slate-400 uppercase tracking-widest">Semester</th>
                  <th className="px-8 py-5 text-xs font-bold text-slate-400 uppercase tracking-widest">Email</th>
                  <th className="px-8 py-5 text-right text-xs font-bold text-slate-400 uppercase tracking-widest">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredStudents.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
                          <GraduationCap size={20} />
                        </div>
                        <span className="font-bold text-slate-900">{s.name}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-sm text-slate-600 font-medium">{s.department || '-'}</td>
                    <td className="px-8 py-5 text-sm text-slate-600 font-medium">{s.semester || '-'}</td>
                    <td className="px-8 py-5 text-sm text-slate-500">{s.email}</td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => openProfile(s)}
                          className="px-3 py-1.5 text-xs font-bold text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                        >
                          View
                        </button>
                        {currentUser?.role === 'admin' && (
                          <div className="flex items-center gap-1">
                            {deleteConfirmId === s.id ? (
                              <div className="flex items-center gap-1 animate-in fade-in slide-in-from-right-2">
                                <button 
                                  onClick={() => handleDeleteStudent(s.id)}
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
                                onClick={() => setDeleteConfirmId(s.id)}
                                disabled={submitting}
                                className="p-1.5 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors disabled:opacity-50"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredStudents.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-8 py-20 text-center text-slate-400 italic font-medium">
                      No student records found matching your search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Student"
      >
        <form onSubmit={handleAddStudent} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Full Name</label>
            <input 
              required
              className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 px-4 text-sm outline-none focus:border-blue-500 transition-all"
              placeholder="e.g. John Doe"
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
              placeholder="e.g. john@example.com"
              value={addFormData.email}
              onChange={(e) => setAddFormData({...addFormData, email: e.target.value})}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Department</label>
              <input 
                required
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 px-4 text-sm outline-none focus:border-blue-500 transition-all"
                placeholder="e.g. Computer Science"
                value={addFormData.department}
                onChange={(e) => setAddFormData({...addFormData, department: e.target.value})}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Semester</label>
              <input 
                required
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 px-4 text-sm outline-none focus:border-blue-500 transition-all"
                placeholder="e.g. 4"
                value={addFormData.semester}
                onChange={(e) => setAddFormData({...addFormData, semester: e.target.value})}
              />
            </div>
          </div>
          <button 
            type="submit"
            disabled={submitting}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-bold transition-all shadow-lg shadow-blue-100 mt-4 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting && <Loader2 size={16} className="animate-spin" />}
            {submitting ? 'Adding Student...' : 'Create Student Profile'}
          </button>
        </form>
      </Modal>

      <Modal 
        isOpen={isViewModalOpen} 
        onClose={() => setIsViewModalOpen(false)}
        title="Student Profile"
      >
        {selectedStudent && (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center">
                <GraduationCap size={32} />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900">{selectedStudent.name}</h3>
                <p className="text-slate-400 font-bold text-sm tracking-tight">Active Student Profile</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Mail size={12} /> Email Address
                </label>
                <p className="text-sm font-semibold text-slate-700 truncate">{selectedStudent.email}</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <BookOpen size={12} /> Department
                </label>
                <p className="text-sm font-semibold text-slate-700">{selectedStudent.department || 'General'}</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Hash size={12} /> Semester
                </label>
                <p className="text-sm font-semibold text-slate-700">{selectedStudent.semester || 'N/A'}</p>
              </div>
            </div>

            <button 
              onClick={() => setIsViewModalOpen(false)}
              className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold hover:bg-black transition-all"
            >
              Done
            </button>
          </div>
        )}
      </Modal>

      <Modal 
        isOpen={isImportModalOpen} 
        onClose={() => setIsImportModalOpen(false)}
        title="Bulk Import Students"
      >
        <div className="space-y-6">
          <p className="text-sm text-slate-500 leading-relaxed">
            Enter student details in CSV format: <br/>
            <code className="bg-slate-100 px-2 py-1 rounded-md text-slate-900 text-xs">Name, Email, Dept, Semester</code>
          </p>
          <textarea 
            className="w-full h-48 bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm outline-none focus:border-blue-500 transition-all font-mono"
            placeholder="John Doe, john@example.com, CS, 4&#10;Jane Smith, jane@example.com, EE, 6"
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
          />
          <div className="flex justify-end gap-3">
            <button 
              onClick={() => setIsImportModalOpen(false)}
              className="px-6 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-2xl transition-all"
            >
              Cancel
            </button>
            <button 
              onClick={handleBulkImport}
              className="px-8 py-3 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all"
            >
              Import All
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
