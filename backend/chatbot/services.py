from .models import ChatSession, ChatMessage, SupportTicket
import re
import logging
import traceback

logger = logging.getLogger(__name__)

# Local translation mapping for a "Keyless" multilingual experience
TRANSLATIONS = {
    'hi': {
        'greeting': "नमस्ते! मैं आपका TGS सहायक हूँ। मैं **{role}** के रूप में आपकी सहायता के लिए यहाँ हूँ। मैं आज आपकी क्या मदद कर सकता हूँ?",
        'greeting_rom': "Nama-stey! Main aap-ka T-G-S sahaayak hoon. Main {role} ke roop mein aap-ki sahaayata ke liye yahan hoon. Aaj main aap-ki kya madad kar sakta hoon?",
        'how_are_you': "मैं बहुत अच्छा कर रहा हूँ, पूछने के लिए धन्यवाद! मैं आपकी यात्रा अनुरोधों, बेड़े की पूछताछ, या अतिथि गृह बुकिंग में आपकी सहायता के लिए तैयार हूँ। मैं आज आपकी क्या मदद कर सकता हूँ?",
        'how_are_you_rom': "Main bahut acchaa kar raha hoon, pooch-ney ke liye dhanya-vaad! Main aap-ki yaatra anuraadhon, bedey ki poochtach, ya guest house booking mein aap-ki sahaayata ke liye taiy-yaar hoon. Main aaj aap-ki kya madad kar sakta hoon?",
        'who_are_you': "मैं **TGS वर्चुअल असिस्टेंट** हूँ, जो बाव्या ट्रेवल सिस्टम द्वारा संचालित है। मेरा काम आपकी व्यावसायिक यात्रा प्रक्रिया को यथासंभव सुचारु बनाना है!",
        'who_are_you_rom': "Main TGS Virtual Assistant hoon, Bavya Travel System dwara sanchalit.",
        'thanks': "आपका बहुत-बहुत स्वागत है! क्या मैं आपकी किसी और चीज़ में मदद कर सकता हूँ?",
        'thanks_rom': "Aapka swagat hai! Kya main kisi aur cheez mein madad kar sakta hoon?",
        'bye': "अलविदा! आपका दिन मंगलमय और उत्पादक हो।",
        'bye_rom': "Alvida! Aapka din mangalmay ho.",
        'fallback': "मुझे अभी तक समझ नहीं आया कि उस बारे में कैसे मदद करूँ। **{role}** के रूप में, आप कर सकते हैं:\n- {cap1}\n- {cap2}\n- {cap3}\n\nक्या इनमें से कोई ऐसी चीज़ है जिसके बारे में आप और जानना चाहेंगे?",
        'fallback_rom': "Mujhe abhi tak samajh nahi aaya ki us barey mein kaise madad karoon. {role} ke roop mein, aap sakte hain: {cap1}, {cap2}, aur {cap3}. Kya inmein se koi aisi cheez hai jiske baarey mein aap aur jaanna chahenge?",
        'trip_create': "To create a trip: [Dashboard](/), click 'New Trip Request'.",
        'trip_create_rom': "Trip create karne ke liye Dashboard jayein.",
        'status': "आप यहां अपने अनुरोधों की वर्तमान स्थिति देख सकते हैं:\n- **[मेरी यात्राएं](/trips)**: आपके सभी सक्रिय यात्रा अनुरोधों के लिए।\n- **[मेरे अनुरोध](/my-requests)**: व्यक्तिगत अनुरोधों और ऐतिहासिक डेटा के लिए।\n**'Draft'**, **'Pending'**, **'Approved'**, या **'Settled'** जैसे स्टेटस बैज देखें।",
        'status_rom': "Aap yahan apney anuraadhon ki vartamaan sthiti dekh sakte hain: My Trips ya My Requests par jayein. Draft, Pending, Approved, ya Settled jaise status badges dekhein.",
        'approval': "आपके **[अनुमोदन इनबॉक्स](/approvals)** में लंबित कार्य हैं। आप वहां टिप्पणियों के साथ अनुरोधों की समीक्षा, अनुमोदन या वापसी कर सकते हैं।",
        'approval_rom': "Approvals inbox mein pending kaam hai.",
        'settlement': "अपने यात्रा खर्चों को निपटाने और ट्रिप लेजर को बंद करने के लिए:\n- **[निपटान](/settlement)** मॉड्यूल पर जाएं।\n- अपने अनुमोदित ट्रिप का चयन करें और सभी खर्चों को सत्यापित करें।\n- एक बार सबमिट करने के बाद, वित्त टीम अंतिम भुगतान के लिए इसकी समीक्षा करेगी।",
        'settlement_rom': "Apney yaatra kharchon ko niptaaney aur trip ledger ko band karney ke liye: Settlement module par jayein, apney approved trips ko verify karein, aur finance team ko submit karein.",
        'mileage': "स्थानीय यात्रा के लिए अपने वाहन माइलेज को रिकॉर्ड करने के लिए:\n- **[माइलेज कैप्चర్](/mileage)** पेज का उपयोग करें।\n- अपनी यात्रा की शुरुआत और अंत में अपने ओडोमीटर की एक स्पष्ट तस्वीर अपलोड करना सुनिश्चित करें।",
        'mileage_rom': "Mileage record karne ke liye Mileage Capture page use karein.",
        'policy': "सभी यात्रा नियम **[नीति केंद्र](/policy)** में हैं, जो **अंग्रेजी, तेलुगु और हिंदी** में उपलब्ध हैं। इसमें यात्रा के तरीके, भोजन भत्ता और होटल पात्रता श्रेणियां शामिल हैं।",
        'policy_rom': "Rules Policy Center mein hain - English, Hindi aur Telugu mein.",
        'trip_requirements': "यात्रा अनुरोध के लिए अनिवार्य आवश्यकताएं हैं:\n1. **मूल और गंतవ్య**: दोनों आवश्यक हैं।\n2. **तारीखें**: मान्य आरंभ और समाप्ति तिथियां।\n3. **उद्देश्य**: एक स्पष्ट व्यावसायिक उद्देश्य।\n4. **प्रोजेक्ट कोड**: उदा., 'General' या एक विशिष्ट ID।\n5. **नीति स्वीकृति**: नियम बॉक्स को चेक करना होगा।\n\nमासिक निपटान के लिए, आपको एक गतिविधि लॉग एक्सेल फ़ाइल की भी आवश्यकता होगी।",
        'trip_requirements_rom': "Yatra anuraadh ke liye mandatory requirements hain: Origin, Destination, Dates, Purpose aur Project Code. Policy accept karna zaroori hai.",
        'trip_process': "TGS जीवनचक्र इन चरणों का पालन करता है:\n1. **यात्रा अनुरोध**: प्रबंधक की स्वीकृति।\n2. **व्यय प्रविष्टि**: वास्तविक समय में बिल कैप्चर।\n3. **दावा समीक्षा**: आपके बिलों का वित्त ऑडिट।\n4. **निपटान**: लेजर को अंतिम रूप देना (वसूली बनाम भुगतान)।\n\nअधिक विवरण के लिए पूर्ण **[TGS प्रोसेस गाइड](file:///C:/Users/vinay/.gemini/antigravity/brain/1430340f-3fca-4cb5-b94f-0654130b13bc/tgs_process_guide.md)** देखें।",
        'trip_process_rom': "TGS lifecycle in steps ko follow karta hai: Trip Request, Expense Entry, Claim Review aur Settlement. Poori details ke liye process guide dekhein.",
        'expense_help': "व्यय रिकॉर्ड करने के लिए:\n1. **[व्यय](/expenses)** पर जाएं।\n2. एक **अनुमोदित यात्रा** चुनें।\n3. राशि और श्रेणी दर्ज करें।\n4. प्रत्येक वस्तु के लिए रसीद की तस्वीर अपलोड करना **अनिवार्य** है।\n5. **Add to Claim** पर क्लिक करें।",
        'expense_help_rom': "Expense record karne ke liye: Expenses page par jayein, approved trip chunein, amount aur category bharein, aur receipt upload karna zaroori hai.",
        'settle_help': "दावे और निपटान इस प्रकार काम करते हैं:\n1. अपने खर्चों को **पूर्ण दावे** के रूप में जमा करें।\n2. वित्त टीम वस्तुओं की समीक्षा और अनुमोदन करती है।\n3. अग्रिम राशि को दावों के साथ संतुलित करने के लिए **[निपटान](/settlement)** अंतिम चरण है।\n4. इसके बाद आपको **शुद्ध प्रतिपूर्ति** या **वसूली** अनुरोध प्राप्त होता है।",
        'settle_help_rom': "Claims aur Settlements aise kaam karte hain: Expenses ko Full Claim ki tarah jama karein. Finance review ke baad Settlement module mein ledger balance karein."
    },
    'te': {
        'greeting': "నమస్కారం! నేను మీ TGS అసిస్టెంట్ని. నేను మీకు **{role}** గా సహాయం చేయడానికి ఇక్కడ ఉన్నాను. ఈరోజు నేను మీకు ఏ విధంగా సహాయపడగలను?",
        'greeting_rom': "Nama-skaaram! Neynu mee T-G-S assistant-ni. Ney-nu mee-ku {role} gaa sahaayam cheya-daani-ki ikka-da unnaanu. Ee-roju ney-nu mee-ku ey vidham-gaa sahaaya-pada-gala-nu?",
        'how_are_you': "నేను చాలా బాగున్నాను, అడిగినందుకు ధన్యవాదాలు! మీ ప్రయాణ అభ్యర్థనలు, ఫ్లీట్ ప్రశ్నలు లేదా గెస్ట్ హౌస్ బుకింగ్‌లలో మీకు సహాయం చేయడానికి నేను సిద్ధంగా ఉన్నాను. మీ మనసులో ఏముంది?",
        'how_are_you_rom': "Neynu chaalaa baagun-naanu, adi-gi-nan-duku dhanya-vaadaalu! Mee pray-aa-na abhya-rtha-nalu, fleet pra-shna-lu ley-daa guest house boo-king-la-lo sahaayam che-yaa-daani-ki ney-nu si-dham-gaa un-naanu. Mee manasulo ey-mu-ndi?",
        'who_are_you': "నేను **TGS వర్చువల్ అసిస్టెంట్ని**, బావ్యా ట్రావెల్ సిస్టమ్ ద్వారా అందించబడింది. మీ వ్యాపార ప్రయాణ ప్రక్రియను వీలైనంత సాఫీగా చేయడమే నా పని!",
        'who_are_you_rom': "Neynu T-G-S Virtual Assistant-ni, Baavya Travel System dwaara andincha-badindi.",
        'thanks': "మీకు స్వాగతం! నేను మీకు ఇంకా ఏదైనా సహాయం చేయగలనా?",
        'thanks_rom': "Mee-ku swaaga-tam! Ney-nu mee-ku inkaa edainaa sahaayam cheya-galanaa?",
        'bye': "సెలవు! మీ రోజు శుభప్రదంగా మరియు ఉత్పాదకతతో సాగాలని కోరుకుంటున్నాను.",
        'bye_rom': "Sela-vu! Mee roju shubha-pradam-gaa, sagalani koru-kun-tun-naanu.",
        'fallback': "దీనికి ఎలా సహాయం చేయాలో నాకు ఇంకా ఖచ్చితంగా తెలియదు. **{role}** గా, మీరు ఇవి చేయవచ్చు:\n- {cap1}\n- {cap2}\n- {cap3}\n\nవీటిలో దేని గురించి అయినా మీరు మరింత తెలుసుకోవాలనుకుంటున్నారా?",
        'fallback_rom': "Deeni-ki elaa sahaayam che-yaa-lo naaku inkaa kha-cchi-tham-gaa teli-yadu. {role} gaa, meeru ivi che-ya-vachu: {cap1}, {cap2}, aur {cap3}. Veeti-lo deeni gurinchi ayinaa meeru marinta telu-su-ko-vaali-ani anu-kun-tunnaara?",
        'trip_create': "కొత్త ప్రయాణ అభ్యర్థనను సృష్టించడానికి:\n1. మీ **[డ్యాష్‌బోర్డ్](/)** కి వెళ్లండి.\n2. **'New Trip Request'** బటన్ క్లిక్ చేయండి, లేదా నేరుగా **[ట్రిప్ క్రియేషన్](/create-trip)** కి వెళ్లండి.\n3. మీ ప్రయాణ తేదీలు, మూలం, గమ్యం మరియు ఉద్దేశ్యాన్ని నమోదు చేయండి.\n4. ఆమోదం కోసం పంపడానికి **సమర్పించు** క్లిక్ చేయండి.",
        'trip_create_rom': "Kotha prayana request sristinchadaniki Dashboard ki velli New Trip Request click cheyandi.",
        'status': "మీరు మీ అభ్యర్థనల ప్రస్తుత స్థితిని ఇక్కడ తనిఖీ చేయవచ్చు:\n- **[నా ప్రయాణాలు](/trips)**: మీ అన్ని క్రియాశీల ప్రయాణ అభ్యర్థనల కోసం.\n- **[నా అభ్యర్థనలు](/my-requests)**: వ్యక్తిగత అభ్యర్థనలు మరియు పాత డేటా కోసం.\n**'Draft'**, **'Pending'**, **'Approved'**, లేదా **'Settled'** వంటి స్టేటస్ బ్యాడ్జ్ ల కోసం చూడండి.",
        'status_rom': "Meeru mee abhya-rtha-nala prastu-tha sthiti-ni ikka-da tani-khee che-ya-vachu: Naa Pra-yaa-naalu ley-daa Naa Abhya-rtha-nalu. Draft, Pending, Approved ley-daa Settled laanti status badges chu-da-ndi.",
        'approval': "మీ **[అప్రూవల్ ఇన్‌బాక్స్](/approvals)** లో పెండింగ్ పనులు ఉన్నాయి. మీరు అక్కడ వ్యాఖ్యలతో అభ్యర్థనలను సమీక్షవచ్చు, ఆమోదించవచ్చు లేదా తిరిగి పంపవచ్చు.",
        'approval_rom': "Mee Approvals inbox lo pending panulu unnay.",
        'settlement': "మీ ప్రయాణ ఖర్చులను సెటిల్ చేయడానికి మరియు ట్రిప్ లెడ్జర్‌ను మూసివేయడానికి:\n- **[సెటిల్మెంట్](/settlement)** మాడ్యూల్‌కి వెళ్లండి.\n- మీ ఆమోదించబడిన ట్రిప్‌ను ఎంచుకుని, అన్ని ఖర్చులను ధృవీకరించండి.\n- సమర్పించిన తర్వాత, ఫైనాన్స్ టీమ్ తుది చెల్లింపు కోసం దానిని సమీక్షిస్తుంది.",
        'mileage': "స్థానిక ప్రయాణం కోసం మీ వాహన మైలేజీని నమోదు చేయడానికి:\n- **[మైలేజ్ క్యాప్చర్](/mileage)** పేజీని ఉపయోగించండి.\n- మీ ప్రయాణం ప్రారంభంలో మరియు ముగింపులో మీ ఓడోమీటర్ యొక్క స్పష్టమైన ఫోటోను అప్‌లోడ్ చేయాలని నిర్ధారించుకోండి.",
        'policy': "అన్ని ప్రయాణ నియమాలు **[పాలసీ సెంటర్](/policy)** లో ఉన్నాయి, ఇవి **ఇంగ్లీష్, తెలుగు మరియు హిందీ** లో అందుబాటులో ఉన్నాయి. ఇందులో ప్రయాణ విధానాలు, భోజన భత్యం మరియు హోటల్ అర్హత గ్రేడ్‌లు ఉన్నాయి.",
        'trip_requirements': "ప్రయాణ అభ్యర్థన కోసం తప్పనిసరి అవసరాలు:\n1. **ప్రారంభం & గమ్యం**: రెండూ అవసరం.\n2. **తేదీలు**: సరైన ప్రారంభ మరియు ముగింపు తేదీలు.\n3. **ఉద్దేశ్యం**: స్పష్టమైన వ్యాపార లక్ష్యం.\n4. **ప్రాజెక్ట్ కోడ్**: ఉదా., 'General' లేదా నిర్దిష్ట ID.\n5. **పాలసీ అంగీకారం**: తప్పనిసరిగా నియమాల బాక్స్‌ను చెక్ చేయాలి.\n\nనెలవారీ సెటిల్‌మెంట్‌ల కోసం మీకు ధృవీకరించబడిన యాక్టివిటీ లాగ్ ఎక్సెల్ ఫైల్ కూడా అవసరం.",
        'trip_requirements_rom': "Prayana request kosam mandatory details: Origin, Destination, Dates, Purpose aur Project Code. Policy accept cheyadam thappanisari.",
        'trip_process': "TGS లైఫ్ సైకిల్ ఈ దశలను అనుసరిస్తుంది:\n1. **ట్రిప్ రిక్వెస్ట్**: మేనేజర్ ఆమోదం.\n2. **ఎక్స్‌పెన్స్ ఎంట్రీ**: రియల్ టైమ్ బిల్ క్యాప్చర్.\n3. **క్లెయిమ్ రివ్యూ**: ఫైనాన్స్ ఆడిట్.\n4. **సెటిల్‌మెంట్**: లెడ్జర్‌ను ముగించడం (రికవరీ లేదా పేమెంట్).\n\nమరిన్ని వివరాల కోసం **[TGS ప్రాసెస్ గైడ్](file:///C:/Users/vinay/.gemini/antigravity/brain/1430340f-3fca-4cb5-b94f-0654130b13bc/tgs_process_guide.md)** చూడండి.",
        'trip_process_rom': "TGS life cycle ee steps follow avuthundi: Trip Request, Expense Entry, Claim Review mariyu Settlement. Full details kosam process guide chudandi.",
        'expense_help': "ఖర్చును నమోదు చేయడానికి:\n1. **[ఖర్చులు](/expenses)** కి వెళ్లండి.\n2. ఆమోదించబడిన ట్రిప్‌ను ఎంచుకోండి.\n3. మొత్తం మరియు వర్గాన్ని నమోదు చేయండి.\n4. ప్రతి ఐటెమ్ కోసం రసీదు ఫోటోను అప్‌లోడ్ చేయడం **తప్పనిసరి**.\n5. **Add to Claim** క్లిక్ చేయండి.",
        'expense_help_rom': "Expense record cheyadaniki: Expenses page ki velli, approved trip select chesi, amount mariyu category enter cheyandi. Receipt upload cheyadam chala mukhyam.",
        'settle_help': "క్లెయిమ్‌లు మరియు సెటిల్‌మెంట్‌లు ఇలా పనిచేస్తాయి:\n1. మీ ఖర్చులను **పూర్తి క్లెయిమ్** గా సమర్పించండి.\n2. ఫైనాన్స్ టీమ్ సమీక్షించి ఆమోదిస్తుంది.\n3. అడ్వాన్స్‌లను క్లెయిమ్‌లతో సరిపోల్చడానికి **[సెటిల్‌మెంట్](/settlement)** చివరి దశ.\n4. ఆ తర్వాత మీరు **నెట్ రీయింబర్స్‌మెంట్** లేదా **రికవరీ** రిక్వెస్ట్ అందుకుంటారు.",
        'settle_help_rom': "Claims mariyu Settlements ila pani chesthay: Expenses ni Full Claim ga submit cheyandi. Finance review tharvatha Settlement module lo ledger finish cheyandi."
    }
}


