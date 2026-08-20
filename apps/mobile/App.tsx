import { useEffect, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { API, completeExerciseSession, fetchAppointments, fetchPlans, signIn } from "./src/api";
import { BottomNav } from "./src/components/BottomNav";
import { AppointmentsScreen } from "./src/screens/AppointmentsScreen";
import { ConsultScreen } from "./src/screens/ConsultScreen";
import { HelpScreen } from "./src/screens/HelpScreen";
import { HomeScreen } from "./src/screens/HomeScreen";
import { LandingScreen } from "./src/screens/LandingScreen";
import { LoginScreen } from "./src/screens/LoginScreen";
import { MoveScreen } from "./src/screens/MoveScreen";
import { MoveSuccessScreen } from "./src/screens/MoveSuccessScreen";
import { PlanScreen } from "./src/screens/PlanScreen";
import { SplashScreenView } from "./src/screens/SplashScreenView";
import { C } from "./src/theme";
import type {
  Appointment,
  AuthRoute,
  AuthSession,
  PatientRoute,
  PatientTab,
  Plan,
  PlanItem,
} from "./src/types";

export default function App() {
  const [appReady, setAppReady] = useState(false);
  const [authRoute, setAuthRoute] = useState<AuthRoute>("landing");
  const [patientRoute, setPatientRoute] = useState<PatientRoute>({ name: "tab", tab: "home" });
  const [email, setEmail] = useState("kamala@stride.clinic");
  const [password, setPassword] = useState("StrideClinic1!");
  const [loginError, setLoginError] = useState("");
  const [signingIn, setSigningIn] = useState(false);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loadError, setLoadError] = useState("");
  const [banner, setBanner] = useState("");
  const [moveError, setMoveError] = useState("");
  const [savingMove, setSavingMove] = useState(false);

  useEffect(() => {
    async function prepare() {
      await new Promise((resolve) => setTimeout(resolve, 900));
      setAppReady(true);
    }
    prepare();
  }, []);

  const activeExercise = useMemo<PlanItem | null>(() => {
    if (patientRoute.name !== "move") return null;
    return plan?.items.find((item) => item.id === patientRoute.exerciseId) ?? null;
  }, [patientRoute, plan]);

  const consultAppointment = useMemo<Appointment | null>(() => {
    if (patientRoute.name !== "consult") return null;
    if (patientRoute.appointmentId === "demo") return null;
    return appointments.find((item) => item.id === patientRoute.appointmentId) ?? null;
  }, [appointments, patientRoute]);

  async function loadPatientData(token: string) {
    const [plans, appts] = await Promise.all([fetchPlans(token), fetchAppointments(token)]);
    setPlan(plans[0] ?? null);
    setAppointments(appts);
    setLoadError("");
  }

  async function handleSignIn() {
    if (signingIn) return;
    setLoginError("");
    setSigningIn(true);
    console.log(`[Stride] UI: Sign in pressed · API=${API}`);
    try {
      const next = await signIn(email, password);
      setSession(next);
      await loadPatientData(next.access_token);
      setPatientRoute({ name: "tab", tab: "home" });
      setBanner("");
      console.log("[Stride] UI: signed in and patient data loaded");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Sign in failed.";
      console.error(`[Stride] UI: sign in error → ${message}`);
      setLoginError(message);
    } finally {
      setSigningIn(false);
    }
  }

  function signOut() {
    setSession(null);
    setPlan(null);
    setAppointments([]);
    setBanner("");
    setLoadError("");
    setMoveError("");
    setAuthRoute("landing");
    setPatientRoute({ name: "tab", tab: "home" });
  }

  function goToTab(tab: PatientTab) {
    setPatientRoute({ name: "tab", tab });
    setMoveError("");
  }

  async function handleFinishMove(reps: number, notes: string) {
    if (!session || patientRoute.name !== "move") return;
    setSavingMove(true);
    setMoveError("");
    try {
      await completeExerciseSession(session.access_token, patientRoute.exerciseId, reps, notes);
      setPatientRoute({ name: "moveSuccess" });
    } catch (err) {
      setMoveError(err instanceof Error ? err.message : "Could not save this session.");
    } finally {
      setSavingMove(false);
    }
  }

  function renderPatientScreen() {
    switch (patientRoute.name) {
      case "tab":
        if (patientRoute.tab === "home") {
          return (
            <HomeScreen
              fullName={session!.full_name}
              plan={plan}
              appointments={appointments}
              banner={banner}
              onSignOut={signOut}
              onOpenAppointments={() => setPatientRoute({ name: "appointments" })}
              onOpenConsult={(id) => setPatientRoute({ name: "consult", appointmentId: id })}
              onStartExercise={(id) => setPatientRoute({ name: "move", exerciseId: id })}
              onSeeAllExercises={() => goToTab("plan")}
            />
          );
        }
        if (patientRoute.tab === "plan") {
          return (
            <PlanScreen
              plan={plan}
              error={loadError}
              onStartExercise={(id) => setPatientRoute({ name: "move", exerciseId: id })}
            />
          );
        }
        return <HelpScreen />;
      case "appointments":
        return (
          <AppointmentsScreen
            appointments={appointments}
            error={loadError}
            onBack={() => goToTab("home")}
            onJoinConsult={(id) => setPatientRoute({ name: "consult", appointmentId: id })}
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
            onDone={() => {
              setBanner("Saved. Your physiotherapist will review this.");
              goToTab("home");
            }}
          />
        );
      case "consult":
        return (
          <ConsultScreen
            appointmentId={patientRoute.appointmentId}
            displayName={session!.full_name}
            appointment={consultAppointment}
            onLeave={() => goToTab("home")}
          />
        );
    }
  }

  if (!appReady) {
    return (
      <SafeAreaProvider>
        <StatusBar style="light" />
        <SplashScreenView />
      </SafeAreaProvider>
    );
  }

  const showBottomNav =
    session &&
    patientRoute.name === "tab" &&
    (patientRoute.tab === "home" || patientRoute.tab === "plan" || patientRoute.tab === "help");

  const isLanding = !session && authRoute === "landing";
  const isConsult = session && patientRoute.name === "consult";

  return (
    <SafeAreaProvider>
      <SafeAreaView
        style={[
          styles.safe,
          isLanding && styles.safeLanding,
          isConsult && styles.safeConsult,
        ]}
        edges={isConsult ? [] : undefined}
      >
        <StatusBar style={isLanding || isConsult ? "light" : "dark"} />
        {!session ? (
          authRoute === "landing" ? (
            <LandingScreen onGetStarted={() => setAuthRoute("login")} />
          ) : (
            <LoginScreen
              email={email}
              password={password}
              error={loginError}
              loading={signingIn}
              apiUrl={API}
              onEmailChange={setEmail}
              onPasswordChange={setPassword}
              onSignIn={handleSignIn}
              onBack={() => !signingIn && setAuthRoute("landing")}
            />
          )
        ) : (
          <View style={styles.shell}>
            <View style={styles.content}>{renderPatientScreen()}</View>
            {showBottomNav ? (
              <BottomNav
                active={patientRoute.tab}
                onChange={(tab) => goToTab(tab)}
              />
            ) : null}
          </View>
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  safeLanding: { backgroundColor: C.primary },
  safeConsult: { backgroundColor: "#0F172A" },
  shell: { flex: 1 },
  content: { flex: 1 },
});
