'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Settings, Building2, Save } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { toast } from 'sonner';

interface CompanySettings {
  id: string;
  companyName: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  npwp: string;
  logo: string;
  stamp: string;
  bankName: string;
  bankAccount: string;
  bankHolder: string;
  initialCapital: number;
  initialBalance: number;
}

const emptySettings: CompanySettings = {
  id: '',
  companyName: 'PT Pest Killer Ngalam',
  address: '',
  phone: '',
  email: '',
  website: '',
  npwp: '',
  logo: '',
  stamp: '',
  bankName: '',
  bankAccount: '',
  bankHolder: '',
  initialCapital: 0,
  initialBalance: 0,
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<CompanySettings>(emptySettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const token = useAppStore((s) => s.token);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/settings', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSettings({ ...emptySettings, ...data });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });
      if (!res.ok) throw new Error();
      toast.success('Pengaturan berhasil disimpan');
    } catch {
      toast.error('Gagal menyimpan pengaturan');
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = (field: 'logo' | 'stamp', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result) {
        setSettings((prev) => ({ ...prev, [field]: reader.result as string }));
      }
    };
    reader.readAsDataURL(file);
  };

  if (loading) {
    return (
      <div className="p-4 lg:p-6 space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 lg:p-6 space-y-4">
      {/* Company Info */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="w-5 h-5 text-emerald-600" />
            Informasi Perusahaan
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nama Perusahaan</Label>
              <Input
                value={settings.companyName}
                onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>NPWP</Label>
              <Input
                value={settings.npwp}
                onChange={(e) => setSettings({ ...settings, npwp: e.target.value })}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Alamat</Label>
              <Textarea
                value={settings.address}
                onChange={(e) => setSettings({ ...settings, address: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Telepon</Label>
              <Input
                value={settings.phone}
                onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={settings.email}
                onChange={(e) => setSettings({ ...settings, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Website</Label>
              <Input
                value={settings.website}
                onChange={(e) => setSettings({ ...settings, website: e.target.value })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logo & Stamp */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Logo &amp; Stempel</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-3">
              <Label>Logo Perusahaan</Label>
              {settings.logo && (
                <div className="relative inline-block">
                  <img src={settings.logo} alt="Logo" className="max-h-24 rounded-lg border" />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute -top-2 -right-2 h-6 w-6"
                    onClick={() => setSettings({ ...settings, logo: '' })}
                  >
                    ×
                  </Button>
                </div>
              )}
              <Input type="file" accept="image/*" onChange={(e) => handleImageUpload('logo', e)} />
            </div>
            <div className="space-y-3">
              <Label>Stempel / Tanda Tangan</Label>
              {settings.stamp && (
                <div className="relative inline-block">
                  <img src={settings.stamp} alt="Stempel" className="max-h-24 rounded-lg border" />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute -top-2 -right-2 h-6 w-6"
                    onClick={() => setSettings({ ...settings, stamp: '' })}
                  >
                    ×
                  </Button>
                </div>
              )}
              <Input type="file" accept="image/*" onChange={(e) => handleImageUpload('stamp', e)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bank */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Informasi Rekening Bank</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Nama Bank</Label>
              <Input
                value={settings.bankName}
                onChange={(e) => setSettings({ ...settings, bankName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Nomor Rekening</Label>
              <Input
                value={settings.bankAccount}
                onChange={(e) => setSettings({ ...settings, bankAccount: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Atas Nama</Label>
              <Input
                value={settings.bankHolder}
                onChange={(e) => setSettings({ ...settings, bankHolder: e.target.value })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Balance */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Modal Awal</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Modal Awal (Rp)</Label>
              <Input
                type="number"
                value={settings.initialCapital || ''}
                onChange={(e) => setSettings({ ...settings, initialCapital: Number(e.target.value) || 0 })}
              />
              <p className="text-xs text-muted-foreground">Modal awal perusahaan untuk perhitungan neraca</p>
            </div>
            <div className="space-y-2">
              <Label>Saldo Awal Kas/Bank (Rp)</Label>
              <Input
                type="number"
                value={settings.initialBalance || ''}
                onChange={(e) => setSettings({ ...settings, initialBalance: Number(e.target.value) || 0 })}
              />
              <p className="text-xs text-muted-foreground">Saldo awal kas dan bank perusahaan</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
          disabled={saving}
        >
          <Save className="w-4 h-4 mr-1" />
          {saving ? 'Menyimpan...' : 'Simpan Pengaturan'}
        </Button>
      </div>
    </motion.div>
  );
}
