import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, AlertCircle, Mic, MicOff, Volume2, VolumeX, Languages } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../api/api';
const PHONETIC_MAP = {
    te: {
        'tgs': 'టీజీఎస్',
        'vavya': 'బావ్యా',
        'travel': 'ట్రావెల్',
        'system': 'సిస్టమ్',
        'assistant': 'అసిస్టెంట్',
        'virtual': 'వర్చువల్',
        'admin': 'అడ్మిన్',
        'superuser': 'సూపర్ యూజర్',
        'reporting': 'రిపోర్టింగ్',
        'authority': 'అథారిటీ',
        'hr': 'హెచ్ ఆర్',
        'cfo': 'సీఎఫ్ఓ',
        'accounts': 'అకౌంట్స్',
        'finance': 'ఫైనాన్స్',
        'dashboard': 'డ్యాష్‌బోర్డ్',
        'request': 'రిక్వెస్ట్',
        'creation': 'క్రియేషన్',
        'trips': 'ట్రిప్స్',
        'trip': 'ట్రిప్',
        'settlement': 'సెటిల్మెంట్',
        'mileage': 'మైలేజ్',
        'capture': 'క్యాప్చర్',
        'policy': 'పాలసీ',
        'center': 'సెంటర్',
        'hotel': 'హోటల్',
        'category': 'కేటగిరీ',
        'hi': 'హాయ్',
        'hello': 'హలో',
        'online': 'ఆన్లైన్',
        'status': 'స్టేటస్'
    },
    hi: {
        'tgs': 'टीजीएस',
        'vavya': 'बाव्या',
        'travel': 'ट्रैवल',
        'system': 'सिस्टम',
        'assistant': 'असिस्टेंट',
        'virtual': 'वर्चुअल',
        'admin': 'एडमिन',
        'superuser': 'सुपर यूजर',
        'reporting': 'रिपोर्टिंग',
        'authority': 'अथॉरिटी',
        'hr': 'एच आर',
        'cfo': 'सी एफ ओ',
        'accounts': 'अकाउंट्स',
        'finance': 'फाइनेंस',
        'dashboard': 'डैशबोर्ड',
        'request': 'रिक्वेस्ट',
        'creation': 'क्रिएशन',
        'trips': 'ट्रिप्स',
        'trip': 'ट्रिप',
        'settlement': 'सेटलमेंट',
        'mileage': 'माइलेज',
        'capture': 'कैप्चर',
        'policy': 'पॉलिसी',
        'center': 'सेंटर',
        'hotel': 'होटल',
        'category': 'कैटेगरी',
        'hi': 'नमस्ते',
        'hello': 'नमस्ते',
        'online': 'ऑनलाइन',
        'status': 'स्टेटस'
    }
};

