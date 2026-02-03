import { encrypt, decrypt } from "../utils/encryption.js";

// Re-implement the scoring logic used by resultController for the smoke test
const prepareEncryptedQuestions = () => {
  // Question 0: simple string correct answer "A"
  const q0 = encrypt("A");

  // Question 1: JSON metadata with weight and partials
  const meta1 = JSON.stringify({
    correctAnswer: "Photosynthesis",
    weight: 2,
    partials: [
      { match: "photo", score: 0.5 },
      { match: "synthesis", score: 0.5 }
    ]
  });
  const q1 = encrypt(meta1);

  // Question 2: JSON with weight only
  const meta2 = JSON.stringify({ correctAnswer: "42", weight: 3 });
  const q2 = encrypt(meta2);

  return [q0, q1, q2];
};

const scoreSubmission = (encryptedQuestions, answers) => {
  const decrypted = encryptedQuestions.map(q => {
    try {
      const raw = decrypt(q);
      const parsed = JSON.parse(raw);
      return parsed;
    } catch (e) {
      return { correctAnswer: decrypt(q), weight: 1 };
    }
  });

  let totalPossible = 0;
  let totalAwarded = 0;
  const records = [];

  for (const a of answers) {
    const meta = decrypted[a.questionIndex] ?? { correctAnswer: null, weight: 1 };
    const correct = meta.correctAnswer ?? null;
    const weight = typeof meta.weight === "number" ? meta.weight : 1;
    totalPossible += weight;

    let awarded = 0;
    if (correct !== null && String(a.answer).trim() === String(correct).trim()) {
      awarded = weight;
    } else if (meta.partials && Array.isArray(meta.partials)) {
      for (const p of meta.partials) {
        if (!p || typeof p.match !== "string") continue;
        if (String(a.answer).toLowerCase().includes(p.match.toLowerCase())) {
          awarded += (typeof p.score === "number" ? p.score : 0) * weight;
        }
      }
      if (awarded > weight) awarded = weight;
    }

    totalAwarded += awarded;
    records.push({ questionIndex: a.questionIndex, answer: a.answer, correctAnswer: correct, weight, awarded });
  }

  // include unanswered questions
  for (let i = 0; i < decrypted.length; i++) {
    if (!records.find(r => r.questionIndex === i)) {
      const meta = decrypted[i] ?? { correctAnswer: null, weight: 1 };
      const w = typeof meta.weight === "number" ? meta.weight : 1;
      totalPossible += w;
      records.push({ questionIndex: i, answer: null, correctAnswer: meta.correctAnswer ?? null, weight: w, awarded: 0 });
    }
  }

  return { records, totalAwarded, totalPossible };
};

(async () => {
  const encrypted = prepareEncryptedQuestions();

  const answers = [
    { questionIndex: 0, answer: "A" }, // full
    { questionIndex: 1, answer: "photo process" }, // partial -> contains "photo" -> 0.5 * weight(2) = 1
    { questionIndex: 2, answer: "41" } // wrong
  ];

  const { records, totalAwarded, totalPossible } = scoreSubmission(encrypted, answers);

  console.log("Records:", records);
  console.log("Score awarded:", totalAwarded);
  console.log("Total possible:", totalPossible);

  // Expected: q0 awarded 1, q1 awarded 1 (0.5*2), q2 awarded 0; totalPossible = 1+2+3=6, totalAwarded = 2
  const expectedTotalPossible = 6;
  const expectedTotalAwarded = 2;

  if (totalPossible === expectedTotalPossible && Math.abs(totalAwarded - expectedTotalAwarded) < 1e-6) {
    console.log("SMOKE TEST PASS");
    process.exit(0);
  } else {
    console.error("SMOKE TEST FAIL", { totalAwarded, totalPossible });
    process.exit(2);
  }
})();
