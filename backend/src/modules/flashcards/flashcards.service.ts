import mongoose from "mongoose";
import { getQuizSet, quizSets } from "./quiz-data.js";

type Language = { id: string; name: string; locale: string; flagCode: string };
export type Flashcard = {
	id: string;
	language: string;
	languageName: string;
	locale: string;
	flagUrl: string;
	term: string;
	pronunciation: string;
	meaning: string;
	visual: string;
	position: number;
	total: number;
};

export type FlashcardDeck = {
	id: string;
	courseId?: string;
	title: string;
	cardType: "single" | "quiz";
	kind: "language" | "quiz";
	ownerId?: string;
	learned: number;
	total: number;
	due: number;
	status: "learning" | "mastered";
};

const demoDecks: FlashcardDeck[] = [
	...quizSets.map((set) => ({ id: set.id, courseId: set.id.replace("deck-", "course-"), title: set.title, cardType: "quiz" as const, kind: "quiz" as const, learned: 0, total: set.cards.length, due: 0, status: "learning" as const })),
	{ id: "deck-english", courseId: "course-english-toeic", title: "Luyện thi toeic", cardType: "single", kind: "language", learned: 0, total: 50, due: 0, status: "learning" },
];

export type QuizFlashcard = {
	id: string;
	setId: string;
	type: "quiz";
	question: string;
	options: [string, string, string, string];
	correctIndex: number;
	explanation: string;
	position: number;
	total: number;
};

export async function getMyFlashcardDecks(userId: string): Promise<FlashcardDeck[]> {
	if (mongoose.connection.readyState !== 1) return demoDecks;
	const storedDecks = await mongoose.connection.collection("flashcard_decks").find({ userId }).sort({ createdAt: 1 }).toArray();
	if (storedDecks.length) {
		const normalizedDecks = storedDecks.map((deck) => normalizeDeck(deck));
		const existingIds = new Set(normalizedDecks.map((deck) => deck.id));
		const missingQuizDecks = demoDecks.filter((deck) => deck.kind === "quiz" && !existingIds.has(deck.id));
		return applyQuizProgress([...normalizedDecks, ...missingQuizDecks], userId);
	}

	const user = mongoose.isValidObjectId(userId)
		? await mongoose.connection.collection("users").findOne({ _id: new mongoose.Types.ObjectId(userId) })
		: null;
	const enrolledCourseIds = Array.isArray(user?.enrolledCourseIds) ? user.enrolledCourseIds : [];
	const courses = await mongoose.connection.collection("courses").find({ _id: { $in: enrolledCourseIds } }).toArray();
	const decks = courses.map((course) => makeDeckFromCourse(course)).filter((deck): deck is FlashcardDeck => Boolean(deck));
	return decks.length ? applyQuizProgress([...decks.map((deck) => ({ ...deck, cardType: deck.cardType ?? (deck.kind === "quiz" ? "quiz" : "single"), kind: deck.kind ?? "language" })), ...demoDecks.filter((deck) => deck.kind === "quiz")], userId) : demoDecks;
}

async function applyQuizProgress(decks: FlashcardDeck[], userId: string): Promise<FlashcardDeck[]> {
	const quizReviews = mongoose.connection.collection("flashcard_quiz_reviews");
	return Promise.all(decks.map(async (deck) => {
		const quizSet = getQuizSet(deck.id);
		if (!quizSet) return deck;
		const learned = await quizReviews.countDocuments({ userId, setId: deck.id });
		return { ...deck, cardType: "quiz" as const, kind: "quiz" as const, learned, total: deck.total || quizSet.cards.length, due: 0, status: learned >= (deck.total || quizSet.cards.length) ? "mastered" as const : "learning" as const };
	}));
}