const SupportBot = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false);
    const [input, setInput] = useState('');
    const [interimText, setInterimText] = useState(''); // v12.6.1: Reactive transcription state
    const [messages, setMessages] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [language, setLanguage] = useState('en');
    const [isListening, setIsListening] = useState(false);
    const [micVolume, setMicVolume] = useState(0); // v12.2: Track volume for UI feedback
    const [isSpeakingEnabled, setIsSpeakingEnabled] = useState(true);
    const scrollRef = useRef(null);
    const [modal, setModal] = useState({ show: false, title: '', content: '' });

    // Use a persistent session ID for the user
    const sessionId = sessionStorage.getItem('tgs_chat_session') || `session_${Math.random().toString(36).substr(2, 9)}`;
    
    // Simple hash function to get a stable voice selection for a user
    const getHash = (str) => {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = ((hash << 5) - hash) + str.charCodeAt(i);
            hash |= 0;
        }
        return Math.abs(hash);
    };

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = useRef(null);
    const voicesRef = useRef([]);
    const utteranceRef = useRef(null); // Prevents garbage collection while speaking
    const handleSendRef = useRef(null);
    const languageRef = useRef(null);
    const interimTranscriptRef = useRef('');
    const isProcessingRef = useRef(false);
    const speakingChainIdRef = useRef(0); // v10.2: Mutex to prevent overlapping speech cycles
    const silenceTimerRef = useRef(null); // v10.4: Timer to detect end of speech
    const accumulatedTranscriptRef = useRef(''); // v10.4: Buffer for continuous listening


    // Pre-load voices for TTS
    useEffect(() => {
        const loadVoices = () => {
            const availableVoices = window.speechSynthesis.getVoices();
            if (availableVoices.length > 0) {
                voicesRef.current = availableVoices;
            }
        };
        loadVoices();
        if (window.speechSynthesis.onvoiceschanged !== undefined) {
            window.speechSynthesis.onvoiceschanged = loadVoices;
        }
    }, []);

    // v10.6: Centralized Mic Setup to prevent wiring leaks
    const setupRecognition = () => {
        if (!SpeechRecognition) return;
        
        const rec = new SpeechRecognition();
        // v12.2: REVERT to continuous=false. 
        // Manual simulation is more stable in insecure HTTP contexts.
        rec.continuous = false; 
        rec.interimResults = true;
        
        rec.onstart = () => {
            setIsListening(true);
        };

        rec.onspeechstart = () => {
            // Improve UI feedback immediately on speech detection
            const inputElem = document.querySelector('.chat-footer input');
            if (inputElem && inputElem.placeholder === "Listening...") {
                inputElem.placeholder = "Hearing you... say something!";
            }
        };
        
        // v10.7: Volume diagnostics (Log every ~1s to avoid spam)
        let lastVolLog = 0;
        // Search for onaudioend/onsoundend to be safe
        rec.onvolumechange = (e) => {
            // Volume is 0..1 scale
            const vol = Math.round(e.volume * 100);
            setMicVolume(vol); // Update UI state
            const now = Date.now();
            if (now - lastVolLog > 1500) {
                lastVolLog = now;
            }
        };

        rec.onresult = (event) => {
            let interimTranscript = '';
            let finalTranscript = '';
            let bestConfidence = 0;

            // v10.8: Standard loop (safe for non-continuous mode)
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                const result = event.results[i];
                const alternative = result[0];
                
                if (result.isFinal) {
                    finalTranscript += alternative.transcript;
                    bestConfidence = alternative.confidence;
                } else {
                    interimTranscript += alternative.transcript;
                }
            }

            if (finalTranscript || interimTranscript) {
                interimTranscriptRef.current = interimTranscript;
                setInterimText(interimTranscript); // v12.6.1: Update UI state
            }

            if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

            if (finalTranscript) {
                accumulatedTranscriptRef.current += (accumulatedTranscriptRef.current ? " " : "") + finalTranscript;
                
                // v12.1: Lowered Confidence Threshold (0.2) for better regional support
                if (bestConfidence < 0.2 && finalTranscript.length < 15) {
                    const placeholder = document.querySelector('.chat-footer input');
                    if (placeholder) placeholder.placeholder = `Low confidence (${Math.round(bestConfidence*100)}%) ignored...`;
                    return;
                }

                // v12.1: Increased silence timer (3.5s) for long-form talking
                silenceTimerRef.current = setTimeout(() => {
                    if (accumulatedTranscriptRef.current.trim()) {
                        processVoiceInput(accumulatedTranscriptRef.current.trim());
                    }
                }, 3500);

            } else if (interimTranscript) {
                const inputElem = document.querySelector('.chat-footer input');
                const display = (accumulatedTranscriptRef.current + " " + interimTranscript).trim();
                if (inputElem) inputElem.placeholder = display + "...";
                
                // v12.1: Increased interim timer (6s) to allow deep thought
                silenceTimerRef.current = setTimeout(() => {
                    const fullText = (accumulatedTranscriptRef.current + " " + interimTranscript).trim();
                    if (fullText) {
                        processVoiceInput(fullText);
                    }
                }, 6000); 
            }
        };

        rec.onerror = (event) => {
            if (event.error === 'not-allowed') {
                setModal({
                    show: true,
                    title: 'Mic Access Denied (HTTP)',
                    content: (
                        <div>
                            <p>Browsers <b>block</b> microphone editing on HTTP connections.</p>
                            <p style={{ marginTop: '10px' }}><b>Instructions:</b></p>
                            <div style={{ padding: '8px', backgroundColor: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '6px', fontSize: '0.8rem' }}>
                                <ol style={{ paddingLeft: '18px', margin: 0 }}>
                                    <li>Go to <code>chrome://flags/#unsafely-treat-insecure-origin-as-secure</code></li>
                                    <li>Paste: <code>{window.location.origin}</code> and <b>Enable</b>.</li>
                                    <li>Click <b>Relaunch</b>.</li>
                                </ol>
                            </div>
                        </div>
                    )
                });
            }
            setIsListening(false);
        };

        rec.onnomatch = () => {
            console.warn("Mic: NO MATCH FOUND");
        };

        rec.onend = () => {
            const fullText = (accumulatedTranscriptRef.current + " " + interimTranscriptRef.current).trim();
            
            // v12.2: Increased grace period to 1.5s for hardware release stability
            if (isListening && !isProcessingRef.current) {
                setMicVolume(0);
                setTimeout(() => {
                    try {
                        if (isListening) rec.start();
                    } catch (e) {
                        setupRecognition();
                    }
                }, 1500);
            } else {
                setIsListening(false);
                if (!isProcessingRef.current && fullText) {
                    processVoiceInput(fullText);
                }
                accumulatedTranscriptRef.current = '';
                interimTranscriptRef.current = '';
            }
        };

        recognition.current = rec;
    };

    useEffect(() => {
        if (SpeechRecognition) {
            setupRecognition();
        }
    }, [SpeechRecognition]);

    // v9.2 Internal helper for voice processing
    const processVoiceInput = (text) => {
        if (isProcessingRef.current) return;
        
        // v10.4: Clear silence timer immediately
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        
        isProcessingRef.current = true;
        
        setInput('');
        setIsListening(false);
        if (recognition.current) {
            try {
                recognition.current.stop();
            } catch (e) {
                console.warn("Mic: Stop failed (already stopped)", e);
            }
        }
        
        if (handleSendRef.current) {
            handleSendRef.current(text);
        }
        
        // Reset process lock after a short delay
        setTimeout(() => {
            isProcessingRef.current = false;
            interimTranscriptRef.current = '';
            accumulatedTranscriptRef.current = '';
        }, 500);
    };

    const startListening = () => {
        if (!recognition.current) {
            if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
                setModal({
                    show: true,
                    title: 'Mic Blocked by Browser (HTTP)',
                    content: (
                        <div>
                            <p>Browsers <b>block</b> microphone editing and hide the "Allow" button on <b>HTTP</b> connections.</p>
                            <p style={{ marginTop: '10px' }}><b>Only 2 things to do on that page:</b></p>
                            <div style={{ padding: '8px', backgroundColor: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '6px', fontSize: '0.8rem' }}>
                                <ol style={{ paddingLeft: '18px', margin: 0 }}>
                                    <li>In the <b>large text box</b>, paste: <code>{window.location.origin}</code></li>
                                    <li>Change the dropdown from <b>"Disabled"</b> to <b>"Enabled"</b>.</li>
                                    <li>Click <b>Relaunch</b> at the bottom.</li>
                                </ol>
                            </div>
                            <p style={{ marginTop: '10px', fontSize: '0.75rem' }}>
                                <b>URL to copy:</b><br/>
                                <code style={{ fontSize: '0.7rem', display: 'block', wordBreak: 'break-all', marginTop: '4px' }}>chrome://flags/#unsafely-treat-insecure-origin-as-secure</code>
                            </p>
                        </div>
                    )
                });
            } else {
                setModal({ show: true, title: 'Mic Error', content: 'Speech recognition is not supported or was blocked.' });
            }
            return;
        }
        if (isListening) {
            processVoiceInput((accumulatedTranscriptRef.current + " " + interimTranscriptRef.current).trim());
        } else {
            const currentLang = language === 'te' ? 'te-IN' : language === 'hi' ? 'hi-IN' : 'en-IN';
            
            // v10.6: Ensure a clean start by re-initializing if needed
            if (!recognition.current) setupRecognition();
            
            recognition.current.lang = currentLang;
            accumulatedTranscriptRef.current = '';
            interimTranscriptRef.current = '';
            
            try {
                recognition.current.start();
            } catch (e) {
                setupRecognition(); // Re-wire everything
                try {
                    recognition.current.lang = currentLang;
                    recognition.current.start();
                } catch (e2) {
                    setIsListening(false);
                }
            }
        }
    };



    const speak = (text, overrideLang = null) => {
        if (!isSpeakingEnabled || !window.speechSynthesis) return;
        
        // v7.0 Dual-Text Parsing
        let uiText = text;
        let speechFallback = "";
        
        if (text.includes(" ||| ")) {
            const parts = text.split(" ||| ");
            uiText = parts[0];
            speechFallback = parts[1];
        }

        const targetLang = overrideLang || language;

        // v8.1: Atomic Reset - ensure engine is unpaused before purging
        window.speechSynthesis.resume();
        if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
            window.speechSynthesis.cancel();
        }

        // v10.3: Mutex Increment MUST be outside the Timeout to prevent race conditions
        const myChainId = ++speakingChainIdRef.current;
        
        // v8.1: Increased yield (200ms) to ensure browser internal synthesis state resets
        setTimeout(() => {
            // v10.3: Double-check mutex after timeout (if another speak call happened during the 50ms wait)
            if (myChainId !== speakingChainIdRef.current) return;

            let cleanText = uiText.replace(/\[(.*?)\]\(.*?\)/g, '$1')
                               .replace(/\*\*/g, '')
                               .replace(/\*/g, '');
            
            if (PHONETIC_MAP[targetLang]) {
                Object.entries(PHONETIC_MAP[targetLang]).forEach(([eng, phonetic]) => {
                    const regex = new RegExp(`\\b${eng}\\b`, 'gi');
                    cleanText = cleanText.replace(regex, phonetic);
                });
            }

            // v11.4: Atomic TTS (Clean & Clear)
            // If we are using an English voice for Hindi/Telugu (Romanized fallback),
            // we must speak it as a SINGLE atomic unit. Chunking it causes "Echoes" (repetition).
            const voices = voicesRef.current.length > 0 ? voicesRef.current : window.speechSynthesis.getVoices();
            const langName = targetLang === 'te' ? 'telugu' : targetLang === 'hi' ? 'hindi' : 'english';
            const nativeVoices = voices.filter(v => 
                (v.lang.toLowerCase().includes(targetLang) || v.name.toLowerCase().includes(langName)) &&
                !['english', 'american', 'us', 'uk'].some(bad => v.name.toLowerCase().includes(bad) && !v.name.toLowerCase().includes(langName))
            );
            
            const useRomanAtomic = nativeVoices.length === 0 && speechFallback;

            if (useRomanAtomic) {
                startSpeaking(speechFallback, "", targetLang, 0);
                return;
            }

            // Otherwise, chunk native script normally for better flow
            const chunks = cleanText.split(/([.!?।॥\n]|\s{2,}|-\s)/).filter(c => c && c.trim().length > 0);
            
            const mergedChunks = [];
            let current = "";
            chunks.forEach(c => {
                if (c.trim() === '-' || (current.length + c.length) < 200) {
                    current += (current ? " " : "") + c;
                } else {
                    if (current) mergedChunks.push(current.trim());
                    current = c;
                }
            });
            if (current) mergedChunks.push(current.trim());

            let idx = 0;
            const processNext = () => {
                if (myChainId !== speakingChainIdRef.current) return;
                if (idx < mergedChunks.length) {
                    startSpeaking(mergedChunks[idx], speechFallback, targetLang, 0, () => {
                        idx++;
                        setTimeout(processNext, 100); // 100ms gap for natural flow
                    });
                }
            };
            processNext();
        }, 50);
    };

    const startSpeaking = (cleanText, speechFallback, targetLang, attempts = 0, onChunkEnd = null) => {
        const langName = targetLang === 'te' ? 'telugu' : targetLang === 'hi' ? 'hindi' : 'english';
        const voices = voicesRef.current.length > 0 ? voicesRef.current : window.speechSynthesis.getVoices();
        
        if (voices.length === 0 && attempts < 10) {
            setTimeout(() => startSpeaking(cleanText, speechFallback, targetLang, attempts + 1, onChunkEnd), 100);
            return;
        }
            
            let selectedVoice = null;
            const hasUnicode = /[^\u0000-\u007F]/.test(cleanText);

            const nativeVoices = voices.filter(v => 
                (v.lang.toLowerCase().includes(targetLang) || v.name.toLowerCase().includes(langName)) &&
                !['english', 'american', 'us', 'uk', 'david', 'mark', 'zira', 'amy'].some(bad => 
                    v.name.toLowerCase().includes(bad) && !v.name.toLowerCase().includes(langName)
                )
            );

            const indianEnglishVoices = voices.filter(v => 
                v.lang.toLowerCase() === 'en-in' || 
                (v.name.toLowerCase().includes('india') && v.lang.toLowerCase().startsWith('en'))
            );

            if (nativeVoices.length > 0) {
                // v7.8: Prioritize "Local" or "Google" over "Natural" (Edge Online) for zero-latency
                selectedVoice = nativeVoices.find(v => !v.name.toLowerCase().includes('online') && !v.name.toLowerCase().includes('natural')) ||
                                 nativeVoices.find(v => v.name.toLowerCase().includes('google')) ||
                                 nativeVoices.find(v => v.name.toLowerCase().includes('microsoft')) ||
                                 nativeVoices[0];
            } else if (indianEnglishVoices.length > 0) {
                selectedVoice = indianEnglishVoices.find(v => v.name.toLowerCase().includes('online')) || 
                                 indianEnglishVoices.find(v => v.name.toLowerCase().includes('priya')) || 
                                 indianEnglishVoices[0];
            }

            if (!selectedVoice) {
                selectedVoice = voices.find(v => v.lang.toLowerCase().includes(targetLang)) || voices[0];
            }

            let finalOutput = cleanText;
            const isEnglishVoice = selectedVoice?.lang?.toLowerCase()?.startsWith('en');
            const isNativeVoice = !isEnglishVoice;

            // CRITICAL v7.0: If using English voice and we have Romanized fallback, USE IT!
            if (isEnglishVoice && speechFallback) {
                finalOutput = speechFallback;
            } else if (isEnglishVoice && hasUnicode) {
                finalOutput = cleanText.replace(/[^\u0000-\u007F]/g, ' ').replace(/\s+/g, ' ').trim();
            }

            if (!finalOutput) return;

            const utterance = new SpeechSynthesisUtterance(finalOutput);
            utterance.voice = selectedVoice;
            utterance.lang = selectedVoice.lang;
            utterance.rate = 1.0;
            utterance.pitch = 1.0;
            utterance.volume = 1.0;

            window.speechSynthesis.resume();
            // v8.2: Balanced Calibration (0.80) for natural flow
            utterance.rate = 0.80; 
            utterance.pitch = 1.0;
            utterance.volume = 1.0;

            utterance.onstart = () => window.speechSynthesis.resume();
            utterance.onend = () => { 
                utteranceRef.current = null; 
                if (onChunkEnd) onChunkEnd();
            };
            utterance.onerror = (e) => {
                utteranceRef.current = null;
                
                // v11.6: Continuer - If current chunk fails, move to next!
                // Prevent the whole sequence from stopping in the middle.
                if (onChunkEnd) onChunkEnd();

                // v7.1: Synthesis-failed specific fallback logic
                if (e.error === 'synthesis-failed' && speechFallback && !isEnglishVoice) {
                    const retryUtterance = new SpeechSynthesisUtterance(speechFallback);
                    const fallbackVoice = indianEnglishVoices[0] || voices[0];
                    retryUtterance.voice = fallbackVoice;
                    retryUtterance.lang = fallbackVoice.lang;
                    retryUtterance.rate = 0.80; 
                    window.speechSynthesis.speak(retryUtterance);
                }
            };
        window.speechSynthesis.speak(utterance);
    };


    useEffect(() => {
        const handleOpenEvent = () => setIsOpen(true);
        window.addEventListener('open-tgs-chat', handleOpenEvent);
        
        const loadVoices = () => {
            const voices = window.speechSynthesis.getVoices();
        };

        window.speechSynthesis.onvoiceschanged = loadVoices;
        loadVoices();
        
        if (!sessionStorage.getItem('tgs_chat_session')) {
            sessionStorage.setItem('tgs_chat_session', sessionId);
        }
        
        // Initial greeting or language switch update
        if (messages.length === 0 || (messages.length === 1 && messages[0].sender === 'bot')) {
            const greeting = language === 'hi' 
                ? 'नमस्ते! मैं आपका TGS सहायक हूँ। मैं आज आपकी क्या मदद कर सकता हूँ?' 
                : language === 'te' 
                ? 'నమస్కారం! నేను మీ TGS అసిస్టెంట్ని. ఈరోజు నేను మీకు ఏ విధంగా సహాయపడగలను?' 
                : 'Hi! I am your TGS Assistant. How can I help you today?';
            
            setMessages([{ sender: 'bot', text: greeting, time: new Date() }]);
        }

        return () => window.removeEventListener('open-tgs-chat', handleOpenEvent);
    }, [sessionId, messages.length, language]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isOpen]);

    const handleSend = async (forcedText = null) => {
        const textToSend = forcedText || input;
        if (!textToSend.trim() || isLoading) return;

        const userMsg = textToSend.trim();
        setInput('');
        setMessages(prev => [...prev, { sender: 'user', text: userMsg, time: new Date() }]);
        setIsLoading(true);

        try {
            const response = await api.post('/api/bot/chat/message/', {
                message: userMsg,
                session_id: sessionId,
                language: language
            });
            
            const botReply = response.data.reply;
            const newLanguage = response.data.language;
            const detectedLang = response.data.detected_language;
            
            // v8.0: 100ms yield ensures React finishes DOM update before Speech Engine takes over
            setTimeout(() => speak(botReply, newLanguage), 100);
            
            if (newLanguage && newLanguage !== language) {
                setLanguage(newLanguage);
            }
            
            setMessages(prev => [...prev, { 
                sender: 'bot', 
                text: botReply, 
                time: new Date(),
                detectedLang: detectedLang // v12.5
            }]);
        } catch (error) {
            
            // v7.9: Handle Session Expiry (401) with SPA redirect
            if (error.response && error.response.status === 401) {
                setModal({
                    show: true,
                    title: 'Session Expired',
                    content: 'Your session has timed out. Clicking "Got it" will take you to the login page.'
                });
                // Capture the redirect in the modal button close logic or a separate timer
                setTimeout(() => {
                    window.location.href = '/login'; 
                }, 4000); // 4 second delay to allow reading
                return;
            }

            setMessages(prev => [...prev, { 
                sender: 'bot', 
                text: "I'm having trouble connecting. Please try again later.", 
                time: new Date() 
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    // Sync refs with state to avoid stale closures in recognition (v9.1: Fixed TDZ)
    useEffect(() => {
        handleSendRef.current = handleSend;
    }, [handleSend]);

    useEffect(() => {
        languageRef.current = language;
    }, [language]);

    // Unified handleSend to ensure it's always stable
    const onSend = async () => {
        await handleSend();
    };

    // Parse markdown-style links [Label](/path) into clickable elements
    const renderMessage = (text, sender) => {
        if (!text) return null;
        
        // v7.0: Hide Romanized speech fallback from UI
        let displayContent = text;
        if (text.includes(" ||| ")) {
            displayContent = text.split(" ||| ")[0];
        }

        const parts = displayContent.split(/(\[.*?\]\(.*?\))/g);
        
        return parts.map((part, i) => {
            const linkMatch = part.match(/\[(.*?)\]\((.*?)\)/);
            if (linkMatch) {
                const [_, label, path] = linkMatch;
                return (
                    <span 
                        key={i} 
                        onClick={() => {
                            if (path.startsWith('http')) {
                                window.open(path, '_blank');
                            } else {
                                navigate(path);
                                // Bot no longer closes automatically on navigation
                            }
                        }}
                        style={{ 
                            color: sender === 'user' ? '#fff' : '#0056b3',
                            backgroundColor: sender === 'user' ? 'rgba(255,255,255,0.2)' : '#e0e7ff',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            textDecoration: 'none',
                            cursor: 'pointer',
                            fontWeight: '600',
                            display: 'inline-block',
                            margin: '1px 2px',
                            transition: 'all 0.2s',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                        }}
                    >
                        {label}
                    </span>
                );
            }
            
            const boldParts = part.split(/(\*\*.*?\*\*)/g);
            return boldParts.map((bPart, j) => {
                const boldMatch = bPart.match(/\*\*(.*?)\*\*/);
                if (boldMatch) {
                    return <strong key={`${i}-${j}`}>{boldMatch[1]}</strong>;
                }
                return bPart;
            });
        });
    };


    return (
        <div className="support-bot-container" style={{ position: 'fixed', bottom: '30px', right: '30px', zIndex: 9999 }}>
            {!isOpen ? (
                <button 
                    onClick={() => setIsOpen(true)}
                    className="chat-toggle-btn"
                    style={{
                        width: '60px',
                        height: '60px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--bg-navbar)',
                        color: 'white',
                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: 'none',
                        cursor: 'pointer',
                        transition: 'transform 0.3s ease'
                    }}
                >
                    <MessageCircle size={28} />
                </button>
            ) : (
                <div className="chat-window" style={{
                    width: '380px',
                    height: '500px',
                    backgroundColor: 'white',
                    borderRadius: '20px',
                    boxShadow: '0 20px 50px rgba(0,0,0,0.2)',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    border: '1px solid rgba(0,0,0,0.1)'
                }}>
                    <div className="chat-header" style={{
                        padding: '1.25rem',
                        backgroundColor: 'var(--bg-navbar)',
                        color: 'white',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ width: '32px', height: '32px', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <MessageCircle size={18} />
                            </div>
                            <div>
                                <h4 style={{ margin: 0, fontSize: '1rem' }}>TGS Assistant</h4>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                    <span style={{ fontSize: '0.7rem', opacity: 0.8 }}>Online for help</span>
                                    <span style={{ fontSize: '0.6rem', backgroundColor: 'rgba(255,255,255,0.2)', padding: '1px 4px', borderRadius: '3px' }}>v12.5 Precision</span>
                                </div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <button 
                                onClick={() => setIsSpeakingEnabled(!isSpeakingEnabled)}
                                style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', opacity: isSpeakingEnabled ? 1 : 0.5 }}
                                title={isSpeakingEnabled ? "Disable Voice" : "Enable Voice"}
                            >
                                {isSpeakingEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
                            </button>
                            <button 
                                onClick={() => {
                                    setIsOpen(false);
                                    if (window.speechSynthesis) window.speechSynthesis.cancel();
                                }} 
                                style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}
                            >
                                <X size={20} />
                            </button>
                        </div>
                    </div>

                    {/* Language Selector Bar */}
                    <div className="language-selector" style={{
                        display: 'flex',
                        padding: '8px 16px',
                        backgroundColor: '#f1f5f9',
                        gap: '10px',
                        borderBottom: '1px solid #e2e8f0'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: '600', color: '#64748b' }}>
                            <Languages size={14} /> Language:
                        </div>
                        {['en', 'hi', 'te'].map((lang) => (
                            <button
                                key={lang}
                                onClick={() => setLanguage(lang)}
                                style={{
                                    padding: '2px 8px',
                                    borderRadius: '12px',
                                    fontSize: '0.75rem',
                                    border: 'none',
                                    cursor: 'pointer',
                                    backgroundColor: language === lang ? 'var(--primary)' : 'white',
                                    color: language === lang ? 'white' : '#64748b',
                                    fontWeight: language === lang ? '600' : '400',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                                }}
                            >
                                {lang === 'en' ? 'English' : lang === 'hi' ? 'Hindi' : 'Telugu'}
                            </button>
                        ))}
                        <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontStyle: 'italic', display: 'flex', alignItems: 'center' }}>
                            (Auto-detects language)
                        </div>
                    </div>

                    <div className="chat-body" ref={scrollRef} style={{
                        flex: 1,
                        padding: '1.25rem',
                        overflowY: 'auto',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                        backgroundColor: '#f8fafc'
                    }}>
                        {messages.map((msg, idx) => (
                            <div key={idx} style={{
                                alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                                maxWidth: '85%',
                                padding: '10px 14px',
                                borderRadius: msg.sender === 'user' ? '18px 18px 2px 18px' : '18px 18px 18px 2px',
                                backgroundColor: msg.sender === 'user' ? 'var(--primary)' : 'white',
                                color: msg.sender === 'user' ? 'white' : 'var(--text-main)',
                                boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
                                fontSize: '0.9rem',
                                lineHeight: '1.4',
                                whiteSpace: 'pre-wrap',
                                position: 'relative'
                            }}>
                                {msg.detectedLang && msg.detectedLang !== 'en' && (
                                    <div style={{ 
                                        position: 'absolute', 
                                        top: '-15px', 
                                        [msg.sender === 'user' ? 'right' : 'left']: '5px',
                                        fontSize: '0.65rem',
                                        color: '#94a3b8',
                                        fontWeight: '600',
                                        backgroundColor: '#f1f5f9',
                                        padding: '1px 4px',
                                        borderRadius: '3px',
                                        border: '1px solid #e2e8f0'
                                    }}>
                                        {msg.detectedLang === 'hi' ? 'Hindi' : 'Telugu'}
                                    </div>
                                )}
                                {renderMessage(msg.text, msg.sender)}
                            </div>
                        ))}
                        {isListening && (
                            <div style={{ 
                                alignSelf: 'flex-end', 
                                backgroundColor: 'rgba(187, 6, 51, 0.05)',
                                color: '#94a3b8',
                                padding: '8px 12px',
                                borderRadius: '14px 14px 2px 14px',
                                fontSize: '0.8rem',
                                fontStyle: 'italic',
                                border: '1px dashed #ef4444'
                            }}>
                                Hearing: {interimText || '...'}
                            </div>
                        )}
                        {isLoading && (
                            <div style={{ alignSelf: 'flex-start', padding: '10px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                                Assistant is typing...
                            </div>
                        )}
                    </div>

                    <div className="chat-footer" style={{ padding: '1rem', borderTop: '1px solid #eee' }}>
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                            <input 
                                type="text"
                                placeholder={isListening ? "Listening..." : "Type your question..."}
                                value={isListening ? '' : input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && onSend()}
                                disabled={isListening}
                                style={{
                                    width: '100%',
                                    padding: '0.75rem 3rem 0.75rem 1rem',
                                    borderRadius: '12px',
                                    border: '1.5px solid #e2e8f0',
                                    outline: 'none',
                                    fontSize: '0.9rem',
                                    backgroundColor: isListening ? '#f8fafc' : 'white',
                                    color: isListening ? '#94a3b8' : 'inherit'
                                }}
                            />
                            <button 
                                onClick={startListening}
                                style={{
                                    position: 'absolute',
                                    right: '48px',
                                    backgroundColor: isListening ? '#fef2f2' : 'transparent',
                                    color: isListening ? '#ef4444' : '#94a3b8',
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    border: isListening ? '1px solid #fee2e2' : 'none'
                                }}
                                title="Voice Input"
                            >
                                {isListening ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                                        {/* v12.2: Dynamic Volume Waves */}
                                        <div className="mic-wave" style={{ 
                                            width: '32px', height: '32px', position: 'absolute', top: 0, left: 0, 
                                            backgroundColor: '#ef4444', borderRadius: '50%', opacity: 0.1 + (micVolume / 200),
                                            transform: `scale(${1 + (micVolume / 100)})`, transition: 'transform 0.1s'
                                        }}></div>
                                        <div className="mic-wave" style={{ width: '3px', height: `${8 + (micVolume/4)}px`, backgroundColor: '#ef4444', borderRadius: '2px', transition: 'height 0.1s' }}></div>
                                        <div className="mic-wave" style={{ width: '3px', height: `${14 + (micVolume/2)}px`, backgroundColor: '#ef4444', borderRadius: '2px', transition: 'height 0.1s' }}></div>
                                        <div className="mic-wave" style={{ width: '3px', height: `${8 + (micVolume/4)}px`, backgroundColor: '#ef4444', borderRadius: '2px', transition: 'height 0.1s' }}></div>
                                    </div>
                                ) : (
                                    <Mic size={18} />
                                )}
                            </button>
                            <button 
                                onClick={() => handleSend()}
                                style={{
                                    position: 'absolute',
                                    right: '8px',
                                    backgroundColor: 'var(--primary)',
                                    color: 'white',
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '8px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    border: 'none',
                                    cursor: 'pointer'
                                }}
                            >
                                <Send size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* v8.2: Custom Integrated Modal Overlay */}
            {modal.show && (
                <div style={{
                    position: 'absolute',
                    top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                    borderRadius: '15px'
                }}>
                    <div style={{
                        backgroundColor: 'white',
                        padding: '20px',
                        borderRadius: '12px',
                        width: '85%',
                        maxWidth: '300px',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                        animation: 'modalFadeIn 0.3s ease-out'
                    }}>
                        <h5 style={{ margin: '0 0 10px 0', color: 'var(--primary)', fontSize: '1.1rem' }}>{modal.title}</h5>
                        <div style={{ fontSize: '0.85rem', color: '#4b5563', lineHeight: '1.4' }}>
                            {modal.content}
                        </div>
                        <button 
                            onClick={() => setModal({ ...modal, show: false })}
                            style={{
                                marginTop: '15px',
                                width: '100%',
                                padding: '8px',
                                backgroundColor: 'var(--primary)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontWeight: '500'
                            }}
                        >
                            Got it
                        </button>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes modalFadeIn {
                    from { opacity: 0; transform: scale(0.95); }
                    to { opacity: 1; transform: scale(1); }
                }
            `}</style>
        </div>
    );
};

export default SupportBot;
