import "react-native-reanimated";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  AppState,
  BackHandler,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import {
  useFonts,
  Nunito_400Regular,
  Nunito_500Medium,
  Nunito_600SemiBold,
  Nunito_700Bold,
  Nunito_800ExtraBold,
} from "@expo-google-fonts/nunito";
import {
  API,
  completeExerciseSession,
  fetchAppointments,
  fetchMyTherapist,
  fetchObservations,
  fetchPatients,
  fetchPlans,
  fetchProfile,
  fetchSessions,
  signIn,
  type ObservationRow,
  type PatientSummary,
} from "./src/api";
import { BottomNav } from "./src/components/BottomNav";
import { LoadingBlock } from "./src/components/AsyncState";
import { SessionStoreHost } from "./src/components/SessionStoreHost";
import { AccountScreen } from "./src/screens/AccountScreen";
import { AppointmentsScreen } from "./src/screens/AppointmentsScreen";
import { ConsultScreen } from "./src/screens/ConsultScreen";
import { ForgotPasswordScreen } from "./src/screens/ForgotPasswordScreen";
import { HelpScreen } from "./src/screens/HelpScreen";
import { HomeScreen } from "./src/screens/HomeScreen";
import { LandingScreen } from "./src/screens/LandingScreen";
import { LoginScreen } from "./src/screens/LoginScreen";
import { MoveScreen } from "./src/screens/MoveScreen";
import { MoveSuccessScreen } from "./src/screens/MoveSuccessScreen";
import { PatientOnboardingScreen } from "./src/screens/PatientOnboardingScreen";
import { PendingApprovalScreen } from "./src/screens/PendingApprovalScreen";
import { PlanScreen } from "./src/screens/PlanScreen";
import { ProgressScreen } from "./src/screens/ProgressScreen";
import { SignUpScreen } from "./src/screens/SignUpScreen";
import { SplashScreenView } from "./src/screens/SplashScreenView";
import { TherapistHomeScreen } from "./src/screens/TherapistHomeScreen";
import { TherapistOnboardingScreen } from "./src/screens/TherapistOnboardingScreen";
import { VerifyOtpScreen } from "./src/screens/VerifyOtpScreen";
import {
  clearSession,
  loadStoredSession,
  saveSession,
} from "./src/sessionStore";
import { userFacingError } from "./src/lib/userFacingError";
import { C } from "./src/theme";
import type {
  Appointment,
  AuthRoute,
  AuthSession,
  PatientRoute,
  PatientTab,
  Plan,
  PlanItem,
  ExerciseSession,
  TherapistContact,
  UserProfile,
} from "./src/types";

