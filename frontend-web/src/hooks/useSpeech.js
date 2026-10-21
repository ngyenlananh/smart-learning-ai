import { useEffect, useRef, useState } from "react";

export function useSpeechRecognition(lang = "vi-VN", onResult, onError) {
  const recognitionRef = useRef(null);
  const [listening, setListening] = useState(false);
  const supported = typeof window !== "undefined" && Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);

  useEffect(() => {
    if (!supported) return undefined;
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new Recognition();
    recognition.lang = lang;
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results).map((result) => result[0]?.transcript ?? "").join("");
      onResult?.(transcript, event.results[event.results.length - 1]?.isFinal ?? false);
    };
    recognition.onerror = (event) => {
      setListening(false);
      onError?.(event.error === "not-allowed" ? "Bạn chưa cấp quyền sử dụng micro." : "Không thể nhận diện giọng nói.");
    };
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    return () => {
      recognition.abort();
      recognitionRef.current = null;
    };
  }, [lang, onError, onResult, supported]);

  function start() {
    if (!recognitionRef.current || listening) return;
    try {
      recognitionRef.current.start();
      setListening(true);
    } catch {
      onError?.("Không thể bắt đầu ghi âm.");
    }
  }

  function stop() {
    recognitionRef.current?.stop();
    setListening(false);
  }

  return { supported, listening, start, stop };
}

export function speak(text, lang = "vi-VN") {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  const voices = window.speechSynthesis.getVoices();
  utterance.voice = voices.find((voice) => voice.lang.toLowerCase().startsWith("vi")) ?? null;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

export function stopSpeaking() {
  if (typeof window !== "undefined" && window.speechSynthesis) window.speechSynthesis.cancel();
}