export async function getQuizFlashcards(setId: string, userId: string): Promise<QuizFlashcard[] | undefined> {
	const set = getQuizSet(setId);
	const storedDeck = mongoose.connection.readyState === 1 ? await mongoose.connection.collection("flashcard_decks").findOne({ id: setId, userId }) : null;
	if (!set && !storedDeck) return undefined;
	if (mongoose.connection.readyState === 1) {
		const collection = mongoose.connection.collection("flashcard_quiz_cards");
		let records = await collection.find({ setId }).sort({ position: 1 }).toArray();
		if (!records.length && set) {
			await collection.insertMany(set.cards.map((quizCard, index) => ({ ...quizCard, id: `${setId}-${index + 1}`, setId, type: "quiz", position: index + 1, total: set.cards.length, createdAt: new Date() })));
			records = await collection.find({ setId }).sort({ position: 1 }).toArray();
		}
		const reviews = await mongoose.connection.collection("flashcard_quiz_reviews").find({ userId, setId }).toArray();
		const reviewed = new Set(reviews.map((review) => Number(review.position)));
		return records.map((record) => ({ ...record, id: record.id ?? `${setId}-${record.position}`, reviewed: reviewed.has(record.position) })) as unknown as QuizFlashcard[];
	}
	return set?.cards.map((quizCard, index) => ({ ...quizCard, id: `${setId}-${index + 1}`, setId, type: "quiz" as const, position: index + 1, total: set.cards.length })) ?? [];
}

export async function getQuizProgress(setId: string, userId: string) {
	const set = getQuizSet(setId);
	const deck = mongoose.connection.readyState === 1 ? await mongoose.connection.collection("flashcard_decks").findOne({ id: setId, userId }) : null;
	if (!set && !deck) return undefined;
	const learned = mongoose.connection.readyState === 1 ? await mongoose.connection.collection("flashcard_quiz_reviews").countDocuments({ userId, setId }) : 0;
	const total = set?.cards.length ?? Number(deck?.total ?? 0);
	return { learned, total, label: `${learned}/${total} thẻ · ${learned ? "đã học" : "chưa học"}` };
}

export async function reviewQuizFlashcard(setId: string, userId: string, position: number) {
	const set = getQuizSet(setId);
	const deck = mongoose.connection.readyState === 1 ? await mongoose.connection.collection("flashcard_decks").findOne({ id: setId, userId }) : null;
	const total = set?.cards.length ?? Number(deck?.total ?? 0);
	if ((!set && !deck) || position < 1 || position > total) return undefined;
	if (mongoose.connection.readyState === 1) await mongoose.connection.collection("flashcard_quiz_reviews").updateOne({ userId, setId, position }, { $set: { userId, setId, position, reviewedAt: new Date() } }, { upsert: true });
	return { setId, position, reviewed: true };
}

export async function createFlashcardDeck(userId: string, input: { title?: string; courseId?: string; cardType?: "single" | "quiz" }): Promise<FlashcardDeck | undefined> {
	const title = input.title?.trim();
	if (!title) return undefined;
	const cardType = input.cardType === "single" ? "single" : "quiz";
	const deck: FlashcardDeck = { id: `deck-${Date.now()}`, courseId: input.courseId, title, cardType, kind: cardType === "quiz" ? "quiz" : "language", ownerId: userId, learned: 0, total: 0, due: 0, status: "learning" };
	if (mongoose.connection.readyState === 1) await mongoose.connection.collection("flashcard_decks").insertOne({ ...deck, userId, createdAt: new Date() });
	return deck;
}

export type UpdateDeckResult = { status: "updated"; deck: FlashcardDeck } | { status: "not-found" | "forbidden" | "invalid" | "duplicate"; error?: string };

export async function updateFlashcardDeck(setId: string, userId: string, input: { title?: string }): Promise<UpdateDeckResult> {
	if (mongoose.connection.readyState !== 1) return { status: "not-found" };
	const title = input.title?.trim() ?? "";
	if (!title || title.length > 100) return { status: "invalid", error: "Tên bộ thẻ phải dài từ 1 đến 100 ký tự" };
	const collection = mongoose.connection.collection("flashcard_decks");
	const deck = await collection.findOne({ id: setId });
	if (!deck) return { status: "not-found" };
	if (deck.userId !== userId) return { status: "forbidden" };
	const duplicate = await collection.findOne({ userId, id: { $ne: setId }, title: { $regex: `^${escapeRegExp(title)}$`, $options: "i" } });
	if (duplicate) return { status: "duplicate", error: "Tên bộ thẻ đã tồn tại" };
	await collection.updateOne({ id: setId, userId }, { $set: { title, updatedAt: new Date() } });
	return { status: "updated", deck: normalizeDeck({ ...deck, title }) };
}