def detect_language(text, current_lang='en'):
    """
    Detects if the text contains Hindi, Telugu, or English characters.
    v12.6: Fuzzy Greeting Resolver (Fixed Namaskar/Namaskaram flip).
    """
    clean_text = text.lower().strip()
    
    # Priority 0: Multi-Word Script Clusters
    if re.search(r'[\u0c00-\u0c7f].*[\u0c00-\u0c7f]', text): return 'te'
    if re.search(r'[\u0900-\u097f].*[\u0900-\u097f]', text): return 'hi'

    # Priority 1: High-Confidence Telugu Markers
    te_markers = [
        'bagunara', 'ela unaru', 'velli', 'ravali', 'cheyand', 'sristin', 'payanam', 'nenu', 'kotha',
        'ela unnav', 'chala bagund', 'em chestunav', 'cheppandi', 'telugu', 'namaskaram', 'namaskara'
    ]
    if any(p in clean_text for p in te_markers): return 'te'
    
    # Priority 2: High-Confidence Hindi Markers
    hi_markers = [
        'dhanyavad', 'shukriya', 'naya', 'karo', 'haryana', 'kaise ho', 'kya haal', 'apardan',
        'namaste', 'namastey', 'namastay', 'hindi'
    ]
    if any(p in clean_text for p in hi_markers): return 'hi'

    # Priority 3: Fuzzy Greeting Resolver (The Namaskar/Namaskaram Bridge)
    if 'namaskar' in clean_text:
        # A: Absolute Telugu long-form
        if 'namaskaram' in clean_text or 'namaskara' in clean_text:
            return 'te'
            
        # B: STT Artefacts (Browser often splits "Namaskaram" into "Namaskar m" or "Namaskar a")
        if re.search(r'namaskar\s+[ma]', clean_text):
            return 'te'
            
        # C: Hindi Context Override (If they say "Namaskar" + any Hindi marker)
        if any(p in clean_text for p in hi_markers):
            return 'hi'
            
        # D: Isolation Logic
        if clean_text == 'namaskar':
            # If we were already in Telugu mode, treat isolated 'namaskar' as 'namaskaram'
            if current_lang == 'te': return 'te'
            return 'hi' # Default for English/Neutral
            
        return 'hi' # Catch-all for other variants

    # Priority 4: Unicode Script Range (Single character fallback)
    if re.search(r'[\u0c00-\u0c7f]', text): return 'te'
    if re.search(r'[\u0900-\u097f]', text): return 'hi'

    # Priority 5: English Auto-switch-back (Expanded for TGS Context)
    en_markers = [
        'the', 'is', 'and', 'what', 'how', 'why', 'can', 'you', 'help', 'please', 'explain', 'show', 'me', 'my', 'as', 'hello', 'hey', 'hi',
        'trip', 'status', 'create', 'new', 'expense', 'bill', 'receipt', 'charge', 'claim', 'settle', 'reimburse', 'pay', 'money', 'policy', 'rule'
    ]
    if any(re.search(rf'\b{p}\b', clean_text) for p in en_markers):
        return 'en'
    
    return 'en'

