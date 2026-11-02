import React, { useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Modal,
} from 'react-native';
import {
  AntiCheatStatus,
  ChallengeConditionType,
  EventRuleConfigSchema,
  RunMode,
  SportType,
  calculateDualGoalProgress,
  evaluateActivitySplits,
  formatPace,
} from '@toprun/shared';

/**
 * Ứng dụng Di động TOPRunAssistant (iOS & Android - React Native / Expo)
 * Bao gồm 5 Bottom Tabs:
 * 1. Bảng tin Hoạt động (Activity Feed: Kudos, Comment, Strava Sync)
 * 2. Giải chạy & Thử thách (Dual-Goal: Mốc Target Finisher vs Mốc Challenge Awards)
 * 3. Tracklog & Splits (Kiểm duyệt từng km: Xanh hợp lệ / Đỏ vi phạm tốc độ xe máy)
 * 4. Câu lạc bộ & Đội nhóm (Clubs / Teams Leaderboard)
 * 5. Tủ Huy Chương (Trophy Case: E-BIB, E-Certificate, PR 5K/10K/21K/42K, Share Card)
 */
export default function TopRunMobileApp() {
  const [activeTab, setActiveTab] = useState<'feed' | 'events' | 'splits' | 'clubs' | 'profile'>('events');
  const [shareModalVisible, setShareModalVisible] = useState(false);

  const defaultRules = EventRuleConfigSchema.parse({
    allowedSportTypes: [SportType.RUN, SportType.TRAIL_RUN],
    minPaceSecPerKm: 180,
    maxPaceSecPerKm: 900,
    weekendMultiplier: 2.0,
    allowSplitFiltering: true,
  });

  const [activityLogs, setActivityLogs] = useState([
    { activityDateIso: '2026-10-21T06:00:00Z', validRawDistanceKm: 10.0, finalMultipliedDistanceKm: 10.0, elevationGainMeters: 45 },
    { activityDateIso: '2026-10-24T06:00:00Z', validRawDistanceKm: 12.5, finalMultipliedDistanceKm: 25.0, elevationGainMeters: 80 },
    { activityDateIso: '2026-10-25T06:00:00Z', validRawDistanceKm: 16.0, finalMultipliedDistanceKm: 32.0, elevationGainMeters: 90 },
  ]);

  const progress = calculateDualGoalProgress({
    runMode: RunMode.ACCUMULATIVE,
    targetCategory: {
      id: 'cat_50k',
      name: 'Mốc Target 50KM (Finisher)',
      targetDistanceKm: 50,
      bibPrefix: 'TOP50-',
    },
    challengeTiers: [
      {
        id: 'tier_100k',
        tierName: 'Challenge Bạc: Vượt Ngưỡng 100KM',
        tierLevel: 'SILVER',
        conditionType: ChallengeConditionType.DISTANCE_OVERACHIEVE,
        thresholdValue: 100,
        awardBadgeUrl: '🥈',
        rewardDescription: 'Huy hiệu Chiến Binh Bạc 100KM',
      },
      {
        id: 'tier_longrun_15k',
        tierName: 'Challenge Bền Bỉ: Single Run >= 15KM',
        tierLevel: 'GOLD',
        conditionType: ChallengeConditionType.SINGLE_LONG_RUN,
        thresholdValue: 15,
        awardBadgeUrl: '🔥',
        rewardDescription: 'Huy hiệu Long Run Finisher 15KM',
      },
    ],
    activityLogs,
  });

  const handleQuickStravaSync = () => {
    const simulated = evaluateActivitySplits(
      {
        externalId: `mob_${Date.now()}`,
        name: 'Morning Run Synced via Strava OAuth2',
        sportType: SportType.RUN,
        startDateIso: '2026-10-25T06:00:00Z',
        distanceMeters: 8000,
        movingTimeSec: 2520,
        elapsedTimeSec: 2600,
        totalElevationGainMeters: 40,
        isManual: false,
        splits: Array.from({ length: 8 }, (_, idx) => ({
          splitIndex: idx + 1,
          distanceMeters: 1000,
          movingTimeSec: 315,
        })),
      },
      defaultRules
    );

    setActivityLogs((prev) => [
      ...prev,
      {
        activityDateIso: new Date().toISOString(),
        validRawDistanceKm: simulated.validDistanceKm,
        finalMultipliedDistanceKm: simulated.finalCountedDistanceKm,
        elevationGainMeters: 40,
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <View>
          <Text style={styles.brandTitle}>🏃‍♂️ TOPRunAssistant</Text>
          <Text style={styles.brandSubtitle}>iOS &amp; Android • Strava Webhook Sync</Text>
        </View>
        <TouchableOpacity style={styles.syncButton} onPress={handleQuickStravaSync}>
          <Text style={styles.syncButtonText}>+ Sync Strava (x2)</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 32 }}>
        {/* TAB: GIẢI CHẠY & TIẾN ĐỘ 2 TẦNG (TARGET VS CHALLENGE) */}
        {activeTab === 'events' && (
          <View style={styles.section}>
            <View style={styles.heroCard}>
              <Text style={styles.badgeActive}>● VIRTUAL RACE ĐANG DIỄN RA</Text>
              <Text style={styles.eventTitle}>TOPRUN AUTUMN VIRTUAL RACE 2026</Text>
              <Text style={styles.eventDesc}>
                Nhân đôi Km Thứ 7 &amp; Chủ Nhật (x2) • Tự động lọc Split xe máy (&lt; 03:00/km)
              </Text>
            </View>

            {/* TẦNG 1: TARGET FINISHER */}
            <View style={styles.cardTarget}>
              <Text style={styles.tierTagSky}>🎯 TẦNG 1: TÍCH LŨY MỐC TARGET (FINISHER)</Text>
              <Text style={styles.cardHeading}>{progress.target.categoryName}</Text>
              <Text style={styles.bigDistance}>
                {progress.target.currentMultipliedDistanceKm} / {progress.target.targetDistanceKm} KM (
                {progress.target.progressPercentage}%)
              </Text>
              <View style={styles.progressBarBg}>
                <View
                  style={[
                    styles.progressBarFillSky,
                    { width: `${progress.target.progressPercentage}%` },
                  ]}
                />
              </View>
              <Text style={styles.subNote}>
                Thực chạy GPS: {progress.target.currentRawDistanceKm} km •{' '}
                {progress.target.isCompleted
                  ? '✅ Đã mở khóa E-Cert & Huy chương Finisher!'
                  : `Còn thiếu ${progress.target.remainingDistanceKm} km`}
              </Text>
            </View>

            {/* TẦNG 2: CHALLENGE AWARDS */}
            <View style={styles.cardChallenge}>
              <Text style={styles.tierTagAmber}>🏆 TẦNG 2: TÍCH LŨY CHALLENGE (NHẬN AWARD)</Text>
              {progress.challenges.map((chal) => (
                <View key={chal.tierId} style={styles.challengeItem}>
                  <Text style={styles.challengeTitle}>
                    {chal.awardBadgeUrl} {chal.tierName}
                  </Text>
                  <Text style={styles.challengeMeta}>
                    Tiến độ: {chal.currentValue}/{chal.thresholdValue} ({chal.progressPercentage}%) —{' '}
                    {chal.isUnlocked ? 'ĐÃ NHẬN AWARD 🎉' : 'Đang chinh phục'}
                  </Text>
                </View>
              ))}
            </View>

            <TouchableOpacity
              style={styles.shareCardBtn}
              onPress={() => setShareModalVisible(true)}
            >
              <Text style={styles.shareCardBtnText}>📸 Tạo Ảnh Share Card Khoe Facebook / Zalo</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* TAB: SPLITS & CHỐNG GIAN LẬN TỪNG KM */}
        {activeTab === 'splits' && (
          <View style={styles.section}>
            <Text style={styles.cardHeading}>Chi Tiết Từng Km (Split-Level Anti-Cheat)</Text>
            <Text style={styles.subNote}>
              Các km có Pace nhanh bất thường (&lt; 03:00/km do quên tắt đồng hồ khi đi xe máy) sẽ bị cắt tự động, các km chạy bộ trước đó vẫn được bảo toàn:
            </Text>
            {[
              { km: 1, pace: 325, valid: true },
              { km: 2, pace: 322, valid: true },
              { km: 3, pace: 328, valid: true },
              { km: 4, pace: 320, valid: true },
              { km: 5, pace: 324, valid: true },
              { km: 6, pace: 95, valid: false },
            ].map((sp) => (
              <View
                key={sp.km}
                style={[styles.splitRow, !sp.valid && styles.splitRowInvalid]}
              >
                <Text style={styles.splitKm}>Km {sp.km}</Text>
                <Text style={styles.splitPace}>{formatPace(sp.pace)}</Text>
                <Text style={sp.valid ? styles.splitValidText : styles.splitInvalidText}>
                  {sp.valid ? '✓ Hợp lệ (+1.0km)' : '✕ Đã cắt (Xe máy)'}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* TAB: HỒ SƠ CÁ NHÂN, QUẢN LÝ TÀI KHOẢN & TRẠNG THÁI STRAVA */}
        {(activeTab === 'profile' || activeTab === 'feed' || activeTab === 'clubs') && (
          <View style={styles.section}>
            <View style={styles.cardTarget}>
              <Text style={styles.tierTagSky}>🟠 TRẠNG THÁI ĐỒNG BỘ STRAVA API (#292007)</Text>
              <Text style={styles.cardHeading}>Nguyễn Hữu Thuận • Athlete #126278000</Text>
              <Text style={styles.subNote}>
                Phạm vi quyền: read, activity:read_all • Tự động đồng bộ 30 ngày gần nhất • Cân nặng: 68kg • Cao: 173cm • Max HR: 192 bpm • Size áo Race-kit: L
              </Text>
            </View>

            <View style={styles.ebibBox}>
              <Text style={styles.ebibEvent}>TOPRUN AUTUMN VIRTUAL RACE 2026</Text>
              <Text style={styles.ebibNumber}>TOP50-0018</Text>
              <Text style={styles.ebibRunner}>NGUYỄN HỮU THUẬN • ASSA ABLOY ENGINEERING</Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* MODAL SHARE CARD */}
      <Modal visible={shareModalVisible} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.ebibEvent}>TOPRUN SHARE CARD • STRAVA VERIFIED</Text>
            <Text style={styles.ebibNumber}>{progress.target.currentMultipliedDistanceKm} KM</Text>
            <Text style={styles.ebibRunner}>
              🎯 Target 50KM: {progress.target.progressPercentage}% • BIB: TOP50-0018
            </Text>
            <TouchableOpacity
              style={[styles.syncButton, { marginTop: 18, alignSelf: 'center' }]}
              onPress={() => setShareModalVisible(false)}
            >
              <Text style={styles.syncButtonText}>Đóng &amp; Chia sẻ ảnh</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 5 BOTTOM NAVIGATION TABS */}
      <View style={styles.bottomBar}>
        {[
          { id: 'feed', label: 'Bảng Tin' },
          { id: 'events', label: 'Giải Đấu' },
          { id: 'splits', label: 'Tracklog' },
          { id: 'clubs', label: 'Đội/CLB' },
          { id: 'profile', label: 'Hồ Sơ' },
        ].map((t) => (
          <TouchableOpacity
            key={t.id}
            onPress={() => setActiveTab(t.id as any)}
            style={styles.tabItem}
          >
            <Text
              style={[
                styles.tabLabel,
                activeTab === t.id && styles.tabLabelActive,
              ]}
            >
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#090d16' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  brandTitle: { color: '#ffffff', fontSize: 18, fontWeight: '900' },
  brandSubtitle: { color: '#94a3b8', fontSize: 11, marginTop: 2 },
  syncButton: {
    backgroundColor: '#fc4c02',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  syncButtonText: { color: '#ffffff', fontSize: 12, fontWeight: '800' },
  content: { flex: 1, padding: 16 },
  section: { gap: 14 },
  heroCard: {
    backgroundColor: '#1e1b4b',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#4338ca',
  },
  badgeActive: { color: '#34d399', fontSize: 11, fontWeight: '800' },
  eventTitle: { color: '#ffffff', fontSize: 20, fontWeight: '900', marginTop: 6 },
  eventDesc: { color: '#cbd5e1', fontSize: 12, marginTop: 4 },
  cardTarget: {
    backgroundColor: '#0f172a',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#0284c7',
  },
  tierTagSky: { color: '#38bdf8', fontSize: 11, fontWeight: '800' },
  tierTagAmber: { color: '#fbbf24', fontSize: 11, fontWeight: '800', marginBottom: 8 },
  cardHeading: { color: '#ffffff', fontSize: 17, fontWeight: '800', marginTop: 6 },
  bigDistance: { color: '#38bdf8', fontSize: 24, fontWeight: '900', marginVertical: 8 },
  progressBarBg: {
    height: 10,
    backgroundColor: '#1e293b',
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressBarFillSky: { height: '100%', backgroundColor: '#22c55e' },
  subNote: { color: '#94a3b8', fontSize: 12, marginTop: 8 },
  cardChallenge: {
    backgroundColor: '#0f172a',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#d97706',
    gap: 10,
  },
  challengeItem: {
    backgroundColor: '#090d16',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  challengeTitle: { color: '#ffffff', fontSize: 14, fontWeight: '800' },
  challengeMeta: { color: '#fde047', fontSize: 12, marginTop: 4 },
  shareCardBtn: {
    backgroundColor: '#f97316',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  shareCardBtnText: { color: '#ffffff', fontWeight: '900', fontSize: 14 },
  splitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  splitRowInvalid: { backgroundColor: '#450a0a', borderColor: '#ef4444' },
  splitKm: { color: '#e2e8f0', fontWeight: '700' },
  splitPace: { color: '#38bdf8', fontWeight: '800' },
  splitValidText: { color: '#34d399', fontWeight: '700', fontSize: 12 },
  splitInvalidText: { color: '#fca5a5', fontWeight: '800', fontSize: 12 },
  ebibBox: {
    backgroundColor: '#1e1b4b',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#f97316',
  },
  ebibEvent: { color: '#f97316', fontSize: 12, fontWeight: '800' },
  ebibNumber: { color: '#ffffff', fontSize: 42, fontWeight: '900', marginVertical: 12 },
  ebibRunner: { color: '#38bdf8', fontSize: 14, fontWeight: '700' },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#0f172a',
    borderRadius: 22,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#f97316',
  },
  bottomBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    backgroundColor: '#0f172a',
    paddingVertical: 12,
  },
  tabItem: { flex: 1, alignItems: 'center' },
  tabLabel: { color: '#64748b', fontSize: 12, fontWeight: '700' },
  tabLabelActive: { color: '#f97316', fontWeight: '900' },
});