export async function getFlashcardSet(setId: string, userId: string): Promise<FlashcardDeck | undefined> {
	const stored = mongoose.connection.readyState === 1 ? await mongoose.connection.collection("flashcard_decks").findOne({ id: setId, userId }) : null;
	if (stored) return normalizeDeck(stored);
	return demoDecks.find((deck) => deck.id === setId);
}

export async function deleteFlashcardSet(setId: string, userId: string): Promise<"deleted" | "not-found" | "forbidden"> {
	if (mongoose.connection.readyState !== 1) return "not-found";
	const collection = mongoose.connection.collection("flashcard_decks");
	const deck = await collection.findOne({ id: setId });
	if (!deck) return "not-found";
	if (deck.userId !== userId) return "forbidden";
	await collection.deleteOne({ id: setId, userId });
	await mongoose.connection.collection("flashcard_quiz_cards").deleteMany({ setId });
	await mongoose.connection.collection("flashcards").deleteMany({ setId, userId });
	await mongoose.connection.collection("flashcard_quiz_reviews").deleteMany({ setId, userId });
	await mongoose.connection.collection("flashcard_reviews").deleteMany({ setId, userId });
	await mongoose.connection.collection("flashcard_set_documents").deleteMany({ flashcardSetId: setId, userId });
	return "deleted";
}

function escapeRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeDeck(deck: Record<string, unknown>): FlashcardDeck {
	const cardType = deck.cardType === "single" || deck.card_type === "single" ? "single" : (deck.cardType === "quiz" || deck.card_type === "quiz" || quizSets.some((set) => set.id === deck.id) ? "quiz" : "single");
	return { id: String(deck.id ?? deck._id ?? ""), courseId: typeof deck.courseId === "string" ? deck.courseId : undefined, title: String(deck.title ?? "Bộ thẻ"), cardType, kind: cardType === "quiz" ? "quiz" : "language", ownerId: typeof deck.userId === "string" ? deck.userId : undefined, learned: Number(deck.learned ?? 0), total: Number(deck.total ?? 0), due: Number(deck.due ?? 0), status: deck.status === "mastered" ? "mastered" : "learning" };
}

function makeDeckFromCourse(course: Record<string, unknown>): FlashcardDeck | undefined {
	const courseId = String(course._id ?? "");
	const sourceTitle = String(course.title ?? "");
	let title = sourceTitle;
	let total = Number(course.totalLessons ?? course.flashcardTotal ?? 20);
	let learned = Number(course.completedLessons ?? Math.round(Number(course.progressPercent ?? 0) * total / 100));
	let due = Math.min(8, Math.max(0, total - learned));
	if (courseId === "course-english-toeic" || sourceTitle.toLowerCase().includes("tiếng anh") || sourceTitle.toLowerCase().includes("toeic")) title = sourceTitle || "Luyện thi toeic";

	learned = Math.max(0, Math.min(total, learned));
	return { id: `deck-${courseId || title}`, courseId, title, cardType: "single", kind: "language", learned, total, due, status: learned >= total ? "mastered" : "learning" };
}

