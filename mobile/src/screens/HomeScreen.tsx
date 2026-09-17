import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  CalendarDays,
  Check,
  ClipboardList,
  LineChart,
  Play,
  UserRound,
} from "lucide-react-native";
import { AccountGearButton } from "../components/AccountGearButton";
import { IconBubble, MetricTile, SoftCard } from "../components/ui";
import {
  dosageLabel,
  filterTodayHome,
  firstIncompleteToday,
  greeting,
  isExerciseCompleted,
  planWeek,
  upcomingScheduled,
} from "../lib/planSchedule";
import type {
  Appointment,
  ExerciseSession,
  Plan,
  TherapistContact,
} from "../types";
import { C, colors, radius, shadow, space } from "../theme";

type Props = {
  fullName: string;
  plan: Plan | null;
  sessions: ExerciseSession[];
  appointments: Appointment[];
  therapist: TherapistContact | null;
  loading: boolean;
  refreshing?: boolean;
  error: string;
  banner: string;
  onRefresh?: () => void;
  onRetry: () => void;
  onOpenAccount: () => void;
  onOpenAppointments: () => void;
  onOpenConsult: (appointmentId: string) => void;
  onStartExercise: (exerciseId: string) => void;
  onSeeAllExercises: () => void;
  onOpenProgress: () => void;
};