def get_bot_response(user, message_text, session_id, language='en'):
    """
    Core logic to parse user message and return a helpful response.
    Supports English, Telugu (te), and Hindi (hi).
    """
    original_message = message_text
    message_text = message_text.strip().lower()
    
    # v12.3: Contextual detection (Sticky language)
    detected_lang = detect_language(message_text, language)
    
    # If a specific language is detected, switch. 
    if detected_lang:
        language = detected_lang
        
    logger.info(f"ChatBot input='{message_text}' | detected='{detected_lang}' | using='{language}'")

    # 1. Handle or create session
    session, _ = ChatSession.objects.get_or_create(session_id=session_id, defaults={'user': user})
    if user and not session.user:
        session.user = user
        session.save()
    
    # Save user message
    ChatMessage.objects.create(session=session, sender='user', message=original_message)
    
    # Role detection & Localization
    role_map = {
        'hi': {'Employee': ('कर्मचारी', 'Karmchari'), 'User': ('उपयोगकर्ता', 'Upyogkarta'), 'Admin': ('प्रशासक्', 'Prashasak')},
        'te': {'Employee': ('ఉద్యోగి', 'Udyogi'), 'User': ('వినియోగదారు', 'Viniyogadaaru'), 'Admin': ('అడ్మిన్', 'Admin')}
    }
    cap_map = {
        'hi': {'create': ('यात्रा बनाना', 'Yatra Banana'), 'status': ('स्थिति ट्रैक करना', 'Status Track Karna'), 'policy': ('नीति की जांच', 'Policy ki Jaanch')},
        'te': {'create': ('ట్రిప్ క్రియేషన్', 'Trip Creation'), 'status': ('స్టేటస్ ట్రాకింగ్', 'Status Tracking'), 'policy': ('పాలసీ చెక్', 'Policy Check')}
    }
    
    # v10.9: Define role_name (fixed NameError)
    role_name = "User"
    if user and hasattr(user, 'role') and user.role:
        # Use simple name for matching role_map keys
        role_name = user.role.name
    
    # Extract native and roman versions
    role_info = role_map.get(language, {}).get(role_name, (role_name, role_name))
    local_role, local_role_rom = role_info
    
    # Process capabilities
    raw_caps = cap_map.get(language, {})
    local_caps = {k: v[0] for k, v in raw_caps.items()}
    local_caps_rom = {k: v[1] for k, v in raw_caps.items()}

    # Bot logic with translation support
    lang_map = TRANSLATIONS.get(language, {})
    
    # helper to get translated string or fallback to English
    def _t(key, default_text, **kwargs):
        if not lang_map or key not in lang_map:
            return default_text.format(**kwargs)
        try:
            val = lang_map[key]
            if 'role' not in kwargs: kwargs['role'] = local_role
            native = val.format(**kwargs)
            
            # Romanized Speech Fallback (v7.0)
            # v10.3: Handle Romanized variables for Romanized templates
            rom_key = f"{key}_rom"
            if rom_key in lang_map:
                rom_template = lang_map[rom_key]
                # Prepare speech-friendly kwargs
                speech_kwargs = kwargs.copy()
                if 'role' in speech_kwargs and 'role_rom' in kwargs:
                    speech_kwargs['role'] = kwargs['role_rom']
                elif 'role' in speech_kwargs:
                    speech_kwargs['role'] = local_role_rom

                # Handle cap1, cap2, cap3 if they are capabilities
                for c in ['cap1', 'cap2', 'cap3']:
                    rom_v = kwargs.get(f"{c}_rom")
                    if rom_v:
                        speech_kwargs[c] = rom_v

                rom = rom_template.format(**speech_kwargs)
                return f"{native} ||| {rom}"
            
            return native
        except Exception as e:
            return lang_map.get(key, default_text)

    reply = ""

    # Role detail flags
    is_admin = any(kw in role_name.lower() for kw in ['admin', 'superuser', 'it-admin'])
    is_finance = any(kw in role_name.lower() for kw in ['finance', 'cfo', 'accounts'])
    is_approver = any(kw in role_name.lower() for kw in ['reporting_authority', 'hr', 'cfo', 'admin'])
 
    # v11.8: Boundary-Aware Matching (Collision Prevention)
    def has_intent(keywords, text):
        for k in keywords:
            if len(k) < 4:
                if re.search(rf'\b{k}\b', text): return True
            elif k in text:
                return True
        return False

    # 3. Intent recognition
    
    # Trip Management (Creation)
    if (any(k in message_text for k in ['trip', 'travel', 'request', 'booking', 'creation', 'apply', 'take', 'go to', 'यात्रा', 'ప్రయాణం', 'ట్రిప్', 'सफर', 'బుకింగ్'])) and \
       (any(k in message_text for k in ['create', 'new', 'start', 'book', 'raise', 'how to', 'creation', 'बनाएं', 'सृష్టించు', 'కొత్త', 'ప్రారంభించు', 'apply', 'take', 'go to', 'अनुरोध', 'अर्जी', 'अनिरुद्ध', 'అభ్యర్థన', 'అప్లై'])):
        reply = _t('trip_create', "To create a trip request:\n1. On your **[Dashboard](/)**, look at the top-right header actions.\n2. Click the **[New Trip Request](/create-trip)** button (Blue button with a '+' icon).\n3. For monthly local settlements, you can also use **[Travel Creation](/travel-creation)**.\n4. Fill in the purpose and click **Initiate** or **Submit**.")
                 
    # Trip Requirements (Detailed)
    elif any(k in message_text for k in ['requirement', 'detail', 'field', 'form', 'mandatory', 'శరతులు', 'నియమాలు', 'अनिवार्य', 'आवश्यकता']):
        reply = _t('trip_requirements', "The mandatory requirements for a trip request are:\n1. **Origin & Destination**: Both are required.\n2. **Dates**: Valid Start and End dates.\n3. **Purpose**: A clear business objective.\n4. **Project Code**: e.g., 'General' or a specific ID.\n5. **Policy Acceptance**: Must check the agreement box.\n\nFor **Monthly Settlements**, you also need a validated **Activity Log Excel file**.")

    # Trip Process (Direct Link to Guide)
    elif any(k in message_text for k in ['process', 'how to', 'steps', 'procedure', 'పద్ధతి', 'విధానం', 'ప్రక్రమము', 'तरीका']):
        reply = _t('trip_process', "The TGS lifecycle follows these steps:\n1. **Trip Request**: Initial manager approval.\n2. **Expense Entry**: Real-time bill capture.\n3. **Claim Review**: Finance audit of your bills.\n4. **Settlement**: Finalizing the ledger (Recovery vs Payment).\n\nView the full **[TGS Process Guide](file:///C:/Users/vinay/.gemini/antigravity/brain/1430340f-3fca-4cb5-b94f-0654130b13bc/tgs_process_guide.md)** for more details.")

    # Expense Intent
    elif any(k in message_text for k in ['expense', 'bill', 'receipt', 'charge', 'खर्च', 'ఖర్చు', 'రసీదు', 'బిల్లు']):
        reply = _t('expense_help', "To record an expense:\n1. Go to **[Expenses](/expenses)**.\n2. Select an **Approved Trip**.\n3. Enter amount and category.\n4. **MUST** upload a receipt image for each item.\n5. Click **Add to Claim**.")

    # Claim/Settlement Intent
    elif any(k in message_text for k in ['claim', 'settle', 'reimburse', 'pay', 'money', 'క్లెయిమ్', 'చెల్లింపు', 'పాలసీ', 'भुगतान', 'दावा']):
        reply = _t('settle_help', "Claims and Settlements work as follows:\n1. Submit your expenses as a **Full Claim**.\n2. Finance reviews and approves individual items.\n3. **[Settlement](/settlement)** is the final step to balance advances against your approved claims.\n4. You then receive a **Net Reimbursement** or a **Recovery** request.")

    # Trip Management (Status/Tracking)
    elif (any(k in message_text for k in ['trip', 'travel', 'request', 'booking', 'यात्रा', 'ప్రయాణం', 'ట్రిప్'])) and \
         (any(k in message_text for k in ['status', 'where', 'track', 'check', 'स्थित', 'స్థితి', 'ఎక్కడ', 'ట్రాక్'])):
        reply = _t('status', "Check status at **[My Trips](/trips)** or **[My Requests](/my-requests)**.")

    elif any(k in message_text for k in ['approval', 'approve', 'task', 'अनुमोदन', 'ఆమోదం', 'మంజూరు', 'అప్రూవల్']):
        reply = _t('approval', "Review pending tasks in your **[Approval Inbox](/approvals)**.")

    elif any(k in message_text for k in ['policy', 'rule', 'eligibility', 'नीति', 'పాలసీ', 'నియమాలు', 'పద్ధతి']):
        reply = _t('policy', "All travel rules are in the **[Policy Center](/policy)**.")

    # 4. Fallback Intents (Greetings, Small Talk)
    # v11.0: Merged Greeting Intent (Cross-Language normalization)
    elif any(k in message_text for k in [
        'hi', 'hello', 'hey', 'yo', 
        'नमस्ते', 'नमस्कार', 'నమస్కారం', 'నమస్తే', 'హలో', 
        'namaskar', 'namaskaram', 'namaskara', 'namaste', 'namastey', 'namastay'
    ]):
        reply = _t('greeting', f"Hello! I am your **TGS Assistant**. How can I assist you today?", role=local_role)
    
    elif any(k in message_text for k in ['how are you', 'हाल', 'ఎలా ఉన్నారు', 'कैसे हैं']):
        reply = _t('how_are_you', "I'm doing great, thank you!")

    elif any(k in message_text for k in ['who are you', 'आप कौन', 'మీరు ఎవరు', 'ఎవరు మీరు']):
        reply = _t('who_are_you', "I am the **TGS Virtual Assistant**.")

    elif any(k in message_text for k in ['thank', 'thanks', 'धन्यवाद', 'ధన్యవాదాలు', 'శుక్రియా']):
        reply = _t('thanks', "You're very welcome!")

    elif any(k in message_text for k in ['bye', 'goodbye', 'अलविदा', 'సెలవు', 'टाటా']):
        reply = _t('bye', "Goodbye! Have a safe day.")

    # Default Fallback
    else:
        # Default localized strings
        d_caps = local_caps.get('create', 'Create Trips') + ", " + local_caps.get('status', 'Track Status') + ", or " + local_caps.get('policy', 'Check Policy')
        
        if is_admin: 
            d_caps = "ask me about masters, fleet management, or audit logs"
        elif is_finance: 
            d_caps = "ask me about settlements, advances, or finance reports"
            
        reply = _t('fallback', f"I'm not exactly sure how to help with that yet. As a **{local_role}**, you can {d_caps}.", 
                  role=local_role, 
                  role_rom=local_role_rom,
                  cap1=local_caps.get('create', 'Create Trips'), 
                  cap1_rom=local_caps_rom.get('create', 'Create Trips'),
                  cap2=local_caps.get('status', 'Track Status'), 
                  cap2_rom=local_caps_rom.get('status', 'Track Status'),
                  cap3=local_caps.get('policy', 'Check Policy'),
                  cap3_rom=local_caps_rom.get('policy', 'Check Policy'))
        logger.info(f"Fallback triggered for language: {language}")

    # Save bot message
    ChatMessage.objects.create(session=session, sender='bot', message=reply)
    
    # v12.5: Return reply, effective language, and the raw detection for UI hints
    return reply, language, (detected_lang or language)