const languages: Language[] = [
	{ id: "en", name: "English", locale: "en-US", flagCode: "gb" },
	{ id: "zh", name: "中文", locale: "zh-CN", flagCode: "cn" },
	{ id: "ko", name: "한국어", locale: "ko-KR", flagCode: "kr" },
	{ id: "th", name: "ไทย", locale: "th-TH", flagCode: "th" },
	{ id: "fil", name: "FILIPINO", locale: "fil-PH", flagCode: "ph" },
	{ id: "ja", name: "日本語", locale: "ja-JP", flagCode: "jp" },
	{ id: "de", name: "DEUTSCH", locale: "de-DE", flagCode: "de" },
	{ id: "fr", name: "FRANÇAIS", locale: "fr-FR", flagCode: "fr" },
	{ id: "es", name: "ESPAÑOL", locale: "es-ES", flagCode: "es" },
	{ id: "it", name: "ITALIANO", locale: "it-IT", flagCode: "it" },
];
const terms = ["hello", "thank you", "please", "sorry", "goodbye", "yes", "no", "sure", "good", "bad", "water", "food", "house", "school", "book", "friend", "family", "day", "night", "today", "tomorrow", "yesterday", "time", "place", "person", "name", "love", "like", "want", "need", "know", "understand", "speak", "listen", "read", "write", "learn", "work", "go", "come", "buy", "sell", "eat", "drink", "sleep", "wake up", "help", "beautiful", "important"];
const meanings = ["xin chào", "cảm ơn", "làm ơn", "xin lỗi", "tạm biệt", "có", "không", "vâng", "tốt", "xấu", "nước", "đồ ăn", "nhà", "trường học", "sách", "bạn bè", "gia đình", "ngày", "đêm", "hôm nay", "ngày mai", "hôm qua", "thời gian", "nơi chốn", "người", "tên", "tình yêu", "thích", "muốn", "cần", "biết", "hiểu", "nói", "nghe", "đọc", "viết", "học", "làm việc", "đi", "đến", "mua", "bán", "ăn", "uống", "ngủ", "thức dậy", "giúp đỡ", "đẹp", "quan trọng"];
const visuals = ["👋", "🙏", "🤲", "🙇", "👋", "✅", "❌", "👍", "😊", "🙁", "💧", "🍜", "🏠", "🏫", "📖", "🧑‍🤝‍🧑", "👨‍👩‍👧", "☀️", "🌙", "📅", "🔜", "⏪", "⏰", "📍", "🧑", "🏷️", "❤️", "😍", "✨", "🛒", "💡", "🧠", "🗣️", "👂", "📚", "✍️", "🎓", "💼", "🚶", "👋", "🛍️", "🏷️", "🍽️", "🥤", "😴", "⏰", "🤝", "🌸", "⭐"];
const translatedTerms: Record<string, string[]> = {
	zh: ["你好", "谢谢", "请", "对不起", "再见", "是", "不", "当然", "好", "坏"],
	ko: ["안녕하세요", "감사합니다", "부탁합니다", "미안합니다", "안녕히 가세요", "네", "아니요", "물론", "좋다", "나쁘다"],
	th: ["สวัสดี", "ขอบคุณ", "กรุณา", "ขอโทษ", "ลาก่อน", "ใช่", "ไม่", "แน่นอน", "ดี", "ไม่ดี"],
	fil: ["kumusta", "salamat", "pakiusap", "paumanhin", "paalam", "oo", "hindi", "siyempre", "mabuti", "masama"],
	ja: ["こんにちは", "ありがとう", "お願いします", "すみません", "さようなら", "はい", "いいえ", "もちろん", "いい", "悪い"],
	de: ["hallo", "danke", "bitte", "entschuldigung", "auf Wiedersehen", "ja", "nein", "natürlich", "gut", "schlecht"],
	fr: ["bonjour", "merci", "s'il vous plaît", "désolé", "au revoir", "oui", "non", "bien sûr", "bon", "mauvais"],
	es: ["hola", "gracias", "por favor", "lo siento", "adiós", "sí", "no", "claro", "bueno", "malo"],
	it: ["ciao", "grazie", "per favore", "scusa", "arrivederci", "sì", "no", "certo", "buono", "cattivo"],
};

function getLanguage(id: string): Language | undefined { return languages.find((language) => language.id === id || language.name.toLowerCase() === id.toLowerCase()); }
function makeDemoCards(language: Language): Flashcard[] {
	const localizedTerms = translatedTerms[language.id];
	return terms.map((term, index) => {
		const displayTerm = language.id === "en" ? term : localizedTerms?.[index % localizedTerms.length] ?? term;
		return { id: `${language.id}-${index + 1}`, language: language.id, languageName: language.name, locale: language.locale, flagUrl: `https://flagcdn.com/w40/${language.flagCode}.png`, term: displayTerm, pronunciation: language.id === "en" ? ["həˈləʊ", "ˈθæŋk juː", "pliːz", "ˈsɒri", "ˌɡʊdˈbaɪ"][index] ?? `/${term}/` : `Cách đọc ${displayTerm}`, meaning: meanings[index], visual: visuals[index], position: index + 1, total: 50 };
	});
}

