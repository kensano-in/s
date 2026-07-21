'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { Search, Globe, Plus, AlertCircle, Check, X, ShieldAlert } from 'lucide-react';
import clsx from 'clsx';

// Local backup seed for pronouns across multiple languages to support instant loading
// and resilient offline/migration-pending fallback.
const LOCAL_PRONOUNS_SEED = [
  // English
  { code: 'en', lang: 'English', text: 'he / him', normalized: 'he/him' },
  { code: 'en', lang: 'English', text: 'she / her', normalized: 'she/her' },
  { code: 'en', lang: 'English', text: 'they / them', normalized: 'they/them' },
  { code: 'en', lang: 'English', text: 'he / they', normalized: 'he/they' },
  { code: 'en', lang: 'English', text: 'she / they', normalized: 'she/they' },
  { code: 'en', lang: 'English', text: 'ze / zir', normalized: 'ze/zir' },
  { code: 'en', lang: 'English', text: 'xe / xem', normalized: 'xe/xem' },
  // Spanish
  { code: 'es', lang: 'Spanish', text: 'él / él', normalized: 'el/el' },
  { code: 'es', lang: 'Spanish', text: 'ella / ella', normalized: 'ella/ella' },
  { code: 'es', lang: 'Spanish', text: 'elle / elle', normalized: 'elle/elle' },
  { code: 'es', lang: 'Spanish', text: 'él / ellos', normalized: 'el/ellos' },
  { code: 'es', lang: 'Spanish', text: 'ella / ellas', normalized: 'ella/ellas' },
  // Portuguese
  { code: 'pt', lang: 'Portuguese', text: 'ele / dele', normalized: 'ele/dele' },
  { code: 'pt', lang: 'Portuguese', text: 'ela / dela', normalized: 'ela/dela' },
  { code: 'pt', lang: 'Portuguese', text: 'elu / delu', normalized: 'elu/delu' },
  // French
  { code: 'fr', lang: 'French', text: 'il / lui', normalized: 'il/lui' },
  { code: 'fr', lang: 'French', text: 'elle / la', normalized: 'elle/la' },
  { code: 'fr', lang: 'French', text: 'iel / iel', normalized: 'iel/iel' },
  // German
  { code: 'de', lang: 'German', text: 'er / ihn', normalized: 'er/ihn' },
  { code: 'de', lang: 'German', text: 'sie / ihr', normalized: 'sie/ihr' },
  { code: 'de', lang: 'German', text: 'dey / dem', normalized: 'dey/dem' },
  // Italian
  { code: 'it', lang: 'Italian', text: 'lui / lui', normalized: 'lui/lui' },
  { code: 'it', lang: 'Italian', text: 'lei / lei', normalized: 'lei/lei' },
  // Dutch
  { code: 'nl', lang: 'Dutch', text: 'hij / hem', normalized: 'hij/hem' },
  { code: 'nl', lang: 'Dutch', text: 'zij / haar', normalized: 'zij/haar' },
  { code: 'nl', lang: 'Dutch', text: 'hen / hun', normalized: 'hen/hun' },
  // Swedish
  { code: 'sv', lang: 'Swedish', text: 'han / honom', normalized: 'han/honom' },
  { code: 'sv', lang: 'Swedish', text: 'hon / henne', normalized: 'hon/henne' },
  { code: 'sv', lang: 'Swedish', text: 'hen / hens', normalized: 'hen/hens' },
  // Norwegian
  { code: 'no', lang: 'Norwegian', text: 'han / ham', normalized: 'han/ham' },
  { code: 'no', lang: 'Norwegian', text: 'hun / henne', normalized: 'hun/henne' },
  { code: 'no', lang: 'Norwegian', text: 'hen / hens', normalized: 'hen/hens' },
  // Danish
  { code: 'da', lang: 'Danish', text: 'han / ham', normalized: 'han/ham' },
  { code: 'da', lang: 'Danish', text: 'hun / hende', normalized: 'hun/hende' },
  // Finnish
  { code: 'fi', lang: 'Finnish', text: 'hän / hänen', normalized: 'han/hanen' },
  // Middle East
  { code: 'ar', lang: 'Arabic', text: 'هو / له', normalized: 'huwa/lahu' },
  { code: 'ar', lang: 'Arabic', text: 'هي / لها', normalized: 'hiya/laha' },
  { code: 'fa', lang: 'Persian/Farsi', text: 'او / او', normalized: 'oo/oo' },
  { code: 'tr', lang: 'Turkish', text: 'o / onu', normalized: 'o/onu' },
  { code: 'he', lang: 'Hebrew', text: 'הוא / לו', normalized: 'hu/lo' },
  { code: 'he', lang: 'Hebrew', text: 'היא / לה', normalized: 'hi/lah' },
  { code: 'ur', lang: 'Urdu', text: 'وہ / اس', normalized: 'woh/us' },
  // Asian
  { code: 'hi', lang: 'Hindi', text: 'वह / उसका', normalized: 'vah/uska' },
  { code: 'hi', lang: 'Hindi', text: 'वे / उनका', normalized: 've/unka' },
  { code: 'bn', lang: 'Bengali', text: 'সে / তার', normalized: 'se/tar' },
  { code: 'ta', lang: 'Tamil', text: 'அவர் / அவரது', normalized: 'avar/avarathu' },
  { code: 'te', lang: 'Telugu', text: 'அतनू / ఆమె', normalized: 'athanu/aame' },
  { code: 'ml', lang: 'Malayalam', text: 'അവൻ / അവൾ', normalized: 'avan/aval' },
  { code: 'kn', lang: 'Kannada', text: 'അവനു / ಅವಳು', normalized: 'avanu/avalu' },
  { code: 'mr', lang: 'Marathi', text: 'तो / ती', normalized: 'to/ti' },
  { code: 'pa', lang: 'Punjabi', text: 'ਉਹ / ਉਹਨਾਂ', normalized: 'oh/ohna' },
  { code: 'gu', lang: 'Gujarati', text: 'તે / તેણી', normalized: 'te/teni' },
  { code: 'id', lang: 'Indonesian', text: 'dia / mereka', normalized: 'dia/mereka' },
  { code: 'ms', lang: 'Malay', text: 'dia / mereka', normalized: 'dia/mereka' },
  { code: 'th', lang: 'Thai', text: 'เขา / เธอ', normalized: 'khao/thoe' },
  { code: 'vi', lang: 'Vietnamese', text: 'anh / chị', normalized: 'anh/chi' },
  { code: 'ko', lang: 'Korean', text: '그 / 그녀', normalized: 'geu/geunyeo' },
  { code: 'ja', lang: 'Japanese', text: '彼 / 彼女', normalized: 'kare/kanojo' },
  { code: 'zh_CN', lang: 'Chinese Simplified', text: '他 / 他', normalized: 'ta/ta' },
  { code: 'zh_CN', lang: 'Chinese Simplified', text: '她 / 她', normalized: 'ta/ta' },
  { code: 'zh_TW', lang: 'Chinese Traditional', text: '他 / 他', normalized: 'ta/ta' },
  { code: 'zh_TW', lang: 'Chinese Traditional', text: '她 / 她', normalized: 'ta/ta' },
  // European
  { code: 'pl', lang: 'Polish', text: 'on / jego', normalized: 'on/jego' },
  { code: 'pl', lang: 'Polish', text: 'ona / jej', normalized: 'ona/jej' },
  { code: 'cs', lang: 'Czech', text: 'on / jeho', normalized: 'on/jeho' },
  { code: 'sk', lang: 'Slovak', text: 'on / jeho', normalized: 'on/jeho' },
  { code: 'ro', lang: 'Romanian', text: 'el / lui', normalized: 'el/lui' },
  { code: 'hu', lang: 'Hungarian', text: 'ő / őt', normalized: 'o/ot' },
  { code: 'uk', lang: 'Ukrainian', text: 'він / його', normalized: 'vin/yoho' },
  { code: 'uk', lang: 'Ukrainian', text: 'вона / її', normalized: 'vona/yiyi' },
  { code: 'ru', lang: 'Russian', text: 'он / его', normalized: 'on/yego' },
  { code: 'ru', lang: 'Russian', text: 'она / её', normalized: 'ona/yeye' },
  { code: 'el', lang: 'Greek', text: 'αυτός / αυτόν', normalized: 'aftos/afton' },
  // Other
  { code: 'sw', lang: 'Swahili', text: 'yeye / wao', normalized: 'yeye/wao' },
  { code: 'tl', lang: 'Filipino', text: 'siya / sila', normalized: 'siya/sila' },
  { code: 'af', lang: 'Afrikaans', text: 'hy / hom', normalized: 'hy/hom' },
  { code: 'is', lang: 'Icelandic', text: 'hann / hann', normalized: 'hann/hann' },
  { code: 'eo', lang: 'Esperanto', text: 'li / li', normalized: 'li/li' }
];

