Result verifier

- New endpoint: POST /api/results/verify (protected)

Exam question storage:
- Each entry in `exam.questions` is encrypted with AES and should contain either:
  - a plain correct answer string (e.g. "A"), or
  - a JSON string, e.g.:
    {
      "correctAnswer": "42",
      "weight": 2,
      "partials": [
        { "match": "part of answer", "score": 0.5 },
        { "match": "another hint", "score": 0.25 }
      ]
    }

- The verifier decrypts each question entry, parses JSON when present, and computes awarded points per question.
- `score` is the sum of awarded points; `total` is the sum of weights.

Submit payload example:
{
  "examId": "<exam id>",
  "answers": [
    { "questionIndex": 0, "answer": "my answer" },
    { "questionIndex": 1, "answer": "another" }
  ]
}

Response:
{
  "result": { ... saved result document ... },
  "score": 3.5,
  "total": 5
}