export function HomeScreen({
  fullName,
  plan,
  sessions,
  appointments,
  therapist,
  loading,
  refreshing = false,
  error,
  banner,
  onRefresh,
  onRetry,
  onOpenAccount,
  onOpenAppointments,
  onOpenConsult,
  onStartExercise,
  onSeeAllExercises,
  onOpenProgress,
}: Props) {
  const week = plan ? planWeek(plan.start_date, plan.duration_weeks) : 1;
  const today = plan ? filterTodayHome(plan, week) : [];
  const nextUp = plan ? firstIncompleteToday(plan, sessions) : null;
  const nextAppt = upcomingScheduled(appointments);
  const remaining = today.filter(
    (item) => !isExerciseCompleted(item.id, sessions),
  ).length;
  const doneCount = today.length - remaining;
  const firstName = fullName.trim().split(/\s+/)[0] || "there";
  const initials = fullName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <ScrollView
      contentContainerStyle={styles.page}
      showsVerticalScrollIndicator={false}
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        ) : undefined
      }
    >
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.kicker}>{greeting()}</Text>
          <Text style={styles.name}>{firstName}</Text>
        </View>
        <View style={styles.headerActions}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials || "S"}</Text>
          </View>
          <AccountGearButton onOpenAccount={onOpenAccount} />
        </View>
      </View>

      {loading ? <Text style={styles.status}>Loading…</Text> : null}

      {error ? (
        <SoftCard style={styles.errorCard}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.primary} onPress={onRetry}>
            <Text style={styles.primaryText}>Retry</Text>
          </Pressable>
        </SoftCard>
      ) : null}

      {banner ? (
        <View style={styles.bannerPill}>
          <Check size={16} color={C.success} strokeWidth={3} />
          <Text style={styles.bannerText} numberOfLines={1}>
            {banner}
          </Text>
        </View>
      ) : null}

      {!loading && !error && !plan ? (
        <SoftCard style={styles.centerCard}>
          <Text style={styles.emptyTitle}>No plan yet</Text>
          <Pressable style={styles.primary} onPress={onOpenAppointments}>
            <Text style={styles.primaryText}>View visits</Text>
          </Pressable>
        </SoftCard>
      ) : null}

      {!loading && plan ? (
        <>
          <View style={styles.metricRow}>
            <MetricTile
              label="Today"
              value={today.length === 0 ? "—" : `${doneCount}/${today.length}`}
              hint={
                today.length === 0
                  ? "Rest"
                  : remaining === 0
                    ? "Done"
                    : `${remaining} left`
              }
              accent="accent"
            />
            <MetricTile
              label="Week"
              value={`${week}/${plan.duration_weeks}`}
              hint={plan.title}
              accent="primary"
            />
          </View>

          {nextUp ? (
            <Pressable
              style={styles.heroCta}
              onPress={() => onStartExercise(nextUp.id)}
            >
              <View style={styles.heroPlay}>
                <Play
                  size={22}
                  color={colors.brand.primary}
                  fill={colors.brand.primary}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.heroEyebrow}>Start next</Text>
                <Text style={styles.heroTitle} numberOfLines={1}>
                  {nextUp.exercise_name}
                </Text>
                <Text style={styles.heroMeta}>{dosageLabel(nextUp)}</Text>
              </View>
            </Pressable>
          ) : null}

          <View style={styles.blockHead}>
            <Text style={styles.blockTitle}>Exercises</Text>
            <Pressable onPress={onSeeAllExercises} hitSlop={8}>
              <Text style={styles.blockLink}>All</Text>
            </Pressable>
          </View>

          {today.length === 0 ? (
            <SoftCard>
              <Text style={styles.muted}>Nothing scheduled today</Text>
              <Pressable style={styles.outlineBtn} onPress={onSeeAllExercises}>
                <Text style={styles.outlineBtnText}>Open plan</Text>
              </Pressable>
            </SoftCard>
          ) : (
            <View style={styles.list}>
              {today.map((item) => {
                const done = isExerciseCompleted(item.id, sessions);
                return (
                  <Pressable
                    key={item.id}
                    style={[styles.exerciseRow, done && styles.exerciseRowDone]}
                    onPress={() => onStartExercise(item.id)}
                  >
                    <View
                      style={[styles.dot, done && styles.dotDone]}
                      accessibilityElementsHidden
                    >
                      {done ? (
                        <Check size={14} color="#fff" strokeWidth={3} />
                      ) : (
                        <Play
                          size={12}
                          color={colors.brand.primary}
                          fill={colors.brand.primary}
                        />
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.exercise} numberOfLines={1}>
                        {item.exercise_name}
                      </Text>
                      <Text style={styles.meta}>{dosageLabel(item)}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}
        </>
      ) : null}

      {!loading && !error ? (
        <>
          {nextAppt ? (
            <Pressable
              style={styles.apptRow}
              onPress={() => onOpenConsult(nextAppt.id)}
            >
              <IconBubble>
                <CalendarDays size={20} color={colors.brand.primary} />
              </IconBubble>
              <View style={{ flex: 1 }}>
                <Text style={styles.careTitle}>Next visit</Text>
                <Text style={styles.meta}>
                  {new Date(nextAppt.scheduled_at).toLocaleString(undefined, {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Text>
              </View>
              <View style={styles.miniBtn}>
                <Text style={styles.miniBtnText}>Join</Text>
              </View>
            </Pressable>
          ) : null}

          {therapist ? (
            <View style={styles.apptRow}>
              <IconBubble color={colors.brand.accentSoft}>
                <UserRound size={20} color={colors.brand.accent} />
              </IconBubble>
              <View style={{ flex: 1 }}>
                <Text style={styles.careTitle} numberOfLines={1}>
                  {therapist.full_name}
                </Text>
                <Text style={styles.meta} numberOfLines={1}>
                  {therapist.clinic_name || "Physiotherapist"}
                </Text>
              </View>
            </View>
          ) : null}

          <View style={styles.quickRow}>
            <Pressable style={styles.quickTile} onPress={onSeeAllExercises}>
              <ClipboardList size={22} color={colors.brand.primary} />
              <Text style={styles.quickLabel}>Plan</Text>
            </Pressable>
            <Pressable style={styles.quickTile} onPress={onOpenProgress}>
              <LineChart size={22} color={colors.brand.accent} />
              <Text style={styles.quickLabel}>Progress</Text>
            </Pressable>
            <Pressable style={styles.quickTile} onPress={onOpenAppointments}>
              <CalendarDays size={22} color={colors.semantic.info} />
              <Text style={styles.quickLabel}>Visits</Text>
            </Pressable>
          </View>
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    padding: space[5],
    paddingBottom: 110,
    gap: space[3],
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: space[1],
    gap: space[3],
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: space[2],
  },
  kicker: {
    fontSize: 13,
    fontWeight: "600",
    color: C.muted,
  },
  name: {
    fontSize: 30,
    fontWeight: "800",
    color: C.text,
    letterSpacing: -0.7,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: colors.brand.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#fff", fontWeight: "800", fontSize: 15 },
  status: { fontSize: 15, color: C.muted },
  errorCard: { backgroundColor: C.dangerSoft },
  errorText: {
    color: C.danger,
    fontWeight: "700",
    fontSize: 14,
    marginBottom: space[3],
  },
  bannerPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-start",
    backgroundColor: C.successSoft,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.full,
  },
  bannerText: {
    color: C.success,
    fontWeight: "700",
    fontSize: 13,
    flexShrink: 1,
  },
  centerCard: { alignItems: "stretch", gap: space[3] },
  emptyTitle: { fontSize: 17, fontWeight: "800", color: C.text },
  metricRow: { flexDirection: "row", gap: space[3] },
  heroCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: space[3],
    backgroundColor: colors.brand.primary,
    borderRadius: radius.xl,
    padding: space[4],
    ...shadow.md,
  },
  heroPlay: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  heroEyebrow: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 2,
  },
  heroTitle: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "800",
  },
  heroMeta: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 13,
    marginTop: 2,
  },
  blockHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: space[1],
  },
  blockTitle: { fontSize: 17, fontWeight: "800", color: C.text },
  blockLink: { fontSize: 14, fontWeight: "700", color: colors.brand.primary },
  list: { gap: space[2] },
  muted: { fontSize: 14, color: C.muted, marginBottom: space[3] },
  exerciseRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space[3],
    padding: space[3],
    borderRadius: radius.lg,
    backgroundColor: colors.surface.card,
    ...shadow.sm,
  },
  exerciseRowDone: {
    backgroundColor: colors.semantic.successSoft,
    shadowOpacity: 0,
    elevation: 0,
  },
  dot: {
    width: 32,
    height: 32,
    borderRadius: 12,
    backgroundColor: colors.brand.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  dotDone: { backgroundColor: colors.semantic.success },
  exercise: { fontSize: 15, fontWeight: "700", color: C.text },
  meta: { fontSize: 12, color: C.muted, marginTop: 2 },
  primary: {
    minHeight: 50,
    backgroundColor: C.primary,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryText: { color: "white", fontSize: 15, fontWeight: "800" },
  outlineBtn: {
    minHeight: 44,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: colors.border.default,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface.card,
  },
  outlineBtnText: { fontWeight: "800", color: C.text, fontSize: 14 },
  apptRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space[3],
    backgroundColor: colors.surface.card,
    borderRadius: radius.xl,
    padding: space[4],
    ...shadow.sm,
  },
  careTitle: { fontSize: 15, fontWeight: "800", color: C.text },
  miniBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.full,
    backgroundColor: colors.brand.primary,
  },
  miniBtnText: { color: "#fff", fontWeight: "800", fontSize: 13 },
  quickRow: { flexDirection: "row", gap: space[3], marginTop: space[1] },
  quickTile: {
    flex: 1,
    backgroundColor: colors.surface.card,
    borderRadius: radius.xl,
    paddingVertical: space[4],
    alignItems: "center",
    gap: space[2],
    ...shadow.sm,
  },
  quickLabel: { fontSize: 13, fontWeight: "800", color: C.text },
});
