import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, AlertCircle, Search, User, ShieldCheck, Edit, CheckCircle2, Lock, Image as ImageIcon, Upload, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import Cropper, { Area } from 'react-easy-crop';
import getCroppedImg from '../../utils/cropImage';
import { compressForAvatar } from '../../utils/imageCompressor';

interface UserProfile {
  id: string;
  name: string | null;
  email: string;
  avatar: string | null;
  role: string | null;
  created_at: string;
  txCount: number;
}

const UserManagement: React.FC = () => {
  const { t } = useLanguage();
  const { user: currentUser } = useAuth();
  const isMasterAdmin = currentUser?.name === 'ArulPrakash';
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [deleteConfirm, setDeleteConfirm] = useState<UserProfile | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Edit User State
  const [editUser, setEditUser] = useState<UserProfile | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [newAvatar, setNewAvatar] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');

  // Cropper State
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState<number>(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isCropping, setIsCropping] = useState<boolean>(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const { data: txData } = await supabase.from('transactions').select('member_id');
      const txCountMap: { [key: string]: number } = {};
      if (txData) {
        txData.forEach(tx => {
          if (tx.member_id) {
            txCountMap[tx.member_id] = (txCountMap[tx.member_id] || 0) + 1;
          }
        });
      }

      const usersWithStats = (data || []).map(u => ({
        ...u,
        txCount: txCountMap[u.id] || 0
      }));

      setUsers(usersWithStats);
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleRole = async (userId: string, currentIsAdmin: boolean, manualRole: string | null = null) => {
    const newRole = manualRole || (currentIsAdmin ? 'Member' : 'admin');
    try {
      // Use RPC to bypass RLS policies (same pattern as delete_user_by_admin)
      const { error } = await supabase.rpc('update_user_role', {
        target_uid: userId,
        new_role: newRole,
      });

      if (error) throw error;

      // Update local state only after confirmed DB success
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
    } catch (err: any) {
      console.error('Error updating role:', err);
      // Revert the select dropdown by re-fetching
      fetchUsers();
      alert(`Failed to update role: ${err.message}`);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    setIsDeleting(true);
    try {
      const { error } = await supabase.rpc('delete_user_by_admin', { target_uid: userId });
      if (error) throw error;

      // Update UI
      setUsers(prev => prev.filter(u => u.id !== userId));
      setDeleteConfirm(null);
      alert('User deleted successfully.');
    } catch (err: any) {
      console.error('Error deleting user:', err);
      alert(`Failed to delete user: ${err.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEditUser = (user: UserProfile) => {
    setEditUser(user);
    setNewAvatar(user.avatar || '');
    setNewPassword('');
    setConfirmPassword('');
  };

  const onCropComplete = React.useCallback((croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setImageSrc(reader.result);
        }
      };
      reader.readAsDataURL(file);
      e.target.value = ''; // Reset input
    }
  };

  const showCroppedImage = async () => {
    if (!imageSrc || !croppedAreaPixels) return;
    try {
      setIsCropping(true);
      const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels);
      if (!croppedBlob) {
        alert('Failed to crop image');
        return;
      }
      
      const fileFromBlob = new File([croppedBlob], 'avatar.jpg', { type: 'image/jpeg' });
      const compressedFile = await compressForAvatar(fileFromBlob);

      const reader = new FileReader();
      reader.readAsDataURL(compressedFile);
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setNewAvatar(reader.result);
          setImageSrc(null);
        }
      };
    } catch (e) {
      console.error(e);
      alert('Failed to crop image');
    } finally {
      setIsCropping(false);
    }
  };

  const submitEditUser = async () => {
    if (!editUser) return;
    if (newPassword && newPassword !== confirmPassword) {
      alert('Passwords do not match.');
      return;
    }

    setIsEditing(true);
    try {
      // If a new avatar URL is provided (and it's different)
      if (newAvatar !== editUser.avatar) {
        const { error } = await supabase.rpc('admin_update_user_avatar', {
          target_uid: editUser.id,
          new_avatar: newAvatar,
        });
        if (error) throw error;
        
        // Update local state instantly
        setUsers(prev => prev.map(u => u.id === editUser.id ? { ...u, avatar: newAvatar } : u));
      }

      // If a new password is provided
      if (newPassword) {
        const { error } = await supabase.rpc('admin_update_user_password', {
          target_uid: editUser.id,
          new_password: newPassword,
        });
        if (error) throw error;
        alert('Password updated successfully.');
      } else if (newAvatar !== editUser.avatar) {
        alert('Avatar updated successfully.');
      }

      setEditUser(null);
    } catch (err: any) {
      console.error('Error updating user:', err);
      alert(`Failed to update user: ${err.message}`);
    } finally {
      setIsEditing(false);
    }
  };

  const filteredUsers = users.filter(u =>
    (u.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-xl font-bold text-slate-800 dark:text-white">{t('User Management')}</h2>

        <div className="relative w-full sm:w-64">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={t('Search users...')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-white dark:bg-[#1a1a2e] border border-slate-200 dark:border-slate-700/50 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
          />
        </div>
      </div>

      <div className="bg-white dark:bg-[#1a1a2e] border border-slate-200 dark:border-slate-700/50 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700/50">
              <tr>
                <th className="px-3 sm:px-6 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('User')}</th>
                <th className="px-3 sm:px-6 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('Role')}</th>
                <th className="px-3 sm:px-6 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('Activity')}</th>
                <th className="px-3 sm:px-6 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('Joined')}</th>
                <th className="px-3 sm:px-6 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">{t('Actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700/50">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                    <div className="flex justify-center"><div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                    {t('No users found.')}
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const role = u.role?.toLowerCase() || 'member';
                  const isAdmin = role === 'admin' || u.name === 'ArulPrakash';
                  return (
                    <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors">
                      <td className="px-3 sm:px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 flex items-center justify-center font-bold">
                            {u.avatar ? <img src={u.avatar} alt="Avatar" className="w-full h-full rounded-full object-cover" /> : <User size={18} />}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 dark:text-white truncate max-w-[100px] sm:max-w-none">{u.name || 'Unnamed'}</div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[100px] sm:max-w-none">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 sm:px-6 py-4">
                        {u.name === 'ArulPrakash' ? (
                          /* ArulPrakash is permanently Super Admin — no one can change */
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] sm:text-xs font-bold rounded-xl bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-700 dark:from-amber-500/20 dark:to-yellow-500/20 dark:text-amber-400 shadow-sm">
                            <ShieldCheck size={12} />
                            Super Admin
                          </span>
                        ) : isMasterAdmin ? (
                          /* Only ArulPrakash can change other users' roles */
                          <select
                            value={u.role || 'Member'}
                            onChange={(e) => handleToggleRole(u.id, isAdmin, e.target.value)}
                            className={`text-[10px] sm:text-xs font-bold rounded-xl px-3 py-1.5 border-none outline-none focus:ring-2 focus:ring-primary-500 transition-all cursor-pointer shadow-sm ${
                              isAdmin 
                                ? 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400' 
                                : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                            }`}
                          >
                            <option value="Member">Member</option>
                            <option value="admin">Admin</option>
                            <option value="moderator">Moderator</option>
                          </select>
                        ) : (
                          /* Non-master admins can only view roles */
                          <span className={`px-3 py-1.5 text-[10px] sm:text-xs font-bold rounded-xl ${
                            isAdmin 
                              ? 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400' 
                              : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                          }`}>
                            {u.role || 'Member'}
                          </span>
                        )}
                      </td>
                      <td className="px-3 sm:px-6 py-4 text-sm font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        {u.txCount} {t('Transactions')}
                      </td>
                      <td className="px-3 sm:px-6 py-4 text-sm text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {new Date(u.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-3 sm:px-6 py-4 text-right">
                        {u.name !== 'ArulPrakash' && isMasterAdmin && (
                          <div className="flex items-center justify-end gap-1 sm:gap-2">
                            <button
                              onClick={() => handleEditUser(u)}
                              className="p-2 text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-500/10 rounded-lg transition-colors"
                              title="Edit User"
                            >
                              <Edit size={18} />
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(u)}
                              className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                              title="Delete User"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-[#1a1a2e] rounded-2xl p-6 w-full max-w-sm shadow-xl"
            >
              <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-500/20 flex items-center justify-center mb-4 mx-auto">
                <AlertCircle size={24} className="text-red-500" />
              </div>
              <h3 className="text-lg font-bold text-center text-slate-900 dark:text-white mb-2">Delete User?</h3>
              <p className="text-center text-slate-500 dark:text-slate-400 mb-6 text-sm">
                Are you sure you want to delete <strong>{deleteConfirm.name}</strong>? This action cannot be undone.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  disabled={isDeleting}
                  className="flex-1 py-2.5 rounded-xl font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeleteUser(deleteConfirm.id)}
                  disabled={isDeleting}
                  className="flex-1 py-2.5 rounded-xl font-bold text-white bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/20 disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
                >
                  {isDeleting ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Delete'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit User Modal */}
      <AnimatePresence>
        {editUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-[#1a1a2e] rounded-2xl p-6 w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto custom-scrollbar"
            >
              <div className="w-12 h-12 rounded-full bg-primary-100 dark:bg-primary-500/20 flex items-center justify-center mb-4 mx-auto">
                <Edit size={24} className="text-primary-500" />
              </div>
              <h3 className="text-xl font-bold text-center text-slate-900 dark:text-white mb-1">Edit User</h3>
              <p className="text-center text-slate-500 dark:text-slate-400 mb-6 text-sm font-semibold">
                {editUser.name} ({editUser.email})
              </p>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <ImageIcon size={14} /> Avatar Upload
                  </label>
                  <div className="flex flex-col gap-3">
                    <label className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-50 dark:bg-[#12121f] border-2 border-dashed border-slate-300 dark:border-slate-700/50 text-slate-600 dark:text-slate-400 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                      <Upload size={18} />
                      <span className="text-sm font-semibold">Select Local Image</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={onFileChange} 
                        className="hidden" 
                      />
                    </label>

                    {newAvatar && (
                      <div className="flex justify-center relative w-max mx-auto group mt-2">
                        <img src={newAvatar} alt="Preview" className="w-20 h-20 rounded-full object-cover border-2 border-primary-500 shadow-sm" onError={(e: any) => e.target.style.display='none'} />
                        <button
                          onClick={() => setNewAvatar('')}
                          className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="h-px bg-slate-100 dark:bg-slate-800 my-4" />

                <div>
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Lock size={14} /> Set New Password
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Leave blank to keep current"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-[#12121f] border border-slate-200 dark:border-slate-700/50 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none text-sm mb-3"
                  />
                  {newPassword && (
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-[#12121f] border border-slate-200 dark:border-slate-700/50 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                    />
                  )}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setEditUser(null)}
                  disabled={isEditing}
                  className="flex-1 py-2.5 rounded-xl font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={submitEditUser}
                  disabled={isEditing}
                  className="flex-1 py-2.5 rounded-xl font-bold text-white bg-primary-500 hover:bg-primary-600 shadow-lg shadow-primary-500/20 disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
                >
                  {isEditing ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><CheckCircle2 size={18} /> Save Changes</>}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Cropper Modal */}
      <AnimatePresence>
        {imageSrc && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-[#1a1a2e] rounded-2xl w-full max-w-lg shadow-xl overflow-hidden flex flex-col h-[70vh]"
            >
              <div className="p-4 border-b border-slate-200 dark:border-slate-700/50 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                <h3 className="font-bold text-slate-800 dark:text-white">Crop Avatar</h3>
                <button onClick={() => setImageSrc(null)} className="p-1 rounded-full text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700">
                  <X size={20} />
                </button>
              </div>
              
              <div className="relative flex-1 bg-black/10 dark:bg-black/40">
                <Cropper
                  image={imageSrc}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  cropShape="round"
                  showGrid={false}
                  onCropChange={setCrop}
                  onCropComplete={onCropComplete}
                  onZoomChange={setZoom}
                />
              </div>
              
              <div className="p-4 border-t border-slate-200 dark:border-slate-700/50 bg-white dark:bg-[#1a1a2e]">
                <div className="mb-4">
                  <label className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-2 block">Zoom</label>
                  <input
                    type="range"
                    value={zoom}
                    min={1}
                    max={3}
                    step={0.1}
                    aria-label="Zoom"
                    onChange={(e: any) => setZoom(Number(e.target.value))}
                    className="w-full accent-primary-500"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setImageSrc(null)}
                    className="flex-1 py-2.5 rounded-xl font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={showCroppedImage}
                    disabled={isCropping}
                    className="flex-1 py-2.5 rounded-xl font-bold text-white bg-primary-500 hover:bg-primary-600 shadow-lg shadow-primary-500/20 disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
                  >
                    {isCropping ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Crop & Apply'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default UserManagement;
