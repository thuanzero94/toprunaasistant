'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Activity,
  Award,
  CheckCircle2,
  ChevronRight,
  Download,
  FileUp,
  Flame,
  FlaskConical,
  Heart,
  LayoutDashboard,
  LogOut,
  MapPin,
  Medal,
  Moon,
  RefreshCw,
  Save,
  Search,
  Settings,
  Share2,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Sun,
  Target,
  Trash2,
  Trophy,
  Truck,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import AccountAndStravaPanel from '../components/AccountAndStravaPanel';
import UserTracklogExplorer, { TracklogActivityItem } from '../components/UserTracklogExplorer';
import {
  AntiCheatStatus,
  ChallengeConditionType,
  EventRuleConfigSchema,
  SportType,
  calculateDualGoalProgress,
  encodePolyline,
  evaluateActivitySplits,
  formatDuration,
  formatPace,
  parseGpxToActivityInput,
  polylineToSvgPath,
  roundKm,
  RunMode,
} from '@toprun/shared';

const SAMPLE_POLYLINE_SALA = encodePolyline([
  { lat: 10.7721, lng: 106.7215 },
  { lat: 10.7755, lng: 106.7232 },
  { lat: 10.7789, lng: 106.7261 },
  { lat: 10.7812, lng: 106.724 },
  { lat: 10.7798, lng: 106.7195 },
  { lat: 10.776, lng: 106.7182 },
  { lat: 10.7725, lng: 106.7198 },
  { lat: 10.7721, lng: 106.7215 },
]);

const SAMPLE_POLYLINE_WESTLAKE = encodePolyline([
  { lat: 21.0431, lng: 105.8362 },
  { lat: 21.0512, lng: 105.8291 },
  { lat: 21.0625, lng: 105.821 },
  { lat: 21.071, lng: 105.8185 },
  { lat: 21.068, lng: 105.811 },
  { lat: 21.055, lng: 105.814 },
  { lat: 21.045, lng: 105.825 },
  { lat: 21.0431, lng: 105.8362 },
]);

const SAMPLE_POLYLINE_HOANKIEM = encodePolyline([
  { lat: 21.0285, lng: 105.8525 },
  { lat: 21.0312, lng: 105.8531 },
  { lat: 21.0330, lng: 105.8515 },
  { lat: 21.0318, lng: 105.8498 },
  { lat: 21.0272, lng: 105.8495 },
  { lat: 21.0245, lng: 105.8518 },
  { lat: 21.0258, lng: 105.8542 },
  { lat: 21.0285, lng: 105.8525 },
]);

const DEFAULT_EVENT_RULES = EventRuleConfigSchema.parse({
  allowedSportTypes: [SportType.RUN, SportType.TRAIL_RUN, SportType.VIRTUAL_RUN],
  minPaceSecPerKm: 180,
  maxPaceSecPerKm: 900,
  minActivityDistanceKm: 1.0,
  minStepCadenceSpm: 120,
  requireHeartRate: false,
  allowSplitFiltering: true,
  weekendMultiplier: 1.0,
});

const INITIAL_CHALLENGE_TIERS = [
  {
    id: 'tier_over_100k',
    tierName: 'Mốc Bạc: Vượt Ngưỡng 100KM',
    tierLevel: 'SILVER' as const,
    conditionType: ChallengeConditionType.DISTANCE_OVERACHIEVE,
    thresholdValue: 100,
    awardBadgeUrl: 'SILVER',
    rewardDescription: 'Huy hiệu Chiến Binh Bạc 100KM & Áo Finisher phiên bản giới hạn',
  },
  {
    id: 'tier_over_150k',
    tierName: 'Mốc Vàng: Siêu Chiến Binh 150KM',
    tierLevel: 'GOLD' as const,
    conditionType: ChallengeConditionType.DISTANCE_OVERACHIEVE,
    thresholdValue: 150,
    awardBadgeUrl: 'GOLD',
    rewardDescription: 'Huy hiệu Siêu Chiến Binh Vàng 150KM & Khắc tên Vàng lên Kỷ niệm chương',
  },
  {
    id: 'tier_streak_5d',
    tierName: 'Kỷ Luật Thép: Chuỗi 5 Ngày Liên Tiếp',
    tierLevel: 'DIAMOND' as const,
    conditionType: ChallengeConditionType.STREAK_DAYS,
    thresholdValue: 5,
    minDailyDistanceKm: 2.0,
    awardBadgeUrl: 'DIAMOND',
    rewardDescription: 'Chạy tối thiểu 2km mỗi ngày trong 5 ngày liên tục',
  },
  {
    id: 'tier_longrun_15k',
    tierName: 'Bền Bỉ: Long Run >= 15KM',
    tierLevel: 'SPECIAL' as const,
    conditionType: ChallengeConditionType.SINGLE_LONG_RUN,
    thresholdValue: 15,
    awardBadgeUrl: 'SPECIAL',
    rewardDescription: 'Hoàn thành cự ly từ 15KM trở lên trong một buổi chạy duy nhất',
  },
];

type NavTab = 'events' | 'tracklogs' | 'trophy' | 'clubs' | 'account' | 'admin';