export function getLanguages() { return languages.map((language) => ({ ...language, total: 50, flagUrl: `https://flagcdn.com/w40/${language.flagCode}.png` })); }

export async function getFlashcards(languageId: string, userId: string, limit = 50, deckId?: string): Promise<Flashcard[]> {
	const language = getLanguage(languageId) ?? languages[0];
	if (mongoose.connection.readyState === 1) {
		const records = await mongoose.connection.collection("flashcards").find({ userId, language: language.id, ...(deckId ? { deckId } : {}) }).sort({ position: 1 }).limit(Math.min(limit, 500)).toArray();
		if (records.length) return records as unknown as Flashcard[];
	}

	return makeDemoCards(language).slice(0, Math.min(Math.max(limit, 1), 50));
}

export async function createFlashcard(userId: string, input: { language: string; deckId?: string; term: string; pronunciation: string; meaning: string; example: string; visual?: string }) {
	const language = getLanguage(input.language) ?? languages.find((item) => item.name === input.language);
	if (!language || !input.term?.trim() || !input.meaning?.trim() || !input.pronunciation?.trim()) return undefined;
	let position = 51;
	if (mongoose.connection.readyState === 1) {
		const last = await mongoose.connection.collection("flashcards").find({ userId, language: language.id, ...(input.deckId ? { deckId: input.deckId } : {}) }).sort({ position: -1 }).limit(1).next();
		position = Math.max(50, Number(last?.position ?? 50)) + 1;
	}
	const card = { id: `${language.id}-${position}-${Date.now()}`, userId, deckId: input.deckId, language: language.id, languageName: language.name, locale: language.locale, flagUrl: `https://flagcdn.com/w40/${language.flagCode}.png`, term: input.term.trim(), pronunciation: input.pronunciation.trim(), meaning: input.meaning.trim(), example: input.example?.trim() || `Tôi sử dụng từ “${input.meaning.trim()}” trong một câu.`, visual: input.visual?.trim() || "📚", position, total: position };
	if (mongoose.connection.readyState === 1) await mongoose.connection.collection("flashcards").insertOne(card);
	return card;
}

export async function deleteFlashcard(userId: string, languageId: string, position: number) {
	const language = getLanguage(languageId);
	if (!language || position < 1) return false;
	if (mongoose.connection.readyState === 1) {
		await mongoose.connection.collection("flashcards").deleteOne({ userId, language: language.id, position });
		await mongoose.connection.collection("flashcard_reviews").deleteMany({ userId, language: language.id, position });
	}
	return true;
}

export async function getFlashcard(languageId: string, position: number, userId: string): Promise<Flashcard | undefined> {
	const cards = await getFlashcards(languageId, userId, 50);
	return cards.find((card) => card.position === position);
}

export async function reviewFlashcard(userId: string, languageId: string, position: number, rating: number) {
	const language = getLanguage(languageId);
	if (!language || position < 1 || position > 50 || rating < 1 || rating > 3) return undefined;
	const payload = { userId, language: language.id, position, rating, reviewedAt: new Date() };
	if (mongoose.connection.readyState === 1) await mongoose.connection.collection("flashcard_reviews").insertOne(payload);
	return payload;
}

export async function getReviewSummary(userId: string, languageId: string) {
	const language = getLanguage(languageId);
	if (!language) return undefined;
	let reviews: Array<{ position: number; rating: number }> = [];
	if (mongoose.connection.readyState === 1) {
		reviews = await mongoose.connection.collection("flashcard_reviews").find({ userId, language: language.id }).sort({ reviewedAt: -1 }).toArray() as unknown as Array<{ position: number; rating: number }>;
	}
	const latest = new Map<number, number>();
	for (const review of reviews) if (!latest.has(review.position)) latest.set(review.position, review.rating);
	const counts = [...latest.values()].reduce((result, rating) => {
		if (rating === 3) result.mastered += 1;
		else if (rating === 2) result.uncertain += 1;
		else result.learning += 1;
		return result;
	}, { mastered: 0, uncertain: 0, learning: 0 });
	return { ...counts, reviewed: latest.size, total: 50, language: language.id };
}

