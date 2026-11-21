import io
import numpy as np
from pypdf import PdfReader
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from google import genai
from google.genai import types
from gtts import gTTS
from agri_kb import DEFAULT_AGRI_POLICIES


def extract_text_from_pdf(uploaded_file) -> str:
    reader = PdfReader(uploaded_file)
    pages_text = []
    for idx, page in enumerate(reader.pages):
        text = page.extract_text() or ""
        if text.strip():
            pages_text.append(f"[Page {idx + 1}]\n{text.strip()}")
    return "\n\n".join(pages_text)


def chunk_text(text: str, source_title: str, chunk_size: int = 900, overlap: int = 150) -> list[dict]:
    words = text.split()
    chunks = []
    step = max(1, chunk_size - overlap)
    for i in range(0, len(words), step):
        segment = " ".join(words[i : i + chunk_size])
        if segment.strip():
            chunks.append({"source": source_title, "text": segment})
    return chunks


class AgriRAGAgent:
    def __init__(self, api_key: str):
        self.client = genai.Client(api_key=api_key)
        self.documents = []
        for item in DEFAULT_AGRI_POLICIES:
            self.documents.extend(chunk_text(item["content"], f"{item['title']} ({item['category']})"))
        self._rebuild_index()

    def add_uploaded_document(self, title: str, raw_text: str):
        new_chunks = chunk_text(raw_text, f"Uploaded Advisory: {title}")
        self.documents.extend(new_chunks)
        self._rebuild_index()
        return len(new_chunks)

    def _rebuild_index(self):
        corpus = [f"{d['source']} {d['text']}" for d in self.documents]
        self.vectorizer = TfidfVectorizer(stop_words="english", ngram_range=(1, 2))
        self.tfidf_matrix = self.vectorizer.fit_transform(corpus)

    def retrieve(self, query: str, top_k: int = 4) -> list[dict]:
        query_vec = self.vectorizer.transform([query])
        scores = cosine_similarity(query_vec, self.tfidf_matrix).flatten()
        top_indices = np.argsort(scores)[::-1][:top_k]
        results = []
        for idx in top_indices:
            results.append({
                "source": self.documents[idx]["source"],
                "text": self.documents[idx]["text"],
                "score": float(scores[idx]),
            })
        return results

    def generate_response(self, user_query: str, target_language: str, farmer_profile: str = "") -> tuple[str, list[dict]]:
        retrieved = self.retrieve(user_query, top_k=4)
        context_block = "\n\n---\n\n".join(
            [f"SOURCE: {r['source']}\nCONTENT:\n{r['text']}" for r in retrieved]
        )

        system_instruction = f"""
        You are Annadata AI, an empathetic and expert agricultural advisory assistant built for Indian farmers.
        Your job is to translate complex climate, soil, and market guidelines into crystal-clear, actionable advice.

        RULES:
        1. Ground your answer strictly in the PROVIDED AGRICULTURAL CONTEXT below.
        2. Write the ENTIRE response in **{target_language}** using simple, everyday farming language.
        3. Structure your response with these sections:
           - **Simple Summary** (2-3 plain sentences)
           - **Actionable Farming Advisory** (Bullet points based on farmer profile)
           - **Market & Resource Tips**
        4. Cite the exact source name(s) at the end.
        """

        prompt = f"""
        FARMER PROFILE: {farmer_profile}
        FARMER QUESTION: {user_query}
        AGRICULTURAL CONTEXT:
        {context_block}
        """

        response = self.client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                temperature=0.2,
            ),
        )
        return response.text, retrieved


def synthesize_voice(text: str, lang_code: str) -> bytes | None:
    clean_text = text.replace("*", "").replace("#", "").replace("-", " ")[:1800]
    try:
        tts = gTTS(text=clean_text, lang=lang_code, slow=False)
        audio_buffer = io.BytesIO()
        tts.write_to_fp(audio_buffer)
        audio_buffer.seek(0)
        return audio_buffer.read()
    except Exception:
        return None
