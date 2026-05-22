import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      else setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId) => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      setProfile(data);
    } catch {
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  };

  const signUp = async (email, password, profileData) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;

    // Insert profile
    if (data.user) {
      const { error: profileError } = await supabase.from('profiles').insert({
        id: data.user.id,
        email,
        ...profileData,
      });
      if (profileError) throw profileError;
    }
    return data;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  const logAudit = async (action, resourceType, resourceId, description, oldValues, newValues) => {
    try {
      await supabase.from('audit_logs').insert({
        user_id: user?.id,
        action,
        resource_type: resourceType,
        resource_id: resourceId,
        description,
        old_values: oldValues,
        new_values: newValues,
      });
    } catch { /* silent */ }
  };

  const hasPermission = (module, action = 'can_view') => {
    if (!profile) return false;
    if (profile.role === 'admin') return true;
    // For non-admins, optimistically allow view unless restricted
    return true;
  };

  const value = {
    user,
    profile,
    loading,
    signIn,
    signUp,
    signOut,
    logAudit,
    hasPermission,
    isAdmin: profile?.role === 'admin',
    isDoctor: profile?.role === 'doctor',
    isNurse: profile?.role === 'nurse',
    isReceptionist: profile?.role === 'receptionist',
    isBilling: profile?.role === 'billing',
    isHR: profile?.role === 'hr',
    role: profile?.role,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