export async function getDueSummary(userId: string, languageId?: string) {
	if (mongoose.connection.readyState !== 1) return { overdue: 0, due: 0, newCards: 0, total: 0 };
	const language = languageId ? getLanguage(languageId) : undefined;
	const cardFilter = { userId, ...(language ? { language: language.id } : {}) };
	const cards = await mongoose.connection.collection("flashcards").find(cardFilter).project({ language: 1, position: 1 }).toArray() as unknown as Array<{ language: string; position: number }>;
	const reviews = await mongoose.connection.collection("flashcard_reviews").find(cardFilter).sort({ reviewedAt: -1 }).toArray() as unknown as Array<{ language: string; position: number; rating: number }>;
	const latest = new Map<string, number>();
	for (const review of reviews) if (!latest.has(`${review.language}:${review.position}`)) latest.set(`${review.language}:${review.position}`, review.rating);
	const dueCards = cards.filter((card) => latest.get(`${card.language}:${card.position}`) !== 3);
	const newCards = dueCards.filter((card) => !latest.has(`${card.language}:${card.position}`)).length;
	const due = dueCards.length - newCards;
	return { overdue: due, due, newCards, total: dueCards.length };
}

export async function startReviewSession(userId: string, languageId: string) {
	const selectedLanguages = languageId === "all" ? languages : [getLanguage(languageId) ?? languages[0]];
	const cards = selectedLanguages.flatMap((language) => makeDemoCards(language));
	let ratings = new Map<string, number>();
	if (mongoose.connection.readyState === 1) {
		const reviews = await mongoose.connection.collection("flashcard_reviews").find({ userId, ...(languageId === "all" ? {} : { language: selectedLanguages[0].id }) }).sort({ reviewedAt: -1 }).toArray() as unknown as Array<{ language: string; position: number; rating: number }>;
		for (const review of reviews) if (!ratings.has(`${review.language}:${review.position}`)) ratings.set(`${review.language}:${review.position}`, review.rating);
	}
	const reviewCards = cards.map((card) => { const rating = ratings.get(`${card.language}:${card.position}`); return { ...card, reviewStatus: rating === 3 ? "mastered" : rating === 2 ? "uncertain" : rating === 1 ? "learning" : "new" }; }).filter((card) => card.reviewStatus === "learning" || card.reviewStatus === "uncertain").slice(0, 15);
	return { sessionId: `${userId}-${languageId}-${Date.now()}`, language: languageId, startedAt: new Date(), total: reviewCards.length, cards: reviewCards };
}

export async function getReviewQueue(userId: string, languageId?: string) {
	if (mongoose.connection.readyState !== 1) return [];
	const language = languageId ? getLanguage(languageId) : undefined;
	const reviews = await mongoose.connection.collection("flashcard_reviews").find({ userId, ...(language ? { language: language.id } : {}) }).sort({ reviewedAt: -1 }).toArray() as unknown as Array<{ language: string; position: number; rating: number }>;
	const latest = new Map<string, { language: string; position: number; rating: number }>();
	for (const review of reviews) {
		const key = `${review.language}:${review.position}`;
		if (!latest.has(key)) latest.set(key, review);
	}
	return [...latest.values()].filter((review) => review.rating === 1 || review.rating === 2);
}

export async function updateFlashcard(userId: string, languageId: string, position: number, meaning: string) {
	const language = getLanguage(languageId);
	if (!language || position < 1 || position > 50 || !meaning.trim()) return undefined;
	const existing = (await getFlashcard(language.id, position, userId)) ?? makeDemoCards(language)[position - 1];
	const update = { ...existing, meaning: meaning.trim(), updatedAt: new Date(), userId, language: language.id };
	if (mongoose.connection.readyState === 1) {
		await mongoose.connection.collection("flashcards").updateOne({ userId, language: language.id, position }, { $set: update }, { upsert: true });
	}
	return { ...existing, ...update };
}
