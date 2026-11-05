'use client';

import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Copy,
  Edit3,
  ExternalLink,
  Eye,
  EyeOff,
  KeyRound,
  Layers,
  PauseCircle,
  PlayCircle,
  Plus,
  RefreshCw,
  Trash2,
  Users,
  X,
  Zap,
} from 'lucide-react';
import AthleteAvatar, { AthleteHonorPill } from './AthleteAvatar';

export interface StravaAppSummary {
  totalApps: number;
  activeApps: number;
  totalCapacity: number;
  totalConnected: number;
  availableSlots: number;
  usagePercentage: number;
}

export interface ConnectedAthlete {
  userId: string;
  fullName: string;
  email: string;
  avatarUrl: string | null;
  departmentOrUnit: string | null;
  stravaAthleteId: string;
  stravaUsername: string | null;
  connectedAt: string;
  lastSyncAt: string | null;
  syncStatus: string;
}

export interface StravaAppItem {
  id: string;
  name: string;
  clientId: string;
  clientSecretMasked: string;
  maxAthletes: number;
  isActive: boolean;
  priority: number;
  createdAt: string;
  updatedAt: string;
  connectedCount: number;
  availableSlots: number;
  isFull: boolean;
  athletes: ConnectedAthlete[];
}

export default function AdminStravaPoolManagement() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<StravaAppSummary | null>(null);
  const [apps, setApps] = useState<StravaAppItem[]>([]);
  const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingApp, setEditingApp] = useState<StravaAppItem | null>(null);
  const [selectedAppAthletes, setSelectedAppAthletes] = useState<StravaAppItem | null>(null);
  const [revealedSecrets, setRevealedSecrets] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formClientId, setFormClientId] = useState('');
  const [formClientSecret, setFormClientSecret] = useState('');
  const [formMaxAthletes, setFormMaxAthletes] = useState(10);
  const [formPriority, setFormPriority] = useState(2);
  const [submitting, setSubmitting] = useState(false);

  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

  const fetchApps = async () => {
    try {
      setLoading(true);
      const token = typeof window !== 'undefined' ? localStorage.getItem('toprun_token') : null;
      const res = await fetch(`${apiBase}/admin/strava-apps`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (res.ok) {
        const data = await res.json();
        setSummary(data.summary);
        setApps(data.apps || []);
      } else {
        const err = await res.json().catch(() => ({}));
        setActionMsg({ type: 'error', text: err.message || 'Không thể tải danh sách Strava API App.' });
      }
    } catch {
      setActionMsg({ type: 'error', text: 'Lỗi kết nối máy chủ API.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApps();
  }, []);

  const handleCopy = (text: string, id: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const handleToggleActive = async (app: StravaAppItem) => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('toprun_token') : null;
      const nextStatus = !app.isActive;
      const res = await fetch(`${apiBase}/admin/strava-apps/${app.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ isActive: nextStatus }),
      });

      if (res.ok) {
        setActionMsg({
          type: 'success',
          text: `Đã ${nextStatus ? 'kích hoạt hoạt động' : 'tạm dừng'} App "${app.name}".`,
        });
        fetchApps();
      } else {
        const err = await res.json().catch(() => ({}));
        setActionMsg({ type: 'error', text: err.message || 'Lỗi cập nhật trạng thái App.' });
      }
    } catch {
      setActionMsg({ type: 'error', text: 'Lỗi kết nối máy chủ API.' });
    }
  };

  const handleDeleteApp = async (app: StravaAppItem) => {
    if (app.connectedCount > 0) {
      setActionMsg({
        type: 'error',
        text: `Không thể xoá App "${app.name}" vì đang có ${app.connectedCount} VĐV được gán. Hãy chuyển VĐV sang App khác trước.`,
      });
      return;
    }

    if (!confirm(`Bạn có chắc chắn muốn xoá vĩnh viễn Strava App "${app.name}" (Client ID: ${app.clientId})?`)) {
      return;
    }

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('toprun_token') : null;
      const res = await fetch(`${apiBase}/admin/strava-apps/${app.id}`, {
        method: 'DELETE',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (res.ok) {
        setActionMsg({ type: 'success', text: `Đã xoá thành công Strava App "${app.name}".` });
        fetchApps();
      } else {
        const err = await res.json().catch(() => ({}));
        setActionMsg({ type: 'error', text: err.message || 'Không thể xoá Strava App.' });
      }
    } catch {
      setActionMsg({ type: 'error', text: 'Lỗi kết nối máy chủ API.' });
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formClientId.trim() || !formClientSecret.trim()) {
      setActionMsg({ type: 'error', text: 'Vui lòng điền đầy đủ Tên App, Client ID và Client Secret.' });
      return;
    }

    try {
      setSubmitting(true);
      const token = typeof window !== 'undefined' ? localStorage.getItem('toprun_token') : null;
      const res = await fetch(`${apiBase}/admin/strava-apps`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          name: formName.trim(),
          clientId: formClientId.trim(),
          clientSecret: formClientSecret.trim(),
          maxAthletes: Number(formMaxAthletes) || 10,
          priority: Number(formPriority) || 2,
        }),
      });

      if (res.ok) {
        setActionMsg({ type: 'success', text: `Đã thêm thành công Strava App mới: "${formName.trim()}"!` });
        setShowAddModal(false);
        setFormName('');
        setFormClientId('');
        setFormClientSecret('');
        setFormMaxAthletes(10);
        setFormPriority(apps.length + 1);
        fetchApps();
      } else {
        const err = await res.json().catch(() => ({}));
        setActionMsg({ type: 'error', text: err.message || 'Lỗi thêm Strava App mới.' });
      }
    } catch {
      setActionMsg({ type: 'error', text: 'Lỗi kết nối máy chủ API.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingApp) return;

    try {
      setSubmitting(true);
      const token = typeof window !== 'undefined' ? localStorage.getItem('toprun_token') : null;
      const bodyPayload: any = {
        name: formName.trim(),
        maxAthletes: Number(formMaxAthletes) || 10,
        priority: Number(formPriority) || 1,
      };
      if (formClientSecret.trim()) {
        bodyPayload.clientSecret = formClientSecret.trim();
      }

      const res = await fetch(`${apiBase}/admin/strava-apps/${editingApp.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(bodyPayload),
      });

      if (res.ok) {
        setActionMsg({ type: 'success', text: `Đã cập nhật thông tin Strava App "${formName.trim()}".` });
        setEditingApp(null);
        fetchApps();
      } else {
        const err = await res.json().catch(() => ({}));
        setActionMsg({ type: 'error', text: err.message || 'Lỗi cập nhật Strava App.' });
      }
    } catch {
      setActionMsg({ type: 'error', text: 'Lỗi kết nối máy chủ API.' });
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (app: StravaAppItem) => {
    setEditingApp(app);
    setFormName(app.name);
    setFormClientId(app.clientId);
    setFormClientSecret(''); // Để trống nếu không muốn đổi
    setFormMaxAthletes(app.maxAthletes);
    setFormPriority(app.priority);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Notice */}
      {actionMsg && (
        <div
          className={`p-4 rounded-2xl flex items-center justify-between gap-3 text-xs sm:text-sm font-medium transition ${
            actionMsg.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-200'
              : 'bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 text-red-800 dark:text-red-200'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {actionMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
            )}
            <span>{actionMsg.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionMsg(null)}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header and Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-[#FC4C02]" />
            <span>Quản lý Đa Strava API Pool &amp; Phân Bổ Tải (Load Balancing)</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Vượt qua giới hạn 10 VĐV/App của Strava Developer. Tự động phân bổ người dùng mới theo cơ chế{' '}
            <strong className="text-slate-700 dark:text-slate-300">Fill-First (Lấp đầy lần lượt)</strong>.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={fetchApps}
            disabled={loading}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5 transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Làm mới</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setShowAddModal(true);
              setFormName(`Strava App #${apps.length + 1}`);
              setFormClientId('');
              setFormClientSecret('');
              setFormMaxAthletes(10);
              setFormPriority(apps.length + 1);
            }}
            className="px-4 py-2 rounded-xl bg-[#FC4C02] hover:bg-[#E34402] text-white text-xs font-bold flex items-center gap-1.5 transition shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm Strava API Mới</span>
          </button>
        </div>
      </div>

      {/* Metric Pillars */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="p-4 rounded-2xl bg-white dark:bg-[#0F1420] border border-slate-200/80 dark:border-slate-800/80 shadow-xs">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-sky-500" />
              <span>Tổng API App</span>
            </div>
            <div className="text-2xl font-extrabold font-mono text-slate-900 dark:text-white mt-1 tabular-nums">
              {summary.totalApps}{' '}
              <span className="text-xs font-sans font-normal text-emerald-600 dark:text-emerald-400">
                ({summary.activeApps} đang bật)
              </span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1">Cụm API kết nối song song</div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-[#0F1420] border border-slate-200/80 dark:border-slate-800/80 shadow-xs">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-[#FC4C02]" />
              <span>VĐV đã kết nối / Hạn mức</span>
            </div>
            <div className="text-2xl font-extrabold font-mono text-[#FC4C02] mt-1 tabular-nums">
              {summary.totalConnected} / {summary.totalCapacity}
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className="bg-[#FC4C02] h-full rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, summary.usagePercentage)}%` }}
              />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-[#0F1420] border border-slate-200/80 dark:border-slate-800/80 shadow-xs">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-emerald-500" />
              <span>Slots khả dụng</span>
            </div>
            <div className="text-2xl font-extrabold font-mono text-emerald-600 dark:text-emerald-400 mt-1 tabular-nums">
              {summary.availableSlots}{' '}
              <span className="text-xs font-sans font-normal text-slate-500 dark:text-slate-400">chỗ trống</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1">Sẵn sàng gán cho VĐV mới</div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-[#0F1420] border border-slate-200/80 dark:border-slate-800/80 shadow-xs">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              <span>Thuật toán phân bổ</span>
            </div>
            <div className="text-sm font-bold text-slate-900 dark:text-white mt-1">
              Fill-First Allocation
            </div>
            <div className="text-[11px] text-slate-400 mt-1">Lấp đầy lần lượt từng App</div>
          </div>
        </div>
      )}

      {/* Strava Apps Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {apps.map((app) => {
          const usagePct = Math.round((app.connectedCount / Math.max(1, app.maxAthletes)) * 100);
          const isRevealed = Boolean(revealedSecrets[app.id]);

          return (
            <div
              key={app.id}
              className={`rounded-2xl p-5 border transition-all shadow-xs ${
                app.isActive
                  ? 'bg-white dark:bg-[#0F1420] border-slate-200/80 dark:border-slate-800/80 hover:border-[#FC4C02]/40'
                  : 'bg-slate-50/70 dark:bg-slate-900/40 border-slate-200/50 dark:border-slate-800/40 opacity-75'
              }`}
            >
              {/* Card Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white truncate">
                      {app.name}
                    </h3>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      Ưu tiên #{app.priority}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                        app.isActive
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60'
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${app.isActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}
                      />
                      <span>{app.isActive ? 'Đang hoạt động' : 'Tạm dừng'}</span>
                    </span>

                    {app.isFull && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60">
                        ĐÃ ĐẦY SLOT (10/10)
                      </span>
                    )}
                  </div>
                </div>

                {/* Quick actions: Pause / Edit / Delete */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleToggleActive(app)}
                    title={app.isActive ? 'Tạm dừng phân bổ' : 'Kích hoạt lại'}
                    className={`p-2 rounded-xl border transition cursor-pointer ${
                      app.isActive
                        ? 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/30'
                        : 'border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
                    }`}
                  >
                    {app.isActive ? <PauseCircle className="w-4 h-4" /> : <PlayCircle className="w-4 h-4" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => openEditModal(app)}
                    title="Chỉnh sửa cấu hình"
                    className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-sky-500 hover:bg-sky-50 dark:hover:bg-sky-950/30 transition cursor-pointer"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteApp(app)}
                    disabled={app.connectedCount > 0}
                    title={
                      app.connectedCount > 0
                        ? 'Không thể xoá App đang có VĐV kết nối'
                        : 'Xoá Strava API App'
                    }
                    className={`p-2 rounded-xl border transition ${
                      app.connectedCount > 0
                        ? 'border-transparent text-slate-300 dark:text-slate-700 cursor-not-allowed opacity-50'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-rose-500 hover:border-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer'
                    }`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Client ID & Secret Display */}
              <div className="mt-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200/70 dark:border-slate-800 space-y-2 text-xs font-mono">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-500 dark:text-slate-400 font-sans text-[11px]">Client ID:</span>
                  <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">
                    <span>{app.clientId}</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(app.clientId, `cid_${app.id}`)}
                      title="Sao chép Client ID"
                      className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-white"
                    >
                      {copiedId === `cid_${app.id}` ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-500 dark:text-slate-400 font-sans text-[11px]">Client Secret:</span>
                  <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                    <span>{isRevealed ? app.clientSecretMasked : '••••••••••••••••'}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setRevealedSecrets((prev) => ({
                          ...prev,
                          [app.id]: !prev[app.id],
                        }))
                      }
                      title={isRevealed ? 'Ẩn Secret' : 'Hiện Secret'}
                      className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-white"
                    >
                      {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Usage & Capacity Bar */}
              <div className="mt-4 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 dark:text-slate-400">
                    Dung lượng VĐV:{' '}
                    <strong className="text-slate-900 dark:text-white font-mono">
                      {app.connectedCount} / {app.maxAthletes}
                    </strong>
                  </span>
                  <span
                    className={`font-bold font-mono text-[11px] ${
                      usagePct >= 100
                        ? 'text-rose-500'
                        : usagePct >= 70
                          ? 'text-amber-500'
                          : 'text-emerald-500'
                    }`}
                  >
                    {usagePct}% (Còn {app.availableSlots} chỗ)
                  </span>
                </div>

                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      usagePct >= 100
                        ? 'bg-rose-500'
                        : usagePct >= 70
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(100, usagePct)}%` }}
                  />
                </div>
              </div>

              {/* Athletes Stack / Trigger */}
              <div className="mt-4 pt-3.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedAppAthletes(app)}
                  className="text-xs font-semibold text-[#FC4C02] hover:underline flex items-center gap-1.5 cursor-pointer"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Xem danh sách VĐV đã gán ({app.connectedCount})</span>
                </button>

                {/* Avatar Stack Preview */}
                <div className="flex items-center -space-x-1.5 overflow-hidden">
                  {app.athletes.slice(0, 4).map((ath) => (
                    <img
                      key={ath.userId}
                      src={
                        ath.avatarUrl ||
                        `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(ath.email)}`
                      }
                      alt={ath.fullName}
                      title={ath.fullName}
                      className="w-6 h-6 rounded-full ring-2 ring-white dark:ring-[#0F1420] object-cover"
                    />
                  ))}
                  {app.athletes.length > 4 && (
                    <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-800 ring-2 ring-white dark:ring-[#0F1420] text-[9px] font-bold text-slate-600 dark:text-slate-300 flex items-center justify-center">
                      +{app.athletes.length - 4}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal: Thêm Strava API Mới */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="max-w-md w-full bg-white dark:bg-[#0F1420] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-5 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-orange-100 dark:bg-[#FC4C02]/15 text-[#FC4C02] flex items-center justify-center">
                  <Plus className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Thêm Strava API App Mới
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Tên App nhận diện:
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: Strava App #2 (Phòng Ban ASSA ABLOY)"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#FC4C02]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Client ID (Từ trang strava.com/settings/api):
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: 293812"
                  value={formClientId}
                  onChange={(e) => setFormClientId(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs font-mono rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#FC4C02]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Client Secret:
                </label>
                <input
                  type="text"
                  required
                  placeholder="Mã Client Secret bí mật của App"
                  value={formClientSecret}
                  onChange={(e) => setFormClientSecret(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs font-mono rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#FC4C02]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Giới hạn VĐV tối đa:
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={formMaxAthletes}
                    onChange={(e) => setFormMaxAthletes(Number(e.target.value))}
                    className="w-full px-3.5 py-2 text-xs font-mono rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#FC4C02]"
                  />
                  <span className="text-[10px] text-slate-400">Mặc định: 10 VĐV</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Thứ tự ưu tiên (Priority):
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={99}
                    value={formPriority}
                    onChange={(e) => setFormPriority(Number(e.target.value))}
                    className="w-full px-3.5 py-2 text-xs font-mono rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#FC4C02]"
                  />
                  <span className="text-[10px] text-slate-400">Số nhỏ hơn ưu tiên trước</span>
                </div>
              </div>

              {/* Tips for Strava API Portal */}
              <div className="p-3 rounded-xl bg-orange-50/70 dark:bg-[#FC4C02]/10 border border-orange-200/60 dark:border-[#FC4C02]/25 text-[11px] text-slate-600 dark:text-slate-300 space-y-1">
                <div className="font-bold text-[#FC4C02]">💡 Lưu ý khi tạo App trên Strava:</div>
                <div>
                  - <strong>Authorization Callback Domain:</strong> Điền tên miền của website (ví dụ: <code className="font-mono text-[#FC4C02]">localhost</code> hoặc domain thật).
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Huỷ
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-[#FC4C02] hover:bg-[#E34402] text-white text-xs font-bold transition shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Đang lưu...' : 'Lưu App Mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Chỉnh sửa Strava App */}
      {editingApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="max-w-md w-full bg-white dark:bg-[#0F1420] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-5 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-sky-100 dark:bg-sky-950/60 text-sky-500 flex items-center justify-center">
                  <Edit3 className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Chỉnh Sửa Strava API App
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingApp(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Tên App:
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#FC4C02]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Client ID (Cố định):
                </label>
                <input
                  type="text"
                  disabled
                  value={editingApp.clientId}
                  className="w-full px-3.5 py-2 text-xs font-mono rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 text-slate-500 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Client Secret mới (Để trống nếu không muốn đổi):
                </label>
                <input
                  type="text"
                  placeholder="Nhập Secret mới nếu cần cập nhật..."
                  value={formClientSecret}
                  onChange={(e) => setFormClientSecret(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs font-mono rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#FC4C02]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Giới hạn VĐV:
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={formMaxAthletes}
                    onChange={(e) => setFormMaxAthletes(Number(e.target.value))}
                    className="w-full px-3.5 py-2 text-xs font-mono rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#FC4C02]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Thứ tự ưu tiên:
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={99}
                    value={formPriority}
                    onChange={(e) => setFormPriority(Number(e.target.value))}
                    className="w-full px-3.5 py-2 text-xs font-mono rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#FC4C02]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingApp(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Huỷ
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-[#FC4C02] hover:bg-[#E34402] text-white text-xs font-bold transition shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Đang lưu...' : 'Lưu Thay Đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Danh sách VĐV đã gán vào App */}
      {selectedAppAthletes && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="max-w-2xl w-full bg-white dark:bg-[#0F1420] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-5 animate-in fade-in duration-200 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#FC4C02]" />
                  <span>Danh sách VĐV đã gán vào {selectedAppAthletes.name}</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Client ID: <span className="font-mono">{selectedAppAthletes.clientId}</span> • Số VĐV hiện tại:{' '}
                  <strong className="text-slate-900 dark:text-white font-mono">
                    {selectedAppAthletes.connectedCount} / {selectedAppAthletes.maxAthletes}
                  </strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAppAthletes(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {selectedAppAthletes.athletes.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                  Chưa có vận động viên nào được phân bổ vào App này.
                </div>
              ) : (
                selectedAppAthletes.athletes.map((ath, idx) => (
                  <div
                    key={ath.userId}
                    className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xs font-mono font-bold text-slate-400 w-5 text-center">
                        #{idx + 1}
                      </span>
                      <div className="shrink-0 my-1">
                        <AthleteAvatar
                          user={{
                            id: ath.userId,
                            fullName: ath.fullName,
                            avatarUrl: ath.avatarUrl,
                            departmentOrUnit: ath.departmentOrUnit,
                          }}
                          size="sm"
                          showBadge={true}
                          showWings={true}
                          showSharkCrown={true}
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 dark:text-white truncate flex items-center gap-1.5 flex-wrap">
                          <span>{ath.fullName}</span>
                          <AthleteHonorPill user={{ id: ath.userId, fullName: ath.fullName }} />
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          {ath.email} • {ath.departmentOrUnit || 'Runner'}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="font-mono font-bold text-[11px] text-slate-700 dark:text-slate-300">
                        Athlete #{ath.stravaAthleteId}
                      </div>
                      <div className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center justify-end gap-1 mt-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span>{ath.syncStatus}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setSelectedAppAthletes(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 transition"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

