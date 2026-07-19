# AskPDF

AskPDF is a full-stack RAG-powered PDF Q&A app. Users upload a PDF, a separate worker extracts and embeds its content, and the chat endpoint streams grounded answers from Google Gemini while refusing weak-context questions.

## Stack

- Node.js + Express API
- Separate Node.js worker process
- MongoDB for documents and embedded chunks
- Redis list queue with `RPUSH` / `BRPOP`
- Redis job hashes for progress tracking
- Google Gemini embeddings and streaming generation
- React + Vite + Tailwind CSS frontend

## Requirements

- Node.js 20+
- MongoDB (local or Atlas)
- Redis (local or hosted)
- Gemini API key

## Local setup

```bash
npm install
cp .env.example .env
```

Edit `.env` and set at least:

- `GEMINI_API_KEY`
- `MONGODB_URI`
- `REDIS_URL`
- `CLIENT_ORIGIN` (usually `http://localhost:5173`)
- `VITE_API_URL` (usually `http://localhost:4000`)

`MONGODB_URI` can be either:

- Local or standard MongoDB URI: `mongodb://127.0.0.1:27017/askpdf`
- Atlas SRV URI: `mongodb+srv://user:password@cluster.mongodb.net/askpdf?...`
- Atlas standard non-SRV URI: `mongodb://host1:27017,host2:27017,host3:27017/askpdf?ssl=true&replicaSet=...`

If an Atlas `mongodb+srv://` URI fails with a DNS SRV error on Windows, AskPDF forces Node.js DNS to Google resolvers first. If it still fails, copy the non-SRV standard connection string from MongoDB Atlas: Connect > Drivers > standard connection string.

Start MongoDB and Redis. With Docker:

```bash
docker run --name askpdf-mongo -p 27017:27017 -d mongo:7
docker run --name askpdf-redis -p 6379:6379 -d redis:7
```

Run the API, worker, and frontend in separate terminals:

```bash
npm run server
npm run worker
npm run client
```

Or all at once:

```bash
npm run dev:all
```

Open `http://localhost:5173`.

## API

### Upload

`POST /api/documents/upload`

Multipart field: `pdf`

Returns `202 Accepted`:

```json
{ "jobId": "...", "documentId": "...", "status": "queued" }
```

### Status

`GET /api/documents/status/:jobId`

Returns Redis hash progress plus the Mongo document state.

### Chat

`POST /api/chat`

```json
{
  "documentId": "...",
  "question": "What does this document say about revenue?",
  "conversationHistory": []
}
```

Streams Server-Sent Events:

- `metadata`: selected source chunks
- `token`: generated text chunks
- `done`: completion
- `low_confidence`: no strong document match
- `error`: request or provider failure

## Pipeline

1. API validates PDF type and 20MB limit, stores it temporarily, creates a Mongo document, writes `job:{jobId}` in Redis, and `RPUSH`es a job.
2. Worker blocks on Redis with `BRPOP`, so it waits without busy polling.
3. Worker parses PDF text with page metadata.
4. Text is split into overlapping chunks.
5. Chunks are embedded with Gemini `gemini-embedding-001` (`outputDimensionality: 768`).
6. Chunks and 768-dimensional vectors are saved in MongoDB.
7. Document and Redis hash status are updated through `queued`, `processing`, `parsing`, `chunking`, `embedding`, `indexing`, and `ready` or `failed`.

## Vector Search

The implementation includes a local cosine-similarity fallback that works with ordinary MongoDB. This makes the demo runnable without Atlas. If you use Atlas Vector Search, the chunk schema is already compatible with a vector index over `embedding`, and the vector search service is isolated in `backend/src/services/vectorSearchService.js`.

## Production deployment

### Backend on Render (two services)

This repo includes a root [`render.yaml`](./render.yaml) Blueprint that defines:

| Service | Type | Start command |
|---|---|---|
| `askpdf-api` | Web | `npm run server` |
| `askpdf-worker` | Background Worker | `npm run worker` |

**Deploy steps**

1. Push this repo to GitHub.
2. In Render, create a new Blueprint from the repo (or create the two services manually using the same build/start commands).
3. Provision managed MongoDB (e.g. Atlas) and Redis (e.g. Redis Cloud / Upstash) — Render free web disks are ephemeral, so do not rely on local Mongo/Redis.
4. Set the same secrets on **both** the web and worker services (see summary below).
5. After the web service is live, copy its public URL (e.g. `https://askpdf-api.onrender.com`).

Manual service settings if not using the Blueprint:

- **Build command:** `npm install`
- **Web start:** `npm run server`
- **Worker start:** `npm run worker`
- **Health check (web):** `/health`

### Frontend on Vercel

1. Import the same GitHub repo into Vercel.
2. Set:
   - **Framework preset:** Vite
   - **Build command:** `npm run build`
   - **Output directory:** `dist`
   - **Install command:** `npm install`
3. Add environment variable `VITE_API_URL` = your Render web service URL (no trailing slash), e.g. `https://askpdf-api.onrender.com`.
4. Deploy, then copy the Vercel URL.
5. Set `CLIENT_ORIGIN` on **both** Render services to that Vercel URL (e.g. `https://askpdf.vercel.app`) and redeploy the API so CORS allows the frontend.

### Environment variables checklist

**Render — `askpdf-api` (web)**

| Variable | Required | Notes |
|---|---|---|
| `GEMINI_API_KEY` | Yes | Google Gemini API key |
| `MONGODB_URI` | Yes | Atlas / hosted Mongo connection string |
| `REDIS_URL` | Yes | Hosted Redis URL (must match worker) |
| `CLIENT_ORIGIN` | Yes | Exact Vercel frontend origin |
| `PORT` | Auto | Render injects this — do not hardcode |
| `UPLOAD_DIR` | Optional | Defaults to `uploads` |
| `QUEUE_NAME` | Optional | Must match worker (`askpdf:jobs`) |
| `JOB_STALE_MINUTES` | Optional | Default `30` |
| `SIMILARITY_THRESHOLD` | Optional | Default `0.55` (calibrated for `gemini-embedding-001` @ 768-d) |
| `TOP_K` | Optional | Default `5` |

**Render — `askpdf-worker` (worker)**

Same as the web service for: `GEMINI_API_KEY`, `MONGODB_URI`, `REDIS_URL`, `CLIENT_ORIGIN`, `UPLOAD_DIR`, `QUEUE_NAME`, `JOB_STALE_MINUTES`, `SIMILARITY_THRESHOLD`, `TOP_K`.

`REDIS_URL`, `MONGODB_URI`, and `QUEUE_NAME` must be identical on both services so the API can enqueue jobs the worker consumes.

**Vercel — frontend**

| Variable | Required | Notes |
|---|---|---|
| `VITE_API_URL` | Yes | Exact Render web URL, no trailing slash |

`VITE_API_URL` is baked in at build time. If you change the API URL, redeploy the frontend.

### Values that must match

- Render `REDIS_URL` (api) = Render `REDIS_URL` (worker)
- Render `MONGODB_URI` (api) = Render `MONGODB_URI` (worker)
- Render `QUEUE_NAME` (api) = Render `QUEUE_NAME` (worker)
- Vercel `VITE_API_URL` = Render web service public URL
- Render `CLIENT_ORIGIN` (both) = Vercel frontend origin

## Cleanup

The worker runs cleanup on startup and then periodically. It marks stale `processing` documents as `failed` and deletes partial chunks for unfinished documents so failed runs do not accumulate orphan embeddings.
