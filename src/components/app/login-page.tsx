'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Bug } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { toast } from 'sonner';

export default function LoginPage() {
  const [email, setEmail] = useState('owner@pestkiller.id');
  const [password, setPassword] = useState('owner123');
  const [loading, setLoading] = useState(false);
  const setAuth = useAppStore((s) => s.setAuth);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Initialize data first
      await fetch('/api/init', { method: 'POST' });
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setAuth(data.user, data.token);
      toast.success('Selamat datang, ' + data.user.name + '!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-teal-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="shadow-xl border-0 shadow-emerald-100 dark:shadow-emerald-900/20">
          <CardHeader className="text-center space-y-3 pb-2">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-emerald-600 flex items-center justify-center">
              <Bug className="w-8 h-8 text-white" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold bg-gradient-to-r from-emerald-700 to-teal-600 dark:from-emerald-400 dark:to-teal-300 bg-clip-text text-transparent">
                PT Pest Killer Ngalam
              </CardTitle>
              <CardDescription className="mt-1">Sistem Akuntansi &amp; Manajemen</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="owner@pestkiller.id"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Password</label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                disabled={loading}
              >
                {loading ? 'Memproses...' : 'Masuk'}
              </Button>
            </form>
            <p className="text-xs text-center text-muted-foreground mt-4">
              &copy; 2024 PT Pest Killer Ngalam. Hak cipta dilindungi.
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
