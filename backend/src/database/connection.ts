import mongoose from "mongoose";

export async function connectDatabase(): Promise<void> {
	const uri = process.env.MONGODB_URI;
	if (!uri) {
		console.warn("MONGODB_URI is not configured; dashboard uses demo data.");
		return;
	}

	try {
		await mongoose.connect(uri);
		console.log("MongoDB connected");
	} catch (error) {
		console.warn("MongoDB connection failed; dashboard uses demo data.", error);
	}
}
