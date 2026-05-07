import { useAuth } from '../hooks/useAuth';
import { User, Mail, Shield, Calendar, Award, GraduationCap } from 'lucide-react';

export default function Profile() {
  const { user } = useAuth();

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="h-32 bg-blue-600 relative">
          <div className="absolute -bottom-12 left-12 w-24 h-24 bg-white rounded-2xl border-4 border-white shadow-xl flex items-center justify-center text-blue-600 p-1">
            <div className="w-full h-full bg-blue-50 rounded-xl flex items-center justify-center">
              <User size={40} />
            </div>
          </div>
        </div>
        
        <div className="pt-16 pb-10 px-12">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">{user?.name}</h2>
              <div className="flex items-center gap-2 text-slate-400 mt-1">
                <Mail size={16} />
                <span className="font-medium">{user?.email}</span>
              </div>
            </div>
            
            <div className="flex gap-4">
              <div className="bg-slate-50 px-6 py-3 rounded-2xl border border-slate-100 flex items-center gap-3">
                <Shield size={18} className="text-blue-500" />
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Account Role</p>
                  <p className="text-sm font-bold text-slate-900 capitalize">{user?.role}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
             <Award size={20} className="text-blue-600" /> Professional Details
          </h3>
          <div className="space-y-6">
            <ProfileItem label="Institution" value="BGS Institution of technology" icon={Shield} />
            <ProfileItem label="Department" value="Computer Science" icon={GraduationCap} />
            <ProfileItem label="Member Since" value="May 2024" icon={Calendar} />
          </div>
        </div>

        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
             <Shield size={20} className="text-blue-600" /> Security & Access
          </h3>
          <div className="space-y-4">
            <p className="text-sm text-slate-500 leading-relaxed">
              Your account is secured via Google Authentication. Role-based access control is active for your profile.
            </p>
            <div className="pt-4 space-y-3">
              <button className="w-full py-3 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold rounded-xl border border-slate-100 transition-all text-sm">
                Privacy Settings
              </button>
              <button className="w-full py-3 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold rounded-xl border border-slate-100 transition-all text-sm">
                Activity Logs
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProfileItem({ label, value, icon: Icon }: any) {
  return (
    <div className="flex items-center gap-4 group">
      <div className="w-10 h-10 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
        <Icon size={18} />
      </div>
      <div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</p>
        <p className="text-sm font-bold text-slate-900">{value}</p>
      </div>
    </div>
  );
}
