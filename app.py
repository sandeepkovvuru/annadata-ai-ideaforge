import os
import streamlit as st
from rag_engine import AgriRAGAgent, extract_text_from_pdf, synthesize_voice

st.set_page_config(
    page_title="Annadata AI | Multilingual Agritech Advisory",
    page_icon="🌾",
    layout="wide",
)

LANGUAGES = {
    "Telugu (తెలుగు)": "te",
    "Hindi (हिंदी)": "hi",
    "English": "en",
}

st.title("🌾 Annadata AI — Multilingual Agritech & Resource Advisory Assistant")
st.caption("Track 2: Climate, Resource Infrastructure & Global Supply Resilience | IDEA//FORGE 2026")

with st.sidebar:
    st.header("⚙️ Configuration")
    api_key = st.secrets.get("GEMINI_API_KEY", "") if hasattr(st, "secrets") else ""
    if not api_key:
        api_key = os.environ.get("GEMINI_API_KEY", "")
    if not api_key:
        api_key = st.text_input("Gemini API Key", type="password")

    selected_lang = st.selectbox("🌐 Output Language & Voice", list(LANGUAGES.keys()), index=0)
    enable_voice = st.checkbox("🔊 Voice Audio Playback", value=True)

    st.divider()
    st.subheader("👨‍🌾 Farmer Profile")
    region = st.text_input("Region / State", value="Andhra Pradesh / Telangana")
    soil_type = st.selectbox("Soil Type", ["Red Soil (ఎర్ర నేలలు)", "Black Cotton Soil (నల్ల రేగడి నేలలు)", "Alluvial Soil"])
    crop_grown = st.text_input("Current Crop", value="Paddy / Cotton / Millets")
    farmer_profile = f"Region: {region}, Soil Type: {soil_type}, Crop: {crop_grown}"

    st.divider()
    st.subheader("📄 Upload Agri PDF / Advisory")
    uploaded_pdf = st.file_uploader("Upload document", type=["pdf"])

if not api_key:
    st.warning("👈 దయచేసి సైడ్‌బార్‌లో మీ Gemini API Key ని ఎంటర్ చేయండి.")
    st.stop()

if "agent" not in st.session_state or st.session_state.get("active_key") != api_key:
    st.session_state.agent = AgriRAGAgent(api_key=api_key)
    st.session_state.active_key = api_key
    st.session_state.uploaded_files = set()

if uploaded_pdf is not None and uploaded_pdf.name not in st.session_state.uploaded_files:
    with st.spinner("Indexing PDF..."):
        extracted = extract_text_from_pdf(uploaded_pdf)
        if extracted.strip():
            chunks_added = st.session_state.agent.add_uploaded_document(uploaded_pdf.name, extracted)
            st.session_state.uploaded_files.add(uploaded_pdf.name)
            st.sidebar.success(f"Added {chunks_added} sections!")

st.markdown("### 💡 Quick Queries (క్లిక్ చేసి పరీక్షించండి)")
col1, col2 = st.columns(2)
sample_query = ""
with col1:
    if st.button("🌧️ Drought & Monsoon Advisory", use_container_width=True):
        sample_query = "వర్షాలు ఆలస్యమైతే లేదా కరువు పరిస్థితులు ఉంటే ఏ పంటలు వేయాలి? సలహా ఇవ్వండి."
with col2:
    if st.button("💰 Mandi Prices & Storage Tips", use_container_width=True):
        sample_query = "ధరలు పడిపోకుండా ఉండటానికి ఈ-నామ్ (E-NAM) మరియు పంట నిల్వ పద్ధతులు ఎలా?"

user_query = st.text_area("వ్యవసాయం లేదా వాతావరణం గురించి మీ ప్రశ్నను అడగండి:", value=sample_query, height=100)

if st.button("🚀 Get AI Advisory (సలహా పొందండి)", type="primary"):
    if not user_query.strip():
        st.error("దయచేసి ప్రశ్నను ఎంటర్ చేయండి.")
    else:
        with st.spinner("విశ్లేషిస్తోంది..."):
            answer, sources = st.session_state.agent.generate_response(
                user_query=user_query,
                target_language=selected_lang,
                farmer_profile=farmer_profile,
            )

        st.markdown("---")
        st.markdown(answer)

        if enable_voice:
            with st.spinner("వాయిస్ జనరేట్ అవుతోంది..."):
                audio_bytes = synthesize_voice(answer, LANGUAGES[selected_lang])
                if audio_bytes:
                    st.audio(audio_bytes, format="audio/mp3")

        with st.expander("🔍 RAG Source Audit Trail"):
            for idx, src in enumerate(sources, 1):
                st.markdown(f"**{idx}. {src['source']}** (Score: `{src['score']:.2f}`)")
                st.caption(src["text"][:300] + "...")
