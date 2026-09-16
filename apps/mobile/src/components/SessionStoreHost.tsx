import { useEffect, useRef } from "react";
import { StyleSheet, View } from "react-native";
import { WebView, type WebViewMessageEvent } from "react-native-webview";
import { bindSessionBridge } from "../sessionStore";

const HTML = `<!DOCTYPE html>
<html>
  <body>
    <script>
      (function () {
        function reply(msg) {
          window.ReactNativeWebView.postMessage(JSON.stringify(msg));
        }
        function onMessage(event) {
          var data = event.data;
          try {
            var msg = typeof data === "string" ? JSON.parse(data) : data;
            if (!msg || !msg.id) return;
            if (msg.type === "get") {
              reply({ id: msg.id, ok: true, value: localStorage.getItem(msg.key) });
            } else if (msg.type === "set") {
              localStorage.setItem(msg.key, msg.value);
              reply({ id: msg.id, ok: true });
            } else if (msg.type === "remove") {
              localStorage.removeItem(msg.key);
              reply({ id: msg.id, ok: true });
            }
          } catch (err) {
            reply({ id: (msg && msg.id) || "x", ok: false, error: String(err) });
          }
        }
        document.addEventListener("message", onMessage);
        window.addEventListener("message", onMessage);
        reply({ type: "ready" });
      })();
    </script>
  </body>
</html>`;

type Pending = {
  resolve: (value: string | null | void) => void;
  reject: (reason?: unknown) => void;
};

/**
 * Invisible WebView used as durable localStorage (already in the Dev Client).
 * Avoids @react-native-async-storage which needs a native rebuild.
 */
export function SessionStoreHost() {
  const webRef = useRef<WebView>(null);
  const pending = useRef<Map<string, Pending>>(new Map());
  const ready = useRef(false);
  const queue = useRef<string[]>([]);
  const idRef = useRef(0);

  function post(raw: string) {
    if (!ready.current) {
      queue.current.push(raw);
      return;
    }
    webRef.current?.postMessage(raw);
  }

  function call(type: "get" | "set" | "remove", key: string, value?: string) {
    const id = `s${++idRef.current}`;
    const payload = JSON.stringify({ id, type, key, value });
    return new Promise<string | null | void>((resolve, reject) => {
      pending.current.set(id, { resolve, reject });
      post(payload);
      setTimeout(() => {
        if (pending.current.has(id)) {
          pending.current.delete(id);
          reject(new Error("Session storage timed out"));
        }
      }, 4000);
    });
  }

  useEffect(() => {
    bindSessionBridge({
      getItem: async (key) => (await call("get", key)) as string | null,
      setItem: async (key, value) => {
        await call("set", key, value);
      },
      removeItem: async (key) => {
        await call("remove", key);
      },
    });
  }, []);

  function onMessage(event: WebViewMessageEvent) {
    try {
      const msg = JSON.parse(event.nativeEvent.data) as {
        type?: string;
        id?: string;
        ok?: boolean;
        value?: string | null;
        error?: string;
      };
      if (msg.type === "ready") {
        ready.current = true;
        for (const raw of queue.current.splice(0)) {
          webRef.current?.postMessage(raw);
        }
        return;
      }
      if (!msg.id) return;
      const entry = pending.current.get(msg.id);
      if (!entry) return;
      pending.current.delete(msg.id);
      if (msg.ok === false) entry.reject(new Error(msg.error || "storage error"));
      else entry.resolve(msg.value ?? null);
    } catch {
      // ignore malformed
    }
  }

  return (
    <View style={styles.host} pointerEvents="none">
      <WebView
        ref={webRef}
        originWhitelist={["*"]}
        source={{ html: HTML, baseUrl: "https://stride.local/" }}
        onMessage={onMessage}
        javaScriptEnabled
        domStorageEnabled
        style={styles.web}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  host: { width: 0, height: 0, overflow: "hidden", opacity: 0 },
  web: { width: 1, height: 1 },
});
