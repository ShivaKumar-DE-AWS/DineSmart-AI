import { createContext, useContext } from "react";

export type Lang = "en" | "hi" | "ta" | "mr";

export const LANGS: { code: Lang; label: string; native: string }[] = [
  { code: "en", label: "English", native: "English" },
  { code: "hi", label: "Hindi", native: "हिन्दी" },
  { code: "ta", label: "Tamil", native: "தமிழ்" },
  { code: "mr", label: "Marathi", native: "मराठी" },
];

type Dict = Record<string, string>;

export const TRANSLATIONS: Record<Lang, Dict> = {
  en: {
    "nav.how": "How it works",
    "nav.features": "Features",
    "nav.workflow": "Workflow",
    "nav.results": "Results",
    "nav.pricing": "Pricing",
    "nav.signin": "Sign in",
    "nav.demo": "Book demo",

    "hero.badge": "Introducing SmartDine AI — Live in 500+ restaurants",
    "hero.title.1": "Serve",
    "hero.title.2": "30% more.",
    "hero.title.3": "With less staff.",
    "hero.sub": "SmartDine AI replaces paper menus, manual orders, and chaos in the kitchen with one beautiful system — QR ordering, an AI waiter, live kitchen automation, and real-time analytics.",
    "hero.cta.primary": "See SmartDine in your restaurant",
    "hero.cta.secondary": "Watch how it works",
    "hero.note": "No credit card • Setup in under 24 hours • Works on any phone",

    "roi.title": "See your extra revenue in 10 seconds",
    "roi.sub": "Tell us a little about your restaurant. We'll show you how much more you'll earn with SmartDine AI.",
    "roi.tables": "Tables in your restaurant",
    "roi.ticket": "Average bill per table (₹)",
    "roi.turns": "Times a table is used per day",
    "roi.current": "Your current monthly revenue",
    "roi.with": "With SmartDine AI",
    "roi.extra": "Extra revenue / month",
    "roi.year": "Extra revenue / year",
    "roi.cta": "Lock in this revenue — book a demo",
    "roi.disclaimer": "Based on average 28-32% uplift across 500+ SmartDine restaurants.",

    "marquee.title": "Trusted by modern restaurants across India",

    "problem.tag": "The reality today",
    "problem.title.1": "Running a restaurant has become",
    "problem.title.2": "harder than ever.",
    "problem.sub": "You're juggling staff, kitchens, customers, and bills — all at once. And the tools you use haven't changed in 20 years.",
    "problem.fix": "SmartDine AI fixes all of this — in one elegant system.",

    "how.tag": "How SmartDine works",
    "how.title.1": "From the moment a guest sits down —",
    "how.title.2": "everything just flows.",

    "features.tag": "Built for restaurants",
    "features.title.1": "Nine tools.",
    "features.title.2": "One restaurant brain.",
    "features.sub": "Every feature exists for one reason — to help you earn more and stress less.",

    "workflow.tag": "The complete journey",
    "workflow.title.1": "One smooth flow,",
    "workflow.title.2": "from open to close.",

    "compare.tag": "Before vs. After",
    "compare.title.1": "The difference is",
    "compare.title.2": "night and day.",
    "compare.without": "Without SmartDine",
    "compare.with": "With SmartDine AI",

    "results.tag": "Real results",
    "results.title.1": "Restaurants are",
    "results.title.2": "growing faster",
    "results.title.3": "with SmartDine.",
    "results.video": "Hear it from real owners",

    "analytics.tag": "Analytics",
    "analytics.title.1": "Your restaurant finally has",
    "analytics.title.2": "data that helps you grow.",
    "analytics.sub": "Know exactly what's selling, when guests visit, who your best staff are, and what's costing you money. Simple charts. Clear decisions.",

    "why.tag": "Why restaurants choose SmartDine",
    "why.title.1": "Premium tech.",
    "why.title.2": "Made effortless.",

    "emotion.tag": "Why we built this",
    "emotion.title.1": "You didn't open your restaurant to",
    "emotion.title.2": "manage paper.",
    "emotion.title.3": "You opened it to",
    "emotion.title.4": "feed people, lead a team, and build something you're proud of.",
    "emotion.sub": "SmartDine AI quietly handles the chaos in the background — so you can focus on the food, the service, and the moments that make guests come back.",

    "pricing.tag": "Simple pricing",
    "pricing.title.1": "Pays for itself in",
    "pricing.title.2": "the first week.",
    "pricing.sub": "No hidden fees. Cancel anytime. 14-day free trial.",
    "pricing.popular": "Most popular",

    "faq.tag": "FAQ",
    "faq.title": "Questions, answered.",

    "cta.title.1": "Give your restaurant",
    "cta.title.2": "the future it deserves.",
    "cta.sub": "See SmartDine running in a real restaurant like yours. A 20-minute demo. Zero pressure.",
    "cta.primary": "Book a free demo",
    "cta.secondary": "Start free trial",
    "cta.tertiary": "Talk to expert",
    "cta.note": "No credit card • No setup fee • Cancel anytime",

    "sticky.cta": "Book a free demo",
    "wa.cta": "Chat on WhatsApp",
  },

  hi: {
    "nav.how": "यह कैसे काम करता है",
    "nav.features": "फ़ीचर्स",
    "nav.workflow": "वर्कफ़्लो",
    "nav.results": "परिणाम",
    "nav.pricing": "क़ीमत",
    "nav.signin": "साइन इन",
    "nav.demo": "डेमो बुक करें",

    "hero.badge": "SmartDine AI पेश है — 500+ रेस्तरां में चालू",
    "hero.title.1": "कम स्टाफ़ से",
    "hero.title.2": "30% ज़्यादा",
    "hero.title.3": "सर्व करें।",
    "hero.sub": "SmartDine AI काग़ज़ी मेनू, हाथ से लिए ऑर्डर और रसोई की भागदौड़ को एक ख़ूबसूरत सिस्टम से बदल देता है — QR ऑर्डरिंग, AI वेटर, लाइव किचन ऑटोमेशन और रियल-टाइम एनालिटिक्स।",
    "hero.cta.primary": "अपने रेस्तरां में SmartDine देखें",
    "hero.cta.secondary": "देखें यह कैसे काम करता है",
    "hero.note": "कोई कार्ड नहीं • 24 घंटे में सेटअप • किसी भी फ़ोन पर चले",

    "roi.title": "10 सेकंड में देखें आपकी अतिरिक्त कमाई",
    "roi.sub": "अपने रेस्तरां की थोड़ी जानकारी दें। हम बताएँगे कि SmartDine AI से आप कितना ज़्यादा कमा सकते हैं।",
    "roi.tables": "आपके रेस्तरां में टेबल",
    "roi.ticket": "हर टेबल का औसत बिल (₹)",
    "roi.turns": "एक टेबल दिन में कितनी बार इस्तेमाल होती है",
    "roi.current": "आपकी अभी की मासिक कमाई",
    "roi.with": "SmartDine AI के साथ",
    "roi.extra": "अतिरिक्त कमाई / महीना",
    "roi.year": "अतिरिक्त कमाई / साल",
    "roi.cta": "यह कमाई पक्की करें — डेमो बुक करें",
    "roi.disclaimer": "500+ SmartDine रेस्तरां में औसत 28-32% बढ़ोतरी के आधार पर।",

    "marquee.title": "पूरे भारत के आधुनिक रेस्तरां का भरोसा",

    "problem.tag": "आज की हक़ीक़त",
    "problem.title.1": "रेस्तरां चलाना अब",
    "problem.title.2": "पहले से कहीं मुश्किल है।",
    "problem.sub": "स्टाफ़, रसोई, ग्राहक, बिल — सब एक साथ संभालना। और जो टूल्स आप इस्तेमाल कर रहे हैं वो 20 साल से नहीं बदले।",
    "problem.fix": "SmartDine AI यह सब ठीक करता है — एक ख़ूबसूरत सिस्टम में।",

    "how.tag": "SmartDine कैसे काम करता है",
    "how.title.1": "जैसे ही ग्राहक बैठता है —",
    "how.title.2": "सब कुछ अपने आप चलने लगता है।",

    "features.tag": "रेस्तरां के लिए बना है",
    "features.title.1": "नौ टूल्स।",
    "features.title.2": "एक रेस्तरां दिमाग़।",
    "features.sub": "हर फ़ीचर एक ही वजह से है — ज़्यादा कमाई, कम तनाव।",

    "workflow.tag": "पूरी यात्रा",
    "workflow.title.1": "खुलने से बंद होने तक,",
    "workflow.title.2": "एक स्मूद फ़्लो।",

    "compare.tag": "पहले बनाम बाद",
    "compare.title.1": "फ़र्क़",
    "compare.title.2": "साफ़ दिखता है।",
    "compare.without": "SmartDine के बिना",
    "compare.with": "SmartDine AI के साथ",

    "results.tag": "असली नतीजे",
    "results.title.1": "रेस्तरां",
    "results.title.2": "तेज़ी से बढ़ रहे हैं",
    "results.title.3": "SmartDine के साथ।",
    "results.video": "असली मालिकों से सुनिए",

    "analytics.tag": "एनालिटिक्स",
    "analytics.title.1": "अब आपके रेस्तरां के पास है",
    "analytics.title.2": "बढ़ने में मदद करने वाला डेटा।",
    "analytics.sub": "जानें क्या बिक रहा है, ग्राहक कब आते हैं, कौन सा स्टाफ़ बेहतरीन है और कहाँ पैसा बर्बाद हो रहा है। सरल चार्ट। साफ़ फ़ैसले।",

    "why.tag": "रेस्तरां SmartDine क्यों चुनते हैं",
    "why.title.1": "प्रीमियम तकनीक।",
    "why.title.2": "बेहद आसान।",

    "emotion.tag": "हमने यह क्यों बनाया",
    "emotion.title.1": "आपने रेस्तरां",
    "emotion.title.2": "काग़ज़ संभालने के लिए नहीं खोला।",
    "emotion.title.3": "आपने इसे खोला",
    "emotion.title.4": "लोगों को खिलाने, टीम को लीड करने और एक ऐसी चीज़ बनाने के लिए जिस पर आप गर्व करें।",
    "emotion.sub": "SmartDine AI चुपचाप पीछे का काम संभालता है — ताकि आप खाने, सर्विस और उन पलों पर ध्यान दे सकें जो ग्राहकों को वापस लाते हैं।",

    "pricing.tag": "आसान क़ीमत",
    "pricing.title.1": "पहले हफ़्ते में ही",
    "pricing.title.2": "अपना ख़र्च निकाल लेता है।",
    "pricing.sub": "कोई छुपा शुल्क नहीं। कभी भी कैंसिल करें। 14 दिन फ़्री।",
    "pricing.popular": "सबसे लोकप्रिय",

    "faq.tag": "सवाल-जवाब",
    "faq.title": "आपके सवालों के जवाब।",

    "cta.title.1": "अपने रेस्तरां को दीजिए",
    "cta.title.2": "वो भविष्य जिसका वो हक़दार है।",
    "cta.sub": "SmartDine को अपने जैसे असली रेस्तरां में चलते देखें। 20 मिनट का डेमो। कोई दबाव नहीं।",
    "cta.primary": "फ़्री डेमो बुक करें",
    "cta.secondary": "फ़्री ट्रायल शुरू करें",
    "cta.tertiary": "एक्सपर्ट से बात करें",
    "cta.note": "कोई कार्ड नहीं • कोई सेटअप फ़ीस नहीं • कभी भी कैंसिल",

    "sticky.cta": "फ़्री डेमो बुक करें",
    "wa.cta": "WhatsApp पर चैट करें",
  },

  ta: {
    "nav.how": "எப்படி இயங்குகிறது",
    "nav.features": "அம்சங்கள்",
    "nav.workflow": "பணி நெறி",
    "nav.results": "முடிவுகள்",
    "nav.pricing": "விலை",
    "nav.signin": "உள்நுழைய",
    "nav.demo": "டெமோ பதிவு",

    "hero.badge": "SmartDine AI — 500+ உணவகங்களில் வேலை செய்கிறது",
    "hero.title.1": "குறைந்த ஊழியர்களுடன்",
    "hero.title.2": "30% அதிகமாக",
    "hero.title.3": "சேவை செய்யுங்கள்.",
    "hero.sub": "SmartDine AI காகித மெனு, கைமுறை ஆர்டர்கள், சமையலறை குழப்பத்தை ஒரே அழகான சிஸ்டத்தால் மாற்றுகிறது — QR ஆர்டரிங், AI வெய்ட்டர், லைவ் கிச்சன் ஆட்டோமேஷன் மற்றும் ரியல்-டைம் அனலிட்டிக்ஸ்.",
    "hero.cta.primary": "உங்கள் உணவகத்தில் SmartDine பார்க்க",
    "hero.cta.secondary": "எப்படி வேலை செய்கிறது பாருங்கள்",
    "hero.note": "கார்டு தேவையில்லை • 24 மணி நேரத்தில் அமைப்பு • எந்த ஃபோனிலும் இயங்கும்",

    "roi.title": "10 விநாடிகளில் உங்கள் கூடுதல் வருமானம் பாருங்கள்",
    "roi.sub": "உங்கள் உணவகம் பற்றி சிறிதளவு சொல்லுங்கள். SmartDine AI மூலம் எவ்வளவு கூடுதலாக சம்பாதிப்பீர்கள் என்று காட்டுவோம்.",
    "roi.tables": "உங்கள் உணவகத்தில் டேபிள்கள்",
    "roi.ticket": "ஒரு டேபிளுக்கு சராசரி பில் (₹)",
    "roi.turns": "ஒரு நாளில் ஒரு டேபிள் எத்தனை முறை பயன்படுத்தப்படுகிறது",
    "roi.current": "உங்கள் தற்போதைய மாத வருமானம்",
    "roi.with": "SmartDine AI உடன்",
    "roi.extra": "கூடுதல் வருமானம் / மாதம்",
    "roi.year": "கூடுதல் வருமானம் / ஆண்டு",
    "roi.cta": "இந்த வருமானத்தை பெறுங்கள் — டெமோ பதிவு செய்க",
    "roi.disclaimer": "500+ SmartDine உணவகங்களில் சராசரி 28-32% அதிகரிப்பின் அடிப்படையில்.",

    "marquee.title": "இந்தியா முழுவதும் நவீன உணவகங்களின் நம்பிக்கை",

    "problem.tag": "இன்றைய நிலை",
    "problem.title.1": "உணவகம் நடத்துவது இப்போது",
    "problem.title.2": "முன்னெப்போதையும் விட கடினம்.",
    "problem.sub": "ஊழியர்கள், சமையலறை, வாடிக்கையாளர்கள், பில்கள் — அனைத்தையும் ஒரே நேரத்தில். பயன்படுத்தும் கருவிகள் 20 ஆண்டுகளாக மாறவில்லை.",
    "problem.fix": "SmartDine AI இவை அனைத்தையும் சரிசெய்கிறது — ஒரே அழகான சிஸ்டத்தில்.",

    "how.tag": "SmartDine எப்படி வேலை செய்கிறது",
    "how.title.1": "வாடிக்கையாளர் அமர்ந்த தருணம் முதல் —",
    "how.title.2": "எல்லாம் சுமூகமாக நடக்கிறது.",

    "features.tag": "உணவகங்களுக்காக கட்டப்பட்டது",
    "features.title.1": "ஒன்பது கருவிகள்.",
    "features.title.2": "ஒரே உணவக மூளை.",
    "features.sub": "ஒவ்வொரு அம்சமும் ஒரே காரணத்திற்காக — அதிக சம்பாதிக்க, குறைவாக அழுத்தம்.",

    "workflow.tag": "முழுமையான பயணம்",
    "workflow.title.1": "திறப்பு முதல் மூடல் வரை,",
    "workflow.title.2": "ஒரு சுமூக ஓட்டம்.",

    "compare.tag": "முன்பு vs பின்பு",
    "compare.title.1": "வேறுபாடு",
    "compare.title.2": "தெளிவாக தெரிகிறது.",
    "compare.without": "SmartDine இல்லாமல்",
    "compare.with": "SmartDine AI உடன்",

    "results.tag": "உண்மையான முடிவுகள்",
    "results.title.1": "உணவகங்கள்",
    "results.title.2": "வேகமாக வளர்கின்றன",
    "results.title.3": "SmartDine உடன்.",
    "results.video": "உண்மையான உரிமையாளர்களிடமிருந்து கேளுங்கள்",

    "analytics.tag": "அனலிட்டிக்ஸ்",
    "analytics.title.1": "உங்கள் உணவகத்திற்கு இப்போது உள்ளது",
    "analytics.title.2": "வளர உதவும் தரவு.",
    "analytics.sub": "என்ன விற்கிறது, வாடிக்கையாளர்கள் எப்போது வருகிறார்கள், சிறந்த ஊழியர்கள் யார், பணம் எங்கே செலவாகிறது என்று துல்லியமாக தெரியும்.",

    "why.tag": "உணவகங்கள் ஏன் SmartDine தேர்ந்தெடுக்கின்றன",
    "why.title.1": "பிரீமியம் டெக்.",
    "why.title.2": "எளிமையாக்கப்பட்டது.",

    "emotion.tag": "நாங்கள் ஏன் இதை கட்டினோம்",
    "emotion.title.1": "நீங்கள் உணவகம் திறந்தது",
    "emotion.title.2": "காகிதம் கையாள அல்ல.",
    "emotion.title.3": "நீங்கள் அதை திறந்தது",
    "emotion.title.4": "மக்களுக்கு உணவளிக்க, குழுவை வழிநடத்த, பெருமைப்படக்கூடிய ஒன்றை உருவாக்க.",
    "emotion.sub": "SmartDine AI அமைதியாக பின்னணியில் குழப்பத்தை கையாள்கிறது — நீங்கள் உணவு, சேவை மற்றும் வாடிக்கையாளர்களை திரும்ப கொண்டுவரும் தருணங்களில் கவனம் செலுத்த.",

    "pricing.tag": "எளிய விலை",
    "pricing.title.1": "முதல் வாரத்திலேயே",
    "pricing.title.2": "தனக்கு தானே செலவை ஈடுகட்டும்.",
    "pricing.sub": "மறைக்கப்பட்ட கட்டணம் இல்லை. எப்போதும் ரத்து செய்யலாம். 14 நாள் இலவசம்.",
    "pricing.popular": "மிகவும் பிரபலமான",

    "faq.tag": "கேள்விகள்",
    "faq.title": "உங்கள் கேள்விகளுக்கு பதில்.",

    "cta.title.1": "உங்கள் உணவகத்திற்கு கொடுங்கள்",
    "cta.title.2": "அது தகுதியான எதிர்காலத்தை.",
    "cta.sub": "உங்களைப் போன்ற உண்மையான உணவகத்தில் SmartDine இயங்குவதை பாருங்கள். 20 நிமிட டெமோ.",
    "cta.primary": "இலவச டெமோ பதிவு",
    "cta.secondary": "இலவச சோதனை தொடங்க",
    "cta.tertiary": "நிபுணரிடம் பேசுங்கள்",
    "cta.note": "கார்டு இல்லை • செட்அப் கட்டணம் இல்லை • எப்போதும் ரத்து",

    "sticky.cta": "இலவச டெமோ பதிவு",
    "wa.cta": "WhatsApp இல் பேசுங்கள்",
  },

  mr: {
    "nav.how": "हे कसे काम करते",
    "nav.features": "वैशिष्ट्ये",
    "nav.workflow": "वर्कफ्लो",
    "nav.results": "परिणाम",
    "nav.pricing": "किंमत",
    "nav.signin": "साइन इन",
    "nav.demo": "डेमो बुक करा",

    "hero.badge": "SmartDine AI सादर — 500+ रेस्टॉरंट्समध्ये सुरू",
    "hero.title.1": "कमी कर्मचाऱ्यांसह",
    "hero.title.2": "30% जास्त",
    "hero.title.3": "सर्व्ह करा.",
    "hero.sub": "SmartDine AI कागदी मेनू, मॅन्युअल ऑर्डर्स आणि किचनमधील गोंधळाला एका सुंदर सिस्टमने बदलते — QR ऑर्डरिंग, AI वेटर, लाइव्ह किचन ऑटोमेशन आणि रिअल-टाइम अॅनालिटिक्स.",
    "hero.cta.primary": "तुमच्या रेस्टॉरंटमध्ये SmartDine पाहा",
    "hero.cta.secondary": "हे कसे काम करते पाहा",
    "hero.note": "कार्ड नाही • 24 तासात सेटअप • कोणत्याही फोनवर चालते",

    "roi.title": "10 सेकंदात तुमची अतिरिक्त कमाई पाहा",
    "roi.sub": "तुमच्या रेस्टॉरंटबद्दल थोडे सांगा. SmartDine AI सोबत तुम्ही किती जास्त कमवाल ते दाखवू.",
    "roi.tables": "तुमच्या रेस्टॉरंटमधील टेबल्स",
    "roi.ticket": "प्रति टेबल सरासरी बिल (₹)",
    "roi.turns": "एका दिवसात एक टेबल किती वेळा वापरला जातो",
    "roi.current": "तुमची सध्याची मासिक कमाई",
    "roi.with": "SmartDine AI सोबत",
    "roi.extra": "अतिरिक्त कमाई / महिना",
    "roi.year": "अतिरिक्त कमाई / वर्ष",
    "roi.cta": "ही कमाई पक्की करा — डेमो बुक करा",
    "roi.disclaimer": "500+ SmartDine रेस्टॉरंट्समधील सरासरी 28-32% वाढीवर आधारित.",

    "marquee.title": "संपूर्ण भारतातील आधुनिक रेस्टॉरंट्सचा विश्वास",

    "problem.tag": "आजची वस्तुस्थिती",
    "problem.title.1": "रेस्टॉरंट चालवणे आता",
    "problem.title.2": "पूर्वीपेक्षा कठीण झाले आहे.",
    "problem.sub": "कर्मचारी, किचन, ग्राहक, बिल — सर्व एकाच वेळी. वापरत असलेली साधने 20 वर्षांत बदललेली नाहीत.",
    "problem.fix": "SmartDine AI हे सर्व ठीक करते — एका सुंदर सिस्टममध्ये.",

    "how.tag": "SmartDine कसे काम करते",
    "how.title.1": "ग्राहक बसल्या क्षणापासून —",
    "how.title.2": "सर्व काही सहज वाहते.",

    "features.tag": "रेस्टॉरंट्ससाठी बनवले",
    "features.title.1": "नऊ साधने.",
    "features.title.2": "एक रेस्टॉरंट मेंदू.",
    "features.sub": "प्रत्येक वैशिष्ट्य एका कारणासाठी — जास्त कमवा, कमी ताण.",

    "workflow.tag": "संपूर्ण प्रवास",
    "workflow.title.1": "उघडण्यापासून बंद होईपर्यंत,",
    "workflow.title.2": "एक सहज प्रवाह.",

    "compare.tag": "आधी vs नंतर",
    "compare.title.1": "फरक",
    "compare.title.2": "स्पष्ट दिसतो.",
    "compare.without": "SmartDine शिवाय",
    "compare.with": "SmartDine AI सोबत",

    "results.tag": "खरे परिणाम",
    "results.title.1": "रेस्टॉरंट्स",
    "results.title.2": "वेगाने वाढत आहेत",
    "results.title.3": "SmartDine सोबत.",
    "results.video": "खऱ्या मालकांकडून ऐका",

    "analytics.tag": "अॅनालिटिक्स",
    "analytics.title.1": "तुमच्या रेस्टॉरंटला आता आहे",
    "analytics.title.2": "वाढायला मदत करणारा डेटा.",
    "analytics.sub": "काय विकले जाते, ग्राहक कधी येतात, सर्वोत्तम कर्मचारी कोण, पैसा कुठे जातो हे नक्की कळते.",

    "why.tag": "रेस्टॉरंट्स SmartDine का निवडतात",
    "why.title.1": "प्रीमियम तंत्रज्ञान.",
    "why.title.2": "सहज सोपे.",

    "emotion.tag": "आम्ही हे का बनवले",
    "emotion.title.1": "तुम्ही रेस्टॉरंट उघडले",
    "emotion.title.2": "कागद हाताळण्यासाठी नाही.",
    "emotion.title.3": "तुम्ही ते उघडले",
    "emotion.title.4": "लोकांना खाऊ घालण्यासाठी, टीम सांभाळण्यासाठी, अभिमान वाटेल असे काही बांधण्यासाठी.",
    "emotion.sub": "SmartDine AI शांतपणे पार्श्वभूमीवर गोंधळ हाताळते — जेणेकरून तुम्ही जेवण, सेवा आणि ग्राहकांना परत आणणाऱ्या क्षणांवर लक्ष केंद्रित करू शकाल.",

    "pricing.tag": "सोपी किंमत",
    "pricing.title.1": "पहिल्याच आठवड्यात",
    "pricing.title.2": "स्वतःचा खर्च भरून काढते.",
    "pricing.sub": "लपलेले शुल्क नाही. कधीही रद्द करा. 14 दिवस मोफत.",
    "pricing.popular": "सर्वाधिक लोकप्रिय",

    "faq.tag": "प्रश्न",
    "faq.title": "तुमच्या प्रश्नांची उत्तरे.",

    "cta.title.1": "तुमच्या रेस्टॉरंटला द्या",
    "cta.title.2": "ते लायक असलेले भविष्य.",
    "cta.sub": "तुमच्यासारख्याच खऱ्या रेस्टॉरंटमध्ये SmartDine चालताना पाहा. 20 मिनिटांचा डेमो.",
    "cta.primary": "मोफत डेमो बुक करा",
    "cta.secondary": "मोफत ट्रायल सुरू करा",
    "cta.tertiary": "तज्ज्ञांशी बोला",
    "cta.note": "कार्ड नाही • सेटअप फी नाही • कधीही रद्द",

    "sticky.cta": "मोफत डेमो बुक करा",
    "wa.cta": "WhatsApp वर चॅट करा",
  },
};

export const I18nCtx = createContext<{ lang: Lang; setLang: (l: Lang) => void; t: (k: string) => string }>({
  lang: "en",
  setLang: () => {},
  t: (k) => k,
});

export const useI18n = () => useContext(I18nCtx);
