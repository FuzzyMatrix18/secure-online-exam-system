import Result from "../models/Result.js";
import Exam from "../models/Exam.js";
import { decrypt } from "../utils/encryption.js";

// Contract:
// - input: req.body { examId, answers: [{ questionIndex, answer }] }
// - output: saved Result document with score
// - error modes: exam not found, malformed payload

export const verifyAndSave = async (req, res) => {
	const { examId, answers } = req.body;
	if (!examId || !Array.isArray(answers))
		return res.status(400).json({ message: "examId and answers required" });

	const exam = await Exam.findById(examId);
	if (!exam) return res.status(404).json({ message: "Exam not found" });

	// Decrypt stored question metadata. We allow exam.questions to be either:
	// - an encrypted string containing the correct answer, or
	// - an encrypted JSON string: { correctAnswer: "A", weight: 2, partials: [{ match: "part", score: 0.5 }] }
	const decrypted = exam.questions.map(q => {
		try {
			const raw = decrypt(q);
			// try parse JSON
			const parsed = JSON.parse(raw);
			return parsed;
		} catch (e) {
			// not JSON, treat as simple correctAnswer
			return { correctAnswer: decrypt(q), weight: 1 };
		}
	});

	let totalPossible = 0;
	let totalAwarded = 0;

	const answerRecords = answers.map(a => {
		const meta = decrypted[a.questionIndex] ?? { correctAnswer: null, weight: 1 };
		const correct = meta.correctAnswer ?? null;
		const weight = typeof meta.weight === "number" ? meta.weight : 1;
		totalPossible += weight;

		let awarded = 0;

		// exact match -> full points
		if (correct !== null && String(a.answer).trim() === String(correct).trim()) {
			awarded = weight;
		} else if (meta.partials && Array.isArray(meta.partials)) {
			// partials: array of { match, score } where score is fraction of weight (0..1)
			for (const p of meta.partials) {
				if (!p || typeof p.match !== "string") continue;
				if (String(a.answer).toLowerCase().includes(p.match.toLowerCase())) {
					awarded += (typeof p.score === "number" ? p.score : 0) * weight;
				}
			}
			// cap awarded to weight
			if (awarded > weight) awarded = weight;
		}

		totalAwarded += awarded;

		return {
			questionIndex: a.questionIndex,
			answer: a.answer,
			correctAnswer: correct,
			weight,
			awarded
		};
	});

	// If some questions were not answered, still include them as zero-awarded
	// (optional) Add missing question records
	for (let i = 0; i < decrypted.length; i++) {
		if (!answerRecords.find(r => r.questionIndex === i)) {
			const meta = decrypted[i] ?? { correctAnswer: null, weight: 1 };
			totalPossible += typeof meta.weight === "number" ? meta.weight : 1;
			answerRecords.push({ questionIndex: i, answer: null, correctAnswer: meta.correctAnswer ?? null, weight: meta.weight ?? 1, awarded: 0 });
		}
	}

	const result = await Result.create({
		exam: exam._id,
		user: req.user.id,
		answers: answerRecords,
		score: totalAwarded,
		total: totalPossible
	});

	res.json({ result, score: totalAwarded, total: totalPossible });
};

export const listMyResults = async (req, res) => {
	const results = await Result.find({ user: req.user.id })
		.sort({ createdAt: -1 })
		.populate("exam", "title")
		.lean();
	res.json(results);
};

export const listLeaderboard = async (_req, res) => {
	const results = await Result.find()
		.sort({ score: -1 })
		.populate("user", "email")
		.lean();

	const best = new Map();
	for (const r of results) {
		const userId = r.user?._id?.toString() || r.user?.toString();
		if (!userId) continue;
		const current = best.get(userId);
		if (!current || current.score < r.score) {
			best.set(userId, {
				user: r.user?.email || "Anonymous",
				score: r.score,
				total: r.total
			});
		}
	}

	const top = Array.from(best.values())
		.sort((a, b) => b.score - a.score)
		.slice(0, 10);

	res.json(top);
};
