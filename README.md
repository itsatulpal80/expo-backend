# Pharmacy Management Backend

Production-ready Node.js backend for auth, OCR invoice parsing, stock updates, and dashboard APIs.

## Setup

1. Copy `.env.example` to `.env`
2. Fill required env variables
3. Install dependencies:
   - `npm install`
4. Run:
   - `npm run dev`

## API Routes

- `POST /auth/register`
- `POST /auth/login`
- `POST /ocr/scan` (Bearer token + `image` multipart or `base64Image` in body)
- `GET /stock`
- `GET /stock/:id`
- `POST /stock/add-from-ocr`
- `GET /dashboard`

## Notes

- OCR supports OpenAI (`gpt-4o-mini`) or Gemini (`gemini-1.5-flash`).
- Cloudinary upload is optional.
- Uses JWT auth, rate limiting, logging, and Zod validation.
