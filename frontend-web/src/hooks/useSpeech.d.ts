export type SpeechRecognitionResult = (text: string, isFinal: boolean) => void;
export function useSpeechRecognition(lang?: string, onResult?: SpeechRecognitionResult, onError?: (message: string) => void): { supported: boolean; listening: boolean; start: () => void; stop: () => void };
export function speak(text: string, lang?: string): void;
export function stopSpeaking(): void;
