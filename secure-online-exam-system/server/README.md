# Server README

## Using MongoDB Compass (quick guide)

This project uses a local MongoDB for development and testing. MongoDB Compass is a GUI you can use to inspect collections, documents, and indexes quickly.

Connection string (local test DB):

```
mongodb://127.0.0.1:27017/soe_test
```

How to connect

1. Open MongoDB Compass.
2. Click "New Connection" (or File → Connect).
3. Paste the connection string above into the connection field and connect.
4. Expand the `soe_test` database to browse collections such as `users`, `exams`, and `results`.

Useful quick queries

- Show all results for a particular user id (replace <userId>):

  Filter: `{ "user": { "$oid": "<userId>" } }`  (or just `{ "user": "<userId>" }` depending on how you view ObjectIds)

- Find exams with a given title:

  Filter: `{ "title": "Integration Exam" }`

- See recent results (most recent first):

  Options → Sort: `{ "createdAt": -1 }`

Notes on encrypted question fields

- `exam.questions` stores AES-encrypted strings. The server encrypts plaintext questions on create; if you view an exam document in Compass you will see ciphertext values (start with `U2FsdGVkX1` for CryptoJS AES output).
- To see decrypted questions, use the server endpoint `GET /api/exams/:id` which returns decrypted questions.

Install Compass on macOS (Homebrew cask):

```bash
brew install --cask mongodb-compass
```

Security tips

- Avoid pointing Compass at production with admin credentials from your laptop. For production inspection, create a read-only user scoped to the specific database.
- Never commit credentials (username/password, connection strings with secrets) into source control.

If you want, I can add a short script that prints the local connection string or opens Compass on macOS using the connection URL.
