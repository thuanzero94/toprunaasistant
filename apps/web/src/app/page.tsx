'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Activity,
  ArrowLeft,
  Award,
  CheckCircle2,
  ChevronRight,
  Compass,
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
import AdminManagementPortal, { AdminEventFormState } from '../components/AdminManagementPortal';
import RunnerEventModals from '../components/RunnerEventModals';
import RunnerMyEvents, { MyEventItem } from '../components/RunnerMyEvents';
import RunnerExploreEvents, { ExploreEventItem } from '../components/RunnerExploreEvents';
import RunnerLeaderboardAndPrView from '../components/RunnerLeaderboardAndPrView';
import RunnerTrophyAndEBibView from '../components/RunnerTrophyAndEBibView';
import TournamentParticipantModal, { ParticipantDetailData } from '../components/TournamentParticipantModal';
import UserTracklogExplorer, { TracklogActivityItem } from '../components/UserTracklogExplorer';
import TopRunLogo from '../components/TopRunLogo';
import MobileBottomNav from '../components/MobileBottomNav';
import AthleteAvatar, { AthleteHonorPill } from '../components/AthleteAvatar';
import AthleteDeepDashboard from '../components/dashboard/AthleteDeepDashboard';
import {
  useAppNavigation,
  NavTab,
  TournamentSubTab,
  TracklogViewMode,
  AppModal,
} from '../hooks/useAppNavigation';
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
  parsePaceToSeconds,
  polylineToSvgPath,
  roundKm,
  RunMode,
  normalizeSportCategory,
  toVietnamDateString,
  toVietnamEventStartIso,
  toVietnamEventEndIso,
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