export default function App() {
  const [fontsLoaded] = useFonts({
    Nunito_400Regular,
    Nunito_500Medium,
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
  });
  const [appReady, setAppReady] = useState(false);
  const [authRoute, setAuthRoute] = useState<AuthRoute>("landing");
  const [patientRoute, setPatientRoute] = useState<PatientRoute>({
    name: "tab",
    tab: "home",
  });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [signingIn, setSigningIn] = useState(false);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [sessions, setSessions] = useState<ExerciseSession[]>([]);
  const [observations, setObservations] = useState<ObservationRow[]>([]);
  const [therapist, setTherapist] = useState<TherapistContact | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<PatientSummary[]>([]);
  const [loadError, setLoadError] = useState("");
  const [dataLoading, setDataLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [banner, setBanner] = useState("");
  const [moveError, setMoveError] = useState("");
  const [savingMove, setSavingMove] = useState(false);
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const tokenRef = useRef<string | null>(null);
  tokenRef.current = session?.access_token ?? null;

  useEffect(() => {
    async function prepare() {
      // Give the WebView storage bridge a moment to bind.
      await new Promise((resolve) => setTimeout(resolve, 250));
      const stored = await loadStoredSession();
      if (stored) {
        try {
          if (!stored.status || stored.status === "active") {
            setSession(stored);
            if (stored.email) setEmail(stored.email);
            if (stored.role === "physiotherapist") {
              await loadTherapistData(stored.access_token);
            } else {
              await loadPatientData(stored.access_token);
            }
            setPatientRoute({ name: "tab", tab: "home" });
            setAuthRoute("landing");
          } else if (stored.status === "pending_email") {
            setSession(stored);
            if (stored.email) setEmail(stored.email);
            setAuthRoute("verifyOtp");
          } else if (stored.status === "pending_onboarding") {
            setSession(stored);
            if (stored.email) setEmail(stored.email);
            setAuthRoute("onboarding");
          } else if (stored.status === "pending_approval") {
            setSession(stored);
            if (stored.email) setEmail(stored.email);
            setAuthRoute("pendingApproval");
          } else {
            await clearSession();
            setSession(null);
          }
          console.log("[Stride] Restored saved session");
        } catch (err) {
          console.warn("[Stride] Stored session invalid — clearing", err);
          await clearSession();
          setSession(null);
        }
      }
      setAppReady(true);
    }
    prepare();
  }, []);

  // Android system back: navigate in-app first instead of killing the app.
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      const inPatientApp =
        !!session &&
        (!session.status || session.status === "active") &&
        authRoute !== "verifyOtp" &&
        authRoute !== "onboarding";

      if (!inPatientApp) {
        if (authRoute === "login") {
          setAuthRoute("landing");
          return true;
        }
        if (authRoute === "forgot" || authRoute === "signup") {
          setAuthRoute("login");
          return true;
        }
        if (authRoute === "verifyOtp") {
          setAuthRoute("login");
          return true;
        }
        if (authRoute === "onboarding") {
          return true;
        }
        return false;
      }

      if (patientRoute.name === "consult") {
        setPatientRoute({ name: "tab", tab: "home" });
        return true;
      }
      if (patientRoute.name === "move") {
        Alert.alert(
          "Leave this exercise?",
          "Your session is not saved yet. Leave without saving?",
          [
            { text: "Stay", style: "cancel" },
            {
              text: "Leave",
              style: "destructive",
              onPress: () => {
                setMoveError("");
                setPatientRoute({ name: "tab", tab: "plan" });
              },
            },
          ],
        );
        return true;
      }
      if (patientRoute.name === "moveSuccess") {
        setPatientRoute({ name: "tab", tab: "home" });
        return true;
      }
      if (
        patientRoute.name === "appointments" ||
        patientRoute.name === "progress"
      ) {
        setPatientRoute({ name: "tab", tab: "home" });
        return true;
      }
      if (patientRoute.name === "account") {
        setPatientRoute({ name: "tab", tab: "home" });
        return true;
      }
      if (patientRoute.name === "tab" && patientRoute.tab !== "home") {
        setPatientRoute({ name: "tab", tab: "home" });
        return true;
      }
      // On home: allow default (minimize / leave)
      return false;
    });
    return () => sub.remove();
  }, [session, authRoute, patientRoute]);

  const activeExercise = useMemo<PlanItem | null>(() => {
    if (patientRoute.name !== "move") return null;
    return (
      plan?.items.find((item) => item.id === patientRoute.exerciseId) ?? null
    );
  }, [patientRoute, plan]);

  const consultAppointment = useMemo<Appointment | null>(() => {
    if (patientRoute.name !== "consult") return null;
    return (
      appointments.find((item) => item.id === patientRoute.appointmentId) ??
      null
    );
  }, [appointments, patientRoute]);

  async function loadPatientData(token: string, opts?: { silent?: boolean }) {
    if (!opts?.silent) setDataLoading(true);
    try {
      const [
        plans,
        appts,
        sessionRows,
        observationRows,
        therapistContact,
        userProfile,
      ] = await Promise.all([
        fetchPlans(token),
        fetchAppointments(token),
        fetchSessions(token),
        fetchObservations(token).catch(() => [] as ObservationRow[]),
        fetchMyTherapist(token),
        fetchProfile(token),
      ]);
      setPlan(plans[0] ?? null);
      setAppointments(appts);
      setSessions(sessionRows);
      setObservations(observationRows);
      setTherapist(therapistContact);
      setProfile(userProfile);
      if (userProfile.email) setEmail(userProfile.email);
      setSession((prev) => {
        if (!prev) return prev;
        const next = {
          ...prev,
          full_name: userProfile.full_name || prev.full_name,
          email: userProfile.email || prev.email,
          status: userProfile.status || prev.status,
        };
        void saveSession(next).catch(() => undefined);
        return next;
      });
      setLoadError("");
    } catch (err) {
      const message = userFacingError(
        err,
        "Could not load your rehabilitation.",
      );
      if (
        message.toLowerCase().includes("session has expired") ||
        message.toLowerCase().includes("sign in again")
      ) {
        await signOut();
        setLoginError("Your session expired. Please sign in again.");
        setAuthRoute("login");
        return;
      }
      if (!opts?.silent) setLoadError(message);
    } finally {
      if (!opts?.silent) setDataLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    const sub = AppState.addEventListener("change", (next) => {
      if (next !== "active") return;
      const token = tokenRef.current;
      if (!token) return;
      void loadPatientData(token, { silent: true });
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!session?.access_token) return;
    if (patientRoute.name !== "tab") return;
    const timer = setInterval(() => {
      const token = tokenRef.current;
      if (!token) return;
      void loadPatientData(token, { silent: true });
    }, 20000);
    return () => clearInterval(timer);
  }, [session?.access_token, patientRoute.name]);

  function withEmail(next: AuthSession, fallbackEmail?: string): AuthSession {
    const emailValue = (fallbackEmail || next.email || email || "")
      .trim()
      .toLowerCase();
    return emailValue ? { ...next, email: emailValue } : next;
  }

  async function loadTherapistData(token: string, opts?: { silent?: boolean }) {
    if (!opts?.silent) setDataLoading(true);
    try {
      const [patientRows, appts, userProfile] = await Promise.all([
        fetchPatients(token),
        fetchAppointments(token),
        fetchProfile(token),
      ]);
      setPatients(patientRows);
      setAppointments(appts);
      setProfile(userProfile);
      if (userProfile.email) setEmail(userProfile.email);
      setSession((prev) => {
        if (!prev) return prev;
        const next = {
          ...prev,
          full_name: userProfile.full_name || prev.full_name,
          email: userProfile.email || prev.email,
          status: userProfile.status || prev.status,
        };
        void saveSession(next).catch(() => undefined);
        return next;
      });
      setLoadError("");
    } catch (err) {
      const message = userFacingError(
        err,
        "Could not load your clinic workspace.",
      );
      if (
        message.toLowerCase().includes("session has expired") ||
        message.toLowerCase().includes("sign in again")
      ) {
        await signOut();
        setLoginError("Your session expired. Please sign in again.");
        setAuthRoute("login");
        return;
      }
      if (!opts?.silent) setLoadError(message);
    } finally {
      if (!opts?.silent) setDataLoading(false);
      setRefreshing(false);
    }
  }

  async function activateSession(next: AuthSession) {
    const enriched = withEmail(next);
    try {
      await saveSession(enriched);
    } catch (err) {
      console.warn("[Stride] Could not persist session", err);
    }
    setSession(enriched);
    if (enriched.email) setEmail(enriched.email);
    setPassword("");
    if (enriched.role === "physiotherapist") {
      await loadTherapistData(enriched.access_token);
    } else {
      await loadPatientData(enriched.access_token);
    }
    setPatientRoute({ name: "tab", tab: "home" });
    setBanner("");
    setMoveError("");
    setAuthRoute("landing");
  }

  function routeByStatus(next: AuthSession, fallbackEmail?: string) {
    const enriched = withEmail(next, fallbackEmail);
    setSession(enriched);
    void saveSession(enriched).catch(() => undefined);
    if (enriched.email) setEmail(enriched.email);
    if (!enriched.status || enriched.status === "active") {
      void activateSession(enriched);
      return;
    }
    if (enriched.status === "pending_email") {
      setAuthRoute("verifyOtp");
      return;
    }
    if (enriched.status === "pending_onboarding") {
      setAuthRoute("onboarding");
      return;
    }
    if (enriched.status === "pending_approval") {
      setAuthRoute("pendingApproval");
      return;
    }
    setLoginError(`Account status: ${enriched.status.replace(/_/g, " ")}.`);
    setAuthRoute("login");
  }

  async function handleSignIn() {
    if (signingIn) return;
    setLoginError("");
    setSigningIn(true);
    console.log(`[Stride] UI: Sign in pressed · API=${API}`);
    try {
      const next = await signIn(email, password);
      if (next.role === "admin") {
        setLoginError("Admin accounts use the Stride web app.");
        return;
      }
      routeByStatus(next, email.trim().toLowerCase());
      console.log("[Stride] UI: signed in");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Sign in failed.";
      console.error(`[Stride] UI: sign in error → ${message}`);
      setLoginError(message);
    } finally {
      setSigningIn(false);
    }
  }

  async function signOut() {
    await clearSession();
    setSession(null);
    setPlan(null);
    setSessions([]);
    setObservations([]);
    setTherapist(null);
    setProfile(null);
    setAppointments([]);
    setPatients([]);
    setBanner("");
    setLoadError("");
    setMoveError("");
    setPassword("");
    setSigningIn(false);
    setAuthRoute("landing");
    setPatientRoute({ name: "tab", tab: "home" });
  }

  function goToTab(tab: PatientTab) {
    setPatientRoute({ name: "tab", tab });
    setMoveError("");
    if (tab !== "home") setBanner("");
    if (session?.access_token) {
      void loadPatientData(session.access_token, { silent: true });
    }
  }

  function handlePullRefresh() {
    if (!session?.access_token) return;
    setRefreshing(true);
    if (session.role === "physiotherapist") {
      void loadTherapistData(session.access_token, { silent: true });
    } else {
      void loadPatientData(session.access_token, { silent: true });
    }
  }

  async function handleFinishMove(reps: number, notes: string) {
    if (!session || patientRoute.name !== "move" || savingMove) return;
    setSavingMove(true);
    setMoveError("");
    try {
      await completeExerciseSession(
        session.access_token,
        patientRoute.exerciseId,
        reps,
        notes,
      );
      await loadPatientData(session.access_token);
      setPatientRoute({ name: "moveSuccess" });
    } catch (err) {
      setMoveError(userFacingError(err, "Could not save this session."));
    } finally {
      setSavingMove(false);
    }
  }

  function openAccount() {
    setBanner("");
    setPatientRoute({ name: "account" });
    if (session && !profile) {
      void loadPatientData(session.access_token);
    }
  }

  function renderPatientScreen() {
    switch (patientRoute.name) {
      case "tab":
        if (patientRoute.tab === "home") {
          if (session!.role === "physiotherapist") {
            return (
              <TherapistHomeScreen
                fullName={session!.full_name}
                patients={patients}
                appointments={appointments}
                banner={banner}
                error={loadError}
                onOpenAccount={openAccount}
                onOpenAppointments={() => {
                  setPatientRoute({ name: "appointments" });
                  if (session)
                    void loadTherapistData(session.access_token, {
                      silent: true,
                    });
                }}
                onOpenConsult={(id) =>
                  setPatientRoute({ name: "consult", appointmentId: id })
                }
              />
            );
          }
          return (
            <HomeScreen
              fullName={session!.full_name}
              plan={plan}
              sessions={sessions}
              appointments={appointments}
              therapist={therapist}
              loading={dataLoading}
              refreshing={refreshing}
              error={loadError}
              banner={banner}
              onRefresh={handlePullRefresh}
              onRetry={() => {
                if (session) void loadPatientData(session.access_token);
              }}
              onOpenAccount={openAccount}
              onOpenAppointments={() => {
                setPatientRoute({ name: "appointments" });
                if (session)
                  void loadPatientData(session.access_token, { silent: true });
              }}
              onOpenConsult={(id) =>
                setPatientRoute({ name: "consult", appointmentId: id })
              }
              onStartExercise={(id) =>
                setPatientRoute({ name: "move", exerciseId: id })
              }
              onSeeAllExercises={() => goToTab("plan")}
              onOpenProgress={() => {
                setPatientRoute({ name: "progress" });
                if (session)
                  void loadPatientData(session.access_token, { silent: true });
              }}
            />
          );
        }
        if (patientRoute.tab === "plan") {
          return (
            <PlanScreen
              plan={plan}
              sessions={sessions}
              therapist={therapist}
              loading={dataLoading}
              refreshing={refreshing}
              error={loadError}
              onOpenAccount={openAccount}
              onRefresh={handlePullRefresh}
              onRetry={() => {
                if (session) void loadPatientData(session.access_token);
              }}
              onStartExercise={(id) =>
                setPatientRoute({ name: "move", exerciseId: id })
              }
            />
          );
        }
        return <HelpScreen therapist={therapist} onOpenAccount={openAccount} />;
      case "account":
        if (!session) return null;
        if (dataLoading && !profile) {
          return <LoadingBlock label="Loading your account…" />;
        }
        if (!profile) {
          return (
            <View style={{ padding: 24, flex: 1, justifyContent: "center" }}>
              <Text
                style={{
                  color: C.danger,
                  fontWeight: "700",
                  marginBottom: 12,
                  fontSize: 16,
                }}
              >
                {loadError || "Could not load your account."}
              </Text>
              <Pressable
                style={{
                  minHeight: 48,
                  backgroundColor: C.primary,
                  borderRadius: 999,
                  alignItems: "center",
                  justifyContent: "center",
                }}
                onPress={() => {
                  if (session) void loadPatientData(session.access_token);
                }}
              >
                <Text style={{ color: "white", fontWeight: "700" }}>
                  Try again
                </Text>
              </Pressable>
              <Pressable
                onPress={() => goToTab("home")}
                style={{ marginTop: 16 }}
              >
                <Text
                  style={{
                    color: C.primary,
                    fontWeight: "700",
                    textAlign: "center",
                  }}
                >
                  Back to home
                </Text>
              </Pressable>
            </View>
          );
        }
        return (
          <AccountScreen
            profile={profile}
            therapist={therapist}
            plan={plan}
            accessToken={session.access_token}
            onBack={() => goToTab("home")}
            onLogout={signOut}
            onViewPlan={() => goToTab("plan")}
            onProfileUpdated={(next) => {
              setProfile(next);
              setSession((prev) =>
                prev
                  ? { ...prev, full_name: next.full_name || prev.full_name }
                  : prev,
              );
            }}
            onTherapistChanged={(next) => setTherapist(next)}
          />
        );
      case "appointments":
        return (
          <AppointmentsScreen
            appointments={appointments}
            loading={dataLoading}
            error={loadError}
            onRetry={() => {
              if (session) void loadPatientData(session.access_token);
            }}
            onBack={() => goToTab("home")}
            onJoinConsult={(id) =>
              setPatientRoute({ name: "consult", appointmentId: id })
            }
          />
        );
      case "progress":
        return (
          <ProgressScreen
            plan={plan}
            sessions={sessions}
            observations={observations}
            loading={dataLoading}
            error={loadError}
            onRetry={() => {
              if (session) void loadPatientData(session.access_token);
            }}
            onBack={() => goToTab("home")}
            onOpenPlan={() => goToTab("plan")}
          />
        );
      case "move":
        return (
          <MoveScreen
            key={patientRoute.exerciseId}
            item={activeExercise}
            saving={savingMove}
            error={moveError}
            onBack={() => goToTab("plan")}
            onFinish={handleFinishMove}
          />
        );
      case "moveSuccess":
        return (
          <MoveSuccessScreen
            onDone={async () => {
              if (session) await loadPatientData(session.access_token);
              setBanner("Saved. Your physiotherapist will review this.");
              goToTab("home");
            }}
            onViewProgress={() => setPatientRoute({ name: "progress" })}
          />
        );
      case "consult":
        return (
          <ConsultScreen
            appointmentId={patientRoute.appointmentId}
            accessToken={session!.access_token}
            appointment={consultAppointment}
            role={session!.role}
            onLeave={() => goToTab("home")}
          />
        );
    }
  }

  const showBottomNav =
    session &&
    (!session.status || session.status === "active") &&
    patientRoute.name === "tab" &&
    (patientRoute.tab === "home" ||
      patientRoute.tab === "plan" ||
      patientRoute.tab === "help");

  const patientAppReady =
    !!session &&
    (!session.status || session.status === "active") &&
    authRoute !== "verifyOtp" &&
    authRoute !== "onboarding" &&
    authRoute !== "pendingApproval";

  const isLanding = !patientAppReady && authRoute === "landing";
  const isConsult = patientAppReady && patientRoute.name === "consult";
  const isMoveFullscreen = patientAppReady && patientRoute.name === "move";
  const immersiveMedia = isConsult || isMoveFullscreen;

  function renderAuthScreen() {
    if (authRoute === "landing") {
      return <LandingScreen onGetStarted={() => setAuthRoute("login")} />;
    }
    if (authRoute === "forgot") {
      return (
        <ForgotPasswordScreen
          initialEmail={email}
          onBack={() => setAuthRoute("login")}
        />
      );
    }
    if (authRoute === "signup") {
      return (
        <SignUpScreen
          onBack={() => setAuthRoute("login")}
          onGoLogin={() => setAuthRoute("login")}
          onRegistered={(next, registeredEmail) => {
            setEmail(registeredEmail);
            setPassword("");
            setDevOtp(next.dev_code ?? null);
            routeByStatus(next, registeredEmail);
          }}
        />
      );
    }
    if (authRoute === "verifyOtp") {
      return (
        <VerifyOtpScreen
          email={email}
          initialDevCode={devOtp}
          onBack={() => setAuthRoute("login")}
          onVerified={(next) => {
            setDevOtp(null);
            routeByStatus(next, email);
          }}
        />
      );
    }
    if (authRoute === "onboarding" && session) {
      if (session.role === "physiotherapist") {
        return (
          <TherapistOnboardingScreen
            accessToken={session.access_token}
            onComplete={(next) => {
              void activateSession(next);
            }}
          />
        );
      }
      return (
        <PatientOnboardingScreen
          accessToken={session.access_token}
          onComplete={(next) => {
            void activateSession(next);
          }}
        />
      );
    }
    if (authRoute === "pendingApproval" && session) {
      return (
        <PendingApprovalScreen
          session={session}
          email={email}
          password={password}
          onApproved={(next) => {
            void activateSession(next);
          }}
          onSignOut={() => {
            void signOut();
          }}
        />
      );
    }
    return (
      <LoginScreen
        email={email}
        password={password}
        error={loginError}
        loading={signingIn}
        onEmailChange={setEmail}
        onPasswordChange={setPassword}
        onSignIn={handleSignIn}
        onBack={() => !signingIn && setAuthRoute("landing")}
        onForgotPassword={() => setAuthRoute("forgot")}
        onSignUp={() => setAuthRoute("signup")}
      />
    );
  }

  return (
    <SafeAreaProvider>
      <SessionStoreHost />
      {!appReady || !fontsLoaded ? (
        <>
          <StatusBar style="light" />
          <SplashScreenView />
        </>
      ) : (
        <SafeAreaView
          style={[
            styles.safe,
            isLanding && styles.safeLanding,
            !patientAppReady && authRoute !== "landing" && styles.safeAuth,
            isConsult && styles.safeConsult,
            isMoveFullscreen && styles.safeConsult,
          ]}
          edges={immersiveMedia ? [] : undefined}
        >
          <StatusBar style={immersiveMedia ? "light" : "dark"} />
          {!patientAppReady ? (
            renderAuthScreen()
          ) : (
            <View style={styles.shell}>
              <View style={styles.content}>{renderPatientScreen()}</View>
              {showBottomNav ? (
                <BottomNav
                  active={patientRoute.tab}
                  role={session!.role}
                  onChange={(tab) => goToTab(tab)}
                />
              ) : null}
            </View>
          )}
        </SafeAreaView>
      )}
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  safeLanding: { backgroundColor: "#FFFFFF" },
  safeAuth: { backgroundColor: C.bg },
  safeConsult: { backgroundColor: "#0F172A" },
  shell: { flex: 1 },
  content: { flex: 1 },
});
