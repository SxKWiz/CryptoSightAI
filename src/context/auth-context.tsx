"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import type { User } from "firebase/auth";
import { onAuthStateChange } from "@/lib/firebase";
import { Skeleton } from "@/components/ui/skeleton";

interface AuthContextType {
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChange((user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const value = { user, loading };

  return (
    <AuthContext.Provider value={value}>
      {loading ? <div className="w-full h-screen flex items-center justify-center"><Skeleton className="h-20 w-20 rounded-full" /></div> : children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};
