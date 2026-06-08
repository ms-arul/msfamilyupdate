import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, UserPlus, Loader2, AtSign, Check } from 'lucide-react';
import { useFamily } from '../../context/FamilyContext';
import type { UserSearchResult } from '../../types/family';

interface UserSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UserSearchModal: React.FC<UserSearchModalProps> = ({ isOpen, onClose }) => {
  const { searchUsers, inviteUser, members } = useFamily();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [invitingId, setInvitingId] = useState<string | null>(null);
  const [invitedIds, setInvitedIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 200);
      setQuery('');
      setResults([]);
      setError('');
      setInvitedIds(new Set());
    }
  }, [isOpen]);

  const handleSearch = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setResults([]);
      return;
    }

    setSearching(true);
    try {
      const data = await searchUsers(searchQuery);
      // Filter out existing members
      const memberIds = new Set(members.map(m => m.user_id));
      setResults(data.filter(u => !memberIds.has(u.id)));
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, [searchUsers, members]);

  const onQueryChange = useCallback((value: string) => {
    const clean = value.startsWith('@') ? value.slice(1) : value;
    setQuery(clean);
    setError('');

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => handleSearch(clean), 300);
  }, [handleSearch]);

  const handleInvite = useCallback(async (userId: string) => {
    setInvitingId(userId);
    setError('');
    try {
      await inviteUser(userId);
      setInvitedIds(prev => new Set(prev).add(userId));
    } catch (err: any) {
      setError(err.message || 'Failed to send invitation');
    } finally {
      setInvitingId(null);
    }
  }, [inviteUser]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="fixed inset-x-4 top-[10%] md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-[440px] max-h-[75vh] z-[110] bg-white dark:bg-[#111118] rounded-[24px] shadow-2xl border border-slate-200/60 dark:border-white/[0.08] overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="px-5 pt-5 pb-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Search & Invite</h3>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-all"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Search Input */}
              <div className="relative">
                <AtSign className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => onQueryChange(e.target.value)}
                  placeholder="Search by username or name..."
                  className="w-full pl-10 pr-10 py-3 rounded-xl bg-slate-100 dark:bg-white/[0.06] border border-slate-200/60 dark:border-white/[0.08] text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500/40 transition-all"
                />
                {searching && (
                  <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 text-primary-500 animate-spin" size={16} />
                )}
                {!searching && query && (
                  <button
                    onClick={() => { setQuery(''); setResults([]); inputRef.current?.focus(); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-slate-200 dark:bg-white/10 flex items-center justify-center text-slate-500"
                  >
                    <X size={12} strokeWidth={3} />
                  </button>
                )}
              </div>

              {/* Error */}
              <AnimatePresence>
                {error && (
                  <motion.p
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="text-xs text-red-400 mt-2 px-1"
                  >
                    {error}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            {/* Results */}
            <div className="flex-1 overflow-y-auto px-3 pb-4" style={{ WebkitOverflowScrolling: 'touch' }}>
              {results.length === 0 && query.length >= 2 && !searching && (
                <div className="text-center py-8 text-slate-400 text-sm">
                  <Search size={32} className="mx-auto mb-3 opacity-40" />
                  <p>No users found</p>
                </div>
              )}

              {results.length === 0 && query.length < 2 && (
                <div className="text-center py-8 text-slate-400 text-sm">
                  <Search size={32} className="mx-auto mb-3 opacity-40" />
                  <p>Type at least 2 characters to search</p>
                </div>
              )}

              <div className="space-y-1">
                {results.map((user, idx) => {
                  const isInvited = invitedIds.has(user.id);
                  const isInviting = invitingId === user.id;

                  return (
                    <motion.div
                      key={user.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-colors"
                    >
                      {/* Avatar */}
                      <div className="w-11 h-11 rounded-xl overflow-hidden shrink-0">
                        {user.avatar ? (
                          <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center text-white font-bold text-sm">
                            {user.name?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{user.name}</p>
                        {user.username && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">@{user.username}</p>
                        )}
                      </div>

                      {/* Invite Button */}
                      <button
                        onClick={() => !isInvited && handleInvite(user.id)}
                        disabled={isInviting || isInvited}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                          isInvited
                            ? 'bg-success-500/10 text-success-500 border border-success-500/20'
                            : 'bg-primary-500/10 text-primary-500 border border-primary-500/20 hover:bg-primary-500/20 active:scale-95'
                        } disabled:opacity-50`}
                      >
                        {isInviting ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : isInvited ? (
                          <>
                            <Check size={12} />
                            Invited
                          </>
                        ) : (
                          <>
                            <UserPlus size={12} />
                            Invite
                          </>
                        )}
                      </button>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default UserSearchModal;
