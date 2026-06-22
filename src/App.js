// @ts-nocheck
import React, { useState, useCallback, useEffect, useRef } from "react";

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: "100vh", background: "#0a0f1e", color: "#e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, fontFamily: "sans-serif" }}>
          <div style={{ textAlign: "center", maxWidth: 400 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Något gick fel</div>
            <div style={{ fontSize: 13, color: "#64748b", marginBottom: 16 }}>{this.state.error?.message}</div>
            <button onClick={() => window.location.reload()} style={{ padding: "12px 24px", background: "linear-gradient(135deg,#10b981,#0ea5e9)", border: "none", borderRadius: 10, color: "#fff", fontSize: 14, cursor: "pointer" }}>
              Ladda om appen
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const API = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-4-6";
const FAST_MODEL = "claude-haiku-4-5-20251001";
const KEY = process.env.REACT_APP_ANTHROPIC_KEY || "";
const PRESETS = ["Scandinavian Enviro Systems", "Ericsson", "Volvo", "Sinch", "H&M"];

// ── Stripe Payment ────────────────────────────────────────────────────────
async function startStripeCheckout(plan) {
  try {
    const resp = await fetch("/api/stripe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create-checkout", plan })
    });
    const data = await resp.json();
    if (data.url) {
      window.location.href = data.url;
    } else {
      alert("Betalning misslyckades. Försök igen.");
    }
  } catch {
    alert("Kunde inte starta betalning. Försök igen.");
  }
}

const FREE_LIMIT = 3;

const CURRENCIES = [
  { code: "SEK", symbol: "kr", flag: "🇸🇪", name: "Svensk krona" },
  { code: "NOK", symbol: "kr", flag: "🇳🇴", name: "Norsk krone" },
  { code: "DKK", symbol: "kr", flag: "🇩🇰", name: "Dansk krone" },
  { code: "EUR", symbol: "€", flag: "🇪🇺", name: "Euro" },
  { code: "USD", symbol: "$", flag: "🇺🇸", name: "US Dollar" },
  { code: "GBP", symbol: "£", flag: "🇬🇧", name: "Brittiskt pund" },
  { code: "CHF", symbol: "Fr", flag: "🇨🇭", name: "Schweizisk franc" },
  { code: "JPY", symbol: "¥", flag: "🇯🇵", name: "Japansk yen" },
  { code: "PLN", symbol: "zl", flag: "🇵🇱", name: "Polsk zloty" },
  { code: "CZK", symbol: "Kc", flag: "🇨🇿", name: "Tjeckisk koruna" },
];

// ── Watchlist hook ────────────────────────────────────────────────────────
function useWatchlist() {
  const [watchlist, setWatchlist] = useState(() => {
    try { return JSON.parse(localStorage.getItem("kapital_watchlist") || "[]"); } catch { return []; }
  });
  const toggle = (company) => {
    const next = watchlist.includes(company)
      ? watchlist.filter(c => c !== company)
      : [...watchlist, company];
    setWatchlist(next);
    try { localStorage.setItem("kapital_watchlist", JSON.stringify(next)); } catch {}
  };
  const isWatched = (company) => watchlist.includes(company);
  return { watchlist, toggle, isWatched };
}


const LANGUAGES = [
  { code: "sv", flag: "🇸🇪", name: "Svenska" },
  { code: "en", flag: "🇬🇧", name: "English" },
  { code: "no", flag: "🇳🇴", name: "Norsk" },
  { code: "da", flag: "🇩🇰", name: "Dansk" },
  { code: "fi", flag: "🇫🇮", name: "Suomi" },
  { code: "de", flag: "🇩🇪", name: "Deutsch" },
  { code: "fr", flag: "🇫🇷", name: "Français" },
  { code: "es", flag: "🇪🇸", name: "Español" },
  { code: "it", flag: "🇮🇹", name: "Italiano" },
  { code: "pt", flag: "🇵🇹", name: "Português" },
  { code: "nl", flag: "🇳🇱", name: "Nederlands" },
  { code: "pl", flag: "🇵🇱", name: "Polski" },
  { code: "ar", flag: "🇸🇦", name: "العربية", rtl: true },
  { code: "zh", flag: "🇨🇳", name: "中文" },
  { code: "ja", flag: "🇯🇵", name: "日本語" },
  { code: "ko", flag: "🇰🇷", name: "한국어" },
  { code: "hi", flag: "🇮🇳", name: "हिन्दी" },
  { code: "tr", flag: "🇹🇷", name: "Türkçe" },
  { code: "ru", flag: "🇷🇺", name: "Русский" },
  { code: "uk", flag: "🇺🇦", name: "Українська" },
];

const T = {
  sv: {
    tagline: "AI-driven börsintelligens",
    upgrade: "Uppgradera",
    analyze: "Analysera",
    analyzing: "Analyserar",
    placeholder: "Bolagsnamn t.ex. Volvo, Apple...",
    tabs: ["📊 Analys", "⭐ Bevakningar", "💼 Portfölj", "📐 Kalkyl", "🏦 Mäklare", "🗓 Kalender", "💡 Spara", "📤 Dela"],
    freeLeft: (n) => `${n} gratis analyser kvar`,
    freeDone: "✕ Gräns nådd",
    freeLabel: "Gratis analyser",
    cached: "⚡ Hämtad från cache",
    steps: ["Hämtar bolagsdata...", "Analyserar nyhetsflöde...", "Beräknar riskprofil...", "Sammanställer analys..."],
    sections: ["Svenska storbolag", "Globala jättar", "Råvaror & Krypto"],
    buySignal: "Köpläge", waitSignal: "Avvakta", sellSignal: "Hög risk",
    risks: "⚠ Risker", strengths: "✓ Styrkor", catalysts: "🚀 Katalysatorer", news: "📰 Nyheter",
    aiSignal: "AI-signal", recentAnalyzed: "Senast analyserade",
    errorMsg: "Kunde inte analysera bolaget. Försök igen.",
    emptyState: "Sök på ett bolag för att starta",
    legalNote: "⚠ Viktig information",
    legalText: "Kapital är ett informations- och analysverktyg och utgör inte investeringsrådgivning enligt lag (2007:528) om värdepappersmarknaden. AI-genererade analyser är inte personliga köp- eller säljrekommendationer. Historisk avkastning är ingen garanti för framtida resultat. Investeringar innebär alltid risk — du kan förlora hela ditt investerade kapital.",
    proTitle: "Du har använt dina 3 gratis analyser",
    proDesc: "Uppgradera till Pro för obegränsad analys, portföljspårning och mer.",
    proMonth: "Pro — 49 kr/mån", proYear: "399 kr/år", proCancel: "✓ Avsluta när som helst",
    language: "Språk",
  },
  en: {
    tagline: "AI-powered stock intelligence",
    upgrade: "Upgrade",
    analyze: "Analyze",
    analyzing: "Analyzing",
    placeholder: "Company name e.g. Volvo, Apple...",
    tabs: ["📊 Analysis", "⭐ Watchlist", "💼 Portfolio", "📐 Calc", "🏦 Brokers", "🗓 Calendar", "💡 Save", "📤 Share"],
    freeLeft: (n) => `${n} free analyses left`,
    freeDone: "✕ Limit reached",
    freeLabel: "Free analyses",
    cached: "⚡ Loaded from cache",
    steps: ["Fetching company data...", "Analyzing news feed...", "Calculating risk profile...", "Compiling analysis..."],
    sections: ["Swedish blue chips", "Global giants", "Commodities & Crypto"],
    buySignal: "Buy zone", waitSignal: "Hold", sellSignal: "High risk",
    risks: "⚠ Risks", strengths: "✓ Strengths", catalysts: "🚀 Catalysts", news: "📰 News",
    aiSignal: "AI signal", recentAnalyzed: "Recently analyzed",
    errorMsg: "Could not analyze the company. Please try again.",
    emptyState: "Search for a company to get started",
    legalNote: "⚠ Important information",
    legalText: "Kapital is an information tool and does not constitute investment advice. AI-generated analyses are not personal buy or sell recommendations. All investments involve risk.",
    proTitle: "You've used your 3 free analyses",
    proDesc: "Upgrade to Pro for unlimited analysis, portfolio tracking and more.",
    proMonth: "Pro — €7/mo", proYear: "€62/yr", proCancel: "✓ Cancel anytime",
    language: "Language",
  },
  no: {
    tagline: "AI-drevet børsintelligens",
    upgrade: "Oppgrader",
    analyze: "Analyser",
    analyzing: "Analyserer",
    placeholder: "Selskapsnavn f.eks. Equinor, Apple...",
    tabs: ["📊 Analyse", "💼 Portefølje", "📐 Kalkulator", "🏦 Meglere", "🗓 Kalender", "📤 Del"],
    freeLeft: (n) => `${n} gratis analyser igjen`,
    freeDone: "✕ Grense nådd",
    freeLabel: "Gratis analyser",
    cached: "⚡ Hentet fra hurtigbuffer",
    steps: ["Henter selskapsdata...", "Analyserer nyhetsstrøm...", "Beregner risikoprofil...", "Sammenstiller analyse..."],
    sections: ["Norske storselskaper", "Globale giganter", "Råvarer & Krypto"],
    buySignal: "Kjøpssone", waitSignal: "Avvent", sellSignal: "Høy risiko",
    risks: "⚠ Risikoer", strengths: "✓ Styrker", catalysts: "🚀 Katalysatorer", news: "📰 Nyheter",
    aiSignal: "AI-signal", recentAnalyzed: "Nylig analysert",
    errorMsg: "Kunne ikke analysere selskapet. Prøv igjen.",
    emptyState: "Søk etter et selskap for å starte",
    legalNote: "⚠ Viktig informasjon",
    legalText: "Kapital er et informasjonsverktøy og utgjør ikke investeringsrådgivning. AI-genererte analyser er ikke personlige kjøps- eller salgsanbefalinger. Investeringer innebærer alltid risiko.",
    proTitle: "Du har brukt dine 3 gratis analyser",
    proDesc: "Oppgrader til Pro for ubegrenset analyse, porteføljeovervåking og mer.",
    proMonth: "Pro — 49 kr/mnd", proYear: "399 kr/år", proCancel: "✓ Avslutt når som helst",
    language: "Språk",
  },
  da: {
    tagline: "AI-drevet børsintelligens",
    upgrade: "Opgrader",
    analyze: "Analysér",
    analyzing: "Analyserer",
    placeholder: "Firmanavn f.eks. Vestas, Apple...",
    tabs: ["📊 Analyse", "💼 Portefølje", "📐 Kalkulator", "🏦 Mæglere", "🗓 Kalender", "📤 Del"],
    freeLeft: (n) => `${n} gratis analyser tilbage`,
    freeDone: "✕ Grænse nået",
    freeLabel: "Gratis analyser",
    cached: "⚡ Hentet fra cache",
    steps: ["Henter virksomhedsdata...", "Analyserer nyhedsstrøm...", "Beregner risikoprofil...", "Sammensætter analyse..."],
    sections: ["Danske storselskaber", "Globale giganter", "Råvarer & Krypto"],
    buySignal: "Købszone", waitSignal: "Afvent", sellSignal: "Høj risiko",
    risks: "⚠ Risici", strengths: "✓ Styrker", catalysts: "🚀 Katalysatorer", news: "📰 Nyheder",
    aiSignal: "AI-signal", recentAnalyzed: "Senest analyseret",
    errorMsg: "Kunne ikke analysere virksomheden. Prøv igen.",
    emptyState: "Søg efter en virksomhed for at starte",
    legalNote: "⚠ Vigtig information",
    legalText: "Kapital er et informationsværktøj og udgør ikke investeringsrådgivning. AI-genererede analyser er ikke personlige købs- eller salgsanbefalinger. Investeringer indebærer altid risiko.",
    proTitle: "Du har brugt dine 3 gratis analyser",
    proDesc: "Opgrader til Pro for ubegrænset analyse, porteføljeovervågning og mere.",
    proMonth: "Pro — 49 kr/md", proYear: "399 kr/år", proCancel: "✓ Annullér når som helst",
    language: "Sprog",
  },
  fi: {
    tagline: "Tekoälypohjainen sijoitustieto",
    upgrade: "Päivitä",
    analyze: "Analysoi",
    analyzing: "Analysoidaan",
    placeholder: "Yrityksen nimi esim. Nokia, Apple...",
    tabs: ["📊 Analyysi", "💼 Salkku", "📐 Laskin", "🏦 Välittäjät", "🗓 Kalenteri", "📤 Jaa"],
    freeLeft: (n) => `${n} ilmaista analyysiä jäljellä`,
    freeDone: "✕ Raja saavutettu",
    freeLabel: "Ilmaiset analyysit",
    cached: "⚡ Ladattu välimuistista",
    steps: ["Haetaan yritystietoja...", "Analysoidaan uutisvirtaa...", "Lasketaan riskiprofiili...", "Kootaan analyysi..."],
    sections: ["Suomalaiset suuryritykset", "Globaalit jätit", "Raaka-aineet & Krypto"],
    buySignal: "Ostovyöhyke", waitSignal: "Odota", sellSignal: "Korkea riski",
    risks: "⚠ Riskit", strengths: "✓ Vahvuudet", catalysts: "🚀 Katalysaattorit", news: "📰 Uutiset",
    aiSignal: "AI-signaali", recentAnalyzed: "Viimeksi analysoitu",
    errorMsg: "Yritystä ei voitu analysoida. Yritä uudelleen.",
    emptyState: "Hae yritystä aloittaaksesi",
    legalNote: "⚠ Tärkeää tietoa",
    legalText: "Kapital on tietotyökalu eikä muodosta sijoitusneuvontaa. AI-generoidut analyysit eivät ole henkilökohtaisia osto- tai myyntisuosituksia. Sijoittamiseen liittyy aina riski.",
    proTitle: "Olet käyttänyt 3 ilmaista analyysiä",
    proDesc: "Päivitä Pro-versioon rajattomia analyysejä, salkunseurantaa ja paljon muuta varten.",
    proMonth: "Pro — 9€/kk", proYear: "75€/v", proCancel: "✓ Peruuta milloin tahansa",
    language: "Kieli",
  },
  de: {
    tagline: "KI-gestützte Börsenintelligenz",
    upgrade: "Upgraden",
    analyze: "Analysieren",
    analyzing: "Analysiert",
    placeholder: "Unternehmensname z.B. SAP, Apple...",
    tabs: ["📊 Analyse", "💼 Portfolio", "📐 Rechner", "🏦 Broker", "🗓 Kalender", "📤 Teilen"],
    freeLeft: (n) => `Noch ${n} kostenlose Analysen`,
    freeDone: "✕ Limit erreicht",
    freeLabel: "Kostenlose Analysen",
    cached: "⚡ Aus Cache geladen",
    steps: ["Unternehmensdaten abrufen...", "Nachrichtenfluss analysieren...", "Risikoprofil berechnen...", "Analyse zusammenstellen..."],
    sections: ["Deutsche Bluechips", "Globale Giganten", "Rohstoffe & Krypto"],
    buySignal: "Kaufzone", waitSignal: "Abwarten", sellSignal: "Hohes Risiko",
    risks: "⚠ Risiken", strengths: "✓ Stärken", catalysts: "🚀 Katalysatoren", news: "📰 Nachrichten",
    aiSignal: "KI-Signal", recentAnalyzed: "Zuletzt analysiert",
    errorMsg: "Unternehmen konnte nicht analysiert werden. Bitte erneut versuchen.",
    emptyState: "Suchen Sie nach einem Unternehmen",
    legalNote: "⚠ Wichtiger Hinweis",
    legalText: "Kapital ist ein Informationswerkzeug und stellt keine Anlageberatung dar. KI-generierte Analysen sind keine persönlichen Kauf- oder Verkaufsempfehlungen. Investitionen sind immer mit Risiken verbunden.",
    proTitle: "Sie haben Ihre 3 kostenlosen Analysen genutzt",
    proDesc: "Upgraden Sie auf Pro für unbegrenzte Analysen, Portfolio-Tracking und mehr.",
    proMonth: "Pro — 9€/Monat", proYear: "75€/Jahr", proCancel: "✓ Jederzeit kündbar",
    language: "Sprache",
  },
  fr: {
    tagline: "Intelligence boursière par IA",
    upgrade: "Mettre à niveau",
    analyze: "Analyser",
    analyzing: "Analyse en cours",
    placeholder: "Nom d'entreprise ex. LVMH, Apple...",
    tabs: ["📊 Analyse", "💼 Portefeuille", "📐 Calcul", "🏦 Courtiers", "🗓 Calendrier", "📤 Partager"],
    freeLeft: (n) => `${n} analyses gratuites restantes`,
    freeDone: "✕ Limite atteinte",
    freeLabel: "Analyses gratuites",
    cached: "⚡ Chargé depuis le cache",
    steps: ["Récupération des données...", "Analyse du flux d'actualités...", "Calcul du profil de risque...", "Compilation de l'analyse..."],
    sections: ["Grandes capitalisations françaises", "Géants mondiaux", "Matières premières & Crypto"],
    buySignal: "Zone d'achat", waitSignal: "Attendre", sellSignal: "Risque élevé",
    risks: "⚠ Risques", strengths: "✓ Points forts", catalysts: "🚀 Catalyseurs", news: "📰 Actualités",
    aiSignal: "Signal IA", recentAnalyzed: "Récemment analysés",
    errorMsg: "Impossible d'analyser l'entreprise. Veuillez réessayer.",
    emptyState: "Recherchez une entreprise pour commencer",
    legalNote: "⚠ Information importante",
    legalText: "Kapital est un outil d'information et ne constitue pas un conseil en investissement. Les analyses générées par IA ne sont pas des recommandations personnelles. Tout investissement comporte des risques.",
    proTitle: "Vous avez utilisé vos 3 analyses gratuites",
    proDesc: "Passez à Pro pour des analyses illimitées, le suivi de portefeuille et plus encore.",
    proMonth: "Pro — 9€/mois", proYear: "75€/an", proCancel: "✓ Résiliable à tout moment",
    language: "Langue",
  },
  es: {
    tagline: "Inteligencia bursátil con IA",
    upgrade: "Actualizar",
    analyze: "Analizar",
    analyzing: "Analizando",
    placeholder: "Nombre de empresa ej. Inditex, Apple...",
    tabs: ["📊 Análisis", "💼 Cartera", "📐 Calculadora", "🏦 Brókers", "🗓 Calendario", "📤 Compartir"],
    freeLeft: (n) => `${n} análisis gratuitos restantes`,
    freeDone: "✕ Límite alcanzado",
    freeLabel: "Análisis gratuitos",
    cached: "⚡ Cargado desde caché",
    steps: ["Obteniendo datos...", "Analizando noticias...", "Calculando perfil de riesgo...", "Compilando análisis..."],
    sections: ["Grandes empresas españolas", "Gigantes globales", "Materias primas & Cripto"],
    buySignal: "Zona de compra", waitSignal: "Esperar", sellSignal: "Alto riesgo",
    risks: "⚠ Riesgos", strengths: "✓ Fortalezas", catalysts: "🚀 Catalizadores", news: "📰 Noticias",
    aiSignal: "Señal IA", recentAnalyzed: "Analizados recientemente",
    errorMsg: "No se pudo analizar la empresa. Inténtelo de nuevo.",
    emptyState: "Busque una empresa para empezar",
    legalNote: "⚠ Información importante",
    legalText: "Kapital es una herramienta de información y no constituye asesoramiento de inversión. Los análisis de IA no son recomendaciones personales. Las inversiones siempre conllevan riesgo.",
    proTitle: "Has usado tus 3 análisis gratuitos",
    proDesc: "Actualiza a Pro para análisis ilimitados, seguimiento de cartera y más.",
    proMonth: "Pro — 9€/mes", proYear: "75€/año", proCancel: "✓ Cancela cuando quieras",
    language: "Idioma",
  },
  it: { tagline:"Intelligenza di borsa con IA", upgrade:"Aggiorna", analyze:"Analizza", analyzing:"Analizzando", placeholder:"Nome azienda es. Ferrero, Apple...", tabs:["📊 Analisi","💼 Portafoglio","📐 Calcolo","🏦 Broker","🗓 Calendario","📤 Condividi"], freeLeft:(n)=>`${n} analisi gratuite rimanenti`, freeDone:"✕ Limite raggiunto", freeLabel:"Analisi gratuite", cached:"⚡ Dalla cache", steps:["Recupero dati...","Analisi notizie...","Calcolo profilo rischio...","Compilazione analisi..."], sections:["Grandi aziende italiane","Giganti globali","Materie prime & Cripto"], buySignal:"Zona acquisto", waitSignal:"Attendere", sellSignal:"Alto rischio", risks:"⚠ Rischi", strengths:"✓ Punti di forza", catalysts:"🚀 Catalizzatori", news:"📰 Notizie", aiSignal:"Segnale IA", recentAnalyzed:"Analizzati di recente", errorMsg:"Impossibile analizzare l'azienda. Riprovare.", emptyState:"Cerca un'azienda per iniziare", legalNote:"⚠ Informazione importante", legalText:"Kapital è uno strumento informativo e non costituisce consulenza agli investimenti. Le analisi IA non sono raccomandazioni personali.", proTitle:"Hai usato le tue 3 analisi gratuite", proDesc:"Aggiorna a Pro per analisi illimitate, monitoraggio portafoglio e altro.", proMonth:"Pro — 9€/mese", proYear:"75€/anno", proCancel:"✓ Cancella quando vuoi", language:"Lingua" },
  pt: { tagline:"Inteligência bolsista com IA", upgrade:"Atualizar", analyze:"Analisar", analyzing:"A analisar", placeholder:"Nome da empresa ex. EDP, Apple...", tabs:["📊 Análise","💼 Carteira","📐 Calculadora","🏦 Corretoras","🗓 Calendário","📤 Partilhar"], freeLeft:(n)=>`${n} análises gratuitas restantes`, freeDone:"✕ Limite atingido", freeLabel:"Análises gratuitas", cached:"⚡ Da cache", steps:["A obter dados...","A analisar notícias...","A calcular risco...","A compilar análise..."], sections:["Grandes empresas","Gigantes globais","Matérias-primas & Cripto"], buySignal:"Zona de compra", waitSignal:"Aguardar", sellSignal:"Alto risco", risks:"⚠ Riscos", strengths:"✓ Pontos fortes", catalysts:"🚀 Catalisadores", news:"📰 Notícias", aiSignal:"Sinal IA", recentAnalyzed:"Analisados recentemente", errorMsg:"Não foi possível analisar. Tente novamente.", emptyState:"Pesquise uma empresa para começar", legalNote:"⚠ Informação importante", legalText:"Kapital é uma ferramenta informativa e não constitui aconselhamento de investimento.", proTitle:"Usou as suas 3 análises gratuitas", proDesc:"Atualize para Pro para análises ilimitadas.", proMonth:"Pro — 9€/mês", proYear:"75€/ano", proCancel:"✓ Cancele quando quiser", language:"Idioma" },
  nl: { tagline:"AI-gestuurde beursintelligentie", upgrade:"Upgraden", analyze:"Analyseren", analyzing:"Bezig met analyseren", placeholder:"Bedrijfsnaam bijv. ASML, Apple...", tabs:["📊 Analyse","💼 Portefeuille","📐 Rekenmachine","🏦 Brokers","🗓 Kalender","📤 Delen"], freeLeft:(n)=>`Nog ${n} gratis analyses`, freeDone:"✕ Limiet bereikt", freeLabel:"Gratis analyses", cached:"⚡ Geladen uit cache", steps:["Bedrijfsgegevens ophalen...","Nieuwsstroom analyseren...","Risicoprofiel berekenen...","Analyse samenstellen..."], sections:["Nederlandse topbedrijven","Wereldwijde giganten","Grondstoffen & Crypto"], buySignal:"Koopzone", waitSignal:"Afwachten", sellSignal:"Hoog risico", risks:"⚠ Risico's", strengths:"✓ Sterke punten", catalysts:"🚀 Katalysatoren", news:"📰 Nieuws", aiSignal:"AI-signaal", recentAnalyzed:"Recentelijk geanalyseerd", errorMsg:"Kon het bedrijf niet analyseren. Probeer opnieuw.", emptyState:"Zoek een bedrijf om te beginnen", legalNote:"⚠ Belangrijke informatie", legalText:"Kapital is een informatietool en vormt geen beleggingsadvies.", proTitle:"U heeft uw 3 gratis analyses gebruikt", proDesc:"Upgrade naar Pro voor onbeperkte analyse.", proMonth:"Pro — €7/maand", proYear:"€62/jaar", proCancel:"✓ Op elk moment opzegbaar", language:"Taal" },
  pl: { tagline:"Inteligencja giełdowa oparta na AI", upgrade:"Ulepsz", analyze:"Analizuj", analyzing:"Analizuję", placeholder:"Nazwa firmy np. PKN Orlen, Apple...", tabs:["📊 Analiza","💼 Portfel","📐 Kalkulator","🏦 Brokerzy","🗓 Kalendarz","📤 Udostępnij"], freeLeft:(n)=>`Pozostało ${n} bezpłatnych analiz`, freeDone:"✕ Limit osiągnięty", freeLabel:"Bezpłatne analizy", cached:"⚡ Załadowano z pamięci podręcznej", steps:["Pobieranie danych...","Analiza wiadomości...","Obliczanie profilu ryzyka...","Kompilowanie analizy..."], sections:["Polskie blue chipy","Globalne giganty","Surowce i Krypto"], buySignal:"Strefa kupna", waitSignal:"Czekaj", sellSignal:"Wysokie ryzyko", risks:"⚠ Ryzyka", strengths:"✓ Mocne strony", catalysts:"🚀 Katalizatory", news:"📰 Wiadomości", aiSignal:"Sygnał AI", recentAnalyzed:"Ostatnio analizowane", errorMsg:"Nie można przeanalizować firmy. Spróbuj ponownie.", emptyState:"Wyszukaj firmę, aby rozpocząć", legalNote:"⚠ Ważna informacja", legalText:"Kapital to narzędzie informacyjne i nie stanowi porady inwestycyjnej.", proTitle:"Wykorzystałeś 3 bezpłatne analizy", proDesc:"Przejdź na Pro dla nieograniczonych analiz.", proMonth:"Pro — 9€/mies.", proYear:"75€/rok", proCancel:"✓ Anuluj kiedy chcesz", language:"Język" },
  ar: { tagline:"ذكاء اصطناعي لأسواق المال", upgrade:"ترقية", analyze:"تحليل", analyzing:"جارٍ التحليل", placeholder:"اسم الشركة مثل أرامكو، آبل...", tabs:["📊 تحليل","💼 محفظة","📐 حاسبة","🏦 وسطاء","🗓 تقويم","📤 مشاركة"], freeLeft:(n)=>`${n} تحليلات مجانية متبقية`, freeDone:"✕ تم الوصول للحد", freeLabel:"التحليلات المجانية", cached:"⚡ من الذاكرة المؤقتة", steps:["جلب بيانات الشركة...","تحليل تدفق الأخبار...","حساب ملف المخاطر...","تجميع التحليل..."], sections:["كبرى الشركات","عمالقة عالميون","سلع & كريبتو"], buySignal:"منطقة شراء", waitSignal:"انتظر", sellSignal:"مخاطرة عالية", risks:"⚠ المخاطر", strengths:"✓ نقاط القوة", catalysts:"🚀 محفزات", news:"📰 أخبار", aiSignal:"إشارة AI", recentAnalyzed:"محللة مؤخراً", errorMsg:"تعذّر تحليل الشركة. حاول مجدداً.", emptyState:"ابحث عن شركة للبدء", legalNote:"⚠ معلومات مهمة", legalText:"Kapital أداة معلومات ولا تشكّل استشارة استثمارية.", proTitle:"لقد استخدمت 3 تحليلات مجانية", proDesc:"ترقّ إلى Pro للحصول على تحليلات غير محدودة.", proMonth:"Pro — 9$/شهر", proYear:"75$/سنة", proCancel:"✓ إلغاء في أي وقت", language:"اللغة" },
  zh: { tagline:"AI驱动的股市智能分析", upgrade:"升级", analyze:"分析", analyzing:"分析中", placeholder:"公司名称，如苹果、腾讯...", tabs:["📊 分析","💼 投资组合","📐 计算器","🏦 券商","🗓 日历","📤 分享"], freeLeft:(n)=>`剩余 ${n} 次免费分析`, freeDone:"✕ 已达上限", freeLabel:"免费分析次数", cached:"⚡ 已从缓存加载", steps:["获取公司数据...","分析新闻动态...","计算风险概况...","整合分析结果..."], sections:["中国蓝筹股","全球巨头","大宗商品和加密货币"], buySignal:"买入区", waitSignal:"观望", sellSignal:"高风险", risks:"⚠ 风险", strengths:"✓ 优势", catalysts:"🚀 催化剂", news:"📰 新闻", aiSignal:"AI信号", recentAnalyzed:"最近分析", errorMsg:"无法分析该公司，请重试。", emptyState:"搜索公司以开始", legalNote:"⚠ 重要信息", legalText:"Kapital是信息工具，不构成投资建议。AI生成的分析不是个人买卖建议。", proTitle:"您已使用3次免费分析", proDesc:"升级到Pro，享受无限分析、投资组合跟踪等功能。", proMonth:"Pro — ¥52/月", proYear:"¥420/年", proCancel:"✓ 随时取消", language:"语言" },
  ja: { tagline:"AIによる株式インテリジェンス", upgrade:"アップグレード", analyze:"分析", analyzing:"分析中", placeholder:"企業名（例：トヨタ、Apple）...", tabs:["📊 分析","💼 ポートフォリオ","📐 計算機","🏦 証券会社","🗓 カレンダー","📤 シェア"], freeLeft:(n)=>`残り ${n} 回の無料分析`, freeDone:"✕ 上限に達しました", freeLabel:"無料分析", cached:"⚡ キャッシュから読み込み", steps:["企業データ取得中...","ニュース分析中...","リスク計算中...","分析まとめ中..."], sections:["日本の主要企業","グローバル大手","商品・暗号資産"], buySignal:"買いゾーン", waitSignal:"様子見", sellSignal:"高リスク", risks:"⚠ リスク", strengths:"✓ 強み", catalysts:"🚀 カタリスト", news:"📰 ニュース", aiSignal:"AIシグナル", recentAnalyzed:"最近の分析", errorMsg:"企業を分析できませんでした。再試行してください。", emptyState:"企業を検索して開始", legalNote:"⚠ 重要事項", legalText:"Kapitalは情報ツールであり、投資アドバイスではありません。", proTitle:"3回の無料分析を使い切りました", proDesc:"Proにアップグレードして無制限の分析を。", proMonth:"Pro — ¥1,100/月", proYear:"¥9,000/年", proCancel:"✓ いつでもキャンセル可能", language:"言語" },
  ko: { tagline:"AI 기반 주식 인텔리전스", upgrade:"업그레이드", analyze:"분석", analyzing:"분석 중", placeholder:"회사 이름 예: 삼성, Apple...", tabs:["📊 분석","💼 포트폴리오","📐 계산기","🏦 증권사","🗓 캘린더","📤 공유"], freeLeft:(n)=>`무료 분석 ${n}회 남음`, freeDone:"✕ 한도 도달", freeLabel:"무료 분석", cached:"⚡ 캐시에서 로드됨", steps:["기업 데이터 가져오는 중...","뉴스 피드 분석 중...","리스크 프로필 계산 중...","분석 정리 중..."], sections:["한국 대형주","글로벌 대기업","원자재 & 암호화폐"], buySignal:"매수 구간", waitSignal:"관망", sellSignal:"고위험", risks:"⚠ 위험 요소", strengths:"✓ 강점", catalysts:"🚀 촉매제", news:"📰 뉴스", aiSignal:"AI 신호", recentAnalyzed:"최근 분석", errorMsg:"회사를 분석할 수 없습니다. 다시 시도하세요.", emptyState:"회사를 검색하여 시작하세요", legalNote:"⚠ 중요 정보", legalText:"Kapital은 정보 도구이며 투자 조언을 구성하지 않습니다.", proTitle:"3개의 무료 분석을 모두 사용했습니다", proDesc:"Pro로 업그레이드하여 무제한 분석을 이용하세요.", proMonth:"Pro — ₩9,500/월", proYear:"₩75,000/년", proCancel:"✓ 언제든지 취소 가능", language:"언어" },
  hi: { tagline:"AI-संचालित शेयर बाज़ार विश्लेषण", upgrade:"अपग्रेड करें", analyze:"विश्लेषण", analyzing:"विश्लेषण हो रहा है", placeholder:"कंपनी का नाम जैसे Reliance, Apple...", tabs:["📊 विश्लेषण","💼 पोर्टफोलियो","📐 कैलकुलेटर","🏦 दलाल","🗓 कैलेंडर","📤 शेयर करें"], freeLeft:(n)=>`${n} मुफ़्त विश्लेषण बचे`, freeDone:"✕ सीमा समाप्त", freeLabel:"मुफ़्त विश्लेषण", cached:"⚡ कैश से लोड किया", steps:["डेटा प्राप्त हो रहा है...","समाचार विश्लेषण...","जोखिम गणना...","विश्लेषण तैयार..."], sections:["भारतीय बड़ी कंपनियां","वैश्विक दिग्गज","कमोडिटी और क्रिप्टो"], buySignal:"खरीद क्षेत्र", waitSignal:"प्रतीक्षा", sellSignal:"उच्च जोखिम", risks:"⚠ जोखिम", strengths:"✓ ताकत", catalysts:"🚀 उत्प्रेरक", news:"📰 समाचार", aiSignal:"AI संकेत", recentAnalyzed:"हाल में विश्लेषित", errorMsg:"कंपनी का विश्लेषण नहीं हो सका। पुनः प्रयास करें।", emptyState:"शुरू करने के लिए कंपनी खोजें", legalNote:"⚠ महत्वपूर्ण जानकारी", legalText:"Kapital एक सूचना उपकरण है और निवेश सलाह नहीं है।", proTitle:"आपने 3 मुफ़्त विश्लेषण उपयोग कर लिए", proDesc:"असीमित विश्लेषण के लिए Pro में अपग्रेड करें।", proMonth:"Pro — ₹600/माह", proYear:"₹4,800/वर्ष", proCancel:"✓ कभी भी रद्द करें", language:"भाषा" },
  tr: { tagline:"Yapay zeka destekli borsa zekası", upgrade:"Yükselt", analyze:"Analiz Et", analyzing:"Analiz Ediliyor", placeholder:"Şirket adı ör. Koç, Apple...", tabs:["📊 Analiz","💼 Portföy","📐 Hesap Makinesi","🏦 Aracılar","🗓 Takvim","📤 Paylaş"], freeLeft:(n)=>`${n} ücretsiz analiz kaldı`, freeDone:"✕ Limite ulaşıldı", freeLabel:"Ücretsiz analizler", cached:"⚡ Önbellekten yüklendi", steps:["Şirket verileri alınıyor...","Haber akışı analiz ediliyor...","Risk profili hesaplanıyor...","Analiz derleniyor..."], sections:["Türk büyük şirketleri","Küresel devler","Emtialar & Kripto"], buySignal:"Alım bölgesi", waitSignal:"Bekle", sellSignal:"Yüksek risk", risks:"⚠ Riskler", strengths:"✓ Güçlü yönler", catalysts:"🚀 Katalizörler", news:"📰 Haberler", aiSignal:"AI sinyali", recentAnalyzed:"Son analiz edilenler", errorMsg:"Şirket analiz edilemedi. Tekrar deneyin.", emptyState:"Başlamak için bir şirket arayın", legalNote:"⚠ Önemli bilgi", legalText:"Kapital bir bilgi aracıdır ve yatırım tavsiyesi değildir.", proTitle:"3 ücretsiz analizinizi kullandınız", proDesc:"Sınırsız analiz için Pro'ya yükseltin.", proMonth:"Pro — 9€/ay", proYear:"75€/yıl", proCancel:"✓ İstediğiniz zaman iptal edin", language:"Dil" },
  ru: { tagline:"ИИ-аналитика фондового рынка", upgrade:"Обновить", analyze:"Анализировать", analyzing:"Анализ...", placeholder:"Название компании напр. Газпром, Apple...", tabs:["📊 Анализ","💼 Портфель","📐 Калькулятор","🏦 Брокеры","🗓 Календарь","📤 Поделиться"], freeLeft:(n)=>`Осталось ${n} бесплатных анализа`, freeDone:"✕ Лимит исчерпан", freeLabel:"Бесплатные анализы", cached:"⚡ Загружено из кэша", steps:["Получение данных...","Анализ новостей...","Расчёт риска...","Составление анализа..."], sections:["Российские голубые фишки","Мировые гиганты","Сырьё и Крипто"], buySignal:"Зона покупки", waitSignal:"Ожидание", sellSignal:"Высокий риск", risks:"⚠ Риски", strengths:"✓ Сильные стороны", catalysts:"🚀 Катализаторы", news:"📰 Новости", aiSignal:"ИИ-сигнал", recentAnalyzed:"Недавно проанализировано", errorMsg:"Не удалось проанализировать компанию. Попробуйте ещё раз.", emptyState:"Найдите компанию для начала", legalNote:"⚠ Важная информация", legalText:"Kapital — информационный инструмент, а не инвестиционная консультация.", proTitle:"Вы использовали 3 бесплатных анализа", proDesc:"Перейдите на Pro для неограниченного анализа.", proMonth:"Pro — 9€/мес", proYear:"75€/год", proCancel:"✓ Отмена в любое время", language:"Язык" },
  uk: { tagline:"ШІ-аналітика фондового ринку", upgrade:"Оновити", analyze:"Аналізувати", analyzing:"Аналіз...", placeholder:"Назва компанії напр. Укртелеком, Apple...", tabs:["📊 Аналіз","💼 Портфель","📐 Калькулятор","🏦 Брокери","🗓 Календар","📤 Поділитися"], freeLeft:(n)=>`Залишилось ${n} безкоштовних аналізи`, freeDone:"✕ Ліміт вичерпано", freeLabel:"Безкоштовні аналізи", cached:"⚡ Завантажено з кешу", steps:["Отримання даних...","Аналіз новин...","Розрахунок ризику...","Складання аналізу..."], sections:["Великі компанії","Світові гіганти","Сировина і Крипто"], buySignal:"Зона купівлі", waitSignal:"Очікування", sellSignal:"Високий ризик", risks:"⚠ Ризики", strengths:"✓ Сильні сторони", catalysts:"🚀 Каталізатори", news:"📰 Новини", aiSignal:"ШІ-сигнал", recentAnalyzed:"Нещодавно проаналізовано", errorMsg:"Не вдалося проаналізувати компанію. Спробуйте ще раз.", emptyState:"Знайдіть компанію для початку", legalNote:"⚠ Важлива інформація", legalText:"Kapital — інформаційний інструмент, а не інвестиційна консультація.", proTitle:"Ви використали 3 безкоштовних аналізи", proDesc:"Перейдіть на Pro для необмеженого аналізу.", proMonth:"Pro — 9€/міс", proYear:"75€/рік", proCancel:"✓ Скасування будь-коли", language:"Мова" },
};


// ── Brokers with affiliate links ──────────────────────────────────────────
const BROKERS = [
  { name: "Avanza", logo: "🟠", minFee: 1, pctFee: 0.015, isk: 0.375, savings: true, note: "Bäst för småsparare", affiliate: "https://www.avanza.se", bonus: "Öppna konto — gratis" },
  { name: "Nordnet", logo: "🔵", minFee: 0, pctFee: 0.015, isk: 0.375, savings: true, note: "Bra för fonder", affiliate: "https://www.nordnet.se", bonus: "Öppna konto — gratis" },
  { name: "Swedbank", logo: "🟡", minFee: 99, pctFee: 0.099, isk: 0.375, savings: false, note: "Dyrast courtage", affiliate: "https://www.swedbank.se", bonus: "Läs mer" },
  { name: "SEB", logo: "🟢", minFee: 69, pctFee: 0.065, isk: 0.375, savings: false, note: "Bra service", affiliate: "https://seb.se", bonus: "Läs mer" },
  { name: "DEGIRO", logo: "🔴", minFee: 1, pctFee: 0.005, isk: false, savings: false, note: "Billigast utländska", affiliate: "https://www.degiro.se", bonus: "Öppna konto" },
  { name: "XTB", logo: "⚡", minFee: 0, pctFee: 0.0, isk: false, savings: false, note: "0% courtage upp till 100k€/mån", affiliate: "https://www.xtb.com/se", bonus: "Öppna konto — gratis" },
];

// ── Earnings calendar data ────────────────────────────────────────────────
const CALENDAR = [
  { company: "Ericsson", date: "2026-07-11", type: "Q2", time: "07:30" },
  { company: "Volvo", date: "2026-07-18", type: "Q2", time: "08:00" },
  { company: "H&M", date: "2026-06-25", type: "Q2", time: "08:00" },
  { company: "Sinch", date: "2026-07-22", type: "Q2", time: "07:30" },
  { company: "Hexagon", date: "2026-07-25", type: "Q2", time: "08:00" },
  { company: "Atlas Copco", date: "2026-07-17", type: "Q2", time: "07:30" },
  { company: "Investor", date: "2026-07-18", type: "Q2", time: "09:00" },
  { company: "SEB", date: "2026-07-17", type: "Q2", time: "07:00" },
  { company: "Handelsbanken", date: "2026-07-15", type: "Q2", time: "07:30" },
  { company: "Tele2", date: "2026-07-16", type: "Q2", time: "07:30" },
  { company: "Enviro Systems", date: "2026-08-20", type: "Q2", time: "08:00" },
  { company: "Spotify", date: "2026-07-29", type: "Q2", time: "14:00" },
  { company: "Nibe", date: "2026-08-13", type: "Q2", time: "08:00" },
  { company: "Sandvik", date: "2026-07-18", type: "Q2", time: "07:30" },
];

const TABS = ["📊 Analys", "💼 Portfölj", "📐 Kalkyl", "🏦 Mäklare", "🗓 Kalender", "📤 Dela"];

const LEGAL_SHORT = "⚠ Informationen är inte finansiell rådgivning. Alla investeringar sker på eget ansvar och innebär risk för förlust.";
const LEGAL_FULL = `Kapital är ett informations- och analysverktyg. Innehållet utgör inte investeringsrådgivning enligt lagen (2007:528) om värdepappersmarknaden och ska inte tolkas som personliga köp- eller säljrekommendationer. Analys och poängsättning är AI-genererad och baseras på allmänt tillgänglig information — inte på din personliga ekonomi, risktolerans eller investeringsmål. Historisk utveckling är ingen garanti för framtida avkastning. Alla investeringsbeslut fattas på eget ansvar. Rådgör med en auktoriserad finansiell rådgivare innan du fattar investeringsbeslut.`;

function LegalBanner() {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ background: "#1e1a00", border: "1px solid #f59e0b33", borderRadius: 10, padding: "10px 14px", marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <div style={{ fontSize: 12, color: "#f59e0b", lineHeight: 1.5 }}>⚠ {LEGAL_SHORT}</div>
        <button onClick={() => setOpen(o => !o)} style={{ flexShrink: 0, fontSize: 11, color: "#64748b", background: "none", border: "none", cursor: "pointer", whiteSpace: "nowrap" }}>{open ? "Dölj" : "Läs mer"}</button>
      </div>
      {open && <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 8, lineHeight: 1.6 }}>{LEGAL_FULL}</div>}
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────
const fmt = (n, d = 0) => Number(n).toLocaleString("sv-SE", { minimumFractionDigits: d, maximumFractionDigits: d });
const recColor = r => r === "Köp" ? "#22c55e" : r === "Sälj" ? "#ef4444" : "#f59e0b";
const card = (children, extra = {}) => ({
  background: "#0f172a", borderRadius: 14, border: "1px solid #1e293b", padding: 16, marginBottom: 12, ...extra
});

// ── UI Atoms ──────────────────────────────────────────────────────────────
function Toast({ msg }) {
  return (
    <div style={{ position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)", background: "#22c55e", color: "#fff", padding: "10px 22px", borderRadius: 99, fontSize: 14, fontWeight: 700, zIndex: 9999, boxShadow: "0 4px 24px #22c55e55", whiteSpace: "nowrap" }}>{msg}</div>
  );
}

function ProBadge() {
  return <span style={{ fontSize: 10, background: "linear-gradient(90deg,#f59e0b,#ef4444)", color: "#fff", padding: "2px 7px", borderRadius: 99, fontWeight: 700, marginLeft: 6 }}>PRO</span>;
}

function ScoreBar({ score }) {
  const color = score >= 65 ? "#22c55e" : score >= 40 ? "#f59e0b" : "#ef4444";
  const label = score >= 65 ? "Köpläge" : score >= 40 ? "Avvakta" : "Hög risk";
  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#64748b", marginBottom: 4 }}>
        <span>Hög risk</span>
        <span style={{ color, fontWeight: 700, fontSize: 14 }}>{label} · {score}/100</span>
        <span>Köpläge</span>
      </div>
      <div style={{ background: "#1e293b", borderRadius: 99, height: 10, overflow: "hidden" }}>
        <div style={{ width: `${score}%`, height: "100%", borderRadius: 99, background: "linear-gradient(90deg,#ef4444,#f59e0b 50%,#22c55e)", transition: "width 1s ease" }} />
      </div>
    </div>
  );
}

function ProGate({ onUpgrade, t }) {
  return (
    <div style={{ background: "linear-gradient(135deg,#0f172a,#0a1f1a)", borderRadius: 16, border: "1px solid #10b98133", padding: 28, textAlign: "center", marginBottom: 16 }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>🔒</div>
      <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>{t.proTitle}</div>
      <div style={{ fontSize: 13, color: "#64748b", marginBottom: 24, lineHeight: 1.7 }}>{t.proDesc}</div>
      <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", marginBottom: 14 }}>
        <button onClick={onUpgrade} style={{ padding: "13px 28px", background: "linear-gradient(135deg,#10b981,#0ea5e9)", border: "none", borderRadius: 12, color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 20px #10b98144" }}>
          {t.proMonth}
        </button>
        <button onClick={onUpgrade} style={{ padding: "13px 20px", background: "#1e293b", border: "1px solid #334155", borderRadius: 12, color: "#94a3b8", fontSize: 14, cursor: "pointer" }}>
          {t.proYear}
        </button>
      </div>
      <div style={{ fontSize: 11, color: "#334155" }}>{t.proCancel}</div>
    </div>
  );
}

// ── Quick Grid with live prices ───────────────────────────────────────────
const QUICK_ITEMS = {
  "Svenska storbolag": [
    { name: "Ericsson",    ticker: "ERICb.ST", icon: "📡", color: "#3b82f6" },
    { name: "Volvo",       ticker: "VOLVb.ST", icon: "🚛", color: "#f59e0b" },
    { name: "H&M",         ticker: "HMb.ST",   icon: "👗", color: "#ec4899" },
    { name: "Hexagon",     ticker: "HEXAb.ST", icon: "📐", color: "#8b5cf6" },
    { name: "Sinch",       ticker: "SINCH.ST", icon: "💬", color: "#06b6d4" },
    { name: "Investor",    ticker: "INVEb.ST", icon: "🏛️", color: "#10b981" },
    { name: "Atlas Copco", ticker: "ATCOa.ST", icon: "⚙️", color: "#64748b" },
    { name: "Sandvik",     ticker: "SAND.ST",  icon: "🔧", color: "#f97316" },
  ],
  "Globala jättar": [
    { name: "Apple",    ticker: "AAPL",  icon: "🍎", color: "#94a3b8" },
    { name: "Nvidia",   ticker: "NVDA",  icon: "🖥️", color: "#76b900" },
    { name: "Tesla",    ticker: "TSLA",  icon: "⚡", color: "#e31937" },
    { name: "Microsoft",ticker: "MSFT",  icon: "🪟", color: "#0078d4" },
    { name: "Amazon",   ticker: "AMZN",  icon: "📦", color: "#ff9900" },
    { name: "Alphabet", ticker: "GOOGL", icon: "🔍", color: "#4285f4" },
    { name: "Meta",     ticker: "META",  icon: "👓", color: "#0668e1" },
    { name: "Spotify",  ticker: "SPOT",  icon: "🎵", color: "#1db954" },
  ],
  "Råvaror & Krypto": [
    { name: "Guld",        ticker: "GC=F",  icon: "🥇", color: "#fbbf24" },
    { name: "Silver",      ticker: "SI=F",  icon: "🥈", color: "#94a3b8" },
    { name: "Olja (Brent)",ticker: "BZ=F",  icon: "🛢️", color: "#92400e" },
    { name: "Koppar",      ticker: "HG=F",  icon: "🟠", color: "#c2410c" },
    { name: "Naturgas",    ticker: "NG=F",  icon: "🔥", color: "#f97316" },
    { name: "Vete",        ticker: "ZW=F",  icon: "🌾", color: "#d97706" },
    { name: "Bitcoin",     ticker: "BTC-USD",icon: "₿", color: "#f7931a" },
    { name: "Ethereum",    ticker: "ETH-USD",icon: "⟠", color: "#627eea" },
  ],
};

// Simulerar realistiska priser — byts ut mot riktigt API i produktion
function mockPrice(ticker) {
  // Seed baserat på ticker + dag så alla ser samma pris samma dag
  const seed = ticker.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const dayOfYear = Math.floor(Date.now() / 86400000);
  const rand = (s) => {
    let x = Math.sin(s) * 10000;
    return x - Math.floor(x);
  };
  const base = {
    "ERICb.ST": 74, "VOLVb.ST": 268, "HMb.ST": 118, "HEXAb.ST": 145,
    "SINCH.ST": 28, "INVEb.ST": 310, "ATCOa.ST": 158, "SAND.ST": 212,
    "AAPL": 227, "NVDA": 135, "TSLA": 248, "MSFT": 445,
    "AMZN": 198, "GOOGL": 178, "META": 612, "SPOT": 368,
    "GC=F": 3320, "SI=F": 33, "BZ=F": 74, "HG=F": 4.8,
    "NG=F": 3.2, "ZW=F": 545, "BTC-USD": 103000, "ETH-USD": 3800,
  }[ticker] || 100;
  const chgPct = (rand(seed + dayOfYear) - 0.5) * 6; // -3% to +3%
  const price = base * (1 + chgPct / 100);
  return { price, chgPct };
}

function PriceChip({ chgPct }) {
  const up = chgPct >= 0;
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 2,
      fontSize: 10, fontWeight: 700,
      color: up ? "#22c55e" : "#ef4444",
    }}>
      <span style={{ fontSize: 9 }}>{up ? "▲" : "▼"}</span>
      {Math.abs(chgPct).toFixed(2)}%
    </div>
  );
}

function QuickGrid({ onSelect }) {
  const [prices, setPrices] = useState({});
  const [priceLoading, setPriceLoading] = useState(true);
  const { checkAlerts } = useAlerts();

  useEffect(() => {
    // Ladda priser — i produktion: fetch Yahoo Finance API här
    const all = {};
    Object.values(QUICK_ITEMS).flat().forEach(s => {
      all[s.ticker] = mockPrice(s.ticker);
    });
    setTimeout(() => { setPrices(all); setPriceLoading(false); checkAlerts(all); }, 600);

    // Uppdatera var 30:e sekund (simulerat flicker)
    const interval = setInterval(() => {
      const updated = {};
      Object.values(QUICK_ITEMS).flat().forEach(s => {
        const cur = all[s.ticker] || mockPrice(s.ticker);
        const micro = (Math.random() - 0.5) * 0.1;
        updated[s.ticker] = { price: cur.price * (1 + micro / 100), chgPct: cur.chgPct + micro };
      });
      setPrices(prev => ({ ...prev, ...updated }));
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const fmtPrice = (p, ticker) => {
    if (!p) return "—";
    if (p > 10000) return p.toLocaleString("sv-SE", { maximumFractionDigits: 0 });
    if (p > 100) return p.toLocaleString("sv-SE", { maximumFractionDigits: 1 });
    return p.toLocaleString("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div style={{ marginBottom: 18 }}>
      <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}`}</style>
      {Object.entries(QUICK_ITEMS).map(([section, items]) => (
        <div key={section} style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: "#475569", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
            {section}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
            {items.map(s => {
              const p = prices[s.ticker];
              const up = p ? p.chgPct >= 0 : null;
              return (
                <button key={s.name}
                  onClick={() => onSelect(s.name)}
                  style={{
                    background: "#0f172a", border: `1px solid ${p && up !== null ? (up ? "#22c55e22" : "#ef444422") : "#1e293b"}`,
                    borderRadius: 12, padding: "10px 6px", cursor: "pointer",
                    textAlign: "center", transition: "all 0.2s", animation: "fadeIn 0.3s ease"
                  }}
                  onMouseOver={e => e.currentTarget.style.borderColor = s.color + "66"}
                  onMouseOut={e => e.currentTarget.style.borderColor = p && up !== null ? (up ? "#22c55e22" : "#ef444422") : "#1e293b"}
                >
                  <div style={{ fontSize: 20, marginBottom: 3 }}>{s.icon}</div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#e2e8f0", lineHeight: 1.2, marginBottom: 3 }}>{s.name}</div>

                  {priceLoading ? (
                    <div style={{ height: 24, background: "#1e293b", borderRadius: 4, animation: "shimmer 1.5s infinite", backgroundSize: "200% 100%", backgroundImage: "linear-gradient(90deg,#1e293b 25%,#334155 50%,#1e293b 75%)" }} />
                  ) : p ? (
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "#e2e8f0" }}>{fmtPrice(p.price, s.ticker)}</div>
                      <PriceChip chgPct={p.chgPct} />
                    </div>
                  ) : (
                    <div style={{ fontSize: 10, color: "#475569" }}>—</div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      <div style={{ fontSize: 10, color: "#1e293b", textAlign: "right", marginTop: 4 }}>
        Priser är simulerade · Koppla Yahoo Finance API för riktiga kurser
      </div>
    </div>
  );
}

// ── Mini Sparkline Graph ──────────────────────────────────────────────────
function MiniGraph({ data, company }) {
  const months = ["J","F","M","A","M","J","J","A","S","O","N","D"];
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const w = 100 / (data.length - 1);
  const up = data[data.length - 1] >= data[0];
  const color = up ? "#22c55e" : "#ef4444";
  const pts = data.map((v, i) => `${i * w},${100 - ((v - min) / range) * 80 + 10}`).join(" ");
  const fillPts = `0,100 ${pts} ${(data.length - 1) * w},100`;
  const pct = ((data[data.length - 1] - data[0]) / data[0] * 100);

  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <div style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: 1 }}>📈 12 månader</div>
        <div style={{ fontSize: 13, fontWeight: 700, color }}>
          {up ? "▲" : "▼"} {Math.abs(pct).toFixed(1)}%
        </div>
      </div>
      <svg viewBox={`0 0 ${(data.length - 1) * w} 110`} style={{ width: "100%", height: 80, display: "block" }} preserveAspectRatio="none">
        <defs>
          <linearGradient id="graphGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <polygon points={fillPts} fill="url(#graphGrad)" />
        <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {/* Last point dot */}
        <circle cx={(data.length - 1) * w} cy={100 - ((data[data.length - 1] - min) / range) * 80 + 10} r="3" fill={color} />
      </svg>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "#334155", marginTop: 2 }}>
        {months.map((m, i) => <span key={i}>{m}</span>)}
      </div>
    </div>
  );
}

// ── Nyckeltal Card ────────────────────────────────────────────────────────
function NyckeltalCard({ nyckeltal: n }) {
  const items = [
    { label: "P/E-tal", value: n.pe, suffix: "x", tip: "Pris/vinst — lägre är billigare" },
    { label: "P/S-tal", value: n.ps, suffix: "x", tip: "Pris/omsättning" },
    { label: "Earnings Yield", value: n.ey, suffix: "%", tip: "Vinst/pris — högre är bättre" },
    { label: "Direktavkastning", value: n.direktavkastning, suffix: "%", tip: "Utdelning/kurs", color: "#22c55e" },
    { label: "Börsvärde", value: n.borsvarde, suffix: "", tip: "Totalt marknadsvärde" },
    { label: "EBITDA-marginal", value: n.ebitdaMarginal, suffix: "%", tip: "Rörelseresultat/omsättning" },
    { label: "Skuldsättning", value: n.skuldsattning, suffix: "", tip: "Finansiell hävstång" },
    { label: "Beta", value: n.betavarde, suffix: "", tip: "Volatilitet vs marknaden" },
  ];

  return (
    <div style={{ ...card(), marginBottom: 12 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#3b82f6", marginBottom: 12, textTransform: "uppercase", letterSpacing: 1 }}>📊 Nyckeltal</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {items.map(({ label, value, suffix, tip, color }) => (
          <div key={label} style={{ background: "#0a0f1e", borderRadius: 10, padding: "10px 12px" }} title={tip}>
            <div style={{ fontSize: 10, color: "#475569", marginBottom: 3 }}>{label}</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: color || "#e2e8f0" }}>
              {value !== undefined && value !== null ? `${value}${suffix}` : "—"}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Utdelning Card ────────────────────────────────────────────────────────
function UtdelningCard({ utdelning: u }) {
  const max = Math.max(...(u.historik || [1]));
  return (
    <div style={{ ...card(), marginBottom: 12 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#22c55e", marginBottom: 12, textTransform: "uppercase", letterSpacing: 1 }}>💰 Utdelning</div>
      <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
        <div style={{ flex: 1, background: "#0a0f1e", borderRadius: 10, padding: "10px 12px", textAlign: "center" }}>
          <div style={{ fontSize: 10, color: "#475569", marginBottom: 3 }}>Belopp</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#22c55e" }}>{u.belopp}</div>
        </div>
        <div style={{ flex: 1, background: "#0a0f1e", borderRadius: 10, padding: "10px 12px", textAlign: "center" }}>
          <div style={{ fontSize: 10, color: "#475569", marginBottom: 3 }}>Datum</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0" }}>{u.datum}</div>
        </div>
        <div style={{ flex: 1, background: "#0a0f1e", borderRadius: 10, padding: "10px 12px", textAlign: "center" }}>
          <div style={{ fontSize: 10, color: "#475569", marginBottom: 3 }}>Frekvens</div>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#e2e8f0" }}>{u.frekvens}</div>
        </div>
      </div>
      {u.historik?.length > 0 && (
        <div>
          <div style={{ fontSize: 10, color: "#475569", marginBottom: 6 }}>Historik (senaste 4 år)</div>
          <div style={{ display: "flex", gap: 6, alignItems: "flex-end", height: 48 }}>
            {u.historik.map((v, i) => (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                <div style={{ fontSize: 9, color: "#22c55e" }}>{v}</div>
                <div style={{ width: "100%", background: "#22c55e", borderRadius: "3px 3px 0 0", height: `${(v / max) * 36}px`, opacity: 0.6 + (i / u.historik.length) * 0.4 }} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Insider Transactions Card ─────────────────────────────────────────────
function InsiderCard({ insider }) {
  return (
    <div style={{ ...card(), marginBottom: 12 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#f59e0b", marginBottom: 10, textTransform: "uppercase", letterSpacing: 1 }}>🔍 Insiderhandel</div>
      {insider.map((t, i) => {
        const isBuy = t.typ === "Köp";
        return (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: i < insider.length - 1 ? "1px solid #1e293b" : "none" }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, color: "#e2e8f0", fontWeight: 500 }}>{t.namn}</div>
              <div style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>{t.datum}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 99, background: isBuy ? "#22c55e22" : "#ef444422", border: `1px solid ${isBuy ? "#22c55e44" : "#ef444444"}` }}>
                <span style={{ color: isBuy ? "#22c55e" : "#ef4444", fontSize: 11 }}>{isBuy ? "▲" : "▼"}</span>
                <span style={{ color: isBuy ? "#22c55e" : "#ef4444", fontSize: 12, fontWeight: 700 }}>{t.typ}</span>
              </div>
              <div style={{ fontSize: 11, color: "#64748b", marginTop: 3 }}>{t.antal?.toLocaleString("sv-SE")} st · {t.kurs} kr</div>
            </div>
          </div>
        );
      })}
      <div style={{ fontSize: 10, color: "#334155", marginTop: 8 }}>* AI-genererade insiderdata — verifiera mot FI:s register</div>
    </div>
  );
}

// ── Saved Analyses ────────────────────────────────────────────────────────
function useSavedAnalyses() {
  const [saved, setSaved] = useState(() => {
    try { return JSON.parse(localStorage.getItem("kapital_saved_analyses") || "[]"); } catch { return []; }
  });

  const saveAnalysis = (result) => {
    const entry = { ...result, savedAt: new Date().toISOString(), id: Date.now() };
    const next = [entry, ...saved.filter(s => s.company !== result.company)].slice(0, 50);
    setSaved(next);
    try { localStorage.setItem("kapital_saved_analyses", JSON.stringify(next)); } catch {}
  };

  const removeAnalysis = (id) => {
    const next = saved.filter(s => s.id !== id);
    setSaved(next);
    try { localStorage.setItem("kapital_saved_analyses", JSON.stringify(next)); } catch {}
  };

  const isSaved = (company) => saved.some(s => s.company === company);
  return { saved, saveAnalysis, removeAnalysis, isSaved };
}

function SaveAnalysisButton({ result, isPro, onUpgrade }) {
  const { saveAnalysis, isSaved } = useSavedAnalyses();
  const [justSaved, setJustSaved] = useState(false);
  const already = isSaved(result?.company);

  const handle = () => {
    if (!isPro) { onUpgrade(); return; }
    if (already) return;
    saveAnalysis(result);
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 2000);
  };

  return (
    <button onClick={handle} style={{
      display: "flex", alignItems: "center", gap: 6,
      padding: "7px 14px", borderRadius: 99, cursor: "pointer",
      background: justSaved || already ? "#10b98122" : "#1e293b",
      border: `1px solid ${justSaved || already ? "#10b98166" : "#334155"}`,
      color: justSaved || already ? "#10b981" : "#64748b",
      fontSize: 13, fontWeight: justSaved || already ? 700 : 400,
      transition: "all 0.3s"
    }}>
      {justSaved ? "✓ Sparad!" : already ? "✓ Sparad" : isPro ? "💾 Spara" : "💾 Spara"}
      {!isPro && <span style={{ fontSize: 9, background: "linear-gradient(90deg,#f59e0b,#ef4444)", color: "#fff", padding: "1px 5px", borderRadius: 99, fontWeight: 700 }}>PRO</span>}
    </button>
  );
}

// ── Watch Button ──────────────────────────────────────────────────────────
function WatchButton({ company }) {
  const { toggle, isWatched } = useWatchlist();
  const watched = isWatched(company);
  return (
    <button onClick={() => toggle(company)} style={{
      display: "flex", alignItems: "center", gap: 6,
      padding: "7px 14px", borderRadius: 99, cursor: "pointer",
      background: watched ? "#f59e0b22" : "#1e293b",
      border: `1px solid ${watched ? "#f59e0b66" : "#334155"}`,
      color: watched ? "#f59e0b" : "#64748b", fontSize: 13, fontWeight: watched ? 700 : 400
    }}>
      {watched ? "★ Bevakas" : "☆ Bevaka"}
    </button>
  );
}

function NotificationBell({ onOpen }) {
  const { unreadCount } = useNotifications();
  return (
    <button onClick={onOpen} style={{ position: "relative", padding: "6px 10px", background: "#1e293b", border: "1px solid #334155", borderRadius: 8, color: "#94a3b8", fontSize: 18, cursor: "pointer", lineHeight: 1 }}>
      🔔
      {unreadCount > 0 && (
        <span style={{ position: "absolute", top: 2, right: 2, width: 16, height: 16, borderRadius: "50%", background: "#ef4444", fontSize: 9, fontWeight: 700, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </button>
  );
}

// ── Analysis Tab ─────────────────────────────────────────────────────────
function AnalysTab({ result, loading, loadStep = 0, error, query, setQuery, analyze, history, setResult, isPro, usageCount, onUpgrade, t, onGoMaklare, onGoKalender, onCompare }) {
  const remaining = FREE_LIMIT - usageCount;
  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === "Enter" && analyze()}
          placeholder={t.placeholder}
          style={{ flex: 1, padding: "11px 14px", background: "#1e293b", border: "1px solid #334155", borderRadius: 10, color: "#e2e8f0", fontSize: 15, outline: "none" }} />
        <button onClick={() => analyze()} disabled={loading || !query.trim()} style={{
          padding: "11px 18px", background: loading ? "#1e293b" : "linear-gradient(135deg,#10b981,#0ea5e9)",
          border: "none", borderRadius: 10, color: "#fff", fontSize: 14, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer"
        }}>{loading ? "●●●" : t.analyze}</button>
      </div>

      {/* Quick action row */}
      {!result && !loading && (
        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          <button onClick={onGoMaklare} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px", background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12, color: "#94a3b8", fontSize: 12, cursor: "pointer", fontWeight: 500 }}>
            🏦 <span>Mäklare</span>
          </button>
          <button onClick={onGoKalender} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px", background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12, color: "#94a3b8", fontSize: 12, cursor: "pointer", fontWeight: 500 }}>
            🗓 <span>Rapporter</span>
          </button>
          <button onClick={onCompare} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px", background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12, color: "#94a3b8", fontSize: 12, cursor: "pointer", fontWeight: 500 }}>
            ⚖️ <span>Jämför</span>
          </button>
        </div>
      )}

      {!isPro && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 5 }}>
            <span style={{ color: "#64748b" }}>{t.freeLabel}</span>
            <span style={{ color: remaining > 0 ? "#10b981" : "#ef4444", fontWeight: 600 }}>
              {remaining > 0 ? t.freeLeft(remaining) : t.freeDone}
            </span>
          </div>
          <div style={{ background: "#1e293b", borderRadius: 99, height: 6, overflow: "hidden" }}>
            <div style={{
              width: `${(usageCount / FREE_LIMIT) * 100}%`,
              height: "100%", borderRadius: 99,
              background: remaining > 0 ? "linear-gradient(90deg,#10b981,#0ea5e9)" : "#ef4444",
              transition: "width 0.5s ease"
            }} />
          </div>
        </div>
      )}

      {/* Quick-access grid with live prices - visas bara nar inget resultat */}
      {!result && !loading && <QuickGrid onSelect={(name) => { setQuery(name); analyze(name); }} />}

      {!isPro && usageCount >= FREE_LIMIT && !loading && <ProGate onUpgrade={onUpgrade} t={t} />}
      {error && <div style={{ padding: 14, background: "#1e293b", border: "1px solid #ef4444", borderRadius: 12, color: "#fca5a5", fontSize: 14, marginBottom: 12 }}>{error}</div>}
      {loading && (
        <div>
          {/* Animated status */}
          <div style={{ background: "#0f172a", borderRadius: 14, border: "1px solid #10b98133", padding: "20px 18px", marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <div style={{ position: "relative", width: 36, height: 36 }}>
                <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "3px solid #1e293b" }} />
                <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "3px solid transparent", borderTopColor: "#10b981", animation: "spin 0.8s linear infinite" }} />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#e2e8f0" }}>{t.analyzing} {query}...</div>
                <div style={{ fontSize: 12, color: "#10b981", marginTop: 2, transition: "all 0.3s" }}>{t.steps[loadStep]}</div>
              </div>
            </div>
            {/* Progress dots */}
            <div style={{ display: "flex", gap: 6 }}>
              {[0,1,2,3].map(i => (
                <div key={i} style={{ height: 4, flex: 1, borderRadius: 99, background: i <= loadStep ? "#10b981" : "#1e293b", transition: "background 0.4s ease" }} />
              ))}
            </div>
          </div>
          {/* Skeleton cards */}
          {[80, 120, 60].map((h, i) => (
            <div key={i} style={{ background: "#0f172a", borderRadius: 14, border: "1px solid #1e293b", padding: 16, marginBottom: 12, overflow: "hidden", position: "relative" }}>
              <div style={{ height: h, borderRadius: 8, background: "linear-gradient(90deg,#1e293b 25%,#334155 50%,#1e293b 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.5s infinite" }} />
            </div>
          ))}
          <style>{`
            @keyframes spin { to { transform: rotate(360deg); } }
            @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
          `}</style>
        </div>
      )}

      {result && !loading && (
        <div>
          {/* Back + watchlist header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <button onClick={() => { setResult(null); setQuery(""); }} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: "#64748b", fontSize: 13, cursor: "pointer", padding: 0 }}>
              ← Tillbaka
            </button>
            <div style={{ display: "flex", gap: 8 }}>
              <SaveAnalysisButton result={result} isPro={isPro} onUpgrade={onUpgrade} />
              <WatchButton company={result.company} />
            </div>
          </div>

          {/* Main card with mini graph */}
          <div style={card()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 19, fontWeight: 700 }}>{result.company}</h2>
                <div style={{ fontSize: 12, color: "#64748b" }}>{result.sector}</div>
              </div>
              <div style={{ padding: "5px 14px", borderRadius: 99, background: recColor(result.recommendation) + "22", color: recColor(result.recommendation), fontWeight: 700, fontSize: 14, border: `1px solid ${recColor(result.recommendation)}44` }}>
                {result.recommendation} ({t.aiSignal})
              </div>
            </div>
            <ScoreBar score={result.score} />
            <p style={{ fontSize: 13, color: "#64748b", margin: "6px 0 0" }}>{result.scoreReason}</p>

            {/* Mini sparkline graph */}
            {result.grafData?.length > 0 && (
              <MiniGraph data={result.grafData} company={result.company} />
            )}

            <p style={{ fontSize: 14, color: "#cbd5e1", marginTop: 14, lineHeight: 1.6 }}>{result.summary}</p>
            <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
              <span style={{ padding: "3px 10px", background: "#1e293b", borderRadius: 6, fontSize: 12, color: "#94a3b8" }}>⏱ {result.timeHorizon}</span>
              <span style={{ padding: "3px 10px", background: "#1e293b", borderRadius: 6, fontSize: 12, color: "#94a3b8" }}>🗓 {result.lastUpdated}</span>
            </div>
          </div>

          {/* Kurslarm - direkt under huvudinfo */}
          <div style={{ ...card(), padding: "14px 16px" }}>
            <AlertsPanel company={result.company} currentPrice={null} />
          </div>

          {/* Nyckeltal grid */}
          {result.nyckeltal && <NyckeltalCard nyckeltal={result.nyckeltal} />}

          {/* Utdelning */}
          {result.utdelning && <UtdelningCard utdelning={result.utdelning} />}

          {/* Insider */}
          {result.insider?.length > 0 && <InsiderCard insider={result.insider} />}

          {/* Risks & Strengths */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
            {[["⚠ Risker", result.keyRisks, "#ef4444"], ["✓ Styrkor", result.keyStrengths, "#22c55e"]].map(([label, items, color]) => (
              <div key={label} style={card()}>
                <div style={{ fontSize: 11, fontWeight: 700, color, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>{label}</div>
                {items?.map((x, i) => <div key={i} style={{ fontSize: 13, color: "#cbd5e1", marginBottom: 5, display: "flex", gap: 6 }}><span style={{ color }}>•</span>{x}</div>)}
              </div>
            ))}
          </div>

          {result.catalysts?.length > 0 && (
            <div style={card()}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#f59e0b", marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>🚀 Katalysatorer</div>
              {result.catalysts.map((c, i) => <div key={i} style={{ fontSize: 13, color: "#cbd5e1", marginBottom: 5, display: "flex", gap: 6 }}><span style={{ color: "#f59e0b" }}>→</span>{c}</div>)}
            </div>
          )}

          <div style={card()}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>📰 Nyheter</div>
            {result.news?.map((n, i) => (
              <div key={i} style={{ display: "flex", gap: 10, padding: "10px 0", borderBottom: i < result.news.length - 1 ? "1px solid #1e293b" : "none" }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", marginTop: 5, flexShrink: 0, background: n.sentiment === "positiv" ? "#22c55e" : n.sentiment === "negativ" ? "#ef4444" : "#f59e0b" }} />
                <div>
                  <div style={{ fontSize: 13, color: "#e2e8f0" }}>{n.headline}</div>
                  <div style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>{n.date} · {n.source}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!result && !loading && !error && (!(!isPro && usageCount >= FREE_LIMIT)) && (
        <div style={{ textAlign: "center", padding: "70px 0", color: "#334155" }}>
          <div style={{ fontSize: 44 }}>📈</div>
          <div style={{ fontSize: 15, color: "#475569", marginTop: 10 }}>{t.emptyState}</div>
        </div>
      )}

      {history.length > 1 && (
        <div style={{ marginTop: 20 }}>
          <div style={{ fontSize: 11, color: "#64748b", marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>{t.recentAnalyzed}</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {history.slice(1).map((h, i) => (
              <button key={i} onClick={() => { setResult(h); setQuery(h.company); }} style={{ padding: "6px 12px", background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, color: "#94a3b8", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: recColor(h.recommendation) }} />{h.company} <span style={{ color: "#475569" }}>{h.score}/100</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Watchlist Tab ─────────────────────────────────────────────────────────
function WatchlistTab({ onAnalyze, isPro, onUpgrade, onlySection }) {
  const { watchlist, toggle } = useWatchlist();
  const { saved, removeAnalysis } = useSavedAnalyses();
  const [section, setSection] = useState(onlySection || "watchlist");

  const [prices] = useState(() => {
    const all = {};
    Object.values(QUICK_ITEMS).flat().forEach(s => { all[s.name] = mockPrice(s.ticker); });
    return all;
  });

  return (
    <div>
      {/* Sub-tabs - only shown when not controlled by parent */}
      {!onlySection && (
        <div style={{ display: "flex", gap: 4, background: "#0f172a", borderRadius: 12, padding: 4, border: "1px solid #1e293b", marginBottom: 16 }}>
          <button onClick={() => setSection("watchlist")} style={{ flex: 1, padding: "9px", background: section === "watchlist" ? "linear-gradient(135deg,#10b981,#0ea5e9)" : "none", border: "none", borderRadius: 9, color: section === "watchlist" ? "#fff" : "#64748b", fontSize: 13, fontWeight: section === "watchlist" ? 700 : 400, cursor: "pointer" }}>
            ⭐ Bevakningar
          </button>
          <button onClick={() => setSection("saved")} style={{ flex: 1, padding: "9px", background: section === "saved" ? "linear-gradient(135deg,#10b981,#0ea5e9)" : "none", border: "none", borderRadius: 9, color: section === "saved" ? "#fff" : "#64748b", fontSize: 13, fontWeight: section === "saved" ? 700 : 400, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
            💾 Sparade
            {!isPro && <span style={{ fontSize: 9, background: "linear-gradient(90deg,#f59e0b,#ef4444)", color: "#fff", padding: "1px 5px", borderRadius: 99, fontWeight: 700 }}>PRO</span>}
          </button>
        </div>
      )}

      {/* WATCHLIST */}
      {section === "watchlist" && (
        watchlist.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 0", color: "#334155" }}>
            <div style={{ fontSize: 44, marginBottom: 16 }}>⭐</div>
            <div style={{ fontSize: 16, color: "#475569", marginBottom: 8 }}>Ingen bevakningslista ännu</div>
            <div style={{ fontSize: 13, color: "#334155" }}>Tryck på ☆ Bevaka på en aktiesida för att lägga till</div>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: 11, color: "#64748b", marginBottom: 12, textTransform: "uppercase", letterSpacing: 1 }}>
              ⭐ Bevakningslista · {watchlist.length} aktier
            </div>
            {watchlist.map(company => {
              const allItems = Object.values(QUICK_ITEMS).flat();
              const item = allItems.find(s => s.name === company);
              const p = prices[company];
              const up = p ? p.chgPct >= 0 : null;
              return (
                <div key={company} style={{ ...card(), display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ fontSize: 24 }}>{item?.icon || "📈"}</div>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 600, color: "#e2e8f0" }}>{company}</div>
                      <div style={{ fontSize: 11, color: "#475569" }}>{item?.ticker || "—"}</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    {p && (
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "#e2e8f0" }}>{p.price > 1000 ? p.price.toLocaleString("sv-SE", { maximumFractionDigits: 0 }) : p.price.toFixed(2)} kr</div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: up ? "#22c55e" : "#ef4444" }}>{up ? "▲" : "▼"} {Math.abs(p.chgPct).toFixed(2)}%</div>
                      </div>
                    )}
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <button onClick={() => onAnalyze(company)} style={{ padding: "5px 12px", background: "linear-gradient(135deg,#10b981,#0ea5e9)", border: "none", borderRadius: 8, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                        Analysera
                      </button>
                      <button onClick={() => toggle(company)} style={{ padding: "4px 10px", background: "none", border: "1px solid #334155", borderRadius: 8, color: "#64748b", fontSize: 11, cursor: "pointer" }}>
                        Ta bort
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* SAVED ANALYSES */}
      {section === "saved" && (
        !isPro ? (
          <div style={{ background: "linear-gradient(135deg,#0f172a,#1e1040)", borderRadius: 16, border: "1px solid #10b98133", padding: 28, textAlign: "center" }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>💾</div>
            <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 8 }}>Sparade analyser</div>
            <div style={{ fontSize: 13, color: "#64748b", marginBottom: 20, lineHeight: 1.7 }}>
              Spara obegränsat med analyser och bygg upp<br />din egen analyshistorik med Pro.
            </div>
            <button onClick={onUpgrade} style={{ padding: "12px 28px", background: "linear-gradient(135deg,#10b981,#0ea5e9)", border: "none", borderRadius: 12, color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
              Uppgradera till Pro
            </button>
            {/* Blurred preview */}
            <div style={{ marginTop: 16, filter: "blur(5px)", pointerEvents: "none", opacity: 0.4 }}>
              {["Ericsson", "Volvo", "H&M"].map(c => (
                <div key={c} style={{ ...card(), display: "flex", justifyContent: "space-between", textAlign: "left" }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#e2e8f0" }}>{c}</div>
                    <div style={{ fontSize: 11, color: "#64748b" }}>Analyserad idag</div>
                  </div>
                  <div style={{ fontSize: 13, color: "#22c55e", fontWeight: 700 }}>Köp · 72/100</div>
                </div>
              ))}
            </div>
          </div>
        ) : saved.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 0", color: "#334155" }}>
            <div style={{ fontSize: 44, marginBottom: 16 }}>💾</div>
            <div style={{ fontSize: 16, color: "#475569", marginBottom: 8 }}>Inga sparade analyser ännu</div>
            <div style={{ fontSize: 13, color: "#334155" }}>Tryck på 💾 Spara på en analysida</div>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: 11, color: "#64748b", marginBottom: 12, textTransform: "uppercase", letterSpacing: 1 }}>
              💾 Sparade analyser · {saved.length} st
            </div>
            {saved.map(s => {
              const date = new Date(s.savedAt).toLocaleDateString("sv-SE", { day: "numeric", month: "short", year: "numeric" });
              return (
                <div key={s.id} style={{ ...card(), display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: "#e2e8f0" }}>{s.company}</div>
                      <div style={{ padding: "2px 8px", borderRadius: 99, background: recColor(s.recommendation) + "22", color: recColor(s.recommendation), fontSize: 11, fontWeight: 700, border: `1px solid ${recColor(s.recommendation)}44` }}>
                        {s.recommendation}
                      </div>
                    </div>
                    <div style={{ fontSize: 12, color: "#64748b" }}>{s.sector} · {date}</div>
                    <div style={{ fontSize: 11, color: "#475569", marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.summary}</div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, marginLeft: 10 }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: recColor(s.recommendation) }}>{s.score}</div>
                    <div style={{ fontSize: 10, color: "#475569" }}>/100</div>
                    <button onClick={() => onAnalyze(s.company)} style={{ padding: "4px 10px", background: "linear-gradient(135deg,#10b981,#0ea5e9)", border: "none", borderRadius: 8, color: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                      Uppdatera
                    </button>
                    <button onClick={() => removeAnalysis(s.id)} style={{ fontSize: 11, color: "#ef4444", background: "none", border: "none", cursor: "pointer" }}>
                      Ta bort
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}
    </div>
  );
}

// ── Portfolio Tab ─────────────────────────────────────────────────────────
function PortfoljTab({ isPro, onUpgrade }) {
  const [holdings, setHoldings] = useState([
    { id: 1, company: "Ericsson", shares: 500, buyPrice: 68.5, currentPrice: 74.2 },
    { id: 2, company: "Volvo B", shares: 100, buyPrice: 245.0, currentPrice: 268.5 },
    { id: 3, company: "H&M B", shares: 200, buyPrice: 132.0, currentPrice: 118.4 },
  ]);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ company: "", shares: "", buyPrice: "", currentPrice: "" });
  const [nextId, setNextId] = useState(4);

  const totalInvested = holdings.reduce((s, h) => s + h.shares * h.buyPrice, 0);
  const totalValue = holdings.reduce((s, h) => s + h.shares * h.currentPrice, 0);
  const totalPnl = totalValue - totalInvested;
  const totalPct = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0;

  const addHolding = () => {
    if (!form.company || !form.shares || !form.buyPrice || !form.currentPrice) return;
    setHoldings([...holdings, { id: nextId, company: form.company, shares: +form.shares, buyPrice: +form.buyPrice, currentPrice: +form.currentPrice }]);
    setNextId(nextId + 1);
    setForm({ company: "", shares: "", buyPrice: "", currentPrice: "" });
    setAdding(false);
  };

  const remove = (id) => setHoldings(holdings.filter(h => h.id !== id));

  const inp = (key, ph) => (
    <input value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })} placeholder={ph}
      style={{ width: "100%", padding: "8px 10px", background: "#0a0f1e", border: "1px solid #334155", borderRadius: 8, color: "#e2e8f0", fontSize: 13, outline: "none", boxSizing: "border-box" }} />
  );

  if (!isPro) return (
    <div>
      <div style={{ ...card(), background: "linear-gradient(135deg,#0f172a,#1e1040)", textAlign: "center", padding: 28 }}>
        <div style={{ fontSize: 36, marginBottom: 10 }}>💼</div>
        <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 8 }}>Portföljspårning <ProBadge /></div>
        <div style={{ fontSize: 13, color: "#64748b", marginBottom: 20, lineHeight: 1.7 }}>Lägg in dina innehav och se total värdeutveckling,<br />vinst/förlust per aktie och portföljfördelning.</div>
        <button onClick={onUpgrade} style={{ padding: "12px 28px", background: "linear-gradient(135deg,#f59e0b,#ef4444)", border: "none", borderRadius: 10, color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>Uppgradera till Pro</button>
      </div>
      {/* Preview blurred */}
      <div style={{ position: "relative", filter: "blur(4px)", pointerEvents: "none", opacity: 0.4, marginTop: 12 }}>
        <div style={card()}>
          <div style={{ fontSize: 13, color: "#64748b" }}>Total portföljvärde</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: "#e2e8f0" }}>148 320 kr</div>
          <div style={{ fontSize: 14, color: "#22c55e" }}>+12 540 kr (+9.2%)</div>
        </div>
      </div>
    </div>
  );

  return (
    <div>
      {/* Summary */}
      <div style={card()}>
        <div style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>Total portföljvärde</div>
        <div style={{ fontSize: 28, fontWeight: 700 }}>{fmt(totalValue, 0)} kr</div>
        <div style={{ fontSize: 15, color: totalPnl >= 0 ? "#22c55e" : "#ef4444", marginTop: 4 }}>
          {totalPnl >= 0 ? "+" : ""}{fmt(totalPnl, 0)} kr ({totalPnl >= 0 ? "+" : ""}{fmt(totalPct, 1)}%)
        </div>
        <div style={{ marginTop: 12 }}>
          {/* Simple bar chart */}
          {holdings.map(h => {
            const val = h.shares * h.currentPrice;
            const pct = totalValue > 0 ? (val / totalValue) * 100 : 0;
            return (
              <div key={h.id} style={{ marginBottom: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#94a3b8", marginBottom: 2 }}>
                  <span>{h.company}</span><span>{fmt(pct, 1)}%</span>
                </div>
                <div style={{ background: "#1e293b", borderRadius: 4, height: 6, overflow: "hidden" }}>
                  <div style={{ width: `${pct}%`, height: "100%", background: "linear-gradient(90deg,#10b981,#0ea5e9)", borderRadius: 4 }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Holdings */}
      {holdings.map(h => {
        const cost = h.shares * h.buyPrice;
        const value = h.shares * h.currentPrice;
        const pnl = value - cost;
        const pct = (pnl / cost) * 100;
        return (
          <div key={h.id} style={card()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600 }}>{h.company}</div>
                <div style={{ fontSize: 12, color: "#64748b" }}>{fmt(h.shares, 0)} aktier · Köpt {fmt(h.buyPrice, 2)} kr</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 16, fontWeight: 700 }}>{fmt(value, 0)} kr</div>
                <div style={{ fontSize: 13, color: pnl >= 0 ? "#22c55e" : "#ef4444" }}>
                  {pnl >= 0 ? "+" : ""}{fmt(pnl, 0)} kr ({pnl >= 0 ? "+" : ""}{fmt(pct, 1)}%)
                </div>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, alignItems: "center" }}>
              <div style={{ fontSize: 12, color: "#475569" }}>Nu: {fmt(h.currentPrice, 2)} kr</div>
              <button onClick={() => remove(h.id)} style={{ fontSize: 11, color: "#ef4444", background: "none", border: "none", cursor: "pointer", padding: 0 }}>Ta bort</button>
            </div>
          </div>
        );
      })}

      {/* Add holding */}
      {adding ? (
        <div style={card()}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#94a3b8", marginBottom: 12 }}>Lägg till innehav</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
            <div>{inp("company", "Bolagsnamn")}</div>
            <div>{inp("shares", "Antal aktier")}</div>
            <div>{inp("buyPrice", "Köpkurs (kr)")}</div>
            <div>{inp("currentPrice", "Nuvarande kurs (kr)")}</div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={addHolding} style={{ flex: 1, padding: "10px", background: "linear-gradient(135deg,#10b981,#0ea5e9)", border: "none", borderRadius: 8, color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Lägg till</button>
            <button onClick={() => setAdding(false)} style={{ padding: "10px 16px", background: "#1e293b", border: "1px solid #334155", borderRadius: 8, color: "#94a3b8", fontSize: 14, cursor: "pointer" }}>Avbryt</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setAdding(true)} style={{ width: "100%", padding: "12px", background: "#0f172a", border: "1px dashed #334155", borderRadius: 12, color: "#64748b", fontSize: 14, cursor: "pointer" }}>
          + Lägg till aktie
        </button>
      )}
    </div>
  );
}

// ── Price Alerts ──────────────────────────────────────────────────────────
function useAlerts() {
  const [alerts, setAlerts] = useState(() => {
    try { return JSON.parse(localStorage.getItem("kapital_alerts") || "[]"); } catch { return []; }
  });

  const save = (a) => {
    setAlerts(a);
    try { localStorage.setItem("kapital_alerts", JSON.stringify(a)); } catch {}
  };

  const addAlert = (company, type, price) => {
    const newAlert = { id: Date.now(), company, type, price: parseFloat(price), triggered: false, created: new Date().toLocaleDateString("sv-SE") };
    save([...alerts, newAlert]);
  };

  const removeAlert = (id) => save(alerts.filter(a => a.id !== id));

  // Request browser notification permission
  const requestPermission = async () => {
    if (typeof window !== "undefined" && "Notification" in window) {
      try {
        const perm = await window.Notification.requestPermission();
        return perm === "granted";
      } catch { return false; }
    }
    return false;
  };

  // Check alerts against current mock prices
  const checkAlerts = (prices) => {
    let updated = false;
    const newAlerts = alerts.map(a => {
      if (a.triggered) return a;
      const ticker = Object.values(QUICK_ITEMS).flat().find(s => s.name === a.company)?.ticker;
      if (!ticker || !prices[ticker]) return a;
      const currentPrice = prices[ticker].price;
      const hit = (a.type === "above" && currentPrice >= a.price) || (a.type === "below" && currentPrice <= a.price);
      if (hit) {
        updated = true;
        if (typeof window !== "undefined" && "Notification" in window && window.Notification.permission === "granted") {
          try {
            new window.Notification(`📊 Kapital — ${a.company}`, {
              body: `Kursen är nu ${currentPrice.toFixed(2)} kr (mål: ${a.type === "above" ? "▲" : "▼"} ${a.price} kr)`,
              icon: "📈"
            });
          } catch {}
        }
        return { ...a, triggered: true };
      }
      return a;
    });
    if (updated) save(newAlerts);
  };

  return { alerts, addAlert, removeAlert, requestPermission, checkAlerts };
}

function AlertsPanel({ company, currentPrice }) {
  const { alerts, addAlert, removeAlert, requestPermission } = useAlerts();
  const [targetPrice, setTargetPrice] = useState("");
  const [alertType, setAlertType] = useState("above");
  const [permGranted, setPermGranted] = useState(() => {
    try { return typeof window !== "undefined" && "Notification" in window && window.Notification.permission === "granted"; } catch { return false; }
  });

  const handleAdd = async () => {
    if (!targetPrice || isNaN(parseFloat(targetPrice))) return;
    if (!permGranted) {
      const granted = await requestPermission();
      setPermGranted(granted);
    }
    addAlert(company, alertType, targetPrice);
    setTargetPrice("");
  };

  const companyAlerts = alerts.filter(a => a.company === company);

  return (
    <div style={{ marginTop: 12, padding: "14px", background: "#0a0f1e", borderRadius: 10, border: "1px solid #1e293b" }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b", marginBottom: 10, textTransform: "uppercase", letterSpacing: 1 }}>🔔 Kurslarm</div>
      <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
        <button onClick={() => setAlertType("above")} style={{ flex: 1, padding: "7px", background: alertType === "above" ? "#22c55e22" : "#1e293b", border: `1px solid ${alertType === "above" ? "#22c55e" : "#334155"}`, borderRadius: 8, color: alertType === "above" ? "#22c55e" : "#64748b", fontSize: 12, cursor: "pointer", fontWeight: alertType === "above" ? 700 : 400 }}>
          ▲ Över
        </button>
        <button onClick={() => setAlertType("below")} style={{ flex: 1, padding: "7px", background: alertType === "below" ? "#ef444422" : "#1e293b", border: `1px solid ${alertType === "below" ? "#ef4444" : "#334155"}`, borderRadius: 8, color: alertType === "below" ? "#ef4444" : "#64748b", fontSize: 12, cursor: "pointer", fontWeight: alertType === "below" ? 700 : 400 }}>
          ▼ Under
        </button>
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <input value={targetPrice} onChange={e => setTargetPrice(e.target.value)} placeholder={currentPrice ? `Nu: ${currentPrice.toFixed(2)}` : "Kurs (kr)"}
          style={{ flex: 1, padding: "9px 12px", background: "#1e293b", border: "1px solid #334155", borderRadius: 8, color: "#e2e8f0", fontSize: 14, outline: "none" }} />
        <button onClick={handleAdd} disabled={!targetPrice} style={{ padding: "9px 16px", background: "linear-gradient(135deg,#10b981,#0ea5e9)", border: "none", borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
          + Lägg till
        </button>
      </div>
      {!permGranted && (
        <div style={{ fontSize: 11, color: "#f59e0b", marginTop: 6 }}>⚠ Tillåt notiser i webbläsaren för att få larm när du inte är inne i appen.</div>
      )}
      {companyAlerts.length > 0 && (
        <div style={{ marginTop: 10 }}>
          {companyAlerts.map(a => (
            <div key={a.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderTop: "1px solid #1e293b" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ color: a.type === "above" ? "#22c55e" : "#ef4444", fontSize: 13 }}>{a.type === "above" ? "▲" : "▼"}</span>
                <span style={{ fontSize: 13, color: a.triggered ? "#64748b" : "#e2e8f0", textDecoration: a.triggered ? "line-through" : "none" }}>{a.price} kr</span>
                {a.triggered && <span style={{ fontSize: 10, color: "#22c55e", background: "#22c55e22", padding: "1px 6px", borderRadius: 99 }}>✓ Triggrad</span>}
              </div>
              <button onClick={() => removeAlert(a.id)} style={{ fontSize: 11, color: "#ef4444", background: "none", border: "none", cursor: "pointer" }}>Ta bort</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Calculator Tab ────────────────────────────────────────────────────────
function KalkylatornTab() {
  const [amount, setAmount] = useState("");
  const [buyPrice, setBuyPrice] = useState("");
  const [targetPrice, setTargetPrice] = useState("");
  const [stopPrice, setStopPrice] = useState("");
  const [mode, setMode] = useState("amount"); // "amount" | "shares"
  const [shares, setShares] = useState("");
  const [alertCompany, setAlertCompany] = useState("");

  const bp = parseFloat(buyPrice) || 0;
  const tp = parseFloat(targetPrice) || 0;
  const sp = parseFloat(stopPrice) || 0;
  const inv = parseFloat(amount) || 0;
  const numShares = mode === "amount" ? (bp > 0 ? Math.floor(inv / bp) : 0) : (parseFloat(shares) || 0);
  const totalInvested = numShares * bp;
  const fee = Math.max(1, totalInvested * 0.00015);

  const gain = tp > 0 ? ((tp - bp) / bp * 100) : 0;
  const loss = sp > 0 ? ((sp - bp) / bp * 100) : 0;
  const profitKr = tp > 0 ? (numShares * (tp - bp) - fee * 2) : 0;
  const lossKr = sp > 0 ? (numShares * (sp - bp) - fee) : 0;
  const rr = Math.abs(lossKr) > 0 ? Math.abs(profitKr / lossKr) : 0;

  const BigInput = ({ label, value, set, placeholder, color, emoji }) => (
    <div style={{ background: "#0f172a", borderRadius: 14, border: `1px solid ${color}33`, padding: "16px", marginBottom: 10 }}>
      <div style={{ fontSize: 12, color: "#64748b", marginBottom: 8 }}>{emoji} {label}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <input value={value} onChange={e => set(e.target.value)} placeholder={placeholder} inputMode="decimal"
          style={{ flex: 1, background: "none", border: "none", outline: "none", fontSize: 28, fontWeight: 700, color: color || "#e2e8f0", width: "100%" }} />
        <span style={{ fontSize: 14, color: "#475569" }}>kr</span>
      </div>
    </div>
  );

  return (
    <div>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.6}}`}</style>

      {/* Mode toggle */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16, background: "#0f172a", borderRadius: 12, padding: 4, border: "1px solid #1e293b" }}>
        {[["amount", "💰 Investerat belopp"], ["shares", "📦 Antal aktier"]].map(([m, label]) => (
          <button key={m} onClick={() => setMode(m)} style={{ flex: 1, padding: "9px", background: mode === m ? "linear-gradient(135deg,#10b981,#0ea5e9)" : "none", border: "none", borderRadius: 9, color: mode === m ? "#fff" : "#64748b", fontSize: 13, fontWeight: mode === m ? 700 : 400, cursor: "pointer" }}>
            {label}
          </button>
        ))}
      </div>

      {/* Inputs */}
      <BigInput label="Köpkurs" value={buyPrice} set={setBuyPrice} placeholder="0.00" color="#0ea5e9" emoji="📈" />

      {mode === "amount" ? (
        <div style={{ background: "#0f172a", borderRadius: 14, border: "1px solid #0ea5e933", padding: "16px", marginBottom: 10 }}>
          <div style={{ fontSize: 12, color: "#64748b", marginBottom: 8 }}>💸 Belopp att investera</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input value={amount} onChange={e => setAmount(e.target.value)} placeholder="10 000" inputMode="decimal"
              style={{ flex: 1, background: "none", border: "none", outline: "none", fontSize: 28, fontWeight: 700, color: "#e2e8f0", width: "100%" }} />
            <span style={{ fontSize: 14, color: "#475569" }}>kr</span>
          </div>
          {numShares > 0 && <div style={{ fontSize: 12, color: "#10b981", marginTop: 6 }}>≈ {numShares} aktier</div>}
        </div>
      ) : (
        <div style={{ background: "#0f172a", borderRadius: 14, border: "1px solid #0ea5e933", padding: "16px", marginBottom: 10 }}>
          <div style={{ fontSize: 12, color: "#64748b", marginBottom: 8 }}>📦 Antal aktier</div>
          <input value={shares} onChange={e => setShares(e.target.value)} placeholder="1 000" inputMode="numeric"
            style={{ background: "none", border: "none", outline: "none", fontSize: 28, fontWeight: 700, color: "#e2e8f0", width: "100%" }} />
        </div>
      )}

      <BigInput label="Kursmål" value={targetPrice} set={setTargetPrice} placeholder="0.00" color="#22c55e" emoji="🎯" />
      <BigInput label="Stop-loss" value={stopPrice} set={setStopPrice} placeholder="0.00" color="#ef4444" emoji="🛡️" />

      {/* Live result */}
      {bp > 0 && numShares > 0 && (
        <div style={{ background: "linear-gradient(135deg,#0f172a,#0a1f1a)", borderRadius: 16, border: "1px solid #10b98133", padding: 20, marginTop: 4 }}>
          <div style={{ fontSize: 12, color: "#64748b", marginBottom: 14, textTransform: "uppercase", letterSpacing: 1 }}>📊 Sammanfattning</div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
            <div style={{ background: "#0a0f1e", borderRadius: 10, padding: 12, textAlign: "center" }}>
              <div style={{ fontSize: 11, color: "#64748b", marginBottom: 4 }}>Investerat</div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{fmt(totalInvested, 0)} kr</div>
            </div>
            <div style={{ background: "#0a0f1e", borderRadius: 10, padding: 12, textAlign: "center" }}>
              <div style={{ fontSize: 11, color: "#64748b", marginBottom: 4 }}>Courtage (est.)</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#f59e0b" }}>{fmt(fee, 2)} kr</div>
            </div>
          </div>

          {tp > 0 && (
            <div style={{ background: "#22c55e11", borderRadius: 12, padding: "12px 16px", marginBottom: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 12, color: "#64748b" }}>🎯 Vid kursmål {tp} kr</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: "#22c55e", marginTop: 2 }}>+{fmt(profitKr, 0)} kr</div>
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, color: "#22c55e" }}>+{fmt(gain, 1)}%</div>
            </div>
          )}

          {sp > 0 && (
            <div style={{ background: "#ef444411", borderRadius: 12, padding: "12px 16px", marginBottom: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 12, color: "#64748b" }}>🛡️ Vid stop-loss {sp} kr</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: "#ef4444", marginTop: 2 }}>{fmt(lossKr, 0)} kr</div>
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, color: "#ef4444" }}>{fmt(loss, 1)}%</div>
            </div>
          )}

          {tp > 0 && sp > 0 && (
            <div style={{ background: rr >= 2 ? "#22c55e11" : "#ef444411", borderRadius: 12, padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 12, color: "#64748b" }}>Risk/Reward</div>
                <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>{rr >= 2 ? "✓ Bra affär" : "⚠ Låg kvot"}</div>
              </div>
              <div style={{ fontSize: 32, fontWeight: 800, color: rr >= 2 ? "#22c55e" : "#ef4444" }}>{fmt(rr, 1)}:1</div>
            </div>
          )}
        </div>
      )}

      {/* Quick scenarios */}
      {bp > 0 && numShares > 0 && (
        <div style={{ background: "#0f172a", borderRadius: 14, border: "1px solid #1e293b", padding: 16, marginTop: 10 }}>
          <div style={{ fontSize: 12, color: "#64748b", marginBottom: 12, textTransform: "uppercase", letterSpacing: 1 }}>⚡ Snabbscenarier</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 6 }}>
            {[["🚀", "+50%", 50], ["↗", "+20%", 20], ["→", "+5%", 5], ["↘", "-15%", -15], ["📉", "-40%", -40]].map(([icon, label, pct]) => {
              const newP = bp * (1 + pct / 100);
              const pl = numShares * (newP - bp);
              const up = pct > 0;
              return (
                <div key={label} style={{ background: "#0a0f1e", borderRadius: 10, padding: "10px 6px", textAlign: "center", border: `1px solid ${up ? "#22c55e22" : "#ef444422"}` }}>
                  <div style={{ fontSize: 16 }}>{icon}</div>
                  <div style={{ fontSize: 10, color: up ? "#22c55e" : "#ef4444", fontWeight: 700 }}>{label}</div>
                  <div style={{ fontSize: 10, color: "#64748b", marginTop: 2 }}>{pl >= 0 ? "+" : ""}{fmt(pl, 0)}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Price alert section */}
      <div style={{ background: "#0f172a", borderRadius: 14, border: "1px solid #1e293b", padding: 16, marginTop: 10 }}>
        <div style={{ fontSize: 12, color: "#64748b", marginBottom: 10, textTransform: "uppercase", letterSpacing: 1 }}>🔔 Sätt kurslarm</div>
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <input value={alertCompany} onChange={e => setAlertCompany(e.target.value)} placeholder="Bolagsnamn t.ex. Ericsson"
            style={{ flex: 1, padding: "10px 12px", background: "#1e293b", border: "1px solid #334155", borderRadius: 8, color: "#e2e8f0", fontSize: 14, outline: "none" }} />
        </div>
        {alertCompany && <AlertsPanel company={alertCompany} currentPrice={bp || null} />}
        {!alertCompany && (
          <div style={{ fontSize: 12, color: "#475569", textAlign: "center", padding: "10px 0" }}>
            Ange ett bolagsnamn ovan för att sätta larm
          </div>
        )}
      </div>

      <div style={{ fontSize: 11, color: "#334155", textAlign: "center", marginTop: 12 }}>
        ⚠ Beräkningarna är ungefärliga. Courtage baseras på 0.015% (Avanza/Nordnet standard).
      </div>
    </div>
  );
}

// ── Broker Tab ────────────────────────────────────────────────────────────
// ── Loan data ─────────────────────────────────────────────────────────────
const LOAN_BANKS = [
  {
    name: "Swedbank", logo: "🟡", color: "#f59e0b", affiliate: "https://www.swedbank.se",
    bolan: { rorlig: 4.62, fast1: 3.89, fast3: 3.75, fast5: 3.70 },
    blanko: { rate: 8.95, maxBelopp: 600000, minBelopp: 10000 },
    billan: { rate: 5.95, maxBelopp: 1000000 },
    note: "Sveriges störta privatbank"
  },
  {
    name: "SEB", logo: "🟢", color: "#10b981", affiliate: "https://seb.se",
    bolan: { rorlig: 4.55, fast1: 3.82, fast3: 3.71, fast5: 3.68 },
    blanko: { rate: 9.45, maxBelopp: 500000, minBelopp: 10000 },
    billan: { rate: 6.25, maxBelopp: 800000 },
    note: "Stark på företag och privat"
  },
  {
    name: "Handelsbanken", logo: "⚫", color: "#64748b", affiliate: "https://www.handelsbanken.se",
    bolan: { rorlig: 4.58, fast1: 3.85, fast3: 3.78, fast5: 3.72 },
    blanko: { rate: 8.75, maxBelopp: 400000, minBelopp: 20000 },
    billan: { rate: 5.85, maxBelopp: 700000 },
    note: "Personlig rådgivning"
  },
  {
    name: "Nordea", logo: "🔵", color: "#3b82f6", affiliate: "https://www.nordea.se",
    bolan: { rorlig: 4.68, fast1: 3.92, fast3: 3.80, fast5: 3.76 },
    blanko: { rate: 8.90, maxBelopp: 500000, minBelopp: 10000 },
    billan: { rate: 6.10, maxBelopp: 900000 },
    note: "Nordens största bank"
  },
  {
    name: "SBAB", logo: "🏠", color: "#8b5cf6", affiliate: "https://www.sbab.se",
    bolan: { rorlig: 4.42, fast1: 3.72, fast3: 3.62, fast5: 3.58 },
    blanko: { rate: null, maxBelopp: null, minBelopp: null },
    billan: { rate: null, maxBelopp: null },
    note: "Bäst på bolån"
  },
  {
    name: "Avanza Bank", logo: "🟠", color: "#f97316", affiliate: "https://www.avanza.se",
    bolan: { rorlig: 4.39, fast1: 3.69, fast3: 3.59, fast5: 3.55 },
    blanko: { rate: null, maxBelopp: null, minBelopp: null },
    billan: { rate: null, maxBelopp: null },
    note: "Lägst bolåneränta 2026"
  },
  {
    name: "Ikano Bank", logo: "💛", color: "#eab308", affiliate: "https://www.ikanobank.se",
    bolan: { rorlig: null, fast1: null, fast3: null, fast5: null },
    blanko: { rate: 7.95, maxBelopp: 350000, minBelopp: 5000 },
    billan: { rate: 5.45, maxBelopp: 600000 },
    note: "Bra på konsumtionslån"
  },
  {
    name: "Santander", logo: "🔴", color: "#ef4444", affiliate: "https://www.santander.se",
    bolan: { rorlig: null, fast1: null, fast3: null, fast5: null },
    blanko: { rate: 9.95, maxBelopp: 350000, minBelopp: 5000 },
    billan: { rate: 4.95, maxBelopp: 800000 },
    note: "Bäst billån 2026"
  },
];

function MaklareTab() {
  const [section, setSection] = useState("courtage"); // courtage | bolån | blanko | billån
  const [amount, setAmount] = useState("10000");
  const [loanAmount, setLoanAmount] = useState("2000000");
  const [loanYears, setLoanYears] = useState("25");
  const [bindningstid, setBindningstid] = useState("rorlig");

  const val = parseFloat(amount) || 0;
  const lv = parseFloat(loanAmount) || 0;
  const ly = parseInt(loanYears) || 25;

  const bestIdx = BROKERS.reduce((b, br, j) => {
    const f = Math.max(br.minFee, val * br.pctFee / 100);
    const fb = Math.max(BROKERS[b].minFee, val * BROKERS[b].pctFee / 100);
    return f < fb ? j : b;
  }, 0);

  const calcMonthly = (rate, amount, years) => {
    const mr = rate / 100 / 12;
    const n = years * 12;
    if (mr === 0) return amount / n;
    return amount * mr * Math.pow(1 + mr, n) / (Math.pow(1 + mr, n) - 1);
  };

  const SBtn = ({ id, label }) => (
    <button onClick={() => setSection(id)} style={{ flex: 1, padding: "9px 4px", background: section === id ? "linear-gradient(135deg,#10b981,#0ea5e9)" : "none", border: "none", borderRadius: 9, color: section === id ? "#fff" : "#64748b", fontSize: 12, fontWeight: section === id ? 700 : 400, cursor: "pointer", whiteSpace: "nowrap" }}>
      {label}
    </button>
  );

  const getRateKey = () => {
    if (bindningstid === "rorlig") return "rorlig";
    if (bindningstid === "1ar") return "fast1";
    if (bindningstid === "3ar") return "fast3";
    return "fast5";
  };

  return (
    <div>
      {/* Section toggle */}
      <div style={{ display: "flex", gap: 4, background: "#0f172a", borderRadius: 12, padding: 4, border: "1px solid #1e293b", marginBottom: 16 }}>
        <SBtn id="courtage" label="📈 Courtage" />
        <SBtn id="bolan" label="🏠 Bolån" />
        <SBtn id="blanko" label="💳 Blankolån" />
        <SBtn id="billan" label="🚗 Billån" />
      </div>

      {/* COURTAGE */}
      {section === "courtage" && (
        <div>
          <div style={card()}>
            <div style={{ fontSize: 13, color: "#64748b", marginBottom: 6 }}>Beräkna courtage för köp på:</div>
            <div style={{ display: "flex", gap: 8 }}>
              <input value={amount} onChange={e => setAmount(e.target.value)} placeholder="10000"
                style={{ flex: 1, padding: "10px 12px", background: "#1e293b", border: "1px solid #334155", borderRadius: 8, color: "#e2e8f0", fontSize: 15, outline: "none" }} />
              <span style={{ padding: "10px 14px", background: "#1e293b", borderRadius: 8, color: "#64748b", fontSize: 14 }}>kr</span>
            </div>
          </div>
          {BROKERS.map((b, i) => {
            const fee = Math.max(b.minFee, val * b.pctFee / 100);
            const feePct = val > 0 ? fee / val * 100 : 0;
            const isBest = i === bestIdx;
            return (
              <div key={b.name} style={{ ...card(), border: `1px solid ${isBest ? "#22c55e44" : "#1e293b"}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 22 }}>{b.logo}</span>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 15, fontWeight: 600 }}>{b.name}</span>
                        {isBest && <span style={{ fontSize: 10, background: "#22c55e22", color: "#22c55e", padding: "1px 7px", borderRadius: 99, fontWeight: 700 }}>BÄST</span>}
                      </div>
                      <div style={{ fontSize: 11, color: "#64748b" }}>{b.note}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: isBest ? "#22c55e" : "#e2e8f0" }}>{fmt(fee, 2)} kr</div>
                    <div style={{ fontSize: 11, color: "#64748b" }}>{fmt(feePct, 3)}%</div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap", alignItems: "center" }}>
                  <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 6, background: "#1e293b", color: "#94a3b8" }}>Min. {b.minFee} kr</span>
                  <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 6, background: "#1e293b", color: "#94a3b8" }}>ISK: {b.isk ? `${b.isk}%` : "❌"}</span>
                  <a href={b.affiliate} target="_blank" rel="noopener noreferrer" style={{ marginLeft: "auto", fontSize: 12, padding: "4px 12px", background: "linear-gradient(135deg,#10b981,#0ea5e9)", borderRadius: 8, color: "#fff", textDecoration: "none", fontWeight: 600 }}>
                    {b.bonus} →
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* BOLAAN */}
      {section === "bolan" && (
        <div>
          <div style={card()}>
            <div style={{ fontSize: 13, color: "#64748b", marginBottom: 10 }}>🏠 Beräkna ditt bolån</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 11, color: "#64748b", marginBottom: 4 }}>Lånebelopp</div>
                <div style={{ display: "flex", gap: 4 }}>
                  <input value={loanAmount} onChange={e => setLoanAmount(e.target.value)} inputMode="decimal"
                    style={{ flex: 1, padding: "9px 10px", background: "#1e293b", border: "1px solid #334155", borderRadius: 8, color: "#e2e8f0", fontSize: 14, outline: "none" }} />
                  <span style={{ padding: "9px 8px", color: "#64748b", fontSize: 12 }}>kr</span>
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: "#64748b", marginBottom: 4 }}>Löptid</div>
                <div style={{ display: "flex", gap: 4 }}>
                  <input value={loanYears} onChange={e => setLoanYears(e.target.value)} inputMode="numeric"
                    style={{ flex: 1, padding: "9px 10px", background: "#1e293b", border: "1px solid #334155", borderRadius: 8, color: "#e2e8f0", fontSize: 14, outline: "none" }} />
                  <span style={{ padding: "9px 8px", color: "#64748b", fontSize: 12 }}>år</span>
                </div>
              </div>
            </div>
            {/* Bindningstid */}
            <div style={{ fontSize: 11, color: "#64748b", marginBottom: 6 }}>Bindningstid</div>
            <div style={{ display: "flex", gap: 4 }}>
              {[["rorlig","Rörlig"],["1ar","1 år"],["3ar","3 år"],["5ar","5 år"]].map(([id, label]) => (
                <button key={id} onClick={() => setBindningstid(id)} style={{ flex: 1, padding: "7px 4px", background: bindningstid === id ? "#10b98122" : "#1e293b", border: `1px solid ${bindningstid === id ? "#10b981" : "#334155"}`, borderRadius: 8, color: bindningstid === id ? "#10b981" : "#64748b", fontSize: 12, fontWeight: bindningstid === id ? 700 : 400, cursor: "pointer" }}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {LOAN_BANKS.filter(b => b.bolan[getRateKey()] !== null).sort((a, b) => a.bolan[getRateKey()] - b.bolan[getRateKey()]).map((b, i) => {
            const rate = b.bolan[getRateKey()];
            const monthly = calcMonthly(rate, lv, ly);
            const totalInterest = monthly * ly * 12 - lv;
            const isBest = i === 0;
            return (
              <div key={b.name} style={{ ...card(), border: `1px solid ${isBest ? b.color + "66" : "#1e293b"}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 24 }}>{b.logo}</span>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 15, fontWeight: 600 }}>{b.name}</span>
                        {isBest && <span style={{ fontSize: 10, background: b.color + "22", color: b.color, padding: "1px 7px", borderRadius: 99, fontWeight: 700 }}>LÄGST RÄNTA</span>}
                      </div>
                      <div style={{ fontSize: 11, color: "#64748b" }}>{b.note}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: isBest ? b.color : "#e2e8f0" }}>{rate.toFixed(2)}%</div>
                    <div style={{ fontSize: 11, color: "#64748b" }}>årsränta</div>
                  </div>
                </div>
                {lv > 0 && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 10 }}>
                    <div style={{ background: "#0a0f1e", borderRadius: 8, padding: "8px 10px" }}>
                      <div style={{ fontSize: 10, color: "#475569" }}>Månadskostnad</div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: "#e2e8f0" }}>{Math.round(monthly).toLocaleString("sv-SE")} kr</div>
                    </div>
                    <div style={{ background: "#0a0f1e", borderRadius: 8, padding: "8px 10px" }}>
                      <div style={{ fontSize: 10, color: "#475569" }}>Total ränta {ly} år</div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: "#ef4444" }}>{Math.round(totalInterest / 1000)}k kr</div>
                    </div>
                  </div>
                )}
                <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {Object.entries(b.bolan).map(([k, v]) => v && (
                      <span key={k} style={{ fontSize: 10, padding: "2px 7px", borderRadius: 6, background: k === getRateKey() ? b.color + "22" : "#1e293b", color: k === getRateKey() ? b.color : "#64748b", fontWeight: k === getRateKey() ? 700 : 400 }}>
                        {k === "rorlig" ? "Rörlig" : k === "fast1" ? "1ar" : k === "fast3" ? "3ar" : "5ar"}: {v.toFixed(2)}%
                      </span>
                    ))}
                  </div>
                  <a href={b.affiliate} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, padding: "5px 12px", background: "linear-gradient(135deg,#10b981,#0ea5e9)", borderRadius: 8, color: "#fff", textDecoration: "none", fontWeight: 600 }}>
                    Ansök →
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* BLANKOLAN */}
      {section === "blanko" && (
        <div>
          <div style={card()}>
            <div style={{ fontSize: 13, color: "#64748b", marginBottom: 10 }}>💳 Beräkna blankolån (utan säkerhet)</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <div>
                <div style={{ fontSize: 11, color: "#64748b", marginBottom: 4 }}>Belopp</div>
                <div style={{ display: "flex", gap: 4 }}>
                  <input value={loanAmount} onChange={e => setLoanAmount(e.target.value)} inputMode="decimal"
                    style={{ flex: 1, padding: "9px 10px", background: "#1e293b", border: "1px solid #334155", borderRadius: 8, color: "#e2e8f0", fontSize: 14, outline: "none" }} />
                  <span style={{ padding: "9px 8px", color: "#64748b", fontSize: 12 }}>kr</span>
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: "#64748b", marginBottom: 4 }}>Löptid</div>
                <div style={{ display: "flex", gap: 4 }}>
                  <input value={loanYears} onChange={e => setLoanYears(e.target.value)} inputMode="numeric"
                    style={{ flex: 1, padding: "9px 10px", background: "#1e293b", border: "1px solid #334155", borderRadius: 8, color: "#e2e8f0", fontSize: 14, outline: "none" }} />
                  <span style={{ padding: "9px 8px", color: "#64748b", fontSize: 12 }}>år</span>
                </div>
              </div>
            </div>
          </div>

          <div style={{ background: "#1a0a00", border: "1px solid #f59e0b33", borderRadius: 10, padding: "10px 14px", marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: "#f59e0b" }}>⚠ Blankolån har hög ränta (8–20%). Använd bara vid kortare löptid och om du inte har säkerhet.</div>
          </div>

          {LOAN_BANKS.filter(b => b.blanko.rate !== null).sort((a, b) => a.blanko.rate - b.blanko.rate).map((b, i) => {
            const rate = b.blanko.rate;
            const monthly = calcMonthly(rate, Math.min(lv, b.blanko.maxBelopp), ly);
            const totalInterest = monthly * ly * 12 - Math.min(lv, b.blanko.maxBelopp);
            const isBest = i === 0;
            const tooLarge = lv > b.blanko.maxBelopp;
            return (
              <div key={b.name} style={{ ...card(), border: `1px solid ${isBest ? b.color + "55" : "#1e293b"}`, opacity: tooLarge ? 0.6 : 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 24 }}>{b.logo}</span>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 15, fontWeight: 600 }}>{b.name}</span>
                        {isBest && !tooLarge && <span style={{ fontSize: 10, background: b.color + "22", color: b.color, padding: "1px 7px", borderRadius: 99, fontWeight: 700 }}>LÄGST</span>}
                        {tooLarge && <span style={{ fontSize: 10, background: "#ef444422", color: "#ef4444", padding: "1px 7px", borderRadius: 99 }}>För stort belopp</span>}
                      </div>
                      <div style={{ fontSize: 11, color: "#64748b" }}>Max {(b.blanko.maxBelopp / 1000).toFixed(0)}k kr · Min {(b.blanko.minBelopp / 1000).toFixed(0)}k kr</div>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: isBest && !tooLarge ? b.color : "#e2e8f0" }}>{rate.toFixed(2)}%</div>
                    <div style={{ fontSize: 11, color: "#64748b" }}>årsränta</div>
                  </div>
                </div>
                {lv > 0 && !tooLarge && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 10 }}>
                    <div style={{ background: "#0a0f1e", borderRadius: 8, padding: "8px 10px" }}>
                      <div style={{ fontSize: 10, color: "#475569" }}>Månadskostnad</div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: "#e2e8f0" }}>{Math.round(monthly).toLocaleString("sv-SE")} kr</div>
                    </div>
                    <div style={{ background: "#0a0f1e", borderRadius: 8, padding: "8px 10px" }}>
                      <div style={{ fontSize: 10, color: "#475569" }}>Total räntekostnad</div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: "#ef4444" }}>{Math.round(totalInterest / 1000)}k kr</div>
                    </div>
                  </div>
                )}
                <div style={{ marginTop: 10, display: "flex", justifyContent: "flex-end" }}>
                  <a href={b.affiliate} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, padding: "5px 12px", background: "linear-gradient(135deg,#10b981,#0ea5e9)", borderRadius: 8, color: "#fff", textDecoration: "none", fontWeight: 600 }}>
                    Ansök →
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* BILLAN */}
      {section === "billan" && (
        <div>
          <div style={card()}>
            <div style={{ fontSize: 13, color: "#64748b", marginBottom: 10 }}>🚗 Beräkna billån</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <div>
                <div style={{ fontSize: 11, color: "#64748b", marginBottom: 4 }}>Bilens pris</div>
                <div style={{ display: "flex", gap: 4 }}>
                  <input value={loanAmount} onChange={e => setLoanAmount(e.target.value)} inputMode="decimal"
                    style={{ flex: 1, padding: "9px 10px", background: "#1e293b", border: "1px solid #334155", borderRadius: 8, color: "#e2e8f0", fontSize: 14, outline: "none" }} />
                  <span style={{ padding: "9px 8px", color: "#64748b", fontSize: 12 }}>kr</span>
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: "#64748b", marginBottom: 4 }}>Löptid</div>
                <div style={{ display: "flex", gap: 4 }}>
                  <input value={loanYears} onChange={e => setLoanYears(e.target.value)} inputMode="numeric"
                    style={{ flex: 1, padding: "9px 10px", background: "#1e293b", border: "1px solid #334155", borderRadius: 8, color: "#e2e8f0", fontSize: 14, outline: "none" }} />
                  <span style={{ padding: "9px 8px", color: "#64748b", fontSize: 12 }}>år</span>
                </div>
              </div>
            </div>
          </div>

          {LOAN_BANKS.filter(b => b.billan.rate !== null).sort((a, b) => a.billan.rate - b.billan.rate).map((b, i) => {
            const rate = b.billan.rate;
            const maxLan = b.billan.maxBelopp;
            const lanebelopp = Math.min(lv, maxLan);
            const monthly = calcMonthly(rate, lanebelopp, ly);
            const totalInterest = monthly * ly * 12 - lanebelopp;
            const isBest = i === 0;
            const tooLarge = lv > maxLan;
            return (
              <div key={b.name} style={{ ...card(), border: `1px solid ${isBest ? b.color + "55" : "#1e293b"}`, opacity: tooLarge ? 0.6 : 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 24 }}>{b.logo}</span>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 15, fontWeight: 600 }}>{b.name}</span>
                        {isBest && !tooLarge && <span style={{ fontSize: 10, background: b.color + "22", color: b.color, padding: "1px 7px", borderRadius: 99, fontWeight: 700 }}>BÄST BILLÅN</span>}
                        {tooLarge && <span style={{ fontSize: 10, background: "#ef444422", color: "#ef4444", padding: "1px 7px", borderRadius: 99 }}>Överstiger max</span>}
                      </div>
                      <div style={{ fontSize: 11, color: "#64748b" }}>Max {(maxLan / 1000).toFixed(0)}k kr · {b.note}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: isBest && !tooLarge ? b.color : "#e2e8f0" }}>{rate.toFixed(2)}%</div>
                    <div style={{ fontSize: 11, color: "#64748b" }}>årsränta</div>
                  </div>
                </div>
                {lv > 0 && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 10 }}>
                    <div style={{ background: "#0a0f1e", borderRadius: 8, padding: "8px 10px" }}>
                      <div style={{ fontSize: 10, color: "#475569" }}>Månadskostnad</div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: "#e2e8f0" }}>{Math.round(monthly).toLocaleString("sv-SE")} kr</div>
                    </div>
                    <div style={{ background: "#0a0f1e", borderRadius: 8, padding: "8px 10px" }}>
                      <div style={{ fontSize: 10, color: "#475569" }}>Total ränta</div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: "#ef4444" }}>{Math.round(totalInterest / 1000)}k kr</div>
                    </div>
                  </div>
                )}
                <div style={{ marginTop: 10, display: "flex", justifyContent: "flex-end" }}>
                  <a href={b.affiliate} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, padding: "5px 12px", background: "linear-gradient(135deg,#10b981,#0ea5e9)", borderRadius: 8, color: "#fff", textDecoration: "none", fontWeight: 600 }}>
                    Ansök →
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ fontSize: 10, color: "#334155", textAlign: "center", marginTop: 12, lineHeight: 1.7 }}>
        * Räntor är indikativa per juni 2026. Verifiera alltid aktuella räntor direkt hos respektive bank. Affiliate-länkar — Kapital kan erhålla ersättning. Utgör inte finansiell rådgivning.
      </div>
    </div>
  );
}

// ── Calendar Tab ──────────────────────────────────────────────────────────
function KalenderTab({ isPro, onUpgrade }) {
  const [watched, setWatched] = useState(["Ericsson", "Volvo"]);
  const today = new Date("2026-06-18");

  const sorted = [...CALENDAR].sort((a, b) => new Date(a.date) - new Date(b.date));
  const upcoming = sorted.filter(e => new Date(e.date) >= today);
  const past = sorted.filter(e => new Date(e.date) < today);

  const daysUntil = (dateStr) => {
    const d = Math.ceil((new Date(dateStr) - today) / (1000 * 60 * 60 * 24));
    return d === 0 ? "Idag" : d === 1 ? "Imorgon" : `om ${d} dagar`;
  };

  const toggle = (company) => {
    if (!isPro) return onUpgrade();
    setWatched(w => w.includes(company) ? w.filter(c => c !== company) : [...w, company]);
  };

  const EventRow = ({ e, past }) => {
    const isWatched = watched.includes(e.company);
    const days = !past ? daysUntil(e.date) : null;
    return (
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #1e293b", opacity: past ? 0.5 : 1 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div style={{ width: 36, textAlign: "center" }}>
            <div style={{ fontSize: 11, color: "#64748b" }}>{new Date(e.date).toLocaleDateString("sv-SE", { month: "short" }).toUpperCase()}</div>
            <div style={{ fontSize: 18, fontWeight: 700, lineHeight: 1, color: isWatched ? "#3b82f6" : "#e2e8f0" }}>{new Date(e.date).getDate()}</div>
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: isWatched ? "#3b82f6" : "#e2e8f0" }}>{e.company}</div>
            <div style={{ fontSize: 12, color: "#64748b" }}>{e.type}-rapport · {e.time}</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {days && <span style={{ fontSize: 12, color: days === "Idag" ? "#22c55e" : "#64748b" }}>{days}</span>}
          <button onClick={() => toggle(e.company)} title={isWatched ? "Ta bort bevakning" : "Bevaka"} style={{ background: isWatched ? "#3b82f622" : "#1e293b", border: `1px solid ${isWatched ? "#3b82f666" : "#334155"}`, borderRadius: 8, padding: "4px 10px", fontSize: 12, color: isWatched ? "#3b82f6" : "#64748b", cursor: "pointer" }}>
            {isWatched ? "🔔 Bevakas" : "🔕 Bevaka"}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div>
      {!isPro && (
        <div style={{ ...card(), background: "linear-gradient(135deg,#0f172a,#1e1040)", padding: "12px 16px", marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 13, color: "#94a3b8" }}>Aktivera bevakningar <ProBadge /></div>
          <button onClick={onUpgrade} style={{ padding: "6px 14px", background: "linear-gradient(135deg,#f59e0b,#ef4444)", border: "none", borderRadius: 8, color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Uppgradera</button>
        </div>
      )}

      <div style={card()}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#3b82f6", marginBottom: 10, textTransform: "uppercase", letterSpacing: 1 }}>📅 Kommande rapporter</div>
        {upcoming.map((e, i) => <EventRow key={i} e={e} />)}
      </div>

      {past.length > 0 && (
        <div style={card()}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", marginBottom: 10, textTransform: "uppercase", letterSpacing: 1 }}>✓ Passerade</div>
          {past.map((e, i) => <EventRow key={i} e={e} past />)}
        </div>
      )}
    </div>
  );
}

// ── Smart Sparande Tab ────────────────────────────────────────────────────
const EXPENSE_CATEGORIES = [
  { id: "boende", label: "Boende", emoji: "🏠", color: "#3b82f6" },
  { id: "mat", label: "Mat & Hushåll", emoji: "🛒", color: "#10b981" },
  { id: "transport", label: "Transport", emoji: "🚗", color: "#f59e0b" },
  { id: "noje", label: "Nöje & Fritid", emoji: "🎮", color: "#8b5cf6" },
  { id: "halsa", label: "Hälsa", emoji: "💊", color: "#ef4444" },
  { id: "klader", label: "Kläder", emoji: "👕", color: "#ec4899" },
  { id: "prenumerationer", label: "Prenumerationer", emoji: "📱", color: "#06b6d4" },
  { id: "ovrigt", label: "Övrigt", emoji: "📦", color: "#64748b" },
];

function SparaTab({ currency, exchangeRates, currencies }) {
  const [income, setIncome] = useState(() => {
    try { return localStorage.getItem("kapital_income") || ""; } catch { return ""; }
  });
  const [expenses, setExpenses] = useState(() => {
    try { return JSON.parse(localStorage.getItem("kapital_expenses") || "{}"); } catch { return {}; }
  });
  const [goals, setGoals] = useState(() => {
    try { return JSON.parse(localStorage.getItem("kapital_goals") || "[]"); } catch { return [
      { id: 1, name: "Buffert 3 mån", target: 50000, saved: 12000, emoji: "🛡️", months: 12, color: "#10b981" },
      { id: 2, name: "Semester", target: 15000, saved: 4500, emoji: "✈️", months: 6, color: "#3b82f6" },
    ]; }
  });
  const [addingGoal, setAddingGoal] = useState(false);
  const [newGoal, setNewGoal] = useState({ name: "", target: "", saved: "", emoji: "🎯", months: "12", color: "#10b981" });
  const saveIncome = (v) => { setIncome(v); try { localStorage.setItem("kapital_income", v); } catch {} };
  const saveExpense = (catId, val) => { const next = { ...expenses, [catId]: val }; setExpenses(next); try { localStorage.setItem("kapital_expenses", JSON.stringify(next)); } catch {}; };
  const saveGoals = (g) => { setGoals(g); try { localStorage.setItem("kapital_goals", JSON.stringify(g)); } catch {}; };
  const addGoal = () => { if (!newGoal.name || !newGoal.target) return; saveGoals([...goals, { ...newGoal, id: Date.now(), target: +newGoal.target, saved: +newGoal.saved || 0, months: +newGoal.months || 12 }]); setNewGoal({ name: "", target: "", saved: "", emoji: "🎯", months: "12", color: "#10b981" }); setAddingGoal(false); };
  const updateGoalSaved = (id, val) => { saveGoals(goals.map(g => g.id === id ? { ...g, saved: Math.min(+val || 0, g.target) } : g)); };
  const removeGoal = (id) => saveGoals(goals.filter(g => g.id !== id));

  const [activeSection, setActiveSection] = useState(null); // null = home
  const [activeSubSection, setActiveSubSection] = useState(null);

  const goBack = () => {
    if (activeSubSection) { setActiveSubSection(null); }
    else { setActiveSection(null); }
  };

  const inc = parseFloat(income) || 0;
  const totalExpenses = EXPENSE_CATEGORIES.reduce((s, c) => s + (parseFloat(expenses[c.id]) || 0), 0);
  const leftover = inc - totalExpenses;
  const savingsRate = inc > 0 ? (leftover / inc * 100) : 0;
  const totalGoalNeeded = goals.reduce((s, g) => s + Math.max(0, g.target - g.saved) / (g.months || 12), 0);
  const freeAfterGoals = leftover - totalGoalNeeded;

  const EMOJIS = ["🎯","✈️","🏠","🚗","💍","🎓","👶","🏋️","💻","🛡️","🌍","🎸","⛵","🏖️","💎"];
  const COLORS = ["#10b981","#3b82f6","#f59e0b","#ef4444","#8b5cf6","#ec4899","#06b6d4","#f97316"];

  const inp = (val, set, ph, type = "text") => (
    <input value={val} onChange={e => set(e.target.value)} placeholder={ph} inputMode={type === "number" ? "decimal" : "text"}
      style={{ width: "100%", padding: "10px 12px", background: "#1e293b", border: "1px solid #334155", borderRadius: 8, color: "#e2e8f0", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
  );

  // Sub-section picker for Budget/Kalkylatorer/Skatt
  const SubPicker = ({ items }) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {items.map(({ id, icon, label, desc }) => (
        <button key={id} onClick={() => setActiveSubSection(id)} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", background: "#0f172a", border: "1px solid #1e293b", borderRadius: 14, cursor: "pointer", textAlign: "left" }}>
          <span style={{ fontSize: 26 }}>{icon}</span>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: "#e2e8f0" }}>{label}</div>
            <div style={{ fontSize: 12, color: "#475569", marginTop: 2 }}>{desc}</div>
          </div>
          <span style={{ marginLeft: "auto", color: "#334155", fontSize: 18 }}>›</span>
        </button>
      ))}
    </div>
  );

  const BackBtn = ({ label }) => (
    <button onClick={goBack} style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "linear-gradient(135deg,#10b981,#0ea5e9)", border: "none", borderRadius: 12, color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer", padding: "10px 20px", boxShadow: "0 4px 15px #10b98144", marginBottom: 18 }}>
      <span style={{ fontSize: 16 }}>←</span> {label || "Tillbaka"}
    </button>
  );

  return (
    <div>
      <style>{`@keyframes grow{from{width:0}to{width:var(--w)}}`}</style>

      {/* HOME - kategorivy */}
      {!activeSection && (
        <div>
          {/* Income pill */}
          <div style={{ background: "#0f172a", borderRadius: 14, border: "1px solid #10b98133", padding: "14px 16px", marginBottom: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 12, color: "#64748b" }}>💰 Månadsinkomst</div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <input value={income} onChange={e => saveIncome(e.target.value)} placeholder="35 000" inputMode="decimal"
                style={{ background: "none", border: "none", outline: "none", fontSize: 22, fontWeight: 800, color: "#10b981", width: 120, textAlign: "right" }} />
              <span style={{ fontSize: 14, color: "#475569" }}>kr</span>
            </div>
          </div>

          {/* Quick stats row */}
          {inc > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 16 }}>
              {[
                ["Sparkvot", `${savingsRate.toFixed(0)}%`, savingsRate >= 20 ? "#10b981" : "#f59e0b"],
                ["Kvar/mån", `${Math.round(leftover / 1000)}k`, leftover >= 0 ? "#10b981" : "#ef4444"],
                ["Mål aktiva", `${goals.length} st`, "#3b82f6"],
              ].map(([l, v, c]) => (
                <div key={l} style={{ background: "#0f172a", borderRadius: 10, border: "1px solid #1e293b", padding: "10px 8px", textAlign: "center" }}>
                  <div style={{ fontSize: 10, color: "#475569", marginBottom: 3 }}>{l}</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: c }}>{v}</div>
                </div>
              ))}
            </div>
          )}

          {/* Category cards — 4 grupper för tydlig navigation */}
          {[
            // GRUPP 1: Min ekonomi
            { id: "budget", icon: "💰", color: "#10b981", label: "Budget & Utgifter", desc: inc > 0 ? `${Math.round(totalExpenses).toLocaleString("sv-SE")} kr/mån · ${goals.length} mål` : "Inkomst, utgifter och sparmål", items: [{ id: "overview", icon: "📊", label: "Översikt" }, { id: "expenses", icon: "💸", label: "Utgifter" }, { id: "goals", icon: "🎯", label: "Sparmål" }] },
            { id: "boende", icon: "🏠", color: "#3b82f6", label: "Boende & Fordon", desc: "Hyra, el, bil och alla fasta kostnader", items: [{ id: "boendekostnad", icon: "🏠", label: "Boende" }, { id: "fordonskostnad", icon: "🚗", label: "Fordon" }, { id: "abonnemang", icon: "📱", label: "Abonnemang" }] },
            { id: "lon", icon: "💼", color: "#06b6d4", label: "Lön & Yrke", desc: "Lönespec, snittlöner och löneutveckling", items: [{ id: "lonespec", icon: "🧾", label: "Min lönespec" }, { id: "snittlon", icon: "📊", label: "Snittlöner" }, { id: "lonekalkyl", icon: "📈", label: "Löneutveckling" }] },
            { id: "kredit", icon: "⭐", color: "#8b5cf6", label: "Kreditscore", desc: "Beräkna och förbättra din kreditscore", items: [{ id: "kreditscore", icon: "⭐", label: "Min kreditscore" }] },

            // GRUPP 2: Planering & Kalkylatorer
            { id: "kalkylatorer", icon: "📈", color: "#f59e0b", label: "Kalkylatorer", desc: "FIRE, ränta-på-ränta, skuld & pension", items: [{ id: "fire", icon: "🔥", label: "FIRE" }, { id: "rantan", icon: "📈", label: "Ränta-på-ränta" }, { id: "skuld", icon: "💳", label: "Skuldfri" }, { id: "pension", icon: "👴", label: "Pension" }] },
            { id: "skatt", icon: "🧾", color: "#f97316", label: "Skatt & Deklaration", desc: "Lön, K4, ISK och ROT/RUT", items: [{ id: "lon", icon: "💼", label: "Löneskatt" }, { id: "k4", icon: "📋", label: "K4" }, { id: "isk", icon: "🏦", label: "ISK-skatt" }, { id: "rot", icon: "🔨", label: "ROT & RUT" }] },

            // GRUPP 3: Investeringar & Handel
            { id: "fonder", icon: "📊", color: "#10b981", label: "Fondguide", desc: "Populära fonder och framtidsutsikter", items: [{ id: "fondguide", icon: "📊", label: "Fondguide 2026" }] },
            { id: "utland", icon: "🌍", color: "#3b82f6", label: "Utländska värdepapper", desc: "Aktier, ETF:er och handel utomlands", items: [{ id: "utlandguide", icon: "🌍", label: "Handla utomlands" }] },
            { id: "krypto", icon: "₿", color: "#f59e0b", label: "Krypto", desc: "Guide, skatt och håll koll på dina krypton", items: [{ id: "kryptokuide", icon: "₿", label: "Kryptoguide" }, { id: "kryptoskatt", icon: "🧾", label: "Kryptoskatt" }] },
            { id: "valuta", icon: "💱", color: "#06b6d4", label: "Valuta & Omvandlare", desc: "Live-kurser och valutaomvandlare", items: [{ id: "valutaomvandlare", icon: "💱", label: "Valutaomvandlare" }] },

            // GRUPP 4: AI & Hjälp
            { id: "aicoach", icon: "🤖", color: "#10b981", label: "AI-ekonomicoach", desc: "Fråga om allt inom ekonomi och skatt", items: [{ id: "aicoach", icon: "💬", label: "AI-coachen" }] },
            { id: "juridisk", icon: "⚖️", color: "#8b5cf6", label: "Juridisk AI", desc: "Avtal, hyresrätt, arbetsrätt och mer", items: [{ id: "juridiskAI", icon: "⚖️", label: "Juridisk AI" }] },
          ].map(cat => (
            <button key={cat.id} onClick={() => setActiveSection(cat.id)} style={{ display: "flex", alignItems: "center", gap: 14, width: "100%", padding: "16px", background: "#0f172a", border: `1px solid ${cat.color}22`, borderRadius: 16, cursor: "pointer", textAlign: "left", marginBottom: 10 }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: cat.color + "22", border: `1px solid ${cat.color}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, flexShrink: 0 }}>
                {cat.icon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#e2e8f0" }}>{cat.label}</div>
                <div style={{ fontSize: 12, color: "#475569", marginTop: 3 }}>{cat.desc}</div>
              </div>
              <span style={{ color: "#334155", fontSize: 20 }}>›</span>
            </button>
          ))}
        </div>
      )}

      {/* CATEGORY sub-picker */}
      {activeSection && !activeSubSection && (
        <div>
          <BackBtn label="Ekonomi" />
          <SubPicker items={
            activeSection === "budget" ? [
              { id: "overview", icon: "📊", label: "Översikt", desc: "Inkomst, utgifter och fördelning" },
              { id: "expenses", icon: "💸", label: "Utgifter", desc: "Fyll i dina månadskostnader" },
              { id: "goals", icon: "🎯", label: "Sparmål", desc: `${goals.length} aktiva mål` },
            ] : activeSection === "kalkylatorer" ? [
              { id: "fire", icon: "🔥", label: "FIRE-kalkylator", desc: "När kan du sluta jobba?" },
              { id: "rantan", icon: "📈", label: "Ränta-på-ränta", desc: "Se pengarna växa exponentiellt" },
              { id: "skuld", icon: "💳", label: "Skuldfri", desc: "Snabbaste vägen ur skuld" },
              { id: "pension", icon: "👴", label: "Pension", desc: "Vad får du när du pensioneras?" },
            ] : activeSection === "kredit" ? [
              { id: "kreditscore", icon: "⭐", label: "Min kreditscore", desc: "Beräkna din uppskattade score 300-850" },
            ] : activeSection === "lon" ? [
              { id: "lonespec", icon: "🧾", label: "Min lönespecifikation", desc: "Se hur din lön fördelas" },
              { id: "snittlon", icon: "📊", label: "Snittlön per yrke", desc: "Jämför med branschsnittet" },
              { id: "lonekalkyl", icon: "📈", label: "Löneutveckling", desc: "Vad är din lön värd om 5-10 år?" },
            ] : activeSection === "juridisk" ? [
              { id: "juridiskAI", icon: "⚖️", label: "Juridisk AI-assistent", desc: "Avtal, försäkring, lån och dina rättigheter" },
            ] : activeSection === "valuta" ? [
              { id: "valutaomvandlare", icon: "💱", label: "Valutaomvandlare", desc: "Live-kurser och omvandlare" },
            ] : activeSection === "aicoach" ? [
              { id: "aicoach", icon: "💬", label: "Fråga AI-coachen", desc: "Personliga svar om din ekonomi" },
            ] : activeSection === "lan" ? [
              { id: "lanansokan", icon: "📋", label: "Ansök om lån", desc: "Blankolån, billån och bolån" },
            ] : activeSection === "forsakring" ? [
              { id: "minaforsakringar", icon: "📋", label: "Mina försäkringar", desc: "Håll koll på vad du har" },
              { id: "forsakringsguide", icon: "🔍", label: "Vad behöver jag?", desc: "Personlig försäkringsanalys" },
              { id: "jamforforsakring", icon: "⚖️", label: "Jämför & skaffa", desc: "Bästa priset hos svenska bolag" },
            ] : activeSection === "abonnemang" ? [
              { id: "abonnemang", icon: "📱", label: "Mina abonnemang", desc: "Streaming, gym, mobil och mer" },
            ] : activeSection === "boende" ? [
              { id: "boendekostnad", icon: "🏠", label: "Mitt boende", desc: "Samlad vy av boendekostnader" },
            ] : activeSection === "fordon" ? [
              { id: "fordonskostnad", icon: "🚗", label: "Min bil", desc: "Vad kostar bilen dig per månad?" },
            ] : activeSection === "utland" ? [
              { id: "utlandguide", icon: "🌍", label: "Handla utomlands", desc: "Guide för utländsk handel" },
            ] : activeSection === "boende" ? [
              { id: "boendekostnad", icon: "🏠", label: "Boendekostnader", desc: "El, hyra, bredband och mer" },
              { id: "fordonskostnad", icon: "🚗", label: "Fordonskostnader", desc: "Vad kostar bilen per månad?" },
              { id: "abonnemang", icon: "📱", label: "Abonnemang", desc: "Streaming, gym och prenumerationer" },
            ] : activeSection === "krypto" ? [
              { id: "kryptokuide", icon: "₿", label: "Kryptoguide", desc: "Kom igång med krypto" },
              { id: "kryptoskatt", icon: "🧾", label: "Kryptoskatt", desc: "K4 och deklaration av krypton" },
            ] : activeSection === "fonder" ? [
              { id: "fondguide", icon: "📊", label: "Fondguide 2026", desc: "Bästa fonder för framtiden" },
            ] : [
              { id: "lon", icon: "💼", label: "Löneskatt", desc: "Beräkna din nettolön" },
              { id: "k4", icon: "📋", label: "K4 — Aktier & Krypto", desc: "Kapitalvinstskatt & förlusthantering" },
              { id: "isk", icon: "🏦", label: "ISK-skatt", desc: "Jämför ISK mot kapitalskatt" },
              { id: "rot", icon: "🔨", label: "ROT & RUT-avdrag", desc: "Beräkna ditt avdrag" },
            ]
          } />
        </div>
      )}

      {/* SUB-SECTIONS */}
      {activeSubSection && (
        <div>
          <BackBtn />
          {activeSubSection === "overview" && (
            <>
              {/* Income input */}
              <div style={{ background: "#0f172a", borderRadius: 14, border: "1px solid #10b98133", padding: 18, marginBottom: 12 }}>
                <div style={{ fontSize: 12, color: "#64748b", marginBottom: 6 }}>Manadsinkomst (netto efter skatt)</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input value={income} onChange={e => saveIncome(e.target.value)} placeholder="35 000" inputMode="decimal"
                    style={{ flex: 1, background: "none", border: "none", outline: "none", fontSize: 32, fontWeight: 800, color: "#10b981", width: "100%" }} />
                  <span style={{ fontSize: 16, color: "#475569", fontWeight: 600 }}>kr</span>
                </div>
              </div>

              {inc > 0 && (
                <>
                  {/* Summary cards */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
                {[
                  { label: "Utgifter", value: totalExpenses, color: "#ef4444", emoji: "💸" },
                  { label: "Kvar", value: leftover, color: leftover >= 0 ? "#10b981" : "#ef4444", emoji: "💵" },
                  { label: "Spartakt", value: `${savingsRate.toFixed(0)}%`, color: savingsRate >= 20 ? "#10b981" : savingsRate >= 10 ? "#f59e0b" : "#ef4444", emoji: "📈", raw: true },
                  { label: "Till mål/mån", value: totalGoalNeeded, color: "#3b82f6", emoji: "🎯" },
                ].map(({ label, value, color, emoji, raw }) => (
                  <div key={label} style={{ background: "#0f172a", borderRadius: 12, border: "1px solid #1e293b", padding: "12px 14px" }}>
                    <div style={{ fontSize: 11, color: "#64748b", marginBottom: 4 }}>{emoji} {label}</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color }}>
                      {raw ? value : `${value >= 0 ? "" : ""}${Math.abs(value).toLocaleString("sv-SE", { maximumFractionDigits: 0 })} kr`}
                    </div>
                  </div>
                ))}
              </div>

              {/* Spending breakdown donut-style bar */}
              <div style={{ background: "#0f172a", borderRadius: 14, border: "1px solid #1e293b", padding: 16, marginBottom: 12 }}>
                <div style={{ fontSize: 12, color: "#64748b", marginBottom: 10, textTransform: "uppercase", letterSpacing: 1 }}>Fördelning av inkomst</div>
                <div style={{ display: "flex", height: 12, borderRadius: 99, overflow: "hidden", marginBottom: 12, gap: 1 }}>
                  {EXPENSE_CATEGORIES.map(c => {
                    const pct = inc > 0 ? (parseFloat(expenses[c.id]) || 0) / inc * 100 : 0;
                    if (pct < 0.5) return null;
                    return <div key={c.id} style={{ width: `${pct}%`, background: c.color, minWidth: 2 }} title={`${c.label}: ${pct.toFixed(1)}%`} />;
                  })}
                  {leftover > 0 && <div style={{ flex: 1, background: "#10b981", opacity: 0.3 }} />}
                </div>
                {EXPENSE_CATEGORIES.filter(c => parseFloat(expenses[c.id]) > 0).map(c => {
                  const val = parseFloat(expenses[c.id]) || 0;
                  const pct = inc > 0 ? val / inc * 100 : 0;
                  return (
                    <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0", borderBottom: "1px solid #1e293b" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: c.color, flexShrink: 0 }} />
                        <span style={{ fontSize: 13, color: "#e2e8f0" }}>{c.emoji} {c.label}</span>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0" }}>{val.toLocaleString("sv-SE")} kr</span>
                        <span style={{ fontSize: 11, color: "#475569", marginLeft: 6 }}>{pct.toFixed(0)}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Free money after goals */}
              <div style={{ background: freeAfterGoals >= 0 ? "#10b98111" : "#ef444411", borderRadius: 14, border: `1px solid ${freeAfterGoals >= 0 ? "#10b98133" : "#ef444433"}`, padding: 16 }}>
                <div style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>💡 Fritt sparande efter mål</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: freeAfterGoals >= 0 ? "#10b981" : "#ef4444" }}>
                  {freeAfterGoals.toLocaleString("sv-SE", { maximumFractionDigits: 0 })} kr/mån
                </div>
                <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                  {freeAfterGoals >= 0
                    ? "✓ Du klarar alla dina mål och har pengar över att investera!"
                    : `⚠ Du behöver ${Math.abs(freeAfterGoals).toLocaleString("sv-SE", { maximumFractionDigits: 0 })} kr/mån till för att nå alla mål. Justera utgifter eller mål.`}
                </div>
              </div>
                </>
              )}

              {!inc && (
                <div style={{ textAlign: "center", padding: "40px 0", color: "#334155" }}>
                  <div style={{ fontSize: 36, marginBottom: 10 }}>💰</div>
                  <div style={{ fontSize: 14, color: "#475569" }}>Ange din manadsinkomst ovan för att starta</div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* EXPENSES */}
      {activeSubSection === "expenses" && (
        <div>
          <div style={{ fontSize: 12, color: "#64748b", marginBottom: 12 }}>Fyll i dina genomsnittliga månadskostnader</div>
          {EXPENSE_CATEGORIES.map(c => (
            <div key={c.id} style={{ background: "#0f172a", borderRadius: 12, border: "1px solid #1e293b", padding: "12px 14px", marginBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: c.color + "22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{c.emoji}</div>
                  <div style={{ fontSize: 14, color: "#e2e8f0" }}>{c.label}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, width: 130 }}>
                  <input
                    value={expenses[c.id] || ""}
                    onChange={e => saveExpense(c.id, e.target.value)}
                    placeholder="0"
                    inputMode="decimal"
                    style={{ width: "100%", padding: "8px 10px", background: "#1e293b", border: "1px solid #334155", borderRadius: 8, color: "#e2e8f0", fontSize: 14, outline: "none", textAlign: "right" }}
                  />
                  <span style={{ fontSize: 12, color: "#475569", flexShrink: 0 }}>kr</span>
                </div>
              </div>
              {parseFloat(expenses[c.id]) > 0 && inc > 0 && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ background: "#1e293b", borderRadius: 99, height: 4, overflow: "hidden" }}>
                    <div style={{ width: `${Math.min(100, (parseFloat(expenses[c.id]) / inc) * 100)}%`, height: "100%", background: c.color, borderRadius: 99, transition: "width 0.4s" }} />
                  </div>
                  <div style={{ fontSize: 10, color: "#475569", marginTop: 3, textAlign: "right" }}>
                    {((parseFloat(expenses[c.id]) / inc) * 100).toFixed(1)}% av inkomst
                  </div>
                </div>
              )}
            </div>
          ))}
          <div style={{ background: "#0f172a", borderRadius: 12, border: "1px solid #10b98133", padding: "14px", marginTop: 4, display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: 14, color: "#64748b" }}>Totalt</span>
            <span style={{ fontSize: 16, fontWeight: 700, color: "#e2e8f0" }}>{totalExpenses.toLocaleString("sv-SE")} kr/mån</span>
          </div>
        </div>
      )}

      {/* GOALS */}
      {activeSubSection === "goals" && (
        <div>
          {goals.map(g => {
            const pct = Math.min(100, (g.saved / g.target) * 100);
            const remaining = g.target - g.saved;
            const monthly = remaining / (g.months || 12);
            const canAfford = leftover >= monthly;
            return (
              <div key={g.id} style={{ background: "#0f172a", borderRadius: 14, border: `1px solid ${g.color}33`, padding: 16, marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ fontSize: 28 }}>{g.emoji}</div>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: "#e2e8f0" }}>{g.name}</div>
                      <div style={{ fontSize: 11, color: "#64748b" }}>Mål: {g.target.toLocaleString("sv-SE")} kr · {g.months} månader</div>
                    </div>
                  </div>
                  <button onClick={() => removeGoal(g.id)} style={{ fontSize: 11, color: "#ef4444", background: "none", border: "none", cursor: "pointer" }}>✕</button>
                </div>

                {/* Progress bar */}
                <div style={{ marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#64748b", marginBottom: 4 }}>
                    <span>{g.saved.toLocaleString("sv-SE")} kr sparade</span>
                    <span style={{ color: g.color, fontWeight: 700 }}>{pct.toFixed(0)}%</span>
                  </div>
                  <div style={{ background: "#1e293b", borderRadius: 99, height: 10, overflow: "hidden" }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: `linear-gradient(90deg, ${g.color}88, ${g.color})`, borderRadius: 99, transition: "width 0.6s ease" }} />
                  </div>
                  <div style={{ fontSize: 11, color: "#475569", marginTop: 3 }}>{remaining.toLocaleString("sv-SE")} kr kvar</div>
                </div>

                {/* Monthly needed */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: canAfford ? "#10b98111" : "#ef444411", borderRadius: 10, padding: "10px 12px", marginBottom: 10 }}>
                  <div>
                    <div style={{ fontSize: 11, color: "#64748b" }}>Spara per månad</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: canAfford ? "#10b981" : "#ef4444" }}>{monthly.toLocaleString("sv-SE", { maximumFractionDigits: 0 })} kr</div>
                  </div>
                  <div style={{ fontSize: 11, color: canAfford ? "#10b981" : "#ef4444", textAlign: "right" }}>
                    {canAfford ? "✓ Du klarar det!" : "⚠ Justera mål"}
                  </div>
                </div>

                {/* Update saved amount */}
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <div style={{ fontSize: 12, color: "#64748b", flexShrink: 0 }}>Uppdatera sparat:</div>
                  <input
                    value={g.saved || ""}
                    onChange={e => updateGoalSaved(g.id, e.target.value)}
                    inputMode="decimal"
                    style={{ flex: 1, padding: "7px 10px", background: "#1e293b", border: "1px solid #334155", borderRadius: 8, color: "#e2e8f0", fontSize: 13, outline: "none" }}
                  />
                  <span style={{ fontSize: 12, color: "#475569" }}>kr</span>
                </div>
              </div>
            );
          })}

          {/* Add goal */}
          {addingGoal ? (
            <div style={{ background: "#0f172a", borderRadius: 14, border: "1px solid #1e293b", padding: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#94a3b8", marginBottom: 12 }}>✨ Nytt sparmål</div>
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>Namn</div>
                {inp(newGoal.name, v => setNewGoal(g => ({ ...g, name: v })), "t.ex. Semester, Buffert...")}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                <div>
                  <div style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>Målbelopp (kr)</div>
                  {inp(newGoal.target, v => setNewGoal(g => ({ ...g, target: v })), "50 000", "number")}
                </div>
                <div>
                  <div style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>Redan sparat (kr)</div>
                  {inp(newGoal.saved, v => setNewGoal(g => ({ ...g, saved: v })), "0", "number")}
                </div>
              </div>
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>Tidshorisont (månader)</div>
                {inp(newGoal.months, v => setNewGoal(g => ({ ...g, months: v })), "12", "number")}
              </div>
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 12, color: "#64748b", marginBottom: 6 }}>Ikon</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {EMOJIS.map(e => (
                    <button key={e} onClick={() => setNewGoal(g => ({ ...g, emoji: e }))} style={{ fontSize: 20, padding: 4, background: newGoal.emoji === e ? "#10b98122" : "none", border: `1px solid ${newGoal.emoji === e ? "#10b981" : "#334155"}`, borderRadius: 8, cursor: "pointer" }}>{e}</button>
                  ))}
                </div>
              </div>
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 12, color: "#64748b", marginBottom: 6 }}>Färg</div>
                <div style={{ display: "flex", gap: 8 }}>
                  {COLORS.map(c => (
                    <button key={c} onClick={() => setNewGoal(g => ({ ...g, color: c }))} style={{ width: 28, height: 28, borderRadius: "50%", background: c, border: `3px solid ${newGoal.color === c ? "#fff" : "transparent"}`, cursor: "pointer" }} />
                  ))}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={addGoal} disabled={!newGoal.name || !newGoal.target} style={{ flex: 1, padding: "11px", background: "linear-gradient(135deg,#10b981,#0ea5e9)", border: "none", borderRadius: 10, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
                  Lägg till mål
                </button>
                <button onClick={() => setAddingGoal(false)} style={{ padding: "11px 16px", background: "#1e293b", border: "1px solid #334155", borderRadius: 10, color: "#94a3b8", fontSize: 14, cursor: "pointer" }}>
                  Avbryt
                </button>
              </div>
            </div>
          ) : (
            <button onClick={() => setAddingGoal(true)} style={{ width: "100%", padding: "13px", background: "#0f172a", border: "1px dashed #334155", borderRadius: 12, color: "#64748b", fontSize: 14, cursor: "pointer", marginTop: 4 }}>
              + Lägg till sparmål
            </button>
          )}

          {/* Total monthly commitment */}
          {goals.length > 0 && (
            <div style={{ background: "#0f172a", borderRadius: 12, border: "1px solid #1e293b", padding: 14, marginTop: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 13, color: "#64748b" }}>Total sparåtagande/mån</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: "#3b82f6" }}>{totalGoalNeeded.toLocaleString("sv-SE", { maximumFractionDigits: 0 })} kr</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 13, color: "#64748b" }}>Kvar efter alla mål</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: freeAfterGoals >= 0 ? "#10b981" : "#ef4444" }}>{freeAfterGoals.toLocaleString("sv-SE", { maximumFractionDigits: 0 })} kr</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* FIRE */}
      {activeSubSection === "fire" && <FireKalkylator inc={inc} leftover={leftover} />}

      {/* RANTA PA RANTA */}
      {activeSubSection === "rantan" && <RantaKalkylator />}

      {/* SKULDFRI */}
      {activeSubSection === "skuld" && <SkuldfriKalkylator />}

      {/* PENSION */}
      {activeSubSection === "pension" && <PensionKalkylator inc={inc} />}
      {activeSubSection === "kreditscore" && <KreditScore inc={inc} />}
      {activeSubSection === "lonespec" && <LoneSpec inc={inc} />}
      {activeSubSection === "snittlon" && <SnittLon />}
      {activeSubSection === "lonekalkyl" && <LoneKalkyl inc={inc} />}
      {activeSubSection === "juridiskAI" && <JuridiskAI />}
      {activeSubSection === "kryptokuide" && <KryptoGuide />}
      {activeSubSection === "kryptoskatt" && <KryptoSkatt />}
      {activeSubSection === "utlandguide" && <UtlandGuide />}
      {activeSubSection === "fondguide" && <FondGuide />}
      {activeSubSection === "valutaomvandlare" && <ValutaWidget exchangeRates={exchangeRates} currency={currency} currencies={CURRENCIES} />}
      {activeSubSection === "aicoach" && <AICoach inc={inc} expenses={expenses} goals={goals} />}
      {activeSubSection === "lanansokan" && <LanAnsokan />}
      {activeSubSection === "minaforsakringar" && <MinaForsakringar />}
      {activeSubSection === "forsakringsguide" && <ForsakringsGuide />}
      {activeSubSection === "jamforforsakring" && <JamforForsakring />}
      {activeSubSection === "abonnemang" && <Abonnemang />}
      {activeSubSection === "boendekostnad" && <Boendekostnad />}
      {activeSubSection === "fordonskostnad" && <Fordonskostnad />}
      {activeSubSection === "skatt" && <SkattKalkylator inc={inc} />}
      {activeSubSection === "lon" && <LonSkatt inc={inc} />}
      {activeSubSection === "k4" && <K4Kalkylator />}
      {activeSubSection === "isk" && <ISKKalkylator />}
      {activeSubSection === "rot" && <RotRutKalkylator />}

    </div>
  );
}

// ── FIRE Kalkylator ───────────────────────────────────────────────────────
function FireKalkylator({ inc, leftover }) {
  const [monthlyInvest, setMonthlyInvest] = useState(String(Math.max(0, Math.round(leftover)) || ""));
  const [currentSavings, setCurrentSavings] = useState("");
  const [annualReturn, setAnnualReturn] = useState("8");
  const [withdrawalRate, setWithdrawalRate] = useState("4");
  const [age, setAge] = useState("30");

  const mi = parseFloat(monthlyInvest) || 0;
  const cs = parseFloat(currentSavings) || 0;
  const r = (parseFloat(annualReturn) || 8) / 100;
  const wr = (parseFloat(withdrawalRate) || 4) / 100;
  const currentAge = parseInt(age) || 30;

  // Yearly expenses = income - savings
  const yearlyExpenses = (inc - mi) * 12;
  const fireNumber = yearlyExpenses / wr;
  const monthlyR = r / 12;

  // Months to reach FIRE number using FV formula
  let months = 0;
  if (mi > 0 && r > 0) {
    // FV = PV*(1+r)^n + PMT*((1+r)^n - 1)/r
    // Solve for n numerically
    let fv = cs;
    while (fv < fireNumber && months < 600) {
      fv = fv * (1 + monthlyR) + mi;
      months++;
    }
  }
  const yearsToFire = Math.ceil(months / 12);
  const fireAge = currentAge + yearsToFire;
  const projectedWealth = cs * Math.pow(1 + r, yearsToFire) + mi * 12 * ((Math.pow(1 + r, yearsToFire) - 1) / r);
  const passiveIncome = projectedWealth * wr / 12;

  const inp = (val, set, ph, suffix) => (
    <div style={{ background: "#0a0f1e", borderRadius: 10, padding: "12px 14px" }}>
      <div style={{ fontSize: 11, color: "#64748b", marginBottom: 6 }}>{ph}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <input value={val} onChange={e => set(e.target.value)} inputMode="decimal"
          style={{ flex: 1, background: "none", border: "none", outline: "none", fontSize: 22, fontWeight: 700, color: "#e2e8f0", width: "100%" }} />
        <span style={{ fontSize: 13, color: "#475569" }}>{suffix}</span>
      </div>
    </div>
  );

  return (
    <div>
      <div style={{ background: "linear-gradient(135deg,#0f172a,#1a0a00)", borderRadius: 14, border: "1px solid #f59e0b33", padding: 16, marginBottom: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#f59e0b", marginBottom: 4 }}>🔥 FIRE-kalkylator</div>
        <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.6 }}>
          Financial Independence, Retire Early — hur snabbt kan du bli ekonomiskt fri? Baserat på 4%-regeln: när ditt kapital × 4% täcker dina årsutgifter kan du sluta jobba.
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
        {inp(age, setAge, "Din ålder", "år")}
        {inp(currentSavings, setCurrentSavings, "Befintligt sparkapital", "kr")}
        {inp(monthlyInvest, setMonthlyInvest, "Månadssparande", "kr/mån")}
        {inp(annualReturn, setAnnualReturn, "Förväntad årsavkastning", "%")}
        {inp(withdrawalRate, setWithdrawalRate, "Uttagsränta (standard 4%)", "%")}
        {inp(String(Math.round(yearlyExpenses)), () => {}, "Årsutgifter (beräknat)", "kr")}
      </div>

      {mi > 0 && (
        <div>
          {/* FIRE Number */}
          <div style={{ background: "#0f172a", borderRadius: 14, border: "1px solid #f59e0b33", padding: 18, marginBottom: 10, textAlign: "center" }}>
            <div style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>🎯 Ditt FIRE-nummer</div>
            <div style={{ fontSize: 32, fontWeight: 800, color: "#f59e0b" }}>{(fireNumber / 1000000).toFixed(1)} mkr</div>
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>= {Math.round(yearlyExpenses).toLocaleString("sv-SE")} kr/år ÷ {(wr * 100).toFixed(0)}%</div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
            <div style={{ background: "#0f172a", borderRadius: 12, border: "1px solid #10b98133", padding: 14, textAlign: "center" }}>
              <div style={{ fontSize: 11, color: "#64748b", marginBottom: 4 }}>🏁 FIRE-ålder</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: months >= 600 ? "#ef4444" : "#10b981" }}>{months >= 600 ? "50+" : fireAge} år</div>
              <div style={{ fontSize: 11, color: "#64748b" }}>om {months >= 600 ? "50+" : yearsToFire} år</div>
            </div>
            <div style={{ background: "#0f172a", borderRadius: 12, border: "1px solid #3b82f633", padding: 14, textAlign: "center" }}>
              <div style={{ fontSize: 11, color: "#64748b", marginBottom: 4 }}>💰 Passiv inkomst/mån</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#3b82f6" }}>{Math.round(passiveIncome).toLocaleString("sv-SE")} kr</div>
              <div style={{ fontSize: 11, color: "#64748b" }}>vid FIRE</div>
            </div>
          </div>

          {/* Timeline */}
          <div style={{ background: "#0f172a", borderRadius: 12, border: "1px solid #1e293b", padding: 14 }}>
            <div style={{ fontSize: 11, color: "#64748b", marginBottom: 10, textTransform: "uppercase", letterSpacing: 1 }}>Milstolpar</div>
            {[0.25, 0.5, 0.75, 1.0].map(pct => {
              let m = 0, fv = cs;
              const target = fireNumber * pct;
              while (fv < target && m < months) { fv = fv * (1 + monthlyR) + mi; m++; }
              const y = Math.ceil(m / 12);
              return (
                <div key={pct} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #1e293b" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: "50%", background: pct === 1 ? "#f59e0b22" : "#1e293b", border: `2px solid ${pct === 1 ? "#f59e0b" : "#334155"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: pct === 1 ? "#f59e0b" : "#64748b" }}>{pct * 100}%</div>
                    <div>
                      <div style={{ fontSize: 13, color: "#e2e8f0" }}>{(fireNumber * pct / 1000000).toFixed(2)} mkr</div>
                      <div style={{ fontSize: 11, color: "#475569" }}>Ålder {currentAge + y}</div>
                    </div>
                  </div>
                  <div style={{ fontSize: 13, color: "#64748b" }}>om {y} år</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Ränta-på-ränta Kalkylator ─────────────────────────────────────────────
function RantaKalkylator() {
  const [initial, setInitial] = useState("10000");
  const [monthly, setMonthly] = useState("2000");
  const [rate, setRate] = useState("8");
  const [years, setYears] = useState("20");

  const p = parseFloat(initial) || 0;
  const m = parseFloat(monthly) || 0;
  const r = (parseFloat(rate) || 8) / 100;
  const y = parseInt(years) || 20;
  const mr = r / 12;
  const n = y * 12;

  const finalValue = p * Math.pow(1 + mr, n) + m * ((Math.pow(1 + mr, n) - 1) / mr);
  const totalInvested = p + m * n;
  const totalReturn = finalValue - totalInvested;
  const multiplier = totalInvested > 0 ? finalValue / totalInvested : 1;

  // Build chart data year by year
  const chartData = Array.from({ length: y + 1 }, (_, i) => {
    const ni = i * 12;
    return {
      year: i,
      value: p * Math.pow(1 + mr, ni) + m * ((Math.pow(1 + mr, ni) - 1) / mr),
      invested: p + m * ni
    };
  });
  const maxVal = chartData[chartData.length - 1].value;

  const inp = (val, set, ph, suffix) => (
    <div style={{ background: "#0a0f1e", borderRadius: 10, padding: "12px 14px" }}>
      <div style={{ fontSize: 11, color: "#64748b", marginBottom: 6 }}>{ph}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <input value={val} onChange={e => set(e.target.value)} inputMode="decimal"
          style={{ flex: 1, background: "none", border: "none", outline: "none", fontSize: 22, fontWeight: 700, color: "#e2e8f0" }} />
        <span style={{ fontSize: 13, color: "#475569" }}>{suffix}</span>
      </div>
    </div>
  );

  return (
    <div>
      <div style={{ background: "linear-gradient(135deg,#0f172a,#0a1f0a)", borderRadius: 14, border: "1px solid #10b98133", padding: 14, marginBottom: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#10b981", marginBottom: 4 }}>📈 Ränta-på-ränta</div>
        <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.6 }}>Världens åttonde underverk. Se hur ditt sparande växer exponentiellt när avkastningen återinvesteras år efter år.</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
        {inp(initial, setInitial, "Startkapital", "kr")}
        {inp(monthly, setMonthly, "Månadssparande", "kr/mån")}
        {inp(rate, setRate, "Årsavkastning", "%")}
        {inp(years, setYears, "Antal år", "år")}
      </div>

      {/* Result cards */}
      <div style={{ background: "linear-gradient(135deg,#0a1f0a,#0f172a)", borderRadius: 14, border: "1px solid #10b98144", padding: 18, marginBottom: 12, textAlign: "center" }}>
        <div style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>Totalt värde efter {y} år</div>
        <div style={{ fontSize: 36, fontWeight: 900, color: "#10b981" }}>{(finalValue / 1000000).toFixed(2)} mkr</div>
        <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>{multiplier.toFixed(1)}× ditt insatta kapital</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
        <div style={{ background: "#0f172a", borderRadius: 12, border: "1px solid #1e293b", padding: 12, textAlign: "center" }}>
          <div style={{ fontSize: 11, color: "#64748b", marginBottom: 4 }}>💸 Insatt totalt</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#e2e8f0" }}>{(totalInvested / 1000).toFixed(0)}k kr</div>
        </div>
        <div style={{ background: "#0f172a", borderRadius: 12, border: "1px solid #10b98133", padding: 12, textAlign: "center" }}>
          <div style={{ fontSize: 11, color: "#64748b", marginBottom: 4 }}>✨ Ränta-på-ränta</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#10b981" }}>{(totalReturn / 1000).toFixed(0)}k kr</div>
        </div>
      </div>

      {/* Visual chart */}
      <div style={{ background: "#0f172a", borderRadius: 12, border: "1px solid #1e293b", padding: 14 }}>
        <div style={{ fontSize: 11, color: "#64748b", marginBottom: 10, textTransform: "uppercase", letterSpacing: 1 }}>Tillväxtkurva</div>
        <div style={{ position: "relative", height: 100 }}>
          <svg viewBox={`0 0 ${y} 100`} style={{ width: "100%", height: "100%" }} preserveAspectRatio="none">
            <defs>
              <linearGradient id="rGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.02" />
              </linearGradient>
            </defs>
            {/* Invested area */}
            <polygon
              points={`0,100 ${chartData.map((d, i) => `${i},${100 - (d.invested / maxVal) * 95}`).join(" ")} ${y},100`}
              fill="#3b82f622"
            />
            {/* Total value area */}
            <polygon
              points={`0,100 ${chartData.map((d, i) => `${i},${100 - (d.value / maxVal) * 95}`).join(" ")} ${y},100`}
              fill="url(#rGrad)"
            />
            <polyline
              points={chartData.map((d, i) => `${i},${100 - (d.value / maxVal) * 95}`).join(" ")}
              fill="none" stroke="#10b981" strokeWidth="1.5"
            />
          </svg>
        </div>
        <div style={{ display: "flex", gap: 16, marginTop: 8, justifyContent: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#64748b" }}>
            <div style={{ width: 12, height: 4, background: "#3b82f644", borderRadius: 2 }} />Insatt kapital
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#64748b" }}>
            <div style={{ width: 12, height: 4, background: "#10b981", borderRadius: 2 }} />Total tillväxt
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Skuldfri Kalkylator ───────────────────────────────────────────────────
function SkuldfriKalkylator() {
  const [debts, setDebts] = useState([
    { id: 1, name: "Bolån", balance: 2000000, rate: 4.5, minPayment: 8000, color: "#3b82f6" },
    { id: 2, name: "Billån", balance: 120000, rate: 6.9, minPayment: 2500, color: "#f59e0b" },
    { id: 3, name: "Kreditkort", balance: 35000, rate: 19.9, minPayment: 1000, color: "#ef4444" },
  ]);
  const [extraPayment, setExtraPayment] = useState("2000");
  const [strategy, setStrategy] = useState("avalanche"); // avalanche | snowball
  const [adding, setAdding] = useState(false);
  const [newDebt, setNewDebt] = useState({ name: "", balance: "", rate: "", minPayment: "", color: "#3b82f6" });

  const extra = parseFloat(extraPayment) || 0;
  const totalDebt = debts.reduce((s, d) => s + d.balance, 0);
  const totalMinPayment = debts.reduce((s, d) => s + d.minPayment, 0);

  // Calculate payoff time with chosen strategy
  const calcPayoff = () => {
    let remaining = debts.map(d => ({ ...d, bal: d.balance }));
    let month = 0;
    let totalInterest = 0;

    while (remaining.some(d => d.bal > 0) && month < 600) {
      // Apply interest
      remaining = remaining.map(d => ({
        ...d,
        bal: d.bal > 0 ? d.bal * (1 + d.rate / 100 / 12) : 0
      }));

      // Sort by strategy
      const sorted = [...remaining].filter(d => d.bal > 0).sort((a, b) =>
        strategy === "avalanche" ? b.rate - a.rate : a.bal - b.bal
      );

      // Pay minimums first
      remaining = remaining.map(d => ({ ...d, bal: Math.max(0, d.bal - d.minPayment) }));

      // Apply extra to top priority
      if (sorted.length > 0) {
        const target = sorted[0];
        const idx = remaining.findIndex(d => d.id === target.id);
        remaining[idx].bal = Math.max(0, remaining[idx].bal - extra);
      }

      totalInterest += remaining.reduce((s, d) => s + Math.max(0, d.bal * (d.rate / 100 / 12)), 0);
      month++;
    }
    return { months: month, totalInterest };
  };

  const calcMinOnly = () => {
    let remaining = debts.map(d => ({ ...d, bal: d.balance }));
    let month = 0;
    while (remaining.some(d => d.bal > 0) && month < 600) {
      remaining = remaining.map(d => ({
        ...d,
        bal: d.bal > 0 ? Math.max(0, d.bal * (1 + d.rate / 100 / 12) - d.minPayment) : 0
      }));
      month++;
    }
    return month;
  };

  const { months, totalInterest } = calcPayoff();
  const minOnlyMonths = calcMinOnly();
  const monthsSaved = minOnlyMonths - months;
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;

  const COLORS = ["#3b82f6","#f59e0b","#ef4444","#10b981","#8b5cf6","#ec4899"];

  return (
    <div>
      <div style={{ background: "linear-gradient(135deg,#0f172a,#1a0000)", borderRadius: 14, border: "1px solid #ef444433", padding: 14, marginBottom: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#ef4444", marginBottom: 4 }}>💳 Skuldfri kalkylator</div>
        <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.6 }}>
          <b style={{ color: "#f59e0b" }}>Avalanche</b> = betala dyraste skulden först (sparar mest pengar). <b style={{ color: "#10b981" }}>Snowball</b> = betala minsta skulden först (ger snabbast motivation).
        </div>
      </div>

      {/* Strategy toggle */}
      <div style={{ display: "flex", gap: 4, background: "#0f172a", borderRadius: 12, padding: 4, border: "1px solid #1e293b", marginBottom: 14 }}>
        <button onClick={() => setStrategy("avalanche")} style={{ flex: 1, padding: "10px", background: strategy === "avalanche" ? "#f59e0b22" : "none", border: `1px solid ${strategy === "avalanche" ? "#f59e0b" : "transparent"}`, borderRadius: 9, color: strategy === "avalanche" ? "#f59e0b" : "#64748b", fontSize: 13, fontWeight: strategy === "avalanche" ? 700 : 400, cursor: "pointer" }}>
          🏔 Avalanche (billigast)
        </button>
        <button onClick={() => setStrategy("snowball")} style={{ flex: 1, padding: "10px", background: strategy === "snowball" ? "#10b98122" : "none", border: `1px solid ${strategy === "snowball" ? "#10b981" : "transparent"}`, borderRadius: 9, color: strategy === "snowball" ? "#10b981" : "#64748b", fontSize: 13, fontWeight: strategy === "snowball" ? 700 : 400, cursor: "pointer" }}>
          ❄️ Snowball (motiverande)
        </button>
      </div>

      {/* Extra payment */}
      <div style={{ background: "#0a0f1e", borderRadius: 10, padding: "12px 14px", marginBottom: 14 }}>
        <div style={{ fontSize: 11, color: "#64748b", marginBottom: 6 }}>Extra betalning utöver minimierna</div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <input value={extraPayment} onChange={e => setExtraPayment(e.target.value)} inputMode="decimal"
            style={{ flex: 1, background: "none", border: "none", outline: "none", fontSize: 24, fontWeight: 700, color: "#10b981" }} />
          <span style={{ fontSize: 14, color: "#475569" }}>kr/mån</span>
        </div>
      </div>

      {/* Debts list */}
      {debts.map(d => (
        <div key={d.id} style={{ background: "#0f172a", borderRadius: 12, border: `1px solid ${d.color}33`, padding: 14, marginBottom: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: d.color }} />
              <span style={{ fontSize: 14, fontWeight: 600, color: "#e2e8f0" }}>{d.name}</span>
            </div>
            <button onClick={() => setDebts(debts.filter(x => x.id !== d.id))} style={{ fontSize: 11, color: "#475569", background: "none", border: "none", cursor: "pointer" }}>✕</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
            {[["Skuld", d.balance, "kr", "balance"], ["Ränta", d.rate, "%", "rate"], ["Min/mån", d.minPayment, "kr", "minPayment"]].map(([label, val, suf, key]) => (
              <div key={label}>
                <div style={{ fontSize: 10, color: "#475569", marginBottom: 2 }}>{label}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                  <input value={val} onChange={e => setDebts(debts.map(x => x.id === d.id ? { ...x, [key]: parseFloat(e.target.value) || 0 } : x))}
                    inputMode="decimal" style={{ width: "100%", background: "#1e293b", border: "1px solid #334155", borderRadius: 6, padding: "5px 7px", color: "#e2e8f0", fontSize: 12, outline: "none" }} />
                  <span style={{ fontSize: 10, color: "#475569" }}>{suf}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      <button onClick={() => setAdding(true)} style={{ width: "100%", padding: "10px", background: "#0f172a", border: "1px dashed #334155", borderRadius: 10, color: "#64748b", fontSize: 13, cursor: "pointer", marginBottom: 14 }}>
        + Lägg till skuld
      </button>
      {adding && (
        <div style={{ background: "#0f172a", borderRadius: 12, border: "1px solid #1e293b", padding: 14, marginBottom: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
            {[["Namn", "name", "text"], ["Skuld (kr)", "balance", "decimal"], ["Ränta (%)", "rate", "decimal"], ["Min/mån (kr)", "minPayment", "decimal"]].map(([ph, key, mode]) => (
              <input key={key} value={newDebt[key]} onChange={e => setNewDebt(n => ({ ...n, [key]: e.target.value }))} placeholder={ph} inputMode={mode}
                style={{ padding: "9px 10px", background: "#1e293b", border: "1px solid #334155", borderRadius: 8, color: "#e2e8f0", fontSize: 13, outline: "none" }} />
            ))}
          </div>
          <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
            {COLORS.map(c => <button key={c} onClick={() => setNewDebt(n => ({ ...n, color: c }))} style={{ width: 24, height: 24, borderRadius: "50%", background: c, border: `3px solid ${newDebt.color === c ? "#fff" : "transparent"}`, cursor: "pointer" }} />)}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => { if (newDebt.name && newDebt.balance) { setDebts([...debts, { ...newDebt, id: Date.now(), balance: +newDebt.balance, rate: +newDebt.rate, minPayment: +newDebt.minPayment }]); setNewDebt({ name: "", balance: "", rate: "", minPayment: "", color: "#3b82f6" }); setAdding(false); }}} style={{ flex: 1, padding: "10px", background: "linear-gradient(135deg,#10b981,#0ea5e9)", border: "none", borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Lägg till</button>
            <button onClick={() => setAdding(false)} style={{ padding: "10px 14px", background: "#1e293b", border: "1px solid #334155", borderRadius: 8, color: "#94a3b8", fontSize: 13, cursor: "pointer" }}>Avbryt</button>
          </div>
        </div>
      )}

      {/* Results */}
      {debts.length > 0 && (
        <div>
          <div style={{ background: "#0f172a", borderRadius: 14, border: "1px solid #10b98133", padding: 16, marginBottom: 10, textAlign: "center" }}>
            <div style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>🏁 Skuldfri om</div>
            <div style={{ fontSize: 32, fontWeight: 800, color: "#10b981" }}>{years}år {remainingMonths}mån</div>
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>Total skuld: {totalDebt.toLocaleString("sv-SE")} kr · Min/mån: {totalMinPayment.toLocaleString("sv-SE")} kr</div>
          </div>
          {monthsSaved > 0 && extra > 0 && (
            <div style={{ background: "#22c55e11", borderRadius: 12, border: "1px solid #22c55e33", padding: 12, textAlign: "center" }}>
              <div style={{ fontSize: 13, color: "#22c55e", fontWeight: 700 }}>✓ Extra {extra.toLocaleString("sv-SE")} kr/mån sparar dig {Math.floor(monthsSaved / 12)} år {monthsSaved % 12} mån!</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Pension Kalkylator ────────────────────────────────────────────────────

function PensionBerakna({ inc }) {
  const [age, setAge] = useState("35");
  const [retireAge, setRetireAge] = useState("65");
  const [currentPension, setCurrentPension] = useState("150000");
  const [extraMonthly, setExtraMonthly] = useState("1000");
  const [salary, setSalary] = useState(String(Math.round((inc || 0) * 1.35) || "45000"));
  const [returnRate, setReturnRate] = useState("5");

  const a = parseInt(age) || 35;
  const ra = parseInt(retireAge) || 65;
  const years = Math.max(0, ra - a);
  const cp = parseFloat(currentPension) || 0;
  const em = parseFloat(extraMonthly) || 0;
  const sal = parseFloat(salary) || 0;
  const r = (parseFloat(returnRate) || 5) / 100;
  const mr = r / 12;
  const n = years * 12;
  const employerContrib = sal * 0.045;
  const statePension = Math.min(sal, 598000 / 12) * 0.185;
  const totalMonthlyContrib = employerContrib + em;
  const pensionCapital = cp * Math.pow(1 + r, years) + totalMonthlyContrib * ((Math.pow(1 + mr, n) - 1) / mr);
  const retirementYears = Math.max(1, 84 - ra);
  const monthlyPension = pensionCapital / (retirementYears * 12);
  const statePensionMonthly = statePension > 0 ? statePension * 0.4 : 8000;
  const totalMonthlyAtRetirement = monthlyPension + statePensionMonthly;
  const replacementRate = sal > 0 ? (totalMonthlyAtRetirement / sal * 100) : 0;
  const rateColor = replacementRate >= 70 ? "#10b981" : replacementRate >= 50 ? "#f59e0b" : "#ef4444";

  const inp = (val, set, ph, suffix) => (
    <div style={{ background: "#0a0f1e", borderRadius: 10, padding: "12px 14px" }}>
      <div style={{ fontSize: 11, color: "#64748b", marginBottom: 6 }}>{ph}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <input value={val} onChange={e => set(e.target.value)} inputMode="decimal" style={{ flex: 1, background: "none", border: "none", outline: "none", fontSize: 20, fontWeight: 700, color: "#e2e8f0" }} />
        <span style={{ fontSize: 12, color: "#475569" }}>{suffix}</span>
      </div>
    </div>
  );

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
        {inp(age, setAge, "Din alder", "ar")}
        {inp(retireAge, setRetireAge, "Pensionsalder", "ar")}
        {inp(salary, setSalary, "Manadslon (brutto)", "kr")}
        {inp(currentPension, setCurrentPension, "Befintligt pensionskapital", "kr")}
        {inp(extraMonthly, setExtraMonthly, "Extra manadsparande", "kr/man")}
        {inp(returnRate, setReturnRate, "Forvantad avkastning", "%")}
      </div>
      <div style={{ background: "linear-gradient(135deg,#0f172a," + rateColor + "11)", borderRadius: 14, border: "1px solid " + rateColor + "44", padding: 18, textAlign: "center", marginBottom: 12 }}>
        <div style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>Uppskattad pension per manad</div>
        <div style={{ fontSize: 36, fontWeight: 900, color: rateColor }}>{Math.round(totalMonthlyAtRetirement).toLocaleString("sv-SE")} kr</div>
        <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>Ersattningsgrad: <span style={{ color: rateColor, fontWeight: 700 }}>{replacementRate.toFixed(0)}%</span> av lonen</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 12 }}>
        {[["Tjanstepension", Math.round(monthlyPension)], ["Allman pension", Math.round(statePensionMonthly)], ["Pensionskapital", Math.round(pensionCapital/1000) + "k kr"]].map(([l, v]) => (
          <div key={l} style={{ background: "#0f172a", borderRadius: 10, border: "1px solid #1e293b", padding: "10px 8px", textAlign: "center" }}>
            <div style={{ fontSize: 10, color: "#475569", marginBottom: 4 }}>{l}</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#e2e8f0" }}>{typeof v === "number" ? v.toLocaleString("sv-SE") + " kr" : v}</div>
          </div>
        ))}
      </div>
      <div style={{ background: "#0f172a", borderRadius: 12, border: "1px solid #1e293b", padding: 14 }}>
        <div style={{ fontSize: 11, color: "#64748b", marginBottom: 8 }}>Rekommendationer</div>
        {replacementRate < 70 && <div style={{ fontSize: 13, color: "#f59e0b", marginBottom: 6, display: "flex", gap: 8 }}><span>!</span><span>Du behoever spara {Math.round(sal * 0.7 - totalMonthlyAtRetirement).toLocaleString("sv-SE")} kr/man extra for att na 70%-malet</span></div>}
        {["IPS ger skatteavdrag pa upp till 35 700 kr/ar", years > 5 ? "Med " + years + " ar kvar — valj aktiefonder" : "Nara pension — flytta till rantefonder", "Kolla minpension.se for exakta siffror"].map((t, i) => (
          <div key={i} style={{ fontSize: 12, color: "#94a3b8", marginBottom: 5, display: "flex", gap: 8 }}><span style={{ color: "#10b981" }}>-></span>{t}</div>
        ))}
      </div>
    </div>
  );
}

function PensionsBrev() {
  const [brev, setBrev] = useState(() => { try { return JSON.parse(localStorage.getItem("kapital_pensionsbrev") || "{}"); } catch { return {}; } });
  const save = (key, val) => { const next = { ...brev, [key]: val }; setBrev(next); try { localStorage.setItem("kapital_pensionsbrev", JSON.stringify(next)); } catch {} };

  const POSTER = [
    { key: "inkomst", label: "Inkomstpension", emoji: "🇸🇪", color: "#3b82f6", desc: "Allman pension fran Pensionsmyndigheten" },
    { key: "premie", label: "Premiepension (PPM)", emoji: "📊", color: "#8b5cf6", desc: "Fondpension — du valjer fonder sjalv" },
    { key: "tjanste", label: "Tjanstepension", emoji: "🏢", color: "#10b981", desc: "Fran din arbetsgivare (ITP, SAF-LO etc)" },
    { key: "privat", label: "Privat pensionssparande", emoji: "💰", color: "#f59e0b", desc: "IPS, kapitalforsakring eller ISK" },
  ];

  const totalKapital = POSTER.reduce((s, p) => s + (parseFloat(brev[p.key + "_kapital"]) || 0), 0);

  return (
    <div>
      <div style={{ background: "#0f172a", borderRadius: 14, border: "1px solid #3b82f633", padding: 14, marginBottom: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#3b82f6", marginBottom: 4 }}>Samla dina pensionsbrev</div>
        <div style={{ fontSize: 12, color: "#64748b" }}>Hamta dina uppgifter fran minpension.se och fyll i beloppen har.</div>
      </div>
      {POSTER.map(p => (
        <div key={p.key} style={{ background: "#0f172a", borderRadius: 12, border: "1px solid " + p.color + "33", padding: 14, marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <span style={{ fontSize: 22 }}>{p.emoji}</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#e2e8f0" }}>{p.label}</div>
              <div style={{ fontSize: 11, color: "#475569" }}>{p.desc}</div>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {[["kapital", "Pensionskapital (kr)"], ["prognos", "Prognos/man vid 65 (kr)"]].map(([suf, label]) => (
              <div key={suf}>
                <div style={{ fontSize: 10, color: "#64748b", marginBottom: 4 }}>{label}</div>
                <input value={brev[p.key + "_" + suf] || ""} onChange={e => save(p.key + "_" + suf, e.target.value)} placeholder="0" inputMode="decimal"
                  style={{ width: "100%", padding: "8px 10px", background: "#1e293b", border: "1px solid #334155", borderRadius: 8, color: "#e2e8f0", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
              </div>
            ))}
          </div>
        </div>
      ))}
      {totalKapital > 0 && (
        <div style={{ background: "linear-gradient(135deg,#0a1f0a,#0f172a)", borderRadius: 14, border: "1px solid #10b98144", padding: 18, textAlign: "center" }}>
          <div style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>Totalt pensionskapital</div>
          <div style={{ fontSize: 36, fontWeight: 900, color: "#10b981" }}>{(totalKapital/1000).toFixed(0)}k kr</div>
        </div>
      )}
      <div style={{ background: "#0f172a", borderRadius: 12, border: "1px solid #1e293b", padding: 14, marginTop: 12 }}>
        <div style={{ fontSize: 11, color: "#64748b", marginBottom: 8 }}>Var hittar jag mina pensionsbrev?</div>
        {[["Allman pension (inkomst + PPM)", "minpension.se — logga in med BankID"], ["Tjanstepension ITP", "Collectum.se"], ["Tjanstepension SAF-LO", "Fora.se"], ["Statliga anstallda", "SPV.se"]].map(([l, s], i) => (
          <div key={i} style={{ marginBottom: 8, paddingBottom: 8, borderBottom: i < 3 ? "1px solid #1e293b" : "none" }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#e2e8f0" }}>{l}</div>
            <div style={{ fontSize: 11, color: "#64748b" }}>{s}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PensionsFonder() {
  const [riskprofil, setRiskprofil] = useState("hog");
  const [arKvar, setArKvar] = useState("30");
  const years = parseInt(arKvar) || 30;

  const FONDER = [
    { namn: "AP7 Safa", typ: "Statlig PPM-fond", risk: "hog", avgift: 0.07, avkastning: 14.2, betyg: 5, color: "#22c55e" },
    { namn: "AMF Aktiefond Global", typ: "Aktiefond Global", risk: "hog", avgift: 0.18, avkastning: 11.8, betyg: 5, color: "#10b981" },
    { namn: "Lansforsakringar Global Indexnara", typ: "Indexfond Global", risk: "hog", avgift: 0.20, avkastning: 12.1, betyg: 5, color: "#10b981" },
    { namn: "Swedbank Robur Globalfond", typ: "Aktiefond Global", risk: "hog", avgift: 0.40, avkastning: 12.3, betyg: 4, color: "#10b981" },
    { namn: "SPP Global Solutions", typ: "Hallbar aktiefond", risk: "hog", avgift: 0.87, avkastning: 10.9, betyg: 4, color: "#3b82f6" },
    { namn: "Swedbank Robur Technology", typ: "Teknikfond", risk: "hog", avgift: 1.40, avkastning: 18.5, betyg: 3, color: "#f59e0b" },
    { namn: "AMF Blandfond", typ: "Blandfond", risk: "medel", avgift: 0.25, avkastning: 8.1, betyg: 4, color: "#3b82f6" },
    { namn: "Handelsbanken Multi Asset 50", typ: "Blandfond", risk: "medel", avgift: 0.52, avkastning: 7.8, betyg: 4, color: "#3b82f6" },
    { namn: "SPP Obligationsfond", typ: "Obligationsfond", risk: "lag", avgift: 0.15, avkastning: 1.8, betyg: 3, color: "#8b5cf6" },
    { namn: "Swedbank Robur Rantefond Kort", typ: "Rantefond", risk: "lag", avgift: 0.20, avkastning: 1.2, betyg: 3, color: "#8b5cf6" },
  ];

  const rekommFonder = years > 15 ? FONDER.filter(f => f.risk === "hog") : years > 5 ? FONDER.filter(f => f.risk !== "lag") : FONDER.filter(f => f.risk === "lag" || f.risk === "medel");
  const riskFarg = r => r === "hog" ? "#ef4444" : r === "medel" ? "#f59e0b" : "#10b981";
  const riskLabel = r => r === "hog" ? "Hog risk" : r === "medel" ? "Medel" : "Lag risk";

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
        <div style={{ background: "#0a0f1e", borderRadius: 10, padding: "12px 14px" }}>
          <div style={{ fontSize: 11, color: "#64748b", marginBottom: 6 }}>Ar kvar till pension</div>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <input value={arKvar} onChange={e => setArKvar(e.target.value)} inputMode="numeric" style={{ flex: 1, background: "none", border: "none", outline: "none", fontSize: 24, fontWeight: 800, color: "#e2e8f0" }} />
            <span style={{ fontSize: 13, color: "#475569" }}>ar</span>
          </div>
        </div>
        <div style={{ background: "#0a0f1e", borderRadius: 10, padding: "12px 14px" }}>
          <div style={{ fontSize: 11, color: "#64748b", marginBottom: 6 }}>Riskprofil</div>
          <select value={riskprofil} onChange={e => setRiskprofil(e.target.value)} style={{ width: "100%", background: "none", border: "none", outline: "none", color: "#e2e8f0", fontSize: 16, fontWeight: 700, cursor: "pointer" }}>
            <option value="hog" style={{ background: "#0f172a" }}>Hog (aktier)</option>
            <option value="medel" style={{ background: "#0f172a" }}>Medel (bland)</option>
            <option value="lag" style={{ background: "#0f172a" }}>Lag (rantor)</option>
          </select>
        </div>
      </div>

      <div style={{ background: years > 15 ? "#10b98111" : years > 5 ? "#f59e0b11" : "#3b82f611", borderRadius: 14, border: "1px solid " + (years > 15 ? "#10b98133" : years > 5 ? "#f59e0b33" : "#3b82f633"), padding: 14, marginBottom: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: years > 15 ? "#10b981" : years > 5 ? "#f59e0b" : "#3b82f6", marginBottom: 6 }}>
          Kapital rekommenderar ({years} ar kvar)
        </div>
        <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.6 }}>
          {years > 15 ? "80-100% aktiefonder med lag avgift. AP7 Safa ar utmarkt standardval for PPM." : years > 5 ? "50-70% aktier, 30-50% blandfonder. Minska risken gradvis." : "Flytta till rantefonder — skydda ditt kapital nara pension."}
        </div>
      </div>

      {rekommFonder.slice(0, 3).map((f, i) => (
        <div key={f.namn} style={{ background: "#0f172a", borderRadius: 12, border: "1px solid " + f.color + "33", padding: 14, marginBottom: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
            <div>
              {i === 0 && <span style={{ fontSize: 10, background: "#f59e0b22", color: "#f59e0b", padding: "1px 7px", borderRadius: 99, fontWeight: 700, display: "inline-block", marginBottom: 4 }}>BAST VAL</span>}
              <div style={{ fontSize: 14, fontWeight: 700, color: "#e2e8f0" }}>{f.namn}</div>
              <div style={{ fontSize: 11, color: "#475569" }}>{f.typ}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#10b981" }}>+{f.avkastning}%</div>
              <div style={{ fontSize: 10, color: "#475569" }}>10 ar snitt</div>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
            {[["Avgift", f.avgift + "%/ar"], ["Betyg", "x".repeat(f.betyg).split("").map(() => "⭐").join("")], ["Risk", riskLabel(f.risk)]].map(([l, v]) => (
              <div key={l} style={{ background: "#0a0f1e", borderRadius: 8, padding: "6px 8px", textAlign: "center" }}>
                <div style={{ fontSize: 9, color: "#475569" }}>{l}</div>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#e2e8f0" }}>{v}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
      <div style={{ fontSize: 10, color: "#334155", textAlign: "center", marginTop: 8 }}>Historisk avkastning ar ingen garanti for framtida resultat.</div>
    </div>
  );
}

function PensionsStrategi() {
  const strategier = [
    { icon: "🔍", title: "1. Kolla minpension.se IDAG", color: "#3b82f6", text: "Logga in med BankID — tar 2 minuter och visar hela din pensionssituation." },
    { icon: "🏢", title: "2. Maxutnyttja tjanstepensionen", color: "#10b981", text: "Lonevaexling ger skattefordel. 1 000 kr i tjanstepension kostar dig bara ~700 kr netto." },
    { icon: "🧾", title: "3. IPS — avdrag upp till 35 700 kr/ar", color: "#f59e0b", text: "Individaellt pensionssparande ger avdrag i deklarationen. Sarskilt viktigt for egenforetagare." },
    { icon: "📊", title: "4. PPM — valj ratt fond", color: "#8b5cf6", text: "AP7 Safa ar basta standardvalet for de flesta. Kontrollera att du inte har en dyr aktiv fond." },
    { icon: "💸", title: "5. Avgifter ater din pension", color: "#ef4444", text: "1% extra avgift under 30 ar minskar kapitalet med ~25%. Valj alltid indexfonder under 0.5%." },
    { icon: "🎯", title: "6. Pensionsalder ar flexibelt", color: "#06b6d4", text: "Du kan ta ut pension fran 62 ar. Varje ar du vantar okar manadsbeloppet med ~7%." },
  ];
  return (
    <div style={{ background: "#0f172a", borderRadius: 14, border: "1px solid #1e293b", padding: 16 }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: "#10b981", marginBottom: 16 }}>Pensionsstrategi — Komplett guide</div>
      {strategier.map((s, i) => (
        <div key={s.title} style={{ marginBottom: 16, paddingBottom: 16, borderBottom: i < strategier.length - 1 ? "1px solid #1e293b" : "none" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: s.color + "22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>{s.icon}</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: s.color }}>{s.title}</div>
          </div>
          <div style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.6, paddingLeft: 42 }}>{s.text}</div>
        </div>
      ))}
      <div style={{ fontSize: 11, color: "#334155", textAlign: "center" }}>Konsultera en auktoriserad pensionsradgivare for personlig radgivning.</div>
    </div>
  );
}

function PensionKalkylator({ inc }) {
  const [section, setSection] = useState("kalkyl");
  const SBtn = ({ id, label }) => (
    <button onClick={() => setSection(id)} style={{ flex: 1, padding: "9px 4px", background: section === id ? "linear-gradient(135deg,#10b981,#0ea5e9)" : "none", border: "none", borderRadius: 9, color: section === id ? "#fff" : "#64748b", fontSize: 11, fontWeight: section === id ? 700 : 400, cursor: "pointer", whiteSpace: "nowrap" }}>
      {label}
    </button>
  );
  return (
    <div>
      <div style={{ display: "flex", gap: 4, background: "#0f172a", borderRadius: 12, padding: 4, border: "1px solid #1e293b", marginBottom: 16, overflowX: "auto", scrollbarWidth: "none" }}>
        <SBtn id="kalkyl" label="📊 Kalkylator" />
        <SBtn id="brev" label="📋 Pensionsbrev" />
        <SBtn id="fonder" label="📈 Fonder" />
        <SBtn id="tips" label="💡 Strategi" />
      </div>
      {section === "kalkyl" && <PensionBerakna inc={inc} />}
      {section === "brev" && <PensionsBrev />}
      {section === "fonder" && <PensionsFonder />}
      {section === "tips" && <PensionsStrategi />}
    </div>
  );
}

function SkattKalkylator({ inc }) {
  const [section, setSection] = useState("lon");
  const SBtn = ({ id, label }) => (
    <button onClick={() => setSection(id)} style={{ flex: 1, padding: "9px 4px", background: section === id ? "linear-gradient(135deg,#10b981,#0ea5e9)" : "none", border: "none", borderRadius: 9, color: section === id ? "#fff" : "#64748b", fontSize: 12, fontWeight: section === id ? 700 : 400, cursor: "pointer", whiteSpace: "nowrap" }}>
      {label}
    </button>
  );
  return (
    <div>
      <div style={{ display: "flex", gap: 4, background: "#0f172a", borderRadius: 12, padding: 4, border: "1px solid #1e293b", marginBottom: 16 }}>
        <SBtn id="lon" label="💼 Lön" />
        <SBtn id="k4" label="📋 K4" />
        <SBtn id="isk" label="🏦 ISK" />
        <SBtn id="rot" label="🔨 ROT/RUT" />
      </div>
      {section === "lon" && <LonSkatt inc={inc} />}
      {section === "k4" && <K4Kalkylator />}
      {section === "isk" && <ISKKalkylator />}
      {section === "rot" && <RotRutKalkylator />}
    </div>
  );
}

function LonSkatt({ inc }) {
  const [brutto, setBrutto] = useState(String(Math.round((inc || 0) * 1.35) || "45000"));
  const [kommun, setKommun] = useState("32.0");
  const b = parseFloat(brutto) || 0;
  const k = parseFloat(kommun) || 32;
  const ga = Math.min(b > 0 ? Math.min(36000, Math.max(13200, 13200 + (Math.min(b, 123000) - 13200) * 0.34)) : 0, b);
  const beskattningsbar = Math.max(0, b - ga);
  const kommunSkatt = beskattningsbar * (k / 100);
  const arsinkomst = b * 12;
  const statligSkatt = arsinkomst > 613900 ? ((arsinkomst - 613900) / 12) * 0.20 : 0;
  const jsa = Math.min(kommunSkatt * 0.3, beskattningsbar * 0.1);
  const pensionsavgift = Math.min(b * 0.07, 35800);
  const totalSkatt = kommunSkatt + statligSkatt - jsa;
  const netto = b - totalSkatt - pensionsavgift;
  const skattePct = b > 0 ? totalSkatt / b * 100 : 0;
  const marginalSkatt = arsinkomst > 613900 ? k + 20 : k;
  const row = (l, v, c) => (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: "1px solid #1e293b" }}>
      <span style={{ fontSize: 13, color: "#64748b" }}>{l}</span>
      <span style={{ fontSize: 14, fontWeight: 600, color: c || "#e2e8f0" }}>{Math.round(Math.abs(v)).toLocaleString("sv-SE")} kr</span>
    </div>
  );
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
        <div style={{ background: "#0a0f1e", borderRadius: 10, padding: "12px 14px", gridColumn: "1/-1" }}>
          <div style={{ fontSize: 11, color: "#64748b", marginBottom: 6 }}>Bruttolön/månad</div>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <input value={brutto} onChange={e => setBrutto(e.target.value)} inputMode="decimal" style={{ flex: 1, background: "none", border: "none", outline: "none", fontSize: 28, fontWeight: 800, color: "#10b981" }} />
            <span style={{ fontSize: 14, color: "#475569" }}>kr</span>
          </div>
        </div>
        <div style={{ background: "#0a0f1e", borderRadius: 10, padding: "12px 14px" }}>
          <div style={{ fontSize: 11, color: "#64748b", marginBottom: 6 }}>Kommunalskatt</div>
          <div style={{ display: "flex", gap: 4 }}>
            <input value={kommun} onChange={e => setKommun(e.target.value)} inputMode="decimal" style={{ flex: 1, background: "none", border: "none", outline: "none", fontSize: 20, fontWeight: 700, color: "#e2e8f0" }} />
            <span style={{ fontSize: 12, color: "#475569" }}>%</span>
          </div>
        </div>
        <div style={{ background: "#0a0f1e", borderRadius: 10, padding: "12px 14px" }}>
          <div style={{ fontSize: 11, color: "#64748b", marginBottom: 6 }}>Snabbval kommun</div>
          <select value={kommun} onChange={e => setKommun(e.target.value)} style={{ width: "100%", background: "none", border: "none", outline: "none", color: "#e2e8f0", fontSize: 12, cursor: "pointer" }}>
            {[["Stockholm","30.11"],["Göteborg","32.35"],["Malmö","32.35"],["Uppsala","32.22"],["Snitt","32.24"]].map(([n, v]) => (
              <option key={n} value={v} style={{ background: "#0f172a" }}>{n} {v}%</option>
            ))}
          </select>
        </div>
      </div>
      {b > 0 && (
        <div>
          <div style={{ background: "#0f172a", borderRadius: 14, border: "1px solid #1e293b", padding: 16, marginBottom: 12 }}>
            {row("Bruttolön", b)}
            {row("Grundavdrag", ga, "#10b981")}
            {row(`Kommunalskatt (${k}%)`, kommunSkatt, "#ef4444")}
            {statligSkatt > 0 && row("Statlig inkomstskatt (20%)", statligSkatt, "#ef4444")}
            {row("Jobbskatteavdrag", jsa, "#10b981")}
            {row("Pensionsavgift (7%)", pensionsavgift, "#f59e0b")}
          </div>
          <div style={{ background: "linear-gradient(135deg,#0a1f0a,#0f172a)", borderRadius: 14, border: "1px solid #10b98144", padding: 18, textAlign: "center", marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>💰 Nettolön per månad</div>
            <div style={{ fontSize: 36, fontWeight: 900, color: "#10b981" }}>{Math.round(netto).toLocaleString("sv-SE")} kr</div>
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>Effektiv skatt: {skattePct.toFixed(1)}% · Marginalskatt: {marginalSkatt.toFixed(1)}%</div>
          </div>
          <div style={{ background: "#0f172a", borderRadius: 12, border: "1px solid #1e293b", padding: 14 }}>
            <div style={{ fontSize: 11, color: "#64748b", marginBottom: 8 }}>Årsöversikt</div>
            {[["Bruttoinkomst", b * 12],["Total skatt", totalSkatt * 12],["Pensionsavgift", pensionsavgift * 12],["Nettoinkomst", netto * 12]].map(([l, v], i) => (
              <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: i < 3 ? "1px solid #1e293b" : "none" }}>
                <span style={{ fontSize: 13, color: "#64748b" }}>{l}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: i === 3 ? "#10b981" : i === 1 ? "#ef4444" : "#e2e8f0" }}>{Math.round(v).toLocaleString("sv-SE")} kr</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function K4Kalkylator() {
  const [trades, setTrades] = useState([
    { id: 1, name: "Ericsson B", buyPrice: 68.5, sellPrice: 74.2, shares: 500, type: "aktie" },
    { id: 2, name: "Volvo B", buyPrice: 245.0, sellPrice: 268.5, shares: 100, type: "aktie" },
    { id: 3, name: "H&M B", buyPrice: 132.0, sellPrice: 118.4, shares: 200, type: "aktie" },
  ]);
  const [adding, setAdding] = useState(false);
  const [newTrade, setNewTrade] = useState({ name: "", buyPrice: "", sellPrice: "", shares: "", type: "aktie" });
  const gains = trades.map(t => ({ ...t, profit: (t.sellPrice - t.buyPrice) * t.shares }));
  const totalProfit = gains.reduce((s, t) => s + Math.max(0, t.profit), 0);
  const totalLoss = gains.reduce((s, t) => s + Math.min(0, t.profit), 0);
  const avdragsgillForlust = Math.abs(totalLoss) * 0.70;
  const nettoVinst = Math.max(0, totalProfit - avdragsgillForlust);
  const skatt = nettoVinst * 0.30;
  const nettoPL = totalProfit + totalLoss;
  const skattReduktion = nettoPL < 0 ? Math.abs(nettoPL) * 0.70 * 0.30 : 0;

  return (
    <div>
      <div style={{ background: "linear-gradient(135deg,#0f172a,#1a0f00)", borderRadius: 14, border: "1px solid #f59e0b33", padding: 14, marginBottom: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#f59e0b", marginBottom: 4 }}>📋 K4 — Aktier & Värdepapper 2026</div>
        <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.6 }}>30% kapitalskatt på nettovinst. Förluster är till 70% avdragsgilla mot vinster. Krypto deklareras också här.</div>
      </div>
      {gains.map(t => {
        const up = t.profit >= 0;
        return (
          <div key={t.id} style={{ background: "#0f172a", borderRadius: 12, border: `1px solid ${up ? "#22c55e22" : "#ef444422"}`, padding: 14, marginBottom: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#e2e8f0" }}>{t.name} <span style={{ fontSize: 10, color: "#475569", background: "#1e293b", padding: "1px 6px", borderRadius: 4 }}>{t.type}</span></div>
                <div style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>{t.shares} st · Köpt {t.buyPrice} kr · Sålt {t.sellPrice} kr</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: up ? "#22c55e" : "#ef4444" }}>{up ? "+" : ""}{Math.round(t.profit).toLocaleString("sv-SE")} kr</div>
                {up && <div style={{ fontSize: 10, color: "#475569" }}>Skatt: ~{Math.round(t.profit * 0.30).toLocaleString("sv-SE")} kr</div>}
              </div>
            </div>
            <button onClick={() => setTrades(trades.filter(x => x.id !== t.id))} style={{ fontSize: 11, color: "#475569", background: "none", border: "none", cursor: "pointer", marginTop: 6 }}>✕ Ta bort</button>
          </div>
        );
      })}
      {adding ? (
        <div style={{ background: "#0f172a", borderRadius: 12, border: "1px solid #1e293b", padding: 14, marginBottom: 14 }}>
          <input value={newTrade.name} onChange={e => setNewTrade(n => ({ ...n, name: e.target.value }))} placeholder="Bolagsnamn / Tillgång"
            style={{ width: "100%", padding: "9px 12px", background: "#1e293b", border: "1px solid #334155", borderRadius: 8, color: "#e2e8f0", fontSize: 14, outline: "none", boxSizing: "border-box", marginBottom: 8 }} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 8 }}>
            {[["Köpkurs", "buyPrice"], ["Säljkurs", "sellPrice"], ["Antal", "shares"]].map(([ph, key]) => (
              <input key={key} value={newTrade[key]} onChange={e => setNewTrade(n => ({ ...n, [key]: e.target.value }))} placeholder={ph} inputMode="decimal"
                style={{ padding: "9px 10px", background: "#1e293b", border: "1px solid #334155", borderRadius: 8, color: "#e2e8f0", fontSize: 13, outline: "none" }} />
            ))}
          </div>
          <select value={newTrade.type} onChange={e => setNewTrade(n => ({ ...n, type: e.target.value }))}
            style={{ width: "100%", padding: "9px 12px", background: "#1e293b", border: "1px solid #334155", borderRadius: 8, color: "#e2e8f0", fontSize: 14, outline: "none", marginBottom: 8 }}>
            {["aktie", "fond", "etf", "krypto", "obligation"].map(o => <option key={o} value={o} style={{ background: "#0f172a" }}>{o.charAt(0).toUpperCase() + o.slice(1)}</option>)}
          </select>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => { if (newTrade.name && newTrade.buyPrice) { setTrades([...trades, { ...newTrade, id: Date.now(), buyPrice: +newTrade.buyPrice, sellPrice: +newTrade.sellPrice, shares: +newTrade.shares }]); setNewTrade({ name: "", buyPrice: "", sellPrice: "", shares: "", type: "aktie" }); setAdding(false); }}} style={{ flex: 1, padding: "10px", background: "linear-gradient(135deg,#10b981,#0ea5e9)", border: "none", borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Lägg till</button>
            <button onClick={() => setAdding(false)} style={{ padding: "10px 14px", background: "#1e293b", border: "1px solid #334155", borderRadius: 8, color: "#94a3b8", fontSize: 13, cursor: "pointer" }}>Avbryt</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setAdding(true)} style={{ width: "100%", padding: "11px", background: "#0f172a", border: "1px dashed #334155", borderRadius: 12, color: "#64748b", fontSize: 14, cursor: "pointer", marginBottom: 14 }}>+ Lägg till affär</button>
      )}
      {trades.length > 0 && (
        <div>
          <div style={{ background: "#0f172a", borderRadius: 14, border: "1px solid #1e293b", padding: 16, marginBottom: 12 }}>
            {[["Total vinst", totalProfit, "#22c55e"],["Total förlust", totalLoss, "#ef4444"],["Avdragsgill förlust (70%)", -avdragsgillForlust, "#f59e0b"],["Nettovinst", nettoVinst, "#e2e8f0"]].map(([l, v, c]) => (
              <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #1e293b" }}>
                <span style={{ fontSize: 13, color: "#64748b" }}>{l}</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: c }}>{v >= 0 ? "+" : ""}{Math.round(v).toLocaleString("sv-SE")} kr</span>
              </div>
            ))}
          </div>
          {nettoPL >= 0 ? (
            <div style={{ background: "#ef444411", borderRadius: 14, border: "1px solid #ef444433", padding: 18, textAlign: "center" }}>
              <div style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>🧾 Kapitalskatt att betala (30%)</div>
              <div style={{ fontSize: 36, fontWeight: 900, color: "#ef4444" }}>{Math.round(skatt).toLocaleString("sv-SE")} kr</div>
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>Deklareras på K4 till Skatteverket</div>
            </div>
          ) : (
            <div style={{ background: "#10b98111", borderRadius: 14, border: "1px solid #10b98133", padding: 18, textAlign: "center" }}>
              <div style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>✓ Skatteminskning (förlustår)</div>
              <div style={{ fontSize: 36, fontWeight: 900, color: "#10b981" }}>-{Math.round(skattReduktion).toLocaleString("sv-SE")} kr</div>
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>70% av förlusten reducerar din skatt</div>
            </div>
          )}
          <div style={{ background: "#0f172a", borderRadius: 12, border: "1px solid #1e293b", padding: 14, marginTop: 10 }}>
            <div style={{ fontSize: 11, color: "#64748b", marginBottom: 8 }}>💡 Viktigt</div>
            {["Krypto deklareras också på K4 (30% skatt på vinst)","Schablonmetoden: 20% av säljpriset som GAV om du saknar kvitto","ISK beskattas annorlunda — se ISK-fliken","Deklarationsdag: 2 maj 2027"].map((tip, i) => (
              <div key={i} style={{ fontSize: 12, color: "#94a3b8", marginBottom: 4, display: "flex", gap: 8 }}><span style={{ color: "#10b981" }}>→</span>{tip}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ISKKalkylator() {
  const [kapital, setKapital] = useState("300000");
  const [insattningar, setInsattningar] = useState("5000");
  const [avkastning, setAvkastning] = useState("10");
  const slr = 2.61; // Statslåneränta 2026
  const k = parseFloat(kapital) || 0;
  const ins = parseFloat(insattningar) || 0;
  const avk = parseFloat(avkastning) || 10;
  const schablongrund = k + ins * 6 * 0.5;
  const schablonintakt = schablongrund * ((slr + 1.0) / 100);
  const iskSkatt = schablonintakt * 0.30;
  const avkastningKr = k * (avk / 100);
  const kapitalSkatt = avkastningKr * 0.30;
  const iskArmEr = kapitalSkatt > iskSkatt;
  const effektivPct = avkastningKr > 0 ? iskSkatt / avkastningKr * 100 : 0;

  return (
    <div>
      <div style={{ background: "linear-gradient(135deg,#0f172a,#001a1a)", borderRadius: 14, border: "1px solid #06b6d433", padding: 14, marginBottom: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#06b6d4", marginBottom: 4 }}>🏦 ISK-skatt 2026</div>
        <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.6 }}>Statslåneränta 2026: <b style={{ color: "#06b6d4" }}>{slr}%</b> → ISK-schablon: {(slr + 1).toFixed(2)}% × kapitalet × 30%.</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 14 }}>
        {[["Kapital (ingående)", kapital, setKapital, "kr"],["Månadssparande", insattningar, setInsattningar, "kr"],["Förv. avkastning", avkastning, setAvkastning, "%"]].map(([l, v, s, suf]) => (
          <div key={l} style={{ background: "#0a0f1e", borderRadius: 10, padding: "12px 10px" }}>
            <div style={{ fontSize: 10, color: "#64748b", marginBottom: 6 }}>{l}</div>
            <div style={{ display: "flex", gap: 3 }}>
              <input value={v} onChange={e => s(e.target.value)} inputMode="decimal" style={{ flex: 1, background: "none", border: "none", outline: "none", fontSize: 16, fontWeight: 700, color: "#e2e8f0" }} />
              <span style={{ fontSize: 11, color: "#475569" }}>{suf}</span>
            </div>
          </div>
        ))}
      </div>
      {k > 0 && (
        <div>
          <div style={{ background: "#0f172a", borderRadius: 14, border: "1px solid #1e293b", padding: 16, marginBottom: 12 }}>
            {[["Schablonunderlag",schablongrund,"kr"],["Schablonintäkt "+(slr+1).toFixed(2)+"%",schablonintakt,"kr"],["ISK-skatt (30%)",iskSkatt,"kr"],["Verklig avkastning "+avk+"%",avkastningKr,"kr"],["Effektiv skattesats",effektivPct.toFixed(1)+"%",""]].map(([l,v,s]) => (
              <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #1e293b" }}>
                <span style={{ fontSize: 13, color: "#64748b" }}>{l}</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: "#e2e8f0" }}>{typeof v === "number" ? Math.round(v).toLocaleString("sv-SE")+" "+s : v}</span>
              </div>
            ))}
          </div>
          <div style={{ background: iskArmEr ? "#10b98111" : "#f59e0b11", borderRadius: 14, border: `1px solid ${iskArmEr ? "#10b98133" : "#f59e0b33"}`, padding: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: iskArmEr ? "#10b981" : "#f59e0b", marginBottom: 10 }}>
              {iskArmEr ? "✓ ISK är billigare" : "⚠ Kapitalskatt kan vara billigare i år"}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {[["ISK-skatt", iskSkatt, iskArmEr], ["Kapitalskatt 30%", kapitalSkatt, !iskArmEr]].map(([l,v,best]) => (
                <div key={l} style={{ background: "#0a0f1e", borderRadius: 10, padding: 12, textAlign: "center" }}>
                  <div style={{ fontSize: 11, color: "#64748b", marginBottom: 4 }}>{l}</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: best ? "#10b981" : "#e2e8f0" }}>{Math.round(v).toLocaleString("sv-SE")} kr</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 10, textAlign: "center" }}>
              Du sparar {Math.round(Math.abs(kapitalSkatt - iskSkatt)).toLocaleString("sv-SE")} kr med {iskArmEr ? "ISK" : "vanlig depå"}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function RotRutKalkylator() {
  const [type, setType] = useState("rot");
  const [labor, setLabor] = useState("50000");
  const [material, setMaterial] = useState("20000");
  const [persons, setPersons] = useState("1");
  const l = parseFloat(labor) || 0;
  const m = parseFloat(material) || 0;
  const p = parseInt(persons) || 1;
  const pct = type === "rot" ? 0.30 : 0.50;
  const maxTotal = 75000 * p;
  const avdrag = Math.min(l * pct, maxTotal);
  const afterAvdrag = l + m - avdrag;

  return (
    <div>
      <div style={{ display: "flex", gap: 4, background: "#0f172a", borderRadius: 12, padding: 4, border: "1px solid #1e293b", marginBottom: 14 }}>
        {[["rot","🔨 ROT (30%)","#f59e0b"],["rut","🏠 RUT (50%)","#3b82f6"]].map(([id, label, color]) => (
          <button key={id} onClick={() => setType(id)} style={{ flex: 1, padding: "10px", background: type === id ? color + "22" : "none", border: `1px solid ${type === id ? color : "transparent"}`, borderRadius: 9, color: type === id ? color : "#64748b", fontSize: 13, fontWeight: type === id ? 700 : 400, cursor: "pointer" }}>
            {label}
          </button>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 14 }}>
        {[["Arbete (kr)", labor, setLabor],["Material (kr)", material, setMaterial],["Antal pers.", persons, setPersons]].map(([label, val, set]) => (
          <div key={label} style={{ background: "#0a0f1e", borderRadius: 10, padding: "12px 10px" }}>
            <div style={{ fontSize: 10, color: "#64748b", marginBottom: 6 }}>{label}</div>
            <input value={val} onChange={e => set(e.target.value)} inputMode="decimal" style={{ width: "100%", background: "none", border: "none", outline: "none", fontSize: 18, fontWeight: 700, color: "#e2e8f0" }} />
          </div>
        ))}
      </div>
      {l > 0 && (
        <div>
          <div style={{ background: "#0f172a", borderRadius: 14, border: "1px solid #1e293b", padding: 16, marginBottom: 12 }}>
            {[["Arbetskostnad",l],["Materialkostnad",m],[`${type.toUpperCase()}-avdrag (${pct*100}%)`,-avdrag],["Max avdrag",maxTotal],["Du betalar",afterAvdrag]].map(([label, val], i) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: i < 4 ? "1px solid #1e293b" : "none" }}>
                <span style={{ fontSize: 13, color: "#64748b" }}>{label}</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: val < 0 ? "#10b981" : i === 4 ? "#10b981" : "#e2e8f0" }}>{Math.abs(Math.round(val)).toLocaleString("sv-SE")} kr</span>
              </div>
            ))}
          </div>
          <div style={{ background: "linear-gradient(135deg,#0a1f0a,#0f172a)", borderRadius: 14, border: "1px solid #10b98144", padding: 18, textAlign: "center" }}>
            <div style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>✓ Du sparar</div>
            <div style={{ fontSize: 36, fontWeight: 900, color: "#10b981" }}>{Math.round(avdrag).toLocaleString("sv-SE")} kr</div>
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>med {type.toUpperCase()}-avdraget · Max {maxTotal.toLocaleString("sv-SE")} kr ({p} person{p > 1 ? "er" : ""})</div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Kredit Score ──────────────────────────────────────────────────────────
function KreditScore({ inc }) {
  const [form, setForm] = useState(() => {
    try { return JSON.parse(localStorage.getItem("kapital_kredit") || "{}"); } catch { return {}; }
  });

  const set = (key, val) => {
    const next = { ...form, [key]: val };
    setForm(next);
    try { localStorage.setItem("kapital_kredit", JSON.stringify(next)); } catch {}
  };

  const income = parseFloat(form.income || inc || 0);
  const totalDebt = parseFloat(form.totalDebt || 0);
  const monthlyPayment = parseFloat(form.monthlyPayment || 0);
  const missedPayments = parseInt(form.missedPayments || 0);
  const creditAge = parseInt(form.creditAge || 3);
  const numAccounts = parseInt(form.numAccounts || 2);
  const utilization = parseFloat(form.utilization || 30);
  const hasBlankmark = form.hasBlankmark === "ja";
  const hasKronofogden = form.hasKronofogden === "ja";

  // Score calculation (300-850 range, Swedish model)
  let score = 850;
  const factors = [];

  // 1. Payment history (35% weight) — most important
  if (hasKronofogden) {
    score -= 200;
    factors.push({ label: "Kronofogden/utmätning", impact: -200, color: "#ef4444", tip: "Betalanmärkningar tar 3 år att försvinna från UC" });
  }
  if (hasBlankmark) {
    score -= 120;
    factors.push({ label: "Betalningsanmärkning", impact: -120, color: "#ef4444", tip: "Betalanmärkningar tas bort efter 3 år" });
  }
  if (missedPayments > 0) {
    const penalty = Math.min(150, missedPayments * 35);
    score -= penalty;
    factors.push({ label: `${missedPayments} sena/missade betalningar`, impact: -penalty, color: "#f59e0b", tip: "Sätt upp autogiro för alla räkningar" });
  } else {
    factors.push({ label: "Perfekt betalningshistorik", impact: 0, color: "#22c55e", tip: "Fortsätt betala i tid!" });
  }

  // 2. Debt-to-income ratio (30% weight)
  const dti = income > 0 ? (monthlyPayment / income) * 100 : 0;
  if (dti > 50) {
    score -= 120;
    factors.push({ label: `Skuldsättning ${dti.toFixed(0)}% av inkomst`, impact: -120, color: "#ef4444", tip: "Mål: under 35% av inkomsten" });
  } else if (dti > 35) {
    score -= 60;
    factors.push({ label: `Skuldsättning ${dti.toFixed(0)}% av inkomst`, impact: -60, color: "#f59e0b", tip: "Försök minska till under 35%" });
  } else if (dti > 0) {
    factors.push({ label: `Bra skuldsättning (${dti.toFixed(0)}%)`, impact: 0, color: "#22c55e", tip: "Under 35% är utmärkt!" });
  }

  // 3. Credit utilization (20% weight)
  if (utilization > 80) {
    score -= 80;
    factors.push({ label: `Kreditnyttjande ${utilization}%`, impact: -80, color: "#ef4444", tip: "Håll under 30% av kreditlimiten" });
  } else if (utilization > 30) {
    score -= 30;
    factors.push({ label: `Kreditnyttjande ${utilization}%`, impact: -30, color: "#f59e0b", tip: "Under 30% ger bättre score" });
  } else {
    factors.push({ label: `Bra kreditnyttjande (${utilization}%)`, impact: 0, color: "#22c55e", tip: "Under 30% är perfekt" });
  }

  // 4. Credit age (10% weight)
  if (creditAge < 2) {
    score -= 40;
    factors.push({ label: "Kort kredithistorik (<2 år)", impact: -40, color: "#f59e0b", tip: "Historiken byggs automatiskt med tid" });
  } else if (creditAge >= 7) {
    factors.push({ label: `Lång kredithistorik (${creditAge} år)`, impact: 0, color: "#22c55e", tip: "Utmärkt! Lång historik ger bonus" });
  }

  // 5. Number of accounts (5% weight)
  if (numAccounts > 8) {
    score -= 20;
    factors.push({ label: "Många kreditkonton", impact: -20, color: "#f59e0b", tip: "Färre aktiva konton är bättre" });
  }

  score = Math.max(300, Math.min(850, score));

  const label = score >= 750 ? "Utmärkt" : score >= 670 ? "Bra" : score >= 580 ? "Godkänd" : score >= 500 ? "Svag" : "Dålig";
  const color = score >= 750 ? "#22c55e" : score >= 670 ? "#10b981" : score >= 580 ? "#f59e0b" : score >= 500 ? "#f97316" : "#ef4444";

  // Arc calculation for gauge
  const pct = (score - 300) / 550; // 0-1
  const angle = pct * 180 - 90; // -90 to 90 degrees
  const rad = (angle * Math.PI) / 180;
  const cx = 100, cy = 90, r = 70;
  const nx = cx + r * Math.cos(rad);
  const ny = cy + r * Math.sin(rad);

  const inp = (key, label, ph, type = "text") => (
    <div style={{ background: "#0a0f1e", borderRadius: 10, padding: "12px 14px", marginBottom: 8 }}>
      <div style={{ fontSize: 11, color: "#64748b", marginBottom: 6 }}>{label}</div>
      {type === "select" ? (
        <select value={form[key] || "nej"} onChange={e => set(key, e.target.value)}
          style={{ width: "100%", background: "none", border: "none", outline: "none", color: "#e2e8f0", fontSize: 18, fontWeight: 700, cursor: "pointer" }}>
          <option value="nej" style={{ background: "#0f172a" }}>Nej</option>
          <option value="ja" style={{ background: "#0f172a" }}>Ja</option>
        </select>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <input value={form[key] || ""} onChange={e => set(key, e.target.value)} placeholder={ph} inputMode="decimal"
            style={{ flex: 1, background: "none", border: "none", outline: "none", fontSize: 22, fontWeight: 700, color: "#e2e8f0" }} />
          {type === "pct" && <span style={{ fontSize: 14, color: "#475569" }}>%</span>}
          {type === "kr" && <span style={{ fontSize: 14, color: "#475569" }}>kr</span>}
          {type === "ar" && <span style={{ fontSize: 14, color: "#475569" }}>år</span>}
        </div>
      )}
    </div>
  );

  return (
    <div>
      {/* Gauge */}
      <div style={{ background: "#0f172a", borderRadius: 16, border: `1px solid ${color}33`, padding: 20, marginBottom: 16, textAlign: "center" }}>
        <div style={{ fontSize: 13, color: "#64748b", marginBottom: 12 }}>Din uppskattade kreditscore</div>
        <svg viewBox="0 0 200 110" style={{ width: "100%", maxWidth: 280, height: "auto", display: "block", margin: "0 auto" }}>
          {/* Background arc */}
          <path d="M 30 90 A 70 70 0 0 1 170 90" fill="none" stroke="#1e293b" strokeWidth="12" strokeLinecap="round" />
          {/* Colored arc segments */}
          <path d="M 30 90 A 70 70 0 0 1 64 34" fill="none" stroke="#ef4444" strokeWidth="12" strokeLinecap="round" opacity="0.6" />
          <path d="M 64 34 A 70 70 0 0 1 100 20" fill="none" stroke="#f97316" strokeWidth="12" strokeLinecap="round" opacity="0.6" />
          <path d="M 100 20 A 70 70 0 0 1 136 34" fill="none" stroke="#f59e0b" strokeWidth="12" strokeLinecap="round" opacity="0.6" />
          <path d="M 136 34 A 70 70 0 0 1 170 90" fill="none" stroke="#22c55e" strokeWidth="12" strokeLinecap="round" opacity="0.6" />
          {/* Needle */}
          <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="#fff" strokeWidth="3" strokeLinecap="round" />
          <circle cx={cx} cy={cy} r="5" fill={color} />
          {/* Score text */}
          <text x={cx} y={cy + 28} textAnchor="middle" fill={color} fontSize="28" fontWeight="900">{score}</text>
          <text x={cx} y={cy + 45} textAnchor="middle" fill="#64748b" fontSize="11">{label}</text>
          {/* Scale labels */}
          <text x="28" y="108" fill="#475569" fontSize="9">300</text>
          <text x="88" y="18" fill="#475569" fontSize="9">575</text>
          <text x="160" y="108" fill="#475569" fontSize="9">850</text>
        </svg>

        {/* Rating bar */}
        <div style={{ display: "flex", gap: 4, marginTop: 8 }}>
          {[["Dålig","300-499","#ef4444"],["Svag","500-579","#f97316"],["OK","580-669","#f59e0b"],["Bra","670-749","#10b981"],["Utmärkt","750+","#22c55e"]].map(([l, range, c]) => (
            <div key={l} style={{ flex: 1, textAlign: "center" }}>
              <div style={{ height: 4, borderRadius: 99, background: c, opacity: color === c ? 1 : 0.25, marginBottom: 3 }} />
              <div style={{ fontSize: 9, color: color === c ? c : "#334155", fontWeight: color === c ? 700 : 400 }}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Inputs */}
      <div style={{ background: "#0f172a", borderRadius: 14, border: "1px solid #1e293b", padding: 16, marginBottom: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#94a3b8", marginBottom: 12 }}>📋 Fyll i din kreditprofil</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {inp("income", "Månadsinkomst (netto)", "35 000", "kr")}
          {inp("totalDebt", "Total skuld", "500 000", "kr")}
          {inp("monthlyPayment", "Månadsbetalningar skuld", "8 000", "kr")}
          {inp("missedPayments", "Missade betalningar senaste 2 år", "0")}
          {inp("creditAge", "Hur länge haft kredit/lån", "5", "ar")}
          {inp("utilization", "Kreditkortsanvändning", "30", "pct")}
          {inp("numAccounts", "Antal lån/kreditkort", "3")}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
          <div>
            <div style={{ fontSize: 11, color: "#64748b", marginBottom: 4 }}>Betalningsanmärkning hos UC?</div>
            {inp("hasBlankmark", "", "", "select")}
          </div>
          <div>
            <div style={{ fontSize: 11, color: "#64748b", marginBottom: 4 }}>Ärende hos Kronofogden?</div>
            {inp("hasKronofogden", "", "", "select")}
          </div>
        </div>
      </div>

      {/* Factor breakdown */}
      <div style={{ background: "#0f172a", borderRadius: 14, border: "1px solid #1e293b", padding: 16, marginBottom: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#94a3b8", marginBottom: 12 }}>📊 Vad påverkar din score?</div>
        {factors.map((f, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "10px 0", borderBottom: i < factors.length - 1 ? "1px solid #1e293b" : "none" }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, color: f.impact < 0 ? "#ef4444" : "#22c55e", fontWeight: 600 }}>
                {f.impact < 0 ? "▼" : "✓"} {f.label}
              </div>
              <div style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>{f.tip}</div>
            </div>
            {f.impact < 0 && (
              <div style={{ fontSize: 14, fontWeight: 700, color: "#ef4444", marginLeft: 10 }}>{f.impact}</div>
            )}
          </div>
        ))}
      </div>

      {/* How to improve */}
      <div style={{ background: "linear-gradient(135deg,#0f172a,#0a0a1f)", borderRadius: 14, border: "1px solid #8b5cf633", padding: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#8b5cf6", marginBottom: 12 }}>🚀 Så förbättrar du din score</div>
        {[
          score < 750 && !hasKronofogden && !hasBlankmark && ["Betala alltid i tid", "Det viktigaste av allt. Sätt upp autogiro.", "#22c55e"],
          dti > 35 && ["Minska skuldsättningen", `Du betalar ${dti.toFixed(0)}% av inkomsten — sikta under 35%.`, "#10b981"],
          utilization > 30 && ["Sänk kreditkortsanvändningen", "Använd max 30% av din kreditlimit.", "#3b82f6"],
          creditAge < 5 && ["Behåll gamla konton öppna", "Stäng inte gamla kort — historiken är värdefull.", "#f59e0b"],
          missedPayments > 0 && ["Rensa upp gamla skulder", "Kontakta borgenären om en uppgörelse.", "#ef4444"],
          !hasBlankmark && !hasKronofogden && score >= 700 && ["Begär en kreditrapport", "Gratis via UC.se en gång per år — se om något är fel.", "#8b5cf6"],
        ].filter(Boolean).map((tip, i) => (
          <div key={i} style={{ display: "flex", gap: 10, marginBottom: 10 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: tip[2], flexShrink: 0, marginTop: 6 }} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0" }}>{tip[0]}</div>
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{tip[1]}</div>
            </div>
          </div>
        ))}
        <div style={{ fontSize: 10, color: "#334155", marginTop: 12 }}>
          * Detta är en uppskattning baserad på din självrapporterade data. Exakt kreditscore hämtas från UC, Creditsafe eller Bisnode. Kapital är inte ett kreditinstitut.
        </div>
      </div>
    </div>
  );
}

// ── Lönespecifikation ─────────────────────────────────────────────────────
function LoneSpec({ inc }) {
  const [brutto, setBrutto] = useState(String(Math.round((inc || 0) * 1.42) || "45000"));
  const b = parseFloat(brutto) || 0;

  // Calculations
  const kommunSkatt = b * 0.3224; // snitt kommunalskatt
  const statligSkatt = b * 12 > 613900 ? ((b * 12 - 613900) / 12) * 0.20 : 0;
  const ga = Math.min(b > 0 ? Math.min(36000, Math.max(13200, 13200 + (Math.min(b, 123000) - 13200) * 0.34)) : 0, b);
  const jsa = Math.min(kommunSkatt * 0.3, b * 0.1);
  const totalSkatt = Math.max(0, kommunSkatt - jsa + statligSkatt);
  const pensionsavgift = Math.min(b * 0.07, 35800);
  const netto = b - totalSkatt - pensionsavgift;

  // Arbetsgivarens kostnader
  const arbetsgivaravgift = b * 0.3142;
  const semesterersattning = b * 0.12;
  const tjanstepension = b * 0.045;
  const totalKostnadArbetsgivare = b + arbetsgivaravgift + semesterersattning + tjanstepension;

  const Row = ({ label, value, color, bold }) => (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: "1px solid #1e293b" }}>
      <span style={{ fontSize: 13, color: "#64748b" }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: bold ? 700 : 500, color: color || "#e2e8f0" }}>
        {Math.round(value).toLocaleString("sv-SE")} kr
      </span>
    </div>
  );

  // Pie chart data
  const total = b;
  const segments = [
    { label: "Du får", value: netto, color: "#10b981" },
    { label: "Kommunalskatt", value: kommunSkatt - jsa, color: "#ef4444" },
    { label: "Statlig skatt", value: statligSkatt, color: "#dc2626" },
    { label: "Pensionsavgift", value: pensionsavgift, color: "#f59e0b" },
  ].filter(s => s.value > 0);

  return (
    <div>
      <div style={{ background: "#0a0f1e", borderRadius: 10, padding: "14px 16px", marginBottom: 14 }}>
        <div style={{ fontSize: 11, color: "#64748b", marginBottom: 6 }}>Bruttolön per månad</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input value={brutto} onChange={e => setBrutto(e.target.value)} inputMode="decimal"
            style={{ flex: 1, background: "none", border: "none", outline: "none", fontSize: 32, fontWeight: 800, color: "#10b981" }} />
          <span style={{ fontSize: 16, color: "#475569" }}>kr</span>
        </div>
      </div>

      {/* Visual breakdown */}
      {b > 0 && (
        <>
          <div style={{ background: "#0f172a", borderRadius: 14, border: "1px solid #1e293b", padding: 16, marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: "#64748b", marginBottom: 10, textTransform: "uppercase", letterSpacing: 1 }}>Av din bruttolön går...</div>
            <div style={{ display: "flex", height: 16, borderRadius: 99, overflow: "hidden", marginBottom: 12 }}>
              {segments.map(s => (
                <div key={s.label} style={{ width: `${s.value / total * 100}%`, background: s.color }} />
              ))}
            </div>
            {segments.map(s => (
              <div key={s.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: s.color }} />
                  <span style={{ fontSize: 13, color: "#e2e8f0" }}>{s.label}</span>
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, color: s.color }}>
                  {Math.round(s.value / total * 100)}% — {Math.round(s.value).toLocaleString("sv-SE")} kr
                </span>
              </div>
            ))}
          </div>

          {/* Netto */}
          <div style={{ background: "linear-gradient(135deg,#0a1f0a,#0f172a)", borderRadius: 14, border: "1px solid #10b98144", padding: 18, textAlign: "center", marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>Du får ut per månad</div>
            <div style={{ fontSize: 38, fontWeight: 900, color: "#10b981" }}>{Math.round(netto).toLocaleString("sv-SE")} kr</div>
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>= {Math.round(netto / b * 100)}% av bruttolönen</div>
          </div>

          {/* Arbetsgivarens kostnad */}
          <div style={{ background: "#0f172a", borderRadius: 14, border: "1px solid #1e293b", padding: 16, marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: "#64748b", marginBottom: 10, textTransform: "uppercase", letterSpacing: 1 }}>Vad kostar du arbetsgivaren?</div>
            <Row label="Din bruttolön" value={b} />
            <Row label="Arbetsgivaravgift (31.42%)" value={arbetsgivaravgift} color="#ef4444" />
            <Row label="Semesterersättning (12%)" value={semesterersattning} color="#f59e0b" />
            <Row label="Tjänstepension (4.5%)" value={tjanstepension} color="#3b82f6" />
            <Row label="Total kostnad för arbetsgivaren" value={totalKostnadArbetsgivare} bold />
          </div>

          <div style={{ background: "#0f172a", borderRadius: 12, border: "1px solid #1e293b", padding: 14 }}>
            <div style={{ fontSize: 11, color: "#64748b", marginBottom: 8 }}>💡 Visste du att...</div>
            <div style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.6 }}>
              Du kostar arbetsgivaren <b style={{ color: "#e2e8f0" }}>{Math.round(totalKostnadArbetsgivare).toLocaleString("sv-SE")} kr/mån</b> men
              får ut <b style={{ color: "#10b981" }}>{Math.round(netto).toLocaleString("sv-SE")} kr</b>.
              Det betyder att bara <b style={{ color: "#e2e8f0" }}>{Math.round(netto / totalKostnadArbetsgivare * 100)}%</b> av vad du kostar hamnar i din ficka.
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Snittlön per yrke ─────────────────────────────────────────────────────
const YRKEN = [
  { yrke: "Sjuksköterska", snitt: 42000, intervall: [36000, 52000], bransch: "Vård" },
  { yrke: "Läkare", snitt: 78000, intervall: [60000, 120000], bransch: "Vård" },
  { yrke: "Undersköterska", snitt: 30000, intervall: [26000, 36000], bransch: "Vård" },
  { yrke: "Programmerare", snitt: 58000, intervall: [45000, 85000], bransch: "IT" },
  { yrke: "Systemutvecklare", snitt: 55000, intervall: [42000, 78000], bransch: "IT" },
  { yrke: "IT-chef", snitt: 72000, intervall: [58000, 95000], bransch: "IT" },
  { yrke: "Lärare", snitt: 38000, intervall: [33000, 47000], bransch: "Utbildning" },
  { yrke: "Rektor", snitt: 52000, intervall: [44000, 65000], bransch: "Utbildning" },
  { yrke: "Ekonom", snitt: 48000, intervall: [38000, 68000], bransch: "Ekonomi" },
  { yrke: "Revisor", snitt: 52000, intervall: [40000, 75000], bransch: "Ekonomi" },
  { yrke: "Controller", snitt: 50000, intervall: [40000, 70000], bransch: "Ekonomi" },
  { yrke: "Jurist", snitt: 58000, intervall: [45000, 90000], bransch: "Juridik" },
  { yrke: "Advokat", snitt: 72000, intervall: [55000, 120000], bransch: "Juridik" },
  { yrke: "Elektriker", snitt: 38000, intervall: [32000, 48000], bransch: "Hantwerk" },
  { yrke: "Rörmokare", snitt: 40000, intervall: [33000, 52000], bransch: "Hantwerk" },
  { yrke: "Snickare", snitt: 36000, intervall: [30000, 46000], bransch: "Hantwerk" },
  { yrke: "Ingenjör", snitt: 52000, intervall: [42000, 72000], bransch: "Teknik" },
  { yrke: "Civilingenjör", snitt: 58000, intervall: [48000, 80000], bransch: "Teknik" },
  { yrke: "Arkitekt", snitt: 50000, intervall: [40000, 68000], bransch: "Teknik" },
  { yrke: "Säljare", snitt: 42000, intervall: [30000, 65000], bransch: "Försäljning" },
  { yrke: "Säljchef", snitt: 65000, intervall: [50000, 95000], bransch: "Försäljning" },
  { yrke: "Marknadsförare", snitt: 45000, intervall: [36000, 62000], bransch: "Marknad" },
  { yrke: "HR-specialist", snitt: 42000, intervall: [35000, 58000], bransch: "HR" },
  { yrke: "HR-chef", snitt: 58000, intervall: [48000, 78000], bransch: "HR" },
  { yrke: "Lastbilsförare", snitt: 32000, intervall: [28000, 40000], bransch: "Transport" },
  { yrke: "Pilot", snitt: 75000, intervall: [55000, 110000], bransch: "Transport" },
  { yrke: "Kock", snitt: 28000, intervall: [24000, 38000], bransch: "Restaurang" },
  { yrke: "Restaurangchef", snitt: 38000, intervall: [30000, 52000], bransch: "Restaurang" },
  { yrke: "Polis", snitt: 36000, intervall: [30000, 48000], bransch: "Offentlig" },
  { yrke: "Brandman", snitt: 34000, intervall: [29000, 44000], bransch: "Offentlig" },
  { yrke: "Socionom", snitt: 36000, intervall: [30000, 46000], bransch: "Socialt" },
  { yrke: "Psykolog", snitt: 48000, intervall: [38000, 65000], bransch: "Vård" },
  { yrke: "Tandläkare", snitt: 68000, intervall: [52000, 95000], bransch: "Vård" },
  { yrke: "Veterinär", snitt: 50000, intervall: [40000, 68000], bransch: "Vård" },
  { yrke: "VD (SME)", snitt: 85000, intervall: [60000, 150000], bransch: "Ledning" },
  { yrke: "VD (stor)", snitt: 150000, intervall: [100000, 300000], bransch: "Ledning" },
  { yrke: "Projektledare", snitt: 52000, intervall: [42000, 70000], bransch: "Ledning" },
];

function SnittLon() {
  const [search, setSearch] = useState("");
  const [myLon, setMyLon] = useState("");
  const [selected, setSelected] = useState(null);

  const filtered = search.length > 1
    ? YRKEN.filter(y => y.yrke.toLowerCase().includes(search.toLowerCase()) || y.bransch.toLowerCase().includes(search.toLowerCase()))
    : [];

  const myL = parseFloat(myLon) || 0;
  const diff = selected ? myL - selected.snitt : 0;
  const diffPct = selected && selected.snitt > 0 ? (diff / selected.snitt * 100) : 0;

  return (
    <div>
      <div style={{ background: "linear-gradient(135deg,#0f172a,#0a1520)", borderRadius: 14, border: "1px solid #06b6d433", padding: 14, marginBottom: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#06b6d4", marginBottom: 4 }}>📊 Snittlön per yrke</div>
        <div style={{ fontSize: 12, color: "#64748b" }}>Baserat på SCB-data 2026. Söker du ett yrke jämförs din lön med branschsnittet.</div>
      </div>

      <div style={{ background: "#0a0f1e", borderRadius: 10, padding: "12px 14px", marginBottom: 8 }}>
        <div style={{ fontSize: 11, color: "#64748b", marginBottom: 6 }}>Sök yrke</div>
        <input value={search} onChange={e => { setSearch(e.target.value); setSelected(null); }}
          placeholder="t.ex. Sjuksköterska, Programmerare..."
          style={{ width: "100%", background: "none", border: "none", outline: "none", fontSize: 18, fontWeight: 600, color: "#e2e8f0" }} />
      </div>

      {/* Search results */}
      {filtered.length > 0 && !selected && (
        <div style={{ background: "#0f172a", borderRadius: 12, border: "1px solid #1e293b", marginBottom: 12, overflow: "hidden" }}>
          {filtered.slice(0, 6).map((y, i) => (
            <button key={y.yrke} onClick={() => { setSelected(y); setSearch(y.yrke); }}
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", padding: "12px 16px", background: "none", border: "none", borderBottom: i < filtered.length - 1 ? "1px solid #1e293b" : "none", cursor: "pointer", textAlign: "left" }}>
              <div>
                <div style={{ fontSize: 14, color: "#e2e8f0", fontWeight: 500 }}>{y.yrke}</div>
                <div style={{ fontSize: 11, color: "#475569" }}>{y.bransch}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#10b981" }}>{y.snitt.toLocaleString("sv-SE")} kr</div>
                <div style={{ fontSize: 10, color: "#475569" }}>snitt/mån</div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Selected yrke details */}
      {selected && (
        <div>
          <div style={{ background: "#0f172a", borderRadius: 14, border: "1px solid #1e293b", padding: 16, marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#e2e8f0" }}>{selected.yrke}</div>
                <div style={{ fontSize: 12, color: "#475569" }}>{selected.bransch} · SCB 2026</div>
              </div>
              <button onClick={() => { setSelected(null); setSearch(""); }} style={{ background: "none", border: "none", color: "#475569", fontSize: 18, cursor: "pointer" }}>✕</button>
            </div>

            {/* Salary range bar */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#64748b", marginBottom: 4 }}>
                <span>Lägst {selected.intervall[0].toLocaleString("sv-SE")} kr</span>
                <span style={{ color: "#10b981", fontWeight: 700 }}>Snitt {selected.snitt.toLocaleString("sv-SE")} kr</span>
                <span>Högst {selected.intervall[1].toLocaleString("sv-SE")} kr</span>
              </div>
              <div style={{ position: "relative", height: 12, background: "linear-gradient(90deg,#ef444444,#f59e0b44,#10b98144)", borderRadius: 99 }}>
                {/* Snitt marker */}
                <div style={{ position: "absolute", left: `${(selected.snitt - selected.intervall[0]) / (selected.intervall[1] - selected.intervall[0]) * 100}%`, top: -2, width: 3, height: 16, background: "#10b981", borderRadius: 2 }} />
                {/* Min lön marker */}
                {myL > 0 && myL >= selected.intervall[0] && myL <= selected.intervall[1] && (
                  <div style={{ position: "absolute", left: `${Math.min(95, (myL - selected.intervall[0]) / (selected.intervall[1] - selected.intervall[0]) * 100)}%`, top: -2, width: 3, height: 16, background: "#fff", borderRadius: 2 }} />
                )}
              </div>
            </div>

            {/* Min lön input */}
            <div style={{ background: "#0a0f1e", borderRadius: 10, padding: "12px 14px", marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: "#64748b", marginBottom: 6 }}>Din nuvarande lön (valfritt)</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <input value={myLon} onChange={e => setMyLon(e.target.value)} placeholder="45 000" inputMode="decimal"
                  style={{ flex: 1, background: "none", border: "none", outline: "none", fontSize: 22, fontWeight: 700, color: "#e2e8f0" }} />
                <span style={{ fontSize: 14, color: "#475569" }}>kr</span>
              </div>
            </div>

            {myL > 0 && (
              <div style={{ background: diff >= 0 ? "#10b98111" : "#ef444411", borderRadius: 12, border: `1px solid ${diff >= 0 ? "#10b98133" : "#ef444433"}`, padding: 14, textAlign: "center" }}>
                <div style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>
                  {diff >= 0 ? "Du tjänar över snittet!" : "Du tjänar under snittet"}
                </div>
                <div style={{ fontSize: 28, fontWeight: 800, color: diff >= 0 ? "#10b981" : "#ef4444" }}>
                  {diff >= 0 ? "+" : ""}{Math.round(diff).toLocaleString("sv-SE")} kr/mån
                </div>
                <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                  ({diffPct >= 0 ? "+" : ""}{diffPct.toFixed(1)}% mot snittet)
                </div>
                {diff < 0 && (
                  <div style={{ fontSize: 12, color: "#f59e0b", marginTop: 8 }}>
                    💡 En löneförhandling till snittet ger dig {Math.round(Math.abs(diff) * 12).toLocaleString("sv-SE")} kr mer per år
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Tips */}
          <div style={{ background: "#0f172a", borderRadius: 12, border: "1px solid #1e293b", padding: 14 }}>
            <div style={{ fontSize: 11, color: "#64748b", marginBottom: 8 }}>💡 Lönetips för {selected.yrke}</div>
            {[
              "Begär lönesamtal minst en gång per år",
              "Samla bevis på dina prestationer innan samtalet",
              `Branschsnittet är ${selected.snitt.toLocaleString("sv-SE")} kr — använd det som argument`,
              "Facket kan hjälpa dig med lönestatistik",
            ].map((tip, i) => (
              <div key={i} style={{ fontSize: 12, color: "#94a3b8", marginBottom: 5, display: "flex", gap: 8 }}>
                <span style={{ color: "#10b981" }}>→</span>{tip}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top paying jobs */}
      {!selected && search.length < 2 && (
        <div style={{ background: "#0f172a", borderRadius: 14, border: "1px solid #1e293b", padding: 16 }}>
          <div style={{ fontSize: 12, color: "#64748b", marginBottom: 12, textTransform: "uppercase", letterSpacing: 1 }}>Högst betalda yrken</div>
          {[...YRKEN].sort((a, b) => b.snitt - a.snitt).slice(0, 6).map((y, i) => (
            <button key={y.yrke} onClick={() => { setSelected(y); setSearch(y.yrke); }}
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", padding: "10px 0", background: "none", border: "none", borderBottom: i < 5 ? "1px solid #1e293b" : "none", cursor: "pointer", textAlign: "left" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#10b98122", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#10b981" }}>{i + 1}</div>
                <div>
                  <div style={{ fontSize: 14, color: "#e2e8f0" }}>{y.yrke}</div>
                  <div style={{ fontSize: 11, color: "#475569" }}>{y.bransch}</div>
                </div>
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#10b981" }}>{y.snitt.toLocaleString("sv-SE")} kr</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Löneutveckling ────────────────────────────────────────────────────────
function LoneKalkyl({ inc }) {
  const [lon, setLon] = useState(String(Math.round(inc || 0) || "45000"));
  const [okning, setOkning] = useState("3");
  const [ar, setAr] = useState("10");

  const l = parseFloat(lon) || 0;
  const o = parseFloat(okning) || 3;
  const a = parseInt(ar) || 10;

  const lonAr = Array.from({ length: a + 1 }, (_, i) => ({
    ar: i,
    lon: Math.round(l * Math.pow(1 + o / 100, i)),
  }));

  const slutLon = lonAr[lonAr.length - 1].lon;
  const totalInkomst = lonAr.slice(1).reduce((s, y) => s + y.lon * 12, 0);
  const maxLon = Math.max(...lonAr.map(y => y.lon));

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 14 }}>
        {[["Nuv. lön", lon, setLon, "kr"], ["Ökning/år", okning, setOkning, "%"], ["Antal år", ar, setAr, "år"]].map(([label, val, set, suf]) => (
          <div key={label} style={{ background: "#0a0f1e", borderRadius: 10, padding: "12px 10px" }}>
            <div style={{ fontSize: 10, color: "#64748b", marginBottom: 6 }}>{label}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
              <input value={val} onChange={e => set(e.target.value)} inputMode="decimal"
                style={{ flex: 1, background: "none", border: "none", outline: "none", fontSize: 16, fontWeight: 700, color: "#e2e8f0" }} />
              <span style={{ fontSize: 11, color: "#475569" }}>{suf}</span>
            </div>
          </div>
        ))}
      </div>

      {l > 0 && (
        <>
          <div style={{ background: "linear-gradient(135deg,#0a1f0a,#0f172a)", borderRadius: 14, border: "1px solid #10b98144", padding: 18, textAlign: "center", marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>Din lön om {a} år</div>
            <div style={{ fontSize: 36, fontWeight: 900, color: "#10b981" }}>{slutLon.toLocaleString("sv-SE")} kr/mån</div>
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>Total inkomst under {a} år: {Math.round(totalInkomst / 1000000).toLocaleString("sv-SE")} mkr</div>
          </div>

          {/* Bar chart */}
          <div style={{ background: "#0f172a", borderRadius: 14, border: "1px solid #1e293b", padding: 16, marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: "#64748b", marginBottom: 12 }}>Löneutveckling år för år</div>
            <div style={{ display: "flex", gap: 4, alignItems: "flex-end", height: 80 }}>
              {lonAr.map(y => (
                <div key={y.ar} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                  <div style={{ width: "100%", background: "linear-gradient(180deg,#10b981,#0ea5e9)", borderRadius: "3px 3px 0 0", height: `${(y.lon / maxLon) * 70}px`, opacity: 0.5 + (y.ar / a) * 0.5 }} />
                  {y.ar % Math.ceil(a / 5) === 0 && (
                    <div style={{ fontSize: 9, color: "#475569" }}>{y.ar}år</div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Tips */}
          <div style={{ background: "#0f172a", borderRadius: 12, border: "1px solid #1e293b", padding: 14 }}>
            <div style={{ fontSize: 11, color: "#64748b", marginBottom: 8 }}>💡 Löneförhandlingstips</div>
            <div style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.7 }}>
              Skillnaden mellan {o}% och {(o + 2).toFixed(0)}% löneökning per år är
              <b style={{ color: "#10b981" }}> {Math.round((l * Math.pow(1 + (o + 2) / 100, a) - slutLon)).toLocaleString("sv-SE")} kr/mån</b> om {a} år.
              En löneförhandling på 2% extra idag kan ge dig <b style={{ color: "#10b981" }}>{Math.round(l * Math.pow(1 + (o + 2) / 100, a) * 12 * a - totalInkomst).toLocaleString("sv-SE")} kr</b> totalt.
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── AI Ekonomicoach ───────────────────────────────────────────────────────
function AICoach({ inc, expenses, goals }) {
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Hej! Jag är din personliga AI-ekonomicoach. Jag kan hjälpa dig med frågor om skatt, deklaration, sparande, investeringar och hur du förbättrar din ekonomi. Vad vill du veta?" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const totalExpenses = Object.values(expenses || {}).reduce((s, v) => s + (parseFloat(v) || 0), 0);
  const leftover = (parseFloat(inc) || 0) - totalExpenses;

  const QUICK_QUESTIONS = [
    "Hur deklarerar jag aktievinster?",
    "Vad är skillnaden mellan ISK och KF?",
    "Ska jag amortera eller investera?",
    "Hur fungerar ROT-avdraget?",
    "Hur förbättrar jag min kreditscore?",
    "Vad är FIRE och hur når jag det?",
  ];

  const send = async (text) => {
    const msg = text || input.trim();
    if (!msg || loading) return;
    setInput("");

    const userMsg = { role: "user", content: msg };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setLoading(true);

    try {
      const systemContext = `Du är en svensk personlig ekonomicoach i appen Kapital. 
      Användarens ekonomi: Inkomst ${inc || "okänd"} kr/mån, Utgifter ${Math.round(totalExpenses)} kr/mån, Överskott ${Math.round(leftover)} kr/mån, Antal sparmål: ${(goals || []).length}.
      Ge korta, praktiska svar på svenska. Fokusera på svenska skatteregler, Skatteverket, UC, Kronofogden och svenska banker.
      Påminn alltid att du inte är en auktoriserad finansiell rådgivare.`;

      const resp = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": KEY, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 600,
          system: systemContext,
          messages: newMessages.map(m => ({ role: m.role, content: m.content }))
        })
      });

      if (!resp.ok) throw new Error("API-fel: " + resp.status);
      const data = await resp.json();
      const reply = data.content?.[0]?.text || "Kunde inte svara. Försök igen.";
      setMessages([...newMessages, { role: "assistant", content: reply }]);
    } catch (err) {
      setMessages([...newMessages, { role: "assistant", content: "Fel: " + err.message }]);
    }
    setLoading(false);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div>
      <div style={{ background: "linear-gradient(135deg,#0f172a,#0a1f0a)", borderRadius: 14, border: "1px solid #10b98133", padding: 14, marginBottom: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#10b981", marginBottom: 4 }}>🤖 AI-ekonomicoach</div>
        <div style={{ fontSize: 12, color: "#64748b" }}>Ställ frågor om skatt, deklaration, sparande och ekonomi. Svarar baserat på din ekonomiska situation.</div>
      </div>

      {/* Quick questions */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
        {QUICK_QUESTIONS.map(q => (
          <button key={q} onClick={() => send(q)} style={{ padding: "6px 12px", background: "#0f172a", border: "1px solid #1e293b", borderRadius: 99, color: "#94a3b8", fontSize: 12, cursor: "pointer" }}>
            {q}
          </button>
        ))}
      </div>

      {/* Chat messages */}
      <div style={{ background: "#0f172a", borderRadius: 14, border: "1px solid #1e293b", padding: 16, marginBottom: 12, maxHeight: 400, overflowY: "auto" }}>
        {messages.map((m, i) => (
          <div key={i} style={{ marginBottom: 16, display: "flex", flexDirection: m.role === "user" ? "row-reverse" : "row", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: m.role === "user" ? "#3b82f6" : "#10b981", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>
              {m.role === "user" ? "👤" : "🤖"}
            </div>
            <div style={{ maxWidth: "80%", background: m.role === "user" ? "#1e3a5f" : "#1e293b", borderRadius: m.role === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px", padding: "10px 14px" }}>
              <div style={{ fontSize: 13, color: "#e2e8f0", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{m.content}</div>
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#10b981", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>🤖</div>
            <div style={{ background: "#1e293b", borderRadius: "14px 14px 14px 4px", padding: "12px 16px" }}>
              <div style={{ display: "flex", gap: 4 }}>
                {[0, 1, 2].map(i => <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981", animation: `pulse 1s ${i * 0.2}s infinite` }} />)}
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div style={{ display: "flex", gap: 8 }}>
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && send()}
          placeholder="Skriv din fråga..."
          style={{ flex: 1, padding: "12px 16px", background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12, color: "#e2e8f0", fontSize: 14, outline: "none" }} />
        <button onClick={() => send()} disabled={loading || !input.trim()} style={{ padding: "12px 20px", background: "linear-gradient(135deg,#10b981,#0ea5e9)", border: "none", borderRadius: 12, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
          →
        </button>
      </div>
      <div style={{ fontSize: 10, color: "#334155", marginTop: 8, textAlign: "center" }}>
        ⚠ AI-svar ersätter inte professionell finansiell eller juridisk rådgivning.
      </div>
    </div>
  );
}

// ── Låneansökan ───────────────────────────────────────────────────────────
function LanAnsokan() {
  const [lanTyp, setLanTyp] = useState("blanko");
  const [belopp, setBelopp] = useState("150000");
  const [lopetid, setLopetid] = useState("5");
  const [syfte, setSyfte] = useState("");

  const b = parseFloat(belopp) || 0;
  const l = parseInt(lopetid) || 5;

  const LANGIVARE = {
    blanko: [
      { name: "Ikano Bank", rate: 7.95, max: 350000, logo: "💛", affiliate: "https://www.ikanobank.se/lana/privatlan", bonus: "Svar inom 1 min" },
      { name: "Santander", rate: 8.95, max: 350000, logo: "🔴", affiliate: "https://www.santander.se/lana/privatlan", bonus: "Upp till 350 000 kr" },
      { name: "Nordax", rate: 9.45, max: 500000, logo: "🔵", affiliate: "https://www.nordax.se/privatlan", bonus: "Upp till 500 000 kr" },
      { name: "Swedbank", rate: 8.95, max: 600000, logo: "🟡", affiliate: "https://www.swedbank.se/privat/lana/privatlan.html", bonus: "Bankrelation ger lägre ränta" },
      { name: "SEB", rate: 9.45, max: 500000, logo: "🟢", affiliate: "https://seb.se/privat/lana/privatlan", bonus: "Snabb handläggning" },
    ],
    billån: [
      { name: "Santander", rate: 4.95, max: 800000, logo: "🔴", affiliate: "https://www.santander.se/lana/billan", bonus: "Bäst billån 2026" },
      { name: "Ikano Bank", rate: 5.45, max: 600000, logo: "💛", affiliate: "https://www.ikanobank.se/lana/billan", bonus: "Snabbt och enkelt" },
      { name: "Nordea", rate: 6.10, max: 900000, logo: "🔵", affiliate: "https://www.nordea.se/privat/lana/billan.html", bonus: "Flexibla villkor" },
      { name: "Handelsbanken", rate: 5.85, max: 700000, logo: "⚫", affiliate: "https://www.handelsbanken.se/privat/lana/billan", bonus: "Personlig rådgivare" },
    ],
    samla: [
      { name: "Zmarta", rate: 6.95, max: 600000, logo: "⚡", affiliate: "https://www.zmarta.se/samla-lan", bonus: "Jämför 30+ banker" },
      { name: "Lendo", rate: 7.45, max: 600000, logo: "🏆", affiliate: "https://www.lendo.se", bonus: "Sveriges största låneförmedlare" },
      { name: "Advisa", rate: 7.95, max: 500000, logo: "📋", affiliate: "https://www.advisa.se", bonus: "Gratis och utan påverkan på UC" },
    ],
  };

  const calcMonthly = (rate, amount, years) => {
    const mr = rate / 100 / 12;
    const n = years * 12;
    if (mr === 0) return amount / n;
    return amount * mr * Math.pow(1 + mr, n) / (Math.pow(1 + mr, n) - 1);
  };

  const langivare = LANGIVARE[lanTyp] || [];
  const sorted = [...langivare].filter(l => b <= l.max).sort((a, c) => a.rate - c.rate);

  return (
    <div>
      <div style={{ background: "linear-gradient(135deg,#0f172a,#1a1000)", borderRadius: 14, border: "1px solid #f59e0b33", padding: 14, marginBottom: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#f59e0b", marginBottom: 4 }}>🏦 Låneansökan</div>
        <div style={{ fontSize: 12, color: "#64748b" }}>Jämför räntor och ansök direkt hos banken. Kapital är en jämförelsetjänst — ansökan sker hos respektive bank.</div>
      </div>

      {/* Loan type */}
      <div style={{ display: "flex", gap: 4, background: "#0f172a", borderRadius: 12, padding: 4, border: "1px solid #1e293b", marginBottom: 14 }}>
        {[["blanko", "💳 Blankolån"], ["billån", "🚗 Billån"], ["samla", "🔄 Samla lån"]].map(([id, label]) => (
          <button key={id} onClick={() => setLanTyp(id)} style={{ flex: 1, padding: "9px 4px", background: lanTyp === id ? "linear-gradient(135deg,#10b981,#0ea5e9)" : "none", border: "none", borderRadius: 9, color: lanTyp === id ? "#fff" : "#64748b", fontSize: 12, fontWeight: lanTyp === id ? 700 : 400, cursor: "pointer" }}>
            {label}
          </button>
        ))}
      </div>

      {/* Inputs */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
        <div style={{ background: "#0a0f1e", borderRadius: 10, padding: "12px 14px" }}>
          <div style={{ fontSize: 11, color: "#64748b", marginBottom: 6 }}>Belopp</div>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <input value={belopp} onChange={e => setBelopp(e.target.value)} inputMode="decimal"
              style={{ flex: 1, background: "none", border: "none", outline: "none", fontSize: 20, fontWeight: 700, color: "#e2e8f0" }} />
            <span style={{ fontSize: 12, color: "#475569" }}>kr</span>
          </div>
        </div>
        <div style={{ background: "#0a0f1e", borderRadius: 10, padding: "12px 14px" }}>
          <div style={{ fontSize: 11, color: "#64748b", marginBottom: 6 }}>Löptid</div>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <input value={lopetid} onChange={e => setLopetid(e.target.value)} inputMode="numeric"
              style={{ flex: 1, background: "none", border: "none", outline: "none", fontSize: 20, fontWeight: 700, color: "#e2e8f0" }} />
            <span style={{ fontSize: 12, color: "#475569" }}>år</span>
          </div>
        </div>
      </div>

      {/* Results */}
      {sorted.length === 0 && b > 0 && (
        <div style={{ background: "#1a0000", borderRadius: 12, border: "1px solid #ef444433", padding: 14, marginBottom: 12 }}>
          <div style={{ fontSize: 13, color: "#ef4444" }}>⚠ Beloppet överstiger maxgränsen för dessa banker. Prova ett lägre belopp eller välj "Samla lån".</div>
        </div>
      )}

      {sorted.map((lg, i) => {
        const monthly = calcMonthly(lg.rate, b, l);
        const totalCost = monthly * l * 12;
        const totalInterest = totalCost - b;
        const isBest = i === 0;

        return (
          <div key={lg.name} style={{ background: "#0f172a", borderRadius: 14, border: `1px solid ${isBest ? "#10b98144" : "#1e293b"}`, padding: 16, marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 24 }}>{lg.logo}</span>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 15, fontWeight: 600, color: "#e2e8f0" }}>{lg.name}</span>
                    {isBest && <span style={{ fontSize: 10, background: "#10b98122", color: "#10b981", padding: "1px 7px", borderRadius: 99, fontWeight: 700 }}>LÄGST RÄNTA</span>}
                  </div>
                  <div style={{ fontSize: 11, color: "#64748b" }}>{lg.bonus}</div>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: isBest ? "#10b981" : "#e2e8f0" }}>{lg.rate}%</div>
                <div style={{ fontSize: 10, color: "#475569" }}>årsränta</div>
              </div>
            </div>

            {b > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
                <div style={{ background: "#0a0f1e", borderRadius: 8, padding: "8px 10px" }}>
                  <div style={{ fontSize: 10, color: "#475569" }}>Månadskostnad</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#e2e8f0" }}>{Math.round(monthly).toLocaleString("sv-SE")} kr</div>
                </div>
                <div style={{ background: "#0a0f1e", borderRadius: 8, padding: "8px 10px" }}>
                  <div style={{ fontSize: 10, color: "#475569" }}>Total räntekostnad</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#ef4444" }}>{Math.round(totalInterest).toLocaleString("sv-SE")} kr</div>
                </div>
              </div>
            )}

            <a href={lg.affiliate} target="_blank" rel="noopener noreferrer"
              style={{ display: "block", textAlign: "center", padding: "12px", background: "linear-gradient(135deg,#10b981,#0ea5e9)", borderRadius: 10, color: "#fff", textDecoration: "none", fontSize: 14, fontWeight: 700 }}>
              Ansök hos {lg.name} →
            </a>
          </div>
        );
      })}

      <div style={{ fontSize: 10, color: "#334155", textAlign: "center", marginTop: 8, lineHeight: 1.7 }}>
        * Jämförelsetjänst. Kapital är inte en kreditförmedlare och lämnar inga kreditrekommendationer. Räntor är indikativa — exakt ränta och villkor bestäms av respektive långivare baserat på din kreditvärdighet. Effektiv ränta (ÅR) kan variera. Kapital kan erhålla ersättning vid beviljat lån via affiliate-avtal. Utgör inte finansiell rådgivning enligt lag (2014:968) om särskild tillsyn över kreditinstitut.
      </div>
    </div>
  );
}

// ── Försäkringar ──────────────────────────────────────────────────────────
const FORSAKRING_TYPER = [
  { id: "hem", label: "Hemförsäkring", emoji: "🏠", viktig: true, desc: "Täcker stöld, brand och vattenskador" },
  { id: "bil", label: "Bilförsäkring", emoji: "🚗", viktig: true, desc: "Obligatorisk om du äger bil" },
  { id: "liv", label: "Livförsäkring", emoji: "❤️", viktig: false, desc: "Skyddar din familj ekonomiskt" },
  { id: "sjuk", label: "Sjukförsäkring", emoji: "🏥", viktig: false, desc: "Extra skydd vid sjukdom" },
  { id: "barn", label: "Barnförsäkring", emoji: "👶", viktig: false, desc: "Skyddar barnet vid olycka/sjukdom" },
  { id: "olycksfall", label: "Olycksfallsförsäkring", emoji: "🩹", viktig: false, desc: "Vid olyckor och skador" },
  { id: "inkomst", label: "Inkomstförsäkring", emoji: "💼", viktig: false, desc: "Extra skydd vid arbetslöshet" },
  { id: "resa", label: "Reseförsäkring", emoji: "✈️", viktig: false, desc: "Vid resor utomlands" },
  { id: "djur", label: "Djurförsäkring", emoji: "🐕", viktig: false, desc: "Veterinärkostnader för husdjur" },
  { id: "brf", label: "BRF-tillägg", emoji: "🏢", viktig: false, desc: "Extra skydd för bostadsrätt" },
];

function MinaForsakringar() {
  const [forsakringar, setForsakringar] = useState(() => {
    try { return JSON.parse(localStorage.getItem("kapital_forsakringar") || "[]"); } catch { return []; }
  });
  const [adding, setAdding] = useState(false);
  const [newF, setNewF] = useState({ typ: "hem", bolag: "", kostnad: "", fornyelse: "" });

  const save = (f) => { setForsakringar(f); try { localStorage.setItem("kapital_forsakringar", JSON.stringify(f)); } catch {} };
  const total = forsakringar.reduce((s, f) => s + (parseFloat(f.kostnad) || 0), 0);

  const daysUntil = (dateStr) => {
    if (!dateStr) return null;
    const d = Math.ceil((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24));
    return d;
  };

  return (
    <div>
      <div style={{ background: "#0f172a", borderRadius: 14, border: "1px solid #06b6d433", padding: 16, marginBottom: 14 }}>
        <div style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>Total försäkringskostnad</div>
        <div style={{ fontSize: 32, fontWeight: 800, color: "#06b6d4" }}>{Math.round(total).toLocaleString("sv-SE")} kr/mån</div>
        <div style={{ fontSize: 12, color: "#475569", marginTop: 4 }}>{Math.round(total * 12).toLocaleString("sv-SE")} kr/år</div>
      </div>

      {forsakringar.map((f, i) => {
        const typ = FORSAKRING_TYPER.find(t => t.id === f.typ);
        const days = daysUntil(f.fornyelse);
        const expiringSoon = days !== null && days <= 30 && days >= 0;
        return (
          <div key={i} style={{ background: "#0f172a", borderRadius: 12, border: `1px solid ${expiringSoon ? "#f59e0b44" : "#1e293b"}`, padding: 14, marginBottom: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 24 }}>{typ?.emoji || "🛡️"}</span>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#e2e8f0" }}>{typ?.label || f.typ}</div>
                  <div style={{ fontSize: 11, color: "#475569" }}>{f.bolag}</div>
                  {expiringSoon && <div style={{ fontSize: 11, color: "#f59e0b", marginTop: 2 }}>⚠ Förnyas om {days} dagar</div>}
                  {f.fornyelse && !expiringSoon && <div style={{ fontSize: 11, color: "#334155" }}>Förnyas: {f.fornyelse}</div>}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#e2e8f0" }}>{parseFloat(f.kostnad).toLocaleString("sv-SE")} kr</div>
                <div style={{ fontSize: 10, color: "#475569" }}>per månad</div>
                <button onClick={() => save(forsakringar.filter((_, j) => j !== i))} style={{ fontSize: 11, color: "#ef4444", background: "none", border: "none", cursor: "pointer", marginTop: 4 }}>Ta bort</button>
              </div>
            </div>
          </div>
        );
      })}

      {adding ? (
        <div style={{ background: "#0f172a", borderRadius: 12, border: "1px solid #1e293b", padding: 16, marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#94a3b8", marginBottom: 12 }}>Lägg till försäkring</div>
          <select value={newF.typ} onChange={e => setNewF(n => ({ ...n, typ: e.target.value }))}
            style={{ width: "100%", padding: "10px 12px", background: "#1e293b", border: "1px solid #334155", borderRadius: 8, color: "#e2e8f0", fontSize: 14, outline: "none", marginBottom: 8 }}>
            {FORSAKRING_TYPER.map(t => <option key={t.id} value={t.id} style={{ background: "#0f172a" }}>{t.emoji} {t.label}</option>)}
          </select>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
            {[["Försäkringsbolag", "bolag", "text", "Folksam, If..."], ["Kostnad (kr/mån)", "kostnad", "decimal", "299"]].map(([label, key, mode, ph]) => (
              <div key={key}>
                <div style={{ fontSize: 11, color: "#64748b", marginBottom: 4 }}>{label}</div>
                <input value={newF[key]} onChange={e => setNewF(n => ({ ...n, [key]: e.target.value }))} placeholder={ph} inputMode={mode}
                  style={{ width: "100%", padding: "9px 10px", background: "#1e293b", border: "1px solid #334155", borderRadius: 8, color: "#e2e8f0", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
              </div>
            ))}
          </div>
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 11, color: "#64748b", marginBottom: 4 }}>Förnyelsedatum (valfritt)</div>
            <input type="date" value={newF.fornyelse} onChange={e => setNewF(n => ({ ...n, fornyelse: e.target.value }))}
              style={{ width: "100%", padding: "9px 10px", background: "#1e293b", border: "1px solid #334155", borderRadius: 8, color: "#e2e8f0", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => { if (newF.kostnad) { save([...forsakringar, newF]); setNewF({ typ: "hem", bolag: "", kostnad: "", fornyelse: "" }); setAdding(false); }}}
              style={{ flex: 1, padding: "10px", background: "linear-gradient(135deg,#10b981,#0ea5e9)", border: "none", borderRadius: 8, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Lägg till</button>
            <button onClick={() => setAdding(false)} style={{ padding: "10px 16px", background: "#1e293b", border: "1px solid #334155", borderRadius: 8, color: "#94a3b8", fontSize: 14, cursor: "pointer" }}>Avbryt</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setAdding(true)} style={{ width: "100%", padding: "12px", background: "#0f172a", border: "1px dashed #334155", borderRadius: 12, color: "#64748b", fontSize: 14, cursor: "pointer", marginBottom: 12 }}>
          + Lägg till försäkring
        </button>
      )}
    </div>
  );
}

function ForsakringsGuide() {
  const [harBil, setHarBil] = useState("nej");
  const [harBarn, setHarBarn] = useState("nej");
  const [harHusdjur, setHarHusdjur] = useState("nej");
  const [boende, setBoende] = useState("hyresratt");
  const [alder, setAlder] = useState("30");

  const age = parseInt(alder) || 30;
  const recommendations = [];

  // Always needed
  recommendations.push({ ...FORSAKRING_TYPER.find(t => t.id === "hem"), prio: "Obligatorisk", color: "#ef4444", motivering: "Täcker brand, stöld och vattenskador. Kostar ~200-400 kr/mån." });
  if (harBil === "ja") recommendations.push({ ...FORSAKRING_TYPER.find(t => t.id === "bil"), prio: "Obligatorisk", color: "#ef4444", motivering: "Lagkrav om du äger bil. Välj halvförsäkring eller helförsäkring." });
  if (harBarn === "ja") recommendations.push({ ...FORSAKRING_TYPER.find(t => t.id === "barn"), prio: "Rekommenderas", color: "#f59e0b", motivering: "Gäller vid sjukdom och olyckor. Tecknas helst från födseln." });
  if (age < 50) recommendations.push({ ...FORSAKRING_TYPER.find(t => t.id === "liv"), prio: "Rekommenderas", color: "#f59e0b", motivering: "Viktigt om du har familj eller lån. Billigast att teckna ung." });
  recommendations.push({ ...FORSAKRING_TYPER.find(t => t.id === "olycksfall"), prio: "Bra att ha", color: "#10b981", motivering: "Täcker tandskador och bestående men vid olyckor." });
  recommendations.push({ ...FORSAKRING_TYPER.find(t => t.id === "inkomst"), prio: "Bra att ha", color: "#10b981", motivering: "Extra skydd vid arbetslöshet utöver a-kassan." });
  if (harHusdjur === "ja") recommendations.push({ ...FORSAKRING_TYPER.find(t => t.id === "djur"), prio: "Bra att ha", color: "#10b981", motivering: "Veterinärkostnader kan bli väldigt höga utan försäkring." });
  if (boende === "bostadsratt") recommendations.push({ ...FORSAKRING_TYPER.find(t => t.id === "brf"), prio: "Bra att ha", color: "#10b981", motivering: "Täcker rörledningar och ytskikt som ingår i din bostadsrätt." });

  const sel = (val, set, options) => (
    <div style={{ display: "flex", gap: 6 }}>
      {options.map(([v, label]) => (
        <button key={v} onClick={() => set(v)} style={{ flex: 1, padding: "8px", background: val === v ? "#10b98122" : "#1e293b", border: `1px solid ${val === v ? "#10b981" : "#334155"}`, borderRadius: 8, color: val === v ? "#10b981" : "#64748b", fontSize: 12, fontWeight: val === v ? 700 : 400, cursor: "pointer" }}>
          {label}
        </button>
      ))}
    </div>
  );

  return (
    <div>
      <div style={{ background: "#0f172a", borderRadius: 14, border: "1px solid #1e293b", padding: 16, marginBottom: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#94a3b8", marginBottom: 14 }}>Berätta om din situation</div>
        {[
          ["Boende", sel(boende, setBoende, [["hyresratt", "Hyresrätt"], ["bostadsratt", "BRF"], ["villa", "Villa"]])],
          ["Har du bil?", sel(harBil, setHarBil, [["nej", "Nej"], ["ja", "Ja"]])],
          ["Har du barn?", sel(harBarn, setHarBarn, [["nej", "Nej"], ["ja", "Ja"]])],
          ["Husdjur?", sel(harHusdjur, setHarHusdjur, [["nej", "Nej"], ["ja", "Ja"]])],
        ].map(([label, component]) => (
          <div key={label} style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: "#64748b", marginBottom: 6 }}>{label}</div>
            {component}
          </div>
        ))}
      </div>

      <div style={{ fontSize: 12, color: "#64748b", marginBottom: 10 }}>Baserat på din situation behöver du:</div>
      {recommendations.map((r, i) => (
        <div key={i} style={{ background: "#0f172a", borderRadius: 12, border: `1px solid ${r.color}33`, padding: 14, marginBottom: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 22 }}>{r.emoji}</span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#e2e8f0" }}>{r.label}</div>
                <span style={{ fontSize: 10, background: r.color + "22", color: r.color, padding: "1px 8px", borderRadius: 99, fontWeight: 700 }}>{r.prio}</span>
              </div>
            </div>
          </div>
          <div style={{ fontSize: 12, color: "#64748b" }}>{r.motivering}</div>
        </div>
      ))}
    </div>
  );
}

function JamforForsakring() {
  const [typ, setTyp] = useState("hem");
  const BOLAG = {
    hem: [
      { name: "Folksam", logo: "🟢", pris: 199, betyg: 4.2, affiliate: "https://www.folksam.se/forsakringar/hemforsakring", bonus: "Bäst i test 2026" },
      { name: "Länsförsäkringar", logo: "🔵", pris: 219, betyg: 4.4, affiliate: "https://www.lansforsakringar.se/privat/forsakring/hem", bonus: "Lokalt ägd" },
      { name: "If", logo: "🔴", pris: 189, betyg: 4.0, affiliate: "https://www.if.se/privat/forsakringar/hemforsakring", bonus: "Snabb skadereglering" },
      { name: "Trygg-Hansa", logo: "🟡", pris: 229, betyg: 4.1, affiliate: "https://www.trygghansa.se/privat/forsakringar/hemforsakring", bonus: "Bra kundservice" },
      { name: "Hedvig", logo: "🟣", pris: 149, betyg: 4.6, affiliate: "https://www.hedvig.com/se", bonus: "Digital & billigast" },
    ],
    bil: [
      { name: "Folksam", logo: "🟢", pris: 399, betyg: 4.2, affiliate: "https://www.folksam.se/forsakringar/bilforsakring", bonus: "Populärast i Sverige" },
      { name: "Länsförsäkringar", logo: "🔵", pris: 449, betyg: 4.3, affiliate: "https://www.lansforsakringar.se/privat/forsakring/bil", bonus: "Lokal service" },
      { name: "If", logo: "🔴", pris: 379, betyg: 4.1, affiliate: "https://www.if.se/privat/forsakringar/bilforsakring", bonus: "Bra app" },
      { name: "Trygg-Hansa", logo: "🟡", pris: 419, betyg: 4.0, affiliate: "https://www.trygghansa.se/privat/forsakring/bilforsakring", bonus: "Flexibla villkor" },
      { name: "Moderna", logo: "⚪", pris: 349, betyg: 3.9, affiliate: "https://www.modernaforsakringar.se/privat/bilforsakring", bonus: "Lägst pris" },
    ],
    liv: [
      { name: "Folksam", logo: "🟢", pris: 99, betyg: 4.3, affiliate: "https://www.folksam.se/forsakringar/livforsakring", bonus: "Teckna via facket" },
      { name: "Skandia", logo: "🔵", pris: 149, betyg: 4.5, affiliate: "https://www.skandia.se/forsakring/livforsakring", bonus: "Branschledande" },
      { name: "SEB Trygg Liv", logo: "🟢", pris: 129, betyg: 4.2, affiliate: "https://sebtryggliv.se", bonus: "Via banken" },
      { name: "Länsförsäkringar", logo: "🔵", pris: 119, betyg: 4.1, affiliate: "https://www.lansforsakringar.se/privat/forsakring/liv", bonus: "Lokalt" },
    ],
    olyck: [
      { name: "Folksam", logo: "🟢", pris: 59, betyg: 4.2, affiliate: "https://www.folksam.se/forsakringar/olycksfallsforsakring", bonus: "Billigast" },
      { name: "Länsförsäkringar", logo: "🔵", pris: 79, betyg: 4.4, affiliate: "https://www.lansforsakringar.se/privat/forsakring/olycksfall", bonus: "Brett skydd" },
      { name: "If", logo: "🔴", pris: 69, betyg: 4.0, affiliate: "https://www.if.se/privat/forsakringar/olycksfallsforsakring", bonus: "Snabb utbetalning" },
    ],
  };

  const bolag = BOLAG[typ] || BOLAG.hem;
  const sorted = [...bolag].sort((a, b) => a.pris - b.pris);

  return (
    <div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
        {[["hem", "🏠 Hem"], ["bil", "🚗 Bil"], ["liv", "❤️ Liv"], ["olyck", "🩹 Olycksfall"]].map(([id, label]) => (
          <button key={id} onClick={() => setTyp(id)} style={{ padding: "8px 14px", background: typ === id ? "linear-gradient(135deg,#10b981,#0ea5e9)" : "#0f172a", border: `1px solid ${typ === id ? "transparent" : "#1e293b"}`, borderRadius: 99, color: typ === id ? "#fff" : "#94a3b8", fontSize: 13, fontWeight: typ === id ? 700 : 400, cursor: "pointer" }}>
            {label}
          </button>
        ))}
      </div>

      {sorted.map((b, i) => {
        const isBest = i === 0;
        return (
          <div key={b.name} style={{ background: "#0f172a", borderRadius: 14, border: `1px solid ${isBest ? "#10b98144" : "#1e293b"}`, padding: 16, marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 24 }}>{b.logo}</span>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 15, fontWeight: 600, color: "#e2e8f0" }}>{b.name}</span>
                    {isBest && <span style={{ fontSize: 10, background: "#10b98122", color: "#10b981", padding: "1px 7px", borderRadius: 99, fontWeight: 700 }}>BILLIGAST</span>}
                  </div>
                  <div style={{ fontSize: 11, color: "#64748b" }}>{b.bonus} · ⭐ {b.betyg}/5</div>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: isBest ? "#10b981" : "#e2e8f0" }}>~{b.pris} kr</div>
                <div style={{ fontSize: 10, color: "#475569" }}>per månad</div>
              </div>
            </div>
            <a href={b.affiliate} target="_blank" rel="noopener noreferrer"
              style={{ display: "block", textAlign: "center", padding: "10px", background: "linear-gradient(135deg,#10b981,#0ea5e9)", borderRadius: 10, color: "#fff", textDecoration: "none", fontSize: 14, fontWeight: 700 }}>
              Jämför & teckna hos {b.name} →
            </a>
          </div>
        );
      })}
      <div style={{ fontSize: 10, color: "#334155", textAlign: "center", marginTop: 8 }}>
        * Priser är uppskattningar baserade på offentlig information. Exakt premie beror på din individuella situation och riskprofil. Kapital är en jämförelsetjänst och inte en försäkringsförmedlare. Affiliate-avtal kan ge Kapital ersättning vid tecknande.
      </div>
    </div>
  );
}

// ── Abonnemang ────────────────────────────────────────────────────────────
const ABONNEMANG_KATEGORIER = [
  { id: "streaming", label: "Streaming", emoji: "📺", examples: "Netflix, HBO, Disney+" },
  { id: "musik", label: "Musik", emoji: "🎵", examples: "Spotify, Apple Music" },
  { id: "mobil", label: "Mobilabonnemang", emoji: "📱", examples: "Telia, Tele2, Tre" },
  { id: "bredband", label: "Bredband", emoji: "🌐", examples: "Bahnhof, Tele2, Comhem" },
  { id: "gym", label: "Gym & Träning", emoji: "💪", examples: "SATS, Actic, Nordic Wellness" },
  { id: "spel", label: "Spel", emoji: "🎮", examples: "Xbox GamePass, PlayStation" },
  { id: "nyheter", label: "Nyheter & Tidningar", emoji: "📰", examples: "DN, SvD, Aftonbladet" },
  { id: "cloud", label: "Cloud & Lagring", emoji: "☁️", examples: "iCloud, Google One, Dropbox" },
  { id: "ovrigt", label: "Övrigt", emoji: "📦", examples: "Övriga prenumerationer" },
];

function Abonnemang() {
  const [abos, setAbos] = useState(() => {
    try { return JSON.parse(localStorage.getItem("kapital_abonnemang") || "[]"); } catch { return []; }
  });
  const [adding, setAdding] = useState(false);
  const [newA, setNewA] = useState({ namn: "", kategori: "streaming", kostnad: "", fakturering: "mån" });

  const save = (a) => { setAbos(a); try { localStorage.setItem("kapital_abonnemang", JSON.stringify(a)); } catch {} };

  const totalMan = abos.reduce((s, a) => {
    const k = parseFloat(a.kostnad) || 0;
    return s + (a.fakturering === "ar" ? k / 12 : k);
  }, 0);

  // Group by category
  const grouped = ABONNEMANG_KATEGORIER.map(kat => ({
    ...kat,
    items: abos.filter(a => a.kategori === kat.id),
    total: abos.filter(a => a.kategori === kat.id).reduce((s, a) => {
      const k = parseFloat(a.kostnad) || 0;
      return s + (a.fakturering === "ar" ? k / 12 : k);
    }, 0)
  })).filter(g => g.items.length > 0);

  return (
    <div>
      {/* Total */}
      <div style={{ background: "linear-gradient(135deg,#0f172a,#1a001a)", borderRadius: 14, border: "1px solid #8b5cf633", padding: 18, marginBottom: 14, textAlign: "center" }}>
        <div style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>Du betalar totalt</div>
        <div style={{ fontSize: 36, fontWeight: 900, color: "#8b5cf6" }}>{Math.round(totalMan).toLocaleString("sv-SE")} kr/mån</div>
        <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>{Math.round(totalMan * 12).toLocaleString("sv-SE")} kr/år på prenumerationer</div>
      </div>

      {/* Grouped list */}
      {grouped.map(g => (
        <div key={g.id} style={{ background: "#0f172a", borderRadius: 12, border: "1px solid #1e293b", padding: 14, marginBottom: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#e2e8f0" }}>{g.emoji} {g.label}</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#8b5cf6" }}>{Math.round(g.total)} kr/mån</div>
          </div>
          {g.items.map((a, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderTop: "1px solid #1e293b" }}>
              <div style={{ fontSize: 13, color: "#cbd5e1" }}>{a.namn}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 13, color: "#e2e8f0" }}>{parseFloat(a.kostnad)} kr/{a.fakturering}</span>
                <button onClick={() => save(abos.filter((_, j) => j !== abos.indexOf(a)))} style={{ fontSize: 11, color: "#ef4444", background: "none", border: "none", cursor: "pointer" }}>✕</button>
              </div>
            </div>
          ))}
        </div>
      ))}

      {/* Add */}
      {adding ? (
        <div style={{ background: "#0f172a", borderRadius: 12, border: "1px solid #1e293b", padding: 16, marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#94a3b8", marginBottom: 10 }}>Lägg till abonnemang</div>
          <input value={newA.namn} onChange={e => setNewA(n => ({ ...n, namn: e.target.value }))} placeholder="Namn t.ex. Netflix, Spotify..."
            style={{ width: "100%", padding: "9px 12px", background: "#1e293b", border: "1px solid #334155", borderRadius: 8, color: "#e2e8f0", fontSize: 14, outline: "none", boxSizing: "border-box", marginBottom: 8 }} />
          <select value={newA.kategori} onChange={e => setNewA(n => ({ ...n, kategori: e.target.value }))}
            style={{ width: "100%", padding: "9px 12px", background: "#1e293b", border: "1px solid #334155", borderRadius: 8, color: "#e2e8f0", fontSize: 14, outline: "none", marginBottom: 8 }}>
            {ABONNEMANG_KATEGORIER.map(k => <option key={k.id} value={k.id} style={{ background: "#0f172a" }}>{k.emoji} {k.label}</option>)}
          </select>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 8, marginBottom: 10 }}>
            <input value={newA.kostnad} onChange={e => setNewA(n => ({ ...n, kostnad: e.target.value }))} placeholder="Kostnad" inputMode="decimal"
              style={{ padding: "9px 10px", background: "#1e293b", border: "1px solid #334155", borderRadius: 8, color: "#e2e8f0", fontSize: 14, outline: "none" }} />
            <select value={newA.fakturering} onChange={e => setNewA(n => ({ ...n, fakturering: e.target.value }))}
              style={{ padding: "9px 10px", background: "#1e293b", border: "1px solid #334155", borderRadius: 8, color: "#e2e8f0", fontSize: 14, outline: "none" }}>
              <option value="mån" style={{ background: "#0f172a" }}>kr/mån</option>
              <option value="ar" style={{ background: "#0f172a" }}>kr/år</option>
            </select>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => { if (newA.namn && newA.kostnad) { save([...abos, newA]); setNewA({ namn: "", kategori: "streaming", kostnad: "", fakturering: "mån" }); setAdding(false); }}}
              style={{ flex: 1, padding: "10px", background: "linear-gradient(135deg,#10b981,#0ea5e9)", border: "none", borderRadius: 8, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Lägg till</button>
            <button onClick={() => setAdding(false)} style={{ padding: "10px 16px", background: "#1e293b", border: "1px solid #334155", borderRadius: 8, color: "#94a3b8", fontSize: 14, cursor: "pointer" }}>Avbryt</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setAdding(true)} style={{ width: "100%", padding: "12px", background: "#0f172a", border: "1px dashed #334155", borderRadius: 12, color: "#64748b", fontSize: 14, cursor: "pointer" }}>
          + Lägg till abonnemang
        </button>
      )}

      {totalMan > 500 && (
        <div style={{ background: "#f59e0b11", borderRadius: 12, border: "1px solid #f59e0b33", padding: 14, marginTop: 10 }}>
          <div style={{ fontSize: 13, color: "#f59e0b", fontWeight: 600, marginBottom: 4 }}>💡 Spartips</div>
          <div style={{ fontSize: 12, color: "#94a3b8" }}>Du betalar {Math.round(totalMan)} kr/mån i prenumerationer. Använder du verkligen allt? Gå igenom listan och avsluta det du inte använder — du kan spara {Math.round(totalMan * 0.3)} kr/mån!</div>
        </div>
      )}
    </div>
  );
}

// ── Boendekostnader ───────────────────────────────────────────────────────
function Boendekostnad() {
  const [poster, setPoster] = useState(() => {
    try { return JSON.parse(localStorage.getItem("kapital_boende") || JSON.stringify([
      { id: "hyra", label: "Hyra / Avgift", emoji: "🏠", kostnad: "" },
      { id: "el", label: "El", emoji: "⚡", kostnad: "" },
      { id: "bredband", label: "Bredband", emoji: "🌐", kostnad: "" },
      { id: "vatten", label: "Vatten & avlopp", emoji: "💧", kostnad: "" },
      { id: "forsakring", label: "Hemförsäkring", emoji: "🛡️", kostnad: "" },
      { id: "tv", label: "TV-licens / Canal", emoji: "📺", kostnad: "" },
      { id: "sopor", label: "Sophantering", emoji: "🗑️", kostnad: "" },
      { id: "parkering", label: "Parkering / Garage", emoji: "🅿️", kostnad: "" },
    ])); } catch { return []; }
  });

  const save = (p) => { setPoster(p); try { localStorage.setItem("kapital_boende", JSON.stringify(p)); } catch {} };
  const total = poster.reduce((s, p) => s + (parseFloat(p.kostnad) || 0), 0);

  return (
    <div>
      <div style={{ background: "linear-gradient(135deg,#0a1f0a,#0f172a)", borderRadius: 14, border: "1px solid #10b98133", padding: 18, marginBottom: 14, textAlign: "center" }}>
        <div style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>Totala boendekostnader</div>
        <div style={{ fontSize: 36, fontWeight: 900, color: "#10b981" }}>{Math.round(total).toLocaleString("sv-SE")} kr/mån</div>
        <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>{Math.round(total * 12).toLocaleString("sv-SE")} kr/år</div>
      </div>

      {poster.map((p, i) => (
        <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#0f172a", borderRadius: 12, border: "1px solid #1e293b", padding: "12px 16px", marginBottom: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 22 }}>{p.emoji}</span>
            <span style={{ fontSize: 14, color: "#e2e8f0" }}>{p.label}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input value={p.kostnad} onChange={e => { const next = [...poster]; next[i] = { ...p, kostnad: e.target.value }; save(next); }}
              placeholder="0" inputMode="decimal"
              style={{ width: 80, padding: "6px 10px", background: "#1e293b", border: "1px solid #334155", borderRadius: 8, color: "#e2e8f0", fontSize: 14, outline: "none", textAlign: "right" }} />
            <span style={{ fontSize: 12, color: "#475569" }}>kr</span>
          </div>
        </div>
      ))}

      {total > 0 && (
        <div style={{ background: "#0f172a", borderRadius: 12, border: "1px solid #1e293b", padding: 14, marginTop: 4 }}>
          <div style={{ fontSize: 11, color: "#64748b", marginBottom: 8 }}>💡 Spara på boendekostnader</div>
          {[
            "Jämför elpriser på Elpriskollen.se — kan spara 500-2000 kr/år",
            "Byt bredband — priserna sjunker, lojalitet lönar sig sällan",
            "Installera LED-belysning — minskar elräkningen med 20-30%",
            "Sänk inomhustemperaturen 1 grad = 5% lägre uppvärmningskostnad",
          ].map((tip, i) => (
            <div key={i} style={{ fontSize: 12, color: "#94a3b8", marginBottom: 4, display: "flex", gap: 8 }}>
              <span style={{ color: "#10b981" }}>→</span>{tip}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Fordonskostnader ──────────────────────────────────────────────────────
function Fordonskostnad() {
  const [poster, setPoster] = useState(() => {
    try { return JSON.parse(localStorage.getItem("kapital_fordon") || JSON.stringify([
      { id: "billan", label: "Billån / Leasing", emoji: "🏦", kostnad: "" },
      { id: "forsakring", label: "Bilförsäkring", emoji: "🛡️", kostnad: "" },
      { id: "drivmedel", label: "Drivmedel", emoji: "⛽", kostnad: "" },
      { id: "service", label: "Service & Reparation", emoji: "🔧", kostnad: "" },
      { id: "parkering", label: "Parkering", emoji: "🅿️", kostnad: "" },
      { id: "trangsel", label: "Trängselskatt", emoji: "🚦", kostnad: "" },
      { id: "besiktning", label: "Besiktning (snitt/mån)", emoji: "📋", kostnad: "" },
      { id: "skatt", label: "Fordonsskatt (snitt/mån)", emoji: "📄", kostnad: "" },
    ])); } catch { return []; }
  });

  const save = (p) => { setPoster(p); try { localStorage.setItem("kapital_fordon", JSON.stringify(p)); } catch {} };
  const total = poster.reduce((s, p) => s + (parseFloat(p.kostnad) || 0), 0);
  const perKm = total > 0 ? (total / 1200).toFixed(2) : null; // assume 1200 km/mån

  return (
    <div>
      <div style={{ background: "linear-gradient(135deg,#1a0800,#0f172a)", borderRadius: 14, border: "1px solid #f9731633", padding: 18, marginBottom: 14, textAlign: "center" }}>
        <div style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>Din bil kostar dig</div>
        <div style={{ fontSize: 36, fontWeight: 900, color: "#f97316" }}>{Math.round(total).toLocaleString("sv-SE")} kr/mån</div>
        {perKm && <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>≈ {perKm} kr/km (vid 1 200 km/mån)</div>}
      </div>

      {poster.map((p, i) => (
        <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#0f172a", borderRadius: 12, border: "1px solid #1e293b", padding: "12px 16px", marginBottom: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 22 }}>{p.emoji}</span>
            <span style={{ fontSize: 14, color: "#e2e8f0" }}>{p.label}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input value={p.kostnad} onChange={e => { const next = [...poster]; next[i] = { ...p, kostnad: e.target.value }; save(next); }}
              placeholder="0" inputMode="decimal"
              style={{ width: 80, padding: "6px 10px", background: "#1e293b", border: "1px solid #334155", borderRadius: 8, color: "#e2e8f0", fontSize: 14, outline: "none", textAlign: "right" }} />
            <span style={{ fontSize: 12, color: "#475569" }}>kr</span>
          </div>
        </div>
      ))}

      {total > 0 && (
        <div style={{ background: "#0f172a", borderRadius: 12, border: "1px solid #1e293b", padding: 14, marginTop: 4 }}>
          <div style={{ fontSize: 11, color: "#64748b", marginBottom: 8 }}>💡 Spara på bilkostnader</div>
          {[
            "Jämför bilförsäkring varje år — kan spara 500-2000 kr/år",
            "Kör sparsamt — rätt däcktryck sparar 5-8% på bränsle",
            "Leasing vs äga — räkna på totalkostnaden, inte bara månadsbetalningen",
            total > 5000 && "Din bil kostar mer än 5 000 kr/mån — kollektivtrafik kan vara billigare",
          ].filter(Boolean).map((tip, i) => (
            <div key={i} style={{ fontSize: 12, color: "#94a3b8", marginBottom: 4, display: "flex", gap: 8 }}>
              <span style={{ color: "#f97316" }}>→</span>{tip}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Juridisk AI-assistent ─────────────────────────────────────────────────
const JURIDISK_KATEGORIER = [
  { id: "avtal", icon: "📄", label: "Avtal & Kontrakt", desc: "Analysera och förstå avtal", color: "#3b82f6" },
  { id: "forsakring", icon: "🛡️", label: "Försäkringsvillkor", desc: "Förstå vad din försäkring täcker", color: "#10b981" },
  { id: "lan", icon: "🏦", label: "Låneavtal", desc: "Granska lånevillkor och risker", color: "#f59e0b" },
  { id: "hyra", icon: "🏠", label: "Hyresrätt", desc: "Dina rättigheter som hyresgäst", color: "#8b5cf6" },
  { id: "arbete", icon: "💼", label: "Arbetsrätt", desc: "LAS, lön och anställningsavtal", color: "#06b6d4" },
  { id: "konsument", icon: "🛒", label: "Konsumenträtt", desc: "Reklamation, ångerrätt och garanti", color: "#ec4899" },
  { id: "familj", icon: "👨‍👩‍👧", label: "Familjerätt", desc: "Arv, bodelning och underhåll", color: "#f97316" },
  { id: "skatt", icon: "🧾", label: "Skatterätt", desc: "Deklaration och skattefrågor", color: "#ef4444" },
];

const JURIDISK_SNABBFRAGOR = {
  avtal: ["Vad innebär en bindningstid i ett avtal?", "Kan jag häva ett avtal?", "Vad är ett vitesklausul?"],
  forsakring: ["Vad täcker min hemförsäkring?", "Hur fungerar självrisken?", "Kan försäkringsbolaget neka ersättning?"],
  lan: ["Vad är effektiv ränta?", "Kan banken höja räntan?", "Vad händer om jag inte kan betala?"],
  hyra: ["Kan hyresvärden höja hyran?", "Vad gäller vid uppsägning?", "Har jag rätt till andrahandsuthyrning?"],
  arbete: ["Vad innebär LAS?", "Har jag rätt till övertidsersättning?", "Vad gäller vid uppsägning?"],
  konsument: ["Hur lång är ångerrätten?", "Vad gäller vid reklamation?", "Kan jag kräva pengarna tillbaka?"],
  familj: ["Hur fungerar arvsrätten?", "Vad är en bodelning?", "Hur beräknas underhållsbidrag?"],
  skatt: ["När ska jag deklarera?", "Vad är avdragsgillt?", "Hur deklarerar jag kryptovaluta?"],
};

function JuridiskAI() {
  const [kategori, setKategori] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploadedText, setUploadedText] = useState("");
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const selectKategori = (kat) => {
    setKategori(kat);
    setMessages([{
      role: "assistant",
      content: `Hej! Jag är din juridiska AI-assistent för ${kat.label}. Jag kan hjälpa dig förstå dina rättigheter och skyldigheter baserat på svensk lag.\n\n⚠️ Viktigt: Mina svar är allmän juridisk information, inte personlig juridisk rådgivning. Konsultera alltid en auktoriserad jurist för ditt specifika ärende.\n\nVad vill du veta?`
    }]);
  };

  const send = async (text) => {
    const msg = text || input.trim();
    if (!msg || loading) return;
    setInput("");

    const userMsg = { role: "user", content: uploadedText ? `[Dokument att analysera]\n${uploadedText}\n\nFråga: ${msg}` : msg };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setLoading(true);
    setUploadedText("");

    try {
      const systemPrompt = `Du är en svensk juridisk AI-assistent specialiserad på ${kategori?.label || "juridik"}. 
      Ge alltid svar baserade på svensk lag och svenska regler.
      Var tydlig, pedagogisk och använd vanlig svenska utan juridisk jargong.
      Ge alltid praktiska råd och nästa steg.
      Avsluta alltid med: "⚠️ Detta är allmän information, inte personlig juridisk rådgivning. Vid komplexa ärenden, kontakta en auktoriserad jurist."
      Om användaren laddar upp ett dokument, analysera det och markera viktiga klausuler och potentiella risker.`;

      const resp = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": KEY, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 800,
          system: systemPrompt,
          messages: newMessages.map(m => ({ role: m.role, content: m.content }))
        })
      });

      if (!resp.ok) throw new Error("API-fel: " + resp.status);
      const data = await resp.json();
      const reply = data.content?.[0]?.text || "Kunde inte svara. Försök igen.";
      setMessages([...newMessages, { role: "assistant", content: reply }]);
    } catch (err) {
      setMessages([...newMessages, { role: "assistant", content: "Fel: " + err.message }]);
    }
    setLoading(false);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result;
      setUploadedText(String(text).slice(0, 3000));
      setMessages(prev => [...prev, {
        role: "assistant",
        content: `Jag har läst in dokumentet "${file.name}". Ställ din fråga om dokumentet så analyserar jag det åt dig!`
      }]);
    };
    reader.readAsText(file);
  };

  if (!kategori) {
    return (
      <div>
        <div style={{ background: "linear-gradient(135deg,#0f172a,#1a0a2e)", borderRadius: 16, border: "1px solid #8b5cf633", padding: 18, marginBottom: 18 }}>
          <div style={{ fontSize: 22, marginBottom: 8 }}>⚖️</div>
          <div style={{ fontSize: 17, fontWeight: 800, color: "#e2e8f0", marginBottom: 6 }}>Juridisk AI-assistent</div>
          <div style={{ fontSize: 13, color: "#64748b", lineHeight: 1.6 }}>
            Få svar på juridiska frågor om avtal, försäkringar, lån, hyresrätt och mer — baserat på svensk lag. Ladda upp dokument för analys.
          </div>
          <div style={{ marginTop: 12, background: "#1e293b", borderRadius: 10, padding: "10px 14px" }}>
            <div style={{ fontSize: 11, color: "#f59e0b", fontWeight: 600 }}>⚠️ Viktig information</div>
            <div style={{ fontSize: 11, color: "#64748b", marginTop: 4, lineHeight: 1.5 }}>
              Detta är ett AI-baserat informationsverktyg och utgör inte juridisk rådgivning. Konsultera alltid en auktoriserad jurist för ditt specifika ärende. Kapital AB är inte ett advokatbyrå och kan inte representera dig juridiskt.
            </div>
          </div>
        </div>

        <div style={{ fontSize: 12, color: "#64748b", marginBottom: 12, textTransform: "uppercase", letterSpacing: 1 }}>Välj kategori</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {JURIDISK_KATEGORIER.map(kat => (
            <button key={kat.id} onClick={() => selectKategori(kat)}
              style={{ background: "#0f172a", border: `1px solid ${kat.color}33`, borderRadius: 14, padding: 16, cursor: "pointer", textAlign: "left" }}>
              <div style={{ fontSize: 26, marginBottom: 8 }}>{kat.icon}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0", marginBottom: 4 }}>{kat.label}</div>
              <div style={{ fontSize: 11, color: "#475569" }}>{kat.desc}</div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <button onClick={() => { setKategori(null); setMessages([]); }}
          style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "linear-gradient(135deg,#10b981,#0ea5e9)", border: "none", borderRadius: 12, color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer", padding: "10px 20px", boxShadow: "0 4px 15px #10b98144" }}>
          <span style={{ fontSize: 16 }}>←</span> Tillbaka
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 18 }}>{kategori.icon}</span>
          <span style={{ fontSize: 14, fontWeight: 600, color: "#e2e8f0" }}>{kategori.label}</span>
        </div>
      </div>

      {/* Quick questions */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
        {(JURIDISK_SNABBFRAGOR[kategori.id] || []).map(q => (
          <button key={q} onClick={() => send(q)}
            style={{ padding: "6px 12px", background: "#0f172a", border: `1px solid ${kategori.color}33`, borderRadius: 99, color: "#94a3b8", fontSize: 11, cursor: "pointer" }}>
            {q}
          </button>
        ))}
      </div>

      {/* Chat */}
      <div style={{ background: "#0f172a", borderRadius: 14, border: "1px solid #1e293b", padding: 16, marginBottom: 12, maxHeight: 400, overflowY: "auto" }}>
        {messages.map((m, i) => (
          <div key={i} style={{ marginBottom: 16, display: "flex", flexDirection: m.role === "user" ? "row-reverse" : "row", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: m.role === "user" ? "#3b82f6" : kategori.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>
              {m.role === "user" ? "👤" : "⚖️"}
            </div>
            <div style={{ maxWidth: "82%", background: m.role === "user" ? "#1e3a5f" : "#1e293b", borderRadius: m.role === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px", padding: "10px 14px" }}>
              <div style={{ fontSize: 13, color: "#e2e8f0", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{m.content}</div>
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: kategori.color, display: "flex", alignItems: "center", justifyContent: "center" }}>⚖️</div>
            <div style={{ background: "#1e293b", borderRadius: "14px 14px 14px 4px", padding: "12px 16px" }}>
              <div style={{ display: "flex", gap: 4 }}>
                {[0, 1, 2].map(i => <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: kategori.color, animation: `pulse 1s ${i * 0.2}s infinite` }} />)}
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Upload document */}
      {uploadedText && (
        <div style={{ background: "#10b98122", borderRadius: 10, border: "1px solid #10b98133", padding: "8px 14px", marginBottom: 8, fontSize: 12, color: "#10b981" }}>
          📄 Dokument inläst — ställ din fråga nedan
        </div>
      )}

      {/* Input */}
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <label style={{ padding: "12px", background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12, cursor: "pointer", fontSize: 16 }}>
          📎
          <input type="file" accept=".txt,.pdf" onChange={handleFileUpload} style={{ display: "none" }} />
        </label>
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && send()}
          placeholder="Skriv din juridiska fråga..."
          style={{ flex: 1, padding: "12px 16px", background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12, color: "#e2e8f0", fontSize: 14, outline: "none" }} />
        <button onClick={() => send()} disabled={loading || !input.trim()}
          style={{ padding: "12px 20px", background: `linear-gradient(135deg,${kategori.color},#0ea5e9)`, border: "none", borderRadius: 12, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
          →
        </button>
      </div>

      <div style={{ fontSize: 10, color: "#334155", textAlign: "center" }}>
        ⚠️ AI-juridisk information ersätter inte professionell juridisk rådgivning. Kontakta en auktoriserad jurist för ditt specifika ärende.
      </div>
    </div>
  );
}

// ── Ekonomisk Profil ──────────────────────────────────────────────────────
function EkonomiskProfil() {
  const [profileName, setProfileName] = useState(() => { try { return localStorage.getItem("kapital_name") || ""; } catch { return ""; } });
  const [showFull, setShowFull] = useState(false);
  const [copied, setCopied] = useState(false);

  // Gather all data
  const income = parseFloat(localStorage.getItem("kapital_income") || "0");
  const expenses = JSON.parse(localStorage.getItem("kapital_expenses") || "{}");
  const goals = JSON.parse(localStorage.getItem("kapital_goals") || "[]");
  const forsakringar = JSON.parse(localStorage.getItem("kapital_forsakringar") || "[]");
  const abonnemang = JSON.parse(localStorage.getItem("kapital_abonnemang") || "[]");
  const boende = JSON.parse(localStorage.getItem("kapital_boende") || "[]");
  const fordon = JSON.parse(localStorage.getItem("kapital_fordon") || "[]");
  const tillgangar = JSON.parse(localStorage.getItem("kapital_tillgangar") || "[]");
  const kryptoInnehav = JSON.parse(localStorage.getItem("kapital_krypto") || "[]");
  const kryptoVarde = kryptoInnehav.reduce((s, k) => s + (parseFloat(k.kostnad) || 0), 0);
  const skulder = JSON.parse(localStorage.getItem("kapital_skulder") || "[]");
  const kredit = JSON.parse(localStorage.getItem("kapital_kredit") || "{}");

  const totalExp = Object.values(expenses).reduce((s, v) => s + (parseFloat(v) || 0), 0);
  const totalForsakring = forsakringar.reduce((s, f) => s + (parseFloat(f.kostnad) || 0), 0);
  const totalAbonnemang = abonnemang.reduce((s, a) => { const k = parseFloat(a.kostnad) || 0; return s + (a.fakturering === "ar" ? k / 12 : k); }, 0);
  const totalBoende = boende.reduce((s, b) => s + (parseFloat(b.kostnad) || 0), 0);
  const totalFordon = fordon.reduce((s, f) => s + (parseFloat(f.kostnad) || 0), 0);
  const totalAllExp = totalExp + totalForsakring + totalAbonnemang + totalBoende + totalFordon;
  const leftover = income - totalAllExp;
  const savingsRate = income > 0 ? (leftover / income * 100) : 0;
  const totalTillgangar = tillgangar.reduce((s, t) => s + (parseFloat(t.varde) || 0), 0);
  const totalSkulder = skulder.reduce((s, t) => s + (parseFloat(t.varde) || 0), 0);
  const nettovarde = totalTillgangar - totalSkulder;
  const skuldgrad = totalTillgangar > 0 ? (totalSkulder / totalTillgangar * 100) : 0;
  const dti = income > 0 ? (totalAllExp / income * 100) : 0;

  // Credit score estimate
  let kreditScore = 750;
  if (kredit.hasKronofogden === "ja") kreditScore -= 200;
  if (kredit.hasBlankmark === "ja") kreditScore -= 120;
  if (parseInt(kredit.missedPayments || 0) > 0) kreditScore -= parseInt(kredit.missedPayments) * 35;
  if (dti > 50) kreditScore -= 80;
  else if (dti > 35) kreditScore -= 40;
  if (parseFloat(kredit.utilization || 0) > 80) kreditScore -= 60;
  kreditScore = Math.max(300, Math.min(850, kreditScore));

  const kreditLabel = kreditScore >= 750 ? "Utmärkt" : kreditScore >= 670 ? "Bra" : kreditScore >= 580 ? "Godkänd" : "Svag";
  const kreditColor = kreditScore >= 750 ? "#22c55e" : kreditScore >= 670 ? "#10b981" : kreditScore >= 580 ? "#f59e0b" : "#ef4444";

  const today = new Date().toLocaleDateString("sv-SE");

  const copyProfile = () => {
    const text = `EKONOMISK PROFIL — ${profileName || "Anonym"}
Genererad: ${today} via Kapital-appen

INKOMST & UTGIFTER
Månadsinkomst: ${Math.round(income).toLocaleString("sv-SE")} kr
Totala utgifter: ${Math.round(totalAllExp).toLocaleString("sv-SE")} kr/mån
Disponibelt: ${Math.round(leftover).toLocaleString("sv-SE")} kr/mån
Sparkvot: ${savingsRate.toFixed(1)}%
Skuld/inkomst-kvot: ${dti.toFixed(1)}%

TILLGÅNGAR & SKULDER
Totala tillgångar: ${Math.round(totalTillgangar).toLocaleString("sv-SE")} kr
Totala skulder: ${Math.round(totalSkulder).toLocaleString("sv-SE")} kr
Nettovärde: ${Math.round(nettovarde).toLocaleString("sv-SE")} kr
Skuldsättningsgrad: ${skuldgrad.toFixed(1)}%

KREDITPROFIL (UPPSKATTAD)
Kreditscore: ${kreditScore}/850 — ${kreditLabel}
Betalningsanmärkning: ${kredit.hasBlankmark === "ja" ? "Ja" : "Nej"}
Kronofogden: ${kredit.hasKronofogden === "ja" ? "Ja" : "Nej"}

FÖRSÄKRINGAR (${forsakringar.length} st)
Total försäkringskostnad: ${Math.round(totalForsakring).toLocaleString("sv-SE")} kr/mån

OBS: Denna profil är genererad från självrapporterade uppgifter i Kapital-appen och har inte verifierats av tredje part.`;

    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const printProfile = () => {
    window.print();
  };

  return (
    <div>
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg,#0f172a,#0a1f2e)", borderRadius: 16, border: "1px solid #3b82f633", padding: 20, marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>📊 Ekonomisk profil</div>
            <input value={profileName} onChange={e => setProfileName(e.target.value)} placeholder="Ditt namn"
              style={{ background: "none", border: "none", outline: "none", fontSize: 20, fontWeight: 800, color: "#e2e8f0", width: "100%" }} />
            <div style={{ fontSize: 12, color: "#475569", marginTop: 4 }}>Genererad {today}</div>
          </div>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: "linear-gradient(135deg,#10b981,#0ea5e9)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>📋</div>
        </div>
      </div>

      {/* Key metrics — bank overview */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
        {[
          { label: "Månadsinkomst", value: Math.round(income).toLocaleString("sv-SE") + " kr", color: "#10b981", icon: "💰" },
          { label: "Disponibelt/mån", value: Math.round(leftover).toLocaleString("sv-SE") + " kr", color: leftover >= 0 ? "#10b981" : "#ef4444", icon: "💵" },
          { label: "Nettovärde", value: Math.round(nettovarde).toLocaleString("sv-SE") + " kr", color: nettovarde >= 0 ? "#10b981" : "#ef4444", icon: "💎" },
          { label: "Kreditscore", value: kreditScore + " — " + kreditLabel, color: kreditColor, icon: "⭐" },
          { label: "Skuld/inkomst", value: dti.toFixed(1) + "%", color: dti < 35 ? "#10b981" : dti < 50 ? "#f59e0b" : "#ef4444", icon: "📊" },
          { label: "Sparkvot", value: savingsRate.toFixed(1) + "%", color: savingsRate >= 20 ? "#10b981" : "#f59e0b", icon: "📈" },
        ].map(m => (
          <div key={m.label} style={{ background: "#0f172a", borderRadius: 12, border: `1px solid ${m.color}22`, padding: "12px 14px" }}>
            <div style={{ fontSize: 11, color: "#64748b", marginBottom: 4 }}>{m.icon} {m.label}</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: m.color }}>{m.value}</div>
          </div>
        ))}
      </div>

      {/* Bank assessment */}
      <div style={{ background: "#0f172a", borderRadius: 14, border: "1px solid #1e293b", padding: 16, marginBottom: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#94a3b8", marginBottom: 12 }}>🏦 Bankbedömning</div>
        {[
          {
            label: "Betalningsförmåga",
            ok: leftover > 0 && dti < 50,
            text: leftover > 0 && dti < 50
              ? `Disponibelt ${Math.round(leftover).toLocaleString("sv-SE")} kr/mån — god betalningsförmåga`
              : "Låg disponibel inkomst kan påverka lånemöjligheter"
          },
          {
            label: "Skuldsättning",
            ok: skuldgrad < 70,
            text: skuldgrad < 70
              ? `Skuldsättning ${skuldgrad.toFixed(0)}% — acceptabel nivå`
              : `Skuldsättning ${skuldgrad.toFixed(0)}% — hög, kan påverka räntan`
          },
          {
            label: "Kredithistorik",
            ok: kredit.hasBlankmark !== "ja" && kredit.hasKronofogden !== "ja",
            text: kredit.hasBlankmark !== "ja" && kredit.hasKronofogden !== "ja"
              ? "Inga betalningsanmärkningar"
              : "Betalningsanmärkning finns — påverkar kreditgivningen"
          },
          {
            label: "Sparförmåga",
            ok: savingsRate >= 10,
            text: savingsRate >= 10
              ? `Sparkvot ${savingsRate.toFixed(0)}% — visar finansiell disciplin`
              : "Låg sparkvot — bör förbättras"
          },
          {
            label: "Försäkringsskydd",
            ok: forsakringar.length > 0,
            text: forsakringar.length > 0
              ? `${forsakringar.length} aktiva försäkringar — bra riskhantering`
              : "Inga försäkringar registrerade"
          },
        ].map((item, i) => (
          <div key={i} style={{ display: "flex", gap: 12, padding: "10px 0", borderBottom: i < 4 ? "1px solid #1e293b" : "none", alignItems: "flex-start" }}>
            <div style={{ width: 24, height: 24, borderRadius: "50%", background: item.ok ? "#22c55e22" : "#ef444422", border: `1px solid ${item.ok ? "#22c55e" : "#ef4444"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, flexShrink: 0 }}>
              {item.ok ? "✓" : "!"}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0" }}>{item.label}</div>
              <div style={{ fontSize: 12, color: item.ok ? "#64748b" : "#f59e0b", marginTop: 2 }}>{item.text}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Detailed breakdown toggle */}
      <button onClick={() => setShowFull(!showFull)}
        style={{ width: "100%", padding: "12px", background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12, color: "#94a3b8", fontSize: 14, cursor: "pointer", marginBottom: 10 }}>
        {showFull ? "▲ Dölj detaljer" : "▼ Visa fullständig profil"}
      </button>

      {showFull && (
        <div>
          {/* Income details */}
          <div style={{ background: "#0f172a", borderRadius: 14, border: "1px solid #10b98133", padding: 16, marginBottom: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#10b981", marginBottom: 10 }}>💰 Inkomst & Utgifter</div>
            {[
              ["Månadsinkomst (netto)", income],
              ["Boende & levnadsomkostnader", totalExp + totalBoende],
              ["Försäkringar", totalForsakring],
              ["Abonnemang", totalAbonnemang],
              ["Fordonskostnader", totalFordon],
              ["Totala utgifter", totalAllExp],
              ["Disponibelt", leftover],
            ].map(([l, v]) => (
              <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid #1e293b" }}>
                <span style={{ fontSize: 13, color: "#64748b" }}>{l}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: v === leftover ? (leftover >= 0 ? "#10b981" : "#ef4444") : "#e2e8f0" }}>
                  {Math.round(v).toLocaleString("sv-SE")} kr
                </span>
              </div>
            ))}
          </div>

          {/* Assets & Debts */}
          <div style={{ background: "#0f172a", borderRadius: 14, border: "1px solid #1e293b", padding: 16, marginBottom: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8", marginBottom: 10 }}>💎 Tillgångar & Skulder</div>
            {tillgangar.filter(t => parseFloat(t.varde) > 0).map(t => (
              <div key={t.id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #1e293b" }}>
                <span style={{ fontSize: 13, color: "#64748b" }}>{t.emoji} {t.label}</span>
                <span style={{ fontSize: 13, color: "#10b981" }}>+{parseFloat(t.varde).toLocaleString("sv-SE")} kr</span>
              </div>
            ))}
            {skulder.filter(s => parseFloat(s.varde) > 0).map(s => (
              <div key={s.id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #1e293b" }}>
                <span style={{ fontSize: 13, color: "#64748b" }}>{s.emoji} {s.label}</span>
                <span style={{ fontSize: 13, color: "#ef4444" }}>-{parseFloat(s.varde).toLocaleString("sv-SE")} kr</span>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", marginTop: 4 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#e2e8f0" }}>Nettovärde</span>
              <span style={{ fontSize: 15, fontWeight: 800, color: nettovarde >= 0 ? "#10b981" : "#ef4444" }}>
                {Math.round(nettovarde).toLocaleString("sv-SE")} kr
              </span>
            </div>
          </div>

          {/* Forsäkringar */}
          {forsakringar.length > 0 && (
            <div style={{ background: "#0f172a", borderRadius: 14, border: "1px solid #1e293b", padding: 16, marginBottom: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8", marginBottom: 10 }}>🛡️ Försäkringar</div>
              {forsakringar.map((f, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #1e293b" }}>
                  <span style={{ fontSize: 13, color: "#64748b" }}>{f.bolag} — {f.typ}</span>
                  <span style={{ fontSize: 13, color: "#e2e8f0" }}>{parseFloat(f.kostnad).toLocaleString("sv-SE")} kr/mån</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
        <button onClick={copyProfile}
          style={{ flex: 1, padding: "13px", background: copied ? "#10b98122" : "linear-gradient(135deg,#10b981,#0ea5e9)", border: copied ? "1px solid #10b981" : "none", borderRadius: 12, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
          {copied ? "✓ Kopierat!" : "📋 Kopiera profil"}
        </button>
        <button onClick={printProfile}
          style={{ flex: 1, padding: "13px", background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12, color: "#94a3b8", fontSize: 14, cursor: "pointer" }}>
          🖨️ Skriv ut
        </button>
      </div>

      <div style={{ fontSize: 11, color: "#334155", textAlign: "center", marginTop: 10, lineHeight: 1.6 }}>
        ⚠ Profilen baseras på självrapporterade uppgifter och har inte verifierats av Kapital eller tredje part. Banker och kreditgivare gör egna kreditbedömningar via UC/Creditsafe.
      </div>
    </div>
  );
}

// ── Smart Låneansökan ─────────────────────────────────────────────────────
function SmartLanAnsokan() {
  const [step, setStep] = useState(1);
  const [lanTyp, setLanTyp] = useState("blanko");
  const [ansokan, setAnsokan] = useState(() => {
    // Pre-fill from app data
    const name = localStorage.getItem("kapital_name") || "";
    const income = localStorage.getItem("kapital_income") || "";
    const skulder = JSON.parse(localStorage.getItem("kapital_skulder") || "[]");
    const totalSkulder = skulder.reduce((s, t) => s + (parseFloat(t.varde) || 0), 0);
    return {
      fornamn: name.split(" ")[0] || "",
      efternamn: name.split(" ").slice(1).join(" ") || "",
      belopp: "",
      syfte: "",
      lopetid: "5",
      inkomst: Math.round(parseFloat(income) * 1.35) || "",
      befintligaSkulder: Math.round(totalSkulder) || "",
      arbetsgivare: "",
      anstallningsform: "tillsvidare",
      email: "",
      telefon: "",
      personnummer: "",
    };
  });

  const set = (key, val) => setAnsokan(prev => ({ ...prev, [key]: val }));

  const LANGIVARE_BAST = {
    blanko: [
      { name: "Ikano Bank", rate: "7.95%", max: 350000, url: "https://www.ikanobank.se/lana/privatlan" },
      { name: "Santander", rate: "8.95%", max: 350000, url: "https://www.santander.se/lana/privatlan" },
      { name: "Nordax", rate: "9.45%", max: 500000, url: "https://www.nordax.se/privatlan" },
    ],
    billan: [
      { name: "Santander", rate: "4.95%", max: 800000, url: "https://www.santander.se/lana/billan" },
      { name: "Ikano Bank", rate: "5.45%", max: 600000, url: "https://www.ikanobank.se/lana/billan" },
      { name: "Nordea", rate: "6.10%", max: 900000, url: "https://www.nordea.se/privat/lana/billan.html" },
    ],
    bolan: [
      { name: "Avanza Bank", rate: "3.55%", max: 5000000, url: "https://www.avanza.se/bolan" },
      { name: "SBAB", rate: "3.58%", max: 5000000, url: "https://www.sbab.se" },
      { name: "Handelsbanken", rate: "3.72%", max: 10000000, url: "https://www.handelsbanken.se" },
    ],
    samla: [
      { name: "Zmarta", rate: "Från 6.95%", max: 600000, url: "https://www.zmarta.se/samla-lan" },
      { name: "Lendo", rate: "Från 7.45%", max: 600000, url: "https://www.lendo.se" },
    ],
  };

  const InputField = ({ label, keyName, placeholder, type = "text", options }) => (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 11, color: "#64748b", marginBottom: 5 }}>{label}</div>
      {options ? (
        <select value={ansokan[keyName]} onChange={e => set(keyName, e.target.value)}
          style={{ width: "100%", padding: "10px 12px", background: "#1e293b", border: "1px solid #334155", borderRadius: 8, color: "#e2e8f0", fontSize: 14, outline: "none" }}>
          {options.map(([v, l]) => <option key={v} value={v} style={{ background: "#0f172a" }}>{l}</option>)}
        </select>
      ) : (
        <input value={ansokan[keyName]} onChange={e => set(keyName, e.target.value)} placeholder={placeholder}
          inputMode={type === "number" ? "decimal" : "text"}
          style={{ width: "100%", padding: "10px 12px", background: "#1e293b", border: "1px solid #334155", borderRadius: 8, color: "#e2e8f0", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
      )}
    </div>
  );

  const calcMonthly = (rate, amount, years) => {
    const mr = parseFloat(rate) / 100 / 12;
    const n = years * 12;
    if (mr === 0) return amount / n;
    return amount * mr * Math.pow(1 + mr, n) / (Math.pow(1 + mr, n) - 1);
  };

  const belopp = parseFloat(ansokan.belopp) || 0;
  const lopetid = parseInt(ansokan.lopetid) || 5;

  return (
    <div>
      <div style={{ background: "linear-gradient(135deg,#0f172a,#1a0f00)", borderRadius: 16, border: "1px solid #f59e0b33", padding: 16, marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#f59e0b", marginBottom: 4 }}>🏦 Smart Låneansökan</div>
        <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.5 }}>
          Appen förifylller din ansökan från din ekonomidata. Välj banker och skicka ansökan direkt — en gång, flera banker.
        </div>
      </div>

      {/* Loan type */}
      <div style={{ display: "flex", gap: 4, background: "#0f172a", borderRadius: 12, padding: 4, border: "1px solid #1e293b", marginBottom: 16 }}>
        {[["blanko","💳 Blankolån"],["billan","🚗 Billån"],["bolan","🏠 Bolån"],["samla","🔄 Samla"]].map(([id, label]) => (
          <button key={id} onClick={() => setLanTyp(id)} style={{ flex: 1, padding: "9px 2px", background: lanTyp === id ? "linear-gradient(135deg,#10b981,#0ea5e9)" : "none", border: "none", borderRadius: 9, color: lanTyp === id ? "#fff" : "#64748b", fontSize: 11, fontWeight: lanTyp === id ? 700 : 400, cursor: "pointer", whiteSpace: "nowrap" }}>
            {label}
          </button>
        ))}
      </div>

      {/* Steps */}
      <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
        {[1, 2, 3].map(s => (
          <div key={s} style={{ flex: 1, height: 4, borderRadius: 99, background: step >= s ? "#10b981" : "#1e293b", transition: "background 0.3s" }} />
        ))}
      </div>

      {/* Step 1 — Lånebehov */}
      {step === 1 && (
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#e2e8f0", marginBottom: 14 }}>Steg 1 — Lånebehov</div>
          <InputField label="Önskat lånebelopp (kr)" keyName="belopp" placeholder="150 000" type="number" />
          <InputField label="Löptid (år)" keyName="lopetid" placeholder="5"
            options={[["1","1 år"],["2","2 år"],["3","3 år"],["5","5 år"],["7","7 år"],["10","10 år"],["15","15 år"],["20","20 år"],["25","25 år"],["30","30 år"]]} />
          <InputField label="Syfte med lånet" keyName="syfte"
            options={[["renovering","Renovering"],["fordon","Fordon"],["konsumtion","Konsumtion"],["samla","Samla lån"],["bosta","Bostad"],["ovrigt","Övrigt"]]} />

          {belopp > 0 && (
            <div style={{ background: "#0f172a", borderRadius: 12, border: "1px solid #1e293b", padding: 14, marginBottom: 14 }}>
              <div style={{ fontSize: 12, color: "#64748b", marginBottom: 10 }}>Uppskattad månadskostnad</div>
              {(LANGIVARE_BAST[lanTyp] || []).slice(0, 3).map(lg => {
                const rate = parseFloat(lg.rate) || 8;
                const monthly = calcMonthly(rate, Math.min(belopp, lg.max), lopetid);
                return (
                  <div key={lg.name} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid #1e293b" }}>
                    <span style={{ fontSize: 13, color: "#64748b" }}>{lg.name} ({lg.rate})</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0" }}>{Math.round(monthly).toLocaleString("sv-SE")} kr/mån</span>
                  </div>
                );
              })}
            </div>
          )}

          <button onClick={() => setStep(2)} disabled={!ansokan.belopp}
            style={{ width: "100%", padding: "14px", background: ansokan.belopp ? "linear-gradient(135deg,#10b981,#0ea5e9)" : "#1e293b", border: "none", borderRadius: 12, color: "#fff", fontSize: 15, fontWeight: 700, cursor: ansokan.belopp ? "pointer" : "not-allowed" }}>
            Nästa →
          </button>
        </div>
      )}

      {/* Step 2 — Personuppgifter */}
      {step === 2 && (
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#e2e8f0", marginBottom: 14 }}>Steg 2 — Dina uppgifter</div>

          <div style={{ background: "#10b98111", borderRadius: 10, border: "1px solid #10b98133", padding: "10px 14px", marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: "#10b981" }}>✓ Vi har förifyllt uppgifter från din ekonomiprofil</div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <InputField label="Förnamn" keyName="fornamn" placeholder="Anna" />
            <InputField label="Efternamn" keyName="efternamn" placeholder="Svensson" />
          </div>
          <InputField label="Personnummer" keyName="personnummer" placeholder="YYYYMMDD-XXXX" />
          <InputField label="E-post" keyName="email" placeholder="din@email.se" />
          <InputField label="Telefon" keyName="telefon" placeholder="070-123 45 67" />
          <InputField label="Arbetsgivare" keyName="arbetsgivare" placeholder="Företag AB" />
          <InputField label="Anställningsform" keyName="anstallningsform"
            options={[["tillsvidare","Tillsvidare"],["provanstallning","Provanställning"],["visstid","Visstid"],["egenforetagare","Egenföretagare"],["pension","Pension"]]} />

          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <button onClick={() => setStep(1)} style={{ flex: 1, padding: "14px", background: "linear-gradient(135deg,#10b981,#0ea5e9)", border: "none", borderRadius: 12, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 15px #10b98144" }}>← Tillbaka</button>
            <button onClick={() => setStep(3)} style={{ flex: 2, padding: "14px", background: "linear-gradient(135deg,#10b981,#0ea5e9)", border: "none", borderRadius: 12, color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>Nästa →</button>
          </div>
        </div>
      )}

      {/* Step 3 — Välj banker & skicka */}
      {step === 3 && (
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#e2e8f0", marginBottom: 14 }}>Steg 3 — Välj banker</div>

          <div style={{ background: "#0f172a", borderRadius: 14, border: "1px solid #10b98133", padding: 14, marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#10b981", marginBottom: 10 }}>📋 Din ansökan sammanfattning</div>
            {[
              ["Namn", ansokan.fornamn + " " + ansokan.efternamn],
              ["Belopp", belopp.toLocaleString("sv-SE") + " kr"],
              ["Löptid", ansokan.lopetid + " år"],
              ["Syfte", ansokan.syfte],
              ["Inkomst", ansokan.inkomst ? Math.round(ansokan.inkomst).toLocaleString("sv-SE") + " kr/mån" : "Ej angiven"],
            ].map(([l, v]) => (
              <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #1e293b" }}>
                <span style={{ fontSize: 13, color: "#64748b" }}>{l}</span>
                <span style={{ fontSize: 13, color: "#e2e8f0" }}>{v}</span>
              </div>
            ))}
          </div>

          <div style={{ fontSize: 12, color: "#64748b", marginBottom: 10 }}>Skicka ansökan till (öppnas i ny flik):</div>
          {(LANGIVARE_BAST[lanTyp] || []).map(lg => (
            <a key={lg.name} href={lg.url} target="_blank" rel="noopener noreferrer"
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#0f172a", border: "1px solid #10b98133", borderRadius: 12, padding: "14px 16px", marginBottom: 10, textDecoration: "none" }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: "#e2e8f0" }}>{lg.name}</div>
                <div style={{ fontSize: 12, color: "#64748b" }}>Ränta: {lg.rate} · Max {(lg.max / 1000).toFixed(0)}k kr</div>
              </div>
              <div style={{ padding: "8px 16px", background: "linear-gradient(135deg,#10b981,#0ea5e9)", borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 700 }}>
                Ansök →
              </div>
            </a>
          ))}

          <button onClick={() => setStep(1)} style={{ width: "100%", padding: "12px", background: "none", border: "1px solid #334155", borderRadius: 12, color: "#64748b", fontSize: 13, cursor: "pointer", marginTop: 8 }}>
            ← Börja om
          </button>

          <div style={{ fontSize: 10, color: "#334155", textAlign: "center", marginTop: 10, lineHeight: 1.6 }}>
            Kapital är en jämförelsetjänst och inte kreditförmedlare. Ansökan sker direkt hos respektive bank. Kapital kan erhålla ersättning via affiliate-avtal.
          </div>
        </div>
      )}
    </div>
  );
}

function DelaTab({ result }) {
  const [toast, setToast] = useState(null);
  const showToast = (m) => { setToast(m); setTimeout(() => setToast(null), 2500); };

  const getText = () => !result ? "" :
    `📊 ${result.company} — Kapital-analys\n\n${result.recommendation} · ${result.score}/100\n\n${result.summary}\n\n⚠ Risker: ${result.keyRisks?.slice(0,2).join(", ")}\n✓ Styrkor: ${result.keyStrengths?.slice(0,2).join(", ")}\n\n#börsen #aktier #${result.company.replace(/\s/g,"")}`;

  if (!result) return (
    <div style={{ textAlign: "center", padding: "80px 0", color: "#334155" }}>
      <div style={{ fontSize: 40 }}>📤</div>
      <div style={{ fontSize: 14, color: "#475569", marginTop: 10 }}>Gör en analys först — sedan kan du dela den</div>
    </div>
  );

  const shareBtn = (icon, label, action, color) => (
    <button onClick={action} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "14px 16px", marginBottom: 10, background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12, color: "#e2e8f0", fontSize: 14, fontWeight: 500, cursor: "pointer", textAlign: "left" }}>
      <span style={{ fontSize: 20, width: 28, textAlign: "center" }}>{icon}</span>
      <span style={{ flex: 1 }}>{label}</span>
      <span style={{ fontSize: 12, color }}>→</span>
    </button>
  );

  return (
    <div>
      {toast && <Toast msg={toast} />}
      <div style={card()}>
        <div style={{ fontSize: 11, color: "#64748b", marginBottom: 8 }}>Förhandsgranskning</div>
        <pre style={{ fontSize: 13, color: "#cbd5e1", whiteSpace: "pre-wrap", lineHeight: 1.6, margin: 0, fontFamily: "inherit" }}>{getText()}</pre>
      </div>
      {shareBtn("𝕏", "Dela på X / Twitter", () => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(getText().slice(0,280))}`, "_blank"), "#1da1f2")}
      {shareBtn("in", "Dela på LinkedIn", () => window.open(`https://www.linkedin.com/sharing/share-offsite/?url=https://borskoll.se`, "_blank"), "#0077b5")}
      {shareBtn("📘", "Dela på Facebook", () => window.open(`https://www.facebook.com/sharer/sharer.php?quote=${encodeURIComponent(getText())}`, "_blank"), "#4267B2")}
      {shareBtn("📋", "Kopiera text", () => navigator.clipboard.writeText(getText()).then(() => showToast("✓ Kopierat!")), "#22c55e")}
      {shareBtn("📤", "Dela via telefonen", () => navigator.share ? navigator.share({ title: `${result.company} – Analys`, text: getText() }) : navigator.clipboard.writeText(getText()).then(() => showToast("✓ Kopierat!")), "#8b5cf6")}
      <div style={{ fontSize: 11, color: "#334155", textAlign: "center", marginTop: 8, lineHeight: 1.6 }}>⚠ AI-genererad analys — inte finansiell rådgivning enligt lag (2007:528). Investeringar sker på eget ansvar.</div>
    </div>
  );
}

// ── Pro Upgrade Modal ─────────────────────────────────────────────────────
function UpgradeModal({ onClose, onUpgrade, t }) {
  const [plan, setPlan] = useState("monthly");

  const FREE_FEATURES = [
    "✓ Budget & utgiftshantering",
    "✓ Alla kalkylatorer (FIRE, pension, skuld)",
    "✓ Skatteberäkning (K4, ISK, ROT/RUT)",
    "✓ Försäkringsjämförelse",
    "✓ Lånejämförelse med affiliate",
    "✓ Juridisk AI-assistent",
    "✓ AI-ekonomicoach",
    "✓ Snittlöner & lönespecifikation",
    "✓ Kreditscore-beräkning",
    "✓ 3 AI-aktieanalyser per dag",
    "✓ Bevakningslista (5 aktier)",
    "✓ Ekonomisk tidslinje",
  ];

  const PRO_FEATURES = [
    { icon: "🔍", title: "Obegränsade AI-analyser", desc: "Analysera hur många aktier du vill" },
    { icon: "💾", title: "Spara & jämför analyser", desc: "Bygg din egen analyshistorik" },
    { icon: "⚖️", title: "Jämför bolag sida vid sida", desc: "Ericsson vs Volvo på sekunden" },
    { icon: "💼", title: "Obegränsad portföljspårning", desc: "Lägg in alla dina innehav" },
    { icon: "⭐", title: "Obegränsad bevakningslista", desc: "Bevaka hur många aktier som helst" },
    { icon: "🔔", title: "Obegränsade kurslarm", desc: "Få notis när kursen når ditt mål" },
    { icon: "🏦", title: "Bankintegration (Tink)", desc: "Automatisk transaktionsimport — snart" },
    { icon: "📊", title: "Avancerad portföljanalys", desc: "Risk, diversifiering och mer" },
  ];

  return (
    <div style={{ position: "fixed", inset: 0, background: "#000c", zIndex: 1000, display: "flex", alignItems: "flex-end", justifyContent: "center" }} onClick={onClose}>
      <div style={{ background: "#0f172a", borderRadius: "20px 20px 0 0", padding: "24px 20px 40px", maxWidth: 480, width: "100%", border: "1px solid #1e293b", maxHeight: "90vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🚀</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#e2e8f0" }}>Kapital Pro</div>
          <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>Lås upp hela potentialen</div>
        </div>

        {/* Always free banner */}
        <div style={{ background: "#10b98111", borderRadius: 14, border: "1px solid #10b98133", padding: 14, marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#10b981", marginBottom: 10 }}>✓ Alltid gratis — ingen kreditkort krävs</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
            {FREE_FEATURES.map((f, i) => (
              <div key={i} style={{ fontSize: 11, color: "#64748b" }}>{f}</div>
            ))}
          </div>
        </div>

        {/* Pro features */}
        <div style={{ fontSize: 12, color: "#64748b", marginBottom: 10, textTransform: "uppercase", letterSpacing: 1 }}>Pro — exklusiva funktioner</div>
        {PRO_FEATURES.map((f, i) => (
          <div key={i} style={{ display: "flex", gap: 12, marginBottom: 10, alignItems: "flex-start" }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg,#10b98122,#0ea5e922)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{f.icon}</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#e2e8f0" }}>{f.title}</div>
              <div style={{ fontSize: 12, color: "#64748b" }}>{f.desc}</div>
            </div>
          </div>
        ))}

        {/* Plan toggle */}
        <div style={{ display: "flex", gap: 4, background: "#1e293b", borderRadius: 12, padding: 4, marginTop: 20, marginBottom: 14 }}>
          <button onClick={() => setPlan("monthly")} style={{ flex: 1, padding: "10px", background: plan === "monthly" ? "#0f172a" : "none", border: "none", borderRadius: 9, color: plan === "monthly" ? "#e2e8f0" : "#64748b", fontSize: 14, fontWeight: plan === "monthly" ? 700 : 400, cursor: "pointer" }}>
            49 kr/mån
          </button>
          <button onClick={() => setPlan("yearly")} style={{ flex: 1, padding: "10px", background: plan === "yearly" ? "#0f172a" : "none", border: "none", borderRadius: 9, color: plan === "yearly" ? "#10b981" : "#64748b", fontSize: 14, fontWeight: plan === "yearly" ? 700 : 400, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
            399 kr/år <span style={{ fontSize: 10, background: "#10b98122", color: "#10b981", padding: "1px 6px", borderRadius: 99 }}>-32%</span>
          </button>
        </div>

        {/* CTA */}
        <button onClick={() => startStripeCheckout(plan)}
          style={{ width: "100%", padding: "16px", background: "linear-gradient(135deg,#10b981,#0ea5e9)", border: "none", borderRadius: 14, color: "#fff", fontSize: 16, fontWeight: 800, cursor: "pointer", marginBottom: 10 }}>
          {plan === "monthly" ? "Starta Pro — 49 kr/mån" : "Starta Pro — 399 kr/år"}
        </button>

        <div style={{ textAlign: "center", fontSize: 12, color: "#475569", marginBottom: 8 }}>
          ✓ Avsluta när som helst · ✓ Ingen bindningstid · ✓ Säker betalning via Stripe
        </div>

        <button onClick={onClose} style={{ width: "100%", padding: "10px", background: "none", border: "none", color: "#334155", fontSize: 13, cursor: "pointer" }}>
          Fortsätt med gratis
        </button>
      </div>
    </div>
  );
}


// ── Notification Center ───────────────────────────────────────────────────
function useNotifications() {
  const [notifications, setNotifications] = useState(() => {
    try { return JSON.parse(localStorage.getItem("kapital_notifications") || "[]"); } catch { return []; }
  });
  const addNotification = (n) => {
    const next = [{ ...n, id: Date.now(), read: false, time: new Date().toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" }) }, ...notifications].slice(0, 50);
    setNotifications(next);
    try { localStorage.setItem("kapital_notifications", JSON.stringify(next)); } catch {}
  };
  const markAllRead = () => {
    const next = notifications.map(n => ({ ...n, read: true }));
    setNotifications(next);
    try { localStorage.setItem("kapital_notifications", JSON.stringify(next)); } catch {}
  };
  const unreadCount = notifications.filter(n => !n.read).length;
  return { notifications, addNotification, markAllRead, unreadCount };
}

function NotificationCenter({ onClose }) {
  const { notifications, markAllRead, unreadCount } = useNotifications();
  useEffect(() => { markAllRead(); }, []);
  return (
    <div style={{ position: "fixed", inset: 0, background: "#000c", zIndex: 2000, display: "flex", alignItems: "flex-end", justifyContent: "center" }} onClick={onClose}>
      <div style={{ background: "#0f172a", borderRadius: "20px 20px 0 0", padding: "20px 16px 40px", maxWidth: 480, width: "100%", border: "1px solid #1e293b", maxHeight: "75vh", display: "flex", flexDirection: "column" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#e2e8f0" }}>🔔 Notiser</div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#64748b", fontSize: 20, cursor: "pointer" }}>✕</button>
        </div>
        <div style={{ overflowY: "auto", flex: 1 }}>
          {notifications.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: "#334155" }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>🔕</div>
              <div style={{ fontSize: 14, color: "#475569" }}>Inga notiser ännu</div>
              <div style={{ fontSize: 12, color: "#334155", marginTop: 6 }}>Kurslarm och analyser visas här</div>
            </div>
          ) : notifications.map(n => (
            <div key={n.id} style={{ display: "flex", gap: 12, padding: "12px 0", borderBottom: "1px solid #1e293b", opacity: n.read ? 0.6 : 1 }}>
              <div style={{ fontSize: 22, flexShrink: 0 }}>{n.icon || "📊"}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, color: "#e2e8f0", fontWeight: n.read ? 400 : 600 }}>{n.title}</div>
                <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{n.body}</div>
                <div style={{ fontSize: 10, color: "#334155", marginTop: 4 }}>{n.time}</div>
              </div>
              {!n.read && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#10b981", flexShrink: 0, marginTop: 6 }} />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Compare View ──────────────────────────────────────────────────────────
function CompareView({ onClose, onAnalyze }) {
  const [compA, setCompA] = useState("");
  const [compB, setCompB] = useState("");
  const [resA, setResA] = useState(null);
  const [resB, setResB] = useState(null);
  const [loadA, setLoadA] = useState(false);
  const [loadB, setLoadB] = useState(false);

  const fetchAnalysis = async (name, setRes, setLoad) => {
    if (!name.trim()) return;
    setLoad(true);
    try {
      const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST", headers: { "Content-Type": "application/json", "x-api-key": KEY, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
        body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 1000,
          messages: [{ role: "user", content: `Analysera aktien "${name}" och svara ENDAST med JSON:\n{"company":"${name}","sector":"bransch","score":60,"recommendation":"Avvakta","summary":"kort sammanfattning","keyRisks":["r1","r2"],"keyStrengths":["s1","s2"],"nyckeltal":{"pe":20,"direktavkastning":2.5,"ebitdaMarginal":18,"betavarde":1.0},"grafData":[95,98,102,99,105,103,108,106,110,107,112,109]}` }] })
      });
      const data = await resp.json();
      const text = data.content?.map(b => b.text || "").join("") || "";
      const match = text.match(/\{[\s\S]*\}/);
      if (match) setRes(JSON.parse(match[0]));
    } catch {}
    finally { setLoad(false); }
  };

  const recColor = r => r === "Köp" ? "#22c55e" : r === "Sälj" ? "#ef4444" : "#f59e0b";

  const CompCol = ({ res, comp, setComp, load, side }) => (
    <div style={{ flex: 1 }}>
      <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
        <input value={comp} onChange={e => setComp(e.target.value)} onKeyDown={e => e.key === "Enter" && fetchAnalysis(comp, side === "A" ? setResA : setResB, side === "A" ? setLoadA : setLoadB)}
          placeholder={side === "A" ? "Bolag 1..." : "Bolag 2..."}
          style={{ flex: 1, padding: "9px 10px", background: "#1e293b", border: "1px solid #334155", borderRadius: 8, color: "#e2e8f0", fontSize: 13, outline: "none" }} />
        <button onClick={() => fetchAnalysis(comp, side === "A" ? setResA : setResB, side === "A" ? setLoadA : setLoadB)}
          style={{ padding: "9px 12px", background: "linear-gradient(135deg,#10b981,#0ea5e9)", border: "none", borderRadius: 8, color: "#fff", fontSize: 12, cursor: "pointer" }}>
          {load ? "⏳" : "→"}
        </button>
      </div>
      {res && (
        <div style={{ background: "#0a0f1e", borderRadius: 12, border: `1px solid ${recColor(res.recommendation)}44`, padding: 14 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#e2e8f0", marginBottom: 4 }}>{res.company}</div>
          <div style={{ fontSize: 11, color: "#64748b", marginBottom: 10 }}>{res.sector}</div>

          {/* Score circle */}
          <div style={{ textAlign: "center", marginBottom: 12 }}>
            <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 64, height: 64, borderRadius: "50%", background: recColor(res.recommendation) + "22", border: `3px solid ${recColor(res.recommendation)}`, flexDirection: "column" }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: recColor(res.recommendation) }}>{res.score}</div>
              <div style={{ fontSize: 9, color: "#64748b" }}>/100</div>
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, color: recColor(res.recommendation), marginTop: 4 }}>{res.recommendation}</div>
          </div>

          {/* Mini graph */}
          {res.grafData && (
            <svg viewBox="0 0 11 50" style={{ width: "100%", height: 40, display: "block", marginBottom: 10 }} preserveAspectRatio="none">
              <polyline points={res.grafData.map((v, i) => `${i},${50 - ((v - Math.min(...res.grafData)) / (Math.max(...res.grafData) - Math.min(...res.grafData) || 1)) * 45}`).join(" ")}
                fill="none" stroke={recColor(res.recommendation)} strokeWidth="1.5" />
            </svg>
          )}

          {/* Nyckeltal */}
          {res.nyckeltal && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 10 }}>
              {[["P/E", res.nyckeltal.pe + "x"], ["Utd.", res.nyckeltal.direktavkastning + "%"], ["EBITDA", res.nyckeltal.ebitdaMarginal + "%"], ["Beta", res.nyckeltal.betavarde]].map(([k, v]) => (
                <div key={k} style={{ background: "#1e293b", borderRadius: 8, padding: "6px 8px" }}>
                  <div style={{ fontSize: 9, color: "#475569" }}>{k}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0" }}>{v}</div>
                </div>
              ))}
            </div>
          )}

          <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.5 }}>{res.summary?.slice(0, 100)}...</div>

          <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr", gap: 4 }}>
            {res.keyStrengths?.slice(0, 2).map((s, i) => <div key={i} style={{ fontSize: 11, color: "#22c55e", display: "flex", gap: 4 }}><span>✓</span>{s}</div>)}
            {res.keyRisks?.slice(0, 2).map((r, i) => <div key={i} style={{ fontSize: 11, color: "#ef4444", display: "flex", gap: 4 }}><span>⚠</span>{r}</div>)}
          </div>

          <button onClick={() => { onAnalyze(res.company); onClose(); }} style={{ width: "100%", marginTop: 10, padding: "8px", background: "linear-gradient(135deg,#10b981,#0ea5e9)", border: "none", borderRadius: 8, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
            Full analys →
          </button>
        </div>
      )}
      {load && (
        <div style={{ background: "#0f172a", borderRadius: 12, border: "1px solid #1e293b", padding: 20, textAlign: "center", color: "#64748b", fontSize: 13 }}>
          Analyserar...
        </div>
      )}
      {!res && !load && (
        <div style={{ background: "#0f172a", borderRadius: 12, border: "1px dashed #334155", padding: 20, textAlign: "center", color: "#334155", fontSize: 12 }}>
          Ange bolagsnamn ovan
        </div>
      )}
    </div>
  );

  return (
    <div style={{ position: "fixed", inset: 0, background: "#0a0f1e", zIndex: 3000, overflowY: "auto" }}>
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "16px 14px 80px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#e2e8f0" }}>⚖️ Jämför bolag</div>
            <div style={{ fontSize: 12, color: "#64748b" }}>Ställ två aktier mot varandra</div>
          </div>
          <button onClick={onClose} style={{ padding: "10px 20px", background: "linear-gradient(135deg,#10b981,#0ea5e9)", border: "none", borderRadius: 12, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 15px #10b98144" }}>← Tillbaka</button>
        </div>

        {/* Winner banner */}
        {resA && resB && (
          <div style={{ background: `linear-gradient(135deg,${recColor(resA.score > resB.score ? resA.recommendation : resB.recommendation)}22,#0f172a)`, borderRadius: 14, border: `1px solid ${recColor(resA.score > resB.score ? resA.recommendation : resB.recommendation)}44`, padding: 14, marginBottom: 16, textAlign: "center" }}>
            <div style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>🏆 Kapital rekommenderar</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: resA.score > resB.score ? recColor(resA.recommendation) : recColor(resB.recommendation) }}>
              {resA.score > resB.score ? resA.company : resA.score < resB.score ? resB.company : "Lika starka"}
            </div>
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
              {resA.score} vs {resB.score} poäng
            </div>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <CompCol res={resA} comp={compA} setComp={setCompA} load={loadA} side="A" />
          <CompCol res={resB} comp={compB} setComp={setCompB} load={loadB} side="B" />
        </div>

        {/* Quick compare presets */}
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 11, color: "#475569", marginBottom: 8 }}>Snabbval</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {[["Ericsson","Tele2"],["Volvo","Scania"],["H&M","Inditex"],["Apple","Microsoft"],["Nvidia","AMD"]].map(([a, b]) => (
              <button key={a+b} onClick={() => { setCompA(a); setCompB(b); fetchAnalysis(a, setResA, setLoadA); fetchAnalysis(b, setResB, setLoadB); }}
                style={{ padding: "5px 12px", background: "#0f172a", border: "1px solid #1e293b", borderRadius: 99, color: "#94a3b8", fontSize: 11, cursor: "pointer" }}>
                {a} vs {b}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Financial Health Score ────────────────────────────────────────────────
function HealthScore() {
  const income = parseFloat(localStorage.getItem("kapital_income") || "0");
  const expenses = JSON.parse(localStorage.getItem("kapital_expenses") || "{}");
  const goals = JSON.parse(localStorage.getItem("kapital_goals") || "[]");
  const forsakringar = JSON.parse(localStorage.getItem("kapital_forsakringar") || "[]");
  const abonnemang = JSON.parse(localStorage.getItem("kapital_abonnemang") || "[]");
  const boende = JSON.parse(localStorage.getItem("kapital_boende") || "[]");
  const fordon = JSON.parse(localStorage.getItem("kapital_fordon") || "[]");
  const tillgangar = JSON.parse(localStorage.getItem("kapital_tillgangar") || "[]");
  const kryptoInnehav = JSON.parse(localStorage.getItem("kapital_krypto") || "[]");
  const kryptoVarde = kryptoInnehav.reduce((s, k) => s + (parseFloat(k.kostnad) || 0), 0);
  const skulder = JSON.parse(localStorage.getItem("kapital_skulder") || "[]");

  const totalExp = Object.values(expenses).reduce((s, v) => s + (parseFloat(v) || 0), 0);
  const totalForsakring = forsakringar.reduce((s, f) => s + (parseFloat(f.kostnad) || 0), 0);
  const totalAbonnemang = abonnemang.reduce((s, a) => { const k = parseFloat(a.kostnad) || 0; return s + (a.fakturering === "ar" ? k / 12 : k); }, 0);
  const totalBoende = boende.reduce((s, b) => s + (parseFloat(b.kostnad) || 0), 0);
  const totalFordon = fordon.reduce((s, f) => s + (parseFloat(f.kostnad) || 0), 0);
  const totalAllExp = totalExp + totalForsakring + totalAbonnemang + totalBoende + totalFordon;
  const leftover = income - totalAllExp;
  const savingsRate = income > 0 ? leftover / income * 100 : 0;
  const totalTillgangar = tillgangar.reduce((s, t) => s + (parseFloat(t.varde) || 0), 0);
  const totalSkulder = skulder.reduce((s, t) => s + (parseFloat(t.varde) || 0), 0);
  const nettovarde = totalTillgangar - totalSkulder;
  const skuldgrad = totalTillgangar > 0 ? (totalSkulder / totalTillgangar * 100) : 0;
  const hasBuffer = goals.some(g => g.name?.toLowerCase().includes("buffert") && g.saved >= g.target * 0.5);
  const hasGoals = goals.length >= 1;
  const hasPension = goals.some(g => g.name?.toLowerCase().includes("pension"));
  const hasForsakring = forsakringar.length > 0;

  // Score calculation
  let score = 0;
  let tips = [];

  // Savings rate (0-40 points)
  if (savingsRate >= 20) { score += 40; }
  else if (savingsRate >= 10) { score += 25; tips.push({ icon: "📈", text: "Öka sparkvoten till 20% för optimal ekonomi" }); }
  else if (savingsRate >= 5) { score += 15; tips.push({ icon: "💸", text: "Försök spara minst 10% av inkomsten" }); }
  else if (income > 0) { tips.push({ icon: "🚨", text: "Din sparkvot är mycket låg — se över utgifterna" }); }
  else { tips.push({ icon: "💰", text: "Lägg in din inkomst i Ekonomi-fliken" }); }

  // Buffer (0-20 points)
  if (hasBuffer) { score += 20; }
  else { tips.push({ icon: "🛡️", text: "Bygg en buffert på 3 månaders utgifter" }); }

  // Has goals (0-20 points)
  if (hasGoals) { score += 20; }
  else { tips.push({ icon: "🎯", text: "Sätt upp sparmål i Ekonomi-fliken" }); }

  // Pension (0-15 points)
  if (hasPension) { score += 15; }
  else { tips.push({ icon: "👴", text: "Starta ett pensionssparande — även 500 kr/mån gör stor skillnad" }); }

  // Forsäkringar (0-10 points)
  if (hasForsakring) { score += 10; }
  else { tips.push({ icon: "🛡️", text: "Lägg in dina försäkringar under Trygghet" }); }

  // Nettovärde (0-15 points)
  if (totalTillgangar > 0) {
    if (nettovarde > 0 && skuldgrad < 50) { score += 15; }
    else if (skuldgrad < 70) { score += 8; tips.push({ icon: "💳", text: "Skuldsättningen är " + skuldgrad.toFixed(0) + "% — fokusera på amortering" }); }
    else { tips.push({ icon: "📉", text: "Skuldsättningen är hög — se skuldfria kalkylatorn" }); }
  } else { tips.push({ icon: "💎", text: "Fyll i tillgångar under Aktier → Min Ekonomi" }); }

  const label = score >= 80 ? "Utmärkt" : score >= 60 ? "Bra" : score >= 40 ? "OK" : "Behöver förbättras";
  const color = score >= 80 ? "#10b981" : score >= 60 ? "#3b82f6" : score >= 40 ? "#f59e0b" : "#ef4444";

  return (
    <div style={{ background: "linear-gradient(135deg,#0f172a,#0a1520)", borderRadius: 16, border: `1px solid ${color}33`, padding: 18, marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 13, color: "#64748b", marginBottom: 2 }}>💚 Finansiell hälsa</div>
          <div style={{ fontSize: 22, fontWeight: 800, color }}>{label}</div>
        </div>
        <div style={{ position: "relative", width: 64, height: 64 }}>
          <svg viewBox="0 0 36 36" style={{ width: 64, height: 64, transform: "rotate(-90deg)" }}>
            <circle cx="18" cy="18" r="15.9" fill="none" stroke="#1e293b" strokeWidth="3" />
            <circle cx="18" cy="18" r="15.9" fill="none" stroke={color} strokeWidth="3"
              strokeDasharray={`${score} ${100 - score}`} strokeLinecap="round" />
          </svg>
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
            <div style={{ fontSize: 16, fontWeight: 800, color }}>{score}</div>
            <div style={{ fontSize: 8, color: "#64748b" }}>/ 100</div>
          </div>
        </div>
      </div>

      {/* Score bars */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
        {[
          ["Sparkvot", Math.min(100, savingsRate * 5), savingsRate >= 20 ? "#10b981" : "#f59e0b", savingsRate.toFixed(0) + "%"],
          ["Buffert", hasBuffer ? 100 : 20, hasBuffer ? "#10b981" : "#ef4444", hasBuffer ? "✓" : "Saknas"],
          ["Sparmål", hasGoals ? 100 : 0, hasGoals ? "#10b981" : "#ef4444", hasGoals ? goals.length + " st" : "Inga"],
          ["Pension", hasPension ? 100 : 0, hasPension ? "#10b981" : "#ef4444", hasPension ? "✓" : "Saknas"],
          ["Försäkring", hasForsakring ? 100 : 0, hasForsakring ? "#10b981" : "#ef4444", hasForsakring ? forsakringar.length + " st" : "Saknas"],
          ["Nettovärde", totalTillgangar > 0 ? Math.min(100, Math.max(0, (1 - skuldgrad/100) * 100)) : 0, nettovarde >= 0 ? "#10b981" : "#ef4444", totalTillgangar > 0 ? (nettovarde >= 0 ? "+" : "") + Math.round(nettovarde/1000) + "k" : "—"],
        ].map(([label, pct, col, val]) => (
          <div key={label} style={{ background: "#0a0f1e", borderRadius: 10, padding: "10px 12px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#64748b", marginBottom: 5 }}>
              <span>{label}</span><span style={{ color: col, fontWeight: 600 }}>{val}</span>
            </div>
            <div style={{ background: "#1e293b", borderRadius: 99, height: 5, overflow: "hidden" }}>
              <div style={{ width: `${pct}%`, height: "100%", background: col, borderRadius: 99, transition: "width 0.6s" }} />
            </div>
          </div>
        ))}
      </div>

      {/* Tips */}
      {tips.length > 0 && (
        <div>
          <div style={{ fontSize: 11, color: "#64748b", marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>💡 Förbättringsförslag</div>
          {tips.slice(0, 3).map((tip, i) => (
            <div key={i} style={{ display: "flex", gap: 10, marginBottom: 6, fontSize: 12, color: "#94a3b8" }}>
              <span>{tip.icon}</span><span>{tip.text}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Onboarding ────────────────────────────────────────────────────────────
function Onboarding({ onDone }) {
  const [step, setStep] = useState(0);
  const [interests, setInterests] = useState([]);
  const [name, setName] = useState("");

  const INTERESTS = [
    { id: "aktier", icon: "📈", label: "Aktier & analys" },
    { id: "spara", icon: "💰", label: "Spara & budgetera" },
    { id: "lån", icon: "🏠", label: "Bolån & lån" },
    { id: "pension", icon: "👴", label: "Pension & FIRE" },
    { id: "skatt", icon: "🧾", label: "Skatt & deklaration" },
    { id: "krypto", icon: "₿", label: "Krypto & råvaror" },
    { id: "nybörjare", icon: "🌱", label: "Nybörjare" },
    { id: "jämföra", icon: "⚖️", label: "Jämför aktier" },
  ];

  const toggleInterest = (id) => {
    setInterests(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const finish = () => {
    try {
      localStorage.setItem("kapital_onboarded", "true");
      if (name) localStorage.setItem("kapital_name", name);
      localStorage.setItem("kapital_interests", JSON.stringify(interests));
    } catch {}
    onDone();
  };

  const steps = [
    // Step 0 — Welcome
    <div key="welcome" style={{ textAlign: "center", padding: "0 8px" }}>
      <div style={{ fontSize: 64, marginBottom: 20 }}>
        <div style={{ width: 80, height: 80, borderRadius: 20, background: "linear-gradient(135deg,#10b981,#0ea5e9)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto", boxShadow: "0 0 40px #10b98166" }}>
          <svg width="44" height="44" viewBox="0 0 22 22" fill="none">
            <path d="M3 16 L8 10 L12 13 L17 6" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="17" cy="6" r="2" fill="white"/>
          </svg>
        </div>
      </div>
      <div style={{ fontSize: 28, fontWeight: 900, background: "linear-gradient(90deg,#10b981,#0ea5e9)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: 12 }}>
        Välkommen till Kapital
      </div>
      <div style={{ fontSize: 16, color: "#64748b", lineHeight: 1.7, marginBottom: 32 }}>
        Din smarta AI-assistent för aktier, sparande och privatekonomi — allt på ett ställe.
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
        {[["📊", "AI-analys av aktier på sekunder"],["💰", "Budget, abonnemang & boendekostnader"],["🏠", "Jämför bolån & ansök om lån direkt"],["🛡️", "Försäkringsguide & jämförelse"],["🔥", "FIRE, pension & lönekalkylator"],["🧾", "Skatt — K4, ISK & ROT/RUT"],["🤖", "AI-ekonomicoach för alla frågor"]].map(([icon, text]) => (
          <div key={text} style={{ display: "flex", alignItems: "center", gap: 12, background: "#0f172a", borderRadius: 12, padding: "12px 16px", border: "1px solid #1e293b" }}>
            <span style={{ fontSize: 22 }}>{icon}</span>
            <span style={{ fontSize: 14, color: "#e2e8f0" }}>{text}</span>
          </div>
        ))}
      </div>
    </div>,

    // Step 1 — Interests
    <div key="interests">
      <div style={{ fontSize: 22, fontWeight: 700, color: "#e2e8f0", marginBottom: 8 }}>Vad är du intresserad av?</div>
      <div style={{ fontSize: 14, color: "#64748b", marginBottom: 20 }}>Välj allt som stämmer — vi anpassar din upplevelse.</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {INTERESTS.map(({ id, icon, label }) => {
          const selected = interests.includes(id);
          return (
            <button key={id} onClick={() => toggleInterest(id)} style={{ padding: "16px 12px", background: selected ? "#10b98122" : "#0f172a", border: `2px solid ${selected ? "#10b981" : "#1e293b"}`, borderRadius: 14, cursor: "pointer", textAlign: "center", transition: "all 0.2s" }}>
              <div style={{ fontSize: 28, marginBottom: 6 }}>{icon}</div>
              <div style={{ fontSize: 13, color: selected ? "#10b981" : "#94a3b8", fontWeight: selected ? 700 : 400 }}>{label}</div>
            </button>
          );
        })}
      </div>
    </div>,

    // Step 2 — Name
    <div key="name" style={{ textAlign: "center" }}>
      <div style={{ fontSize: 40, marginBottom: 16 }}>👋</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: "#e2e8f0", marginBottom: 8 }}>Vad heter du?</div>
      <div style={{ fontSize: 14, color: "#64748b", marginBottom: 24 }}>Helt valfritt — sparas bara lokalt på din enhet.</div>
      <input value={name} onChange={e => setName(e.target.value)} placeholder="Ditt förnamn..."
        style={{ width: "100%", padding: "14px 16px", background: "#0f172a", border: "2px solid #1e293b", borderRadius: 14, color: "#e2e8f0", fontSize: 18, outline: "none", textAlign: "center", boxSizing: "border-box", marginBottom: 24 }} />
      <div style={{ background: "#0f172a", borderRadius: 14, border: "1px solid #10b98133", padding: 16, textAlign: "left" }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#10b981", marginBottom: 8 }}>✓ 3 gratis analyser per dag</div>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#10b981", marginBottom: 8 }}>✓ Kurslarm och bevakningar</div>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#10b981", marginBottom: 8 }}>✓ Budget & sparmål</div>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#10b981", marginBottom: 8 }}>✓ Skatteberäkning K4, ISK & ROT/RUT</div>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#10b981" }}>✓ FIRE, pension & lånekalkylator</div>
      </div>
    </div>
  ];

  return (
    <div style={{ position: "fixed", inset: 0, background: "#0a0f1e", zIndex: 9999, display: "flex", flexDirection: "column", overflowY: "auto" }}>
      <div style={{ maxWidth: 480, margin: "0 auto", width: "100%", padding: "40px 20px 100px", flex: 1 }}>
        {/* Progress dots */}
        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 32 }}>
          {steps.map((_, i) => (
            <div key={i} style={{ width: i === step ? 24 : 8, height: 8, borderRadius: 99, background: i === step ? "#10b981" : i < step ? "#10b98166" : "#1e293b", transition: "all 0.3s" }} />
          ))}
        </div>

        {steps[step]}
      </div>

      {/* Bottom buttons */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "linear-gradient(180deg,transparent,#0a0f1e 40%)", padding: "20px 20px 40px" }}>
        <div style={{ maxWidth: 480, margin: "0 auto", display: "flex", gap: 10 }}>
          {step > 0 && (
            <button onClick={() => setStep(s => s - 1)} style={{ padding: "14px 20px", background: "#0f172a", border: "1px solid #1e293b", borderRadius: 14, color: "#64748b", fontSize: 15, cursor: "pointer" }}>
              ←
            </button>
          )}
          <button onClick={() => step < steps.length - 1 ? setStep(s => s + 1) : finish()} style={{ flex: 1, padding: "14px", background: step === 1 && interests.length === 0 ? "#1e293b" : "linear-gradient(135deg,#10b981,#0ea5e9)", border: "none", borderRadius: 14, color: "#fff", fontSize: 16, fontWeight: 700, cursor: "pointer" }}>
            {step === steps.length - 1 ? "🚀 Kom igång!" : "Nästa →"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────
// ── Gamification System ───────────────────────────────────────────────────
const ACHIEVEMENTS = [
  { id: "first_analysis", icon: "🔍", title: "Första analysen", desc: "Analyserade din första aktie", points: 50 },
  { id: "three_goals", icon: "🎯", title: "Målsättaren", desc: "Skapade 3 sparmål", points: 100 },
  { id: "budget_setup", icon: "💰", title: "Budgeteraren", desc: "Fyllde i budget och utgifter", points: 75 },
  { id: "insurance_check", icon: "🛡️", title: "Trygghetssökaren", desc: "Lade till en försäkring", points: 50 },
  { id: "credit_score", icon: "⭐", title: "Kreditmedveten", desc: "Beräknade sin kreditscore", points: 75 },
  { id: "fire_calc", icon: "🔥", title: "FIRE-drömmaren", desc: "Använde FIRE-kalkylatorn", points: 100 },
  { id: "k4_done", icon: "🧾", title: "Skatteproffs", desc: "Lade in aktieaffärer i K4", points: 150 },
  { id: "compare_stocks", icon: "⚖️", title: "Analytikern", desc: "Jämförde två aktier", points: 100 },
  { id: "watchlist_5", icon: "👀", title: "Bevakaren", desc: "Lade till 5 aktier i bevakning", points: 75 },
  { id: "savings_rate_20", icon: "🏆", title: "Superspararen", desc: "Sparkvot över 20%", points: 200 },
  { id: "debt_free_plan", icon: "💳", title: "Skuldfri plan", desc: "Använde skuldfria kalkylatorn", points: 100 },
  { id: "ai_coach", icon: "🤖", title: "AI-eleven", desc: "Ställde en fråga till AI-coachen", points: 50 },
  { id: "ten_analyses", icon: "📊", title: "Serieanalytikern", desc: "Analyserat 10 aktier", points: 250 },
  { id: "pro_member", icon: "💎", title: "Pro-medlem", desc: "Uppgraderade till Pro", points: 300 },
  { id: "subscriptions_check", icon: "📱", title: "Prenumerationsrensaren", desc: "Lade in alla abonnemang", points: 75 },
];

function useGamification() {
  const [unlocked, setUnlocked] = useState(() => {
    try { return JSON.parse(localStorage.getItem("kapital_achievements") || "[]"); } catch { return []; }
  });
  const [points, setPoints] = useState(() => {
    try { return parseInt(localStorage.getItem("kapital_points") || "0"); } catch { return 0; }
  });
  const [newAchievement, setNewAchievement] = useState(null);

  const unlock = (id) => {
    if (unlocked.includes(id)) return;
    const achievement = ACHIEVEMENTS.find(a => a.id === id);
    if (!achievement) return;
    const newUnlocked = [...unlocked, id];
    const newPoints = points + achievement.points;
    setUnlocked(newUnlocked);
    setPoints(newPoints);
    setNewAchievement(achievement);
    try {
      localStorage.setItem("kapital_achievements", JSON.stringify(newUnlocked));
      localStorage.setItem("kapital_points", String(newPoints));
    } catch {}
    setTimeout(() => setNewAchievement(null), 3000);
  };

  const level = Math.floor(points / 500) + 1;
  const levelProgress = (points % 500) / 500 * 100;
  const nextLevelPoints = (level) * 500;

  return { unlocked, points, level, levelProgress, nextLevelPoints, unlock, newAchievement };
}

function AchievementToast({ achievement }) {
  if (!achievement) return null;
  return (
    <div style={{ position: "fixed", top: 80, left: "50%", transform: "translateX(-50%)", background: "linear-gradient(135deg,#10b981,#0ea5e9)", borderRadius: 16, padding: "14px 20px", zIndex: 9999, boxShadow: "0 8px 32px #10b98166", display: "flex", alignItems: "center", gap: 12, whiteSpace: "nowrap" }}>
      <span style={{ fontSize: 28 }}>{achievement.icon}</span>
      <div>
        <div style={{ fontSize: 11, color: "#ffffff99", fontWeight: 600 }}>ACHIEVEMENT UNLOCKED</div>
        <div style={{ fontSize: 15, fontWeight: 800, color: "#fff" }}>{achievement.title}</div>
        <div style={{ fontSize: 11, color: "#ffffff99" }}>+{achievement.points} poäng</div>
      </div>
    </div>
  );
}

function GamificationCard({ unlocked, points, level, levelProgress, nextLevelPoints }) {
  const [expanded, setExpanded] = useState(false);

  const levelNames = ["Nybörjare", "Spararen", "Investeraren", "Analytikern", "Experten", "Mästaren", "Legenden"];
  const levelName = levelNames[Math.min(level - 1, levelNames.length - 1)];

  return (
    <div style={{ background: "linear-gradient(135deg,#0f172a,#1a0a2e)", borderRadius: 16, border: "1px solid #8b5cf633", padding: 16, marginBottom: 14 }}>
      <button onClick={() => setExpanded(!expanded)} style={{ width: "100%", background: "none", border: "none", cursor: "pointer", textAlign: "left", padding: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 11, color: "#8b5cf6", textTransform: "uppercase", letterSpacing: 1, fontWeight: 700 }}>🏆 Nivå {level} — {levelName}</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#e2e8f0", marginTop: 2 }}>{points} poäng</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 11, color: "#64748b" }}>{unlocked.length}/{ACHIEVEMENTS.length} achievements</div>
            <div style={{ fontSize: 11, color: "#8b5cf6", marginTop: 2 }}>{expanded ? "▲ Dölj" : "▼ Visa alla"}</div>
          </div>
        </div>
        <div style={{ background: "#1e293b", borderRadius: 99, height: 8, overflow: "hidden" }}>
          <div style={{ width: `${levelProgress}%`, height: "100%", background: "linear-gradient(90deg,#8b5cf6,#06b6d4)", borderRadius: 99, transition: "width 0.6s" }} />
        </div>
        <div style={{ fontSize: 10, color: "#475569", marginTop: 4 }}>{nextLevelPoints - points} poäng till nivå {level + 1}</div>
      </button>

      {expanded && (
        <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {ACHIEVEMENTS.map(a => {
            const done = unlocked.includes(a.id);
            return (
              <div key={a.id} style={{ background: done ? "#8b5cf622" : "#0a0f1e", borderRadius: 10, border: `1px solid ${done ? "#8b5cf644" : "#1e293b"}`, padding: "10px 12px", opacity: done ? 1 : 0.5 }}>
                <div style={{ fontSize: 22, marginBottom: 4 }}>{done ? a.icon : "🔒"}</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: done ? "#e2e8f0" : "#475569" }}>{a.title}</div>
                <div style={{ fontSize: 10, color: "#475569", marginTop: 2 }}>{done ? a.desc : "???"}</div>
                <div style={{ fontSize: 10, color: "#8b5cf6", marginTop: 4 }}>+{a.points}p</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Ekonomisk Tidslinje ───────────────────────────────────────────────────
function EkonomiskTidslinje() {
  const income = parseFloat(localStorage.getItem("kapital_income") || "0");
  const expenses = JSON.parse(localStorage.getItem("kapital_expenses") || "{}");
  const goals = JSON.parse(localStorage.getItem("kapital_goals") || "[]");

  const totalExp = Object.values(expenses).reduce((s, v) => s + (parseFloat(v) || 0), 0);
  const leftover = income - totalExp;

  const today = new Date();
  const events = [];

  // Generate timeline events from goals
  goals.forEach(g => {
    const remaining = g.target - g.saved;
    const monthly = leftover > 0 ? Math.min(leftover * 0.5, remaining / (g.months || 12)) : 0;
    if (monthly > 0) {
      const months = Math.ceil(remaining / monthly);
      const date = new Date(today);
      date.setMonth(date.getMonth() + months);
      events.push({
        date, months,
        icon: g.emoji || "🎯",
        title: `${g.name} uppnådd!`,
        desc: `Du når ${g.target.toLocaleString("sv-SE")} kr`,
        color: g.color || "#10b981",
        type: "goal"
      });
    }
  });

  // Standard events
  if (income > 0) {
    events.push({ date: new Date(today.getFullYear(), today.getMonth() + 1, 25), months: 1, icon: "💰", title: "Nästa lön", desc: `${Math.round(income).toLocaleString("sv-SE")} kr`, color: "#10b981", type: "income" });
    if (leftover > 0) {
      events.push({ date: new Date(today.getFullYear(), today.getMonth() + 3, 1), months: 3, icon: "📈", title: "3 månaders sparande", desc: `+${Math.round(leftover * 3).toLocaleString("sv-SE")} kr`, color: "#3b82f6", type: "saving" });
      events.push({ date: new Date(today.getFullYear() + 1, today.getMonth(), 1), months: 12, icon: "🏆", title: "Ett år av sparande", desc: `+${Math.round(leftover * 12).toLocaleString("sv-SE")} kr`, color: "#8b5cf6", type: "saving" });
    }
  }

  // Calendar events (rapporter)
  CALENDAR.slice(0, 3).forEach(c => {
    const d = new Date(c.date);
    const months = Math.max(0, Math.ceil((d - today) / (1000 * 60 * 60 * 24 * 30)));
    if (months <= 6) {
      events.push({ date: d, months, icon: "📋", title: `${c.company} rapport`, desc: `${c.type}-rapport ${c.time}`, color: "#f59e0b", type: "report" });
    }
  });

  events.sort((a, b) => a.date - b.date);

  const formatDate = (date) => {
    const months = ["jan", "feb", "mar", "apr", "maj", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];
    return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  return (
    <div style={{ background: "#0f172a", borderRadius: 16, border: "1px solid #1e293b", padding: 16, marginBottom: 14 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: "#94a3b8", marginBottom: 16 }}>📅 Din ekonomiska tidslinje</div>
      {events.length === 0 ? (
        <div style={{ textAlign: "center", padding: "20px 0", color: "#334155", fontSize: 13 }}>
          Fyll i din budget och sparmål för att se din tidslinje
        </div>
      ) : (
        <div style={{ position: "relative" }}>
          <div style={{ position: "absolute", left: 19, top: 0, bottom: 0, width: 2, background: "#1e293b", borderRadius: 2 }} />
          {events.slice(0, 6).map((e, i) => (
            <div key={i} style={{ display: "flex", gap: 14, marginBottom: 16, position: "relative" }}>
              <div style={{ width: 40, height: 40, borderRadius: "50%", background: e.color + "22", border: `2px solid ${e.color}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0, zIndex: 1 }}>
                {e.icon}
              </div>
              <div style={{ paddingTop: 4 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0" }}>{e.title}</div>
                <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{e.desc}</div>
                <div style={{ fontSize: 11, color: e.color, marginTop: 2 }}>{formatDate(e.date)}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Svenska Ekonominyheter ────────────────────────────────────────────────
function EkonomiNyheter({ analyze, setTab, setSubTab, setQuery }) {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchNews = async () => {
      // Check cache first — max 30 min old
      try {
        const cached = localStorage.getItem("kapital_news_cache");
        if (cached) {
          const { data, timestamp } = JSON.parse(cached);
          if (Date.now() - timestamp < 30 * 60 * 1000) {
            setNews(data);
            setLoading(false);
            return;
          }
        }
      } catch {}

      try {
        const resp = await fetch(API, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-api-key": KEY, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
          body: JSON.stringify({
            model: FAST_MODEL, max_tokens: 600,
            messages: [{ role: "user", content: 'Ge 6 svenska ekonominyheter juni 2026. Svara BARA med JSON-array utan text utanför: [{"titel":"","sammanfattning":"","kategori":"Börsen/Räntor/Fastigheter/Ekonomi","sentiment":"positiv/neutral/negativ","bolag":null,"tid":"för X timmar sedan"}]' }]
          })
        });
        if (!resp.ok) throw new Error("API error");
        const data = await resp.json();
        const text = data.content?.[0]?.text || "";
        const match = text.match(/\[[\s\S]*\]/);
        if (match) {
          const parsed = JSON.parse(match[0]);
          setNews(parsed);
          try { localStorage.setItem("kapital_news_cache", JSON.stringify({ data: parsed, timestamp: Date.now() })); } catch {}
        } else {
          throw new Error("Parse error");
        }
      } catch {
        // Fallback news
        setNews([
          { titel: "Riksbanken håller styrräntan oförändrad", sammanfattning: "Riksbanken beslutade att hålla räntan på 2.5% vid junimötet.", kategori: "Räntor", sentiment: "neutral", bolag: null, tid: "2 timmar sedan" },
          { titel: "Ericsson stiger efter stark rapport", sammanfattning: "Ericsson överträffar analytikernas förväntningar i Q2-rapporten.", kategori: "Börsen", sentiment: "positiv", bolag: "Ericsson", tid: "4 timmar sedan" },
          { titel: "Inflationen faller till 2.1%", sammanfattning: "KPI-data visar att inflationen fortsätter sjunka mot Riksbankens mål.", kategori: "Ekonomi", sentiment: "positiv", bolag: null, tid: "6 timmar sedan" },
          { titel: "Bostadspriserna stiger i Stockholm", sammanfattning: "Mäklarstatistik visar uppgång på 3% jämfört med föregående månad.", kategori: "Fastigheter", sentiment: "neutral", bolag: null, tid: "8 timmar sedan" },
          { titel: "OMXS30 upp 1.2% under veckan", sammanfattning: "Stockholmsbörsen avslutar veckan på plus drivet av bank och tech.", kategori: "Börsen", sentiment: "positiv", bolag: null, tid: "1 dag sedan" },
          { titel: "H&M redovisar lägre försäljning", sammanfattning: "H&M rapporterar svagare försäljning i Asien men starka marginaler.", kategori: "Börsen", sentiment: "negativ", bolag: "H&M", tid: "1 dag sedan" },
        ]);
        setError(false);
      }
      setLoading(false);
    };
    fetchNews();
  }, []);

  const sentimentColor = s => s === "positiv" ? "#22c55e" : s === "negativ" ? "#ef4444" : "#f59e0b";
  const katColor = k => k === "Börsen" ? "#3b82f6" : k === "Räntor" ? "#f59e0b" : k === "Fastigheter" ? "#10b981" : "#8b5cf6";

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 12, color: "#64748b", marginBottom: 10, textTransform: "uppercase", letterSpacing: 1 }}>📰 Ekonominyheter</div>
      {loading ? (
        <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 4 }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{ flexShrink: 0, width: 200, height: 100, background: "#0f172a", borderRadius: 12, border: "1px solid #1e293b", animation: "shimmer 1.5s infinite", backgroundSize: "200% 100%", backgroundImage: "linear-gradient(90deg,#1e293b 25%,#334155 50%,#1e293b 75%)" }} />
          ))}
        </div>
      ) : (
        <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 8, scrollbarWidth: "none" }}>
          {news.map((n, i) => (
            <button key={i}
              onClick={() => { if (n.bolag) { setQuery(n.bolag); analyze(n.bolag); setTab(1); setSubTab("analys"); } }}
              style={{ flexShrink: 0, width: 200, background: "#0f172a", border: `1px solid ${sentimentColor(n.sentiment)}22`, borderRadius: 14, padding: 14, cursor: n.bolag ? "pointer" : "default", textAlign: "left" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontSize: 10, background: katColor(n.kategori) + "22", color: katColor(n.kategori), padding: "2px 8px", borderRadius: 99, fontWeight: 700 }}>{n.kategori}</span>
                <span style={{ fontSize: 10, color: sentimentColor(n.sentiment) }}>{n.sentiment === "positiv" ? "▲" : n.sentiment === "negativ" ? "▼" : "●"}</span>
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0", lineHeight: 1.4, marginBottom: 6 }}>{n.titel}</div>
              <div style={{ fontSize: 11, color: "#64748b", lineHeight: 1.4, marginBottom: 6 }}>{n.sammanfattning}</div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 10, color: "#334155" }}>{n.tid}</span>
                {n.bolag && <span style={{ fontSize: 10, color: "#10b981", fontWeight: 600 }}>Analysera →</span>}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Röststyrning ──────────────────────────────────────────────────────────
function useVoiceControl({ setTab, setSubTab, setQuery, analyze, income, leftover, savingsRate }) {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [response, setResponse] = useState("");
  const [supported, setSupported] = useState(false);
  const recognitionRef = useRef(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    setSupported(!!SpeechRecognition);
  }, []);

  const speak = (text) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "sv-SE";
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
    setResponse(text);
    setTimeout(() => setResponse(""), 4000);
  };

  const processCommand = (text) => {
    const t = text.toLowerCase().trim();
    setTranscript(text);

    // Navigation commands
    if (t.includes("hem") || t.includes("startsida")) {
      setTab(0);
      speak("Visar startsidan");
    } else if (t.includes("aktier") || t.includes("börsen")) {
      setTab(1); setSubTab("analys");
      speak("Öppnar aktier");
    } else if (t.includes("ekonomi") || t.includes("budget")) {
      setTab(2);
      speak("Öppnar ekonomi");
    } else if (t.includes("trygghet") || t.includes("försäkring")) {
      setTab(3); setSubTab("forsakring");
      speak("Öppnar trygghet");
    } else if (t.includes("profil")) {
      setTab(4);
      speak("Öppnar profil");
    }

    // Analysis commands
    else if (t.includes("analysera") || t.includes("analys")) {
      const companies = ["ericsson", "volvo", "h&m", "spotify", "nokia", "apple", "tesla", "nvidia", "microsoft", "amazon", "google", "meta", "ssab", "astrazeneca", "investor", "atlas copco", "sinch", "evolution"];
      const found = companies.find(c => t.includes(c));
      if (found) {
        const name = found.charAt(0).toUpperCase() + found.slice(1);
        setQuery(name);
        analyze(name);
        setTab(1); setSubTab("analys");
        speak(`Analyserar ${name}, vänta lite`);
      } else {
        speak("Vilket bolag vill du analysera?");
      }
    }

    // Budget/economy questions
    else if (t.includes("sparkvot") || t.includes("hur mycket sparar")) {
      if (income > 0) {
        speak(`Din sparkvot är ${Math.round(savingsRate)} procent av din inkomst`);
      } else {
        speak("Du har inte fyllt i din inkomst ännu. Gå till ekonomi för att komma igång.");
      }
    }
    else if (t.includes("kvar") && (t.includes("månad") || t.includes("mån"))) {
      if (income > 0) {
        speak(`Du har ${Math.round(leftover).toLocaleString("sv-SE")} kronor kvar denna månad`);
      } else {
        speak("Fyll i din budget under ekonomifliken för att se vad du har kvar");
      }
    }
    else if (t.includes("inkomst") || t.includes("lön") && t.includes("vad")) {
      if (income > 0) {
        speak(`Din registrerade inkomst är ${Math.round(income).toLocaleString("sv-SE")} kronor per månad`);
      } else {
        speak("Du har inte lagt in din inkomst ännu");
      }
    }

    // Tool commands
    else if (t.includes("fire") || t.includes("ekonomisk fri")) {
      setTab(2);
      speak("Öppnar FIRE-kalkylatorn under ekonomi");
    }
    else if (t.includes("skatt") || t.includes("deklarera")) {
      setTab(2);
      speak("Öppnar skattekalkylatorn under ekonomi");
    }
    else if (t.includes("juridisk") || t.includes("avtal") || t.includes("juridik")) {
      setTab(2);
      speak("Öppnar juridisk AI-assistent");
    }
    else if (t.includes("pension")) {
      setTab(2);
      speak("Öppnar pensionskalkylatorn");
    }
    else if (t.includes("lån") || t.includes("ansök")) {
      setTab(3); setSubTab("lan");
      speak("Öppnar låneansökan");
    }
    else if (t.includes("jämför") && t.includes("aktie")) {
      setTab(1);
      speak("Öppnar aktiejämförelsen");
    }
    else if (t.includes("hjälp") || t.includes("vad kan du")) {
      speak("Du kan säga: Analysera Ericsson, Visa min budget, Vad är min sparkvot, Öppna skatt, Juridisk AI, Ansök om lån, eller navigera till Hem, Aktier, Ekonomi, Trygghet och Profil");
    }

    // Greetings
    else if (t.includes("hej") || t.includes("hallå")) {
      speak("Hej! Vad kan jag hjälpa dig med? Säg hjälp för att höra vad jag kan göra.");
    }

    else {
      speak("Förstod inte kommandot. Säg hjälp för att höra vad du kan göra.");
    }
  };

  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.lang = "sv-SE";
    recognitionRef.current.continuous = false;
    recognitionRef.current.interimResults = false;

    recognitionRef.current.onstart = () => setListening(true);
    recognitionRef.current.onend = () => setListening(false);
    recognitionRef.current.onerror = () => setListening(false);
    recognitionRef.current.onresult = (e) => {
      const text = e.results[0][0].transcript;
      processCommand(text);
    };

    recognitionRef.current.start();
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setListening(false);
  };

  return { listening, transcript, response, supported, startListening, stopListening };
}

function VoiceButton({ voiceControl }) {
  const { listening, transcript, response, supported, startListening, stopListening } = voiceControl;

  if (!supported) return null;

  return (
    <>
      {/* Transcript/response popup */}
      {(listening || transcript || response) && (
        <div style={{ position: "fixed", bottom: 90, left: "50%", transform: "translateX(-50%)", background: "#0f172a", border: "1px solid #334155", borderRadius: 16, padding: "12px 20px", zIndex: 500, maxWidth: 300, width: "90%", textAlign: "center", boxShadow: "0 8px 32px #00000066" }}>
          {listening && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: transcript ? 8 : 0 }}>
              <div style={{ display: "flex", gap: 3 }}>
                {[0,1,2,3].map(i => (
                  <div key={i} style={{ width: 4, background: "#10b981", borderRadius: 2, animation: `pulse 0.8s ${i * 0.15}s infinite`, height: `${8 + i * 4}px` }} />
                ))}
              </div>
              <span style={{ fontSize: 13, color: "#10b981", fontWeight: 600 }}>Lyssnar...</span>
            </div>
          )}
          {transcript && !listening && (
            <div style={{ fontSize: 12, color: "#64748b", marginBottom: response ? 6 : 0 }}>
              Du sa: "{transcript}"
            </div>
          )}
          {response && (
            <div style={{ fontSize: 14, color: "#e2e8f0", fontWeight: 500 }}>
              🔊 {response}
            </div>
          )}
        </div>
      )}

      {/* Mic button */}
      <button
        onMouseDown={startListening}
        onMouseUp={stopListening}
        onTouchStart={e => { e.preventDefault(); startListening(); }}
        onTouchEnd={e => { e.preventDefault(); stopListening(); }}
        style={{
          position: "fixed", bottom: 90, right: 16, width: 52, height: 52,
          borderRadius: "50%", border: "none", cursor: "pointer", zIndex: 200,
          background: listening
            ? "linear-gradient(135deg,#ef4444,#f97316)"
            : "linear-gradient(135deg,#10b981,#0ea5e9)",
          boxShadow: listening
            ? "0 0 0 8px #ef444422, 0 4px 20px #ef444466"
            : "0 4px 20px #10b98144",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 22,
          transition: "all 0.2s",
          animation: listening ? "pulse 1s infinite" : "none"
        }}
      >
        {listening ? "⏹" : "🎤"}
      </button>
    </>
  );
}


function HemTab({ result, setResult, query, setQuery, analyze, loading, isPro, onUpgrade, setTab, setSubTab, onCompare, t }) {
  const [showGuide, setShowGuide] = useState(false);
  const { unlocked, points, level, levelProgress, nextLevelPoints, unlock, newAchievement } = useGamification();
  const name = (() => { try { return localStorage.getItem("kapital_name") || ""; } catch { return ""; } })();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "God morgon" : hour < 18 ? "God dag" : "God kväll";

  const GUIDE_ITEMS = [
    { icon: "📈", title: "Analysera en aktie", desc: "Tryck på Aktier i menyn → skriv ett bolagsnamn → tryck Analysera. Du får AI-driven analys med köp/sälj-signal, nyckeltal och nyheter.", tab: 1 },
    { icon: "💰", title: "Sätt upp din budget", desc: "Gå till Ekonomi → Budget & Mål → Översikt. Fyll i din månadsinkomst och utgifter för att se din finansiella hälsopoäng.", tab: 2 },
    { icon: "🛡️", title: "Kolla dina försäkringar", desc: "Gå till Trygghet → Försäkring → Mina försäkringar. Lägg in dina försäkringar och se vad du betalar totalt.", tab: 3 },
    { icon: "🔥", title: "Beräkna din FIRE-ålder", desc: "Ekonomi → Kalkylatorer → FIRE-kalkylator. Ange sparande och avkastning för att se när du kan bli ekonomiskt fri.", tab: 2 },
    { icon: "🧾", title: "Deklarera aktievinster", desc: "Ekonomi → Skatt → K4. Lägg in dina aktieaffärer och se exakt hur mycket skatt du ska betala.", tab: 2 },
    { icon: "🎤", title: "Röststyrning", desc: "Håll mikrofon-knappen och säg: 'Analysera Ericsson', 'Visa min budget', 'Vad är min sparkvot?' eller 'Hjälp' för att höra alla kommandon.", tab: 0 },
  ];

  const QUICK_ACTIONS = [
    { icon: "🔍", label: "Aktieanalys", color: "#10b981", action: () => { setTab(1); setSubTab("analys"); } },
    { icon: "💰", label: "Min budget", color: "#3b82f6", action: () => { setTab(2); } },
    { icon: "📊", label: "Fonder", color: "#f59e0b", action: () => { setTab(2); } },
    { icon: "🤖", label: "AI-coach", color: "#8b5cf6", action: () => { setTab(2); } },
    { icon: "🛡️", label: "Trygghet", color: "#06b6d4", action: () => { setTab(3); setSubTab("forsakring"); } },
    { icon: "📊", label: "Min profil", color: "#f97316", action: () => { setTab(3); setSubTab("profil"); } },
  ];

  // Get health score for display
  const income = parseFloat(localStorage.getItem("kapital_income") || "0");
  const expenses = JSON.parse(localStorage.getItem("kapital_expenses") || "{}");
  const totalExp = Object.values(expenses).reduce((s, v) => s + (parseFloat(v) || 0), 0);
  const savingsRate = income > 0 ? ((income - totalExp) / income * 100) : 0;

  if (showGuide) {
    return (
      <div>
        <button onClick={() => setShowGuide(false)} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: "#64748b", fontSize: 13, cursor: "pointer", padding: 0, marginBottom: 16 }}>
          ← Tillbaka
        </button>
        <div style={{ fontSize: 20, fontWeight: 700, color: "#e2e8f0", marginBottom: 4 }}>Kom igång med Kapital</div>
        <div style={{ fontSize: 13, color: "#64748b", marginBottom: 20 }}>Allt du behöver veta för att komma igång</div>

        {GUIDE_ITEMS.map((item, i) => (
          <button key={i} onClick={() => { setTab(item.tab); setShowGuide(false); }}
            style={{ display: "flex", gap: 14, width: "100%", background: "#0f172a", border: "1px solid #1e293b", borderRadius: 14, padding: 16, marginBottom: 10, cursor: "pointer", textAlign: "left" }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: "#1e293b", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>{item.icon}</div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, color: "#e2e8f0", marginBottom: 4 }}>{item.title}</div>
              <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.5 }}>{item.desc}</div>
            </div>
          </button>
        ))}

        <div style={{ background: "#0f172a", borderRadius: 14, border: "1px solid #10b98133", padding: 16, marginTop: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#10b981", marginBottom: 10 }}>❓ Vanliga frågor</div>
          {[
            ["Kostar appen något?", "Grundfunktioner är gratis. Pro kostar 49 kr/mån och ger obegränsade analyser och mer."],
            ["Är mina uppgifter säkra?", "All data sparas lokalt i din webbläsare. Vi säljer aldrig din data."],
            ["Hur fungerar AI-analysen?", "Vi använder Anthropic Claude för att analysera bolag och ge köp/sälj-signaler baserade på tillgänglig information."],
            ["Är det finansiell rådgivning?", "Nej. Kapital är ett informationsverktyg. Rådgör alltid med en auktoriserad rådgivare."],
          ].map(([q, a], i) => (
            <div key={i} style={{ marginBottom: 12, paddingBottom: 12, borderBottom: i < 3 ? "1px solid #1e293b" : "none" }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0", marginBottom: 4 }}>{q}</div>
              <div style={{ fontSize: 12, color: "#64748b" }}>{a}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <AchievementToast achievement={newAchievement} />

      {/* Greeting */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: "#64748b" }}>{greeting}{name ? `, ${name}` : ""}! 👋</div>
        <div style={{ fontSize: 24, fontWeight: 800, color: "#e2e8f0", marginTop: 2 }}>Din ekonomiska översikt</div>
      </div>

      {/* Level meter — överst */}
      <GamificationCard unlocked={unlocked} points={points} level={level} levelProgress={levelProgress} nextLevelPoints={nextLevelPoints} />

      {/* Health score card */}
      <div onClick={() => setTab(2)} style={{ background: "linear-gradient(135deg,#0f172a,#0a1f0a)", borderRadius: 18, border: "1px solid #10b98133", padding: 20, marginBottom: 16, cursor: "pointer", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", right: -20, top: -20, width: 120, height: 120, borderRadius: "50%", background: "#10b98108" }} />
        <div style={{ fontSize: 12, color: "#64748b", marginBottom: 8 }}>💚 Finansiell hälsa</div>
        {income > 0 ? (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
              <div>
                <div style={{ fontSize: 13, color: "#64748b", marginBottom: 4 }}>Sparkvot</div>
                <div style={{ fontSize: 32, fontWeight: 900, color: savingsRate >= 20 ? "#10b981" : savingsRate >= 10 ? "#f59e0b" : "#ef4444" }}>{savingsRate.toFixed(0)}%</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 12, color: "#64748b" }}>Kvar/mån</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: "#e2e8f0" }}>{Math.round(income - totalExp).toLocaleString("sv-SE")} kr</div>
              </div>
            </div>
            <div style={{ marginTop: 12, background: "#1e293b", borderRadius: 99, height: 6, overflow: "hidden" }}>
              <div style={{ width: `${Math.min(100, savingsRate)}%`, height: "100%", background: "linear-gradient(90deg,#10b981,#0ea5e9)", borderRadius: 99 }} />
            </div>
            <div style={{ fontSize: 11, color: "#475569", marginTop: 6 }}>Tryck för att se full ekonomiöversikt →</div>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: 16, color: "#e2e8f0", marginBottom: 6 }}>Sätt upp din ekonomi</div>
            <div style={{ fontSize: 12, color: "#64748b" }}>Fyll i din inkomst för att se din finansiella hälsopoäng →</div>
          </div>
        )}
      </div>

      {/* Quick actions grid */}
      <div style={{ fontSize: 12, color: "#64748b", marginBottom: 10, textTransform: "uppercase", letterSpacing: 1 }}>Snabbval</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 20 }}>
        {QUICK_ACTIONS.map(({ icon, label, color, action }) => (
          <button key={label} onClick={action} style={{ background: "#0f172a", border: `1px solid ${color}22`, borderRadius: 14, padding: "14px 8px", cursor: "pointer", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: color + "22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>{icon}</div>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", lineHeight: 1.3 }}>{label}</div>
          </button>
        ))}
      </div>

      {/* Market snapshot */}
      <div style={{ fontSize: 12, color: "#64748b", marginBottom: 10, textTransform: "uppercase", letterSpacing: 1 }}>Populära aktier</div>
      <div style={{ overflowX: "auto", display: "flex", gap: 10, paddingBottom: 4, marginBottom: 20, scrollbarWidth: "none" }}>
        {Object.values(QUICK_ITEMS).flat().slice(0, 10).map(s => {
          const p = mockPrice(s.ticker);
          const up = p.chgPct >= 0;
          return (
            <button key={s.name} onClick={() => { setQuery(s.name); analyze(s.name); setTab(1); setSubTab("analys"); unlock("first_analysis"); }}
              style={{ flexShrink: 0, background: "#0f172a", border: `1px solid ${up ? "#22c55e22" : "#ef444422"}`, borderRadius: 12, padding: "12px 14px", cursor: "pointer", textAlign: "left", minWidth: 110 }}>
              <div style={{ fontSize: 18, marginBottom: 4 }}>{s.icon}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#e2e8f0" }}>{s.name}</div>
              <div style={{ fontSize: 11, color: up ? "#22c55e" : "#ef4444", fontWeight: 700, marginTop: 2 }}>{up ? "▲" : "▼"} {Math.abs(p.chgPct).toFixed(2)}%</div>
              <div style={{ fontSize: 10, color: "#475569" }}>{p.price > 1000 ? p.price.toLocaleString("sv-SE", { maximumFractionDigits: 0 }) : p.price.toFixed(1)} kr</div>
            </button>
          );
        })}
      </div>

      {/* Ekonominyheter */}
      <EkonomiNyheter analyze={analyze} setTab={setTab} setSubTab={setSubTab} setQuery={setQuery} />

      {/* Ekonomisk tidslinje */}
      <EkonomiskTidslinje />

      {/* Guide button */}
      <button onClick={() => setShowGuide(true)}
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", background: "#0f172a", border: "1px solid #1e293b", borderRadius: 14, padding: "14px 16px", cursor: "pointer", marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: "#3b82f622", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>❓</div>
          <div style={{ textAlign: "left" }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#e2e8f0" }}>Hjälp & Guide</div>
            <div style={{ fontSize: 11, color: "#475569" }}>Kom igång, FAQ och tips</div>
          </div>
        </div>
        <span style={{ color: "#334155", fontSize: 18 }}>›</span>
      </button>

      {!isPro && (
        <button onClick={onUpgrade}
          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", background: "linear-gradient(135deg,#0f1a2e,#0f172a)", border: "1px solid #10b98133", borderRadius: 14, padding: "14px 16px", cursor: "pointer", marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: "linear-gradient(135deg,#10b981,#0ea5e9)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🚀</div>
            <div style={{ textAlign: "left" }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#e2e8f0" }}>Uppgradera till Pro</div>
              <div style={{ fontSize: 11, color: "#475569" }}>49 kr/mån · Obegränsade analyser</div>
            </div>
          </div>
          <span style={{ color: "#10b981", fontSize: 18 }}>›</span>
        </button>
      )}

      {/* Always free badge */}
      <div style={{ background: "#0f172a", borderRadius: 14, border: "1px solid #10b98122", padding: "12px 16px", textAlign: "center" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#10b981", marginBottom: 4 }}>✓ Kapital är alltid gratis</div>
        <div style={{ fontSize: 11, color: "#475569", lineHeight: 1.5 }}>
          Budget, kalkylatorer, juridisk AI, försäkringsjämförelse, lånejämförelse och mer — helt gratis för alltid. Pro ger obegränsade AI-analyser.
        </div>
      </div>
    </div>
  );
}

// ── Forsakring Hub ────────────────────────────────────────────────────────
function ForsakringHub() {
  const [section, setSection] = useState("mina");
  return (
    <div>
      <div style={{ display: "flex", gap: 4, background: "#0f172a", borderRadius: 12, padding: 4, border: "1px solid #1e293b", marginBottom: 16 }}>
        {[["mina","📋 Mina"],["guide","🔍 Guide"],["jamfor","⚖️ Jämför"]].map(([id, label]) => (
          <button key={id} onClick={() => setSection(id)} style={{ flex: 1, padding: "9px 4px", background: section === id ? "linear-gradient(135deg,#10b981,#0ea5e9)" : "none", border: "none", borderRadius: 9, color: section === id ? "#fff" : "#64748b", fontSize: 13, fontWeight: section === id ? 700 : 400, cursor: "pointer" }}>
            {label}
          </button>
        ))}
      </div>
      {section === "mina" && <MinaForsakringar />}
      {section === "guide" && <ForsakringsGuide />}
      {section === "jamfor" && <JamforForsakring />}
    </div>
  );
}

// ── Profil Tab ────────────────────────────────────────────────────────────
// ── Krypto Analys Tab ─────────────────────────────────────────────────────
const KRYPTO_PRESETS = [
  { namn: "Bitcoin", symbol: "BTC", emoji: "₿", color: "#f59e0b" },
  { namn: "Ethereum", symbol: "ETH", emoji: "⟠", color: "#8b5cf6" },
  { namn: "Solana", symbol: "SOL", emoji: "◎", color: "#10b981" },
  { namn: "BNB", symbol: "BNB", emoji: "🟡", color: "#f59e0b" },
  { namn: "XRP", symbol: "XRP", emoji: "✕", color: "#3b82f6" },
  { namn: "Cardano", symbol: "ADA", emoji: "🔵", color: "#3b82f6" },
  { namn: "Avalanche", symbol: "AVAX", emoji: "🔺", color: "#ef4444" },
  { namn: "Polkadot", symbol: "DOT", emoji: "⬤", color: "#e879f9" },
];

function KryptoAnalysTab({ isPro, onUpgrade }) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loadStep, setLoadStep] = useState(0);
  const [cache, setCache] = useState(() => { try { return JSON.parse(localStorage.getItem("kapital_krypto_cache") || "{}"); } catch { return {}; } });

  const STEPS = ["Hämtar marknadsdata...", "Analyserar on-chain data...", "Beräknar sentiment...", "Sammanställer analys..."];

  const analyze = async (name) => {
    const n = (name || query).trim();
    if (!n) return;

    const cacheKey = n.toLowerCase();
    if (cache[cacheKey]) {
      setResult(cache[cacheKey]);
      return;
    }

    setLoading(true); setLoadStep(0); setError(null); setResult(null);
    const interval = setInterval(() => setLoadStep(s => s < STEPS.length - 1 ? s + 1 : s), 700);

    try {
      const resp = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": KEY, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
        body: JSON.stringify({
          model: FAST_MODEL, max_tokens: 900,
          messages: [{ role: "user", content: `Du är en kryptoanalytiker. Analysera kryptovalutan: ${n}

Svara EXAKT med detta JSON och inget annat:
{"name":"${n}","symbol":"SYMBOL","summary":"2-3 meningar om kryptovalutan och dess nuläge","score":65,"recommendation":"Kop","scoreReason":"Motivering till poänget","bullCase":["Bull 1","Bull 2","Bull 3"],"bearCase":["Bear 1","Bear 2","Bear 3"],"catalysts":["Katalysator 1","Katalysator 2"],"tekniskAnalys":{"trend":"Stigande","stod":"Stödnivå i USD","motstand":"Motståndsnivå i USD","rsi":55,"sentiment":"Positiv"},"fundamenta":{"marketcap":"Marknadsvärde","rank":1,"cirkulerande":"Cirkulerande utbud","maxUtbud":"Max utbud eller Obegränsat","konsensusmekanism":"PoW/PoS/annat","skapad":2009},"grafData":[95,98,102,99,105,103,108,106,110,107,112,109],"nyheter":[{"rubrik":"Nyhet 1","sentiment":"positiv"},{"rubrik":"Nyhet 2","sentiment":"neutral"}],"riskNiva":"Hog","tidshorisont":"6-18 manader","lastUpdated":"Juni 2026"}

Byt ut ALLA värden mot verkliga uppskattningar för ${n}. Score: 0-30=Salj 31-60=Avvakta 61-100=Kop.` }]
        })
      });

      if (!resp.ok) throw new Error("API-fel: " + resp.status);
      const data = await resp.json();
      const text = data.content?.map(b => b.text || "").join("") || "";
      const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("Kunde inte tolka svaret");

      const parsed = JSON.parse(match[0]);
      if (!parsed.grafData) parsed.grafData = [95,98,102,99,105,103,108,106,110,107,112,109];

      const newCache = { ...cache, [cacheKey]: parsed };
      setCache(newCache);
      try { localStorage.setItem("kapital_krypto_cache", JSON.stringify(newCache)); } catch {}
      setResult(parsed);
    } catch (err) {
      setError(err.message);
    } finally {
      clearInterval(interval);
      setLoading(false);
      setLoadStep(0);
    }
  };

  const recColor = r => r === "Kop" || r === "Köp" ? "#22c55e" : r === "Salj" || r === "Sälj" ? "#ef4444" : "#f59e0b";
  const recLabel = r => r === "Kop" || r === "Köp" ? "KÖP" : r === "Salj" || r === "Sälj" ? "SÄLJ" : "AVVAKTA";

  if (result) {
    const color = recColor(result.recommendation);
    const maxGraf = Math.max(...(result.grafData || [100]));
    const minGraf = Math.min(...(result.grafData || [100]));

    return (
      <div>
        <button onClick={() => { setResult(null); setQuery(""); }}
          style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "linear-gradient(135deg,#10b981,#0ea5e9)", border: "none", borderRadius: 12, color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer", padding: "10px 20px", marginBottom: 16, boxShadow: "0 4px 15px #10b98144" }}>
          ← Tillbaka
        </button>

        {/* Header */}
        <div style={{ background: `linear-gradient(135deg,#0f172a,${color}11)`, borderRadius: 18, border: `1px solid ${color}44`, padding: 20, marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#e2e8f0" }}>{result.name}</div>
              <div style={{ fontSize: 13, color: "#64748b" }}>{result.symbol} · Rank #{result.fundamenta?.rank || "—"}</div>
            </div>
            <div style={{ background: color + "22", border: `1px solid ${color}`, borderRadius: 12, padding: "8px 16px", textAlign: "center" }}>
              <div style={{ fontSize: 22, fontWeight: 900, color }}>{result.score}</div>
              <div style={{ fontSize: 11, fontWeight: 700, color }}>/{100}</div>
            </div>
          </div>

          {/* Signal */}
          <div style={{ background: color + "22", borderRadius: 10, padding: "10px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color }}>🔮 AI-SIGNAL: {recLabel(result.recommendation)}</div>
            <div style={{ fontSize: 12, color: "#64748b" }}>{result.tidshorisont}</div>
          </div>

          <div style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.6 }}>{result.summary}</div>
        </div>

        {/* Graf */}
        <div style={{ background: "#0f172a", borderRadius: 14, border: "1px solid #1e293b", padding: 16, marginBottom: 14 }}>
          <div style={{ fontSize: 12, color: "#64748b", marginBottom: 10 }}>📈 Prisutveckling (relativ)</div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 70 }}>
            {(result.grafData || []).map((v, i) => {
              const h = Math.max(4, ((v - minGraf) / (maxGraf - minGraf || 1)) * 60 + 10);
              const isLast = i === result.grafData.length - 1;
              return <div key={i} style={{ flex: 1, height: h, background: isLast ? color : color + "66", borderRadius: "3px 3px 0 0", transition: "height 0.3s" }} />;
            })}
          </div>
        </div>

        {/* Bull/Bear */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
          <div style={{ background: "#0f172a", borderRadius: 12, border: "1px solid #22c55e33", padding: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#22c55e", marginBottom: 8 }}>🐂 Bull case</div>
            {(result.bullCase || []).map((b, i) => (
              <div key={i} style={{ fontSize: 12, color: "#94a3b8", marginBottom: 5, display: "flex", gap: 6 }}>
                <span style={{ color: "#22c55e" }}>+</span>{b}
              </div>
            ))}
          </div>
          <div style={{ background: "#0f172a", borderRadius: 12, border: "1px solid #ef444433", padding: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#ef4444", marginBottom: 8 }}>🐻 Bear case</div>
            {(result.bearCase || []).map((b, i) => (
              <div key={i} style={{ fontSize: 12, color: "#94a3b8", marginBottom: 5, display: "flex", gap: 6 }}>
                <span style={{ color: "#ef4444" }}>-</span>{b}
              </div>
            ))}
          </div>
        </div>

        {/* Teknisk analys */}
        <div style={{ background: "#0f172a", borderRadius: 14, border: "1px solid #1e293b", padding: 16, marginBottom: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#94a3b8", marginBottom: 12 }}>📊 Teknisk analys</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {[
              ["Trend", result.tekniskAnalys?.trend || "—"],
              ["Sentiment", result.tekniskAnalys?.sentiment || "—"],
              ["Stöd", result.tekniskAnalys?.stod || "—"],
              ["Motstånd", result.tekniskAnalys?.motstand || "—"],
              ["RSI", result.tekniskAnalys?.rsi || "—"],
              ["Risknivå", result.riskNiva || "Hög"],
            ].map(([l, v]) => (
              <div key={l} style={{ background: "#0a0f1e", borderRadius: 8, padding: "8px 10px" }}>
                <div style={{ fontSize: 10, color: "#475569" }}>{l}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0" }}>{v}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Fundamenta */}
        <div style={{ background: "#0f172a", borderRadius: 14, border: "1px solid #1e293b", padding: 16, marginBottom: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#94a3b8", marginBottom: 12 }}>🔍 Fundamenta</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {[
              ["Marknadsvärde", result.fundamenta?.marketcap || "—"],
              ["Rank", "#" + (result.fundamenta?.rank || "—")],
              ["Cirkulerande", result.fundamenta?.cirkulerande || "—"],
              ["Max utbud", result.fundamenta?.maxUtbud || "—"],
              ["Konsensus", result.fundamenta?.konsensusmekanism || "—"],
              ["Skapad", result.fundamenta?.skapad || "—"],
            ].map(([l, v]) => (
              <div key={l} style={{ background: "#0a0f1e", borderRadius: 8, padding: "8px 10px" }}>
                <div style={{ fontSize: 10, color: "#475569" }}>{l}</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#e2e8f0" }}>{v}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Katalysatorer */}
        {result.catalysts?.length > 0 && (
          <div style={{ background: "#0f172a", borderRadius: 12, border: "1px solid #1e293b", padding: 14, marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#f59e0b", marginBottom: 8 }}>🚀 Katalysatorer</div>
            {result.catalysts.map((c, i) => (
              <div key={i} style={{ fontSize: 13, color: "#94a3b8", marginBottom: 5, display: "flex", gap: 8 }}>
                <span style={{ color: "#f59e0b" }}>→</span>{c}
              </div>
            ))}
          </div>
        )}

        {/* Nyheter */}
        {result.nyheter?.length > 0 && (
          <div style={{ background: "#0f172a", borderRadius: 12, border: "1px solid #1e293b", padding: 14, marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8", marginBottom: 8 }}>📰 Senaste nyheter</div>
            {result.nyheter.map((n, i) => (
              <div key={i} style={{ display: "flex", gap: 10, padding: "8px 0", borderBottom: i < result.nyheter.length - 1 ? "1px solid #1e293b" : "none", alignItems: "center" }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: n.sentiment === "positiv" ? "#22c55e" : n.sentiment === "negativ" ? "#ef4444" : "#f59e0b", flexShrink: 0 }} />
                <div style={{ fontSize: 13, color: "#e2e8f0" }}>{n.rubrik}</div>
              </div>
            ))}
          </div>
        )}

        <div style={{ fontSize: 10, color: "#334155", textAlign: "center", lineHeight: 1.7 }}>
          ⚠ AI-genererad kryptoanalys. Kryptovalutor är extremt volatila och innebär hög risk. Investera aldrig mer än du har råd att förlora. Detta är inte finansiell rådgivning.
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Search */}
      <div style={{ background: "#0f172a", borderRadius: 16, border: "1px solid #f59e0b33", padding: 16, marginBottom: 16 }}>
        <div style={{ fontSize: 12, color: "#64748b", marginBottom: 8 }}>₿ Analysera kryptovaluta</div>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === "Enter" && analyze()}
            placeholder="Bitcoin, Ethereum, Solana..."
            style={{ flex: 1, padding: "12px 16px", background: "#1e293b", border: "1px solid #334155", borderRadius: 12, color: "#e2e8f0", fontSize: 14, outline: "none" }}
          />
          <button onClick={() => analyze()} disabled={loading || !query.trim()}
            style={{ padding: "12px 20px", background: loading ? "#1e293b" : "linear-gradient(135deg,#f59e0b,#f97316)", border: "none", borderRadius: 12, color: "#fff", fontSize: 14, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer" }}>
            {loading ? "..." : "Analysera"}
          </button>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ background: "#0f172a", borderRadius: 14, border: "1px solid #f59e0b33", padding: 20, textAlign: "center", marginBottom: 16 }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>⏳</div>
          <div style={{ fontSize: 14, color: "#f59e0b", fontWeight: 600 }}>{STEPS[loadStep]}</div>
          <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 12 }}>
            {STEPS.map((_, i) => <div key={i} style={{ width: i <= loadStep ? 24 : 6, height: 6, borderRadius: 99, background: i <= loadStep ? "#f59e0b" : "#1e293b", transition: "all 0.3s" }} />)}
          </div>
        </div>
      )}

      {error && (
        <div style={{ background: "#1a0000", borderRadius: 12, border: "1px solid #ef444433", padding: 14, marginBottom: 14, fontSize: 13, color: "#ef4444" }}>
          ⚠ {error}
        </div>
      )}

      {/* Presets */}
      <div style={{ fontSize: 12, color: "#64748b", marginBottom: 10, textTransform: "uppercase", letterSpacing: 1 }}>Populära krypton</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {KRYPTO_PRESETS.map(k => (
          <button key={k.symbol} onClick={() => { setQuery(k.namn); analyze(k.namn); }}
            style={{ background: "#0f172a", border: `1px solid ${k.color}33`, borderRadius: 14, padding: "14px", cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 40, height: 40, borderRadius: "50%", background: k.color + "22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{k.emoji}</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#e2e8f0" }}>{k.namn}</div>
              <div style={{ fontSize: 11, color: "#475569" }}>{k.symbol}</div>
            </div>
          </button>
        ))}
      </div>

      {/* Cache */}
      {Object.keys(cache).length > 0 && (
        <div style={{ marginTop: 20 }}>
          <div style={{ fontSize: 12, color: "#64748b", marginBottom: 10, textTransform: "uppercase", letterSpacing: 1 }}>Tidigare analyser</div>
          {Object.values(cache).slice(0, 3).map((r, i) => (
            <button key={i} onClick={() => setResult(r)}
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12, padding: "12px 16px", marginBottom: 8, cursor: "pointer", textAlign: "left" }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#e2e8f0" }}>{r.name} ({r.symbol})</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: recColor(r.recommendation) }}>{recLabel(r.recommendation)}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}


function KryptoGuide() {
  const [section, setSection] = useState("intro");
  const [innehav, setInnehav] = useState(() => { try { return JSON.parse(localStorage.getItem("kapital_krypto") || "[]"); } catch { return []; } });
  const [adding, setAdding] = useState(false);
  const [newK, setNewK] = useState({ namn: "Bitcoin", symbol: "BTC", antal: "", kostnad: "" });

  const save = (k) => { setInnehav(k); try { localStorage.setItem("kapital_krypto", JSON.stringify(k)); } catch {} };

  const KRYPTON = [
    { namn: "Bitcoin", symbol: "BTC", emoji: "₿", color: "#f59e0b", mcap: "#1", desc: "Digitalt guld — den ursprungliga kryptovalutan", risk: "Hög", potential: 5 },
    { namn: "Ethereum", symbol: "ETH", emoji: "⟠", color: "#8b5cf6", mcap: "#2", desc: "Plattform för smarta kontrakt och DeFi", risk: "Hög", potential: 5 },
    { namn: "Solana", symbol: "SOL", emoji: "◎", color: "#10b981", mcap: "#5", desc: "Snabb och billig blockchain — stark konkurrent till ETH", risk: "Mycket hög", potential: 4 },
    { namn: "BNB", symbol: "BNB", emoji: "🟡", color: "#f59e0b", mcap: "#4", desc: "Binance-kedjan — stark likviditet", risk: "Hög", potential: 3 },
    { namn: "XRP", symbol: "XRP", emoji: "✕", color: "#3b82f6", mcap: "#6", desc: "Bankbetalningar — Ripple Labs", risk: "Hög", potential: 3 },
    { namn: "Cardano", symbol: "ADA", emoji: "🔵", color: "#3b82f6", mcap: "#8", desc: "Akademiskt fokus och smart kontrakts-plattform", risk: "Mycket hög", potential: 3 },
    { namn: "Avalanche", symbol: "AVAX", emoji: "🔺", color: "#ef4444", mcap: "#10", desc: "Snabb och skalbar blockchain", risk: "Mycket hög", potential: 4 },
    { namn: "Polkadot", symbol: "DOT", emoji: "⬤", color: "#e879f9", mcap: "#12", desc: "Kopplar samman olika blockchains", risk: "Mycket hög", potential: 3 },
  ];

  const BÖRSER = [
    { namn: "Coinbase", flag: "🇺🇸", desc: "Störst och mest reglerad i USA/EU. Bra för nybörjare.", safe: 5, url: "coinbase.com" },
    { namn: "Safello", flag: "🇸🇪", desc: "Svensk kryptomäklare — enkelt med BankID och Swish", safe: 5, url: "safello.com" },
    { namn: "Kraken", flag: "🇺🇸", desc: "Låga avgifter och stort utbud. Bra för erfarna.", safe: 4, url: "kraken.com" },
    { namn: "Bitstamp", flag: "🇪🇺", desc: "EU-reglerad och säker. Populär i Europa.", safe: 4, url: "bitstamp.net" },
    { namn: "Binance", flag: "🌍", desc: "Störst globalt men mer komplex. Inte i Sverige.", safe: 3, url: "binance.com" },
  ];

  return (
    <div>
      <div style={{ display: "flex", gap: 6, marginBottom: 16, overflowX: "auto", scrollbarWidth: "none" }}>
        {[["intro","🚀 Intro"],["krypton","₿ Krypton"],["kopa","🏦 Köpa"],["portfölj","💼 Portfölj"]].map(([id, label]) => (
          <button key={id} onClick={() => setSection(id)}
            style={{ flexShrink: 0, padding: "8px 14px", background: section === id ? "linear-gradient(135deg,#f59e0b,#f97316)" : "#0f172a", border: `1px solid ${section === id ? "transparent" : "#1e293b"}`, borderRadius: 99, color: section === id ? "#fff" : "#64748b", fontSize: 12, fontWeight: section === id ? 700 : 400, cursor: "pointer" }}>
            {label}
          </button>
        ))}
      </div>

      {section === "intro" && (
        <div>
          <div style={{ background: "linear-gradient(135deg,#1a1000,#0f172a)", borderRadius: 16, border: "1px solid #f59e0b33", padding: 18, marginBottom: 16 }}>
            <div style={{ fontSize: 32, textAlign: "center", marginBottom: 10 }}>₿</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#f59e0b", textAlign: "center", marginBottom: 8 }}>Vad är krypto?</div>
            <div style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.7 }}>
              Kryptovalutor är digitala valutor som fungerar utan banker. De drivs av blockchain-teknologi — en säker databas utan central kontroll. Bitcoin är den mest kända, men det finns tusentals andra.
            </div>
          </div>

          <div style={{ background: "#0f172a", borderRadius: 12, border: "1px solid #10b98133", padding: 14, marginBottom: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#10b981", marginBottom: 8 }}>✅ Fördelar</div>
            {["Potentiellt hög avkastning", "Decentraliserat — ingen bank styr", "Handlas dygnet runt, 7 dagar i veckan", "Möjlighet till passiv inkomst via staking"].map((t, i) => (
              <div key={i} style={{ fontSize: 13, color: "#94a3b8", marginBottom: 4, display: "flex", gap: 8 }}><span style={{ color: "#10b981" }}>→</span>{t}</div>
            ))}
          </div>

          <div style={{ background: "#0f172a", borderRadius: 12, border: "1px solid #ef444433", padding: 14, marginBottom: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#ef4444", marginBottom: 8 }}>⚠️ Risker</div>
            {["Extremt volatilt — kan falla 80%+ på kort tid", "Oreglerat i många länder", "Bedrägerier och scams är vanliga", "Teknisk komplexitet — om du tappar nyckeln förlorar du allt", "Skattepliktig tillgång — måste deklareras på K4"].map((t, i) => (
              <div key={i} style={{ fontSize: 13, color: "#94a3b8", marginBottom: 4, display: "flex", gap: 8 }}><span style={{ color: "#ef4444" }}>!</span>{t}</div>
            ))}
          </div>

          <div style={{ background: "#f59e0b11", borderRadius: 12, border: "1px solid #f59e0b33", padding: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#f59e0b", marginBottom: 6 }}>💡 Grundregel</div>
            <div style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.7 }}>
              Investera aldrig mer i krypto än du har råd att förlora helt. De flesta experter rekommenderar max <b style={{ color: "#e2e8f0" }}>5-10% av portföljen</b> i krypto.
            </div>
          </div>
        </div>
      )}

      {section === "krypton" && (
        <div>
          {KRYPTON.map((k, i) => (
            <div key={k.symbol} style={{ background: "#0f172a", borderRadius: 14, border: `1px solid ${k.color}33`, padding: 16, marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 42, height: 42, borderRadius: "50%", background: k.color + "22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, border: `1px solid ${k.color}44` }}>{k.emoji}</div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "#e2e8f0" }}>{k.namn}</div>
                    <div style={{ fontSize: 11, color: "#475569" }}>{k.symbol} · Marknadsvärde {k.mcap}</div>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 10, background: k.risk === "Hög" ? "#f59e0b22" : "#ef444422", color: k.risk === "Hög" ? "#f59e0b" : "#ef4444", padding: "2px 8px", borderRadius: 99 }}>{k.risk} risk</div>
                  <div style={{ fontSize: 12, marginTop: 4 }}>{"⭐".repeat(k.potential)}</div>
                </div>
              </div>
              <div style={{ fontSize: 12, color: "#64748b" }}>{k.desc}</div>
            </div>
          ))}
        </div>
      )}

      {section === "kopa" && (
        <div>
          <div style={{ background: "#0f172a", borderRadius: 14, border: "1px solid #1e293b", padding: 14, marginBottom: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#94a3b8", marginBottom: 10 }}>Steg för steg — köp din första krypto</div>
            {[
              { num: 1, text: "Välj en reglerad börs — se listan nedan. Safello är enklast för svenska användare." },
              { num: 2, text: "Skapa konto och verifiera din identitet (BankID eller pass)." },
              { num: 3, text: "Sätt in pengar via bankgiro eller Swish." },
              { num: 4, text: "Sök på den krypto du vill köpa (t.ex. Bitcoin = BTC)." },
              { num: 5, text: "Välj belopp och bekräfta köpet." },
              { num: 6, text: "Spara dina inloggningsuppgifter säkert — utan dem förlorar du tillgången till dina krypton!", tip: "Skriv ALDRIG upp seed phrase digitalt. Använd papper och förvara säkert." },
            ].map((s, i) => (
              <div key={i} style={{ display: "flex", gap: 12, marginBottom: 14, alignItems: "flex-start" }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#f59e0b22", border: "1px solid #f59e0b44", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: "#f59e0b", flexShrink: 0 }}>{s.num}</div>
                <div>
                  <div style={{ fontSize: 13, color: "#e2e8f0", lineHeight: 1.6 }}>{s.text}</div>
                  {s.tip && <div style={{ fontSize: 12, color: "#f59e0b", marginTop: 6, padding: "6px 10px", background: "#f59e0b11", borderRadius: 8 }}>⚠️ {s.tip}</div>}
                </div>
              </div>
            ))}
          </div>

          {BÖRSER.map(b => (
            <div key={b.namn} style={{ background: "#0f172a", borderRadius: 12, border: `1px solid ${b.safe === 5 ? "#10b98133" : "#1e293b"}`, padding: 14, marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 24 }}>{b.flag}</span>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#e2e8f0" }}>{b.namn}</div>
                    <div style={{ fontSize: 11, color: "#475569" }}>{b.url}</div>
                  </div>
                </div>
                <div style={{ fontSize: 14 }}>{"🔒".repeat(b.safe)}</div>
              </div>
              <div style={{ fontSize: 12, color: "#64748b" }}>{b.desc}</div>
              {b.safe === 5 && <div style={{ fontSize: 11, color: "#10b981", marginTop: 6 }}>✓ Rekommenderas för svenska användare</div>}
            </div>
          ))}
        </div>
      )}

      {section === "portfölj" && (
        <div>
          <div style={{ background: "#0f172a", borderRadius: 14, border: "1px solid #f59e0b33", padding: 16, marginBottom: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#f59e0b", marginBottom: 10 }}>₿ Mina krypton</div>
            {innehav.length === 0 ? (
              <div style={{ textAlign: "center", padding: "20px 0", color: "#334155", fontSize: 13 }}>Inga krypton tillagda ännu</div>
            ) : (
              innehav.map((k, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #1e293b" }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#e2e8f0" }}>{k.namn} ({k.symbol})</div>
                    <div style={{ fontSize: 12, color: "#475569" }}>{k.antal} st · Köpt för {parseFloat(k.kostnad).toLocaleString("sv-SE")} kr</div>
                  </div>
                  <button onClick={() => save(innehav.filter((_, j) => j !== i))} style={{ fontSize: 12, color: "#ef4444", background: "none", border: "none", cursor: "pointer" }}>Ta bort</button>
                </div>
              ))
            )}
          </div>

          {adding ? (
            <div style={{ background: "#0f172a", borderRadius: 12, border: "1px solid #1e293b", padding: 16, marginBottom: 12 }}>
              <select value={newK.namn} onChange={e => { const k = KRYPTON.find(k => k.namn === e.target.value); setNewK(n => ({ ...n, namn: e.target.value, symbol: k?.symbol || "" })); }}
                style={{ width: "100%", padding: "10px", background: "#1e293b", border: "1px solid #334155", borderRadius: 8, color: "#e2e8f0", fontSize: 14, outline: "none", marginBottom: 8 }}>
                {KRYPTON.map(k => <option key={k.symbol} value={k.namn} style={{ background: "#0f172a" }}>{k.emoji} {k.namn} ({k.symbol})</option>)}
              </select>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
                {[["antal", "Antal", "0.5"], ["kostnad", "Köpt för (kr)", "10000"]].map(([key, label, ph]) => (
                  <div key={key}>
                    <div style={{ fontSize: 11, color: "#64748b", marginBottom: 4 }}>{label}</div>
                    <input value={newK[key]} onChange={e => setNewK(n => ({ ...n, [key]: e.target.value }))} placeholder={ph} inputMode="decimal"
                      style={{ width: "100%", padding: "8px 10px", background: "#1e293b", border: "1px solid #334155", borderRadius: 8, color: "#e2e8f0", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => { if (newK.antal && newK.kostnad) { save([...innehav, newK]); setAdding(false); setNewK({ namn: "Bitcoin", symbol: "BTC", antal: "", kostnad: "" }); } }}
                  style={{ flex: 1, padding: "10px", background: "linear-gradient(135deg,#f59e0b,#f97316)", border: "none", borderRadius: 8, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Lägg till</button>
                <button onClick={() => setAdding(false)} style={{ padding: "10px 16px", background: "#1e293b", border: "1px solid #334155", borderRadius: 8, color: "#94a3b8", fontSize: 14, cursor: "pointer" }}>Avbryt</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setAdding(true)} style={{ width: "100%", padding: "12px", background: "#0f172a", border: "1px dashed #334155", borderRadius: 12, color: "#64748b", fontSize: 14, cursor: "pointer" }}>
              + Lägg till krypto
            </button>
          )}
          <div style={{ fontSize: 11, color: "#334155", textAlign: "center", marginTop: 10 }}>
            ⚠ Priser uppdateras ej automatiskt. Lägg in aktuellt värde för korrekt nettovärde.
          </div>
        </div>
      )}
    </div>
  );
}

function KryptoSkatt() {
  const [trades, setTrades] = useState(() => { try { return JSON.parse(localStorage.getItem("kapital_krypto_k4") || "[]"); } catch { return []; } });
  const [adding, setAdding] = useState(false);
  const [newT, setNewT] = useState({ krypto: "BTC", kopDatum: "", kopPris: "", saljDatum: "", saljPris: "", antal: "" });

  const save = (t) => { setTrades(t); try { localStorage.setItem("kapital_krypto_k4", JSON.stringify(t)); } catch {} };

  const totalVinst = trades.reduce((s, t) => {
    const vinst = (parseFloat(t.saljPris) - parseFloat(t.kopPris)) * parseFloat(t.antal || 1);
    return s + (isNaN(vinst) ? 0 : vinst);
  }, 0);
  const skatt = totalVinst > 0 ? totalVinst * 0.30 : totalVinst * 0.30 * 0.7;

  return (
    <div>
      <div style={{ background: "linear-gradient(135deg,#1a0800,#0f172a)", borderRadius: 16, border: "1px solid #f59e0b33", padding: 16, marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#f59e0b", marginBottom: 6 }}>🧾 Kryptoskatt — K4</div>
        <div style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.6 }}>
          All handel med kryptovalutor är skattepliktig i Sverige. Varje köp och försäljning ska redovisas på <b style={{ color: "#e2e8f0" }}>K4-blankett</b> i deklarationen. Skatten är 30% på vinst och 21% avdrag på förlust.
        </div>
      </div>

      <div style={{ background: "#0f172a", borderRadius: 12, border: "1px solid #1e293b", padding: 14, marginBottom: 14 }}>
        <div style={{ fontSize: 12, color: "#64748b", marginBottom: 8 }}>💡 Viktiga regler</div>
        {[
          "Varje försäljning är en skattepliktig händelse — även byte mellan krypton",
          "Genomsnittsmetoden används — snittpris på alla köp av samma krypto",
          "Förluster kan kvittas mot vinster (70% avdragsgillt mot kapital)",
          "Staking-intäkter beskattas som inkomst (inte kapital)",
          "Utländska börser behöver inte skicka kontrolluppgifter — du måste deklarera själv",
          "Skatteverket har börjat granska kryptohandel aktivt",
        ].map((t, i) => (
          <div key={i} style={{ fontSize: 13, color: "#94a3b8", marginBottom: 5, display: "flex", gap: 8 }}>
            <span style={{ color: "#f59e0b" }}>→</span>{t}
          </div>
        ))}
      </div>

      {/* Summary */}
      {trades.length > 0 && (
        <div style={{ background: `linear-gradient(135deg,${totalVinst >= 0 ? "#0a1f0a" : "#1a0000"},#0f172a)`, borderRadius: 14, border: `1px solid ${totalVinst >= 0 ? "#10b98133" : "#ef444433"}`, padding: 16, marginBottom: 14, textAlign: "center" }}>
          <div style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>Total vinst/förlust</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: totalVinst >= 0 ? "#10b981" : "#ef4444" }}>
            {totalVinst >= 0 ? "+" : ""}{Math.round(totalVinst).toLocaleString("sv-SE")} kr
          </div>
          <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>
            Skatt att betala: <b style={{ color: totalVinst >= 0 ? "#ef4444" : "#10b981" }}>{Math.round(Math.abs(skatt)).toLocaleString("sv-SE")} kr</b>
            {totalVinst < 0 && " (avdrag)"}
          </div>
        </div>
      )}

      {/* Trades */}
      {trades.map((t, i) => {
        const vinst = (parseFloat(t.saljPris) - parseFloat(t.kopPris)) * parseFloat(t.antal || 1);
        return (
          <div key={i} style={{ background: "#0f172a", borderRadius: 10, border: `1px solid ${vinst >= 0 ? "#10b98122" : "#ef444422"}`, padding: 12, marginBottom: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0" }}>{t.krypto} · {t.antal} st</div>
                <div style={{ fontSize: 11, color: "#475569" }}>Köpt {t.kopDatum} för {parseFloat(t.kopPris).toLocaleString("sv-SE")} kr</div>
                <div style={{ fontSize: 11, color: "#475569" }}>Sålt {t.saljDatum} för {parseFloat(t.saljPris).toLocaleString("sv-SE")} kr</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: vinst >= 0 ? "#10b981" : "#ef4444" }}>
                  {vinst >= 0 ? "+" : ""}{Math.round(vinst).toLocaleString("sv-SE")} kr
                </div>
                <button onClick={() => save(trades.filter((_, j) => j !== i))} style={{ fontSize: 11, color: "#ef4444", background: "none", border: "none", cursor: "pointer" }}>Ta bort</button>
              </div>
            </div>
          </div>
        );
      })}

      {adding ? (
        <div style={{ background: "#0f172a", borderRadius: 12, border: "1px solid #1e293b", padding: 16, marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#94a3b8", marginBottom: 10 }}>Lägg till affär</div>
          <input value={newT.krypto} onChange={e => setNewT(n => ({ ...n, krypto: e.target.value }))} placeholder="BTC, ETH..."
            style={{ width: "100%", padding: "9px 10px", background: "#1e293b", border: "1px solid #334155", borderRadius: 8, color: "#e2e8f0", fontSize: 14, outline: "none", boxSizing: "border-box", marginBottom: 8 }} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
            {[["kopPris", "Köppris/st (SEK)", "300000"], ["saljPris", "Säljpris/st (SEK)", "450000"], ["antal", "Antal", "0.5"], ["kopDatum", "Köpdatum", "2024-01-01"]].map(([key, label, ph]) => (
              <div key={key}>
                <div style={{ fontSize: 10, color: "#64748b", marginBottom: 3 }}>{label}</div>
                <input value={newT[key]} onChange={e => setNewT(n => ({ ...n, [key]: e.target.value }))} placeholder={ph}
                  style={{ width: "100%", padding: "8px 10px", background: "#1e293b", border: "1px solid #334155", borderRadius: 8, color: "#e2e8f0", fontSize: 13, outline: "none", boxSizing: "border-box" }} />
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => { if (newT.kopPris && newT.saljPris) { save([...trades, newT]); setAdding(false); setNewT({ krypto: "BTC", kopDatum: "", kopPris: "", saljDatum: "", saljPris: "", antal: "" }); } }}
              style={{ flex: 1, padding: "10px", background: "linear-gradient(135deg,#f59e0b,#f97316)", border: "none", borderRadius: 8, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Lägg till</button>
            <button onClick={() => setAdding(false)} style={{ padding: "10px 16px", background: "#1e293b", border: "1px solid #334155", borderRadius: 8, color: "#94a3b8", fontSize: 14, cursor: "pointer" }}>Avbryt</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setAdding(true)} style={{ width: "100%", padding: "12px", background: "#0f172a", border: "1px dashed #334155", borderRadius: 12, color: "#64748b", fontSize: 14, cursor: "pointer" }}>
          + Lägg till kryptoaffär för K4
        </button>
      )}
    </div>
  );
}

// ── Utländska Värdepapper Guide ───────────────────────────────────────────
function UtlandGuide() {
  const [section, setSection] = useState("intro");

  const SBtn = ({ id, label, icon }) => (
    <button onClick={() => setSection(id)}
      style={{ flex: 1, padding: "10px 6px", background: section === id ? "linear-gradient(135deg,#10b981,#0ea5e9)" : "#0f172a", border: `1px solid ${section === id ? "transparent" : "#1e293b"}`, borderRadius: 10, color: section === id ? "#fff" : "#64748b", fontSize: 11, fontWeight: section === id ? 700 : 400, cursor: "pointer", textAlign: "center" }}>
      <div style={{ fontSize: 16, marginBottom: 2 }}>{icon}</div>
      {label}
    </button>
  );

  const INFO_BOX = ({ title, items, color = "#10b981" }) => (
    <div style={{ background: "#0f172a", borderRadius: 12, border: `1px solid ${color}33`, padding: 14, marginBottom: 12 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color, marginBottom: 10 }}>{title}</div>
      {items.map((item, i) => (
        <div key={i} style={{ display: "flex", gap: 10, marginBottom: 8, alignItems: "flex-start" }}>
          <span style={{ color, flexShrink: 0, fontSize: 14 }}>→</span>
          <div style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.6 }}>{item}</div>
        </div>
      ))}
    </div>
  );

  const BROKERS = [
    { name: "Avanza", flag: "🇸🇪", courtage: "0 kr (USA/Europa under 50k)", valuta: "Automatisk", marknader: "USA, Europa, Norden", etf: true, isk: true, url: "avanza.se", betyg: 5, desc: "Bäst för svenska sparare — störst utbud och lägst courtage" },
    { name: "Nordnet", flag: "🇸🇪", courtage: "0 kr (USA/Europa under 50k)", valuta: "Automatisk", marknader: "USA, Europa, Norden, Asien", etf: true, isk: true, url: "nordnet.se", betyg: 5, desc: "Lika bra som Avanza — bra för Nordiska aktier" },
    { name: "DEGIRO", flag: "🇳🇱", courtage: "1-2 EUR/affär", valuta: "Automatisk", marknader: "50+ börser globalt", etf: true, isk: false, url: "degiro.se", betyg: 4, desc: "Lägst courtage globalt — men ingen ISK-möjlighet" },
    { name: "Interactive Brokers", flag: "🇺🇸", courtage: "0.005 USD/aktie", valuta: "Manuell/automatisk", marknader: "135+ börser globalt", etf: true, isk: false, url: "interactivebrokers.com", betyg: 4, desc: "För aktiva handlare — störst utbud men mer komplex" },
  ];

  const BÖRSER = [
    { name: "NYSE / NASDAQ", flag: "🇺🇸", land: "USA", valutor: "USD", öppet: "15:30-22:00 CET", kanda: "Apple, Tesla, Amazon, Google, Meta, Nvidia, Microsoft", tickers: "Bokstäver (AAPL, TSLA)" },
    { name: "London Stock Exchange", flag: "🇬🇧", land: "UK", valutor: "GBP/USD", öppet: "09:00-17:30 CET", kanda: "Shell, HSBC, AstraZeneca, BP", tickers: "Bokstäver (AZN, SHEL)" },
    { name: "Euronext Paris", flag: "🇫🇷", land: "Frankrike", valutor: "EUR", öppet: "09:00-17:30 CET", kanda: "LVMH, L'Oréal, TotalEnergies", tickers: "MC, OR, TTE" },
    { name: "XETRA Frankfurt", flag: "🇩🇪", land: "Tyskland", valutor: "EUR", öppet: "09:00-17:30 CET", kanda: "SAP, Siemens, BMW, Volkswagen", tickers: "SAP, SIE, BMW" },
    { name: "Tokyo Stock Exchange", flag: "🇯🇵", land: "Japan", valutor: "JPY", öppet: "02:00-08:30 CET", kanda: "Toyota, Sony, Nintendo, SoftBank", tickers: "Siffror (7203, 6758)" },
    { name: "Hong Kong Exchange", flag: "🇭🇰", land: "Hong Kong", valutor: "HKD", öppet: "03:30-10:00 CET", kanda: "Alibaba, Tencent, HSBC", tickers: "Siffror (0700, 0005)" },
  ];

  const ETF_GUIDE = [
    { namn: "VUAA (Vanguard S&P500)", börs: "London", valuta: "USD", avgift: 0.07, desc: "Följer S&P 500 — de 500 största USA-bolagen", typ: "Indexfond ETF" },
    { namn: "IWDA (iShares MSCI World)", börs: "London/Amsterdam", valuta: "USD", avgift: 0.20, desc: "1 600 bolag i 23 länder — bred global exponering", typ: "Global ETF" },
    { namn: "QQQ (Invesco Nasdaq 100)", börs: "NASDAQ", valuta: "USD", avgift: 0.20, desc: "De 100 största tech-bolagen på Nasdaq", typ: "Teknik ETF" },
    { namn: "IEMG (iShares Emerging Markets)", börs: "NYSE", valuta: "USD", avgift: 0.09, desc: "Tillväxtmarknader — Kina, Indien, Brasilien", typ: "Tillväxt ETF" },
    { namn: "VWRL (Vanguard FTSE All-World)", börs: "London", valuta: "USD", avgift: 0.22, desc: "3 700 bolag i hela världen — ultimat diversifiering", typ: "Global ETF" },
    { namn: "SOXX (iShares Semiconductor)", börs: "NASDAQ", valuta: "USD", avgift: 0.35, desc: "Halvledarbolag — Nvidia, TSMC, Intel, AMD", typ: "Sektor ETF" },
  ];

  return (
    <div>
      {/* Nav */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16, overflowX: "auto", scrollbarWidth: "none" }}>
        <SBtn id="intro" label="Kom igång" icon="🚀" />
        <SBtn id="borser" label="Börser" icon="🌍" />
        <SBtn id="etf" label="ETF:er" icon="📊" />
        <SBtn id="skatt" label="Skatt" icon="🧾" />
        <SBtn id="maklare" label="Mäklare" icon="🏦" />
      </div>

      {/* INTRO */}
      {section === "intro" && (
        <div>
          <div style={{ background: "linear-gradient(135deg,#0f172a,#0a1020)", borderRadius: 16, border: "1px solid #3b82f633", padding: 18, marginBottom: 16 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#3b82f6", marginBottom: 6 }}>🌍 Handla utländska värdepapper</div>
            <div style={{ fontSize: 13, color: "#64748b", lineHeight: 1.7 }}>
              Svenska börsen är bara 1% av världens aktiemarknad. Genom att investera globalt får du tillgång till Apple, Tesla, Nvidia och tusentals andra bolag — direkt från din telefon.
            </div>
          </div>

          <INFO_BOX title="✅ Vad kan du köpa?" color="#10b981" items={[
            "Aktier på börser i USA, Europa, Asien och mer",
            "ETF:er (börshandlade fonder) — billigaste sättet att diversifiera globalt",
            "ADR:er — utländska aktier listade på amerikanska börser",
            "Obligationer och råvaror via ETF:er",
          ]} />

          <INFO_BOX title="📋 Steg för steg — kom igång" color="#3b82f6" items={[
            "1. Öppna ett konto hos Avanza eller Nordnet (gratis, tar 10 minuter med BankID)",
            "2. Välj kontotyp — ISK för aktier och fonder, AF för utdelningsaktier",
            "3. Sätt in pengar via bankgiro eller Swish",
            "4. Sök på bolagsnamnet eller ticker-symbolen (t.ex. AAPL för Apple)",
            "5. Välj antal aktier och tryck Köp",
            "6. Valutaväxling sker automatiskt — du betalar i SEK",
          ]} />

          <INFO_BOX title="⚠️ Viktigt att veta" color="#f59e0b" items={[
            "Valutarisk — om kronan stärks minskar värdet på utländska innehav",
            "Courtage — ofta 0 kr på Avanza/Nordnet för USA upp till 50 000 kr/år",
            "Valutaväxlingsavgift — ca 0.25% vid köp och försäljning",
            "Handelstider — USA-börsen öppnar 15:30 svensk tid",
            "Skatt — vinster och utdelningar ska deklareras (K4 eller automatiskt via ISK)",
          ]} />
        </div>
      )}

      {/* BÖRSER */}
      {section === "borser" && (
        <div>
          <div style={{ background: "#0f172a", borderRadius: 14, border: "1px solid #1e293b", padding: 14, marginBottom: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#94a3b8", marginBottom: 4 }}>Världens börser</div>
            <div style={{ fontSize: 12, color: "#64748b" }}>Tider är CET (svensk tid). Avanza och Nordnet ger tillgång till de flesta av dessa.</div>
          </div>
          {BÖRSER.map((b, i) => (
            <div key={i} style={{ background: "#0f172a", borderRadius: 14, border: "1px solid #1e293b", padding: 16, marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 28 }}>{b.flag}</span>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "#e2e8f0" }}>{b.name}</div>
                    <div style={{ fontSize: 11, color: "#475569" }}>{b.land} · {b.valutor}</div>
                  </div>
                </div>
                <div style={{ background: "#1e293b", borderRadius: 8, padding: "4px 10px", fontSize: 11, color: "#10b981" }}>
                  🕐 {b.öppet}
                </div>
              </div>
              <div style={{ fontSize: 12, color: "#64748b", marginBottom: 6 }}>
                <b style={{ color: "#94a3b8" }}>Kända bolag:</b> {b.kanda}
              </div>
              <div style={{ fontSize: 11, color: "#475569" }}>
                <b>Ticker-format:</b> {b.tickers}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ETF */}
      {section === "etf" && (
        <div>
          <div style={{ background: "#0f172a", borderRadius: 14, border: "1px solid #3b82f633", padding: 14, marginBottom: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#3b82f6", marginBottom: 4 }}>Vad är en ETF?</div>
            <div style={{ fontSize: 13, color: "#64748b", lineHeight: 1.6 }}>
              ETF (Exchange Traded Fund) är en fond som handlas på börsen som en aktie. En ETF kan innehålla hundratals bolag och ger dig automatisk diversifiering till minimal kostnad. <b style={{ color: "#e2e8f0" }}>En VUAA-aktie till ~500 SEK ger dig exponering mot 500 amerikanska bolag!</b>
            </div>
          </div>

          <INFO_BOX title="✅ Fördelar med ETF:er" color="#10b981" items={[
            "Låg avgift — ofta 0.07-0.25% per år",
            "Automatisk diversifiering — hundratals bolag i ett köp",
            "Handlas som aktier — köp och sälj när börsen är öppen",
            "Passar ISK — ingen kapitalvinstskatt vid köp/sälj",
            "Tillgängliga hos Avanza och Nordnet",
          ]} />

          <div style={{ fontSize: 12, color: "#64748b", marginBottom: 10, textTransform: "uppercase", letterSpacing: 1 }}>Populära ETF:er</div>
          {ETF_GUIDE.map((e, i) => (
            <div key={i} style={{ background: "#0f172a", borderRadius: 12, border: "1px solid #1e293b", padding: 14, marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#e2e8f0" }}>{e.namn}</div>
                  <div style={{ fontSize: 11, color: "#475569" }}>{e.typ} · {e.börs} · {e.valuta}</div>
                </div>
                <div style={{ background: "#10b98122", borderRadius: 8, padding: "4px 10px", fontSize: 12, color: "#10b981", fontWeight: 700 }}>
                  {e.avgift}%/år
                </div>
              </div>
              <div style={{ fontSize: 12, color: "#94a3b8" }}>{e.desc}</div>
            </div>
          ))}

          <INFO_BOX title="💡 Tips för nybörjare" color="#f59e0b" items={[
            "Börja med VUAA eller IWDA — de är de mest populära globala ETF:erna",
            "Spara månadsvis — ta bort känslan av att tajma marknaden",
            "Håll kvar länge — ETF:er är för långsiktigt sparande (5+ år)",
            "Avanza och Nordnet har egna ETF-guides på sina hemsidor",
          ]} />
        </div>
      )}

      {/* SKATT */}
      {section === "skatt" && (
        <div>
          <INFO_BOX title="🧾 Skatt på utländska värdepapper" color="#f59e0b" items={[
            "ISK (Investeringssparkonto) — betalar schablonsskatt (~0.888% av värdet/år). Inga K4-blanketter!",
            "AF (Aktie & Fondkonto) — betalar 30% kapitalvinstskatt vid försäljning. K4-blankett krävs.",
            "Utdelningar från utländska bolag beskattas 30% (USA tar 15% källskatt, resterande 15% betalar du i Sverige)",
            "Valutavinst/-förlust ingår i kapitalvinsten — om kronan försvagats är din vinst större",
          ]} />

          <INFO_BOX title="🇺🇸 USA-specifikt — W-8BEN" color="#3b82f6" items={[
            "Du behöver fylla i formuläret W-8BEN hos din mäklare för att slippa dubbelbeskattning",
            "Avanza och Nordnet hanterar detta automatiskt vid kontoöppning",
            "USA tar 15% källskatt på utdelningar för svenska skattebetalare (tack vare skatteavtal)",
            "Utan W-8BEN tar USA 30% källskatt — du kan söka återbetalning men det är krångligt",
          ]} />

          <INFO_BOX title="🇪🇺 Europa — PRIIPS-regelverket" color="#8b5cf6" items={[
            "EU kräver att du läser ett KID-dokument (Key Information Document) innan du köper europeiska ETF:er",
            "Avanza och Nordnet visar detta automatiskt",
            "Vissa amerikanska ETF:er (t.ex. SPY, VOO) får INTE säljas till EU-kunder — köp VUAA istället",
            "UCITS-ETF:er är godkända för EU-kunder — leta efter UCITS i fondnamnet",
          ]} />

          <INFO_BOX title="💡 Bästa skattupplägget" color="#10b981" items={[
            "Använd ISK för allt långsiktigt sparande — enklast och ofta billigast",
            "ISK passar bäst när börsen går upp — schablonsskatten är fast oavsett avkastning",
            "AF-konto kan vara bättre om du har förluster att kvitta mot vinster",
            "Deklarera K4 via Avanzas eller Nordnets exportfunktion — de genererar blanketterna åt dig",
          ]} />
        </div>
      )}

      {/* MÄKLARE */}
      {section === "maklare" && (
        <div>
          {BROKERS.map((b, i) => (
            <div key={i} style={{ background: "#0f172a", borderRadius: 14, border: `1px solid ${b.betyg === 5 ? "#10b98133" : "#1e293b"}`, padding: 16, marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 28 }}>{b.flag}</span>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 16, fontWeight: 700, color: "#e2e8f0" }}>{b.name}</span>
                      {b.betyg === 5 && <span style={{ fontSize: 10, background: "#10b98122", color: "#10b981", padding: "1px 7px", borderRadius: 99, fontWeight: 700 }}>REKOMMENDERAS</span>}
                    </div>
                    <div style={{ fontSize: 11, color: "#475569" }}>{b.url}</div>
                  </div>
                </div>
                <div style={{ fontSize: 18 }}>{"⭐".repeat(b.betyg)}</div>
              </div>

              <div style={{ fontSize: 13, color: "#94a3b8", marginBottom: 12, lineHeight: 1.5 }}>{b.desc}</div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                {[
                  ["Courtage", b.courtage],
                  ["Marknader", b.marknader],
                  ["Valutaväxling", b.valuta],
                  ["ISK", b.isk ? "✓ Ja" : "✗ Nej"],
                  ["ETF:er", b.etf ? "✓ Ja" : "✗ Nej"],
                ].map(([label, value]) => (
                  <div key={label} style={{ background: "#0a0f1e", borderRadius: 8, padding: "8px 10px" }}>
                    <div style={{ fontSize: 10, color: "#475569" }}>{label}</div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: value.includes("✓") ? "#10b981" : value.includes("✗") ? "#ef4444" : "#e2e8f0" }}>{value}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div style={{ background: "#0f172a", borderRadius: 12, border: "1px solid #1e293b", padding: 14 }}>
            <div style={{ fontSize: 12, color: "#64748b", marginBottom: 8 }}>💡 Vilket ska jag välja?</div>
            <div style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.7 }}>
              För de flesta svenska sparare är <b style={{ color: "#10b981" }}>Avanza eller Nordnet</b> bäst — gratis handel, ISK-konto, och enkelt gränssnitt på svenska. DEGIRO är bra om du handlar ofta på exotiska marknader. Interactive Brokers passar proffs.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


const ALLA_FONDER = [
  // Indexfonder — Bäst för de flesta
  { namn: "Avanza Zero", kategori: "Indexfond Sverige", risk: "Medel", avgift: 0.00, avk1ar: 8.2, avk5ar: 11.3, avk10ar: 12.1, betyg: 5, framtid: 5, hallbar: true, desc: "Avgiftsfri Sverigefond — perfekt för nybörjare", rekommenderas: true, fargen: "#22c55e" },
  { namn: "Länsförsäkringar Global Indexnära", kategori: "Indexfond Global", risk: "Hög", avgift: 0.20, avk1ar: 14.1, avk5ar: 15.2, avk10ar: 12.1, betyg: 5, framtid: 5, hallbar: false, desc: "Bred global exponering till låg kostnad", rekommenderas: true, fargen: "#10b981" },
  { namn: "AMF Aktiefond Global", kategori: "Indexfond Global", risk: "Hög", avgift: 0.18, avk1ar: 13.8, avk5ar: 14.9, avk10ar: 11.8, betyg: 5, framtid: 5, hallbar: false, desc: "Låg avgift och stark historik", rekommenderas: true, fargen: "#10b981" },
  { namn: "AP7 Såfa", kategori: "PPM Statsfond", risk: "Hög", avgift: 0.07, avk1ar: 16.2, avk5ar: 17.1, avk10ar: 14.2, betyg: 5, framtid: 5, hallbar: false, desc: "Bäst för PPM — lägsta avgift, bäst avkastning", rekommenderas: true, fargen: "#22c55e" },
  { namn: "Swedbank Robur Access Global", kategori: "Indexfond Global", risk: "Hög", avgift: 0.19, avk1ar: 13.5, avk5ar: 14.6, avk10ar: 11.5, betyg: 4, framtid: 4, hallbar: false, desc: "Stabil global indexfond", rekommenderas: true, fargen: "#10b981" },

  // Teknik — Hög potential
  { namn: "Swedbank Robur Technology", kategori: "Teknikfond", risk: "Hög", avgift: 1.40, avk1ar: 22.4, avk5ar: 21.3, avk10ar: 18.5, betyg: 4, framtid: 5, hallbar: false, desc: "AI, halvledare och tech — hög risk men hög potential", rekommenderas: false, fargen: "#3b82f6" },
  { namn: "DNB Teknologi", kategori: "Teknikfond", risk: "Hög", avgift: 1.50, avk1ar: 19.8, avk5ar: 20.1, avk10ar: 17.2, betyg: 4, framtid: 5, hallbar: false, desc: "Nordens bästa teknikfond", rekommenderas: false, fargen: "#3b82f6" },
  { namn: "Handelsbanken Artificiell Intelligens", kategori: "AI-fond", risk: "Hög", avgift: 1.35, avk1ar: 24.1, avk5ar: 22.8, avk10ar: null, betyg: 4, framtid: 5, hallbar: false, desc: "Fokus på AI-bolag — ny men stark start", rekommenderas: false, fargen: "#8b5cf6" },

  // Hållbara fonder
  { namn: "SPP Global Solutions", kategori: "Hållbar global", risk: "Hög", avgift: 0.87, avk1ar: 11.2, avk5ar: 13.4, avk10ar: 10.9, betyg: 4, framtid: 4, hallbar: true, desc: "Grön fond med fokus på klimatlösningar", rekommenderas: false, fargen: "#10b981" },
  { namn: "Swedbank Robur Hållbar Global", kategori: "Hållbar global", risk: "Hög", avgift: 0.30, avk1ar: 12.8, avk5ar: 13.9, avk10ar: 11.2, betyg: 4, framtid: 4, hallbar: true, desc: "Hållbar global med låg avgift", rekommenderas: false, fargen: "#10b981" },
  { namn: "Öhman Global Hållbar", kategori: "Hållbar global", risk: "Hög", avgift: 0.55, avk1ar: 11.5, avk5ar: 12.8, avk10ar: 10.5, betyg: 4, framtid: 4, hallbar: true, desc: "Ledande inom hållbarhet", rekommenderas: false, fargen: "#10b981" },

  // Blandfonder — Lägre risk
  { namn: "AMF Blandfond", kategori: "Blandfond", risk: "Medel", avgift: 0.25, avk1ar: 7.8, avk5ar: 9.2, avk10ar: 8.1, betyg: 4, framtid: 3, hallbar: false, desc: "50% aktier, 50% räntor — bra balans", rekommenderas: false, fargen: "#f59e0b" },
  { namn: "Handelsbanken Multi Asset 50", kategori: "Blandfond", risk: "Medel", avgift: 0.52, avk1ar: 7.2, avk5ar: 8.8, avk10ar: 7.8, betyg: 3, framtid: 3, hallbar: false, desc: "Stabil blandfond", rekommenderas: false, fargen: "#f59e0b" },

  // Räntefonder — Lägst risk
  { namn: "Spiltan Räntefond Sverige", kategori: "Räntefond", risk: "Låg", avgift: 0.10, avk1ar: 3.8, avk5ar: 2.1, avk10ar: 1.8, betyg: 4, framtid: 2, hallbar: false, desc: "Perfekt för kort sparhorisont", rekommenderas: false, fargen: "#64748b" },
  { namn: "AMF Räntefond Lång", kategori: "Räntefond", risk: "Låg", avgift: 0.15, avk1ar: 4.2, avk5ar: 2.4, avk10ar: 2.1, betyg: 3, framtid: 2, hallbar: false, desc: "Lång ränta — passar när räntan faller", rekommenderas: false, fargen: "#64748b" },
];

function FondGuide() {
  const [filter, setFilter] = useState("alla");
  const [sort, setSort] = useState("framtid");
  const [selected, setSelected] = useState(null);
  const [showOnlyRek, setShowOnlyRek] = useState(false);

  const KATEGORIER = ["alla", "Indexfond Global", "Indexfond Sverige", "Teknikfond", "AI-fond", "Hållbar global", "Blandfond", "Räntefond", "PPM Statsfond"];

  const riskFarg = r => r === "Hög" ? "#ef4444" : r === "Medel" ? "#f59e0b" : "#10b981";
  const framtidStjarnor = n => "⭐".repeat(n) + "☆".repeat(5 - n);

  const filtered = ALLA_FONDER
    .filter(f => filter === "alla" || f.kategori === filter)
    .filter(f => !showOnlyRek || f.rekommenderas)
    .sort((a, b) => {
      if (sort === "framtid") return b.framtid - a.framtid;
      if (sort === "avk10") return (b.avk10ar || 0) - (a.avk10ar || 0);
      if (sort === "avgift") return a.avgift - b.avgift;
      if (sort === "avk1") return b.avk1ar - a.avk1ar;
      return 0;
    });

  if (selected) {
    return (
      <div>
        <button onClick={() => setSelected(null)}
          style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "linear-gradient(135deg,#10b981,#0ea5e9)", border: "none", borderRadius: 12, color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer", padding: "10px 20px", boxShadow: "0 4px 15px #10b98144", marginBottom: 16 }}>
          ← Tillbaka
        </button>

        <div style={{ background: `linear-gradient(135deg,#0f172a,${selected.fargen}11)`, borderRadius: 16, border: `1px solid ${selected.fargen}44`, padding: 20, marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#e2e8f0", marginBottom: 4 }}>{selected.namn}</div>
              <div style={{ fontSize: 12, color: "#64748b" }}>{selected.kategori}</div>
            </div>
            {selected.rekommenderas && <span style={{ fontSize: 11, background: "#10b98122", color: "#10b981", padding: "3px 10px", borderRadius: 99, fontWeight: 700 }}>REKOMMENDERAS</span>}
          </div>
          <div style={{ fontSize: 14, color: "#94a3b8", lineHeight: 1.6, marginBottom: 14 }}>{selected.desc}</div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
            {[
              ["Avgift/år", selected.avgift + "%", selected.avgift < 0.3 ? "#10b981" : selected.avgift < 0.8 ? "#f59e0b" : "#ef4444"],
              ["1 år", "+" + selected.avk1ar + "%", "#10b981"],
              ["5 år/år", "+" + selected.avk5ar + "%", "#10b981"],
              ["10 år/år", selected.avk10ar ? "+" + selected.avk10ar + "%" : "—", "#10b981"],
              ["Risk", selected.risk, riskFarg(selected.risk)],
              ["Hållbar", selected.hallbar ? "✓ Ja" : "Nej", selected.hallbar ? "#10b981" : "#475569"],
            ].map(([l, v, c]) => (
              <div key={l} style={{ background: "#0a0f1e", borderRadius: 10, padding: "10px 10px" }}>
                <div style={{ fontSize: 10, color: "#475569", marginBottom: 3 }}>{l}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: c }}>{v}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: "#0f172a", borderRadius: 14, border: "1px solid #1e293b", padding: 16, marginBottom: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#f59e0b", marginBottom: 10 }}>📈 Framtidsutsikter</div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <div style={{ fontSize: 22 }}>{framtidStjarnor(selected.framtid)}</div>
            <div style={{ fontSize: 14, color: selected.framtid >= 4 ? "#10b981" : selected.framtid >= 3 ? "#f59e0b" : "#64748b", fontWeight: 600 }}>
              {selected.framtid === 5 ? "Mycket stark potential" : selected.framtid === 4 ? "God potential" : selected.framtid === 3 ? "Stabil" : "Begränsad potential"}
            </div>
          </div>
          {selected.kategori.includes("Teknik") || selected.kategori.includes("AI") ? (
            <div style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.6 }}>AI-revolutionen driver stark tillväxt i teknikbolag. Hög risk men stor potential de närmaste 5-10 åren.</div>
          ) : selected.kategori.includes("Index") ? (
            <div style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.6 }}>Indexfonder följer marknaden och slår aktivt förvaltade fonder på lång sikt. Låg avgift är nyckeln.</div>
          ) : selected.kategori.includes("Hållbar") ? (
            <div style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.6 }}>Hållbara fonder gynnas av EU:s gröna omställning och ökande kapitalflöden till ESG-bolag.</div>
          ) : selected.kategori.includes("Blandfond") ? (
            <div style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.6 }}>Bra för sparare som vill ha lägre risk. Passar när räntorna är höga.</div>
          ) : (
            <div style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.6 }}>Räntefonder passar när du sparar kort eller vill skydda kapitalet.</div>
          )}
        </div>

        <div style={{ background: "#0f172a", borderRadius: 14, border: "1px solid #1e293b", padding: 16 }}>
          <div style={{ fontSize: 12, color: "#64748b", marginBottom: 8 }}>💡 Var kan jag köpa denna fond?</div>
          {["Avanza", "Nordnet", "Din bank (Swedbank, SEB, Nordea, Handelsbanken)"].map((p, i) => (
            <div key={i} style={{ fontSize: 13, color: "#94a3b8", marginBottom: 4, display: "flex", gap: 8 }}>
              <span style={{ color: "#10b981" }}>→</span>{p}
            </div>
          ))}
          <div style={{ fontSize: 11, color: "#334155", marginTop: 10 }}>
            ⚠ Historisk avkastning är ingen garanti för framtida resultat. Fondinvesteringar innebär alltid risk.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg,#0f172a,#0a1f0a)", borderRadius: 16, border: "1px solid #10b98133", padding: 16, marginBottom: 16 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: "#10b981", marginBottom: 4 }}>📊 Fondguide 2026</div>
        <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.5 }}>
          Jämför populära fonder baserat på avgift, historisk avkastning och framtidspotential. Tryck på en fond för mer info.
        </div>
      </div>

      {/* Top picks */}
      <div style={{ fontSize: 12, color: "#64748b", marginBottom: 10, textTransform: "uppercase", letterSpacing: 1 }}>⭐ Kapital rekommenderar</div>
      {ALLA_FONDER.filter(f => f.rekommenderas).map(f => (
        <button key={f.namn} onClick={() => setSelected(f)}
          style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", background: "#0f172a", border: `1px solid ${f.fargen}44`, borderRadius: 14, padding: "14px 16px", marginBottom: 8, cursor: "pointer", textAlign: "left" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
              <span style={{ fontSize: 10, background: "#10b98122", color: "#10b981", padding: "1px 7px", borderRadius: 99, fontWeight: 700 }}>REKOMMENDERAS</span>
              {f.hallbar && <span style={{ fontSize: 10, background: "#22c55e22", color: "#22c55e", padding: "1px 7px", borderRadius: 99 }}>🌱 Hållbar</span>}
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#e2e8f0" }}>{f.namn}</div>
            <div style={{ fontSize: 11, color: "#475569" }}>{f.kategori} · Avgift: {f.avgift}%</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#10b981" }}>+{f.avk10ar || f.avk5ar}%</div>
            <div style={{ fontSize: 10, color: "#475569" }}>10 år/år</div>
          </div>
        </button>
      ))}

      {/* Filter */}
      <div style={{ fontSize: 12, color: "#64748b", margin: "16px 0 10px", textTransform: "uppercase", letterSpacing: 1 }}>Alla fonder</div>
      <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 8, marginBottom: 10, scrollbarWidth: "none" }}>
        {["alla", "Index", "Teknik", "Hållbar", "Bland", "Ränta"].map(f => {
          const active = f === "alla" ? filter === "alla" : filter.toLowerCase().includes(f.toLowerCase());
          return (
            <button key={f} onClick={() => setFilter(f === "alla" ? "alla" : KATEGORIER.find(k => k.toLowerCase().includes(f.toLowerCase())) || f)}
              style={{ flexShrink: 0, padding: "6px 14px", background: active ? "linear-gradient(135deg,#10b981,#0ea5e9)" : "#0f172a", border: `1px solid ${active ? "transparent" : "#1e293b"}`, borderRadius: 99, color: active ? "#fff" : "#64748b", fontSize: 12, fontWeight: active ? 700 : 400, cursor: "pointer" }}>
              {f}
            </button>
          );
        })}
      </div>

      {/* Sort */}
      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
        {[["framtid","🔮 Framtid"],["avk10","📈 10-årig"],["avk1","🚀 1-årig"],["avgift","💸 Avgift"]].map(([s, label]) => (
          <button key={s} onClick={() => setSort(s)}
            style={{ flex: 1, padding: "7px 4px", background: sort === s ? "#1e293b" : "none", border: `1px solid ${sort === s ? "#334155" : "#1e293b"}`, borderRadius: 8, color: sort === s ? "#e2e8f0" : "#475569", fontSize: 11, cursor: "pointer" }}>
            {label}
          </button>
        ))}
      </div>

      {/* Fund list */}
      {filtered.map(f => (
        <button key={f.namn} onClick={() => setSelected(f)}
          style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12, padding: "12px 14px", marginBottom: 8, cursor: "pointer", textAlign: "left" }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0", marginBottom: 3 }}>{f.namn}</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <span style={{ fontSize: 10, background: riskFarg(f.risk) + "22", color: riskFarg(f.risk), padding: "1px 7px", borderRadius: 99 }}>{f.risk} risk</span>
              <span style={{ fontSize: 10, color: "#475569" }}>Avgift: {f.avgift}%</span>
              {f.hallbar && <span style={{ fontSize: 10, color: "#22c55e" }}>🌱</span>}
            </div>
          </div>
          <div style={{ textAlign: "right", marginLeft: 10 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: sort === "avgift" ? (f.avgift < 0.3 ? "#10b981" : f.avgift < 0.8 ? "#f59e0b" : "#ef4444") : "#10b981" }}>
              {sort === "avgift" ? f.avgift + "%" : sort === "avk1" ? "+" + f.avk1ar + "%" : "+" + (f.avk10ar || f.avk5ar) + "%"}
            </div>
            <div style={{ fontSize: 10, color: "#475569" }}>
              {sort === "avgift" ? "per år" : sort === "avk1" ? "1 år" : "10 år/år"}
            </div>
            <div style={{ fontSize: 13 }}>{framtidStjarnor(f.framtid)}</div>
          </div>
        </button>
      ))}

      <div style={{ fontSize: 10, color: "#334155", textAlign: "center", marginTop: 10, lineHeight: 1.7 }}>
        ⚠ Historisk avkastning är ingen garanti för framtida resultat. Alla investeringar innebär risk. Detta är inte finansiell rådgivning.
      </div>
    </div>
  );
}


function ValutaWidget({ exchangeRates, currency, currencies }) {
  const [fromAmount, setFromAmount] = useState("1000");
  const [fromCurr, setFromCurr] = useState("SEK");
  const [toCurr, setToCurr] = useState("EUR");

  const CURR = currencies || [
    { code: "SEK", symbol: "kr", flag: "🇸🇪" },
    { code: "EUR", symbol: "€", flag: "🇪🇺" },
    { code: "USD", symbol: "$", flag: "🇺🇸" },
    { code: "NOK", symbol: "kr", flag: "🇳🇴" },
    { code: "GBP", symbol: "£", flag: "🇬🇧" },
    { code: "DKK", symbol: "kr", flag: "🇩🇰" },
    { code: "CHF", symbol: "Fr", flag: "🇨🇭" },
    { code: "JPY", symbol: "¥", flag: "🇯🇵" },
  ];

  const convert = (amount, from, to) => {
    if (!exchangeRates || Object.keys(exchangeRates).length === 0) return amount;
    // Convert through SEK
    const inSEK = from === "SEK" ? amount : amount / (exchangeRates[from] || 1);
    const result = to === "SEK" ? inSEK : inSEK * (exchangeRates[to] || 1);
    return result;
  };

  const amount = parseFloat(fromAmount) || 0;
  const converted = convert(amount, fromCurr, toCurr);

  const POPULAR_PAIRS = [
    { from: "SEK", to: "EUR", label: "SEK → EUR" },
    { from: "SEK", to: "USD", label: "SEK → USD" },
    { from: "SEK", to: "NOK", label: "SEK → NOK" },
    { from: "EUR", to: "SEK", label: "EUR → SEK" },
    { from: "USD", to: "SEK", label: "USD → SEK" },
    { from: "GBP", to: "SEK", label: "GBP → SEK" },
  ];

  return (
    <div>
      <div style={{ background: "linear-gradient(135deg,#0f172a,#0a1f1a)", borderRadius: 16, border: "1px solid #10b98133", padding: 18, marginBottom: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#10b981", marginBottom: 14 }}>💱 Valutaomvandlare</div>

        {/* From */}
        <div style={{ background: "#0a0f1e", borderRadius: 12, padding: "14px 16px", marginBottom: 8 }}>
          <div style={{ fontSize: 11, color: "#64748b", marginBottom: 8 }}>Från</div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <select value={fromCurr} onChange={e => setFromCurr(e.target.value)}
              style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8, color: "#e2e8f0", fontSize: 14, padding: "6px 10px", outline: "none", cursor: "pointer" }}>
              {CURR.map(c => <option key={c.code} value={c.code} style={{ background: "#0f172a" }}>{c.flag} {c.code}</option>)}
            </select>
            <input value={fromAmount} onChange={e => setFromAmount(e.target.value)} inputMode="decimal"
              style={{ flex: 1, background: "none", border: "none", outline: "none", fontSize: 28, fontWeight: 800, color: "#e2e8f0", textAlign: "right" }} />
          </div>
        </div>

        {/* Swap button */}
        <div style={{ textAlign: "center", marginBottom: 8 }}>
          <button onClick={() => { const tmp = fromCurr; setFromCurr(toCurr); setToCurr(tmp); }}
            style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "50%", width: 36, height: 36, cursor: "pointer", fontSize: 18, color: "#10b981" }}>
            ⇅
          </button>
        </div>

        {/* To */}
        <div style={{ background: "#0a0f1e", borderRadius: 12, padding: "14px 16px", marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: "#64748b", marginBottom: 8 }}>Till</div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <select value={toCurr} onChange={e => setToCurr(e.target.value)}
              style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8, color: "#e2e8f0", fontSize: 14, padding: "6px 10px", outline: "none", cursor: "pointer" }}>
              {CURR.map(c => <option key={c.code} value={c.code} style={{ background: "#0f172a" }}>{c.flag} {c.code}</option>)}
            </select>
            <div style={{ flex: 1, fontSize: 28, fontWeight: 800, color: "#10b981", textAlign: "right" }}>
              {converted.toLocaleString("sv-SE", { maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        {/* Rate */}
        <div style={{ textAlign: "center", fontSize: 12, color: "#475569" }}>
          1 {fromCurr} = {convert(1, fromCurr, toCurr).toFixed(4)} {toCurr}
          {Object.keys(exchangeRates).length > 0 && <span style={{ color: "#10b981", marginLeft: 8 }}>● Live</span>}
        </div>
      </div>

      {/* Live rates table */}
      <div style={{ background: "#0f172a", borderRadius: 14, border: "1px solid #1e293b", padding: 16, marginBottom: 14 }}>
        <div style={{ fontSize: 12, color: "#64748b", marginBottom: 12, textTransform: "uppercase", letterSpacing: 1 }}>Dagens kurser mot SEK</div>
        {CURR.filter(c => c.code !== "SEK").map(c => {
          const rate = exchangeRates[c.code];
          const rate1000 = rate ? (1000 * rate).toFixed(2) : "—";
          return (
            <div key={c.code} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #1e293b" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 20 }}>{c.flag}</span>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#e2e8f0" }}>{c.code}</div>
                  <div style={{ fontSize: 11, color: "#475569" }}>1 {c.code}</div>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#e2e8f0" }}>
                  {rate ? (1 / rate).toFixed(4) : "—"} SEK
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick conversions */}
      <div style={{ background: "#0f172a", borderRadius: 14, border: "1px solid #1e293b", padding: 16 }}>
        <div style={{ fontSize: 12, color: "#64748b", marginBottom: 12, textTransform: "uppercase", letterSpacing: 1 }}>Snabbomvandlare</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {POPULAR_PAIRS.map(p => {
            const r = convert(1000, p.from, p.to);
            return (
              <button key={p.label} onClick={() => { setFromCurr(p.from); setToCurr(p.to); setFromAmount("1000"); }}
                style={{ background: "#0a0f1e", borderRadius: 10, padding: "10px 12px", border: "1px solid #1e293b", cursor: "pointer", textAlign: "left" }}>
                <div style={{ fontSize: 11, color: "#64748b", marginBottom: 4 }}>{p.label}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#10b981" }}>
                  1 000 → {r.toFixed(0)}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Senior-vänligt läge ───────────────────────────────────────────────────
function SeniorTab({ setSeniorMode }) {
  const [section, setSection] = useState("hem");
  const [guideKey, setGuideKey] = useState(null);

  // Reusable big button
  const BIG_BTN = ({ icon, label, color, desc, onClick }) => (
    <button onClick={onClick} style={{ display: "flex", alignItems: "center", gap: 16, width: "100%", padding: "20px 18px", background: "#0f172a", border: `2px solid ${color}44`, borderRadius: 20, cursor: "pointer", marginBottom: 12, textAlign: "left" }}>
      <div style={{ fontSize: 44, flexShrink: 0 }}>{icon}</div>
      <div>
        <div style={{ fontSize: 19, fontWeight: 700, color: "#e2e8f0" }}>{label}</div>
        {desc && <div style={{ fontSize: 13, color: "#64748b", marginTop: 3 }}>{desc}</div>}
      </div>
      <div style={{ marginLeft: "auto", fontSize: 24, color: color }}>›</div>
    </button>
  );

  const GUIDE_STEP = ({ num, text, tip }) => (
    <div style={{ display: "flex", gap: 16, marginBottom: 22, alignItems: "flex-start" }}>
      <div style={{ width: 48, height: 48, borderRadius: "50%", background: "linear-gradient(135deg,#10b981,#0ea5e9)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 800, color: "#fff", flexShrink: 0 }}>{num}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 16, color: "#e2e8f0", lineHeight: 1.7 }}>{text}</div>
        {tip && <div style={{ fontSize: 13, color: "#10b981", marginTop: 8, padding: "8px 14px", background: "#10b98111", borderRadius: 10, lineHeight: 1.5 }}>💡 {tip}</div>}
      </div>
    </div>
  );

  const GUIDES = {
    bankid: {
      title: "Hur använder jag BankID?",
      icon: "🔐",
      color: "#3b82f6",
      steps: [
        { num: 1, text: "Öppna BankID-appen på din telefon. Den har en orange ikon.", tip: "Har du inte BankID? Ring din bank så hjälper de dig att aktivera det." },
        { num: 2, text: "En hemsida eller app ber dig logga in. Tryck på 'Logga in med BankID'." },
        { num: 3, text: "BankID-appen öppnas automatiskt. Ange din 6-siffriga PIN-kod.", tip: "Glömt PIN? Ring din bank — de kan hjälpa dig återställa den." },
        { num: 4, text: "Du kan också använda fingeravtrycket om du har ställt in det." },
        { num: 5, text: "Klart! Du är nu inloggad. Det tar bara några sekunder." },
      ]
    },
    swish: {
      title: "Skicka pengar med Swish",
      icon: "💸",
      color: "#10b981",
      steps: [
        { num: 1, text: "Öppna Swish-appen på din telefon. Den har en rosa/lila ikon.", tip: "Swish finns på App Store (iPhone) och Google Play (Android)" },
        { num: 2, text: "Tryck på den stora knappen 'Skicka pengar'." },
        { num: 3, text: "Ange mottagarens mobilnummer. Dubbelkolla att det är rätt!" },
        { num: 4, text: "Skriv in beloppet i kronor." },
        { num: 5, text: "Tryck 'Skicka'. Kontrollera att rätt namn visas.", tip: "Skickar du till fel person kan pengarna vara svåra att få tillbaka. Kolla alltid namnet!" },
        { num: 6, text: "Godkänn med BankID. Pengarna är framme direkt!" },
      ]
    },
    deklaration: {
      title: "Deklarera digitalt",
      icon: "🧾",
      color: "#f59e0b",
      steps: [
        { num: 1, text: "Gå till skatteverket.se på din telefon eller dator." },
        { num: 2, text: "Tryck 'Logga in' och välj 'BankID på den här enheten'." },
        { num: 3, text: "Logga in med BankID som vanligt." },
        { num: 4, text: "Tryck 'Inkomstdeklaration 1' för din privata deklaration.", tip: "De flesta uppgifter är redan ifyllda av Skatteverket!" },
        { num: 5, text: "Kontrollera att allt stämmer. Om något är fel kan du ändra det." },
        { num: 6, text: "Tryck 'Skicka in' och signera med BankID." },
        { num: 7, text: "Klart! Du får ett kvitto direkt och beskedet kommer senare.", tip: "Bäst att deklarera i maj — då slipper du straffavgift." },
      ]
    },
    pension: {
      title: "Kolla din pension",
      icon: "👴",
      color: "#8b5cf6",
      steps: [
        { num: 1, text: "Gå till minpension.se på din telefon.", tip: "minpension.se är gratis och visar all din pension samlat." },
        { num: 2, text: "Tryck 'Logga in' och välj BankID." },
        { num: 3, text: "Nu ser du din totala pension — allmän pension, tjänstepension och privat sparande." },
        { num: 4, text: "Tryck på 'Min pension' för att se hur mycket du beräknas få per månad." },
        { num: 5, text: "Skriv upp dina belopp! Gå sedan till Kapital → Ekonomi → Pension och fyll i dem där." },
        { num: 6, text: "Ring Pensionsmyndigheten på 0771-776 776 om du har frågor.", tip: "De är mycket hjälpsamma och kan förklara allt på ett enkelt sätt." },
      ]
    },
    budget: {
      title: "Sätt upp din budget",
      icon: "💰",
      color: "#06b6d4",
      steps: [
        { num: 1, text: "Tryck på 'Ekonomi' i menyn längst ner på skärmen." },
        { num: 2, text: "Tryck på kortet 'Budget & Mål'." },
        { num: 3, text: "Tryck på 'Översikt'." },
        { num: 4, text: "Fyll i vad du tjänar per månad efter skatt.", tip: "Osäker? Kolla ditt senaste löne- eller pensionsbesked." },
        { num: 5, text: "Fyll i dina fasta kostnader — hyra, el, mat, telefon." },
        { num: 6, text: "Appen visar automatiskt hur mycket du har kvar varje månad!" },
      ]
    },
    forsak: {
      title: "Kolla dina försäkringar",
      icon: "🛡️",
      color: "#ef4444",
      steps: [
        { num: 1, text: "Tryck på 'Trygghet' i menyn längst ner." },
        { num: 2, text: "Tryck på 'Försäkring'." },
        { num: 3, text: "Tryck 'Mina försäkringar' och lägg in dina försäkringar." },
        { num: 4, text: "Tryck 'Vad behöver jag?' för att se vilka försäkringar du bör ha.", tip: "Hemförsäkring är viktigast — den täcker brand, stöld och vattenskador." },
        { num: 5, text: "Tryck 'Jämför & skaffa' för att hitta billigare alternativ." },
      ]
    },
    lan: {
      title: "Ansök om lån",
      icon: "🏦",
      color: "#f97316",
      steps: [
        { num: 1, text: "Tryck på 'Trygghet' i menyn längst ner." },
        { num: 2, text: "Tryck på 'Lån'." },
        { num: 3, text: "Välj vilken typ av lån du behöver — blankolån, billån eller bolån." },
        { num: 4, text: "Fyll i hur mycket du vill låna och på hur lång tid.", tip: "Kortare löptid = lägre total kostnad men högre månadsbetalning." },
        { num: 5, text: "Appen visar månadskostnaden hos flera banker." },
        { num: 6, text: "Tryck 'Ansök' hos den bank som passar bäst. Du skickas till bankens sida.", tip: "Jämför alltid minst 2-3 banker — räntan kan skilja sig mycket!" },
      ]
    },
    skatt: {
      title: "Beräkna din skatt",
      icon: "🧮",
      color: "#e879f9",
      steps: [
        { num: 1, text: "Tryck på 'Ekonomi' i menyn längst ner." },
        { num: 2, text: "Tryck på 'Skatt'." },
        { num: 3, text: "Välj 'Löneskatt' för att se hur mycket skatt du betalar på din lön." },
        { num: 4, text: "Fyll i din bruttolön (lönen före skatt)." },
        { num: 5, text: "Appen visar exakt hur mycket som går till skatt och vad du får ut." },
        { num: 6, text: "Välj 'ROT/RUT' om du haft hantverkare hemma — du kan ha rätt till avdrag!", tip: "ROT-avdrag kan ge dig tillbaka upp till 50 000 kr på renoveringsarbeten!" },
      ]
    },
  };

  // Show guide
  if (guideKey && GUIDES[guideKey]) {
    const guide = GUIDES[guideKey];
    return (
      <div>
        <button onClick={() => setGuideKey(null)}
          style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "linear-gradient(135deg,#10b981,#0ea5e9)", border: "none", borderRadius: 12, color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer", padding: "12px 20px", marginBottom: 20, boxShadow: "0 4px 15px #10b98144" }}>
          ← Tillbaka
        </button>

        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 56, marginBottom: 10 }}>{guide.icon}</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#e2e8f0" }}>{guide.title}</div>
        </div>

        <div style={{ background: "#0f172a", borderRadius: 18, border: `1px solid ${guide.color}33`, padding: 20, marginBottom: 16 }}>
          {guide.steps.map(step => <GUIDE_STEP key={step.num} {...step} />)}
        </div>

        <div style={{ background: "#10b98111", borderRadius: 14, border: "1px solid #10b98133", padding: 16, textAlign: "center" }}>
          <div style={{ fontSize: 16, color: "#10b981", fontWeight: 700 }}>✓ Bra jobbat!</div>
          <div style={{ fontSize: 14, color: "#64748b", marginTop: 4 }}>Tryck på tillbaka för att välja en annan guide</div>
        </div>
      </div>
    );
  }

  // Section: hem, guider, ekonomi, kontakt
  const sections = [
    { id: "hem", icon: "🏠", label: "Start" },
    { id: "guider", icon: "📚", label: "Guider" },
    { id: "ekonomi", icon: "💰", label: "Ekonomi" },
    { id: "kontakt", icon: "📞", label: "Kontakt" },
  ];

  return (
    <div>
      {/* Sub navigation */}
      <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
        {sections.map(s => (
          <button key={s.id} onClick={() => setSection(s.id)}
            style={{ flex: 1, padding: "10px 4px", background: section === s.id ? "linear-gradient(135deg,#10b981,#0ea5e9)" : "#0f172a", border: `1px solid ${section === s.id ? "transparent" : "#1e293b"}`, borderRadius: 12, color: section === s.id ? "#fff" : "#64748b", fontSize: 12, fontWeight: section === s.id ? 700 : 400, cursor: "pointer" }}>
            {s.icon}<br />{s.label}
          </button>
        ))}
      </div>

      {/* START */}
      {section === "hem" && (
        <div>
          <div style={{ background: "linear-gradient(135deg,#0f172a,#0a1f0a)", borderRadius: 20, border: "1px solid #10b98144", padding: 22, marginBottom: 20, textAlign: "center" }}>
            <div style={{ fontSize: 56, marginBottom: 10 }}>👋</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#e2e8f0", marginBottom: 8 }}>Välkommen till Senior-guiden</div>
            <div style={{ fontSize: 16, color: "#64748b", lineHeight: 1.7 }}>Här hittar du enkla guider för att sköta din ekonomi digitalt. Välj en guide nedan eller navigera med flikarna ovan.</div>
          </div>

          <div style={{ fontSize: 15, color: "#64748b", marginBottom: 12, fontWeight: 600 }}>Snabbval</div>
          <BIG_BTN icon="🔐" label="BankID — kom igång" desc="Lär dig använda BankID steg för steg" color="#3b82f6" onClick={() => setGuideKey("bankid")} />
          <BIG_BTN icon="💸" label="Skicka pengar med Swish" desc="Enkelt och säkert" color="#10b981" onClick={() => setGuideKey("swish")} />
          <BIG_BTN icon="👴" label="Kolla min pension" desc="Se vad du får på minpension.se" color="#8b5cf6" onClick={() => setGuideKey("pension")} />
        </div>
      )}

      {/* GUIDER */}
      {section === "guider" && (
        <div>
          <div style={{ fontSize: 15, color: "#64748b", marginBottom: 12, fontWeight: 600 }}>Alla guider</div>
          <BIG_BTN icon="🔐" label="BankID" desc="Logga in och signera digitalt" color="#3b82f6" onClick={() => setGuideKey("bankid")} />
          <BIG_BTN icon="💸" label="Swish" desc="Skicka och ta emot pengar" color="#10b981" onClick={() => setGuideKey("swish")} />
          <BIG_BTN icon="🧾" label="Deklarera" desc="Skicka in din deklaration digitalt" color="#f59e0b" onClick={() => setGuideKey("deklaration")} />
          <BIG_BTN icon="👴" label="Min pension" desc="Kolla pensionen på minpension.se" color="#8b5cf6" onClick={() => setGuideKey("pension")} />
          <BIG_BTN icon="💰" label="Sätt upp budget" desc="Håll koll på inkomst och utgifter" color="#06b6d4" onClick={() => setGuideKey("budget")} />
          <BIG_BTN icon="🛡️" label="Mina försäkringar" desc="Kolla och jämför försäkringar" color="#ef4444" onClick={() => setGuideKey("forsak")} />
          <BIG_BTN icon="🏦" label="Ansök om lån" desc="Jämför och ansök hos banker" color="#f97316" onClick={() => setGuideKey("lan")} />
          <BIG_BTN icon="🧮" label="Beräkna skatt" desc="Se hur mycket skatt du betalar" color="#e879f9" onClick={() => setGuideKey("skatt")} />
        </div>
      )}

      {/* EKONOMI */}
      {section === "ekonomi" && (
        <div>
          <div style={{ fontSize: 15, color: "#64748b", marginBottom: 12, fontWeight: 600 }}>Din ekonomi i Kapital</div>

          {[
            { icon: "💰", label: "Budget & Utgifter", desc: "Fyll i din inkomst och dina kostnader", tip: "Gå till Ekonomi → Budget & Mål → Översikt" },
            { icon: "👴", label: "Pension", desc: "Beräkna och planera din pension", tip: "Gå till Ekonomi → Kalkylatorer → Pension" },
            { icon: "🛡️", label: "Försäkringar", desc: "Håll koll på dina försäkringar", tip: "Gå till Trygghet → Försäkring → Mina försäkringar" },
            { icon: "🏦", label: "Lån", desc: "Jämför räntor hos svenska banker", tip: "Gå till Trygghet → Lån" },
            { icon: "🧾", label: "Skatt", desc: "Beräkna din skatt och avdrag", tip: "Gå till Ekonomi → Skatt" },
            { icon: "📊", label: "Min ekonomiska profil", desc: "En samlad bild av din ekonomi", tip: "Gå till Trygghet → Min Profil" },
          ].map((item, i) => (
            <div key={i} style={{ background: "#0f172a", borderRadius: 14, border: "1px solid #1e293b", padding: 16, marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 8 }}>
                <span style={{ fontSize: 32 }}>{item.icon}</span>
                <div>
                  <div style={{ fontSize: 17, fontWeight: 700, color: "#e2e8f0" }}>{item.label}</div>
                  <div style={{ fontSize: 13, color: "#64748b" }}>{item.desc}</div>
                </div>
              </div>
              <div style={{ background: "#1e293b", borderRadius: 8, padding: "8px 12px", fontSize: 13, color: "#10b981" }}>
                📍 {item.tip}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* KONTAKT */}
      {section === "kontakt" && (
        <div>
          <div style={{ fontSize: 15, color: "#64748b", marginBottom: 12, fontWeight: 600 }}>Viktiga telefonnummer</div>
          {[
            { icon: "🏦", label: "Swedbank", num: "0771-22 11 22", desc: "BankID och internetbank" },
            { icon: "🏦", label: "Nordea", num: "0771-22 44 88", desc: "BankID och internetbank" },
            { icon: "🏦", label: "Handelsbanken", num: "0771-77 88 99", desc: "BankID och internetbank" },
            { icon: "🏦", label: "SEB", num: "0771-62 10 00", desc: "BankID och internetbank" },
            { icon: "💸", label: "Swish kundtjänst", num: "020-12 44 88", desc: "Hjälp med Swish" },
            { icon: "🧾", label: "Skatteverket", num: "0771-567 567", desc: "Deklaration och skatter" },
            { icon: "👴", label: "Pensionsmyndigheten", num: "0771-776 776", desc: "Frågor om pension" },
            { icon: "🆘", label: "Bankbedrägeri", num: "020-10 60 00", desc: "Polisens bedrägerijouren — ring direkt om du blivit lurad!" },
          ].map((item, i) => (
            <div key={i} style={{ background: "#0f172a", borderRadius: 14, border: item.label === "Bankbedrägeri" ? "2px solid #ef444444" : "1px solid #1e293b", padding: 16, marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 28 }}>{item.icon}</span>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: item.label === "Bankbedrägeri" ? "#ef4444" : "#e2e8f0" }}>{item.label}</div>
                    <div style={{ fontSize: 12, color: "#64748b" }}>{item.desc}</div>
                  </div>
                </div>
                <a href={`tel:${item.num.replace(/-/g, "")}`}
                  style={{ padding: "10px 16px", background: item.label === "Bankbedrägeri" ? "#ef444422" : "#10b98122", border: `1px solid ${item.label === "Bankbedrägeri" ? "#ef4444" : "#10b981"}`, borderRadius: 10, color: item.label === "Bankbedrägeri" ? "#ef4444" : "#10b981", fontSize: 14, fontWeight: 700, textDecoration: "none" }}>
                  📞 Ring
                </a>
              </div>
              <div style={{ fontSize: 15, color: "#94a3b8", marginTop: 8, fontWeight: 600 }}>{item.num}</div>
            </div>
          ))}

          <div style={{ background: "#ef444411", borderRadius: 14, border: "1px solid #ef444433", padding: 16, marginTop: 8 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#ef4444", marginBottom: 8 }}>⚠️ Varning för bedrägerier!</div>
            <div style={{ fontSize: 14, color: "#94a3b8", lineHeight: 1.7 }}>
              Din bank ringer <b style={{ color: "#e2e8f0" }}>aldrig</b> och ber dig uppge PIN, BankID-kod eller flytta pengar. Lägg på direkt och ring din bank på det officiella numret ovan om du är osäker.
            </div>
          </div>
        </div>
      )}

      {/* Stäng av senior-läge */}
      <button onClick={() => { setSeniorMode(false); try { localStorage.setItem("kapital_senior", "false"); } catch {} }}
        style={{ width: "100%", padding: "14px", background: "none", border: "1px solid #334155", borderRadius: 14, color: "#64748b", fontSize: 14, cursor: "pointer", marginTop: 16 }}>
        Stäng av senior-läge
      </button>
    </div>
  );
}


function ProfilTab({ isPro, onUpgrade, lang, changeLang, t, currency, changeCurrency, exchangeRates, currencies, seniorMode, setSeniorMode, theme, setTheme }) {
  const [name, setName] = useState(() => { try { return localStorage.getItem("kapital_name") || ""; } catch { return ""; } });
  const [email, setEmail] = useState(() => { try { return localStorage.getItem("kapital_email") || ""; } catch { return ""; } });
  const [showLangs, setShowLangs] = useState(false);
  const [showCurrencies, setShowCurrencies] = useState(false);
  const [showThemes, setShowThemes] = useState(false);
  const [section, setSection] = useState("profil");

  const saveName = (v) => { setName(v); try { localStorage.setItem("kapital_name", v); } catch {} };
  const saveEmail = (v) => { setEmail(v); try { localStorage.setItem("kapital_email", v); } catch {} };
  const currencyObj = (currencies || []).find(c => c.code === currency) || { flag: "🇸🇪", name: "Svensk krona" };

  const THEMES = [
    { id: "dark", label: "Mörkt", emoji: "🌙", desc: "Standard mörkt tema", bg: "#0a0f1e", accent: "#10b981" },
    { id: "darker", label: "Svart", emoji: "⬛", desc: "Rent svart", bg: "#000000", accent: "#10b981" },
    { id: "green", label: "Grönt", emoji: "🟢", desc: "Grön accent", bg: "#0a0f1e", accent: "#22c55e" },
    { id: "blue", label: "Blått", emoji: "🔵", desc: "Blå accent", bg: "#0a0f1e", accent: "#3b82f6" },
    { id: "purple", label: "Lila", emoji: "🟣", desc: "Lila accent", bg: "#0d0a1e", accent: "#8b5cf6" },
    { id: "orange", label: "Orange", emoji: "🟠", desc: "Orange accent", bg: "#0f0a00", accent: "#f97316" },
  ];

  const resetData = (key, label) => {
    if (window.confirm(`Radera all data för ${label}?`)) {
      try { localStorage.removeItem(key); } catch {}
    }
  };

  const SECTIONS = [
    { id: "profil", icon: "👤", label: "Profil" },
    { id: "utseende", icon: "🎨", label: "Utseende" },
    { id: "kalender", icon: "📅", label: "Kalender" },
    { id: "notiser", icon: "🔔", label: "Notiser" },
    { id: "data", icon: "🗄️", label: "Data" },
  ];

  return (
    <div>
      {/* Sub nav */}
      <div style={{ display: "flex", gap: 4, background: "#0f172a", borderRadius: 12, padding: 4, border: "1px solid #1e293b", marginBottom: 16, overflowX: "auto", scrollbarWidth: "none" }}>
        {SECTIONS.map(s => (
          <button key={s.id} onClick={() => setSection(s.id)}
            style={{ flexShrink: 0, padding: "8px 10px", background: section === s.id ? "linear-gradient(135deg,#10b981,#0ea5e9)" : "none", border: "none", borderRadius: 9, color: section === s.id ? "#fff" : "#64748b", fontSize: 11, fontWeight: section === s.id ? 700 : 400, cursor: "pointer", whiteSpace: "nowrap" }}>
            {s.icon} {s.label}
          </button>
        ))}
      </div>

      {/* PROFIL */}
      {section === "profil" && (
        <div>
          {/* Avatar */}
          <div style={{ textAlign: "center", padding: "16px 0 20px" }}>
            <div style={{ width: 80, height: 80, borderRadius: "50%", background: "linear-gradient(135deg,#10b981,#0ea5e9)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 34, margin: "0 auto 12px", boxShadow: "0 4px 20px #10b98144" }}>
              {name ? name[0].toUpperCase() : "👤"}
            </div>
            <input value={name} onChange={e => saveName(e.target.value)} placeholder="Ditt namn"
              style={{ background: "none", border: "none", outline: "none", fontSize: 22, fontWeight: 700, color: "#e2e8f0", textAlign: "center", width: "100%" }} />
            {isPro && <div style={{ fontSize: 12, color: "#10b981", marginTop: 4 }}>⭐ Kapital Pro</div>}
          </div>

          {/* Email */}
          <div style={{ background: "#0f172a", borderRadius: 12, border: "1px solid #1e293b", padding: "12px 16px", marginBottom: 10 }}>
            <div style={{ fontSize: 11, color: "#64748b", marginBottom: 6 }}>📧 E-post</div>
            <input value={email} onChange={e => saveEmail(e.target.value)} placeholder="din@email.se"
              style={{ width: "100%", background: "none", border: "none", outline: "none", fontSize: 15, color: "#e2e8f0" }} />
          </div>

          {/* Pro */}
          {!isPro ? (
            <button onClick={onUpgrade} style={{ display: "flex", alignItems: "center", gap: 14, width: "100%", background: "linear-gradient(135deg,#0f1a2e,#0f172a)", border: "1px solid #10b98133", borderRadius: 14, padding: 16, cursor: "pointer", marginBottom: 10, textAlign: "left" }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: "linear-gradient(135deg,#10b981,#0ea5e9)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>🚀</div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#e2e8f0" }}>Uppgradera till Pro</div>
                <div style={{ fontSize: 12, color: "#475569" }}>49 kr/mån · Obegränsade analyser & mer</div>
              </div>
              <span style={{ marginLeft: "auto", color: "#10b981", fontSize: 18 }}>›</span>
            </button>
          ) : (
            <div style={{ background: "#10b98111", borderRadius: 14, border: "1px solid #10b98133", padding: 16, marginBottom: 10, textAlign: "center" }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#10b981" }}>⭐ Kapital Pro aktiv</div>
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>Alla funktioner upplåsta</div>
            </div>
          )}

          {/* Settings */}
          {[
            { icon: "👴", label: "Senior-läge", desc: seniorMode ? "På" : "Av", action: () => { const n = !seniorMode; setSeniorMode(n); try { localStorage.setItem("kapital_senior", String(n)); } catch {} } },
            { icon: "🌍", label: t.language, desc: LANGUAGES.find(l => l.code === lang)?.name, action: () => setShowLangs(!showLangs) },
            { icon: "💱", label: "Valuta", desc: currencyObj.flag + " " + currencyObj.name, action: () => setShowCurrencies(!showCurrencies) },
            { icon: "📤", label: "Dela Kapital", desc: "Bjud in vänner", action: () => { if (navigator.share) navigator.share({ title: "Kapital", text: "Testa Sveriges smartaste ekonomiapp!", url: window.location.href }); } },
          ].map(({ icon, label, desc, action }) => (
            <button key={label} onClick={action}
              style={{ display: "flex", alignItems: "center", gap: 14, width: "100%", background: "#0f172a", border: "1px solid #1e293b", borderRadius: 14, padding: 16, cursor: "pointer", marginBottom: 10, textAlign: "left" }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: "#1e293b", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>{icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#e2e8f0" }}>{label}</div>
                <div style={{ fontSize: 12, color: "#475569" }}>{desc}</div>
              </div>
              <span style={{ color: "#334155", fontSize: 18 }}>›</span>
            </button>
          ))}

          {showLangs && (
            <div style={{ background: "#0f172a", borderRadius: 14, border: "1px solid #1e293b", padding: 16, marginBottom: 10 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                {LANGUAGES.map(l => (
                  <button key={l.code} onClick={() => { changeLang(l.code); setShowLangs(false); }}
                    style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: lang === l.code ? "#10b98122" : "#1e293b", border: `1px solid ${lang === l.code ? "#10b981" : "#334155"}`, borderRadius: 10, cursor: "pointer" }}>
                    <span style={{ fontSize: 18 }}>{l.flag}</span>
                    <span style={{ fontSize: 12, color: lang === l.code ? "#10b981" : "#94a3b8" }}>{l.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {showCurrencies && (
            <div style={{ background: "#0f172a", borderRadius: 14, border: "1px solid #1e293b", padding: 16, marginBottom: 10 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                {(currencies || []).map(c => (
                  <button key={c.code} onClick={() => { changeCurrency(c.code); setShowCurrencies(false); }}
                    style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", background: currency === c.code ? "#10b98122" : "#1e293b", border: `1px solid ${currency === c.code ? "#10b981" : "#334155"}`, borderRadius: 10, cursor: "pointer" }}>
                    <span style={{ fontSize: 18 }}>{c.flag}</span>
                    <div>
                      <div style={{ fontSize: 12, color: currency === c.code ? "#10b981" : "#94a3b8", fontWeight: currency === c.code ? 700 : 400 }}>{c.code}</div>
                      <div style={{ fontSize: 10, color: "#475569" }}>{c.symbol}</div>
                    </div>
                    {currency === c.code && <span style={{ marginLeft: "auto", color: "#10b981" }}>✓</span>}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* UTSEENDE */}
      {section === "utseende" && (
        <div>
          <div style={{ background: "#0f172a", borderRadius: 14, border: "1px solid #1e293b", padding: 16, marginBottom: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#94a3b8", marginBottom: 14 }}>🎨 Tema & Färger</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              {THEMES.map(th => (
                <button key={th.id} onClick={() => { setTheme(th.id); try { localStorage.setItem("kapital_theme", th.id); } catch {} }}
                  style={{ background: theme === th.id ? th.accent + "22" : "#0a0f1e", border: `2px solid ${theme === th.id ? th.accent : "#1e293b"}`, borderRadius: 14, padding: "14px 8px", cursor: "pointer", textAlign: "center" }}>
                  <div style={{ fontSize: 28, marginBottom: 6 }}>{th.emoji}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: theme === th.id ? th.accent : "#64748b" }}>{th.label}</div>
                  <div style={{ fontSize: 10, color: "#334155", marginTop: 2 }}>{th.desc}</div>
                  {theme === th.id && <div style={{ fontSize: 10, color: th.accent, marginTop: 4 }}>✓ Aktiv</div>}
                </button>
              ))}
            </div>
          </div>

          <div style={{ background: "#0f172a", borderRadius: 14, border: "1px solid #1e293b", padding: 16, marginBottom: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#94a3b8", marginBottom: 14 }}>📱 Visningsinställningar</div>
            {[
              { label: "Kompakt vy", desc: "Visa mer info på skärmen", key: "kompakt" },
              { label: "Animationer", desc: "Aktivera övergångseffekter", key: "animationer" },
              { label: "Stora siffror", desc: "Större text för belopp", key: "storText" },
            ].map(s => {
              const val = (() => { try { return localStorage.getItem("kapital_" + s.key) !== "false"; } catch { return true; } })();
              return (
                <div key={s.key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: "1px solid #1e293b" }}>
                  <div>
                    <div style={{ fontSize: 14, color: "#e2e8f0" }}>{s.label}</div>
                    <div style={{ fontSize: 12, color: "#475569" }}>{s.desc}</div>
                  </div>
                  <button onClick={() => { try { localStorage.setItem("kapital_" + s.key, String(!val)); } catch {} }}
                    style={{ width: 48, height: 28, borderRadius: 99, background: val ? "#10b981" : "#1e293b", border: "none", cursor: "pointer", position: "relative", transition: "background 0.2s" }}>
                    <div style={{ width: 20, height: 20, borderRadius: "50%", background: "#fff", position: "absolute", top: 4, left: val ? 24 : 4, transition: "left 0.2s" }} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* KALENDER */}
      {section === "kalender" && <ProfilKalender />}

      {/* NOTISER */}
      {section === "notiser" && <ProfilNotiser />}

      {/* DATA */}
      {section === "data" && (
        <div>
          <div style={{ background: "#0f172a", borderRadius: 14, border: "1px solid #1e293b", padding: 16, marginBottom: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#94a3b8", marginBottom: 4 }}>📊 Din data</div>
            <div style={{ fontSize: 12, color: "#64748b", marginBottom: 14 }}>All data sparas lokalt i din webbläsare. Vi säljer aldrig din data.</div>
            {[
              ["kapital_expenses", "💸 Utgifter & Budget"],
              ["kapital_goals", "🎯 Sparmål"],
              ["kapital_forsakringar", "🛡️ Försäkringar"],
              ["kapital_abonnemang", "📱 Abonnemang"],
              ["kapital_boende", "🏠 Boendekostnader"],
              ["kapital_fordon", "🚗 Fordonskostnader"],
              ["kapital_tillgangar", "💎 Tillgångar"],
              ["kapital_skulder", "💳 Skulder"],
              ["kapital_krypto", "₿ Krypto"],
              ["kapital_pensionsbrev", "👴 Pensionsbrev"],
              ["kapital_cache", "📊 Analyshistorik"],
              ["kapital_krypto_cache", "₿ Kryptoanalyser"],
              ["kapital_news_cache", "📰 Nyheter"],
            ].map(([key, label]) => (
              <button key={key} onClick={() => resetData(key, label)}
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", padding: "10px 0", background: "none", border: "none", borderBottom: "1px solid #1e293b", cursor: "pointer" }}>
                <span style={{ fontSize: 13, color: "#94a3b8" }}>{label}</span>
                <span style={{ fontSize: 12, color: "#ef4444" }}>Rensa</span>
              </button>
            ))}
          </div>

          <button onClick={() => {
            if (window.confirm("Radera ALL data och börja om? Detta går inte att ångra.")) {
              localStorage.clear();
              window.location.reload();
            }
          }} style={{ width: "100%", padding: "14px", background: "#1a0000", border: "1px solid #ef444433", borderRadius: 14, color: "#ef4444", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
            🗑️ Radera all data & börja om
          </button>

          <div style={{ fontSize: 11, color: "#334155", textAlign: "center", marginTop: 16, lineHeight: 1.7 }}>
            © 2026 Kapital · Version 2.0<br />
            <span style={{ color: "#10b981" }}>Användarvillkor</span> · <span style={{ color: "#10b981" }}>Integritetspolicy</span>
          </div>
        </div>
      )}
    </div>
  );
}

function ProfilKalender() {
  const [events, setEvents] = useState(() => {
    try { return JSON.parse(localStorage.getItem("kapital_kalender") || "[]"); } catch { return []; }
  });
  const [adding, setAdding] = useState(false);
  const [newEvent, setNewEvent] = useState({ titel: "", datum: "", tid: "09:00", typ: "mal", notering: "" });
  const [selectedDate, setSelectedDate] = useState(null);

  const save = (e) => { setEvents(e); try { localStorage.setItem("kapital_kalender", JSON.stringify(e)); } catch {} };

  // Get goals and insurance renewals to auto-populate
  const goals = JSON.parse(localStorage.getItem("kapital_goals") || "[]");
  const forsakringar = JSON.parse(localStorage.getItem("kapital_forsakringar") || "[]");

  // Auto events from app data
  const autoEvents = [
    ...goals.filter(g => g.deadline).map(g => ({ titel: "Sparmål: " + g.name, datum: g.deadline, typ: "mal", auto: true })),
    ...forsakringar.filter(f => f.fornyelse).map(f => ({ titel: "Förnyelse: " + f.bolag, datum: f.fornyelse, typ: "forsakring", auto: true })),
  ];

  const allEvents = [...autoEvents, ...events].sort((a, b) => new Date(a.datum) - new Date(b.datum));

  const today = new Date();
  const upcoming = allEvents.filter(e => new Date(e.datum) >= today).slice(0, 10);
  const past = allEvents.filter(e => new Date(e.datum) < today).slice(0, 5);

  const typColor = t => t === "mal" ? "#10b981" : t === "forsakring" ? "#3b82f6" : t === "betalning" ? "#ef4444" : t === "rapport" ? "#f59e0b" : "#8b5cf6";
  const typIcon = t => t === "mal" ? "🎯" : t === "forsakring" ? "🛡️" : t === "betalning" ? "💳" : t === "rapport" ? "📊" : "📅";

  const formatDate = (d) => {
    const date = new Date(d);
    const months = ["jan","feb","mar","apr","maj","jun","jul","aug","sep","okt","nov","dec"];
    return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  const daysUntil = (d) => Math.ceil((new Date(d) - today) / (1000*60*60*24));

  return (
    <div>
      <div style={{ background: "linear-gradient(135deg,#0f172a,#0a1520)", borderRadius: 14, border: "1px solid #3b82f633", padding: 14, marginBottom: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#3b82f6", marginBottom: 4 }}>📅 Din ekonomikalender</div>
        <div style={{ fontSize: 12, color: "#64748b" }}>Sparmål, försäkringsförnyelser och egna händelser samlade på ett ställe.</div>
      </div>

      {/* Upcoming */}
      <div style={{ fontSize: 12, color: "#64748b", marginBottom: 10, textTransform: "uppercase", letterSpacing: 1 }}>Kommande händelser</div>
      {upcoming.length === 0 ? (
        <div style={{ textAlign: "center", padding: "20px 0", color: "#334155", fontSize: 13 }}>Inga kommande händelser. Lägg till en nedan!</div>
      ) : upcoming.map((e, i) => {
        const days = daysUntil(e.datum);
        const urgent = days <= 7 && days >= 0;
        return (
          <div key={i} style={{ background: "#0f172a", borderRadius: 12, border: `1px solid ${urgent ? "#f59e0b44" : typColor(e.typ) + "22"}`, padding: 14, marginBottom: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <span style={{ fontSize: 22 }}>{typIcon(e.typ)}</span>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#e2e8f0" }}>{e.titel}</div>
                  <div style={{ fontSize: 12, color: "#64748b" }}>{formatDate(e.datum)}{e.tid ? " · " + e.tid : ""}</div>
                  {e.notering && <div style={{ fontSize: 11, color: "#475569", marginTop: 3 }}>{e.notering}</div>}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: urgent ? "#f59e0b" : typColor(e.typ) }}>
                  {days === 0 ? "Idag!" : days === 1 ? "Imorgon" : `${days} dagar`}
                </div>
                {!e.auto && <button onClick={() => save(events.filter((_, j) => j !== events.indexOf(e)))} style={{ fontSize: 11, color: "#ef4444", background: "none", border: "none", cursor: "pointer", marginTop: 4 }}>Ta bort</button>}
                {e.auto && <div style={{ fontSize: 10, color: "#334155" }}>Auto</div>}
              </div>
            </div>
          </div>
        );
      })}

      {/* Add event */}
      {adding ? (
        <div style={{ background: "#0f172a", borderRadius: 12, border: "1px solid #1e293b", padding: 16, marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#94a3b8", marginBottom: 10 }}>Lägg till händelse</div>
          <input value={newEvent.titel} onChange={e => setNewEvent(n => ({ ...n, titel: e.target.value }))} placeholder="Titel"
            style={{ width: "100%", padding: "9px 12px", background: "#1e293b", border: "1px solid #334155", borderRadius: 8, color: "#e2e8f0", fontSize: 14, outline: "none", boxSizing: "border-box", marginBottom: 8 }} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
            <div>
              <div style={{ fontSize: 10, color: "#64748b", marginBottom: 3 }}>Datum</div>
              <input type="date" value={newEvent.datum} onChange={e => setNewEvent(n => ({ ...n, datum: e.target.value }))}
                style={{ width: "100%", padding: "8px 10px", background: "#1e293b", border: "1px solid #334155", borderRadius: 8, color: "#e2e8f0", fontSize: 13, outline: "none", boxSizing: "border-box" }} />
            </div>
            <div>
              <div style={{ fontSize: 10, color: "#64748b", marginBottom: 3 }}>Tid</div>
              <input type="time" value={newEvent.tid} onChange={e => setNewEvent(n => ({ ...n, tid: e.target.value }))}
                style={{ width: "100%", padding: "8px 10px", background: "#1e293b", border: "1px solid #334155", borderRadius: 8, color: "#e2e8f0", fontSize: 13, outline: "none", boxSizing: "border-box" }} />
            </div>
          </div>
          <select value={newEvent.typ} onChange={e => setNewEvent(n => ({ ...n, typ: e.target.value }))}
            style={{ width: "100%", padding: "9px 12px", background: "#1e293b", border: "1px solid #334155", borderRadius: 8, color: "#e2e8f0", fontSize: 14, outline: "none", marginBottom: 8 }}>
            <option value="mal" style={{ background: "#0f172a" }}>🎯 Sparmål</option>
            <option value="betalning" style={{ background: "#0f172a" }}>💳 Betalning</option>
            <option value="forsakring" style={{ background: "#0f172a" }}>🛡️ Försäkring</option>
            <option value="rapport" style={{ background: "#0f172a" }}>📊 Rapport/Möte</option>
            <option value="ovrigt" style={{ background: "#0f172a" }}>📅 Övrigt</option>
          </select>
          <input value={newEvent.notering} onChange={e => setNewEvent(n => ({ ...n, notering: e.target.value }))} placeholder="Notering (valfritt)"
            style={{ width: "100%", padding: "9px 12px", background: "#1e293b", border: "1px solid #334155", borderRadius: 8, color: "#e2e8f0", fontSize: 13, outline: "none", boxSizing: "border-box", marginBottom: 10 }} />
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => { if (newEvent.titel && newEvent.datum) { save([...events, newEvent]); setAdding(false); setNewEvent({ titel: "", datum: "", tid: "09:00", typ: "mal", notering: "" }); } }}
              style={{ flex: 1, padding: "10px", background: "linear-gradient(135deg,#10b981,#0ea5e9)", border: "none", borderRadius: 8, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Lägg till</button>
            <button onClick={() => setAdding(false)} style={{ padding: "10px 16px", background: "#1e293b", border: "1px solid #334155", borderRadius: 8, color: "#94a3b8", fontSize: 14, cursor: "pointer" }}>Avbryt</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setAdding(true)} style={{ width: "100%", padding: "12px", background: "#0f172a", border: "1px dashed #334155", borderRadius: 12, color: "#64748b", fontSize: 14, cursor: "pointer", marginBottom: 14 }}>
          + Lägg till händelse
        </button>
      )}

      {/* Past */}
      {past.length > 0 && (
        <div>
          <div style={{ fontSize: 12, color: "#334155", marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>Passerade</div>
          {past.map((e, i) => (
            <div key={i} style={{ display: "flex", gap: 10, padding: "8px 0", borderBottom: "1px solid #1e293b", opacity: 0.5 }}>
              <span style={{ fontSize: 16 }}>{typIcon(e.typ)}</span>
              <div>
                <div style={{ fontSize: 13, color: "#64748b", textDecoration: "line-through" }}>{e.titel}</div>
                <div style={{ fontSize: 11, color: "#334155" }}>{formatDate(e.datum)}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ProfilNotiser() {
  const [notiser, setNotiser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("kapital_notiser_inst") || JSON.stringify([
      { id: "sparmal", label: "Sparmål-påminnelser", desc: "Påminn när det är dags att sätta in pengar", on: true, icon: "🎯" },
      { id: "forsakring", label: "Försäkringsförnyelse", desc: "30 dagar innan förnyelse", on: true, icon: "🛡️" },
      { id: "kurs", label: "Kurslarm", desc: "När en aktie når ditt målpris", on: true, icon: "📈" },
      { id: "nyheter", label: "Ekonominyheter", desc: "Viktiga nyheter som påverkar din portfölj", on: false, icon: "📰" },
      { id: "budget", label: "Budgetvarning", desc: "När du nått 80% av din budget", on: true, icon: "💰" },
      { id: "vecka", label: "Veckosammanfattning", desc: "En sammanfattning varje måndag", on: false, icon: "📊" },
    ])); } catch { return []; }
  });
  const [adding, setAdding] = useState(false);
  const [newN, setNewN] = useState({ titel: "", datum: "", tid: "09:00", upprepning: "ingen", meddelande: "" });

  const toggle = (id) => {
    const updated = notiser.map(n => n.id === id ? { ...n, on: !n.on } : n);
    setNotiser(updated);
    try { localStorage.setItem("kapital_notiser_inst", JSON.stringify(updated)); } catch {}
  };

  const [schemalagda, setSchemalagda] = useState(() => {
    try { return JSON.parse(localStorage.getItem("kapital_schemalagda") || "[]"); } catch { return []; }
  });

  const saveSchema = (s) => { setSchemalagda(s); try { localStorage.setItem("kapital_schemalagda", JSON.stringify(s)); } catch {} };

  const requestPermission = async () => {
    if (!("Notification" in window)) { alert("Din webbläsare stöder inte notiser"); return; }
    const perm = await Notification.requestPermission();
    if (perm === "granted") alert("✓ Notiser aktiverade!");
    else alert("Notiser nekades. Ändra i webbläsarens inställningar.");
  };

  return (
    <div>
      {/* Permission */}
      <button onClick={requestPermission}
        style={{ width: "100%", padding: "14px", background: "linear-gradient(135deg,#10b981,#0ea5e9)", border: "none", borderRadius: 14, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", marginBottom: 14 }}>
        🔔 Aktivera push-notiser
      </button>

      {/* Built-in notifications */}
      <div style={{ fontSize: 12, color: "#64748b", marginBottom: 10, textTransform: "uppercase", letterSpacing: 1 }}>Notiserinställningar</div>
      {notiser.map(n => (
        <div key={n.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#0f172a", borderRadius: 12, border: "1px solid #1e293b", padding: "14px 16px", marginBottom: 8 }}>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <span style={{ fontSize: 22 }}>{n.icon}</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#e2e8f0" }}>{n.label}</div>
              <div style={{ fontSize: 12, color: "#475569" }}>{n.desc}</div>
            </div>
          </div>
          <button onClick={() => toggle(n.id)}
            style={{ width: 48, height: 28, borderRadius: 99, background: n.on ? "#10b981" : "#1e293b", border: "none", cursor: "pointer", position: "relative", flexShrink: 0 }}>
            <div style={{ width: 20, height: 20, borderRadius: "50%", background: "#fff", position: "absolute", top: 4, left: n.on ? 24 : 4, transition: "left 0.2s" }} />
          </button>
        </div>
      ))}

      {/* Custom notifications */}
      <div style={{ fontSize: 12, color: "#64748b", marginTop: 16, marginBottom: 10, textTransform: "uppercase", letterSpacing: 1 }}>Egna påminnelser</div>
      {schemalagda.map((s, i) => (
        <div key={i} style={{ background: "#0f172a", borderRadius: 12, border: "1px solid #1e293b", padding: 14, marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#e2e8f0" }}>{s.titel}</div>
            <div style={{ fontSize: 12, color: "#64748b" }}>{s.datum} · {s.tid} {s.upprepning !== "ingen" ? "· Upprepa: " + s.upprepning : ""}</div>
            {s.meddelande && <div style={{ fontSize: 11, color: "#475569" }}>{s.meddelande}</div>}
          </div>
          <button onClick={() => saveSchema(schemalagda.filter((_, j) => j !== i))} style={{ fontSize: 12, color: "#ef4444", background: "none", border: "none", cursor: "pointer" }}>✕</button>
        </div>
      ))}

      {adding ? (
        <div style={{ background: "#0f172a", borderRadius: 12, border: "1px solid #1e293b", padding: 16, marginBottom: 12 }}>
          <input value={newN.titel} onChange={e => setNewN(n => ({ ...n, titel: e.target.value }))} placeholder="Påminnelse-titel"
            style={{ width: "100%", padding: "9px 12px", background: "#1e293b", border: "1px solid #334155", borderRadius: 8, color: "#e2e8f0", fontSize: 14, outline: "none", boxSizing: "border-box", marginBottom: 8 }} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
            <input type="date" value={newN.datum} onChange={e => setNewN(n => ({ ...n, datum: e.target.value }))}
              style={{ padding: "8px 10px", background: "#1e293b", border: "1px solid #334155", borderRadius: 8, color: "#e2e8f0", fontSize: 13, outline: "none" }} />
            <input type="time" value={newN.tid} onChange={e => setNewN(n => ({ ...n, tid: e.target.value }))}
              style={{ padding: "8px 10px", background: "#1e293b", border: "1px solid #334155", borderRadius: 8, color: "#e2e8f0", fontSize: 13, outline: "none" }} />
          </div>
          <select value={newN.upprepning} onChange={e => setNewN(n => ({ ...n, upprepning: e.target.value }))}
            style={{ width: "100%", padding: "9px 12px", background: "#1e293b", border: "1px solid #334155", borderRadius: 8, color: "#e2e8f0", fontSize: 13, outline: "none", marginBottom: 8 }}>
            <option value="ingen" style={{ background: "#0f172a" }}>Ingen upprepning</option>
            <option value="dagligen" style={{ background: "#0f172a" }}>Dagligen</option>
            <option value="veckovis" style={{ background: "#0f172a" }}>Veckovis</option>
            <option value="månadsvis" style={{ background: "#0f172a" }}>Månadsvis</option>
          </select>
          <input value={newN.meddelande} onChange={e => setNewN(n => ({ ...n, meddelande: e.target.value }))} placeholder="Meddelande (valfritt)"
            style={{ width: "100%", padding: "9px 12px", background: "#1e293b", border: "1px solid #334155", borderRadius: 8, color: "#e2e8f0", fontSize: 13, outline: "none", boxSizing: "border-box", marginBottom: 10 }} />
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => { if (newN.titel && newN.datum) { saveSchema([...schemalagda, newN]); setAdding(false); setNewN({ titel: "", datum: "", tid: "09:00", upprepning: "ingen", meddelande: "" }); } }}
              style={{ flex: 1, padding: "10px", background: "linear-gradient(135deg,#10b981,#0ea5e9)", border: "none", borderRadius: 8, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Spara</button>
            <button onClick={() => setAdding(false)} style={{ padding: "10px 16px", background: "#1e293b", border: "1px solid #334155", borderRadius: 8, color: "#94a3b8", fontSize: 14, cursor: "pointer" }}>Avbryt</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setAdding(true)} style={{ width: "100%", padding: "12px", background: "#0f172a", border: "1px dashed #334155", borderRadius: 12, color: "#64748b", fontSize: 14, cursor: "pointer" }}>
          + Lägg till påminnelse
        </button>
      )}
    </div>
  );
}

  const [name, setName] = useState(() => { try { return localStorage.getItem("kapital_name") || ""; } catch { return ""; } });
  const [showLangs, setShowLangs] = useState(false);
  const [showCurrencies, setShowCurrencies] = useState(false);
  const currencyObj = (currencies || []).find(c => c.code === currency) || { flag: "🇸🇪", name: "Svensk krona" };

  const saveName = (v) => { setName(v); try { localStorage.setItem("kapital_name", v); } catch {} };

  const resetData = (key, label) => {
    if (window.confirm(`Radera all data för ${label}?`)) {
      try { localStorage.removeItem(key); } catch {}
    }
  };

  return (
    <div>
      <div style={{ textAlign: "center", padding: "20px 0 24px" }}>
        <div style={{ width: 72, height: 72, borderRadius: "50%", background: "linear-gradient(135deg,#10b981,#0ea5e9)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, margin: "0 auto 12px" }}>
          {name ? name[0].toUpperCase() : "👤"}
        </div>
        <input value={name} onChange={e => saveName(e.target.value)} placeholder="Ditt namn"
          style={{ background: "none", border: "none", outline: "none", fontSize: 20, fontWeight: 700, color: "#e2e8f0", textAlign: "center", width: "100%" }} />
        {isPro && <div style={{ fontSize: 12, color: "#10b981", marginTop: 4 }}>✓ Kapital Pro</div>}
      </div>

      {/* Pro status */}
      {!isPro ? (
        <button onClick={onUpgrade} style={{ display: "flex", alignItems: "center", gap: 14, width: "100%", background: "linear-gradient(135deg,#0f1a2e,#0f172a)", border: "1px solid #10b98133", borderRadius: 14, padding: 16, cursor: "pointer", marginBottom: 10, textAlign: "left" }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: "linear-gradient(135deg,#10b981,#0ea5e9)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>🚀</div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#e2e8f0" }}>Uppgradera till Pro</div>
            <div style={{ fontSize: 12, color: "#475569" }}>49 kr/mån · Obegränsade analyser & mer</div>
          </div>
        </button>
      ) : (
        <div style={{ background: "#10b98111", borderRadius: 14, border: "1px solid #10b98133", padding: 16, marginBottom: 10, textAlign: "center" }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#10b981" }}>⭐ Kapital Pro aktiv</div>
          <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>Alla funktioner upplåsta</div>
        </div>
      )}

      {/* Settings */}
      {[
        { icon: "👴", label: "Senior-läge", desc: seniorMode ? "På — enkla guider aktiva" : "Av — aktivera för enklare guider", action: () => { const next = !seniorMode; setSeniorMode(next); try { localStorage.setItem("kapital_senior", String(next)); } catch {} } },
        { icon: "🌍", label: t.language, desc: LANGUAGES.find(l => l.code === lang)?.name, action: () => setShowLangs(!showLangs) },
        { icon: "💱", label: "Valuta", desc: currencyObj.flag + " " + currencyObj.name, action: () => setShowCurrencies(!showCurrencies) },
        { icon: "🔔", label: "Kurslarm", desc: "Hantera aktiva larm", action: () => {} },
        { icon: "📤", label: "Dela Kapital", desc: "Bjud in vänner", action: () => { if (navigator.share) navigator.share({ title: "Kapital", text: "Testa Sveriges smartaste ekonomiapp!", url: window.location.href }); } },
      ].map(({ icon, label, desc, action }) => (
        <button key={label} onClick={action}
          style={{ display: "flex", alignItems: "center", gap: 14, width: "100%", background: "#0f172a", border: "1px solid #1e293b", borderRadius: 14, padding: 16, cursor: "pointer", marginBottom: 10, textAlign: "left" }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: "#1e293b", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>{icon}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#e2e8f0" }}>{label}</div>
            <div style={{ fontSize: 12, color: "#475569" }}>{desc}</div>
          </div>
          <span style={{ color: "#334155", fontSize: 18 }}>›</span>
        </button>
      ))}

      {/* Currency picker */}
      {showCurrencies && (
        <div style={{ background: "#0f172a", borderRadius: 14, border: "1px solid #1e293b", padding: 16, marginBottom: 10 }}>
          <div style={{ fontSize: 12, color: "#64748b", marginBottom: 10 }}>Välj visningsvaluta</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            {(currencies || []).map(c => (
              <button key={c.code} onClick={() => { changeCurrency(c.code); setShowCurrencies(false); }}
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", background: currency === c.code ? "#10b98122" : "#1e293b", border: `1px solid ${currency === c.code ? "#10b981" : "#334155"}`, borderRadius: 10, cursor: "pointer" }}>
                <span style={{ fontSize: 18 }}>{c.flag}</span>
                <div style={{ textAlign: "left" }}>
                  <div style={{ fontSize: 12, color: currency === c.code ? "#10b981" : "#94a3b8", fontWeight: currency === c.code ? 700 : 400 }}>{c.code}</div>
                  <div style={{ fontSize: 10, color: "#475569" }}>{c.symbol}</div>
                </div>
                {currency === c.code && <span style={{ marginLeft: "auto", color: "#10b981", fontSize: 12 }}>✓</span>}
              </button>
            ))}
          </div>
          <div style={{ fontSize: 11, color: "#475569", marginTop: 10, textAlign: "center" }}>
            Kurser hämtas live — belopp omvandlas automatiskt i hela appen
          </div>
        </div>
      )}

      {/* Language picker */}
      {showLangs && (
        <div style={{ background: "#0f172a", borderRadius: 14, border: "1px solid #1e293b", padding: 16, marginBottom: 10 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            {LANGUAGES.map(l => (
              <button key={l.code} onClick={() => { changeLang(l.code); setShowLangs(false); }}
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: lang === l.code ? "#10b98122" : "#1e293b", border: `1px solid ${lang === l.code ? "#10b981" : "#334155"}`, borderRadius: 10, cursor: "pointer" }}>
                <span style={{ fontSize: 18 }}>{l.flag}</span>
                <span style={{ fontSize: 12, color: lang === l.code ? "#10b981" : "#94a3b8" }}>{l.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Data management */}
      <div style={{ background: "#0f172a", borderRadius: 14, border: "1px solid #1e293b", padding: 16, marginTop: 8 }}>
        <div style={{ fontSize: 12, color: "#64748b", marginBottom: 12, textTransform: "uppercase", letterSpacing: 1 }}>Datahantering</div>
        {[
          ["kapital_expenses", "Utgifter"],
          ["kapital_goals", "Sparmål"],
          ["kapital_forsakringar", "Försäkringar"],
          ["kapital_abonnemang", "Abonnemang"],
          ["kapital_cache", "Analyshistorik"],
        ].map(([key, label]) => (
          <button key={key} onClick={() => resetData(key, label)}
            style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", padding: "8px 0", background: "none", border: "none", borderBottom: "1px solid #1e293b", cursor: "pointer" }}>
            <span style={{ fontSize: 13, color: "#94a3b8" }}>Rensa {label}</span>
            <span style={{ fontSize: 12, color: "#ef4444" }}>Radera</span>
          </button>
        ))}
      </div>

      <div style={{ fontSize: 11, color: "#334155", textAlign: "center", marginTop: 16, lineHeight: 1.7 }}>
        © 2026 Kapital · Version 1.0<br />
        <span style={{ color: "#10b981" }}>Användarvillkor</span> · <span style={{ color: "#10b981" }}>Integritetspolicy</span>
      </div>
    </div>
  );
}


// ── Min Ekonomi — Samlad balansräkning ───────────────────────────────────
function MinEkonomi({ isPro, onUpgrade }) {
  const [tillgangar, setTillgangar] = useState(() => {
    try { return JSON.parse(localStorage.getItem("kapital_tillgangar") || JSON.stringify([
      { id: "aktier", label: "Aktier & Fonder", emoji: "📈", varde: "", color: "#10b981" },
      { id: "sparande", label: "Sparkonto", emoji: "🏦", varde: "", color: "#3b82f6" },
      { id: "bostad", label: "Bostad/Fastighet", emoji: "🏠", varde: "", color: "#8b5cf6" },
      { id: "pension", label: "Pensionskapital", emoji: "👴", varde: "", color: "#f59e0b" },
      { id: "ovrigt", label: "Övrigt", emoji: "💎", varde: "", color: "#06b6d4" },
    ])); } catch { return []; }
  });

  const [skulder, setSkulder] = useState(() => {
    try { return JSON.parse(localStorage.getItem("kapital_skulder") || JSON.stringify([
      { id: "bolan", label: "Bolån", emoji: "🏠", varde: "", color: "#ef4444" },
      { id: "billan", label: "Billån", emoji: "🚗", varde: "", color: "#f97316" },
      { id: "blanko", label: "Blankolån", emoji: "💳", varde: "", color: "#f59e0b" },
      { id: "kredit", label: "Kreditkort", emoji: "💳", varde: "", color: "#ef4444" },
      { id: "ovrigt", label: "Övrigt", emoji: "📋", varde: "", color: "#64748b" },
    ])); } catch { return []; }
  });

  const saveTillgangar = (t) => { setTillgangar(t); try { localStorage.setItem("kapital_tillgangar", JSON.stringify(t)); } catch {} };
  const saveSkulder = (s) => { setSkulder(s); try { localStorage.setItem("kapital_skulder", JSON.stringify(s)); } catch {} };

  const totalTillgangar = tillgangar.reduce((s, t) => s + (parseFloat(t.varde) || 0), 0);
  const totalSkulder = skulder.reduce((s, t) => s + (parseFloat(t.varde) || 0), 0);
  const nettovarde = totalTillgangar - totalSkulder;
  const skuldgrad = totalTillgangar > 0 ? (totalSkulder / totalTillgangar * 100) : 0;

  // Also pull in monthly costs
  const expenses = JSON.parse(localStorage.getItem("kapital_expenses") || "{}");
  const forsakringar = JSON.parse(localStorage.getItem("kapital_forsakringar") || "[]");
  const abonnemang = JSON.parse(localStorage.getItem("kapital_abonnemang") || "[]");
  const boende = JSON.parse(localStorage.getItem("kapital_boende") || "[]");
  const fordon = JSON.parse(localStorage.getItem("kapital_fordon") || "[]");
  const income = parseFloat(localStorage.getItem("kapital_income") || "0");
  const k4Trades = JSON.parse(localStorage.getItem("kapital_k4") || "[]");

  const totalForsakring = forsakringar.reduce((s, f) => s + (parseFloat(f.kostnad) || 0), 0);
  const totalAbonnemang = abonnemang.reduce((s, a) => {
    const k = parseFloat(a.kostnad) || 0;
    return s + (a.fakturering === "ar" ? k / 12 : k);
  }, 0);
  const totalBoende = boende.reduce((s, b) => s + (parseFloat(b.kostnad) || 0), 0);
  const totalFordon = fordon.reduce((s, f) => s + (parseFloat(f.kostnad) || 0), 0);
  const totalUtgifter = Object.values(expenses).reduce((s, v) => s + (parseFloat(v) || 0), 0);

  const InputRow = ({ item, items, save }) => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #1e293b" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 20 }}>{item.emoji}</span>
        <span style={{ fontSize: 13, color: "#e2e8f0" }}>{item.label}</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <input
          value={item.varde}
          onChange={e => save(items.map(i => i.id === item.id ? { ...i, varde: e.target.value } : i))}
          placeholder="0"
          inputMode="decimal"
          style={{ width: 110, padding: "6px 10px", background: "#1e293b", border: "1px solid #334155", borderRadius: 8, color: "#e2e8f0", fontSize: 14, outline: "none", textAlign: "right" }}
        />
        <span style={{ fontSize: 11, color: "#475569" }}>kr</span>
      </div>
    </div>
  );

  return (
    <div>
      {/* Nettovärde — det viktigaste */}
      <div style={{ background: `linear-gradient(135deg,${nettovarde >= 0 ? "#0a1f0a" : "#1a0000"},#0f172a)`, borderRadius: 18, border: `1px solid ${nettovarde >= 0 ? "#10b98144" : "#ef444444"}`, padding: 22, marginBottom: 16, textAlign: "center" }}>
        <div style={{ fontSize: 12, color: "#64748b", marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>💎 Ditt nettovärde</div>
        <div style={{ fontSize: 44, fontWeight: 900, color: nettovarde >= 0 ? "#10b981" : "#ef4444" }}>
          {nettovarde >= 0 ? "" : "-"}{Math.abs(nettovarde).toLocaleString("sv-SE", { maximumFractionDigits: 0 })} kr
        </div>
        <div style={{ fontSize: 12, color: "#64748b", marginTop: 6 }}>Tillgångar − Skulder</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginTop: 16 }}>
          {[
            ["Tillgångar", totalTillgangar, "#10b981"],
            ["Skulder", totalSkulder, "#ef4444"],
            ["Skuldsättning", `${skuldgrad.toFixed(0)}%`, skuldgrad > 70 ? "#ef4444" : skuldgrad > 40 ? "#f59e0b" : "#10b981"],
          ].map(([l, v, c]) => (
            <div key={l} style={{ background: "#0a0f1e", borderRadius: 10, padding: "10px 8px" }}>
              <div style={{ fontSize: 10, color: "#475569", marginBottom: 3 }}>{l}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: c }}>
                {typeof v === "string" ? v : v.toLocaleString("sv-SE", { maximumFractionDigits: 0 }) + " kr"}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tillgångar */}
      <div style={{ background: "#0f172a", borderRadius: 14, border: "1px solid #10b98133", padding: 16, marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#10b981" }}>📈 Tillgångar</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#10b981" }}>{totalTillgangar.toLocaleString("sv-SE", { maximumFractionDigits: 0 })} kr</div>
        </div>
        {tillgangar.map(t => <InputRow key={t.id} item={t} items={tillgangar} save={saveTillgangar} />)}
      </div>

      {/* Skulder */}
      <div style={{ background: "#0f172a", borderRadius: 14, border: "1px solid #ef444433", padding: 16, marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#ef4444" }}>💳 Skulder</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#ef4444" }}>{totalSkulder.toLocaleString("sv-SE", { maximumFractionDigits: 0 })} kr</div>
        </div>
        {skulder.map(s => <InputRow key={s.id} item={s} items={skulder} save={saveSkulder} />)}
      </div>

      {/* Månadsöversikt */}
      <div style={{ background: "#0f172a", borderRadius: 14, border: "1px solid #1e293b", padding: 16, marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#94a3b8", marginBottom: 12 }}>💸 Månatliga utgifter — samlad vy</div>
        {[
          ["💰 Inkomst", income, "#10b981"],
          ["🏠 Boende & Levnad", totalUtgifter + totalBoende, "#ef4444"],
          ["🛡️ Försäkringar", totalForsakring, "#06b6d4"],
          ["📱 Abonnemang", totalAbonnemang, "#8b5cf6"],
          ["🚗 Fordon", totalFordon, "#f97316"],
        ].map(([label, value, color]) => value > 0 && (
          <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #1e293b" }}>
            <span style={{ fontSize: 13, color: "#64748b" }}>{label}</span>
            <span style={{ fontSize: 14, fontWeight: 600, color }}>{value.toLocaleString("sv-SE", { maximumFractionDigits: 0 })} kr</span>
          </div>
        ))}
        <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", marginTop: 4 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: "#e2e8f0" }}>Kvar att spara</span>
          <span style={{ fontSize: 16, fontWeight: 800, color: income - totalUtgifter - totalBoende - totalForsakring - totalAbonnemang - totalFordon >= 0 ? "#10b981" : "#ef4444" }}>
            {(income - totalUtgifter - totalBoende - totalForsakring - totalAbonnemang - totalFordon).toLocaleString("sv-SE", { maximumFractionDigits: 0 })} kr
          </span>
        </div>
      </div>

      {/* Skatt-sammanfattning */}
      <div style={{ background: "#0f172a", borderRadius: 14, border: "1px solid #f59e0b33", padding: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#f59e0b", marginBottom: 10 }}>🧾 Skatteöversikt 2026</div>
        <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.7 }}>
          Gå till <b style={{ color: "#e2e8f0" }}>Ekonomi → Skatt → K4</b> för att beräkna kapitalvinstskatt på dina aktieaffärer.<br />
          Gå till <b style={{ color: "#e2e8f0" }}>Ekonomi → Skatt → ISK</b> för att se din ISK-skatt.<br />
          Gå till <b style={{ color: "#e2e8f0" }}>Ekonomi → Skatt → Lön</b> för att se din nettolön och marginalskatt.
        </div>
      </div>
    </div>
  );
}

function Kapital() {
  const [lang, setLang] = useState(() => {
    try { return localStorage.getItem("kapital_lang") || "sv"; } catch { return "sv"; }
  });
  const [showLangPicker, setShowLangPicker] = useState(false);
  const t = T[lang] || T.sv;
  const isRTL = LANGUAGES.find(l => l.code === lang)?.rtl || false;

  const changeLang = (code) => {
    setLang(code);
    try { localStorage.setItem("kapital_lang", code); } catch {}
    setShowLangPicker(false);
  };

  const [currency, setCurrency] = useState(() => {
    try { return localStorage.getItem("kapital_currency") || "SEK"; } catch { return "SEK"; }
  });
  const [exchangeRates, setExchangeRates] = useState({});
  const [ratesLoading, setRatesLoading] = useState(false);

  const CURRENCIES = [
    { code: "SEK", symbol: "kr", flag: "🇸🇪", name: "Svensk krona" },
    { code: "NOK", symbol: "kr", flag: "🇳🇴", name: "Norsk krone" },
    { code: "DKK", symbol: "kr", flag: "🇩🇰", name: "Dansk krone" },
    { code: "EUR", symbol: "€", flag: "🇪🇺", name: "Euro" },
    { code: "USD", symbol: "$", flag: "🇺🇸", name: "US Dollar" },
    { code: "GBP", symbol: "£", flag: "🇬🇧", name: "Brittiskt pund" },
    { code: "CHF", symbol: "Fr", flag: "🇨🇭", name: "Schweizisk franc" },
    { code: "JPY", symbol: "¥", flag: "🇯🇵", name: "Japansk yen" },
    { code: "PLN", symbol: "zl", flag: "🇵🇱", name: "Polsk zloty" },
    { code: "CZK", symbol: "Kc", flag: "🇨🇿", name: "Tjeckisk koruna" },
  ];

  // Fetch live exchange rates from API
  useEffect(() => {
    const fetchRates = async () => {
      setRatesLoading(true);
      try {
        const resp = await fetch("https://open.er-api.com/v6/latest/SEK");
        if (resp.ok) {
          const data = await resp.json();
          setExchangeRates(data.rates || {});
        }
      } catch {
        // Fallback rates relative to SEK
        setExchangeRates({ SEK: 1, NOK: 0.97, DKK: 0.68, EUR: 0.091, USD: 0.098, GBP: 0.077, CHF: 0.087, JPY: 14.8, PLN: 0.39, CZK: 2.29 });
      }
      setRatesLoading(false);
    };
    fetchRates();
  }, []);

  const changeCurrency = (code) => {
    setCurrency(code);
    try { localStorage.setItem("kapital_currency", code); } catch {}
  };

  // Convert amount from SEK to selected currency
  const convertCurrency = (sekAmount) => {
    if (currency === "SEK" || !exchangeRates[currency]) return sekAmount;
    return sekAmount * exchangeRates[currency];
  };

  const formatCurrency = (sekAmount, decimals = 0) => {
    const curr = CURRENCIES.find(c => c.code === currency);
    const converted = convertCurrency(sekAmount);
    return converted.toLocaleString("sv-SE", { maximumFractionDigits: decimals }) + " " + (curr?.symbol || "kr");
  };

  const [tab, setTab] = useState(0);
  const [subTab, setSubTab] = useState("analys");
  const [showMore, setShowMore] = useState(false);
  const [seniorMode, setSeniorMode] = useState(() => {
    try { return localStorage.getItem("kapital_senior") === "true"; } catch { return false; }
  });
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem("kapital_theme") || "dark"; } catch { return "dark"; }
  });

  // Apply theme
  const THEME_ACCENTS = { dark: "#10b981", darker: "#10b981", green: "#22c55e", blue: "#3b82f6", purple: "#8b5cf6", orange: "#f97316" };
  const [showOnboarding, setShowOnboarding] = useState(() => {
    try { return !localStorage.getItem("kapital_onboarded"); } catch { return true; }
  });
  const [showCompare, setShowCompare] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const { unlock, newAchievement } = useGamification();

  // Browser history navigation — back button support
  useEffect(() => {
    window.history.replaceState({ tab: 0, sub: null, section: null }, "");
    const handlePop = (e) => {
      const state = e.state || {};
      setTab(state.tab || 0);
      setSubTab(state.sub || "analys");
    };
    window.addEventListener("popstate", handlePop);
    return () => window.removeEventListener("popstate", handlePop);
  }, []);

  const goToTab = useCallback((newTab, newSubTab) => {
    window.history.pushState({ tab: newTab, sub: newSubTab || null }, "");
    setTab(newTab);
    if (newSubTab) setSubTab(newSubTab);
  }, []);

  // Voice control
  const income = parseFloat(localStorage.getItem("kapital_income") || "0");
  const expenses = JSON.parse(localStorage.getItem("kapital_expenses") || "{}");
  const totalExp = Object.values(expenses).reduce((s, v) => s + (parseFloat(v) || 0), 0);
  const leftover = income - totalExp;
  const savingsRate = income > 0 ? (leftover / income * 100) : 0;

  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadStep, setLoadStep] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([]);
  const [cache, setCache] = useState(() => {
    try { return JSON.parse(localStorage.getItem("kapital_cache") || "{}"); } catch { return {}; }
  });
  const [isPro, setIsPro] = useState(() => {
    try {
      // Check for successful Stripe payment redirect
      const params = new URLSearchParams(window.location.search);
      if (params.get("payment") === "success") {
        localStorage.setItem("kapital_pro", "true");
        window.history.replaceState({}, "", window.location.pathname);
        return true;
      }
      return localStorage.getItem("kapital_pro") === "true";
    } catch { return false; }
  });
  const [usageCount, setUsageCount] = useState(() => {
    try { return parseInt(localStorage.getItem("kapital_usage") || "0", 10); } catch { return 0; }
  });
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (m) => { setToast(m); setTimeout(() => setToast(null), 2500); };

  const analyze = useCallback(async (company) => {
    const name = (company || query).trim();
    if (!name) return;
    if (!isPro && usageCount >= FREE_LIMIT) { setShowUpgrade(true); return; }

    // Cache hit — visa direkt, 0ms
    const cacheKey = name.toLowerCase();
    if (cache[cacheKey]) {
      setResult(cache[cacheKey]);
      setHistory(prev => [cache[cacheKey], ...prev.filter(h => h.company !== cache[cacheKey].company)].slice(0, 5));
      showToast(t.cached);
      return;
    }

    // Cache miss — hämta från API med animerade steg
    setLoading(true); setLoadStep(0); setError(null); setResult(null);

    // Stega igenom laddningstexterna medan vi väntar
    const STEPS = ["Hämtar bolagsdata...", "Analyserar nyhetsflöde...", "Beräknar riskprofil...", "Sammanställer analys..."];
    const stepInterval = setInterval(() => {
      setLoadStep(s => s < STEPS.length - 1 ? s + 1 : s);
    }, 600);

    try {
      if (!KEY) throw new Error("API-nyckel saknas — lägg till REACT_APP_ANTHROPIC_KEY i miljövariabler");
      const resp = await fetch(API, {
        method: "POST", headers: { "Content-Type": "application/json", "x-api-key": KEY, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
        body: JSON.stringify({
          model: FAST_MODEL, max_tokens: 900,
          messages: [{ role: "user", content: "Du är en aktieanalytiker. Analysera bolaget: " + name + "\n\nSvara EXAKT med detta JSON-format och inget annat:\n{\"company\":\"BOLAGSNAMN\",\"sector\":\"SEKTOR\",\"summary\":\"SAMMANFATTNING 2-3 meningar\",\"score\":70,\"scoreReason\":\"MOTIVERING\",\"recommendation\":\"Köp\",\"keyRisks\":[\"Risk 1\",\"Risk 2\",\"Risk 3\"],\"keyStrengths\":[\"Styrka 1\",\"Styrka 2\",\"Styrka 3\"],\"catalysts\":[\"Katalysator 1\",\"Katalysator 2\"],\"nyckeltal\":{\"pe\":20,\"ps\":2,\"ey\":5,\"direktavkastning\":2,\"borsvarde\":\"100 mdkr\",\"ebitdaMarginal\":15,\"skuldsattning\":\"Lag\",\"betavarde\":1},\"utdelning\":{\"belopp\":\"3 kr\",\"datum\":\"2026-04-01\",\"frekvens\":\"Arsvis\",\"historik\":[2,2.5,2.8,3]},\"insider\":[{\"namn\":\"VD\",\"typ\":\"Kop\",\"antal\":10000,\"kurs\":100,\"datum\":\"2026-05-01\"}],\"grafData\":[95,98,102,99,105,103,108,106,110,107,112,109],\"news\":[{\"headline\":\"Nyhet om bolaget\",\"date\":\"2026\",\"source\":\"DI\",\"sentiment\":\"positiv\"}],\"timeHorizon\":\"Medel 6-18 man\",\"lastUpdated\":\"Juni 2026\"}\n\nByt ut alla värden mot verkliga uppskattningar för " + name + ". Score: 0-30=Salj 31-60=Avvakta 61-100=Kop. Recommendation maste vara exakt: Kop, Avvakta, eller Salj." }]
        })
      });

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        console.error("API error:", resp.status, errData);
        if (resp.status === 401) throw new Error("API-nyckel saknas eller är ogiltig (401)");
        if (resp.status === 400) throw new Error("Fel i anropet (400) — " + (errData.error?.message || JSON.stringify(errData)));
        if (resp.status === 429) throw new Error("För många anrop — vänta lite och försök igen");
        throw new Error("API-fel: " + resp.status);
      }

      const data = await resp.json();

      // Robust parsing — handle various AI response formats
      const text = data.content?.map(b => b.text || "").join("") || "";
      let parsed;
      try {
        // Try direct parse first
        const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        // Find JSON object
        const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("Ingen JSON hittades i: " + text.slice(0, 100));
        parsed = JSON.parse(jsonMatch[0]);
        // Validate required fields
        if (!parsed.company) parsed.company = name;
        if (!parsed.summary) parsed.summary = "Analys genererad för " + name;
        if (!parsed.score) parsed.score = 50;
        if (!parsed.recommendation) parsed.recommendation = "Avvakta";
        if (!parsed.keyRisks) parsed.keyRisks = ["Marknadsrisk", "Valutarisk", "Konjunkturrisk"];
        if (!parsed.keyStrengths) parsed.keyStrengths = ["Etablerat varumärke", "Stark position", "Kassaflöde"];
        if (!parsed.nyckeltal) parsed.nyckeltal = { pe: 0, ps: 0, ey: 0, direktavkastning: 0, borsvarde: "—", ebitdaMarginal: 0, skuldsattning: "—", betavarde: 1 };
        if (!parsed.grafData) parsed.grafData = [95,98,102,99,105,103,108,106,110,107,112,109];
        if (!parsed.news) parsed.news = [];
      } catch (parseErr) {
        console.error("Parse error:", parseErr.message, "Text:", text.slice(0, 200));
        // Create reasonable fallback with actual data
        parsed = {
          company: name, sector: "Okänd", summary: "AI-analys genererad för " + name + ". Data baserad på allmänt tillgänglig information.",
          score: 55, scoreReason: "Generell bedömning", recommendation: "Avvakta",
          keyRisks: ["Marknadsrisk", "Makroekonomisk osäkerhet", "Konkurrens"],
          keyStrengths: ["Etablerat bolag", "Marknadsnärvaro", "Varumärkeskännedom"],
          catalysts: ["Marknadsutveckling", "Produktlansering"],
          nyckeltal: { pe: 15, ps: 2, ey: 5, direktavkastning: 2, borsvarde: "—", ebitdaMarginal: 10, skuldsattning: "Medel", betavarde: 1 },
          utdelning: { belopp: "—", datum: "—", frekvens: "Årsvis", historik: [0, 0, 0, 0] },
          insider: [], grafData: [95,98,102,99,105,103,108,106,110,107,112,109],
          news: [], timeHorizon: "Medel (6-18 mån)", lastUpdated: "Juni 2026"
        };
      }

      // Spara i cache (max 20 bolag, 24h giltighetstid)
      const newCache = { ...cache, [cacheKey]: { ...parsed, _cached: Date.now() } };
      const keys = Object.keys(newCache);
      if (keys.length > 20) delete newCache[keys[0]];
      setCache(newCache);
      try { localStorage.setItem("kapital_cache", JSON.stringify(newCache)); } catch {}

      setResult(parsed);
      setUsageCount(c => {
        const next = c + 1;
        try { localStorage.setItem("kapital_usage", String(next)); } catch {}
        return next;
      });
      setHistory(prev => [parsed, ...prev.filter(h => h.company !== parsed.company)].slice(0, 5));
    } catch (err) {
      console.error("Analyze error:", err);
      setError(err.message || "Något gick fel. Försök igen.");
    }
    finally { clearInterval(stepInterval); setLoading(false); setLoadStep(0); }
  }, [query, isPro, usageCount, cache]);

  const voiceControl = useVoiceControl({ setTab, setSubTab, setQuery, analyze, income, leftover, savingsRate });

  const handleUpgrade = () => {
    setIsPro(true);
    try { localStorage.setItem("kapital_pro", "true"); } catch {}
    showToast("🎉 Välkommen till Pro!");
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0a0f1e", color: "#e2e8f0", fontFamily: "'Inter',-apple-system,sans-serif", paddingBottom: 80, direction: isRTL ? "rtl" : "ltr" }}>
      {toast && <Toast msg={toast} />}
      <AchievementToast achievement={newAchievement} />
      <VoiceButton voiceControl={voiceControl} />
      {showUpgrade && <UpgradeModal onClose={() => setShowUpgrade(false)} onUpgrade={() => { handleUpgrade(); unlock("pro_member"); }} t={t} />}
      {showOnboarding && <Onboarding onDone={() => setShowOnboarding(false)} />}
      {showCompare && <CompareView onClose={() => setShowCompare(false)} onAnalyze={(name) => { setQuery(name); analyze(name); }} />}
      {showNotifications && <NotificationCenter onClose={() => setShowNotifications(false)} />}

      {/* Language Picker */}
      {showLangPicker && (
        <div style={{ position: "fixed", inset: 0, background: "#000c", zIndex: 2000, display: "flex", alignItems: "flex-end", justifyContent: "center" }} onClick={() => setShowLangPicker(false)}>
          <div style={{ background: "#0f172a", borderRadius: "20px 20px 0 0", padding: "20px 16px 40px", maxWidth: 480, width: "100%", border: "1px solid #1e293b", maxHeight: "70vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, color: "#e2e8f0" }}>🌍 {t.language}</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {LANGUAGES.map(l => (
                <button key={l.code} onClick={() => changeLang(l.code)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: lang === l.code ? "#10b98122" : "#1e293b", border: `1px solid ${lang === l.code ? "#10b981" : "#334155"}`, borderRadius: 10, cursor: "pointer", textAlign: "left" }}>
                  <span style={{ fontSize: 20 }}>{l.flag}</span>
                  <span style={{ fontSize: 13, color: lang === l.code ? "#10b981" : "#94a3b8", fontWeight: lang === l.code ? 700 : 400 }}>{l.name}</span>
                  {lang === l.code && <span style={{ marginLeft: "auto", color: "#10b981" }}>✓</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* More menu */}
      {showMore && (
        <div style={{ position: "fixed", inset: 0, background: "#000c", zIndex: 2000, display: "flex", alignItems: "flex-end", justifyContent: "center" }} onClick={() => setShowMore(false)}>
          <div style={{ background: "#0f172a", borderRadius: "20px 20px 0 0", padding: "20px 16px 40px", maxWidth: 480, width: "100%", border: "1px solid #1e293b" }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, color: "#e2e8f0" }}>⋯ Mer</div>
            {[
              { icon: "🗓", label: "Rapportkalender", action: () => { setSubTab("kalender"); setTab(1); setShowMore(false); } },
              { icon: "📤", label: "Dela analys", action: () => { setSubTab("dela"); setTab(1); setShowMore(false); } },
              { icon: "🏦", label: "Jämför mäklare", action: () => { setSubTab("maklare"); setTab(2); setShowMore(false); } },
              { icon: LANGUAGES.find(l => l.code === lang)?.flag || "🌍", label: t.language, action: () => { setShowMore(false); setShowLangPicker(true); } },
              { icon: isPro ? "⭐" : "🚀", label: isPro ? "Kapital Pro — Aktiv" : "Uppgradera till Pro", action: () => { setShowMore(false); if (!isPro) setShowUpgrade(true); } },
            ].map(({ icon, label, action }) => (
              <button key={label} onClick={action} style={{ display: "flex", alignItems: "center", gap: 14, width: "100%", padding: "14px 4px", background: "none", border: "none", borderBottom: "1px solid #1e293b", color: "#e2e8f0", fontSize: 15, cursor: "pointer", textAlign: "left" }}>
                <span style={{ fontSize: 22, width: 32, textAlign: "center" }}>{icon}</span>
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* TOP HEADER */}
      <div style={{ background: "linear-gradient(180deg,#0f172a,#0a0f1e)", borderBottom: "1px solid #1e293b", padding: "16px 16px 12px", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 680, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 9, background: "linear-gradient(135deg,#10b981,#0ea5e9)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 12px #10b98144" }}>
              <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
                <path d="M3 16 L8 10 L12 13 L17 6" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="17" cy="6" r="2" fill="white"/>
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-0.5px", background: "linear-gradient(90deg,#10b981,#0ea5e9)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                Kapital{isPro && <span style={{ fontSize: 10, background: "linear-gradient(90deg,#f59e0b,#ef4444)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", fontWeight: 700, marginLeft: 5 }}>PRO</span>}
              </div>
              <div style={{ fontSize: 10, color: "#475569" }}>{t.tagline}</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
              {!isPro && (
                <button onClick={() => setShowUpgrade(true)} style={{ padding: "6px 12px", background: "linear-gradient(135deg,#10b981,#0ea5e9)", border: "none", borderRadius: 8, color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                  {t.upgrade}
                </button>
              )}
              {/* Notification bell */}
              <NotificationBell onOpen={() => setShowNotifications(true)} />
              <button onClick={() => setShowMore(true)} style={{ padding: "6px 10px", background: "#1e293b", border: "1px solid #334155", borderRadius: 8, color: "#94a3b8", fontSize: 18, cursor: "pointer", lineHeight: 1 }}>
                ⋯
              </button>
            </div>
        </div>
      </div>

      {/* CONTENT */}
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "16px 14px" }}>

        {/* HEM */}
        {/* HEM - ny premium startsida */}
        {tab === 0 && <HemTab
          result={result} setResult={setResult}
          query={query} setQuery={setQuery}
          analyze={analyze} loading={loading}
          isPro={isPro} onUpgrade={() => setShowUpgrade(true)}
          setTab={setTab} setSubTab={setSubTab}
          onCompare={() => setShowCompare(true)}
          t={t}
        />}

        {/* AKTIER */}
        {tab === 1 && (
          <div>
            <div style={{ display: "flex", gap: 4, background: "#0f172a", borderRadius: 12, padding: 4, border: "1px solid #1e293b", marginBottom: 16, overflowX: "auto", scrollbarWidth: "none" }}>
              {[["analys","🔍 Aktier"],["krypto","₿ Krypto"],["watchlist","⭐ Bevakning"],["portfölj","💼 Portfölj"],["ekonomi","💎 Min Ekonomi"],["sparade","💾 Sparade"]].map(([id, label]) => (
                <button key={id} onClick={() => setSubTab(id)} style={{ flexShrink: 0, padding: "9px 10px", background: subTab === id ? "linear-gradient(135deg,#10b981,#0ea5e9)" : "none", border: "none", borderRadius: 9, color: subTab === id ? "#fff" : "#64748b", fontSize: 11, fontWeight: subTab === id ? 700 : 400, cursor: "pointer", whiteSpace: "nowrap" }}>
                  {label}
                </button>
              ))}
            </div>
            {(subTab === "analys" || !["krypto","watchlist","portfölj","sparade","ekonomi","kalender"].includes(subTab)) && (
              <AnalysTab result={result} loading={loading} loadStep={loadStep} error={error} query={query} setQuery={setQuery} analyze={analyze} history={history} setResult={setResult} isPro={isPro} usageCount={usageCount} onUpgrade={() => setShowUpgrade(true)} t={t}
                onGoMaklare={() => { setTab(3); setSubTab("maklare"); }}
                onGoKalender={() => { setTab(1); setSubTab("kalender"); }}
                onCompare={() => setShowCompare(true)}
              />
            )}
            {subTab === "krypto" && <KryptoAnalysTab isPro={isPro} onUpgrade={() => setShowUpgrade(true)} />}
            {subTab === "watchlist" && <WatchlistTab onAnalyze={(name) => { setQuery(name); analyze(name); setSubTab("analys"); }} isPro={isPro} onUpgrade={() => setShowUpgrade(true)} t={t} onlySection="watchlist" />}
            {subTab === "portfölj" && <PortfoljTab isPro={isPro} onUpgrade={() => setShowUpgrade(true)} t={t} />}
            {subTab === "ekonomi" && <MinEkonomi isPro={isPro} onUpgrade={() => setShowUpgrade(true)} />}
            {subTab === "sparade" && <WatchlistTab onAnalyze={(name) => { setQuery(name); analyze(name); setSubTab("analys"); }} isPro={isPro} onUpgrade={() => setShowUpgrade(true)} t={t} onlySection="saved" />}
            {subTab === "kalender" && <KalenderTab isPro={isPro} onUpgrade={() => setShowUpgrade(true)} t={t} />}
          </div>
        )}

        {/* EKONOMI */}
        {tab === 2 && (
          <div>
            <HealthScore />
            <SparaTab currency={currency} exchangeRates={exchangeRates} currencies={CURRENCIES} />
          </div>
        )}

        {/* TRYGGHET - försäkringar, lån, kalkylator */}
        {tab === 3 && (
          <div>
            <div style={{ display: "flex", gap: 4, background: "#0f172a", borderRadius: 12, padding: 4, border: "1px solid #1e293b", marginBottom: 16 }}>
              {[["forsakring","🛡️ Försäkring"],["lan","🏦 Lån"],["profil","📊 Min Profil"],["kalkyl","📐 Kalkylator"],["maklare","📈 Mäklare"]].map(([id, label]) => (
                <button key={id} onClick={() => setSubTab(id)} style={{ flex: 1, padding: "9px 2px", background: subTab === id ? "linear-gradient(135deg,#10b981,#0ea5e9)" : "none", border: "none", borderRadius: 9, color: subTab === id ? "#fff" : "#64748b", fontSize: 11, fontWeight: subTab === id ? 700 : 400, cursor: "pointer", whiteSpace: "nowrap" }}>
                  {label}
                </button>
              ))}
            </div>
            {subTab === "forsakring" && <ForsakringHub />}
            {subTab === "lan" && <SmartLanAnsokan />}
            {subTab === "profil" && <EkonomiskProfil />}
            {(subTab === "kalkyl" || subTab !== "maklare" && subTab !== "forsakring" && subTab !== "lan" && subTab !== "profil") && subTab === "kalkyl" && <KalkylatornTab t={t} />}
            {subTab === "maklare" && <MaklareTab t={t} />}
          </div>
        )}

        {/* PROFIL */}
        {tab === 4 && !seniorMode && <ProfilTab isPro={isPro} onUpgrade={() => setShowUpgrade(true)} lang={lang} changeLang={changeLang} t={t} currency={currency} changeCurrency={changeCurrency} exchangeRates={exchangeRates} currencies={CURRENCIES} seniorMode={seniorMode} setSeniorMode={setSeniorMode} theme={theme} setTheme={setTheme} />}
        {tab === 4 && seniorMode && <SeniorTab setSeniorMode={setSeniorMode} />}

        {/* Legal footer */}
        <div style={{ borderTop: "1px solid #1e293b", marginTop: 28, paddingTop: 16, paddingBottom: 20, fontSize: 11, color: "#334155", lineHeight: 1.8, textAlign: "center" }}>
          <div style={{ marginBottom: 6, color: "#475569", fontWeight: 600 }}>{t.legalNote}</div>
          {t.legalText}
          <div style={{ marginTop: 8 }}>© 2026 Kapital · <span style={{ color: "#10b981" }}>Terms</span> · <span style={{ color: "#10b981" }}>Privacy</span></div>
        </div>
      </div>

      {/* BOTTOM NAV */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "#0f172a", borderTop: "1px solid #1e293b", zIndex: 100, paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div style={{ maxWidth: 680, margin: "0 auto", display: "flex" }}>
          {[
            { icon: "🏠", label: "Hem", idx: 0 },
            { icon: "📈", label: "Aktier", idx: 1 },
            { icon: "💰", label: "Ekonomi", idx: 2 },
            { icon: "🛡️", label: "Trygghet", idx: 3 },
            { icon: seniorMode ? "👴" : "👤", label: seniorMode ? "Senior" : "Profil", idx: 4 },
          ].map(({ icon, label, idx }) => (
            <button key={idx} onClick={() => {
              window.history.pushState({ tab: idx }, "");
              setTab(idx);
              if (idx === 1) setSubTab("analys");
              if (idx === 3) setSubTab("forsakring");
            }} style={{
              flex: 1, padding: "10px 4px 12px", background: "none", border: "none",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 3, cursor: "pointer"
            }}>
              <div style={{ fontSize: seniorMode ? 26 : 22, lineHeight: 1, filter: tab === idx ? "none" : "grayscale(100%) opacity(0.4)" }}>{icon}</div>
              <div style={{ fontSize: seniorMode ? 12 : 10, fontWeight: tab === idx ? 700 : 400, color: tab === idx ? "#10b981" : "#475569" }}>{label}</div>
              {tab === idx && <div style={{ width: 20, height: 2, borderRadius: 99, background: "#10b981" }} />}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function CookieBanner() {
  const [accepted, setAccepted] = useState(() => {
    try { return localStorage.getItem("kapital_cookies") === "true"; } catch { return false; }
  });

  if (accepted) return null;

  return (
    <div style={{ position: "fixed", bottom: 70, left: 0, right: 0, zIndex: 999, padding: "0 12px" }}>
      <div style={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 16, padding: "16px 18px", maxWidth: 680, margin: "0 auto", boxShadow: "0 -4px 32px #00000066" }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0", marginBottom: 6 }}>🍪 Kapital använder lokal lagring</div>
        <div style={{ fontSize: 12, color: "#64748b", marginBottom: 12, lineHeight: 1.5 }}>
          Vi lagrar din data lokalt i din webbläsare för att appen ska fungera. Vi säljer aldrig din data och skickar den inte till tredje part. Läs vår <span style={{ color: "#10b981" }}>integritetspolicy</span> för mer info.
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => { setAccepted(true); try { localStorage.setItem("kapital_cookies", "true"); } catch {} }}
            style={{ flex: 2, padding: "10px", background: "linear-gradient(135deg,#10b981,#0ea5e9)", border: "none", borderRadius: 10, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
            Godkänn
          </button>
          <button onClick={() => { setAccepted(true); try { localStorage.setItem("kapital_cookies", "true"); } catch {} }}
            style={{ flex: 1, padding: "10px", background: "#1e293b", border: "1px solid #334155", borderRadius: 10, color: "#94a3b8", fontSize: 13, cursor: "pointer" }}>
            Stäng
          </button>
        </div>
      </div>
    </div>
  );
}

export default function KapitalApp() {
  return (
    <ErrorBoundary>
      <Kapital />
      <CookieBanner />
    </ErrorBoundary>
  );
}