export default function TopRunWebApp() {
  const router = useRouter();
  const { user, logout, isLoading: isAuthLoading, updateUserSession } = useAuth();

  const {
    activeTab,
    setActiveTab,
    runnerEventSubTab,
    setRunnerEventSubTab,
    selectedEventId,
    setSelectedEventId,
    tournamentFrom,
    navigateToTournamentDetail,
    navigateBackFromTournamentDetail,
    tracklogViewMode,
    setTracklogViewMode,
    selectedActivityId,
    setSelectedActivityId,
    navigateToTracklogs,
    navigateToTracklogDetail,
    navigateBackFromTracklogDetail,
    activeModal,
    openModal,
    closeModal,
  } = useAppNavigation({
    defaultEventId: 'evt_vr_2026',
    defaultActivityId: 'act_01',
  });

  const showSimulatorDrawer = activeModal === 'simulator';
  const showShareModal = activeModal === 'share';
  const showRegisterModal = activeModal === 'register';
  const showEBibModal = activeModal === 'ebib';
  const showCreateEventModal = activeModal === 'create-event';

  const setShowSimulatorDrawer = (show: boolean) => (show ? openModal('simulator') : closeModal('simulator'));
  const setShowShareModal = (show: boolean) => (show ? openModal('share') : closeModal('share'));
  const setShowRegisterModal = (show: boolean) => (show ? openModal('register') : closeModal('register'));
  const setShowEBibModal = (show: boolean) => (show ? openModal('ebib') : closeModal('ebib'));
  const setShowCreateEventModal = (show: boolean) => (show ? openModal('create-event') : closeModal('create-event'));

  const [selectedParticipantDetailData, setSelectedParticipantDetailData] = useState<ParticipantDetailData | null>(null);
  const [selectedChallengeModalData, setSelectedChallengeModalData] = useState<any | null>(null);
  const [challengeModalTab, setChallengeModalTab] = useState<'completed' | 'all'>('completed');
  const selectedParticipantDetail = activeModal === 'participant' ? selectedParticipantDetailData : null;
  const setSelectedParticipantDetail = (data: ParticipantDetailData | null) => {
    if (data) {
      setSelectedParticipantDetailData(data);
      openModal('participant');
    } else {
      setSelectedParticipantDetailData(null);
      if (activeModal === 'participant') {
        closeModal('participant');
      }
    }
  };

  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [leaderboardMode, setLeaderboardMode] = useState<'individual' | 'team'>('individual');
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
  const [currentEventData, setCurrentEventData] = useState<any>(null);
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
    enableCrossTrainingConversion: false,
    rideToRunRatio: 0.25,
    swimToRunRatio: 5.0,
    categories: [
      { name: 'Mốc Target 21KM (Starter)', targetDistanceKm: 21, bibPrefix: 'VR21-' },
      { name: 'Mốc Target 42KM (Marathoner)', targetDistanceKm: 42, bibPrefix: 'VR42-' },
    ],
  });

  // Admin Management Sub-tabs & State
  const [adminSubTab, setAdminSubTab] = useState<'users' | 'races' | 'moderation' | 'fulfillment' | 'strava-pool'>('users');
  const [adminUsers, setAdminUsers] = useState<any[]>([]);
  const [isAdminUsersLoading, setIsAdminUsersLoading] = useState(false);
  const [adminUserSearch, setAdminUserSearch] = useState('');
  const [adminUserActionMsg, setAdminUserActionMsg] = useState<string | null>(null);

  // Admin Event Management State
  const [adminEventData, setAdminEventData] = useState<any>(null);
  const [isAdminEventLoading, setIsAdminEventLoading] = useState(false);
  const [adminEventSaveMsg, setAdminEventSaveMsg] = useState<string | null>(null);
  const [eventForm, setEventForm] = useState<AdminEventFormState>({
    title: '',
    subtitle: '',
    status: 'ACTIVE',
    description: '',
    bibPrefix: 'PRO-',
    startDateIso: '',
    endDateIso: '',
    minPaceFormatted: '03:00',
    maxPaceFormatted: '15:00',
    minActivityDistanceKm: 1.0,
    weekendMultiplier: 1.0,
    allowSplitFiltering: true,
    enableCrossTrainingConversion: false,
    rideToRunRatio: 0.25,
    swimToRunRatio: 5.0,
    categories: [],
    challengeTiers: [],
  });

  // Runner Tournament Sub-tab & Participant Inspection State
  const [trophyCase, setTrophyCase] = useState<any[]>([]);
  const [editBibModalState, setEditBibModalState] = useState<{
    show: boolean;
    eventId: string;
    bibNumber: string;
    eventTitle: string;
  }>({ show: false, eventId: '', bibNumber: '', eventTitle: '' });

  const handleDeleteEvent = useCallback(
    async (eventId: string, title: string) => {
      try {
        const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
        const token = typeof window !== 'undefined' ? localStorage.getItem('toprun_auth_token') : null;
        const res = await fetch(`${apiBase}/events/${eventId}`, {
          method: 'DELETE',
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        const data = await res.json();
        if (!res.ok) {
          alert(data.message || 'Không thể xoá giải đấu.');
          return;
        }
        setEventsList((prev) => prev.filter((e) => e.id !== eventId));
        if (selectedEventId === eventId) {
          const remaining = eventsList.filter((e) => e.id !== eventId);
          if (remaining.length > 0) {
            setSelectedEventId(remaining[0].id);
          }
        }
        setAdminEventSaveMsg(`Đã xoá giải đấu "${title}" thành công.`);
      } catch (err: any) {
        alert(err.message || 'Lỗi khi gọi API xoá giải.');
      }
    },
    [selectedEventId, eventsList]
  );

  // Guard Admin tab: Redirect to dashboard if user is not ADMIN
  useEffect(() => {
    if (user && user.role !== 'ADMIN' && activeTab === 'admin') {
      setActiveTab('dashboard');
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
        setAdminUserActionMsg(err.message || 'Không thể cập nhật vai trò');
      }
    } catch (err: any) {
      setAdminUserActionMsg(err.message || 'Lỗi kết nối khi cập nhật vai trò');
    }
  };

  const handleUpdateUserHonorBadge = async (targetUserId: string, newHonorBadge: string | null) => {
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
      const token = typeof window !== 'undefined' ? localStorage.getItem('toprun_auth_token') : null;
      const res = await fetch(`${apiBase}/admin/users/${targetUserId}/honor-badge`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ honorBadge: newHonorBadge }),
      });
      if (res.ok) {
        setAdminUsers((prev) =>
          prev.map((u) => (u.id === targetUserId ? { ...u, honorBadge: newHonorBadge } : u))
        );
        setAdminUserActionMsg(`Đã cập nhật danh hiệu VIP thành công!`);
        if (user && user.id === targetUserId) {
          updateUserSession({ honorBadge: newHonorBadge });
        }
        setTimeout(() => setAdminUserActionMsg(null), 4000);
      } else {
        const err = await res.json();
        setAdminUserActionMsg(err.message || 'Không thể cập nhật danh hiệu');
      }
    } catch (err: any) {
      setAdminUserActionMsg(err.message || 'Lỗi kết nối khi cập nhật danh hiệu');
    }
  };

  const handleDeleteUser = async (targetUserId: string, targetName: string) => {
    if (targetUserId === user?.id) {
      setAdminUserActionMsg('Bạn không thể tự xoá tài khoản Admin đang đăng nhập!');
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
        setAdminUserActionMsg(err.message || 'Không thể xoá người dùng');
      }
    } catch (err: any) {
      setAdminUserActionMsg(err.message || 'Lỗi khi xoá người dùng');
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
          description: ev.description || '',
          bibPrefix: ev.bibPrefix || 'PRO-',
          startDateIso: ev.startDateIso ? toVietnamDateString(ev.startDateIso) : '2026-10-01',
          endDateIso: ev.endDateIso ? toVietnamDateString(ev.endDateIso) : '2026-11-30',
          minPaceFormatted: formatPace(minPaceSec, false),
          maxPaceFormatted: formatPace(maxPaceSec, false),
          minActivityDistanceKm: ev.ruleConfig?.minActivityDistanceKm ?? 1.0,
          weekendMultiplier: ev.ruleConfig?.weekendMultiplier ?? 1.0,
          allowSplitFiltering: ev.ruleConfig?.allowSplitFiltering ?? true,
          enableCrossTrainingConversion: Boolean(ev.ruleConfig?.enableCrossTrainingConversion),
          rideToRunRatio: ev.ruleConfig?.rideToRunRatio ?? 0.25,
          swimToRunRatio: ev.ruleConfig?.swimToRunRatio ?? 5.0,
          categories: ev.categories || [
            { name: 'Mốc Target 21KM (Starter)', targetDistanceKm: 21, bibPrefix: 'VR21-' },
            { name: 'Mốc Target 42KM (Marathoner)', targetDistanceKm: 42, bibPrefix: 'VR42-' },
            { name: 'Mốc Target 50KM (Ultra)', targetDistanceKm: 50, bibPrefix: 'VR50-' },
          ],
          challengeTiers: ev.challengeTiers || INITIAL_CHALLENGE_TIERS,
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

      const payload = {
        title: eventForm.title,
        subtitle: eventForm.subtitle,
        description: eventForm.description,
        status: eventForm.status,
        bibPrefix: eventForm.bibPrefix || 'PRO-',
        startDateIso: toVietnamEventStartIso(eventForm.startDateIso),
        endDateIso: toVietnamEventEndIso(eventForm.endDateIso),
        ruleConfig: {
          minPaceSecPerKm: parsePaceToSeconds(eventForm.minPaceFormatted) || 180,
          maxPaceSecPerKm: parsePaceToSeconds(eventForm.maxPaceFormatted) || 900,
          minActivityDistanceKm: Number(eventForm.minActivityDistanceKm) || 1.0,
          weekendMultiplier: Number(eventForm.weekendMultiplier) || 1.0,
          allowSplitFiltering: Boolean(eventForm.allowSplitFiltering),
          enableCrossTrainingConversion: Boolean(eventForm.enableCrossTrainingConversion),
          rideToRunRatio: Number(eventForm.rideToRunRatio) || 0.25,
          swimToRunRatio: Number(eventForm.swimToRunRatio) || 5.0,
        },
        categories: eventForm.categories,
        challengeTiers: eventForm.challengeTiers,
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
        setAdminEventSaveMsg(err.message || 'Lỗi khi lưu cấu hình');
      }
    } catch (err: any) {
      setAdminEventSaveMsg(err.message || 'Lỗi kết nối khi lưu giải chạy');
    }
  };

  const handleCreateNewEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
      const token = typeof window !== 'undefined' ? localStorage.getItem('toprun_auth_token') : null;

      const payload = {
        title: newEventForm.title,
        subtitle: newEventForm.subtitle || 'Giải chạy tích lũy trực tuyến',
        description: newEventForm.description || newEventForm.title,
        eventType: newEventForm.eventType,
        runMode: newEventForm.runMode,
        startDateIso: toVietnamEventStartIso(newEventForm.startDateIso),
        endDateIso: toVietnamEventEndIso(newEventForm.endDateIso),
        minPaceSecPerKm: parsePaceToSeconds(newEventForm.minPaceFormatted) || 210,
        maxPaceSecPerKm: parsePaceToSeconds(newEventForm.maxPaceFormatted) || 900,
        minActivityDistanceKm: Number(newEventForm.minActivityDistanceKm) || 1.0,
        weekendMultiplier: Number(newEventForm.weekendMultiplier) || 1.0,
        enableCrossTrainingConversion: Boolean(newEventForm.enableCrossTrainingConversion),
        rideToRunRatio: Number(newEventForm.rideToRunRatio) || 0.25,
        swimToRunRatio: Number(newEventForm.swimToRunRatio) || 5.0,
        allowSplitFiltering: true,
        categories: newEventForm.categories,
        challengeTiers: [
          {
            tierName: 'Challenge Finisher Vàng',
            tierLevel: 'GOLD',
            conditionType: ChallengeConditionType.DISTANCE_OVERACHIEVE,
            thresholdValue: 50,
            awardBadgeUrl: 'GOLD',
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
        setSyncBannerMessage(`Tạo giải đấu "${created.title}" thành công!`);
        setShowCreateEventModal(false);
        await fetchEventsList();
        setSelectedEventId(created.id);
      } else {
        const err = await res.json();
        setSyncBannerMessage(err.message || 'Lỗi khi tạo giải đấu');
      }
    } catch (err: any) {
      setSyncBannerMessage(err.message || 'Lỗi kết nối khi tạo giải đấu');
    }
  };

  const fetchUserProfileAndTrophyCase = useCallback(async () => {
    if (!user?.id) return;
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
      const res = await fetch(`${apiBase}/users/${encodeURIComponent(user.id)}/profile`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.trophyCase)) {
          setTrophyCase(data.trophyCase);
        }
      }
    } catch (err) {
      console.warn('Chưa tải được profile/trophyCase:', (err as any)?.message);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchUserProfileAndTrophyCase();
  }, [fetchUserProfileAndTrophyCase]);

  const handleConfirmRegisterEvent = useCallback(
    async (eventId: string, regData: any) => {
      try {
        const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
        const token = typeof window !== 'undefined' ? localStorage.getItem('toprun_auth_token') : null;
        const res = await fetch(`${apiBase}/events/${encodeURIComponent(eventId)}/register`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            userId: user?.id,
            categoryId: regData.categoryId,
            bibNumber: regData.bibNumber,
            selectedChallengeTierIds: regData.selectedChallengeTierIds,
            teamId: regData.teamId,
            shirtSize: regData.shirtSize,
            medalEngravingName: regData.medalEngravingName,
            recipientName: regData.recipientName,
            phone: regData.phone,
            shippingAddress: regData.shippingAddress,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.message || 'Đăng ký không thành công.');
        }

        if (eventId === selectedEventId) {
          setMyBibNumber(data.bibNumber);
          setMyTargetKm(data.targetDistanceKm);
          setMyShirtSize(regData.shirtSize);
        }

        await Promise.all([fetchEventsList(), fetchEventDetails(eventId), fetchUserProfileAndTrophyCase()]);
        setSyncBannerMessage(`🎉 Đăng ký thành công! Bạn đã được cấp số E-BIB: ${data.bibNumber}`);
      } catch (err: any) {
        alert(err.message || 'Lỗi khi gọi API đăng ký.');
      }
    },
    [user?.id, selectedEventId, fetchEventsList, fetchEventDetails, fetchUserProfileAndTrophyCase]
  );

  const handleUpdateBib = useCallback(
    async (eventId: string, newBib: string) => {
      try {
        const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
        const token = typeof window !== 'undefined' ? localStorage.getItem('toprun_auth_token') : null;
        const res = await fetch(`${apiBase}/events/${encodeURIComponent(eventId)}/bib`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            userId: user?.id,
            bibNumber: newBib,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.message || 'Cập nhật số BIB thất bại.');
        }

        if (eventId === selectedEventId) {
          setMyBibNumber(data.bibNumber);
        }

        await Promise.all([
          fetchEventsList(),
          fetchEventDetails(eventId),
          fetchUserProfileAndTrophyCase(),
        ]);
        setSyncBannerMessage(`🎉 Đã cập nhật thành công số E-BIB mới: ${data.bibNumber}`);
      } catch (err: any) {
        throw err;
      }
    },
    [user?.id, selectedEventId, fetchEventsList, fetchEventDetails, fetchUserProfileAndTrophyCase]
  );

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
      sportType: sa.sportType || 'Run',
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

  const handleSelectActivityDetail = useCallback(
    (actId: string, fromOrigin: string = 'tournaments') => {
      // 1. Nếu bài chạy chưa có trong activities state (ví dụ bài chạy của VĐV khác), fetch ngay từ API
      const existing = activities.find((a) => a.id === actId);
      if (!existing) {
        const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
        const token = typeof window !== 'undefined' ? localStorage.getItem('toprun_auth_token') : null;
        fetch(`${apiBase}/activities/${actId}`, {
          headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        })
          .then((res) => (res.ok ? res.json() : null))
          .then((raw) => {
            if (raw) {
              const mapped = mapBackendActivityToUi(raw);
              setActivities((prev) => [mapped, ...prev.filter((p) => p.id !== mapped.id)]);
            }
          })
          .catch(() => {});
      }
      // 2. Chuyển tab sang Tracklog ở view Detail
      navigateToTracklogDetail(actId, fromOrigin);
    },
    [activities, mapBackendActivityToUi, navigateToTracklogDetail]
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
          movingTimeSec: a.movingTimeSec || 0,
          validAvgPaceSecPerKm: a.avgPaceSecPerKm || 0,
          sportType: a.sportType || 'Run',
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

  const myEventsList: MyEventItem[] = useMemo(() => {
    if (!user?.id) return [];
    return eventsList
      .filter((ev) => ev.participants?.some((p: any) => p.userId === user.id))
      .map((ev) => {
        const part = ev.participants?.find((p: any) => p.userId === user.id);
        const myBib = part?.bibNumber;
        const myTarget = part?.targetDistanceKm || 50;

        // Tính toán chính xác km hợp lệ từ activities cho giải đấu này
        const evStart = ev.startDateIso ? new Date(ev.startDateIso).getTime() : 0;
        const evEnd = ev.endDateIso ? new Date(ev.endDateIso).getTime() : Infinity;
        const multiplier = ev.ruleConfig?.weekendMultiplier ?? 1.0;

        const matchingActivities = activities.filter((a) => {
          const isMine = a.userId === user.id;
          if (!isMine || a.isHidden || a.validDistanceKm <= 0) return false;
          const actTime = a.startDateIso ? new Date(a.startDateIso).getTime() : Date.now();
          return actTime >= evStart && actTime <= evEnd;
        });

        const calculatedKm = matchingActivities.reduce((acc, a) => {
          let mult = 1.0;
          if (a.startDateIso) {
            const d = new Date(a.startDateIso).getUTCDay();
            if ((d === 0 || d === 6) && multiplier > 1.0) {
              mult = multiplier;
            }
          }
          return acc + roundKm(a.validDistanceKm * mult);
        }, 0);

        const myValidKm = roundKm(calculatedKm > 0 ? calculatedKm : (part?.totalValidKm || 0));

        return {
          id: ev.id,
          title: ev.title,
          status: ev.status,
          startDateIso: ev.startDateIso,
          endDateIso: ev.endDateIso,
          myBibNumber: myBib,
          myTargetKm: myTarget,
          myTotalValidKm: myValidKm,
          myProgressPercent: Math.min(100, Math.round((myValidKm / (myTarget || 1)) * 100)),
          myRank: part?.rank,
          myChallengeTier: part?.challengeTier,
          ruleConfig: ev.ruleConfig,
          totalParticipants: ev.participantsCount || (ev.participants ? ev.participants.length : 0),
        };
      });
  }, [eventsList, activities, user?.id]);

  // Tự động chuyển sang tab "Khám phá giải mới" nếu User chưa tham gia giải nào
  useEffect(() => {
    if (eventsList.length > 0 && myEventsList.length === 0 && runnerEventSubTab === 'my-events') {
      setRunnerEventSubTab('explore');
    }
  }, [eventsList.length, myEventsList.length, runnerEventSubTab]);

  const joinedEventIds = useMemo(() => {
    return new Set(myEventsList.map((e) => e.id));
  }, [myEventsList]);

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
      setSyncBannerMessage(err.message || 'Không thể đọc file GPX');
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
    { id: 'dashboard', label: 'Dashboard Chuyên Sâu', subLabel: 'Phân tích thể lực & Phong độ', icon: LayoutDashboard },
    { id: 'tournaments', label: 'Giải Đấu & Thử Thách', subLabel: 'Giải của tôi & Khám phá giải', icon: Trophy },
    { id: 'tracklogs', label: 'Nhật Ký & Tracklog', subLabel: 'Bản đồ GPS & Tốc độ từng km', icon: Activity },
    { id: 'trophy', label: 'Bảng Vàng PR & Xếp Hạng', subLabel: 'Kỷ lục cá nhân & BXH Runner', icon: Flame },
    { id: 'clubs', label: 'Câu Lạc Bộ & Đội Nhóm', subLabel: 'Thi đua liên phòng ban', icon: Users },
    { id: 'account', label: 'Hồ Sơ & Kết Nối Strava', subLabel: 'Tài khoản & Đồng bộ tự động', icon: UserCheck },
    ...(user?.role === 'ADMIN'
      ? [
          {
            id: 'admin' as NavTab,
            label: 'Quản Trị & Kiểm Duyệt',
            subLabel: 'Users, Giải chạy & Kiểm duyệt',
            icon: ShieldCheck,
          },
        ]
      : []),
  ];

  const currentNav =
    navItems.find((n) => n.id === activeTab) ||
    (activeTab === 'events' ? navItems[1] : navItems[0]);

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
          LEFT SIDEBAR NAVIGATION (DESKTOP FIXED)
         ===================================================================== */}
      <aside className="hidden lg:flex lg:w-64 lg:shrink-0 lg:h-screen lg:sticky lg:top-0 border-r border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#0C101B] flex-col justify-between z-30">
        <div className="p-4 lg:p-5 space-y-6">
          {/* Brand Logo */}
          <div className="flex items-center justify-between">
            <TopRunLogo variant="full" size="md" onClick={() => setActiveTab('dashboard')} />
          </div>

          {/* Primary Navigation */}
          <nav className="flex flex-col gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`group flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-left transition-all cursor-pointer ${isActive
                    ? 'bg-[#FC4C02]/10 dark:bg-[#FC4C02]/15 text-[#FC4C02] font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white font-medium'
                    }`}
                >
                  <Icon
                    className={`w-4 h-4 shrink-0 transition-colors ${isActive ? 'text-[#FC4C02]' : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200'
                      }`}
                  />
                  <div className="min-w-0">
                    <div className="text-[13px] leading-tight truncate">{item.label}</div>
                    <div className="text-[11px] text-slate-400 dark:text-slate-500 truncate mt-0.5 font-normal">
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
              className={`px-3 py-2 rounded-xl border text-xs font-medium flex items-center justify-center gap-1.5 transition cursor-pointer ${showSimulatorDrawer
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
              <div className="shrink-0 my-0.5">
                <AthleteAvatar user={user} size="sm" showBadge={true} showWings={true} showSharkCrown={true} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-slate-900 dark:text-white truncate flex items-center gap-1">
                  <span>{user.fullName}</span>
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono flex items-center gap-1.5 mt-0.5 flex-wrap">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>{myBibNumber}</span>
                  <AthleteHonorPill user={user} />
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
          {/* MOBILE HEADER (Visible on < lg screens) */}
          <div className="flex lg:hidden items-center justify-between w-full gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <TopRunLogo variant="compact" size="sm" onClick={() => setActiveTab('dashboard')} />
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {user.role === 'ADMIN' && (
                <button
                  type="button"
                  onClick={() => setActiveTab('admin')}
                  title="Quản trị giải đấu"
                  className={`p-2 rounded-xl border transition cursor-pointer ${activeTab === 'admin'
                    ? 'bg-[#FC4C02] text-white border-[#FC4C02]'
                    : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-[#FC4C02]'
                    }`}
                >
                  <ShieldCheck className="w-4 h-4" />
                </button>
              )}

              <button
                type="button"
                onClick={toggleTheme}
                title={theme === 'dark' ? 'Chuyển sang nền sáng' : 'Chuyển sang nền tối'}
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-amber-500 transition cursor-pointer"
              >
                {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('account')}
                title="Tài khoản cá nhân"
                className="shrink-0 cursor-pointer my-0.5"
              >
                <AthleteAvatar user={user} size="sm" showBadge={true} showWings={false} showSharkCrown={true} />
              </button>
            </div>
          </div>

          {/* DESKTOP HEADER (Visible on >= lg screens) */}
          <div className="hidden lg:flex items-center justify-between w-full gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <div>
                <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                  {currentNav.label}
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {currentNav.subLabel}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
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
        <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-8 py-6 sm:py-8 pb-24 lg:pb-8 space-y-8">
          {/* =================================================================
              VIEW 1: DASHBOARD CHUYÊN SÂU PHÂN TÍCH THỂ LỰC & PHONG ĐỘ
             ================================================================= */}
          {activeTab === 'dashboard' && (
            <AthleteDeepDashboard
              activities={activities}
              user={user}
              eventsCount={eventsList.length}
              onNavigateToTracklogs={() => navigateToTracklogs()}
              onNavigateToTournaments={() => setRunnerEventSubTab('my-events')}
              onSelectActivity={(actId) => {
                navigateToTracklogDetail(actId, 'dashboard');
              }}
            />
          )}

          {/* =================================================================
              VIEW 2: GIẢI ĐẤU & TIẾN ĐỘ 2 TẦNG (TOURNAMENTS HUB)
             ================================================================= */}
          {(activeTab === 'tournaments' || activeTab === 'events') && (
            <div className="space-y-6">
              {runnerEventSubTab === 'detail' ? (
                /* Dynamic Breadcrumb Bar for Event Detail View */
                <div className="flex flex-wrap items-center justify-between gap-3 p-2 rounded-2xl bg-white dark:bg-[#0F1420] border border-slate-200/80 dark:border-slate-800/80 shadow-xs">
                  <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                    <button
                      type="button"
                      onClick={navigateBackFromTournamentDetail}
                      className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-[#FC4C02] text-slate-700 dark:text-slate-200 hover:text-white text-xs sm:text-sm font-bold flex items-center gap-2 transition cursor-pointer shadow-xs shrink-0"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>
                        Quay lại {tournamentFrom === 'my-events' ? 'Giải của tôi' : tournamentFrom === 'dashboard' ? 'Tổng quan' : 'Khám phá'}
                      </span>
                    </button>

                    {/* Interactive Breadcrumb Trail */}
                    <nav aria-label="Breadcrumb" className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
                      <button
                        type="button"
                        onClick={() => setActiveTab('tournaments')}
                        className="hover:text-slate-900 dark:hover:text-white transition cursor-pointer"
                      >
                        Giải đấu
                      </button>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <button
                        type="button"
                        onClick={() => setRunnerEventSubTab(tournamentFrom === 'my-events' ? 'my-events' : 'explore')}
                        className="hover:text-slate-900 dark:hover:text-white transition cursor-pointer"
                      >
                        {tournamentFrom === 'my-events' ? 'Giải của tôi' : 'Khám phá giải'}
                      </button>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="font-bold text-slate-900 dark:text-white max-w-[180px] lg:max-w-[280px] truncate">
                        {currentEventData?.title || 'Chi tiết giải'}
                      </span>
                    </nav>
                  </div>

                  {eventsList.length > 1 && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-50 dark:bg-[#FC4C02]/10 border border-orange-200/80 dark:border-[#FC4C02]/25">
                      <Trophy className="w-3.5 h-3.5 text-[#FC4C02] shrink-0" />
                      <span className="text-[11px] font-bold text-[#FC4C02] uppercase tracking-wider shrink-0">
                        Đổi giải:
                      </span>
                      <select
                        value={selectedEventId}
                        onChange={(e) => setSelectedEventId(e.target.value)}
                        className="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-100 max-w-[140px] sm:max-w-[200px] truncate focus:outline-none cursor-pointer"
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
              ) : (
                /* Runner Event Hub Navigation Pills */
                <div className="flex flex-wrap items-center justify-between gap-3 p-1.5 rounded-2xl bg-white dark:bg-[#0F1420] border border-slate-200/80 dark:border-slate-800/80 shadow-xs">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setRunnerEventSubTab('my-events')}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${runnerEventSubTab === 'my-events'
                        ? 'bg-[#FC4C02] text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                    >
                      <Trophy className="w-4 h-4" />
                      <span>Giải của tôi ({myEventsList.length})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setRunnerEventSubTab('explore')}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${runnerEventSubTab === 'explore'
                        ? 'bg-[#FC4C02] text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                    >
                      <Compass className="w-4 h-4" />
                      <span>Khám phá giải mới ({eventsList.length})</span>
                    </button>
                  </div>

                  {eventsList.length > 1 && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-50 dark:bg-[#FC4C02]/10 border border-orange-200/80 dark:border-[#FC4C02]/25">
                      <Trophy className="w-3.5 h-3.5 text-[#FC4C02] shrink-0" />
                      <span className="text-[11px] font-bold text-[#FC4C02] uppercase tracking-wider shrink-0">
                        Chọn giải:
                      </span>
                      <select
                        value={selectedEventId}
                        onChange={(e) => setSelectedEventId(e.target.value)}
                        className="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-100 max-w-[160px] sm:max-w-[220px] truncate focus:outline-none cursor-pointer"
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
              )}

              {runnerEventSubTab === 'my-events' ? (
                <RunnerMyEvents
                  myEvents={myEventsList}
                  onSelectEvent={(eventId) => {
                    navigateToTournamentDetail(eventId, 'my-events');
                  }}
                  onGoToExplore={() => setRunnerEventSubTab('explore')}
                  onOpenEBib={(eventId) => {
                    setSelectedEventId(eventId);
                    setShowEBibModal(true);
                  }}
                />
              ) : runnerEventSubTab === 'explore' ? (
                <RunnerExploreEvents
                  eventsList={eventsList}
                  joinedEventIds={joinedEventIds}
                  onSelectEvent={(eventId) => {
                    navigateToTournamentDetail(eventId, 'explore');
                  }}
                  onOpenRegister={(event) => {
                    setSelectedEventId(event.id);
                    setShowRegisterModal(true);
                  }}
                />
              ) : (
                <>
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
                          {currentEventData?.ruleConfig?.enableCrossTrainingConversion && (
                            <span
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-cyan-50 dark:bg-cyan-950/50 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800/60"
                              title={`Quy đổi: 1km bơi = ${currentEventData.ruleConfig.swimToRunRatio ?? 5}km chạy • ${(1 / (currentEventData.ruleConfig.rideToRunRatio ?? 0.25))}km đạp = 1km chạy`}
                            >
                              <span>🏊 1km bơi = {currentEventData.ruleConfig.swimToRunRatio ?? 5}km</span>
                              <span>•</span>
                              <span>🚴 4km đạp = 1km</span>
                            </span>
                          )}
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
                          onClick={() => setShowEBibModal(true)}
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
                              className={`w-4 h-4 ${dualGoalProgress.target.eCertUnlocked ? 'text-emerald-500' : 'text-slate-400'
                                }`}
                            />
                            Chứng nhận điện tử (E-Certificate)
                          </span>
                          <span
                            className={`font-semibold ${dualGoalProgress.target.eCertUnlocked
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
                              className={`w-4 h-4 ${dualGoalProgress.target.raceKitQualified ? 'text-emerald-500' : 'text-slate-400'
                                }`}
                            />
                            Huy chương thật &amp; Áo Finisher (Size {myShirtSize})
                          </span>
                          <span
                            className={`font-semibold ${dualGoalProgress.target.raceKitQualified
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
                            className={`p-4 rounded-xl border transition-all flex flex-col justify-between space-y-3 ${chal.isUnlocked
                              ? 'bg-amber-50/40 dark:bg-amber-950/15 border-amber-300/80 dark:border-amber-700/60'
                              : 'bg-slate-50/70 dark:bg-slate-900/50 border-slate-200/70 dark:border-slate-800'
                              }`}
                          >
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between gap-2">
                                <span
                                  className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${chal.isUnlocked
                                    ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                                    : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                                    }`}
                                >
                                  {chal.isUnlocked ? 'Đã đạt' : chal.tierLevel}
                                </span>
                                <Medal
                                  className={`w-4 h-4 ${chal.isUnlocked ? 'text-amber-500' : 'text-slate-400 dark:text-slate-600'
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
                              {chal.conditionType === ChallengeConditionType.SPEED_TARGET_TIME ? (
                                <div className="space-y-1">
                                  <div className="flex items-center justify-between text-xs font-mono font-medium">
                                    <span className="text-amber-700 dark:text-amber-300 font-semibold text-[11px]">
                                      {chal.isUnlocked
                                        ? `Đã đạt: ${chal.currentValue > 0 ? `${chal.currentValue} phút` : 'Đạt chuẩn'}`
                                        : `Cự ly: ${chal.targetSpeedDistanceKm || 5} km • Thời gian ≤ ${chal.thresholdValue} phút`}
                                    </span>
                                    <span
                                      className={
                                        chal.isUnlocked
                                          ? 'text-amber-600 dark:text-amber-400 font-bold'
                                          : 'text-slate-400 text-[11px]'
                                      }
                                    >
                                      {chal.isUnlocked ? '100%' : 'Chưa đạt'}
                                    </span>
                                  </div>
                                  <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                                    <div
                                      className={`h-full rounded-full transition-all duration-500 ${chal.isUnlocked ? 'bg-amber-500' : 'bg-slate-400 dark:bg-slate-600'
                                        }`}
                                      style={{ width: `${chal.isUnlocked ? 100 : 0}%` }}
                                    />
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-1.5">
                                  <div className="flex justify-between text-xs font-mono font-medium">
                                    <span className="text-slate-600 dark:text-slate-300">
                                      {chal.currentValue} / {chal.thresholdValue}{' '}
                                      {chal.conditionType === ChallengeConditionType.STREAK_DAYS
                                        ? 'ngày'
                                        : chal.conditionType === ChallengeConditionType.ELEVATION_GAIN
                                          ? 'm'
                                          : 'km'}
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
                                      className={`h-full rounded-full transition-all duration-500 ${chal.isUnlocked ? 'bg-amber-500' : 'bg-slate-400 dark:bg-slate-600'
                                        }`}
                                      style={{ width: `${chal.progressPercentage}%` }}
                                    />
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Nút Xem BXH & Danh sách VĐV tham gia Thử Thách Mở Rộng */}
                            <button
                              type="button"
                              onClick={() => {
                                const chInfo = currentEventData?.challengeLeaderboards?.find(
                                  (cl: any) => cl.tierId === chal.tierId
                                ) || {
                                  tierId: chal.tierId,
                                  tierName: chal.tierName,
                                  tierLevel: chal.tierLevel,
                                  awardBadgeUrl: chal.awardBadgeUrl,
                                  thresholdValue: chal.thresholdValue,
                                  totalParticipants: 0,
                                  completedCount: chal.isUnlocked ? 1 : 0,
                                  completedLeaderboard: chal.isUnlocked
                                    ? [
                                        {
                                          rank: 1,
                                          userId: user?.id,
                                          userName: user?.fullName || 'Bạn',
                                          userAvatar: user?.avatarUrl,
                                          department: user?.departmentOrUnit || 'Runner',
                                          bibNumber: myBibNumber,
                                          isUnlocked: true,
                                          currentValue: chal.currentValue,
                                          thresholdValue: chal.thresholdValue,
                                        },
                                      ]
                                    : [],
                                  allParticipants: [
                                    {
                                      userId: user?.id,
                                      userName: user?.fullName || 'Bạn',
                                      userAvatar: user?.avatarUrl,
                                      department: user?.departmentOrUnit || 'Runner',
                                      bibNumber: myBibNumber,
                                      isUnlocked: chal.isUnlocked,
                                      currentValue: chal.currentValue,
                                      thresholdValue: chal.thresholdValue,
                                    },
                                  ],
                                };
                                setSelectedChallengeModalData(chInfo);
                                setChallengeModalTab('completed');
                              }}
                              className="w-full mt-2 py-1.5 px-3 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center gap-1.5 transition cursor-pointer"
                            >
                              <Users className="w-3.5 h-3.5 text-[#FC4C02]" />
                              <span>
                                Xem BXH &amp; VĐV ({
                                  currentEventData?.challengeLeaderboards?.find(
                                    (cl: any) => cl.tierId === chal.tierId
                                  )?.totalParticipants ?? 1
                                })
                              </span>
                            </button>
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
                          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${leaderboardMode === 'individual'
                            ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                            : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                            }`}
                        >
                          Cá nhân
                        </button>
                        <button
                          type="button"
                          onClick={() => setLeaderboardMode('team')}
                          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${leaderboardMode === 'team'
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
                              <th className="py-3 px-3 text-center w-12">Hạng</th>
                              <th className="py-3 px-3">Vận động viên</th>
                              <th className="py-3 px-3">Mã BIB</th>
                              <th className="py-3 px-3">Mục tiêu</th>
                              <th className="py-3 px-3">Thực chạy</th>
                              <th className="py-3 px-3">Điểm tính giải</th>
                              <th className="py-3 px-3">Tiến độ</th>
                              <th className="py-3 px-3">Trạng thái</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-sm">
                            {(!currentEventData?.individualLeaderboard || currentEventData.individualLeaderboard.length === 0) ? (
                              <tr>
                                <td colSpan={8} className="py-10 text-center text-slate-400">
                                  <Award className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                                  <div className="text-xs font-semibold">Chưa có vận động viên nào tham gia giải đấu này</div>
                                  <div className="text-[11px] text-slate-500 mt-0.5">Hãy là người đầu tiên đăng ký chinh phục mục tiêu!</div>
                                </td>
                              </tr>
                            ) : (
                              currentEventData.individualLeaderboard
                                .slice()
                                .sort((a: any, b: any) => (b.multipliedDistanceKm ?? 0) - (a.multipliedDistanceKm ?? 0))
                                .map((p: any, index: number) => {
                                  const rank = index + 1;
                                  const isGold = rank === 1;
                                  const isSilver = rank === 2;
                                  const isBronze = rank === 3;
                                  const isMe = user?.id ? p.userId === user.id : false;
                                  const targetKm = Number(p.targetDistanceKm || 50);
                                  const rawKm = Number(p.rawDistanceKm || 0);
                                  const multipliedKm = Number(p.multipliedDistanceKm || 0);
                                  const pct = targetKm > 0 ? Math.min(100, Math.round((multipliedKm / targetKm) * 100)) : 0;
                                  const isFinisher = Boolean(p.isTargetCompleted || pct >= 100);

                                  return (
                                    <tr
                                      key={p.participationId || p.bibNumber || index}
                                      onClick={() => {
                                        setSelectedParticipantDetail({
                                          userId: p.userId || '',
                                          name: p.userName || 'Vận động viên',
                                          avatarUrl: p.userAvatar || '',
                                          clubName: p.department || 'ASSA ABLOY Vietnam',
                                          bibNumber: p.bibNumber || 'TOP-0001',
                                          targetDistanceKm: targetKm,
                                          totalValidKm: multipliedKm,
                                          progressPercent: pct,
                                          rank: rank,
                                          gender: p.gender,
                                          activities: activities.filter(
                                            (a) => a.userId === p.userId && !a.isHidden && a.validDistanceKm > 0
                                          ),
                                        });
                                      }}
                                      className={`transition cursor-pointer ${
                                        isMe
                                          ? 'bg-[#FC4C02]/10 dark:bg-[#FC4C02]/15 hover:bg-[#FC4C02]/20'
                                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                                      }`}
                                    >
                                      {/* Rank Medal */}
                                      <td className="py-3 px-3 text-center font-mono font-bold">
                                        {isGold ? (
                                          <span className="w-7 h-7 rounded-xl bg-amber-400 text-slate-950 font-black font-mono text-xs flex items-center justify-center shadow-md shadow-amber-400/20 mx-auto">
                                            1
                                          </span>
                                        ) : isSilver ? (
                                          <span className="w-7 h-7 rounded-xl bg-slate-300 text-slate-900 font-black font-mono text-xs flex items-center justify-center shadow-xs mx-auto">
                                            2
                                          </span>
                                        ) : isBronze ? (
                                          <span className="w-7 h-7 rounded-xl bg-amber-700 text-white font-black font-mono text-xs flex items-center justify-center shadow-xs mx-auto">
                                            3
                                          </span>
                                        ) : (
                                          <span className="text-xs font-bold font-mono text-slate-400">
                                            #{rank}
                                          </span>
                                        )}
                                      </td>

                                      {/* Runner Info with Avatar */}
                                      <td className="py-3 px-3">
                                        <div className="flex items-center gap-3">
                                          <div className="shrink-0">
                                            <AthleteAvatar
                                              user={{
                                                id: p.userId,
                                                fullName: p.userName,
                                                avatarUrl: p.userAvatar,
                                                departmentOrUnit: p.department,
                                              }}
                                              rank={rank}
                                              size="sm"
                                              showBadge={true}
                                              showWings={true}
                                              showSharkCrown={true}
                                            />
                                          </div>
                                          <div className="min-w-0">
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                              <span className="font-bold text-slate-900 dark:text-white truncate">
                                                {p.userName}
                                              </span>
                                              <AthleteHonorPill
                                                user={{
                                                  id: p.userId,
                                                  fullName: p.userName,
                                                  avatarUrl: p.userAvatar,
                                                  departmentOrUnit: p.department,
                                                }}
                                                rank={rank}
                                              />
                                              {isMe && (
                                                <span className="px-1.5 py-0.2 rounded-md text-[9px] font-black bg-[#FC4C02] text-white">
                                                  BẠN
                                                </span>
                                              )}
                                            </div>
                                            <div className="text-[11px] text-slate-400 truncate">
                                              {p.department || 'Runner Community'}
                                            </div>
                                          </div>
                                        </div>
                                      </td>

                                      {/* BIB */}
                                      <td className="py-3 px-3">
                                        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[#FC4C02] border border-slate-200/60 dark:border-slate-700/60">
                                          {p.bibNumber}
                                        </span>
                                      </td>

                                      {/* Target */}
                                      <td className="py-3 px-3 font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">
                                        {targetKm} KM
                                      </td>

                                      {/* Raw Km */}
                                      <td className="py-3 px-3 font-mono text-xs text-slate-500 dark:text-slate-400">
                                        {rawKm} km
                                      </td>

                                      {/* Multiplied Km */}
                                      <td className="py-3 px-3">
                                        <div className="font-mono font-black text-slate-900 dark:text-white text-sm">
                                          {multipliedKm} <span className="text-[11px] font-normal text-slate-400">km</span>
                                        </div>
                                        {(() => {
                                          const userActs = activities.filter(
                                            (a) => a.userId === p.userId && !a.isHidden && a.validDistanceKm > 0
                                          );
                                          const runDist = userActs
                                            .filter((a) => normalizeSportCategory(a.sportType) === 'Run')
                                            .reduce((s, a) => s + (a.finalCountedDistanceKm || a.validDistanceKm), 0);
                                          const rideRaw = userActs
                                            .filter((a) => normalizeSportCategory(a.sportType) === 'Ride')
                                            .reduce((s, a) => s + a.validDistanceKm, 0);
                                          const rideConv = userActs
                                            .filter((a) => normalizeSportCategory(a.sportType) === 'Ride')
                                            .reduce((s, a) => s + (a.finalCountedDistanceKm || a.validDistanceKm), 0);
                                          const swimRaw = userActs
                                            .filter((a) => normalizeSportCategory(a.sportType) === 'Swim')
                                            .reduce((s, a) => s + a.validDistanceKm, 0);
                                          const swimConv = userActs
                                            .filter((a) => normalizeSportCategory(a.sportType) === 'Swim')
                                            .reduce((s, a) => s + (a.finalCountedDistanceKm || a.validDistanceKm), 0);

                                          if (rideConv === 0 && swimConv === 0) return null;

                                          return (
                                            <div className="flex items-center gap-1.5 flex-wrap text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                                              {runDist > 0 && <span>🏃 {roundKm(runDist)}km</span>}
                                              {rideConv > 0 && (
                                                <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                                                  🚴 +{roundKm(rideConv)}km <span className="opacity-75">({roundKm(rideRaw)}km đạp)</span>
                                                </span>
                                              )}
                                              {swimConv > 0 && (
                                                <span className="text-cyan-600 dark:text-cyan-400 font-medium">
                                                  🏊 +{roundKm(swimConv)}km <span className="opacity-75">({roundKm(swimRaw)}km bơi)</span>
                                                </span>
                                              )}
                                            </div>
                                          );
                                        })()}
                                      </td>

                                      {/* Progress Bar */}
                                      <td className="py-3 px-3 min-w-[120px]">
                                        <div className="space-y-1">
                                          <div className="flex items-center justify-between text-[11px] font-mono">
                                            <span className="text-slate-500 dark:text-slate-400">{multipliedKm}/{targetKm}km</span>
                                            <span className="font-bold text-[#FC4C02]">{pct}%</span>
                                          </div>
                                          <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                                            <div
                                              className={`h-full rounded-full transition-all duration-300 ${
                                                isFinisher ? 'bg-emerald-500' : 'bg-[#FC4C02]'
                                              }`}
                                              style={{ width: `${pct}%` }}
                                            />
                                          </div>
                                        </div>
                                      </td>

                                      {/* Status */}
                                      <td className="py-3 px-3">
                                        {isFinisher ? (
                                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                                            <CheckCircle2 className="w-3 h-3" />
                                            Finisher 🏆
                                          </span>
                                        ) : (
                                          <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                                            Còn {Math.max(0, roundKm(targetKm - multipliedKm))} km
                                          </span>
                                        )}
                                      </td>
                                    </tr>
                                  );
                                })
                            )}
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
                </>
              )}
            </div>
          )}

          {/* =================================================================
              VIEW 2: NHẬT KÝ HOẠT ĐỘNG, BẢN ĐỒ TƯƠNG TÁC & BỘ 4 BIỂU ĐỒ CHI TIẾT
             ================================================================= */}
          {activeTab === 'tracklogs' && (
            <UserTracklogExplorer
              activities={activities}
              selectedActivityId={selectedActivity?.id || selectedActivityId || ''}
              currentUserId={user?.id}
              currentUserRole={user?.role}
              viewMode={tracklogViewMode}
              onViewModeChange={setTracklogViewMode}
              onSelectActivity={(id) => {
                navigateToTracklogDetail(id);
              }}
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
              VIEW 3: BẢNG VÀNG PR & XẾP HẠNG RUNNER
             ================================================================= */}
          {activeTab === 'trophy' && (
            <RunnerLeaderboardAndPrView
              currentUser={user}
              activities={activities}
              onGoToAccountSettings={() => setActiveTab('account')}
              onOpenEBibModal={(eventId) => {
                if (eventId) setSelectedEventId(eventId);
                setShowEBibModal(true);
              }}
              onViewRunnerDetail={(pData) => {
                setSelectedParticipantDetail(pData);
              }}
            />
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
            <AdminManagementPortal
              currentUserId={user.id}
              adminSubTab={adminSubTab}
              onChangeSubTab={setAdminSubTab}
              adminUsers={adminUsers}
              isAdminUsersLoading={isAdminUsersLoading}
              adminUserSearch={adminUserSearch}
              onChangeUserSearch={setAdminUserSearch}
              adminUserActionMsg={adminUserActionMsg}
              onRefreshUsers={fetchAdminUsers}
              onUpdateUserRole={handleUpdateUserRole}
              onUpdateUserHonorBadge={handleUpdateUserHonorBadge}
              onDeleteUser={handleDeleteUser}
              adminEventSaveMsg={adminEventSaveMsg}
              eventsList={eventsList}
              selectedEventId={selectedEventId}
              onSelectEventId={setSelectedEventId}
              onOpenCreateEventModal={() => setShowCreateEventModal(true)}
              eventForm={eventForm}
              onChangeEventForm={setEventForm}
              onSaveEventRules={handleSaveEventRules}
              challengeTiers={adminEventData?.challengeTiers || INITIAL_CHALLENGE_TIERS}
              activities={activities}
              onInspectFlaggedActivity={(activityId) => {
                navigateToTracklogDetail(activityId, 'admin');
              }}
              raceKitOrders={raceKitOrders}
              onExportRaceKitCsv={handleExportRaceKitCsv}
              onDeleteEvent={handleDeleteEvent}
              onViewRunnerDetail={(id) => {
                navigateToTournamentDetail(id, 'explore');
              }}
            />
          )}
        </main>
      </div>

      {/* MOBILE BOTTOM NAVIGATION BAR */}
      <MobileBottomNav
        activeTab={activeTab}
        onChangeTab={setActiveTab}
        myEventsCount={myEventsList.length}
      />

      <RunnerEventModals
        showShareModal={showShareModal}
        onCloseShareModal={() => setShowShareModal(false)}
        selectedActivity={selectedActivity}
        myBibNumber={myBibNumber}
        svgPathData={svgMap.pathData}
        showRegisterModal={showRegisterModal}
        onCloseRegisterModal={() => setShowRegisterModal(false)}
        myTargetKm={myTargetKm}
        onChangeTargetKm={(km) => {
          setMyTargetKm(km);
          setMyBibNumber(`TOP${km}-0018`);
        }}
        myShirtSize={myShirtSize}
        onChangeShirtSize={setMyShirtSize}
        showCreateEventModal={showCreateEventModal}
        onCloseCreateEventModal={() => setShowCreateEventModal(false)}
        newEventForm={newEventForm}
        onChangeNewEventForm={setNewEventForm}
        onSubmitCreateNewEvent={handleCreateNewEvent}
        currentEvent={eventsList.find((e) => e.id === selectedEventId) || currentEventData}
        clubsList={currentEventData?.teams || []}
        currentUser={user}
        currentUserName={user?.fullName || ''}
        onConfirmRegister={handleConfirmRegisterEvent}
        showEditBibModal={editBibModalState.show}
        onCloseEditBibModal={() => setEditBibModalState((prev) => ({ ...prev, show: false }))}
        onSubmitEditBib={handleUpdateBib}
        editBibInitialValue={editBibModalState.bibNumber}
        editBibEventId={editBibModalState.eventId}
        editBibEventTitle={editBibModalState.eventTitle}
      />

      <TournamentParticipantModal
        participant={selectedParticipantDetail}
        onClose={() => setSelectedParticipantDetail(null)}
        onSelectActivity={(actId) => {
          setSelectedParticipantDetail(null);
          handleSelectActivityDetail(actId, 'tournaments');
        }}
      />

      {/* MODAL: CHI TIẾT THỬ THÁCH MỞ RỘNG (CHALLENGE AWARDS & DANH SÁCH VĐV) */}
      {selectedChallengeModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-white dark:bg-[#0F1420] border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl my-6 space-y-5 max-h-[85vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-400 to-[#FC4C02] text-white flex items-center justify-center text-xl shadow-md shadow-[#FC4C02]/20">
                  {selectedChallengeModalData.awardBadgeUrl || '🏅'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-base text-slate-900 dark:text-white">
                      {selectedChallengeModalData.tierName}
                    </h3>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                      {selectedChallengeModalData.tierLevel}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Mục tiêu thử thách: {selectedChallengeModalData.thresholdValue} • Thưởng huy hiệu độc bản
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedChallengeModalData(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Sub-tabs: Finishers vs All Participants */}
            <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 shrink-0 self-start">
              <button
                type="button"
                onClick={() => setChallengeModalTab('completed')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                  challengeModalTab === 'completed'
                    ? 'bg-white dark:bg-slate-800 text-[#FC4C02] shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Trophy className="w-3.5 h-3.5" />
                <span>
                  BXH Đã Hoàn Thành ({selectedChallengeModalData.completedLeaderboard?.length || 0})
                </span>
              </button>
              <button
                type="button"
                onClick={() => setChallengeModalTab('all')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                  challengeModalTab === 'all'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>
                  Tất cả VĐV tham gia ({selectedChallengeModalData.allParticipants?.length || 0})
                </span>
              </button>
            </div>

            {/* Content List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {challengeModalTab === 'completed' ? (
                (!selectedChallengeModalData.completedLeaderboard || selectedChallengeModalData.completedLeaderboard.length === 0) ? (
                  <div className="py-12 text-center text-slate-400 space-y-2">
                    <Trophy className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600" />
                    <p className="text-xs font-semibold">Chưa có vận động viên nào hoàn thành thử thách này</p>
                    <p className="text-[11px] text-slate-500">Hãy tăng tốc bài chạy tiếp theo để ghi danh lên đầu bảng vàng!</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {selectedChallengeModalData.completedLeaderboard.map((item: any, idx: number) => {
                      const rank = idx + 1;
                      const isGold = rank === 1;
                      const isSilver = rank === 2;
                      const isBronze = rank === 3;
                      const isMe = user?.id ? item.userId === user.id : false;

                      return (
                        <div
                          key={item.userId || idx}
                          className={`flex items-center justify-between py-3 px-3 rounded-xl transition ${
                            isMe ? 'bg-[#FC4C02]/10 border border-[#FC4C02]/20' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {/* Rank */}
                            <div className="w-7 text-center shrink-0">
                              {isGold ? (
                                <span className="w-6 h-6 rounded-lg bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center shadow-xs mx-auto">1</span>
                              ) : isSilver ? (
                                <span className="w-6 h-6 rounded-lg bg-slate-300 text-slate-900 font-black text-xs flex items-center justify-center mx-auto">2</span>
                              ) : isBronze ? (
                                <span className="w-6 h-6 rounded-lg bg-amber-700 text-white font-black text-xs flex items-center justify-center mx-auto">3</span>
                              ) : (
                                <span className="text-xs font-bold font-mono text-slate-400">#{rank}</span>
                              )}
                            </div>

                            {/* Avatar */}
                            <div className="shrink-0">
                              <AthleteAvatar
                                user={{ id: item.userId, fullName: item.userName, avatarUrl: item.userAvatar }}
                                rank={rank}
                                size="sm"
                                showBadge={true}
                              />
                            </div>

                            {/* Info */}
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                                  {item.userName}
                                </span>
                                {item.bibNumber && (
                                  <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-[#FC4C02]">
                                    {item.bibNumber}
                                  </span>
                                )}
                                {isMe && (
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-[#FC4C02] text-white">
                                    BẠN
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-400 truncate">
                                {item.department || 'Runner Community'}
                              </div>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                              <CheckCircle2 className="w-3 h-3" />
                              Đã mở khóa
                            </span>
                            {item.unlockedAtIso && (
                              <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                                {new Date(item.unlockedAtIso).toLocaleDateString('vi-VN')}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )
              ) : (
                (!selectedChallengeModalData.allParticipants || selectedChallengeModalData.allParticipants.length === 0) ? (
                  <div className="py-12 text-center text-slate-400 space-y-2">
                    <Users className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600" />
                    <p className="text-xs font-semibold">Chưa có vận động viên nào đăng ký thử thách này</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {selectedChallengeModalData.allParticipants.map((item: any, idx: number) => {
                      const isMe = user?.id ? item.userId === user.id : false;
                      return (
                        <div
                          key={item.userId || idx}
                          className={`flex items-center justify-between py-3 px-3 rounded-xl transition ${
                            isMe ? 'bg-[#FC4C02]/10 border border-[#FC4C02]/20' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="shrink-0">
                              <AthleteAvatar
                                user={{ id: item.userId, fullName: item.userName, avatarUrl: item.userAvatar }}
                                size="sm"
                                showBadge={false}
                              />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                                  {item.userName}
                                </span>
                                {item.bibNumber && (
                                  <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-[#FC4C02]">
                                    {item.bibNumber}
                                  </span>
                                )}
                                {isMe && (
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-[#FC4C02] text-white">
                                    BẠN
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-400 truncate">
                                {item.department || 'Runner Community'}
                              </div>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            {item.isUnlocked ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                <CheckCircle2 className="w-3 h-3" />
                                Đã đạt
                              </span>
                            ) : (
                              <span className="inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                                Đang thử thách
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )
              )}
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setSelectedChallengeModalData(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: XEM E-BIB & CHỨNG NHẬN ĐI THEO GIẢI ĐẤU */}
      {showEBibModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-4xl bg-white dark:bg-[#0F1420] border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl my-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#FC4C02]/10 text-[#FC4C02] flex items-center justify-center">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">
                    Chứng Nhận E-BIB & Tủ Huy Chương Giải Đấu
                  </h3>
                  <p className="text-xs text-slate-400">
                    Xem số BIB độc bản, tải SVG chứng nhận hoàn thành và tuỳ chỉnh thông tin
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowEBibModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <RunnerTrophyAndEBibView
              myEvents={myEventsList}
              trophyCase={trophyCase}
              user={user}
              currentEventData={currentEventData}
              onOpenEditBib={(eventId, currentBib, eventTitle) =>
                setEditBibModalState({
                  show: true,
                  eventId,
                  bibNumber: currentBib,
                  eventTitle,
                })
              }
              onGoToExplore={() => {
                setShowEBibModal(false);
                setActiveTab('tournaments');
                setRunnerEventSubTab('explore');
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