// Profiling local languages lists
const LANGUAGES = [
  { code: 'all', name: '🌍 All Languages' },
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Español' },
  { code: 'pt', name: 'Português' },
  { code: 'fr', name: 'Français' },
  { code: 'de', name: 'Deutsch' },
  { code: 'it', name: 'Italiano' },
  { code: 'nl', name: 'Nederlands' },
  { code: 'sv', name: 'Svenska' },
  { code: 'no', name: 'Norsk' },
  { code: 'da', name: 'Dansk' },
  { code: 'fi', name: 'Suomi' },
  { code: 'ar', name: 'العربية' },
  { code: 'he', name: 'עברית' },
  { code: 'hi', name: 'हिन्दी' },
  { code: 'ja', name: '日本語' },
  { code: 'zh_CN', name: '简体中文' }
];

// Profanity list for pronoun verification
const PROFANITY_BLOCKLIST = ['fuck', 'shit', 'ass', 'bitch', 'cunt', 'nigger', 'faggot', 'kill', 'hate', 'trash', 'dumb'];

interface PronounSelectorProps {
  value: string;
  onChange: (newValue: string) => void;
}

export function PronounSelector({ value, onChange }: PronounSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('all');
  const [customInput, setCustomInput] = useState('');
  const [customError, setCustomError] = useState<string | null>(null);
  
  // Parse incoming values (separated by commas or slashes)
  const currentSelections = useMemo(() => {
    if (!value) return [];
    return value.split(',').map(s => s.trim()).filter(Boolean);
  }, [value]);

  // Handle addition of a pronoun
  const handleSelect = (pronounText: string) => {
    const cleaned = pronounText.trim();
    if (currentSelections.includes(cleaned)) {
      // Toggle off if already selected
      const updated = currentSelections.filter(s => s !== cleaned);
      onChange(updated.join(', '));
      return;
    }

    if (currentSelections.length >= 4) {
      // Limit to 4 selections (Instagram standard)
      return;
    }

    const updated = [...currentSelections, cleaned];
    onChange(updated.join(', '));
  };

  const handleRemove = (pronounText: string) => {
    const updated = currentSelections.filter(s => s !== pronounText);
    onChange(updated.join(', '));
  };

  // Fuzzy search filter with language separation
  const filteredPronouns = useMemo(() => {
    let result = LOCAL_PRONOUNS_SEED;
    
    if (selectedLanguage !== 'all') {
      result = result.filter(p => p.code === selectedLanguage);
    }

    const cleanQuery = searchQuery.toLowerCase().trim();
    if (cleanQuery) {
      result = result.filter(p => 
        p.text.toLowerCase().includes(cleanQuery) || 
        p.normalized.toLowerCase().includes(cleanQuery) ||
        p.lang.toLowerCase().includes(cleanQuery)
      );
    }

    return result;
  }, [searchQuery, selectedLanguage]);

  // Unicode spoof / homoglyph checker (mixed scripts validation)
  const validateUnicodeScript = (text: string): boolean => {
    const scripts = {
      latin: /[a-zA-Z]/,
      cyrillic: /[\u0400-\u04FF]/,
      greek: /[\u0370-\u03FF]/,
      arabic: /[\u0600-\u06FF]/,
      hebrew: /[\u0590-\u05FF]/,
      devanagari: /[\u0900-\u097F]/,
      cjk: /[\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]/,
    };
    
    let detectedScriptsCount = 0;
    for (const regex of Object.values(scripts)) {
      if (regex.test(text)) {
        detectedScriptsCount++;
      }
    }
    
    // If text contains mixed character scripts, return false (potential spoofing/homoglyph attack)
    return detectedScriptsCount <= 1;
  };

  const handleAddCustom = () => {
    setCustomError(null);
    const cleaned = customInput.trim().toLowerCase();
    
    if (!cleaned) return;
    
    // Validations
    if (cleaned.length > 20) {
      setCustomError('Max length is 20 characters.');
      return;
    }

    // profanity
    const containsProfanity = PROFANITY_BLOCKLIST.some(word => cleaned.includes(word));
    if (containsProfanity) {
      setCustomError('Identity phrase matches safety filter.');
      return;
    }

    // unicode spoofing
    if (!validateUnicodeScript(customInput)) {
      setCustomError('Script anomaly: mixed character sets are blocklisted.');
      return;
    }

    // character validation (allow simple slash/comma spaces for pronoun combinations)
    const allowedRegex = /^[a-zA-Z\s\/\u0400-\u04FF\u0370-\u03FF\u0600-\u06FF\u0590-\u05FF\u0900-\u097F\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af,]+$/;
    if (!allowedRegex.test(customInput)) {
      setCustomError('Invalid character markers. Avoid special symbols.');
      return;
    }

    // Add to selection
    if (currentSelections.includes(customInput)) {
      setCustomError('Already selected.');
      return;
    }

    if (currentSelections.length >= 4) {
      setCustomError('You can select a maximum of 4 pronouns.');
      return;
    }

    onChange([...currentSelections, customInput].join(', '));
    setCustomInput('');
  };

  return (
    <div className="w-full space-y-4">
      {/* Selected Chips Area */}
      <div className="flex flex-wrap gap-2 min-h-[36px] items-center p-2 bg-[#0C0C0C] border border-white/5 rounded-2xl">
        {currentSelections.length === 0 ? (
          <span className="text-[12px] text-neutral-600 px-2">No pronouns selected (Maximum of 4)</span>
        ) : (
          currentSelections.map((pronoun) => (
            <div 
              key={pronoun}
              className="flex items-center gap-1.5 px-3 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[11.5px] font-bold rounded-lg"
            >
              <span>{pronoun}</span>
              <button 
                type="button" 
                onClick={() => handleRemove(pronoun)}
                className="hover:text-blue-200 transition-colors p-0.5"
                aria-label={`Remove pronoun ${pronoun}`}
              >
                <X size={12} strokeWidth={2.5} />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Sticky Search bar & Custom Pronoun Quick Creator */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Multilingual Fuzzy Search Input */}
        <div className="relative">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
          <input
            type="text"
            placeholder="Search pronouns..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-[#141414] border border-white/5 hover:border-white/10 focus:border-blue-500/50 rounded-xl text-[12.5px] text-neutral-200 focus:outline-none placeholder-neutral-600 transition-all"
            aria-label="Search pronouns"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Custom Pronoun Form */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Create custom (e.g. xe / xem)..."
              value={customInput}
              onChange={(e) => {
                setCustomInput(e.target.value);
                setCustomError(null);
              }}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCustom())}
              className={clsx(
                "w-full px-4 py-2.5 bg-[#141414] border rounded-xl text-[12.5px] focus:outline-none placeholder-neutral-600 transition-all",
                customError ? "border-red-500/50 focus:border-red-500" : "border-white/5 focus:border-blue-500/50 text-neutral-200"
              )}
              aria-label="Create custom pronoun"
            />
            {customError && (
              <span className="absolute -bottom-5 left-1 text-[9px] font-bold text-red-400 flex items-center gap-1">
                <AlertCircle size={10} />
                {customError}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={handleAddCustom}
            className="px-3 bg-neutral-900 border border-white/5 hover:border-white/10 active:scale-95 text-[12.5px] font-bold text-white rounded-xl flex items-center gap-1.5 transition-all"
          >
            <Plus size={14} />
            Add
          </button>
        </div>
      </div>

      {/* Language filter scroll tab list */}
      <div className="w-full overflow-x-auto scrollbar-none py-1">
        <div className="flex gap-1.5 pb-1">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              type="button"
              onClick={() => setSelectedLanguage(lang.code)}
              className={clsx(
                "px-3.5 py-1.5 rounded-lg text-[11px] font-bold tracking-wide whitespace-nowrap transition-all border shrink-0",
                selectedLanguage === lang.code
                  ? "bg-blue-600 border-blue-600 text-white"
                  : "bg-neutral-950 border-white/5 text-neutral-400 hover:border-white/10 hover:text-white"
              )}
            >
              {lang.name}
            </button>
          ))}
        </div>
      </div>

      {/* Standard Pronouns Suggestion Grid (Virtualized height fallback style) */}
      <div className="max-h-[160px] overflow-y-auto page-scroll border border-white/5 rounded-2xl bg-[#080808]">
        {filteredPronouns.length === 0 ? (
          <div className="p-8 text-center text-[12.5px] text-neutral-600 italic">
            No standard matches. Use the input field above to configure your custom pronouns.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 p-3">
            {filteredPronouns.map((item) => {
              const isSelected = currentSelections.includes(item.text);
              return (
                <button
                  key={`${item.code}-${item.text}`}
                  type="button"
                  onClick={() => handleSelect(item.text)}
                  className={clsx(
                    "flex items-center justify-between px-3 py-2.5 rounded-xl text-[12px] font-semibold text-left transition-all border select-none",
                    isSelected
                      ? "bg-blue-500/10 border-blue-500/30 text-blue-400 font-bold"
                      : "bg-[#0E0E0E] border-white/5 hover:border-white/10 text-neutral-400 hover:text-white"
                  )}
                >
                  <span className="truncate">{item.text}</span>
                  {isSelected ? (
                    <Check size={12} className="text-blue-400 shrink-0 ml-1.5" strokeWidth={3} />
                  ) : (
                    <span className="text-[9px] uppercase font-bold text-neutral-600 tracking-wider font-mono shrink-0 ml-1.5">{item.code}</span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