export default function TopRunWebApp() {
  const router = useRouter();
  const { user, logout, isLoading: isAuthLoading } = useAuth();

  const [activeTab, setActiveTab] = useState<NavTab>('events');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [showSimulatorDrawer, setShowSimulatorDrawer] = useState(false);
  const [leaderboardMode, setLeaderboardMode] = useState<'individual' | 'team'>('individual');
  const [selectedActivityId, setSelectedActivityId] = useState<string>('act_01');
  const [showShareModal, setShowShareModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [syncBannerMessage, setSyncBannerMessage] = useState<string | null>(null);
  const [isSyncingStrava, setIsSyncingStrava] = useState(false);

  // AuthGuard: Yêu cầu đăng nhập để truy cập Dashboard
  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.push('/login');
    }
  }, [isAuthLoading, user, router]);

  // Sync theme class with <html> element
  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('toprun_theme') : null;
    if (saved === 'light' || saved === 'dark') {
      setTheme(saved);
      document.documentElement.classList.toggle('dark', saved === 'dark');
    } else {
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.classList.toggle('dark', next === 'dark');
    if (typeof window !== 'undefined') {
      localStorage.setItem('toprun_theme', next);
    }
  };

  const [myTargetKm, setMyTargetKm] = useState<number>(50);
  const [myBibNumber, setMyBibNumber] = useState<string>('TOP50-0018');
  const [myShirtSize, setMyShirtSize] = useState<string>('L');

  // Cập nhật cỡ áo từ thông tin user nếu có
  useEffect(() => {
    if (user?.defaultShirtSize) {
      setMyShirtSize(user.defaultShirtSize);
    }
  }, [user]);

  // Multi-Event State & Event Selector
  const [eventsList, setEventsList] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('evt_vr_2026');
  const [currentEventData, setCurrentEventData] = useState<any>(null);
  const [showCreateEventModal, setShowCreateEventModal] = useState<boolean>(false);
  const [newEventForm, setNewEventForm] = useState({
    title: '',
    subtitle: '',
    description: '',
    eventType: 'VIRTUAL_RACE',
    runMode: 'ACCUMULATIVE',
    startDateIso: '2026-11-01',
    endDateIso: '2026-12-31',
    minPaceFormatted: '03:30',
    maxPaceFormatted: '15:00',
    minActivityDistanceKm: 1.0,
    weekendMultiplier: 1.0,
    categories: [
      { name: 'Mốc Target 21KM (Starter)', targetDistanceKm: 21, bibPrefix: 'VR21-' },
      { name: 'Mốc Target 42KM (Marathoner)', targetDistanceKm: 42, bibPrefix: 'VR42-' },
    ],
  });

  // Admin Management Sub-tabs & State
  const [adminSubTab, setAdminSubTab] = useState<'users' | 'races' | 'moderation' | 'fulfillment'>('users');
  const [adminUsers, setAdminUsers] = useState<any[]>([]);
  const [isAdminUsersLoading, setIsAdminUsersLoading] = useState(false);
  const [adminUserSearch, setAdminUserSearch] = useState('');
  const [adminUserActionMsg, setAdminUserActionMsg] = useState<string | null>(null);

  // Admin Event Management State
  const [adminEventData, setAdminEventData] = useState<any>(null);
  const [isAdminEventLoading, setIsAdminEventLoading] = useState(false);
  const [adminEventSaveMsg, setAdminEventSaveMsg] = useState<string | null>(null);
  const [eventForm, setEventForm] = useState({
    title: '',
    subtitle: '',
    status: 'ACTIVE',
    startDateIso: '',
    endDateIso: '',
    minPaceFormatted: '03:00',
    maxPaceFormatted: '15:00',
    minActivityDistanceKm: 1.0,
    weekendMultiplier: 1.0,
  });

  // Guard Admin tab: Redirect to events if user is not ADMIN
  useEffect(() => {
    if (user && user.role !== 'ADMIN' && activeTab === 'admin') {
      setActiveTab('events');
    }
  }, [user, activeTab]);

  const fetchAdminUsers = useCallback(async () => {
    if (user?.role !== 'ADMIN') return;
    setIsAdminUsersLoading(true);
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
      const token = typeof window !== 'undefined' ? localStorage.getItem('toprun_auth_token') : null;
      const res = await fetch(`${apiBase}/admin/users`, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      if (res.ok) {
        const data = await res.json();
        setAdminUsers(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Failed to fetch admin users:', err);
    } finally {
      setIsAdminUsersLoading(false);
    }
  }, [user?.role]);

  const handleUpdateUserRole = async (targetUserId: string, newRole: string) => {
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
      const token = typeof window !== 'undefined' ? localStorage.getItem('toprun_auth_token') : null;
      const res = await fetch(`${apiBase}/admin/users/${targetUserId}/role`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ role: newRole }),
      });
      if (res.ok) {
        setAdminUsers((prev) =>
          prev.map((u) => (u.id === targetUserId ? { ...u, role: newRole } : u))
        );
        setAdminUserActionMsg(`Đã cập nhật vai trò người dùng thành ${newRole}!`);
        setTimeout(() => setAdminUserActionMsg(null), 4000);
      } else {
        const err = await res.json();
        alert(err.message || 'Không thể cập nhật vai trò');
      }
    } catch (err: any) {
      alert(err.message || 'Lỗi kết nối khi cập nhật vai trò');
    }
  };

  const handleDeleteUser = async (targetUserId: string, targetName: string) => {
    if (targetUserId === user?.id) {
      alert('Bạn không thể tự xoá tài khoản Admin đang đăng nhập!');
      return;
    }
    if (!confirm(`Bạn có chắc chắn muốn xoá tài khoản của "${targetName}" khỏi hệ thống?`)) {
      return;
    }
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
      const token = typeof window !== 'undefined' ? localStorage.getItem('toprun_auth_token') : null;
      const res = await fetch(`${apiBase}/admin/users/${targetUserId}`, {
        method: 'DELETE',
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      if (res.ok) {
        setAdminUsers((prev) => prev.filter((u) => u.id !== targetUserId));
        setAdminUserActionMsg(`Đã xoá tài khoản "${targetName}" thành công!`);
        setTimeout(() => setAdminUserActionMsg(null), 4000);
      } else {
        const err = await res.json();
        alert(err.message || 'Không thể xoá người dùng');
      }
    } catch (err: any) {
      alert(err.message || 'Lỗi khi xoá người dùng');
    }
  };

  const fetchEventsList = useCallback(async () => {
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
      const res = await fetch(`${apiBase}/events`);
      if (res.ok) {
        const list = await res.json();
        if (Array.isArray(list) && list.length > 0) {
          setEventsList(list);
          if (!selectedEventId || !list.some((e: any) => e.id === selectedEventId)) {
            setSelectedEventId(list[0].id);
          }
        }
      }
    } catch (err) {
      console.warn('Tạm thời chưa kết nối được máy chủ Backend /events:', (err as any)?.message);
    }
  }, [selectedEventId]);

  const fetchEventDetails = useCallback(async (eventId: string) => {
    if (!eventId) return;
    setIsAdminEventLoading(true);
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
      const res = await fetch(`${apiBase}/events/${encodeURIComponent(eventId)}`);
      if (res.ok) {
        const ev = await res.json();
        setCurrentEventData(ev);
        setAdminEventData(ev);
        const minPaceSec = ev.ruleConfig?.minPaceSecPerKm ?? 180;
        const maxPaceSec = ev.ruleConfig?.maxPaceSecPerKm ?? 900;
        setEventForm({
          title: ev.title || '',
          subtitle: ev.subtitle || '',
          status: ev.status || 'ACTIVE',
          startDateIso: ev.startDateIso ? ev.startDateIso.slice(0, 10) : '2026-10-01',
          endDateIso: ev.endDateIso ? ev.endDateIso.slice(0, 10) : '2026-11-30',
          minPaceFormatted: `${String(Math.floor(minPaceSec / 60)).padStart(2, '0')}:${String(minPaceSec % 60).padStart(2, '0')}`,
          maxPaceFormatted: `${String(Math.floor(maxPaceSec / 60)).padStart(2, '0')}:${String(maxPaceSec % 60).padStart(2, '0')}`,
          minActivityDistanceKm: ev.ruleConfig?.minActivityDistanceKm ?? 1.0,
          weekendMultiplier: ev.ruleConfig?.weekendMultiplier ?? 1.0,
        });
      }
    } catch (err) {
      console.warn('Tạm thời chưa kết nối được máy chủ Backend /events/:id:', (err as any)?.message);
    } finally {
      setIsAdminEventLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEventsList();
  }, [fetchEventsList]);

  useEffect(() => {
    if (selectedEventId) {
      fetchEventDetails(selectedEventId);
    }
  }, [selectedEventId, fetchEventDetails]);

  const handleSaveEventRules = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
      const token = typeof window !== 'undefined' ? localStorage.getItem('toprun_auth_token') : null;
      
      const parsePace = (str: string, defaultSec: number) => {
        const parts = str.split(':');
        if (parts.length === 2) {
          const m = parseInt(parts[0], 10);
          const s = parseInt(parts[1], 10);
          if (!isNaN(m) && !isNaN(s)) return m * 60 + s;
        }
        return defaultSec;
      };

      const payload = {
        title: eventForm.title,
        subtitle: eventForm.subtitle,
        status: eventForm.status,
        startDateIso: new Date(eventForm.startDateIso).toISOString(),
        endDateIso: new Date(eventForm.endDateIso).toISOString(),
        ruleConfig: {
          minPaceSecPerKm: parsePace(eventForm.minPaceFormatted, 180),
          maxPaceSecPerKm: parsePace(eventForm.maxPaceFormatted, 900),
          minActivityDistanceKm: Number(eventForm.minActivityDistanceKm) || 1.0,
          weekendMultiplier: Number(eventForm.weekendMultiplier) || 1.0,
        },
      };

      const res = await fetch(`${apiBase}/events/${encodeURIComponent(selectedEventId)}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setAdminEventSaveMsg(`Đã lưu và áp dụng quy chế giải "${eventForm.title}" thành công!`);
        fetchEventsList();
        fetchEventDetails(selectedEventId);
        setTimeout(() => setAdminEventSaveMsg(null), 4000);
      } else {
        const err = await res.json();
        alert(err.message || 'Lỗi khi lưu cấu hình');
      }
    } catch (err: any) {
      alert(err.message || 'Lỗi kết nối khi lưu giải chạy');
    }
  };

  const handleCreateNewEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
      const token = typeof window !== 'undefined' ? localStorage.getItem('toprun_auth_token') : null;
      const parsePace = (str: string, defaultSec: number) => {
        const parts = str.split(':');
        if (parts.length === 2) {
          const m = parseInt(parts[0], 10);
          const s = parseInt(parts[1], 10);
          if (!isNaN(m) && !isNaN(s)) return m * 60 + s;
        }
        return defaultSec;
      };

      const payload = {
        title: newEventForm.title,
        subtitle: newEventForm.subtitle || 'Giải chạy tích lũy trực tuyến',
        description: newEventForm.description || newEventForm.title,
        eventType: newEventForm.eventType,
        runMode: newEventForm.runMode,
        startDateIso: new Date(newEventForm.startDateIso).toISOString(),
        endDateIso: new Date(newEventForm.endDateIso).toISOString(),
        minPaceSecPerKm: parsePace(newEventForm.minPaceFormatted, 210),
        maxPaceSecPerKm: parsePace(newEventForm.maxPaceFormatted, 900),
        minActivityDistanceKm: Number(newEventForm.minActivityDistanceKm) || 1.0,
        weekendMultiplier: Number(newEventForm.weekendMultiplier) || 1.0,
        allowSplitFiltering: true,
        categories: newEventForm.categories,
        challengeTiers: [
          {
            tierName: 'Challenge Finisher Vàng',
            tierLevel: 'GOLD',
            conditionType: ChallengeConditionType.DISTANCE_OVERACHIEVE,
            thresholdValue: 50,
            awardBadgeUrl: '🥇',
            rewardDescription: 'Huy hiệu Chiến Binh Hoàn Thành',
          },
        ],
      };

      const res = await fetch(`${apiBase}/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const created = await res.json();
        alert(`Tạo giải đấu "${created.title}" thành công!`);
        setShowCreateEventModal(false);
        await fetchEventsList();
        setSelectedEventId(created.id);
      } else {
        const err = await res.json();
        alert(err.message || 'Lỗi khi tạo giải đấu');
      }
    } catch (err: any) {
      alert(err.message || 'Lỗi kết nối');
    }
  };

  useEffect(() => {
    if (activeTab === 'admin' && user?.role === 'ADMIN') {
      fetchAdminUsers();
      if (selectedEventId) {
        fetchEventDetails(selectedEventId);
      }
    }
  }, [activeTab, user?.role, fetchAdminUsers, selectedEventId, fetchEventDetails]);

  const [activities, setActivities] = useState<TracklogActivityItem[]>([]);

  const mapBackendActivityToUi = useCallback((sa: any) => {
    const isHidden = Boolean(sa.isHidden);
    const validKm = Number(sa.validDistanceKm ?? sa.rawDistanceKm ?? 0);
    return {
      id: sa.id,
      userId: sa.userId || '',
      userName: sa.userName || 'Vận Động Viên',
      department: sa.userDepartment || 'Runner Community',
      source: sa.source || 'STRAVA SYNC',
      externalId: sa.externalId,
      name: sa.name,
      startDateIso: sa.startDateIso || new Date().toISOString(),
      dateStr: sa.startDateIso
        ? new Date(sa.startDateIso).toLocaleString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })
        : 'Vừa đồng bộ',
      rawDistanceKm: Number(sa.rawDistanceKm ?? 0),
      validDistanceKm: validKm,
      invalidDistanceKm: Number(sa.invalidDistanceKm ?? 0),
      appliedMultiplier: 1.0,
      finalCountedDistanceKm: isHidden ? 0 : validKm,
      movingTimeSec: Number(sa.movingTimeSec ?? 0),
      avgPaceSecPerKm: Number(sa.avgPaceSecPerKm ?? 0),
      elevationGain: Math.round(Number(sa.totalElevationGainMeters ?? 0)),
      avgHr: Math.round(Number(sa.averageHeartrate || 152)),
      avgCadence: Math.round(Number(sa.averageCadenceSpm || 174)),
      deviceName: sa.deviceName || 'Strava GPS Watch / Mobile App',
      antiCheatStatus: sa.antiCheatStatus || AntiCheatStatus.VALID,
      flagReasons: Array.isArray(sa.flagReasons) ? sa.flagReasons : [],
      polyline: sa.mapPolyline || SAMPLE_POLYLINE_HOANKIEM,
      kudos: Number(sa.kudosCount ?? 1),
      liked: Boolean(sa.likedByMe ?? true),
      isHidden,
      splits: Array.isArray(sa.splits) && sa.splits.length > 0 ? sa.splits : [],
    };
  }, []);

  const fetchActivitiesFromBackend = useCallback(
    async (selectNewestMine = false) => {
      try {
        const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
        const token = typeof window !== 'undefined' ? localStorage.getItem('toprun_auth_token') : null;
        const res = await fetch(`${apiBase}/activities`, {
          cache: 'no-store',
          headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        });
        if (!res.ok) return;
        const list = await res.json();
        if (Array.isArray(list)) {
          const mapped = list.map(mapBackendActivityToUi);
          setActivities(mapped);
          const firstMine = user?.id
            ? mapped.find((a) => a.userId === user.id)
            : (user?.role === 'ADMIN' ? mapped[0] : undefined);
          if (firstMine) {
            setSelectedActivityId(firstMine.id);
          } else if (user?.role === 'ADMIN' && mapped[0]) {
            setSelectedActivityId(mapped[0].id);
          } else {
            setSelectedActivityId('');
          }
        }
      } catch {
        // Ignore network errors during initial hydration
      }
    },
    [mapBackendActivityToUi, user?.id, user?.role]
  );

  useEffect(() => {
    fetchActivitiesFromBackend(true);
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab');
      const stravaParam = params.get('strava');
      const syncedParam = params.get('synced');
      if (tabParam === 'account') {
        setActiveTab('account');
      }
      if (stravaParam === 'connected') {
        setSyncBannerMessage(
          `Đã liên kết tài khoản Strava thành công và đồng bộ ${syncedParam || 0} hoạt động chạy bộ trong 30 ngày gần nhất.`
        );
      }
    }
  }, [fetchActivitiesFromBackend]);

  // Tính toán danh sách bài chạy hợp lệ theo giải đang chọn (khớp thời gian giải đấu + nhân hệ số của giải đó)
  const myActivityLogs = useMemo(() => {
    const evStart = currentEventData?.startDateIso ? new Date(currentEventData.startDateIso).getTime() : 0;
    const evEnd = currentEventData?.endDateIso ? new Date(currentEventData.endDateIso).getTime() : Infinity;
    const multiplier = currentEventData?.ruleConfig?.weekendMultiplier ?? 1.0;

    return activities
      .filter((a) => {
        const isMine = user?.id ? a.userId === user.id : false;
        if (!isMine || a.isHidden || a.validDistanceKm <= 0) return false;

        const actTime = a.startDateIso ? new Date(a.startDateIso).getTime() : Date.now();
        return actTime >= evStart && actTime <= evEnd;
      })
      .map((a) => {
        let mult = 1.0;
        if (a.startDateIso) {
          const d = new Date(a.startDateIso).getUTCDay();
          if ((d === 0 || d === 6) && multiplier > 1.0) {
            mult = multiplier;
          }
        }
        return {
          activityDateIso: (a as any).startDateIso || '2026-10-28T06:00:00Z',
          validRawDistanceKm: a.validDistanceKm,
          finalMultipliedDistanceKm: roundKm(a.validDistanceKm * mult),
          elevationGainMeters: a.elevationGain || 0,
        };
      });
  }, [activities, currentEventData, user?.id]);

  const userEventParticipation = useMemo(() => {
    if (!currentEventData?.individualLeaderboard || !user?.id) return null;
    return currentEventData.individualLeaderboard.find(
      (p: any) => p.userId === user.id
    );
  }, [currentEventData, user?.id]);

  useEffect(() => {
    if (userEventParticipation?.bibNumber) {
      setMyBibNumber(userEventParticipation.bibNumber);
    } else {
      setMyBibNumber(`BIB-${user?.id?.slice(-4) || '2026'}`);
    }
    if (userEventParticipation?.targetDistanceKm) {
      setMyTargetKm(userEventParticipation.targetDistanceKm);
    }
  }, [userEventParticipation, user?.id]);

  const dualGoalProgress = calculateDualGoalProgress({
    runMode: currentEventData?.runMode || RunMode.ACCUMULATIVE,
    targetCategory: {
      id: userEventParticipation?.targetCategoryName || 'cat_target',
      name: userEventParticipation?.targetCategoryName || `Hạng mục Mục tiêu ${myTargetKm}KM (Finisher)`,
      targetDistanceKm: myTargetKm,
      bibPrefix: myBibNumber.split('-')[0] + '-' || `TOP${myTargetKm}-`,
    },
    challengeTiers:
      currentEventData?.challengeTiers?.length > 0 ? currentEventData.challengeTiers : INITIAL_CHALLENGE_TIERS,
    activityLogs: myActivityLogs,
    previouslyCompletedTargetAtIso: '2026-10-25T07:15:00Z',
  });

  const handleToggleHideActivity = async (activityId: string) => {
    const target = activities.find((a) => a.id === activityId);
    if (!target) return;
    const nextHidden = !target.isHidden;

    // Optimistic UI update
    setActivities((prev) =>
      prev.map((a) =>
        a.id === activityId
          ? {
              ...a,
              isHidden: nextHidden,
              finalCountedDistanceKm: nextHidden ? 0 : a.validDistanceKm,
            }
          : a
      )
    );

    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
      await fetch(`${apiBase}/activities/${encodeURIComponent(activityId)}/visibility`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify({ isHidden: nextHidden }),
      });
    } catch {
      // Keep optimistic state even if offline
    }

    setSyncBannerMessage(
      nextHidden
        ? `Đã ẩn hoạt động "${target.name}" (${target.validDistanceKm} km). Hoạt động này sẽ KHÔNG được tính vào Giải (0 km).`
        : `Đã hiện lại hoạt động "${target.name}". Đã cộng lại +${target.validDistanceKm} km vào tiến độ Giải chạy.`
    );
  };

  const handleDeleteActivity = async (activityId: string) => {
    const target = activities.find((a) => a.id === activityId);
    if (!target) return;

    setActivities((prev) => {
      const remaining = prev.filter((a) => a.id !== activityId);
      if (selectedActivityId === activityId && remaining.length > 0) {
        setSelectedActivityId(remaining[0].id);
      }
      return remaining;
    });

    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
      await fetch(`${apiBase}/activities/${encodeURIComponent(activityId)}`, {
        method: 'DELETE',
      });
    } catch {
      // Keep optimistic deletion
    }

    setSyncBannerMessage(
      `Đã xoá hoạt động "${target.name}" khỏi Nhật ký. Quãng đường của hoạt động này đã được loại bỏ khỏi Giải chạy.`
    );
  };

  const handleLiveStravaSyncFromTracklog = async () => {
    try {
      setIsSyncingStrava(true);
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
      const targetUserId = user?.id;
      if (!targetUserId) {
        setSyncBannerMessage('Vui lòng đăng nhập để đồng bộ hoạt động Strava của bạn.');
        return;
      }
      const token = typeof window !== 'undefined' ? localStorage.getItem('toprun_auth_token') : null;
      const res = await fetch(`${apiBase}/strava/sync-live`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ userId: targetUserId, windowDays: 30 }),
      });
      const data = await res.json();

      await fetchActivitiesFromBackend(true);

      if (data.status === 'SUCCESS') {
        setSyncBannerMessage(
          data.newlySyncedCount > 0
            ? `Đồng bộ Strava thành công: đã tải ${data.newlySyncedCount} hoạt động mới vào Nhật ký & Tracklog.`
            : `Đã đồng bộ Strava (${data.totalFetchedFromStrava || 0} hoạt động gần nhất): tất cả bài chạy đã hiển thị đầy đủ trong Nhật ký.`
        );
      } else if (data.status === 'REQUIRE_ACTIVITY_SCOPE') {
        setSyncBannerMessage(
          'Phiên Strava hiện tại cần cấp quyền đọc hoạt động (activity:read_all). Hãy vào mục "Hồ sơ & Kết nối Strava" -> nhấn "Cấp quyền đọc bài chạy Strava".'
        );
      } else {
        setSyncBannerMessage(data.message || 'Đã cập nhật danh sách hoạt động từ máy chủ.');
      }
    } catch (err: any) {
      setSyncBannerMessage(`Không thể kết nối máy chủ đồng bộ Strava: ${err.message}`);
    } finally {
      setIsSyncingStrava(false);
    }
  };

  const selectedActivity =
    activities.find((a) => a.id === selectedActivityId) ||
    (user?.role === 'ADMIN' ? activities[0] : undefined);
  const svgMap = polylineToSvgPath(selectedActivity?.polyline || SAMPLE_POLYLINE_HOANKIEM, 520, 260, 24);

  const [raceKitOrders, setRaceKitOrders] = useState([
    {
      id: 'ord_01',
      bibNumber: 'TOP100-0005',
      runnerName: 'Nguyễn Tuấn Minh',
      department: 'Khối Công Nghệ & R&D',
      targetName: 'Mục tiêu 100KM',
      currentKm: 157.0,
      isFinisher: true,
      unlockedAwards: 4,
      shirtSize: 'M',
      engraving: 'NGUYEN TUAN MINH - 150K GOLD',
      status: 'Đã gửi hàng',
      carrier: 'GHN',
      trackingCode: 'GHN-VN-992014',
    },
    {
      id: 'ord_02',
      bibNumber: 'TOP50-0018',
      runnerName: 'Nguyễn Hữu Thuận (Alan Hoàng)',
      department: 'ASSA ABLOY Vietnam',
      targetName: 'Mục tiêu 50KM',
      currentKm: dualGoalProgress.target.currentMultipliedDistanceKm,
      isFinisher: dualGoalProgress.target.isCompleted,
      unlockedAwards: dualGoalProgress.challenges.filter((c) => c.isUnlocked).length,
      shirtSize: myShirtSize,
      engraving: 'NGUYEN HUU THUAN - FINISHER',
      status: 'Đủ điều kiện nhận giải',
      carrier: 'GHTK',
      trackingCode: 'GHTK-TOP2026-8891',
    },
    {
      id: 'ord_03',
      bibNumber: 'TOP50-0042',
      runnerName: 'Trần Ngọc Lan',
      department: 'Khối Vận Hành & Chuỗi Cung Ứng',
      targetName: 'Mục tiêu 50KM',
      currentKm: 43.0,
      isFinisher: false,
      unlockedAwards: 0,
      shirtSize: 'S',
      engraving: 'TRAN NGOC LAN',
      status: 'Đang tích lũy',
      carrier: '-',
      trackingCode: '-',
    },
  ]);

  const fetchRaceKitOrders = useCallback(async (eventId?: string) => {
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
      const token = typeof window !== 'undefined' ? localStorage.getItem('toprun_auth_token') : null;
      const url = eventId
        ? `${apiBase}/admin/race-kit-orders?eventId=${encodeURIComponent(eventId)}`
        : `${apiBase}/admin/race-kit-orders`;
      const res = await fetch(url, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setRaceKitOrders(
            data.map((o: any) => ({
              id: o.participationId,
              bibNumber: o.bibNumber,
              runnerName: o.runnerName,
              department: o.department || 'VĐV Tự do',
              targetName: o.targetCategory,
              currentKm: o.currentMultipliedDistanceKm || 0,
              isFinisher: o.isTargetCompleted,
              unlockedAwards: o.unlockedChallengeCount || 0,
              shirtSize: o.shirtSize || 'L',
              engraving: o.medalEngravingName || o.runnerName,
              status:
                o.fulfillmentStatus === 'DELIVERED'
                  ? 'Đã giao hàng'
                  : o.fulfillmentStatus === 'SHIPPED'
                  ? 'Đang vận chuyển'
                  : o.fulfillmentStatus === 'PACKING'
                  ? 'Đang đóng gói'
                  : o.isTargetCompleted
                  ? 'Đủ điều kiện nhận giải'
                  : 'Đang tích lũy',
              carrier: o.shippingProvider || '-',
              trackingCode: o.trackingCode || '-',
            }))
          );
        }
      }
    } catch (err) {
      console.error('Failed to load race kit orders:', err);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'admin' && adminSubTab === 'fulfillment') {
      fetchRaceKitOrders(selectedEventId);
    }
  }, [activeTab, adminSubTab, selectedEventId, fetchRaceKitOrders]);

  const handleSimulateStravaSync = (mode: 'clean_weekend' | 'motorbike_last_km') => {
    setShowSimulatorDrawer(false);
    if (mode === 'motorbike_last_km') {
      const rawInput = {
        externalId: `strava_${Date.now()}`,
        name: 'Chạy bộ chiều + Quên tắt đồng hồ khi lên xe máy ở Km 6',
        sportType: SportType.RUN,
        startDateIso: new Date().toISOString(),
        distanceMeters: 6000,
        movingTimeSec: 325 * 5 + 95,
        elapsedTimeSec: 1800,
        totalElevationGainMeters: 35,
        averageHeartrate: 155,
        averageCadenceSpm: 170,
        isManual: false,
        splits: [
          { splitIndex: 1, distanceMeters: 1000, movingTimeSec: 326, elevationDiffMeters: 5, averageHeartrate: 148 },
          { splitIndex: 2, distanceMeters: 1000, movingTimeSec: 324, elevationDiffMeters: 6, averageHeartrate: 152 },
          { splitIndex: 3, distanceMeters: 1000, movingTimeSec: 322, elevationDiffMeters: -2, averageHeartrate: 156 },
          { splitIndex: 4, distanceMeters: 1000, movingTimeSec: 328, elevationDiffMeters: 4, averageHeartrate: 158 },
          { splitIndex: 5, distanceMeters: 1000, movingTimeSec: 325, elevationDiffMeters: 3, averageHeartrate: 160 },
          { splitIndex: 6, distanceMeters: 1000, movingTimeSec: 95, elevationDiffMeters: 0, averageHeartrate: 115 },
        ],
      };

      const evalRes = evaluateActivitySplits(rawInput, DEFAULT_EVENT_RULES);
      const newAct = {
        id: `act_${Date.now()}`,
        userId: user?.id || 'usr_runner_01',
        userName: user?.fullName || 'Vận Động Viên',
        department: user?.departmentOrUnit || 'Runner Community',
        source: 'STRAVA SYNC',
        externalId: rawInput.externalId,
        name: rawInput.name,
        startDateIso: rawInput.startDateIso,
        dateStr: 'Vừa xong • Đồng bộ tự động',
        rawDistanceKm: evalRes.rawDistanceKm,
        validDistanceKm: evalRes.validDistanceKm,
        invalidDistanceKm: evalRes.invalidDistanceKm,
        appliedMultiplier: 1.0,
        finalCountedDistanceKm: evalRes.validDistanceKm,
        movingTimeSec: evalRes.validMovingTimeSec,
        avgPaceSecPerKm: evalRes.validAvgPaceSecPerKm,
        elevationGain: 35,
        avgHr: 155,
        avgCadence: 170,
        deviceName: 'Garmin Forerunner 965',
        antiCheatStatus: evalRes.antiCheatStatus,
        flagReasons: evalRes.flagReasons,
        polyline: SAMPLE_POLYLINE_WESTLAKE,
        kudos: 1,
        liked: true,
        isHidden: false,
        splits: evalRes.evaluatedSplits,
      };

      setActivities((prev) => [newAct, ...prev]);
      setSelectedActivityId(newAct.id);
      setSyncBannerMessage(
        `Kiểm duyệt tự động: Phát hiện Km số 6 có tốc độ 01:35/km (< 03:00/km). Đã tự động cắt 1km lỗi và ghi nhận ${evalRes.validDistanceKm} km chạy bộ hợp lệ.`
      );
      setActiveTab('tracklogs');
      return;
    }

    const rawInput = {
      externalId: `strava_${Date.now()}`,
      name: 'Chạy dài sáng Chủ Nhật — Tích lũy cuối tuần 10KM',
      sportType: SportType.RUN,
      startDateIso: new Date().toISOString(),
      distanceMeters: 10000,
      movingTimeSec: 3100,
      elapsedTimeSec: 3180,
      totalElevationGainMeters: 62,
      averageHeartrate: 160,
      averageCadenceSpm: 178,
      isManual: false,
      splits: Array.from({ length: 10 }, (_, i) => ({
        splitIndex: i + 1,
        distanceMeters: 1000,
        movingTimeSec: 308 + (i % 3) * 3,
        elevationDiffMeters: 5,
        averageHeartrate: 154 + i,
      })),
    };

    const evalRes = evaluateActivitySplits(rawInput, DEFAULT_EVENT_RULES);
    const newAct = {
      id: `act_${Date.now()}`,
      userId: 'usr_admin_01',
      userName: 'Nguyễn Hữu Thuận (Alan Hoàng)',
      department: 'ASSA ABLOY Engineering',
      source: 'STRAVA SYNC',
      externalId: rawInput.externalId,
      name: rawInput.name,
      startDateIso: rawInput.startDateIso,
      dateStr: 'Vừa xong • Đồng bộ tự động',
      rawDistanceKm: evalRes.rawDistanceKm,
      validDistanceKm: evalRes.validDistanceKm,
      invalidDistanceKm: 0,
      appliedMultiplier: 1.0,
      finalCountedDistanceKm: evalRes.validDistanceKm,
      movingTimeSec: evalRes.validMovingTimeSec,
      avgPaceSecPerKm: evalRes.validAvgPaceSecPerKm,
      elevationGain: 62,
      avgHr: 160,
      avgCadence: 178,
      deviceName: 'Garmin Forerunner 965',
      antiCheatStatus: evalRes.antiCheatStatus,
      flagReasons: [],
      polyline: SAMPLE_POLYLINE_SALA,
      kudos: 1,
      liked: true,
      isHidden: false,
      splits: evalRes.evaluatedSplits,
    };

    setActivities((prev) => [newAct, ...prev]);
    setSelectedActivityId(newAct.id);
    setSyncBannerMessage(
      `Đồng bộ Strava thành công: đã ghi nhận +${evalRes.validDistanceKm} km hợp lệ vào tiến độ Giải chạy.`
    );
  };

  const handleGpxFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setShowSimulatorDrawer(false);
    try {
      const xmlText = await file.text();
      const parsed = parseGpxToActivityInput(xmlText, file.name);
      const evalRes = evaluateActivitySplits(parsed, DEFAULT_EVENT_RULES);
      const newAct = {
        id: `act_gpx_${Date.now()}`,
        userId: user?.id || 'usr_runner_01',
        userName: user?.fullName || 'Vận Động Viên',
        department: user?.departmentOrUnit || 'Runner Community',
        source: 'GPX FILE',
        externalId: parsed.externalId,
        name: parsed.name,
        startDateIso: parsed.startDateIso,
        dateStr: 'Vừa tải lên từ file GPX',
        rawDistanceKm: evalRes.rawDistanceKm,
        validDistanceKm: evalRes.validDistanceKm,
        invalidDistanceKm: evalRes.invalidDistanceKm,
        appliedMultiplier: 1.0,
        finalCountedDistanceKm: evalRes.validDistanceKm,
        movingTimeSec: evalRes.validMovingTimeSec,
        avgPaceSecPerKm: evalRes.validAvgPaceSecPerKm,
        elevationGain: parsed.totalElevationGainMeters,
        avgHr: parsed.averageHeartrate || 150,
        avgCadence: parsed.averageCadenceSpm || 170,
        deviceName: 'GPX Upload',
        antiCheatStatus: evalRes.antiCheatStatus,
        flagReasons: evalRes.flagReasons,
        polyline: parsed.mapPolyline || SAMPLE_POLYLINE_SALA,
        kudos: 1,
        liked: true,
        isHidden: false,
        splits: evalRes.evaluatedSplits,
      };
      setActivities((prev) => [newAct, ...prev]);
      setSelectedActivityId(newAct.id);
      setSyncBannerMessage(
        `Đã phân tích file GPX "${file.name}": ghi nhận ${evalRes.validDistanceKm} km hợp lệ (${evalRes.evaluatedSplits.length} km splits).`
      );
      setActiveTab('tracklogs');
    } catch (err: any) {
      alert(err.message || 'Không thể đọc file GPX');
    }
  };

  const handleExportRaceKitCsv = () => {
    const headers = 'BIB,HoTen,PhongBan,HangMucTarget,TongKm,Finisher,SizeAo,KhacTenHuyChuong,TrangThai,DonViVanChuyen,MaVanDon\n';
    const rows = raceKitOrders
      .map(
        (o) =>
          `${o.bibNumber},"${o.runnerName}","${o.department}","${o.targetName}",${o.currentKm},${o.isFinisher ? 'DAT_TARGET' : 'CHUA_DAT'},${o.shirtSize},"${o.engraving}",${o.status},${o.carrier},${o.trackingCode}`
      )
      .join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TOPRun_RaceKit_Orders_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  const navItems: { id: NavTab; label: string; subLabel: string; icon: any }[] = [
    { id: 'events', label: 'Tổng quan & Tiến độ', subLabel: 'Mục tiêu & Thử thách', icon: LayoutDashboard },
    { id: 'tracklogs', label: 'Nhật ký & Tracklog', subLabel: 'Bản đồ GPS & Tốc độ từng km', icon: Activity },
    { id: 'trophy', label: 'Chứng nhận & E-BIB', subLabel: 'Tủ huy hiệu cá nhân', icon: Award },
    { id: 'clubs', label: 'Câu lạc bộ & Đội nhóm', subLabel: 'Thi đua liên phòng ban', icon: Users },
    { id: 'account', label: 'Hồ sơ & Kết nối Strava', subLabel: 'Tài khoản & Đồng bộ tự động', icon: UserCheck },
    ...(user?.role === 'ADMIN'
      ? [
          {
            id: 'admin' as NavTab,
            label: 'Quản trị & Kiểm duyệt',
            subLabel: 'Users, Giải chạy & Kiểm duyệt',
            icon: ShieldCheck,
          },
        ]
      : []),
  ];

  const currentNav = navItems.find((n) => n.id === activeTab) || navItems[0];

  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] dark:bg-[#090D16]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#FC4C02] flex items-center justify-center animate-pulse shadow-lg">
            <Activity className="w-6 h-6 text-white" />
          </div>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Đang xác thực phiên đăng nhập Runner...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#F8FAFC] dark:bg-[#090D16] text-slate-900 dark:text-slate-100 transition-colors duration-200">
      {/* =====================================================================
          LEFT SIDEBAR NAVIGATION (DESKTOP FIXED, MOBILE TOP/SCROLLABLE)
         ===================================================================== */}
      <aside className="lg:w-64 lg:shrink-0 lg:h-screen lg:sticky lg:top-0 border-b lg:border-b-0 lg:border-r border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#0C101B] flex flex-col justify-between z-30">
        <div className="p-4 lg:p-5 space-y-6">
          {/* Brand Logo */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#FC4C02] flex items-center justify-center shadow-sm shrink-0">
                <svg viewBox="0 0 32 32" className="w-5 h-5 text-white" fill="none">
                  <path
                    d="M6 22L13 10L18 17L26 8"
                    stroke="currentColor"
                    strokeWidth="3.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <circle cx="26" cy="8" r="2.5" fill="currentColor" />
                </svg>
              </div>
              <div>
                <div className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white leading-none">
                  TOPRun
                </div>
                <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-1">
                  Virtual Race &amp; Strava Sync
                </div>
              </div>
            </div>

            {/* Mobile Theme Toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              className="lg:hidden p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer"
              aria-label="Chuyển đổi giao diện Sáng / Tối"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>

          {/* Primary Navigation */}
          <nav className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible pb-1 lg:pb-0">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`group flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-left transition-all whitespace-nowrap lg:whitespace-normal cursor-pointer ${
                    isActive
                      ? 'bg-[#FC4C02]/10 dark:bg-[#FC4C02]/15 text-[#FC4C02] font-semibold'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white font-medium'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 shrink-0 transition-colors ${
                      isActive ? 'text-[#FC4C02]' : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200'
                    }`}
                  />
                  <div className="min-w-0">
                    <div className="text-xs sm:text-[13px] leading-tight truncate">{item.label}</div>
                    <div className="hidden lg:block text-[11px] text-slate-400 dark:text-slate-500 truncate mt-0.5 font-normal">
                      {item.subLabel}
                    </div>
                  </div>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Sidebar Controls (Theme Switcher, Simulator Trigger, Athlete Profile) */}
        <div className="hidden lg:flex flex-col gap-3 p-4 border-t border-slate-200/80 dark:border-slate-800/80">
          {/* Theme & Simulator Row */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800/60 text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center justify-center gap-2 transition cursor-pointer"
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  <span>Nền sáng</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-slate-600" />
                  <span>Nền tối</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setShowSimulatorDrawer(!showSimulatorDrawer)}
              className={`px-3 py-2 rounded-xl border text-xs font-medium flex items-center justify-center gap-1.5 transition cursor-pointer ${
                showSimulatorDrawer
                  ? 'border-[#FC4C02] bg-[#FC4C02]/10 text-[#FC4C02]'
                  : 'border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
              }`}
            >
              <FlaskConical className="w-3.5 h-3.5" />
              <span>Chế độ Test</span>
            </button>
          </div>

          {/* Athlete Mini Card with Profile & Logout */}
          <div className="space-y-1.5">
            <button
              type="button"
              onClick={() => setActiveTab('account')}
              className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200/70 dark:border-slate-800 hover:border-[#FC4C02]/40 flex items-center gap-3 text-left transition cursor-pointer"
            >
              <img
                src={
                  user.avatarUrl ||
                  `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user.email)}`
                }
                alt={user.fullName}
                className="w-9 h-9 rounded-lg object-cover ring-1 ring-[#FC4C02]"
              />
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                  {user.fullName}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>{myBibNumber}</span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
            </button>

            <button
              type="button"
              onClick={logout}
              className="w-full px-3 py-1.5 rounded-lg border border-transparent hover:border-red-500/30 hover:bg-red-500/10 text-slate-500 hover:text-red-500 text-xs font-medium flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Đăng xuất</span>
            </button>
          </div>
        </div>
      </aside>

      {/* =====================================================================
          RIGHT MAIN WORKSPACE
         ===================================================================== */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Clean Contextual Top Workspace Header */}
        <header className="sticky top-0 z-20 bg-white/85 dark:bg-[#090D16]/85 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 px-4 sm:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <div>
              <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                {currentNav.label}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
                {currentNav.subLabel}
              </p>
            </div>

            {/* BỘ CHỌN GIẢI ĐẤU TRÊN HEADER (MULTI-EVENT SELECTOR) */}
            {eventsList.length > 0 && (
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-orange-50 dark:bg-[#FC4C02]/10 border border-orange-200/80 dark:border-[#FC4C02]/25 shadow-xs">
                <Trophy className="w-3.5 h-3.5 text-[#FC4C02] shrink-0" />
                <span className="text-[11px] font-bold text-[#FC4C02] uppercase tracking-wider shrink-0">
                  Giải đấu:
                </span>
                <select
                  value={selectedEventId}
                  onChange={(e) => setSelectedEventId(e.target.value)}
                  className="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-100 max-w-[200px] lg:max-w-[320px] truncate focus:outline-none cursor-pointer"
                >
                  {eventsList.map((ev) => (
                    <option key={ev.id} value={ev.id} className="bg-white dark:bg-[#0F1420] text-slate-900 dark:text-white">
                      {ev.title}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setShowSimulatorDrawer(!showSimulatorDrawer)}
              className="lg:hidden px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-medium flex items-center gap-1.5 cursor-pointer"
            >
              <FlaskConical className="w-3.5 h-3.5 text-[#FC4C02]" />
              <span>Test dữ liệu</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('account')}
              className="px-3.5 py-2 rounded-xl bg-[#FC4C02]/10 hover:bg-[#FC4C02]/15 text-[#FC4C02] border border-[#FC4C02]/20 text-xs font-semibold flex items-center gap-2 transition cursor-pointer"
            >
              <span className="w-2 h-2 rounded-full bg-[#FC4C02]" />
              <span className="max-w-[130px] sm:max-w-[180px] truncate">{user.fullName}</span>
            </button>

            <button
              type="button"
              onClick={logout}
              title="Đăng xuất tài khoản"
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-red-500 hover:border-red-500/30 hover:bg-red-500/10 transition cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Collapsible Simulator Drawer (Only visible when toggled) */}
        {showSimulatorDrawer && (
          <div className="bg-slate-900 text-white border-b border-slate-800 px-4 sm:px-8 py-3.5">
            <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <FlaskConical className="w-4 h-4 text-[#FC4C02] shrink-0" />
                <span>
                  <strong>Công cụ giả lập dữ liệu (Dev Simulator):</strong> Kiểm thử nhanh luồng nhận Webhook từ Strava và bộ lọc chống gian lận:
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSimulateStravaSync('clean_weekend')}
                  className="px-3 py-1.5 rounded-lg bg-[#FC4C02] hover:bg-[#E34402] text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Giả lập +10KM hợp lệ</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSimulateStravaSync('motorbike_last_km')}
                  className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>Giả lập chạy 5KM + đi xe máy 1KM cuối</span>
                </button>

                <label className="cursor-pointer px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition">
                  <FileUp className="w-3.5 h-3.5 text-sky-400" />
                  <span>Tải file GPX</span>
                  <input type="file" accept=".gpx,.xml" onChange={handleGpxFileUpload} className="hidden" />
                </label>

                <button
                  type="button"
                  onClick={() => setShowSimulatorDrawer(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Notification Toast Banner */}
        {syncBannerMessage && (
          <div className="mx-4 sm:mx-8 mt-4 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200 text-xs sm:text-sm font-medium flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{syncBannerMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setSyncBannerMessage(null)}
              className="text-xs font-semibold underline opacity-75 hover:opacity-100 cursor-pointer shrink-0"
            >
              Đóng
            </button>
          </div>
        )}

        {/* Workspace Content Container */}
        <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-8 py-6 sm:py-8 space-y-8">
          {/* =================================================================
              VIEW 1: TỔNG QUAN GIẢI CHẠY & TIẾN ĐỘ 2 TẦNG
             ================================================================= */}
          {activeTab === 'events' && (
            <div className="space-y-6">
              {/* Clean Event Header Card */}
              <div className="rounded-2xl bg-white dark:bg-[#0F1420] border border-slate-200/80 dark:border-slate-800/80 p-6 sm:p-7 shadow-sm">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                  <div className="space-y-3 max-w-2xl">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        {currentEventData?.status === 'ACTIVE' ? 'Đang diễn ra' : currentEventData?.status === 'UPCOMING' ? 'Sắp diễn ra' : 'Bản nháp'}
                      </span>
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-[#FC4C02]/10 text-[#FC4C02]">
                        <Flame className="w-3.5 h-3.5" />
                        {(currentEventData?.ruleConfig?.weekendMultiplier || 1.0) > 1.0
                          ? `Cuối tuần x${currentEventData.ruleConfig.weekendMultiplier} 🔥`
                          : 'Tính điểm 1:1 theo km thực chạy'}
                      </span>
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Pace: {formatPace(currentEventData?.ruleConfig?.minPaceSecPerKm ?? 180)} – {formatPace(currentEventData?.ruleConfig?.maxPaceSecPerKm ?? 900)}
                      </span>
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        Min: {currentEventData?.ruleConfig?.minActivityDistanceKm ?? 1.0}km/bài
                      </span>
                    </div>

                    <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                      {currentEventData?.title || 'TOPRun Virtual Race 2026'}
                    </h2>
                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                      {currentEventData?.subtitle || currentEventData?.description || 'Giải chạy tích lũy trực tuyến đồng bộ Strava API.'}
                    </p>
                  </div>

                  <div className="flex flex-wrap sm:flex-nowrap lg:flex-col gap-2.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => setShowRegisterModal(true)}
                      className="px-4 py-2.5 rounded-xl bg-[#FC4C02] hover:bg-[#E34402] text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition cursor-pointer"
                    >
                      <Settings className="w-4 h-4" />
                      <span>Đổi cự ly mục tiêu / Size áo</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('trophy')}
                      className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition cursor-pointer"
                    >
                      <Award className="w-4 h-4 text-[#FC4C02]" />
                      <span>Xem E-BIB ({myBibNumber}) &amp; Chứng nhận</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Dual-Goal Progress Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* TIER 1: TARGET FINISHER */}
                <div className="lg:col-span-5 rounded-2xl bg-white dark:bg-[#0F1420] border border-slate-200/80 dark:border-slate-800/80 p-6 flex flex-col justify-between space-y-6 shadow-sm">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-[#FC4C02]/10 text-[#FC4C02] flex items-center justify-center">
                          <Target className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-[11px] font-bold uppercase tracking-wider text-[#FC4C02]">
                            Tầng 1 • Mục tiêu Finisher
                          </div>
                          <h3 className="text-base font-bold text-slate-900 dark:text-white">
                            {dualGoalProgress.target.categoryName}
                          </h3>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {myBibNumber}
                      </span>
                    </div>

                    {/* Metric Box */}
                    <div className="p-5 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200/70 dark:border-slate-800 space-y-3">
                      <div className="flex items-baseline justify-between">
                        <div>
                          <span className="text-3xl sm:text-4xl font-extrabold font-mono text-slate-900 dark:text-white">
                            {dualGoalProgress.target.currentMultipliedDistanceKm}
                          </span>
                          <span className="text-sm text-slate-500 dark:text-slate-400 font-mono ml-1">
                            / {dualGoalProgress.target.targetDistanceKm} km
                          </span>
                        </div>
                        <span className="text-base font-bold font-mono text-emerald-600 dark:text-emerald-400">
                          {dualGoalProgress.target.progressPercentage}%
                        </span>
                      </div>

                      <div className="w-full h-2.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[#FC4C02] transition-all duration-500"
                          style={{ width: `${dualGoalProgress.target.progressPercentage}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-1">
                        <span>Quãng đường gốc: {dualGoalProgress.target.currentRawDistanceKm} km</span>
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                          {dualGoalProgress.target.isCompleted
                            ? 'Đã hoàn thành mục tiêu'
                            : `Còn ${dualGoalProgress.target.remainingDistanceKm} km`}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Finisher Perks Checklist */}
                  <div className="space-y-2.5 pt-4 border-t border-slate-100 dark:border-slate-800/80 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600 dark:text-slate-400 flex items-center gap-2">
                        <CheckCircle2
                          className={`w-4 h-4 ${
                            dualGoalProgress.target.eCertUnlocked ? 'text-emerald-500' : 'text-slate-400'
                          }`}
                        />
                        Chứng nhận điện tử (E-Certificate)
                      </span>
                      <span
                        className={`font-semibold ${
                          dualGoalProgress.target.eCertUnlocked
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-slate-400'
                        }`}
                      >
                        {dualGoalProgress.target.eCertUnlocked ? 'Đã mở khóa' : 'Chưa mở khóa'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-600 dark:text-slate-400 flex items-center gap-2">
                        <Truck
                          className={`w-4 h-4 ${
                            dualGoalProgress.target.raceKitQualified ? 'text-emerald-500' : 'text-slate-400'
                          }`}
                        />
                        Huy chương thật &amp; Áo Finisher (Size {myShirtSize})
                      </span>
                      <span
                        className={`font-semibold ${
                          dualGoalProgress.target.raceKitQualified
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-slate-400'
                        }`}
                      >
                        {dualGoalProgress.target.raceKitQualified ? 'Đủ điều kiện nhận' : 'Đang tích lũy'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* TIER 2: CHALLENGE AWARDS */}
                <div className="lg:col-span-7 rounded-2xl bg-white dark:bg-[#0F1420] border border-slate-200/80 dark:border-slate-800/80 p-6 space-y-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
                        <Trophy className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                          Tầng 2 • Thử thách mở rộng
                        </div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">
                          Huy hiệu thành tích đặc biệt (Challenge Awards)
                        </h3>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-xs text-slate-500 dark:text-slate-400">Đã mở khóa</span>
                      <div className="text-lg font-extrabold font-mono text-slate-900 dark:text-white">
                        {dualGoalProgress.challenges.filter((c) => c.isUnlocked).length} /{' '}
                        {dualGoalProgress.challenges.length}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {dualGoalProgress.challenges.map((chal) => (
                      <div
                        key={chal.tierId}
                        className={`p-4 rounded-xl border transition-all flex flex-col justify-between space-y-3 ${
                          chal.isUnlocked
                            ? 'bg-amber-50/40 dark:bg-amber-950/15 border-amber-300/80 dark:border-amber-700/60'
                            : 'bg-slate-50/70 dark:bg-slate-900/50 border-slate-200/70 dark:border-slate-800'
                        }`}
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <span
                              className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                                chal.isUnlocked
                                  ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                                  : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                              }`}
                            >
                              {chal.isUnlocked ? 'Đã đạt' : chal.tierLevel}
                            </span>
                            <Medal
                              className={`w-4 h-4 ${
                                chal.isUnlocked ? 'text-amber-500' : 'text-slate-400 dark:text-slate-600'
                              }`}
                            />
                          </div>
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                            {chal.tierName}
                          </h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                            {chal.rewardDescription}
                          </p>
                        </div>

                        <div className="space-y-1.5 pt-1">
                          <div className="flex justify-between text-xs font-mono font-medium">
                            <span className="text-slate-600 dark:text-slate-300">
                              {chal.currentValue} / {chal.thresholdValue}{' '}
                              {chal.conditionType === ChallengeConditionType.STREAK_DAYS ? 'ngày' : 'km'}
                            </span>
                            <span
                              className={
                                chal.isUnlocked
                                  ? 'text-amber-600 dark:text-amber-400 font-bold'
                                  : 'text-slate-400'
                              }
                            >
                              {chal.progressPercentage}%
                            </span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                chal.isUnlocked ? 'bg-amber-500' : 'bg-slate-400 dark:bg-slate-600'
                              }`}
                              style={{ width: `${chal.progressPercentage}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* REAL-TIME LEADERBOARD */}
              <div className="rounded-2xl bg-white dark:bg-[#0F1420] border border-slate-200/80 dark:border-slate-800/80 p-6 space-y-5 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800/80 pb-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      Bảng xếp hạng giải đấu
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Cập nhật theo thời gian thực sau khi kiểm duyệt tốc độ từng km
                    </p>
                  </div>

                  <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 self-start sm:self-auto">
                    <button
                      type="button"
                      onClick={() => setLeaderboardMode('individual')}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                        leaderboardMode === 'individual'
                          ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                          : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      Cá nhân
                    </button>
                    <button
                      type="button"
                      onClick={() => setLeaderboardMode('team')}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                        leaderboardMode === 'team'
                          ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                          : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      Đội nhóm / Phòng ban
                    </button>
                  </div>
                </div>

                {leaderboardMode === 'individual' ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200/70 dark:border-slate-800 text-[11px] font-semibold uppercase text-slate-400">
                          <th className="py-3 px-3">Hạng</th>
                          <th className="py-3 px-3">Vận động viên</th>
                          <th className="py-3 px-3">Mã BIB</th>
                          <th className="py-3 px-3">Mục tiêu</th>
                          <th className="py-3 px-3">Thực chạy</th>
                          <th className="py-3 px-3">Tổng km tính giải</th>
                          <th className="py-3 px-3">Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-sm">
                        {(currentEventData?.individualLeaderboard?.length > 0
                          ? currentEventData.individualLeaderboard.map((p: any) => ({
                              name: p.userName,
                              dept: p.department || 'VĐV Tự do',
                              bib: p.bibNumber,
                              targetName: `${p.targetDistanceKm} KM`,
                              rawKm: p.rawDistanceKm,
                              multipliedKm: p.multipliedDistanceKm,
                              isFinisher: p.isTargetCompleted,
                              isMe: user?.id ? p.userId === user.id : false,
                            }))
                          : [
                              {
                                name: 'Nguyễn Tuấn Minh',
                                dept: 'Khối Công Nghệ & R&D',
                                bib: 'TOP100-0005',
                                targetName: '100 KM',
                                rawKm: 93.5,
                                multipliedKm: 93.5,
                                isFinisher: false,
                              },
                              {
                                name: 'Nguyễn Hữu Thuận (Alan Hoàng)',
                                dept: 'ASSA ABLOY Engineering',
                                bib: myBibNumber,
                                targetName: `${myTargetKm} KM`,
                                rawKm: dualGoalProgress.target.currentRawDistanceKm,
                                multipliedKm: dualGoalProgress.target.currentMultipliedDistanceKm,
                                isFinisher: dualGoalProgress.target.isCompleted,
                                isMe: true,
                              },
                            ]
                        )
                          .sort((a: any, b: any) => b.multipliedKm - a.multipliedKm)
                          .map((row: any, index: number) => (
                            <tr
                              key={row.bib}
                              className={`transition ${
                                (row as any).isMe
                                  ? 'bg-[#FC4C02]/5 dark:bg-[#FC4C02]/10'
                                  : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                              }`}
                            >
                              <td className="py-3.5 px-3 font-mono font-bold text-sm">
                                <span
                                  className={`inline-flex items-center justify-center w-6 h-6 rounded-md text-xs ${
                                    index === 0
                                      ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 font-extrabold'
                                      : index === 1
                                      ? 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-extrabold'
                                      : index === 2
                                      ? 'bg-orange-500/15 text-orange-600 dark:text-orange-400 font-extrabold'
                                      : 'text-slate-400'
                                  }`}
                                >
                                  {index + 1}
                                </span>
                              </td>
                              <td className="py-3.5 px-3">
                                <div className="font-semibold text-slate-900 dark:text-white">
                                  {row.name}
                                </div>
                                <div className="text-xs text-slate-500 dark:text-slate-400">{row.dept}</div>
                              </td>
                              <td className="py-3.5 px-3 font-mono text-xs text-slate-600 dark:text-slate-300 font-semibold">
                                {row.bib}
                              </td>
                              <td className="py-3.5 px-3 font-mono text-xs text-slate-600 dark:text-slate-300">
                                {row.targetName}
                              </td>
                              <td className="py-3.5 px-3 font-mono text-xs text-slate-600 dark:text-slate-300">
                                {row.rawKm} km
                              </td>
                              <td className="py-3.5 px-3 font-mono font-bold text-slate-900 dark:text-white">
                                {row.multipliedKm} km
                              </td>
                              <td className="py-3.5 px-3">
                                {row.isFinisher ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                                    <CheckCircle2 className="w-3 h-3" />
                                    Finisher
                                  </span>
                                ) : (
                                  <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                                    Đang chạy
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                      {
                        rank: 1,
                        name: 'Khối Công Nghệ & R&D (Engineering)',
                        members: 18,
                        totalKm: 418.6,
                      },
                      {
                        rank: 2,
                        name: 'Khối Vận Hành & Chuỗi Cung Ứng (Operations)',
                        members: 22,
                        totalKm: 375.2,
                      },
                      {
                        rank: 3,
                        name: 'Khối Kinh Doanh & Thương Mại (Commercial)',
                        members: 16,
                        totalKm: 290.8,
                      },
                    ].map((team) => (
                      <div
                        key={team.name}
                        className="p-5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold uppercase text-[#FC4C02]">
                            Hạng #{team.rank}
                          </span>
                          <span className="text-xs text-slate-500">{team.members} thành viên</span>
                        </div>
                        <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                          {team.name}
                        </h4>
                        <div className="flex items-baseline justify-between pt-2 border-t border-slate-200/70 dark:border-slate-800">
                          <span className="text-2xl font-extrabold font-mono text-slate-900 dark:text-white">
                            {team.totalKm} km
                          </span>
                          <span className="text-xs text-slate-500 font-mono">
                            TB: {roundKm(team.totalKm / team.members)} km/người
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* =================================================================
              VIEW 2: NHẬT KÝ HOẠT ĐỘNG, BẢN ĐỒ TƯƠNG TÁC & BỘ 4 BIỂU ĐỒ CHI TIẾT
             ================================================================= */}
          {activeTab === 'tracklogs' && (
            <UserTracklogExplorer
              activities={activities}
              selectedActivityId={selectedActivity?.id || ''}
              currentUserId={user?.id}
              currentUserRole={user?.role}
              onSelectActivity={(id) => setSelectedActivityId(id)}
              onOpenShareModal={() => setShowShareModal(true)}
              onGpxUpload={handleGpxFileUpload}
              onSyncStravaLive={handleLiveStravaSyncFromTracklog}
              onToggleHideActivity={handleToggleHideActivity}
              onDeleteActivity={handleDeleteActivity}
              isSyncingStrava={isSyncingStrava}
              theme={theme}
            />
          )}

          {/* =================================================================
              VIEW 3: TỦ HUY CHƯƠNG, E-BIB & E-CERTIFICATE
             ================================================================= */}
          {activeTab === 'trophy' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* E-BIB Card */}
              <div className="lg:col-span-5 rounded-2xl bg-white dark:bg-[#0F1420] border border-slate-200/80 dark:border-slate-800/80 p-6 space-y-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    Số báo danh điện tử (E-BIB)
                  </h2>
                  <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                    Đã kích hoạt
                  </span>
                </div>

                <div className="rounded-2xl overflow-hidden border border-slate-800 bg-[#0C101B] p-6 text-center space-y-4 shadow-md">
                  <div className="bg-[#FC4C02] py-2 px-4 rounded-xl">
                    <div className="text-[11px] font-extrabold tracking-widest text-white uppercase">
                      TOPRUN AUTUMN VIRTUAL RACE 2026
                    </div>
                    <div className="text-[10px] font-semibold text-white/90">
                      HẠNG MỤC FINISHER {myTargetKm}KM
                    </div>
                  </div>
                  <div className="py-5">
                    <div className="text-4xl sm:text-5xl font-extrabold tracking-wider text-white font-mono">
                      {myBibNumber}
                    </div>
                  </div>
                  <div className="border-t border-dashed border-slate-700 pt-3">
                    <div className="text-base font-bold text-white tracking-wide">
                      {user?.fullName?.toUpperCase() || 'VẬN ĐỘNG VIÊN'}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {user?.departmentOrUnit?.toUpperCase() || 'TOPRUN ATHLETE'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Finisher E-Certificate */}
              <div className="lg:col-span-7 rounded-2xl bg-white dark:bg-[#0F1420] border border-slate-200/80 dark:border-slate-800/80 p-6 space-y-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    Giấy chứng nhận hoàn thành (Finisher E-Certificate)
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                    Đạt mục tiêu {myTargetKm}KM
                  </span>
                </div>

                <div className="rounded-2xl border border-amber-500/40 bg-[#0C101B] p-6 sm:p-8 text-center space-y-5 shadow-md">
                  <div className="text-[11px] font-bold tracking-[0.2em] text-amber-400 uppercase">
                    OFFICIAL FINISHER CERTIFICATE
                  </div>
                  <h3 className="text-lg sm:text-xl font-extrabold text-white">
                    {currentEventData?.title?.toUpperCase() || 'TOPRUN VIRTUAL RACE 2026'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Chứng nhận vận động viên mang số BIB <strong className="text-white font-mono">{myBibNumber}</strong>
                  </p>
                  <div className="text-2xl sm:text-3xl font-extrabold text-amber-400">
                    {user?.fullName?.toUpperCase() || 'VẬN ĐỘNG VIÊN'}
                  </div>

                  <div className="grid grid-cols-3 gap-3 p-4 rounded-xl bg-slate-900/90 border border-slate-800">
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase">Cự ly đăng ký</div>
                      <div className="text-sm font-bold text-white font-mono mt-1">{myTargetKm} KM</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase">Quãng đường tích lũy</div>
                      <div className="text-base font-extrabold text-emerald-400 font-mono mt-0.5">
                        {dualGoalProgress.target.currentMultipliedDistanceKm} KM
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase">Huy hiệu mở rộng</div>
                      <div className="text-sm font-bold text-amber-400 font-mono mt-1">
                        {dualGoalProgress.challenges.filter((c) => c.isUnlocked).length} Huy hiệu
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* =================================================================
              VIEW 4: CÂU LẠC BỘ & ĐỘI NHÓM
             ================================================================= */}
          {activeTab === 'clubs' && (
            <div className="rounded-2xl bg-white dark:bg-[#0F1420] border border-slate-200/80 dark:border-slate-800/80 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-6 shadow-sm">
              <div className="space-y-1.5">
                <span className="text-xs font-bold uppercase text-[#FC4C02]">Câu lạc bộ nội bộ</span>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  ASSA ABLOY Vietnam Runners Club
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Kết nối các phòng ban cùng rèn luyện sức khỏe • Mã tham gia:{' '}
                  <strong className="text-slate-900 dark:text-white font-mono">TOPRUN2026</strong>
                </p>
              </div>
              <div className="flex gap-4 text-center shrink-0">
                <div className="px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800">
                  <div className="text-xs text-slate-500">Thành viên</div>
                  <div className="text-lg font-extrabold font-mono text-slate-900 dark:text-white mt-0.5">
                    48
                  </div>
                </div>
                <div className="px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800">
                  <div className="text-xs text-slate-500">Tổng km tích lũy</div>
                  <div className="text-lg font-extrabold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
                    1,284.6 km
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* =================================================================
              VIEW 5: QUẢN LÝ TÀI KHOẢN & ĐỒNG BỘ STRAVA (3 SUB-TABS SẠCH SẼ)
             ================================================================= */}
          {activeTab === 'account' && (
            <AccountAndStravaPanel
              initialUserId={user.id}
              onActivitiesSynced={(msg) => {
                setSyncBannerMessage(msg);
                fetchActivitiesFromBackend(true);
              }}
            />
          )}

          {/* =================================================================
              VIEW 6: QUẢN TRỊ VIÊN — PHÂN QUYỀN, GIẢI CHẠY, KIỂM DUYỆT & RACE-KIT
             ================================================================= */}
          {activeTab === 'admin' && (
            <div className="space-y-6">
              {/* Admin Navigation Pills */}
              <div className="rounded-2xl bg-white dark:bg-[#0F1420] border border-slate-200/80 dark:border-slate-800/80 p-3 shadow-sm flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  {[
                    { id: 'users' as const, label: 'Quản lý VĐV & Phân quyền', icon: Users, count: adminUsers.length },
                    { id: 'races' as const, label: 'Quản lý Giải & Thử thách', icon: Trophy },
                    {
                      id: 'moderation' as const,
                      label: 'Kiểm duyệt GPS & Gian lận',
                      icon: ShieldAlert,
                      count: activities.filter((a) => a.antiCheatStatus !== AntiCheatStatus.VALID).length,
                    },
                    { id: 'fulfillment' as const, label: 'Giao hàng Race-Kit', icon: Truck, count: raceKitOrders.length },
                  ].map((tab) => {
                    const Icon = tab.icon;
                    const isActive = adminSubTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setAdminSubTab(tab.id)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition cursor-pointer ${
                          isActive
                            ? 'bg-[#FC4C02] text-white shadow-sm'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span>{tab.label}</span>
                        {tab.count !== undefined && (
                          <span
                            className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                              isActive
                                ? 'bg-white/20 text-white'
                                : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            {tab.count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Quản trị viên tối cao (SuperAdmin)
                  </span>
                </div>
              </div>

              {/* Action Banner Message */}
              {adminUserActionMsg && (
                <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-medium flex items-center gap-2 animate-fadeIn">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>{adminUserActionMsg}</span>
                </div>
              )}

              {/* SUB-VIEW 1: QUẢN LÝ VẬN ĐỘNG VIÊN & PHÂN QUYỀN */}
              {adminSubTab === 'users' && (
                <div className="space-y-6">
                  {/* KPI Stats Bar */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="p-4 rounded-2xl bg-white dark:bg-[#0F1420] border border-slate-200/80 dark:border-slate-800/80 shadow-sm">
                      <div className="text-xs text-slate-500 dark:text-slate-400">Tổng Vận Động Viên</div>
                      <div className="text-2xl font-extrabold font-mono text-slate-900 dark:text-white mt-1">
                        {adminUsers.length}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1">Lưu trữ PostgreSQL</div>
                    </div>

                    <div className="p-4 rounded-2xl bg-white dark:bg-[#0F1420] border border-slate-200/80 dark:border-slate-800/80 shadow-sm">
                      <div className="text-xs text-slate-500 dark:text-slate-400">Quản trị viên (ADMIN)</div>
                      <div className="text-2xl font-extrabold font-mono text-amber-500 mt-1">
                        {adminUsers.filter((u) => u.role === 'ADMIN').length}
                      </div>
                      <div className="text-[11px] text-amber-500/80 mt-1">Toàn quyền hệ thống</div>
                    </div>

                    <div className="p-4 rounded-2xl bg-white dark:bg-[#0F1420] border border-slate-200/80 dark:border-slate-800/80 shadow-sm">
                      <div className="text-xs text-slate-500 dark:text-slate-400">Ban tổ chức (ORGANIZER)</div>
                      <div className="text-2xl font-extrabold font-mono text-blue-500 mt-1">
                        {adminUsers.filter((u) => u.role === 'ORGANIZER').length}
                      </div>
                      <div className="text-[11px] text-blue-500/80 mt-1">Quản lý giải &amp; Kiểm duyệt</div>
                    </div>

                    <div className="p-4 rounded-2xl bg-white dark:bg-[#0F1420] border border-slate-200/80 dark:border-slate-800/80 shadow-sm">
                      <div className="text-xs text-slate-500 dark:text-slate-400">VĐV Thi đấu (RUNNER)</div>
                      <div className="text-2xl font-extrabold font-mono text-emerald-500 mt-1">
                        {adminUsers.filter((u) => u.role === 'RUNNER' || !u.role).length}
                      </div>
                      <div className="text-[11px] text-emerald-500/80 mt-1">Tham gia thi đấu &amp; Đua top</div>
                    </div>
                  </div>

                  {/* Users Table Card */}
                  <div className="rounded-2xl bg-white dark:bg-[#0F1420] border border-slate-200/80 dark:border-slate-800/80 p-6 space-y-5 shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <Users className="w-4 h-4 text-[#FC4C02]" />
                          <span>Danh sách tài khoản &amp; Phân quyền người dùng</span>
                        </h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          Quản lý phân quyền vai trò (Admin / Organizer / Runner) và xem thông tin cá nhân
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="relative">
                          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            value={adminUserSearch}
                            onChange={(e) => setAdminUserSearch(e.target.value)}
                            placeholder="Tìm tên, email, SĐT, đơn vị..."
                            className="pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#FC4C02] w-64"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={fetchAdminUsers}
                          disabled={isAdminUsersLoading}
                          className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer"
                          title="Làm mới danh sách"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${isAdminUsersLoading ? 'animate-spin text-[#FC4C02]' : ''}`} />
                        </button>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-200/70 dark:border-slate-800 text-[11px] font-semibold uppercase text-slate-400">
                            <th className="py-3 px-3">Vận động viên</th>
                            <th className="py-3 px-3">Email &amp; SĐT</th>
                            <th className="py-3 px-3">Phòng ban</th>
                            <th className="py-3 px-3">Size áo / Địa chỉ</th>
                            <th className="py-3 px-3">Vai trò hệ thống</th>
                            <th className="py-3 px-3">Ngày tạo</th>
                            <th className="py-3 px-3 text-right">Thao tác</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-sm">
                          {adminUsers
                            .filter((u) => {
                              if (!adminUserSearch.trim()) return true;
                              const q = adminUserSearch.toLowerCase();
                              return (
                                (u.fullName || '').toLowerCase().includes(q) ||
                                (u.email || '').toLowerCase().includes(q) ||
                                (u.phone || '').toLowerCase().includes(q) ||
                                (u.departmentOrUnit || '').toLowerCase().includes(q)
                              );
                            })
                            .map((u) => {
                              const isCurrentAdmin = u.id === user.id;
                              return (
                                <tr key={u.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-900/40 transition">
                                  <td className="py-3 px-3">
                                    <div className="flex items-center gap-2.5">
                                      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#FC4C02] to-amber-500 text-white font-bold text-xs flex items-center justify-center shrink-0">
                                        {(u.fullName || 'U').charAt(0).toUpperCase()}
                                      </div>
                                      <div>
                                        <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                                          <span>{u.fullName || 'Chưa cập nhật tên'}</span>
                                          {isCurrentAdmin && (
                                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300">
                                              Bạn
                                            </span>
                                          )}
                                        </div>
                                        <div className="text-[11px] font-mono text-slate-400">ID: {u.id}</div>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="py-3 px-3">
                                    <div className="font-mono text-xs text-slate-800 dark:text-slate-200">{u.email}</div>
                                    <div className="text-xs text-slate-500">{u.phone || '—'}</div>
                                  </td>
                                  <td className="py-3 px-3 text-xs text-slate-600 dark:text-slate-300">
                                    {u.departmentOrUnit || 'ASSA ABLOY Vietnam'}
                                  </td>
                                  <td className="py-3 px-3">
                                    <span className="px-2 py-0.5 rounded font-mono text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                      {u.defaultShirtSize || 'L'}
                                    </span>
                                    <div className="text-[11px] text-slate-400 truncate max-w-[140px] mt-0.5">
                                      {u.defaultShippingAddress || 'Chưa có địa chỉ'}
                                    </div>
                                  </td>
                                  <td className="py-3 px-3">
                                    <select
                                      value={u.role || 'RUNNER'}
                                      onChange={(e) => handleUpdateUserRole(u.id, e.target.value)}
                                      className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition cursor-pointer ${
                                        u.role === 'ADMIN'
                                          ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300'
                                          : u.role === 'ORGANIZER'
                                          ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-300 dark:border-blue-800 text-blue-700 dark:text-blue-300'
                                          : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                                      }`}
                                    >
                                      <option value="ADMIN">ADMIN (Quản trị viên)</option>
                                      <option value="ORGANIZER">ORGANIZER (Ban tổ chức)</option>
                                      <option value="RUNNER">RUNNER (Vận động viên)</option>
                                    </select>
                                  </td>
                                  <td className="py-3 px-3 text-xs font-mono text-slate-500">
                                    {u.createdAt ? new Date(u.createdAt).toLocaleDateString('vi-VN') : '—'}
                                  </td>
                                  <td className="py-3 px-3 text-right">
                                    <button
                                      type="button"
                                      disabled={isCurrentAdmin}
                                      onClick={() => handleDeleteUser(u.id, u.fullName || u.email)}
                                      title={isCurrentAdmin ? 'Không thể tự xoá tài khoản đang đăng nhập' : 'Xoá người dùng'}
                                      className={`p-1.5 rounded-lg border transition ${
                                        isCurrentAdmin
                                          ? 'border-slate-200 dark:border-slate-800 text-slate-300 dark:text-slate-600 cursor-not-allowed opacity-50'
                                          : 'border-rose-200 dark:border-rose-900/60 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-500 cursor-pointer'
                                      }`}
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* SUB-VIEW 2: QUẢN LÝ GIẢI CHẠY & THỬ THÁCH */}
              {adminSubTab === 'races' && (
                <div className="space-y-6">
                  {adminEventSaveMsg && (
                    <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-medium flex items-center gap-2 animate-fadeIn">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>{adminEventSaveMsg}</span>
                    </div>
                  )}

                  <div className="rounded-2xl bg-white dark:bg-[#0F1420] border border-slate-200/80 dark:border-slate-800/80 p-6 space-y-6 shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <Trophy className="w-4 h-4 text-[#FC4C02]" />
                          <span>Cấu hình Quy chế Giải Chạy &amp; Thử thách ảo (Virtual Race)</span>
                        </h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          Tùy chỉnh pace hợp lệ, cự ly tối thiểu, thời gian thi đấu và các mốc Challenge nhận huy hiệu
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2.5">
                        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
                          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">Giải:</span>
                          <select
                            value={selectedEventId}
                            onChange={(e) => setSelectedEventId(e.target.value)}
                            className="bg-transparent text-xs font-bold text-slate-900 dark:text-white focus:outline-none cursor-pointer"
                          >
                            {eventsList.map((ev) => (
                              <option key={ev.id} value={ev.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                                {ev.title}
                              </option>
                            ))}
                          </select>
                        </div>

                        <button
                          type="button"
                          onClick={() => setShowCreateEventModal(true)}
                          className="px-3.5 py-1.5 rounded-xl bg-[#FC4C02] hover:bg-[#E34402] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                        >
                          <span>+ Tạo Giải Mới</span>
                        </button>

                        <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-[#FC4C02]/10 text-[#FC4C02] border border-[#FC4C02]/20">
                          {selectedEventId}
                        </span>
                      </div>
                    </div>

                    <form onSubmit={handleSaveEventRules} className="space-y-6">
                      {/* Section 1: Thông tin cơ bản */}
                      <div className="space-y-3">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                          1. Thông tin giải &amp; Trạng thái
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="md:col-span-2 space-y-1">
                            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                              Tên Giải Chạy
                            </label>
                            <input
                              type="text"
                              value={eventForm.title}
                              onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                              required
                              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#FC4C02]"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                              Trạng Thái
                            </label>
                            <select
                              value={eventForm.status}
                              onChange={(e) => setEventForm({ ...eventForm, status: e.target.value })}
                              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#FC4C02] font-semibold"
                            >
                              <option value="ACTIVE">ACTIVE (Đang diễn ra)</option>
                              <option value="UPCOMING">UPCOMING (Sắp diễn ra)</option>
                              <option value="DRAFT">DRAFT (Bản nháp)</option>
                              <option value="CLOSED">CLOSED (Đã kết thúc)</option>
                            </select>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                            Phụ đề &amp; Thông điệp giải
                          </label>
                          <input
                            type="text"
                            value={eventForm.subtitle}
                            onChange={(e) => setEventForm({ ...eventForm, subtitle: e.target.value })}
                            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#FC4C02]"
                          />
                        </div>
                      </div>

                      {/* Section 2: Thời gian & Quy tắc tính km */}
                      <div className="space-y-3">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                          2. Thời gian thi đấu &amp; Ngưỡng Pace hợp lệ
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                              Ngày Bắt Đầu
                            </label>
                            <input
                              type="date"
                              value={eventForm.startDateIso}
                              onChange={(e) => setEventForm({ ...eventForm, startDateIso: e.target.value })}
                              required
                              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#FC4C02]"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                              Ngày Kết Thúc
                            </label>
                            <input
                              type="date"
                              value={eventForm.endDateIso}
                              onChange={(e) => setEventForm({ ...eventForm, endDateIso: e.target.value })}
                              required
                              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#FC4C02]"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                              Pace Tối Thiểu (Min Pace)
                            </label>
                            <input
                              type="text"
                              value={eventForm.minPaceFormatted}
                              onChange={(e) => setEventForm({ ...eventForm, minPaceFormatted: e.target.value })}
                              placeholder="03:00"
                              className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#FC4C02]"
                            />
                            <span className="text-[10px] text-slate-400">Nhanh hơn ngưỡng này bị cắt đoạn</span>
                          </div>

                          <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                              Pace Tối Đa (Max Pace)
                            </label>
                            <input
                              type="text"
                              value={eventForm.maxPaceFormatted}
                              onChange={(e) => setEventForm({ ...eventForm, maxPaceFormatted: e.target.value })}
                              placeholder="15:00"
                              className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#FC4C02]"
                            />
                            <span className="text-[10px] text-slate-400">Chậm hơn ngưỡng này bị loại</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                          <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                              Cự ly tối thiểu mỗi buổi chạy (KM)
                            </label>
                            <input
                              type="number"
                              step="0.1"
                              min="0.5"
                              value={eventForm.minActivityDistanceKm}
                              onChange={(e) => setEventForm({ ...eventForm, minActivityDistanceKm: parseFloat(e.target.value) || 1.0 })}
                              className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#FC4C02]"
                            />
                            <span className="text-[10px] text-slate-400">Dưới cự ly này không được ghi nhận vào giải</span>
                          </div>

                          <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                              Hệ số nhân cuối tuần (Thứ 7 &amp; Chủ Nhật)
                            </label>
                            <input
                              type="number"
                              step="0.1"
                              min="1.0"
                              max="2.0"
                              value={eventForm.weekendMultiplier}
                              onChange={(e) => setEventForm({ ...eventForm, weekendMultiplier: parseFloat(e.target.value) || 1.0 })}
                              className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#FC4C02]"
                            />
                            <span className="text-[10px] text-slate-400">Mặc định 1.0x (đã tắt x2 theo yêu cầu)</span>
                          </div>
                        </div>
                      </div>

                      {/* Section 3: Danh sách các Mốc Challenge */}
                      <div className="space-y-3">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                          <span>3. Các Mốc Thử Thách Mở Rộng (Challenge Tiers)</span>
                          <span className="text-[11px] font-normal text-slate-500">
                            {adminEventData?.challengeTiers?.length || INITIAL_CHALLENGE_TIERS.length} mốc thử thách đang kích hoạt
                          </span>
                        </h3>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {(adminEventData?.challengeTiers || INITIAL_CHALLENGE_TIERS).map((tier: any) => (
                            <div
                              key={tier.id}
                              className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex items-start gap-3"
                            >
                              <div className="w-8 h-8 rounded-lg bg-[#FC4C02]/15 text-[#FC4C02] font-bold text-xs flex items-center justify-center shrink-0">
                                <Award className="w-4 h-4" />
                              </div>
                              <div className="space-y-0.5 min-w-0">
                                <div className="font-bold text-xs text-slate-900 dark:text-white truncate">
                                  {tier.tierName}
                                </div>
                                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                  {tier.rewardDescription}
                                </div>
                                <div className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold pt-0.5">
                                  Điều kiện: {tier.conditionType} ({tier.thresholdValue}
                                  {tier.conditionType === 'STREAK_DAYS' ? ' ngày' : ' km'})
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="pt-2 flex justify-end">
                        <button
                          type="submit"
                          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#FC4C02] to-amber-500 hover:from-[#E34402] hover:to-amber-600 text-white text-xs font-bold flex items-center gap-2 shadow-sm transition cursor-pointer"
                        >
                          <Save className="w-4 h-4" />
                          <span>Lưu &amp; Cập nhật Quy Chế Giải Chạy</span>
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* SUB-VIEW 3: HÀNG ĐỢI KIỂM DUYỆT TỐC ĐỘ & GIAN LẬN GPS */}
              {adminSubTab === 'moderation' && (
                <div className="rounded-2xl bg-white dark:bg-[#0F1420] border border-slate-200/80 dark:border-slate-800/80 p-6 space-y-4 shadow-sm">
                  <div>
                    <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 text-amber-500" />
                      <span>Danh sách hoạt động có cắt đoạn tốc độ bất thường</span>
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Các buổi chạy có km vượt ngưỡng 03:00/km đã được hệ thống tự động tách phần lỗi
                    </p>
                  </div>

                  <div className="space-y-3">
                    {activities
                      .filter((a) => a.antiCheatStatus !== AntiCheatStatus.VALID)
                      .map((flaggedAct) => (
                        <div
                          key={flaggedAct.id}
                          className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300">
                                Đã cắt km lỗi
                              </span>
                              <span className="font-bold text-slate-900 dark:text-white text-sm">
                                {flaggedAct.userName}
                              </span>
                              <span className="text-xs text-slate-400">• {flaggedAct.name}</span>
                            </div>
                            <p className="text-xs text-slate-600 dark:text-slate-300">
                              {flaggedAct.flagReasons[0]}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedActivityId(flaggedAct.id);
                                setActiveTab('tracklogs');
                              }}
                              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer"
                            >
                              Xem chi tiết
                            </button>
                          </div>
                        </div>
                      ))}
                    {activities.filter((a) => a.antiCheatStatus !== AntiCheatStatus.VALID).length === 0 && (
                      <div className="text-center py-8 text-xs text-slate-400">
                        Không có hoạt động nào bị gắn cờ bất thường trong hệ thống.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* SUB-VIEW 4: QUẢN LÝ GIAO HÀNG RACE-KIT */}
              {adminSubTab === 'fulfillment' && (
                <div className="rounded-2xl bg-white dark:bg-[#0F1420] border border-slate-200/80 dark:border-slate-800/80 p-6 space-y-5 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Truck className="w-4 h-4 text-[#FC4C02]" />
                        <span>Danh sách cấp phát Áo &amp; Huy chương Finisher</span>
                      </h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Xuất danh sách vận động viên hoàn thành mục tiêu để gửi đơn vị vận chuyển
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleExportRaceKitCsv}
                      className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold flex items-center gap-2 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Xuất file CSV giao hàng</span>
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200/70 dark:border-slate-800 text-[11px] font-semibold uppercase text-slate-400">
                          <th className="py-3 px-3">Mã BIB</th>
                          <th className="py-3 px-3">Vận động viên</th>
                          <th className="py-3 px-3">Mục tiêu</th>
                          <th className="py-3 px-3">Size áo</th>
                          <th className="py-3 px-3">Khắc tên huy chương</th>
                          <th className="py-3 px-3">Trạng thái</th>
                          <th className="py-3 px-3">Mã vận đơn</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-sm">
                        {raceKitOrders.map((ord) => (
                          <tr key={ord.id}>
                            <td className="py-3 px-3 font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">
                              {ord.bibNumber}
                            </td>
                            <td className="py-3 px-3">
                              <div className="font-semibold text-slate-900 dark:text-white">
                                {ord.runnerName}
                              </div>
                              <div className="text-xs text-slate-500">{ord.department}</div>
                            </td>
                            <td className="py-3 px-3 text-xs font-mono">
                              <div>{ord.targetName}</div>
                              <div className="text-emerald-600 dark:text-emerald-400 font-bold">
                                {ord.currentKm} km
                              </div>
                            </td>
                            <td className="py-3 px-3 font-mono font-bold">{ord.shirtSize}</td>
                            <td className="py-3 px-3 font-mono text-xs text-slate-600 dark:text-slate-300">
                              {ord.engraving}
                            </td>
                            <td className="py-3 px-3 text-xs font-semibold">{ord.status}</td>
                            <td className="py-3 px-3 font-mono text-xs text-slate-500">
                              {ord.carrier !== '-' ? `${ord.carrier}: ${ord.trackingCode}` : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* =====================================================================
          MODAL 1: SHARE CARD
         ===================================================================== */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-lg w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F1420] p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Share2 className="w-4 h-4 text-[#FC4C02]" />
                <span>Thẻ chia sẻ thành tích chạy bộ</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowShareModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="rounded-2xl overflow-hidden border border-slate-800 bg-[#090D16] p-6 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold tracking-widest uppercase text-[#FC4C02]">
                    TOPRUN VIRTUAL RACE 2026
                  </span>
                  <h4 className="text-base font-bold text-white mt-0.5">{selectedActivity?.name || 'Chưa chọn hoạt động'}</h4>
                </div>
                <span className="px-2.5 py-1 rounded-md bg-white/10 text-xs font-mono font-bold text-white">
                  {myBibNumber}
                </span>
              </div>

              <div className="h-44 flex items-center justify-center bg-slate-950 rounded-xl border border-slate-800 p-3">
                <svg viewBox="0 0 520 260" className="w-full h-full">
                  {svgMap.pathData && (
                    <path
                      d={svgMap.pathData}
                      fill="none"
                      stroke="#FC4C02"
                      strokeWidth="5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  )}
                </svg>
              </div>

              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase">Quãng đường</div>
                  <div className="text-xl font-extrabold font-mono text-white mt-0.5">
                    {selectedActivity?.validDistanceKm ?? 0} km
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase">Pace TB</div>
                  <div className="text-xl font-extrabold font-mono text-white mt-0.5">
                    {formatPace(selectedActivity?.avgPaceSecPerKm ?? 360, false)}
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase">Điểm giải</div>
                  <div className="text-xl font-extrabold font-mono text-emerald-400 mt-0.5">
                    +{selectedActivity?.finalCountedDistanceKm ?? 0} km
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setShowShareModal(false)}
                className="px-4 py-2 rounded-xl bg-[#FC4C02] text-white text-xs font-semibold cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 2: ĐỔI HẠNG MỤC MỤC TIÊU & SIZE ÁO
         ===================================================================== */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F1420] p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Đổi cự ly mục tiêu &amp; Size áo Finisher
              </h3>
              <button
                type="button"
                onClick={() => setShowRegisterModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                  Chọn cự ly mục tiêu (Target Finisher):
                </label>
                <select
                  value={myTargetKm}
                  onChange={(e) => {
                    const km = Number(e.target.value);
                    setMyTargetKm(km);
                    setMyBibNumber(`TOP${km}-0018`);
                  }}
                  className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 text-slate-900 dark:text-white font-semibold"
                >
                  <option value={30}>Cự ly 30KM (Starter)</option>
                  <option value={50}>Cự ly 50KM (Finisher)</option>
                  <option value={100}>Cự ly 100KM (Pro Runner)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                  Chọn Size áo Finisher:
                </label>
                <select
                  value={myShirtSize}
                  onChange={(e) => setMyShirtSize(e.target.value)}
                  className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 text-slate-900 dark:text-white font-semibold"
                >
                  {['XS', 'S', 'M', 'L', 'XL', 'XXL'].map((s) => (
                    <option key={s} value={s}>
                      Size {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowRegisterModal(false)}
                className="px-4 py-2 rounded-xl bg-[#FC4C02] text-white text-xs font-semibold cursor-pointer"
              >
                Lưu thay đổi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 3: TẠO GIẢI ĐẤU MỚI (CREATE EVENT MODAL)
         ===================================================================== */}
      {showCreateEventModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="max-w-xl w-full my-8 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F1420] p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-[#FC4C02]" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Khởi Tạo Giải Chạy Ảo / Thử Thách Mới
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateEventModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateNewEvent} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Tên giải đấu *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: TOPRUN SPRING HALF MARATHON 2026"
                  value={newEventForm.title}
                  onChange={(e) => setNewEventForm({ ...newEventForm, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#FC4C02]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Thông điệp / Phụ đề
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Giải chạy đón xuân • Chạy bộ vì sức khỏe doanh nghiệp"
                  value={newEventForm.subtitle}
                  onChange={(e) => setNewEventForm({ ...newEventForm, subtitle: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#FC4C02]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Ngày bắt đầu *
                  </label>
                  <input
                    type="date"
                    required
                    value={newEventForm.startDateIso}
                    onChange={(e) => setNewEventForm({ ...newEventForm, startDateIso: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#FC4C02]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Ngày kết thúc *
                  </label>
                  <input
                    type="date"
                    required
                    value={newEventForm.endDateIso}
                    onChange={(e) => setNewEventForm({ ...newEventForm, endDateIso: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#FC4C02]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Pace tối thiểu
                  </label>
                  <input
                    type="text"
                    value={newEventForm.minPaceFormatted}
                    onChange={(e) => setNewEventForm({ ...newEventForm, minPaceFormatted: e.target.value })}
                    placeholder="03:30"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-1 focus:ring-[#FC4C02]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Pace tối đa
                  </label>
                  <input
                    type="text"
                    value={newEventForm.maxPaceFormatted}
                    onChange={(e) => setNewEventForm({ ...newEventForm, maxPaceFormatted: e.target.value })}
                    placeholder="15:00"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-1 focus:ring-[#FC4C02]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Nhân hệ số cuối tuần
                  </label>
                  <select
                    value={newEventForm.weekendMultiplier}
                    onChange={(e) => setNewEventForm({ ...newEventForm, weekendMultiplier: parseFloat(e.target.value) || 1.0 })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-semibold focus:outline-none focus:ring-1 focus:ring-[#FC4C02]"
                  >
                    <option value={1.0}>1.0x (Không nhân)</option>
                    <option value={1.5}>1.5x (Thứ 7 &amp; CN)</option>
                    <option value={2.0}>2.0x (Cuối tuần x2)</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateEventModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#FC4C02] hover:bg-[#E34402] text-white font-bold shadow-md shadow-[#FC4C02]/20 transition cursor-pointer"
                >
                  Tạo Giải Ngay
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
