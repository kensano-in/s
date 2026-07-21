'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useAppStore } from '@/lib/store';
import { 
  X, Camera, Loader2, Check, Shield, AtSign, AlignLeft, Lock, Globe, 
  AlertCircle, Clock, ShieldAlert, Image, MapPin, Briefcase, GraduationCap, 
  Link2, Smile, Hash, Calendar, ChevronDown, UserCheck, Users, EyeOff, BookOpen, Award, Sparkles, Plus, Trash2
} from 'lucide-react';
import { uploadMedia } from '@/app/(main)/feed/upload';
import { motion, AnimatePresence } from 'framer-motion';
import { BadgeType, BADGE_CONFIG } from '@/components/ui/IdentityBadge';
import { 
  checkUsernameChangeEligibility, 
  quickCheckUsername,
  validateUsernameForProfile, 
  submitProfileUpdateDB, 
  getDatabaseProfile,
  checkDisplayNameEligibility,
  getProfileMilestones,
  addCustomMilestone,
  deleteCustomMilestone
} from '@/app/(main)/profile/actionsCore';
import { getAvatarUrl } from '@/lib/utils';
import { parseBio, serializeBio, STATUS_ICONS, getStatusIcon, StructuredOccupation, StructuredEducation, StructuredLocation } from '@/lib/profile-metadata';
import { 
  OCCUPATIONS, EDUCATION_LEVELS, DEGREES, FIELDS_OF_STUDY, COUNTRIES, PRONOUNS, getLinkageSuggestions 
} from '@/lib/identity-taxonomy';
import { validateProfilePicture, validateProfileBanner } from '@/lib/media-validation';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

type UsernameValidState = 'idle' | 'checking' | 'valid' | 'taken' | 'blocked' | 'error';

const PRESET_TAGS = ['developer', 'music', 'anime', 'design', 'football', 'cinema', 'nightowl', 'creator', 'gaming', 'travel'];

export default function IdentityEditSystem({ isOpen, onClose }: Props) {
  const currentUser = useAppStore(s => s.currentUser);
  const updateProfile = useAppStore(s => s.updateProfile);

  const getActiveBadges = useCallback((user: any): string[] => {
    if (!user) return [];
    const badges: string[] = [];
    const isS = user.username?.toLowerCase() === 's';

    if (isS) badges.push('white_heart');
    if (!isS && (user.is_verified || user.role === 'PRIME')) badges.push('sovereign');
    if (!isS && (user.role === 'ADMIN' || user.role === 'DEVELOPER')) badges.push('architect');
    if (!isS && ((user.security_score && user.security_score > 80))) badges.push('guardian');
    if (!isS && (user.created_at && new Date(user.created_at).getFullYear() <= 2025)) badges.push('founding');

    const streak = user.metadata?.streak ?? user.metadata?.loginStreak ?? user.streak_count ?? 0;
    if (streak >= 365) badges.push('streak_365');
    else if (streak >= 100) badges.push('streak_100');
    else if (streak >= 30)  badges.push('streak_30');
    else if (streak >= 7)   badges.push('streak_7');
    else if (streak >= 3)   badges.push('streak_3');

    const fc = user.follower_count ?? 0;
    if (fc >= 1000) badges.push('legend');
    else if (fc >= 500) badges.push('influencer');
    else if (fc >= 100) badges.push('popular');
    else if (fc >= 10)  badges.push('connected');
    else if (fc >= 1)   badges.push('first_follower');

    if (user.avatar_url) badges.push('avatar_set');
    if (user.bio && user.bio.trim().length > 0) badges.push('bio_written');
    if (user.banner_url) badges.push('banner_hero');
    const profileComplete = user.avatar_url && user.bio && user.banner_url && user.location && user.website;
    if (profileComplete) badges.push('complete_profile');

    const joinedAt = user.created_at ? new Date(user.created_at) : null;
    const now = new Date();
    if (joinedAt && (now.getTime() - joinedAt.getTime()) > 365 * 24 * 60 * 60 * 1000)
      badges.push('veteran');
    if (joinedAt && joinedAt <= new Date('2025-02-01')) badges.push('early_adopter');

    const postCount = user.post_count ?? 0;
    if (postCount >= 100) badges.push('post_100');
    else if (postCount >= 50) badges.push('post_50');
    else if (postCount >= 10) badges.push('post_10');
    else if (postCount >= 1) badges.push('first_post');

    return badges;
  }, []);

  const userBadges = useMemo(() => getActiveBadges(currentUser), [currentUser, getActiveBadges]);

  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [originalUsername, setOriginalUsername] = useState('');
  const [bioText, setBioText] = useState('');
  const [avatar, setAvatar] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  
  // Custom Metadata States
  const [statusText, setStatusText] = useState('');
  const [statusEmoji, setStatusEmoji] = useState('rocket');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  // New premium identity features (Stage 9)
  const [birthMonth, setBirthMonth] = useState('');
  const [birthDay, setBirthDay] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [expertiseTags, setExpertiseTags] = useState<string[]>([]);
  const [expertiseInput, setExpertiseInput] = useState('');
  const [birthdayMode, setBirthdayMode] = useState<'date_month' | 'date_month_year'>('date_month_year');
  const [selectedFrameBadge, setSelectedFrameBadge] = useState<string>('');
  
  // Milestones timeline
  const [milestones, setMilestones] = useState<any[]>([]);
  const [newMilestoneTitle, setNewMilestoneTitle] = useState('');
  const [newMilestoneDesc, setNewMilestoneDesc] = useState('');
  const [newMilestoneDate, setNewMilestoneDate] = useState('');
  const [addingMilestone, setAddingMilestone] = useState(false);
  
  // Structured Identity Details
  const [occupation, setOccupation] = useState<StructuredOccupation | null>(null);
  const [education, setEducation] = useState<StructuredEducation | null>(null);
  const [location, setLocation] = useState<StructuredLocation | null>(null);
  const [pronouns, setPronouns] = useState('');
  const [customLink, setCustomLink] = useState('');
  
  // Custom interface edit states
  const [occupationSearch, setOccupationSearch] = useState('');
  const [occupationEditMode, setOccupationEditMode] = useState(false);
  const [selectedOccCategory, setSelectedOccCategory] = useState<string | null>(null);
  
  const [educationEditMode, setEducationEditMode] = useState(false);
  const [eduLevel, setEduLevel] = useState('');
  const [eduDegree, setEduDegree] = useState('');
  const [eduField, setEduField] = useState('');
  const [eduInstitution, setEduInstitution] = useState('');
  const [institutionSearch, setInstitutionSearch] = useState('');

  const [locationEditMode, setLocationEditMode] = useState(false);
  const [locCountry, setLocCountry] = useState('');
  const [locState, setLocState] = useState('');
  const [locCity, setLocCity] = useState('');
  const [countrySearch, setCountrySearch] = useState('');

  const [pronounsEditMode, setPronounsEditMode] = useState(false);
  const [pronounSearch, setPronounSearch] = useState('');
  const [isCustomPronoun, setIsCustomPronoun] = useState(false);

  // Premium dropdown open/close state
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [showStateDropdown, setShowStateDropdown] = useState(false);
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [stateSearch, setStateSearch] = useState('');
  const [citySearch, setCitySearch] = useState('');
  const [showEduLevelDropdown, setShowEduLevelDropdown] = useState(false);
  const [showDegreeDropdown, setShowDegreeDropdown] = useState(false);
  const [showFieldDropdown, setShowFieldDropdown] = useState(false);


  // Moderation modal
  const [showModerationModal, setShowModerationModal] = useState(false);

  const [privacySettings, setPrivacySettings] = useState<Record<string, 'public' | 'followers' | 'mutuals' | 'private'>>({
    bio: 'public',
    occupation: 'public',
    education: 'public',
    location: 'public',
    pronouns: 'public',
    customLink: 'public',
  });

  const [showIconPicker, setShowIconPicker] = useState(false);
  const [birthdayVisible, setBirthdayVisible] = useState(true);

  // Files
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedBannerFile, setSelectedBannerFile] = useState<File | null>(null);
  const [isPrivate, setIsPrivate] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [savedOk, setSavedOk] = useState(false);

  // Suggested linkage notification
  const [suggestedLinkage, setSuggestedLinkage] = useState<{ fieldOfStudy?: string; occupation?: string } | null>(null);

  // Scroll targets refs for recommendations
  const occupationRef = useRef<HTMLDivElement>(null);
  const educationRef = useRef<HTMLDivElement>(null);
  const locationRef = useRef<HTMLDivElement>(null);
  const pronounsRef = useRef<HTMLDivElement>(null);
  const bioRef = useRef<HTMLDivElement>(null);
  const websiteRef = useRef<HTMLDivElement>(null);

  // Username governance state
  const [usernameState, setUsernameState] = useState<UsernameValidState>('idle');
  const [usernameMsg, setUsernameMsg] = useState('');

  // Rate limit state
  const [eligibility, setEligibility] = useState<{
    allowed: boolean;
    reason?: string;
    changesThisMonth: number;
    lastChangedAt: string | null;
    daysUntilNext: number | null;
  } | null>(null);
  const [loadingEligibility, setLoadingEligibility] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch full DB Profile & Eligibility on open
  useEffect(() => {
    if (isOpen && currentUser) {
      // 1. Immediately prefill from local store to prevent empty inputs
      setDisplayName(currentUser.displayName || '');
      const uname = currentUser.username?.toLowerCase() || '';
      setUsername(uname);
      setOriginalUsername(uname);
      setAvatar(currentUser.avatar || '');
      setIsPrivate(currentUser.isPrivate || false);
      
      const { visibleBio, metadata } = parseBio(currentUser.bio);
      setBioText(visibleBio || '');
      setStatusText(metadata.statusText || '');
      setStatusEmoji(metadata.statusEmoji || 'rocket');
      setTags(metadata.tags || []);
      
      // Secondary fields from local metadata if present
      const meta = currentUser.metadata || {};
      setBannerUrl(meta.banner_url || '');
      setPronouns(metadata.structuredPronouns || meta.pronouns || '');
      setCustomLink(meta.custom_link || '');
      setBirthdayVisible(metadata.birthdayVisible ?? true);
      setBirthdayMode(metadata.birthdayMode || 'date_month_year');
      setSelectedFrameBadge(metadata.selectedFrameBadge || meta.selectedFrameBadge || '');
      if (metadata.birthday) {
        const parts = metadata.birthday.split('-');
        if (parts.length === 3) {
          setBirthYear(parts[0]);
          setBirthMonth(parseInt(parts[1], 10).toString());
          setBirthDay(parseInt(parts[2], 10).toString());
        } else if (parts.length === 2) {
          setBirthYear('');
          setBirthMonth(parseInt(parts[0], 10).toString());
          setBirthDay(parseInt(parts[1], 10).toString());
        }
      } else {
        setBirthYear('');
        setBirthMonth('');
        setBirthDay('');
      }

      // Load structured components
      setOccupation(metadata.structuredOccupation || (metadata.occupation ? { title: metadata.occupation } : null));
      setEducation(metadata.structuredEducation || (metadata.education ? { institution: metadata.education } : null));
      setLocation(metadata.structuredLocation || (metadata.location ? { country: metadata.location } : null));
      setPrivacySettings(metadata.privacySettings || {
        bio: 'public',
        occupation: 'public',
        education: 'public',
        location: 'public',
        pronouns: 'public',
        customLink: 'public',
      });

      if (currentUser.id) {
        setLoadingEligibility(true);
        checkUsernameChangeEligibility(currentUser.id).then((result) => {
          setEligibility(result);
          setLoadingEligibility(false);
        });

        // 2. Fetch latest DB state for absolute accuracy
        getDatabaseProfile(currentUser.id).then((res) => {
          if (res.success && res.data) {
            const profile = res.data;
            setDisplayName(profile.display_name || '');
            setUsername(profile.username || '');
            setOriginalUsername(profile.username || '');
            setAvatar(profile.avatar_url || '');
            setBannerUrl(profile.banner_url || '');
            setPronouns(profile.pronouns || '');
            setCustomLink(profile.custom_link || '');
            setIsPrivate(profile.is_private || false);
            
            const parsed = parseBio(profile.bio);
            setBioText(parsed.visibleBio || '');
            setStatusText(parsed.metadata.statusText || '');
            setStatusEmoji(parsed.metadata.statusEmoji || 'rocket');
            setTags(parsed.metadata.tags || []);
            setBirthdayVisible(parsed.metadata.birthdayVisible ?? true);
            setBirthdayMode(parsed.metadata.birthdayMode || 'date_month_year');
            setSelectedFrameBadge(parsed.metadata.selectedFrameBadge || '');
            if (parsed.metadata.birthday) {
              const parts = parsed.metadata.birthday.split('-');
              if (parts.length === 3) {
                setBirthYear(parts[0]);
                setBirthMonth(parseInt(parts[1], 10).toString());
                setBirthDay(parseInt(parts[2], 10).toString());
              } else if (parts.length === 2) {
                setBirthYear('');
                setBirthMonth(parseInt(parts[0], 10).toString());
                setBirthDay(parseInt(parts[1], 10).toString());
              }
            } else {
              setBirthYear('');
              setBirthMonth('');
              setBirthDay('');
            }

            setOccupation(parsed.metadata.structuredOccupation || (parsed.metadata.occupation ? { title: parsed.metadata.occupation } : null));
            setEducation(parsed.metadata.structuredEducation || (parsed.metadata.education ? { institution: parsed.metadata.education } : null));
            setLocation(parsed.metadata.structuredLocation || (parsed.metadata.location ? { country: parsed.metadata.location } : null));
            setPrivacySettings(parsed.metadata.privacySettings || {
              bio: 'public',
              occupation: 'public',
              education: 'public',
              location: 'public',
              pronouns: 'public',
              customLink: 'public',
            });


            setExpertiseTags(profile.expertise_tags || []);
            getProfileMilestones(currentUser.id).then((mRes) => {
              if (mRes.success && mRes.data) {
                setMilestones(mRes.data);
              }
            });
          }
        });
      }

      setSelectedFile(null);
      setSelectedBannerFile(null);
      setErrorMsg('');
      setSavedOk(false);
      // Do NOT set 'checking' here — the second effect below immediately resolves the
      // current username. Setting 'checking' first causes a visible spinner flash on open.
      setUsernameState('idle');
      setUsernameMsg('');
    }
  }, [isOpen, currentUser]);

  // Show instant status on dialog open — use quickCheckUsername (no AI, fast)
  useEffect(() => {
    if (!isOpen || !currentUser?.username) return;
    const uname = currentUser.username.toLowerCase().trim();
    if (!uname) return;
    // Instant: just run governance rules client-side for current handle
    setUsernameState('valid');
    setUsernameMsg('Your current handle');
  }, [isOpen, currentUser?.username]);


  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const result = await validateProfilePicture(file);
    if (!result.valid) {
      setErrorMsg(result.error || 'Invalid profile picture.');
      // Reset input so the same file triggers onChange again if needed
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const finalFile = result.compressedFile || file;
    setSelectedFile(finalFile);
    setAvatar(URL.createObjectURL(finalFile));
    setErrorMsg('');
  };

  const handleBannerChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const result = await validateProfileBanner(file);
    if (!result.valid) {
      setErrorMsg(result.error || 'Invalid banner image.');
      if (bannerInputRef.current) bannerInputRef.current.value = '';
      return;
    }

    const finalFile = result.compressedFile || file;
    setSelectedBannerFile(finalFile);
    setBannerUrl(URL.createObjectURL(finalFile));
    setErrorMsg('');
  };

  const validateUsername = useCallback((val: string) => {
    const regex = /^[a-z0-9_.]+$/;
    if (!regex.test(val)) return false;
    if (val.startsWith('.') || val.startsWith('_')) return false;
    if (val.endsWith('.') || val.endsWith('_')) return false;
    if (val.includes('..') || val.includes('__') || val.includes('._') || val.includes('_.')) return false;
    if (val.length > 20) return false;
    if (val.length < 5) return false; // Always 5 minimum — no bypass
    return true;
  }, []);

  const getUsernameInvalidReason = useCallback((val: string) => {
    if (val.length > 0 && val.length < 5) return 'Minimum 5 characters';
    if (val.length > 20) return 'Maximum 20 characters';
    if (/^[._]/.test(val)) return 'Cannot start with dot or underscore';
    if (/\.$|_\.$/.test(val) || /_$/.test(val)) return 'Cannot end with dot or underscore';
    if (/[._]{2,}/.test(val) || /\._|_\./.test(val)) return 'Cannot contain adjacent special characters';
    return 'Allowed: a-z, 0-9, dot (.), underscore (_)';
  }, []);

  // Debounced username validation
  const handleUsernameChange = useCallback((val: string) => {
    let clean = val.toLowerCase().trim();
    clean = clean.replace(/[^a-z0-9_.]/g, '');
    setUsername(clean);
    setUsernameMsg('');

    if (clean === originalUsername) {
      setUsernameState('idle');
      return;
    }

    if (!validateUsername(clean)) {
      setUsernameState('blocked');
      setUsernameMsg(getUsernameInvalidReason(clean));
      return;
    }

    setUsernameState('checking');
    if (debounceRef.current) clearTimeout(debounceRef.current);
    // Use quickCheckUsername (no AI) for instant live feedback
    debounceRef.current = setTimeout(async () => {
      try {
        const result = await quickCheckUsername(clean);
        if (!result.valid) {
          setUsernameState('blocked');
          setUsernameMsg(result.reason || 'This username is not permitted.');
        } else if (!result.available) {
          setUsernameState('taken');
          setUsernameMsg('This username is already taken.');
        } else {
          setUsernameState('valid');
          setUsernameMsg(result.reason || 'Available ✓');
        }
      } catch {
        setUsernameState('error');
        setUsernameMsg('Check failed. Try again.');
      }
    }, 400);
  }, [originalUsername, currentUser, validateUsername, getUsernameInvalidReason]);

  const handleAddTag = (e?: React.KeyboardEvent) => {
    if (e && e.key !== 'Enter') return;
    if (e) e.preventDefault();

    const cleanTag = tagInput.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!cleanTag) return;
    if (tags.length >= 7) {
      setErrorMsg('You can add up to 7 interest tags.');
      return;
    }
    if (!tags.includes(cleanTag)) {
      setTags([...tags, cleanTag]);
    }
    setTagInput('');
    setErrorMsg('');
  };

  const handleAddPresetTag = (tag: string) => {
    if (tags.length >= 7) {
      setErrorMsg('You can add up to 7 interest tags.');
      return;
    }
    if (!tags.includes(tag)) {
      setTags([...tags, tag]);
    }
    setErrorMsg('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  const handleAddExpertiseTag = (e?: React.KeyboardEvent) => {
    if (e && e.key !== 'Enter') return;
    if (e) e.preventDefault();

    const cleanTag = expertiseInput.trim();
    if (!cleanTag) return;
    if (expertiseTags.length >= 5) {
      setErrorMsg('You can add up to 5 identity tags.');
      return;
    }
    if (!expertiseTags.includes(cleanTag)) {
      setExpertiseTags([...expertiseTags, cleanTag]);
    }
    setExpertiseInput('');
    setErrorMsg('');
  };

  const handleRemoveExpertiseTag = (tagToRemove: string) => {
    setExpertiseTags(expertiseTags.filter(t => t !== tagToRemove));
  };

  const handleAddMilestone = async () => {
    if (!newMilestoneTitle.trim() || !newMilestoneDate) {
      setErrorMsg('Milestone title and date are required.');
      return;
    }
    setAddingMilestone(true);
    try {
      const res = await addCustomMilestone(
        newMilestoneTitle.trim(),
        newMilestoneDesc.trim(),
        newMilestoneDate
      );
      if (res.success && res.data) {
        setMilestones([
          {
            id: res.data.id,
            type: 'custom',
            title: res.data.title,
            description: res.data.description || '',
            date: res.data.milestone_date
          },
          ...milestones
        ]);
        setNewMilestoneTitle('');
        setNewMilestoneDesc('');
        setNewMilestoneDate('');
      } else {
        setErrorMsg(res.error || 'Failed to add milestone.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to add milestone.');
    } finally {
      setAddingMilestone(false);
    }
  };

  const handleDeleteMilestone = async (id: string) => {
    try {
      const res = await deleteCustomMilestone(id);
      if (res.success) {
        setMilestones(milestones.filter(m => m.id !== id));
      } else {
        setErrorMsg(res.error || 'Failed to delete milestone.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to delete milestone.');
    }
  };


  // Structured fields compatibility builders
  const compiledOccupationString = useMemo(() => {
    return occupation?.title || '';
  }, [occupation]);

  const compiledEducationString = useMemo(() => {
    if (!education) return '';
    const levelStr = education.level || '';
    const degreeStr = education.degree || '';
    const fieldStr = education.fieldOfStudy ? `in ${education.fieldOfStudy}` : '';
    const instStr = education.institution ? `at ${education.institution}` : '';
    
    let mainEdu = '';
    if (levelStr && degreeStr) {
      mainEdu = `${levelStr} (${degreeStr})`;
    } else {
      mainEdu = levelStr || degreeStr;
    }
    
    const resParts = [mainEdu, fieldStr, instStr].filter(Boolean);
    return resParts.join(' ');
  }, [education]);

  const compiledLocationString = useMemo(() => {
    if (!location) return '';
    return [location.city, location.state, location.country].filter(Boolean).join(', ');
  }, [location]);


  // Handle auto linkage suggestion accept
  const acceptLinkageSuggestion = () => {
    if (!suggestedLinkage) return;
    if (suggestedLinkage.fieldOfStudy && education) {
      setEducation({ ...education, fieldOfStudy: suggestedLinkage.fieldOfStudy });
    }
    if (suggestedLinkage.occupation) {
      const category = OCCUPATIONS.find(c => c.titles.includes(suggestedLinkage.occupation!))?.name || 'Other';
      setOccupation({ title: suggestedLinkage.occupation, category });
    }
    setSuggestedLinkage(null);
  };

  const validateAndSave = async () => {
    setErrorMsg('');

    const usernameChanged = username !== originalUsername;
    if (usernameChanged) {
      if (!eligibility?.allowed) {
        setErrorMsg(eligibility?.reason || 'Username changes are temporarily restricted.');
        return;
      }
      if (usernameState === 'checking') {
        setErrorMsg('Please wait for username validation to complete.');
        return;
      }
      if (usernameState === 'blocked' || usernameState === 'taken' || usernameState === 'error') {
        setErrorMsg(usernameMsg || 'Please fix your username before saving.');
        return;
      }
    }

    const minLength = (currentUser?.role === 'PRIME' || currentUser?.username?.toLowerCase() === 's') ? 1 : 5;
    if (username.length < minLength) {
      setErrorMsg(`Username must be at least ${minLength} characters.`);
      return;
    }

    // ── Frontend Moderation Gate ──
    const { checkIdentityContent } = await import('@/lib/security/identity-moderation');
    const fieldsToCheck = [displayName, pronouns, customLink, bioText, occupation?.title || '', eduInstitution];
    for (const field of fieldsToCheck) {
      if (field) {
        const mod = checkIdentityContent(field);
        if (mod.blocked) {
          setShowModerationModal(true);
          return;
        }
      }
    }

    setIsSaving(true);

    let finalAvatar = avatar;
    let finalBanner = bannerUrl;

    // Avatar upload
    if (selectedFile) {
      const fd = new FormData();
      fd.append('file', selectedFile);
      fd.append('folder', 'avatars');
      const result = await uploadMedia(fd);
      if ('error' in result) {
        setErrorMsg(`Avatar upload failed: ${result.error}`);
        setIsSaving(false);
        return;
      }
      finalAvatar = result.url;
    }

    // Banner upload
    if (selectedBannerFile) {
      const fd = new FormData();
      fd.append('file', selectedBannerFile);
      fd.append('folder', 'banners');
      const result = await uploadMedia(fd);
      if ('error' in result) {
        setErrorMsg(`Banner upload failed: ${result.error}`);
        setIsSaving(false);
        return;
      }
      finalBanner = result.url;
    }

    let compiledBirthday = '';
    let compiledBirthdayMode = birthdayMode;
    if (birthMonth && birthDay) {
      if (birthdayMode === 'date_month_year' && birthYear) {
        compiledBirthday = `${birthYear}-${birthMonth.padStart(2, '0')}-${birthDay.padStart(2, '0')}`;
      } else {
        compiledBirthday = `${birthMonth.padStart(2, '0')}-${birthDay.padStart(2, '0')}`;
      }
    }

    // Serialize biography with structured meta-fields
    const serializedBio = serializeBio(bioText, {
      statusText: statusText.trim(),
      statusEmoji,
      tags,
      occupation: compiledOccupationString,
      education: compiledEducationString,
      location: compiledLocationString,
      birthdayVisible,
      birthday: compiledBirthday || undefined,
      birthdayMode: compiledBirthday ? compiledBirthdayMode : undefined,
      selectedFrameBadge: selectedFrameBadge || undefined,
      structuredOccupation: occupation || undefined,
      structuredEducation: education || undefined,
      structuredLocation: location || undefined,
      structuredPronouns: pronouns,
      privacySettings: privacySettings,
    });

    if (currentUser?.id) {
      const dbResult = await submitProfileUpdateDB(currentUser.id, {
        displayName,
        username: usernameChanged ? username : undefined,
        bio: serializedBio,
        avatarUrl: finalAvatar !== currentUser.avatar ? finalAvatar : undefined,
        bannerUrl: finalBanner,
        pronouns: pronouns.trim(),
        customLink: customLink.trim(),
        quote: null,
        presenceStatus: null,
        presenceDuration: null,
        expertiseTags: expertiseTags,
        isPrivate: isPrivate,
      });

      if (!dbResult.success) {
        setErrorMsg(dbResult.error || 'Failed to save changes.');
        setIsSaving(false);
        return;
      }
    }

    // Update local Zustand store
    updateProfile({ 
      displayName, 
      username, 
      bio: serializedBio, 
      avatar: finalAvatar, 
      isPrivate 
    });

    await new Promise((r) => setTimeout(r, 600));
    setIsSaving(false);
    setSavedOk(true);

    setTimeout(() => {
      setSavedOk(false);
      onClose();
    }, 1000);
  };

  const usernameChanged = username !== originalUsername;
  const canSaveUsername = !usernameChanged || (eligibility?.allowed && (usernameState === 'valid' || usernameState === 'idle'));

  // Occupation Search engine logic
  const occupationSuggestions = useMemo(() => {
    if (!occupationSearch.trim()) return [];
    const query = occupationSearch.toLowerCase();
    
    // Custom mapping prediction overrides
    if (query === 'dev') return ['Software Engineer', 'Frontend Developer', 'Backend Developer', 'Full Stack Developer', 'Mobile Developer', 'AI Engineer'];
    if (query === 'doc') return ['Doctor', 'Surgeon', 'Dentist', 'Medical Student'];
    if (query === 'stu') return ['Student', 'Engineering Student', 'Medical Student', 'Law Student'];
    
    const results: string[] = [];
    OCCUPATIONS.forEach(cat => {
      cat.titles.forEach(title => {
        if (title.toLowerCase().includes(query)) {
          results.push(title);
        }
      });
    });
    return results.slice(0, 8);
  }, [occupationSearch]);

  // Standard category filter
  const activeOccCategoryTitles = useMemo(() => {
    if (!selectedOccCategory) return [];
    return OCCUPATIONS.find(c => c.name === selectedOccCategory)?.titles || [];
  }, [selectedOccCategory]);

  // Locations filtering
  const filteredCountries = useMemo(() => {
    const list = Object.keys(COUNTRIES);
    if (!countrySearch.trim()) return list;
    return list.filter(c => c.toLowerCase().includes(countrySearch.toLowerCase()));
  }, [countrySearch]);

  const activeCountryData = useMemo(() => {
    return locCountry ? COUNTRIES[locCountry] : null;
  }, [locCountry]);

  const activeStates = useMemo(() => {
    const all = activeCountryData ? Object.keys(activeCountryData.states) : [];
    if (!stateSearch.trim()) return all;
    return all.filter(s => s.toLowerCase().includes(stateSearch.toLowerCase()));
  }, [activeCountryData, stateSearch]);

  const activeCities = useMemo(() => {
    const all = (activeCountryData && locState) ? activeCountryData.states[locState] || [] : [];
    if (!citySearch.trim()) return all;
    return all.filter(c => c.toLowerCase().includes(citySearch.toLowerCase()));
  }, [activeCountryData, locState, citySearch]);


  const activeInstitutions = useMemo(() => {
    if (!locCountry) return [];
    const inst = COUNTRIES[locCountry]?.institutions || [];
    if (!institutionSearch.trim()) return inst;
    return inst.filter(i => i.toLowerCase().includes(institutionSearch.toLowerCase()));
  }, [locCountry, institutionSearch]);

  // Smart suggestions on education changes
  const handleDegreeChange = (degree: string) => {
    setEduDegree(degree);
    const suggestion = getLinkageSuggestions(degree, eduField);
    if (suggestion.fieldOfStudy || suggestion.occupation) {
      setSuggestedLinkage(suggestion);
    }
  };

  const handleFieldChange = (field: string) => {
    setEduField(field);
    const suggestion = getLinkageSuggestions(eduDegree, field);
    if (suggestion.fieldOfStudy || suggestion.occupation) {
      setSuggestedLinkage(suggestion);
    }
  };

  // Completion score & actionable carousel tips list
  const completionScore = useMemo(() => {
    let score = 20; // base signup score
    if (displayName) score += 15;
    if (bioText) score += 15;
    if (avatar) score += 10;
    if (bannerUrl) score += 10;
    if (occupation) score += 10;
    if (education) score += 10;
    if (location) score += 10;
    return Math.min(score, 100);
  }, [displayName, bioText, avatar, bannerUrl, occupation, education, location]);

  const activeRecommendations = useMemo(() => {
    const list = [];
    if (!bioText) {
      list.push({ text: 'Add a biography to tell your unique digital story', ref: bioRef });
    }
    if (!occupation) {
      list.push({ text: 'Specify your career path to unlock networking tags', ref: occupationRef });
    }
    if (!education) {
      list.push({ text: 'Include your education to show academic integrity', ref: educationRef });
    }
    if (!location) {
      list.push({ text: 'Add your global location for localized connection discovery', ref: locationRef });
    }
    if (!customLink) {
      list.push({ text: 'Link a portfolio website to showcase your projects', ref: websiteRef });
    }
    return list;
  }, [bioText, occupation, education, location, customLink]);

  const handleTipClick = (ref: React.RefObject<HTMLDivElement | null>) => {
    if (ref.current) {
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Add a brief glow highlight class trigger
      ref.current.classList.add('ring-2', 'ring-white/20');
      setTimeout(() => {
        ref.current?.classList.remove('ring-2', 'ring-white/20');
      }, 1500);
    }
  };

  return (
    <>
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed inset-0 z-[200] bg-[#0A0A0A] flex flex-col md:max-w-xl md:mx-auto md:my-6 md:rounded-3xl md:border md:border-white/10 md:shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="p-2 -ml-2 rounded-full text-white/40 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X size={20} />
            </button>
            <h2 className="text-[14px] font-bold tracking-tight text-white/90 uppercase tracking-widest">Build Identity</h2>
            <div className="w-10" />
          </div>

          {/* Form scrollable viewport */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <div className="px-6 py-6 space-y-6">

              {/* ── Visual Headers ── */}
              <div className="space-y-2">
                <label className="block text-[11px] font-extrabold text-neutral-400 uppercase tracking-wider px-1">Visual Headers</label>
                <div className="h-36 sm:h-44 w-full bg-neutral-900 border border-white/5 rounded-2xl relative overflow-hidden flex flex-col justify-end p-4">
                  {bannerUrl ? (
                    <img src={bannerUrl} alt="banner" className="w-full h-full object-cover absolute inset-0" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-r from-violet-950 via-neutral-950 to-indigo-950 absolute inset-0" />
                  )}
                  <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px]" />
                  
                  {/* Edit Banner Trigger */}
                  <button
                    type="button"
                    onClick={() => bannerInputRef.current?.click()}
                    className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/60 hover:bg-black text-white flex items-center justify-center border border-white/10 transition-colors shadow-[0_2px_8px_rgba(0,0,0,0.5)]"
                    title="Change Banner (JPG, PNG, WEBP, GIF up to 2.5 MB)"
                  >
                    <Image size={14} />
                  </button>
                  <input type="file" accept="image/jpeg,image/jpg,image/png,image/webp,image/gif" ref={bannerInputRef} className="hidden" onChange={handleBannerChange} />

                  {/* Avatar Layout overlapping */}
                  <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden ring-4 ring-black/80 bg-neutral-950 shrink-0 shadow-xl group">
                    <img src={getAvatarUrl(username || 'user', avatar)} alt="avatar" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity"
                    >
                      <Camera size={16} />
                    </button>
                    <input type="file" accept="image/jpeg,image/jpg,image/png,image/webp" ref={fileInputRef} className="hidden" onChange={handleFileChange} />
                  </div>
                </div>
              </div>



              {/* Username Cooldown info */}
              {loadingEligibility ? (
                <div className="flex items-center gap-3 p-4 bg-white/[0.02] rounded-2xl border border-white/[0.05] animate-pulse">
                  <Loader2 size={14} className="text-white/30 animate-spin" />
                  <span className="text-[12px] text-white/30 font-medium">Checking identity permissions...</span>
                </div>
              ) : eligibility && !eligibility.allowed ? (
                <div className="p-4 bg-rose-500/5 border border-rose-500/20 rounded-2xl flex items-start gap-3">
                  <ShieldAlert size={15} className="text-rose-400 mt-0.5" />
                  <p className="text-[12px] text-rose-300/80 leading-relaxed font-medium">
                    {eligibility.reason}
                  </p>
                </div>
              ) : null}

              {/* Core Details Fields */}
              <div className="space-y-4">
                {/* Display Name with Floating Label styling */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                      <Shield size={14} className="text-white/30" />
                      <span className="text-[11px] font-bold uppercase tracking-widest text-white/30">Display Name</span>
                    </div>
                  </div>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Your visual name"
                    className="w-full bg-white/[0.02] hover:bg-white/[0.04] focus:bg-white/[0.04] text-white text-[14px] rounded-xl px-4 py-3.5 border border-white/[0.06] focus:border-white/20 focus:ring-1 focus:ring-white/10 outline-none transition-all placeholder:text-white/15 font-semibold"
                  />
                </div>

                {/* Username with verification indicator */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                      <AtSign size={14} className="text-white/30" />
                      <span className="text-[11px] font-bold uppercase tracking-widest text-white/30">Username</span>
                    </div>
                    {/* Always-visible status badge */}
                    <span className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                      usernameState === 'checking' ? 'text-white/40' :
                      usernameState === 'valid' ? 'text-emerald-400' :
                      usernameState === 'taken' ? 'text-amber-400' :
                      usernameState === 'blocked' || usernameState === 'error' ? 'text-rose-400' :
                      'text-white/25'
                    }`}>
                      {usernameState === 'checking' && <Loader2 size={10} className="animate-spin" />}
                      {usernameState === 'valid' && (
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><circle cx="5" cy="5" r="5" fill="currentColor" opacity="0.3"/><path d="M3 5l1.5 1.5L7 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      )}
                      {(usernameState === 'blocked' || usernameState === 'error' || usernameState === 'taken') && (
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><circle cx="5" cy="5" r="5" fill="currentColor" opacity="0.3"/><path d="M3.5 3.5l3 3M6.5 3.5l-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                      )}
                      <span>
                        {usernameState === 'idle' && !usernameChanged ? 'Current handle' :
                         usernameState === 'checking' ? 'Checking…' :
                         usernameState === 'valid' ? (usernameMsg || 'Available') :
                         usernameState === 'taken' ? (usernameMsg || 'Already taken') :
                         usernameState === 'blocked' ? (usernameMsg || 'Not permitted') :
                         usernameState === 'error' ? (usernameMsg || 'Validation error') : ''}
                      </span>
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => handleUsernameChange(e.target.value)}
                      placeholder="Unique handle"
                      disabled={!eligibility?.allowed}
                      className={`w-full bg-white/[0.02] hover:bg-white/[0.04] focus:bg-white/[0.04] text-white text-[14px] rounded-xl pl-4 pr-10 py-3.5 border transition-all placeholder:text-white/15 outline-none focus:ring-1 focus:ring-white/10
                        ${usernameState === 'valid' ? 'border-emerald-500/40 focus:border-emerald-500/60' :
                          usernameState === 'taken' ? 'border-amber-500/40 focus:border-amber-500/60' :
                          usernameState === 'blocked' || usernameState === 'error' ? 'border-rose-500/40 focus:border-rose-500/60' :
                          'border-white/[0.06] focus:border-white/20'}
                        disabled:opacity-50 disabled:cursor-not-allowed font-semibold`}
                    />
                    {/* Inline right indicator icon */}
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                      {usernameState === 'checking' && <Loader2 size={14} className="text-white/30 animate-spin" />}
                      {usernameState === 'valid' && (
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-emerald-400"><circle cx="8" cy="8" r="8" fill="currentColor" opacity="0.15"/><path d="M5 8l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      )}
                      {(usernameState === 'taken') && (
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-amber-400"><circle cx="8" cy="8" r="8" fill="currentColor" opacity="0.15"/><path d="M8 5v4M8 10.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                      )}
                      {(usernameState === 'blocked' || usernameState === 'error') && (
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-rose-400"><circle cx="8" cy="8" r="8" fill="currentColor" opacity="0.15"/><path d="M5.5 5.5l5 5M10.5 5.5l-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                      )}
                    </div>
                  </div>
                  {/* Format hint row */}
                  <p className="text-[9.5px] text-white/20 px-1 font-medium">
                    {((currentUser?.role === 'PRIME' || currentUser?.username?.toLowerCase() === 's') ? '1' : '5')}–20 chars · a-z, 0-9, dot (.), underscore (_) · no leading/trailing dot/underscore
                  </p>
                </div>

                {/* Biography text */}
                <div ref={bioRef} className="space-y-2 transition-all p-0.5 rounded-xl">
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2.5">
                      <AlignLeft size={14} className="text-white/30" />
                      <span className="text-[11px] font-bold uppercase tracking-widest text-white/30">Bio</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-medium text-white/25">{bioText.length}/160</span>
                      <PrivacySelector 
                        value={privacySettings.bio || 'public'} 
                        onChange={(val) => setPrivacySettings({ ...privacySettings, bio: val as any })} 
                      />
                    </div>
                  </div>
                  <textarea
                    value={bioText}
                    onChange={(e) => setBioText(e.target.value)}
                    placeholder="Write a brief professional or casual story..."
                    rows={3}
                    maxLength={160}
                    className="w-full bg-white/[0.02] hover:bg-white/[0.04] focus:bg-white/[0.04] text-white text-[14px] rounded-xl p-4 border border-white/[0.06] focus:border-white/20 outline-none transition-all resize-none leading-relaxed placeholder:text-white/15 font-semibold"
                  />
                </div>
              </div>

              {/* ── Dynamic Status System ── */}
              <div className="p-4 rounded-xl bg-white/[0.01] border border-white/[0.04] space-y-4">
                <div className="flex items-center gap-2">
                  <Smile size={14} className="text-white/30" />
                  <span className="text-[11px] font-bold uppercase tracking-widest text-white/30">Dynamic Status</span>
                </div>

                <div className="flex gap-2">
                  {/* Custom Icon Picker Popover */}
                  <div className="relative shrink-0">
                    <button
                      type="button"
                      onClick={() => setShowIconPicker(!showIconPicker)}
                      className="h-12 w-14 flex items-center justify-center bg-white/[0.02] hover:bg-white/[0.06] border border-white/10 rounded-xl focus:outline-none transition-colors"
                    >
                      {(() => {
                        const config = getStatusIcon(statusEmoji);
                        const IconComponent = config.icon;
                        return <IconComponent className={`${config.color} ${config.animationClass} w-5 h-5`} />;
                      })()}
                    </button>

                    <AnimatePresence>
                      {showIconPicker && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setShowIconPicker(false)} />
                          <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            className="absolute left-0 bottom-full mb-2 z-50 bg-[#0F0F0F] border border-white/10 rounded-2xl p-3 shadow-2xl flex flex-wrap gap-2 w-52 backdrop-blur-xl"
                          >
                            {Object.values(STATUS_ICONS).map((item) => {
                              const ItemIcon = item.icon;
                              const isSelected = statusEmoji === item.key;
                              return (
                                <button
                                  key={item.key}
                                  type="button"
                                  onClick={() => {
                                    setStatusEmoji(item.key);
                                    setShowIconPicker(false);
                                  }}
                                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                                    isSelected 
                                      ? 'bg-white/10 border border-white/20' 
                                      : 'bg-white/[0.02] hover:bg-white/[0.08] border border-transparent'
                                  }`}
                                  title={item.label}
                                >
                                  <ItemIcon className={`${item.color} ${item.animationClass} w-4 h-4`} />
                                </button>
                              );
                            })}
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>

                  <input
                    type="text"
                    value={statusText}
                    onChange={(e) => setStatusText(e.target.value.slice(0, 40))}
                    placeholder="What are you up to? (e.g. coding late)"
                    className="flex-1 bg-white/[0.02] hover:bg-white/[0.04] focus:bg-white/[0.04] text-white text-[14px] rounded-xl px-4 py-3 border border-white/[0.06] focus:border-white/20 outline-none placeholder:text-white/15 font-semibold"
                  />
                </div>
                <p className="text-[10px] text-white/20 px-1 leading-none">Optional · Max 40 characters · Shown below username</p>
              </div>

              {/* ── Birthday ── */}
              <div className="p-4 rounded-xl bg-white/[0.01] border border-white/[0.04] space-y-4">
                <div className="flex items-center gap-2">
                  <Calendar size={14} className="text-indigo-400" />
                  <span className="text-[11px] font-bold uppercase tracking-widest text-indigo-400">Birthday</span>
                </div>

                {/* Birthday Selector Input */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center px-1">
                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">birthday</span>
                    <span className="text-[9.5px] text-white/20">Month & Day required. Year is optional.</span>
                  </div>
                  <div className="flex gap-2">
                    {/* Month Select */}
                    <select
                      value={birthMonth}
                      onChange={(e) => setBirthMonth(e.target.value)}
                      className="flex-1 bg-white/[0.02] hover:bg-white/[0.04] focus:bg-white/[0.04] text-white text-[14px] rounded-xl px-4 py-3 border border-white/[0.06] focus:border-white/20 outline-none font-semibold transition-all appearance-none cursor-pointer"
                    >
                      <option value="" className="bg-neutral-900">Select Month</option>
                      {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((m, idx) => (
                        <option key={m} value={String(idx + 1)} className="bg-neutral-900">{m}</option>
                      ))}
                    </select>

                    {/* Day Select */}
                    <select
                      value={birthDay}
                      onChange={(e) => setBirthDay(e.target.value)}
                      className="w-24 bg-white/[0.02] hover:bg-white/[0.04] focus:bg-white/[0.04] text-white text-[14px] rounded-xl px-4 py-3 border border-white/[0.06] focus:border-white/20 outline-none font-semibold transition-all appearance-none cursor-pointer"
                    >
                      <option value="" className="bg-neutral-900">Day</option>
                      {Array.from({ length: 31 }, (_, i) => String(i + 1)).map((d) => (
                        <option key={d} value={d} className="bg-neutral-900">{d}</option>
                      ))}
                    </select>

                    {/* Year Input */}
                    <input
                      type="number"
                      min="1920"
                      max={new Date().getFullYear()}
                      value={birthYear}
                      disabled={birthdayMode === 'date_month'}
                      onChange={(e) => setBirthYear(e.target.value.slice(0, 4))}
                      placeholder={birthdayMode === 'date_month' ? "Disabled" : "Year (Opt)"}
                      className="w-28 bg-white/[0.02] hover:bg-white/[0.04] focus:bg-white/[0.04] text-white text-[14px] rounded-xl px-4 py-3 border border-white/[0.06] focus:border-white/20 outline-none placeholder:text-white/15 font-semibold transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>

                {/* Display Format Option */}
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider block px-1">Display Format</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setBirthdayMode('date_month')}
                      className={`flex-1 py-2.5 rounded-xl border text-xs font-bold transition-all ${
                        birthdayMode === 'date_month'
                          ? 'bg-white text-black border-white shadow-lg'
                          : 'bg-white/[0.02] text-white/50 border-white/[0.06] hover:bg-white/[0.04]'
                      }`}
                    >
                      Month & Day Only
                    </button>
                    <button
                      type="button"
                      onClick={() => setBirthdayMode('date_month_year')}
                      className={`flex-1 py-2.5 rounded-xl border text-xs font-bold transition-all ${
                        birthdayMode === 'date_month_year'
                          ? 'bg-white text-black border-white shadow-lg'
                          : 'bg-white/[0.02] text-white/50 border-white/[0.06] hover:bg-white/[0.04]'
                      }`}
                    >
                      Month, Day & Year
                    </button>
                  </div>
                </div>
              </div>

              {/* ── Profile Frame Badge ── */}
              <div className="p-4 rounded-xl bg-white/[0.01] border border-white/[0.04] space-y-4">
                <div className="flex items-center gap-2">
                  <Award size={14} className="text-indigo-400" />
                  <span className="text-[11px] font-bold uppercase tracking-widest text-indigo-400">Profile Frame Badge</span>
                </div>
                
                <p className="text-[10px] text-white/40 leading-relaxed font-semibold">
                  Choose which unlocked credential badge defines the animated ring around your avatar picture.
                </p>

                <div className="relative">
                  <select
                    value={selectedFrameBadge}
                    onChange={(e) => setSelectedFrameBadge(e.target.value)}
                    className="w-full bg-[#0E0E0E] text-white text-[14px] rounded-xl px-4 py-3.5 border border-white/[0.06] focus:border-white/20 outline-none font-semibold transition-all appearance-none cursor-pointer"
                  >
                    <option value="" className="bg-neutral-900">Auto (Highest Rarity)</option>
                    {userBadges.map((badgeKey) => {
                      const badgeConf = BADGE_CONFIG[badgeKey as BadgeType];
                      return (
                        <option key={badgeKey} value={badgeKey} className="bg-neutral-900">
                          {badgeConf?.label || badgeKey} ({badgeConf?.rarityLabel})
                        </option>
                      );
                    })}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-white/40">
                    <ChevronDown size={14} />
                  </div>
                </div>
              </div>

              {/* ── Expertise & Identity Tags ── */}
              <div className="p-4 rounded-xl bg-white/[0.01] border border-white/[0.04] space-y-4">
                <div className="flex items-center gap-2">
                  <Award size={14} className="text-indigo-400" />
                  <span className="text-[11px] font-bold uppercase tracking-widest text-indigo-400">Expertise Tags ({expertiseTags.length}/5)</span>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={expertiseInput}
                    onChange={(e) => setExpertiseInput(e.target.value)}
                    onKeyDown={handleAddExpertiseTag}
                    placeholder="Add tag (e.g. Developer, Designer, Founder)"
                    className="flex-1 bg-white/[0.02] text-white text-[14px] rounded-xl px-4 py-3 border border-white/[0.06] focus:border-white/20 outline-none placeholder:text-white/15 font-semibold"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddExpertiseTag()}
                    className="px-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 font-bold text-xs transition-colors"
                  >
                    Add
                  </button>
                </div>

                {expertiseTags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {expertiseTags.map(t => (
                      <span
                        key={t}
                        onClick={() => handleRemoveExpertiseTag(t)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/10 hover:bg-rose-500/10 hover:border-rose-500/20 hover:text-rose-400 rounded-xl text-xs font-bold text-indigo-300 border border-indigo-500/20 cursor-pointer transition-all active:scale-95"
                        title="Click to remove"
                      >
                        {t}
                        <X size={10} className="opacity-40" />
                      </span>
                    ))}
                  </div>
                )}
                
                {/* Suggestions list */}
                <div className="space-y-1.5 pt-1">
                  <span className="text-[10px] text-white/20 block">Suggested roles:</span>
                  <div className="flex flex-wrap gap-1">
                    {['Developer', 'Designer', 'Researcher', 'Founder', 'Photographer', 'Writer'].filter(t => !expertiseTags.includes(t)).map(t => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => {
                          if (expertiseTags.length >= 5) return;
                          setExpertiseTags([...expertiseTags, t]);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-white/[0.02] border border-white/[0.04] text-[11px] font-bold text-white/40 hover:text-white/80 hover:bg-white/5 transition-colors"
                      >
                        +{t}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* ── Profile Timeline Milestones ── */}
              <div className="p-4 rounded-xl bg-white/[0.01] border border-white/[0.04] space-y-4">
                <div className="flex items-center gap-2">
                  <Calendar size={14} className="text-indigo-400" />
                  <span className="text-[11px] font-bold uppercase tracking-widest text-indigo-400">Timeline Milestones</span>
                </div>

                {/* Add Milestone Form */}
                <div className="p-3.5 bg-white/[0.02] border border-white/[0.05] rounded-xl space-y-3">
                  <span className="text-[10px] font-black uppercase text-indigo-400 tracking-wider">Log New Milestone</span>
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={newMilestoneTitle}
                      onChange={(e) => setNewMilestoneTitle(e.target.value)}
                      placeholder="Milestone Title (e.g. Launched Verlyn App)"
                      className="w-full bg-white/[0.02] text-white text-[13px] rounded-lg px-3 py-2 border border-white/[0.06] focus:border-white/20 outline-none font-semibold"
                    />
                    <input
                      type="text"
                      value={newMilestoneDesc}
                      onChange={(e) => setNewMilestoneDesc(e.target.value)}
                      placeholder="Short Description (optional)"
                      className="w-full bg-white/[0.02] text-white text-[13px] rounded-lg px-3 py-2 border border-white/[0.06] focus:border-white/20 outline-none font-semibold"
                    />
                    <input
                      type="date"
                      value={newMilestoneDate}
                      onChange={(e) => setNewMilestoneDate(e.target.value)}
                      className="w-full bg-white/[0.02] text-white text-[13px] rounded-lg px-3 py-2 border border-white/[0.06] focus:border-white/20 outline-none font-semibold"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddMilestone}
                    disabled={addingMilestone}
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5"
                  >
                    {addingMilestone ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                    Log Milestone
                  </button>
                </div>

                {/* Milestones List */}
                {milestones.length > 0 && (
                  <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                    {milestones.map((m) => (
                      <div key={m.id} className="flex justify-between items-center p-3 bg-white/[0.01] border border-white/[0.04] rounded-lg">
                        <div className="space-y-0.5">
                          <p className="text-xs font-bold text-white/90">{m.title}</p>
                          {m.description && <p className="text-[10px] text-white/50">{m.description}</p>}
                          <span className="text-[9px] text-white/30 font-medium block">
                            {new Date(m.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                        {m.type === 'custom' && (
                          <button
                            type="button"
                            onClick={() => handleDeleteMilestone(m.id)}
                            className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-colors"
                            title="Delete Milestone"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ── Interest Tags System ── */}
              <div className="p-4 rounded-xl bg-white/[0.01] border border-white/[0.04] space-y-4">
                <div className="flex items-center gap-2">
                  <Hash size={14} className="text-white/30" />
                  <span className="text-[11px] font-bold uppercase tracking-widest text-white/30">Interest Tags ({tags.length}/7)</span>
                </div>

                {/* Input and add action */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleAddTag}
                    placeholder="Add an interest (e.g. design)"
                    className="flex-1 bg-white/[0.02] text-white text-[14px] rounded-xl px-4 py-3 border border-white/[0.06] focus:border-white/20 outline-none placeholder:text-white/15 font-semibold"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddTag()}
                    className="px-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 font-bold text-xs transition-colors"
                  >
                    Add
                  </button>
                </div>

                {/* Render current tags */}
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {tags.map(t => (
                      <span
                        key={t}
                        onClick={() => handleRemoveTag(t)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-rose-500/10 hover:border-rose-500/20 hover:text-rose-400 rounded-xl text-xs font-bold text-white/70 border border-white/10 cursor-pointer transition-all active:scale-95"
                        title="Click to remove"
                      >
                        #{t}
                        <X size={10} className="opacity-40" />
                      </span>
                    ))}
                  </div>
                )}

                {/* Preset suggestions */}
                <div className="space-y-1.5 pt-1">
                  <span className="text-[10px] text-white/20 block">Preset suggestions:</span>
                  <div className="flex flex-wrap gap-1">
                    {PRESET_TAGS.filter(t => !tags.includes(t)).map(t => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => handleAddPresetTag(t)}
                        className="px-2.5 py-1 rounded-lg bg-white/[0.02] border border-white/[0.04] text-[11px] font-bold text-white/40 hover:text-white/80 hover:bg-white/5 transition-colors"
                      >
                        +{t}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* ── Linkage Suggestion glowing alert ── */}
              <AnimatePresence>
                {suggestedLinkage && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="p-4 bg-indigo-500/10 border border-indigo-500/25 rounded-2xl flex items-start justify-between gap-3 shadow-[0_0_20px_rgba(99,102,241,0.08)] animate-pulse"
                  >
                    <div className="space-y-1">
                      <h4 className="text-xs font-black text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles size={12} /> Smart Linkage Suggestion
                      </h4>
                      <p className="text-[11px] text-white/60 leading-relaxed font-semibold">
                        Auto-suggesting fields based on your degree:
                        {suggestedLinkage.fieldOfStudy && <span className="block mt-0.5 text-white/80">• Field of Study: <strong className="text-white">{suggestedLinkage.fieldOfStudy}</strong></span>}
                        {suggestedLinkage.occupation && <span className="block text-white/80">• Occupation: <strong className="text-white">{suggestedLinkage.occupation}</strong></span>}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={acceptLinkageSuggestion}
                      className="px-3 py-1.5 rounded-lg bg-indigo-500 hover:bg-indigo-600 font-bold text-[10px] text-white uppercase tracking-wider transition-colors shrink-0"
                    >
                      Accept
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ── NEW OCCUPATION SECTION ── */}
              <div ref={occupationRef} className="p-4 rounded-xl bg-white/[0.01] border border-white/[0.04] space-y-4 transition-all">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Briefcase size={14} className="text-white/30" />
                    <span className="text-[11px] font-bold uppercase tracking-widest text-white/30">Occupation</span>
                  </div>
                  <PrivacySelector 
                    value={privacySettings.occupation || 'public'} 
                    onChange={(val) => setPrivacySettings({ ...privacySettings, occupation: val as any })} 
                  />
                </div>

                {!occupationEditMode && occupation ? (
                  <div className="flex items-center justify-between p-3.5 bg-white/[0.02] border border-white/[0.05] rounded-xl">
                    <div className="space-y-0.5">
                      <p className="text-sm font-bold text-white/90">{occupation.title}</p>
                      {occupation.category && (
                        <span className="text-[10px] font-extrabold uppercase text-indigo-400 tracking-wider bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                          {occupation.category}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setOccupationSearch(occupation.title);
                          setOccupationEditMode(true);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-xs font-bold transition-colors"
                      >
                        Change
                      </button>
                      <button
                        type="button"
                        onClick={() => setOccupation(null)}
                        className="p-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3.5">
                    {/* Search suggestion engine */}
                    <div className="space-y-1.5">
                      <input
                        type="text"
                        value={occupationSearch}
                        onChange={(e) => setOccupationSearch(e.target.value)}
                        placeholder="Search career titles (e.g. dev, ui, student)..."
                        className="w-full bg-white/[0.02] hover:bg-white/[0.04] focus:bg-white/[0.04] text-white text-[14px] rounded-xl px-4 py-3 border border-white/[0.06] focus:border-white/20 outline-none placeholder:text-white/15 font-semibold transition-all"
                      />
                      {occupationSuggestions.length > 0 && (
                        <div 
                          className="p-1.5 bg-[#0D0D0D] border border-white/5 rounded-xl flex flex-col gap-0.5 max-h-40 overflow-y-auto"
                          onWheel={(e) => e.stopPropagation()}
                          onTouchMove={(e) => e.stopPropagation()}
                        >
                          {occupationSuggestions.map(title => (
                            <button
                              key={title}
                              type="button"
                              onClick={() => {
                                const category = OCCUPATIONS.find(c => c.titles.includes(title))?.name || 'Other';
                                setOccupation({ title, category });
                                setOccupationEditMode(false);
                                setOccupationSearch('');
                              }}
                              className="w-full text-left px-3 py-2 text-xs font-bold text-white/60 hover:text-white hover:bg-white/5 rounded-lg transition-colors flex items-center justify-between"
                            >
                              {title}
                              <Plus size={11} className="opacity-40" />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Category selectors */}
                    <div className="space-y-2">
                      <span className="text-[10px] text-white/20 block px-0.5 font-bold uppercase tracking-wider">Standard categories</span>
                      <div className="flex flex-wrap gap-1">
                        {OCCUPATIONS.map(cat => (
                          <button
                            key={cat.name}
                            type="button"
                            onClick={() => setSelectedOccCategory(selectedOccCategory === cat.name ? null : cat.name)}
                            className={`px-2.5 py-1 rounded-lg text-[10.5px] font-extrabold uppercase tracking-wider border transition-all ${
                              selectedOccCategory === cat.name
                                ? 'bg-white text-black border-white'
                                : 'bg-white/[0.02] border-white/5 text-white/50 hover:text-white/80 hover:bg-white/5'
                            }`}
                          >
                            {cat.name}
                          </button>
                        ))}
                      </div>

                      {/* Display active category titles */}
                      {selectedOccCategory && (
                        <div 
                          className="p-2.5 bg-[#0D0D0D] border border-white/5 rounded-xl flex flex-wrap gap-1 max-h-36 overflow-y-auto"
                          onWheel={(e) => e.stopPropagation()}
                          onTouchMove={(e) => e.stopPropagation()}
                        >
                          {activeOccCategoryTitles.map(title => (
                            <button
                              key={title}
                              type="button"
                              onClick={() => {
                                setOccupation({ title, category: selectedOccCategory });
                                setOccupationEditMode(false);
                                setSelectedOccCategory(null);
                                setOccupationSearch('');
                              }}
                              className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[11px] font-bold text-white/80 hover:text-white border border-white/5 transition-colors"
                            >
                              {title}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Fallback to custom title */}
                    {occupationSearch.trim() && (
                      <div className="flex justify-between items-center p-2.5 bg-white/[0.02] border border-white/5 rounded-xl">
                        <span className="text-[11px] font-semibold text-white/50">Can't find your profession?</span>
                        <button
                          type="button"
                          onClick={() => {
                            const cleanTitle = occupationSearch.trim().slice(0, 50);
                            setOccupation({ title: cleanTitle, category: 'Freelance & Modern' });
                            setOccupationEditMode(false);
                            setOccupationSearch('');
                          }}
                          className="px-3 py-1.5 rounded-lg bg-white/10 border border-white/20 hover:bg-white/15 text-[10px] font-black uppercase tracking-wider text-white transition-colors"
                        >
                          Use "{occupationSearch.trim()}"
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* ── NEW EDUCATION SECTION ── */}
              <div ref={educationRef} className="p-4 rounded-xl bg-white/[0.01] border border-white/[0.04] space-y-4 transition-all">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <GraduationCap size={14} className="text-white/30" />
                    <span className="text-[11px] font-bold uppercase tracking-widest text-white/30">Education Profile</span>
                  </div>
                  <PrivacySelector 
                    value={privacySettings.education || 'public'} 
                    onChange={(val) => setPrivacySettings({ ...privacySettings, education: val as any })} 
                  />
                </div>

                {!educationEditMode && education ? (
                  <div className="flex items-center justify-between p-3.5 bg-white/[0.02] border border-white/[0.05] rounded-xl">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        {education.degree && (
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-white/5 border border-white/10 rounded text-white/80">
                            {education.degree}
                          </span>
                        )}
                        {education.fieldOfStudy && (
                          <span className="text-xs font-semibold text-white/80 italic">{education.fieldOfStudy}</span>
                        )}
                      </div>
                      <p className="text-sm font-bold text-white/95">{education.institution || 'Self-Taught'}</p>
                      {education.level && <p className="text-[10px] text-white/30 font-bold uppercase tracking-wider leading-none mt-1">{education.level}</p>}
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEduLevel(education.level || '');
                          setEduDegree(education.degree || '');
                          setEduField(education.fieldOfStudy || '');
                          setEduInstitution(education.institution || '');
                          setEducationEditMode(true);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-xs font-bold transition-colors"
                      >
                        Change
                      </button>
                      <button
                        type="button"
                        onClick={() => setEducation(null)}
                        className="p-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Education Level Command Palette */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-white/30 uppercase tracking-wider block px-0.5">Education Level</label>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => { setShowEduLevelDropdown(!showEduLevelDropdown); setShowDegreeDropdown(false); setShowFieldDropdown(false); }}
                          className="w-full flex items-center justify-between bg-white/[0.03] hover:bg-white/[0.06] text-white text-[13px] rounded-xl px-4 py-3 border border-white/[0.08] hover:border-white/20 outline-none font-semibold cursor-pointer transition-all"
                        >
                          <span className={eduLevel ? 'text-white font-bold uppercase tracking-wide text-[12px]' : 'text-white/30'}>{eduLevel || 'Select Level'}</span>
                          <ChevronDown size={14} className={`text-white/30 transition-transform duration-200 ${showEduLevelDropdown ? 'rotate-180' : ''}`} />
                        </button>
                        <AnimatePresence>
                          {showEduLevelDropdown && (
                            <>
                              <div className="fixed inset-0 z-40" onClick={() => setShowEduLevelDropdown(false)} />
                              <motion.div
                                initial={{ opacity: 0, y: -8, scale: 0.97 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -8, scale: 0.97 }}
                                transition={{ duration: 0.15, ease: 'easeOut' }}
                                className="absolute top-full mt-2 left-0 right-0 z-50 bg-[#111111]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.6)] overflow-hidden"
                              >
                                <div 
                                  className="max-h-52 overflow-y-auto p-1.5 space-y-0.5"
                                  onWheel={(e) => e.stopPropagation()}
                                  onTouchMove={(e) => e.stopPropagation()}
                                >
                                  {EDUCATION_LEVELS.map(level => (
                                    <button
                                      key={level}
                                      type="button"
                                      onClick={() => { setEduLevel(level); setShowEduLevelDropdown(false); }}
                                      className={`w-full text-left px-4 py-2.5 rounded-xl text-[12px] font-bold uppercase tracking-wide transition-all ${eduLevel === level ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white hover:bg-white/[0.06]'}`}
                                    >
                                      {level}
                                    </button>
                                  ))}
                                </div>
                              </motion.div>
                            </>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>

                    {/* Degree & Field split */}
                    <div className="grid grid-cols-2 gap-3">
                      {/* Degree Command Palette */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-white/30 uppercase tracking-wider block px-0.5">Degree</label>
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => { setShowDegreeDropdown(!showDegreeDropdown); setShowEduLevelDropdown(false); setShowFieldDropdown(false); }}
                            className="w-full flex items-center justify-between bg-white/[0.03] hover:bg-white/[0.06] text-white text-[13px] rounded-xl px-3 py-3 border border-white/[0.08] hover:border-white/20 outline-none font-semibold cursor-pointer transition-all"
                          >
                            <span className={eduDegree ? 'text-white font-bold' : 'text-white/30'}>{eduDegree || 'Degree'}</span>
                            <ChevronDown size={13} className={`text-white/30 transition-transform duration-200 ${showDegreeDropdown ? 'rotate-180' : ''}`} />
                          </button>
                          <AnimatePresence>
                            {showDegreeDropdown && (
                              <>
                                <div className="fixed inset-0 z-40" onClick={() => setShowDegreeDropdown(false)} />
                                <motion.div
                                  initial={{ opacity: 0, y: -8, scale: 0.97 }}
                                  animate={{ opacity: 1, y: 0, scale: 1 }}
                                  exit={{ opacity: 0, y: -8, scale: 0.97 }}
                                  transition={{ duration: 0.15, ease: 'easeOut' }}
                                  className="absolute top-full mt-2 left-0 right-0 z-50 bg-[#111111]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.6)] overflow-hidden min-w-[160px]"
                                >
                                  <div 
                                    className="max-h-44 overflow-y-auto p-1.5 space-y-0.5"
                                    onWheel={(e) => e.stopPropagation()}
                                    onTouchMove={(e) => e.stopPropagation()}
                                  >
                                    {DEGREES.map(deg => (
                                      <button
                                        key={deg}
                                        type="button"
                                        onClick={() => { handleDegreeChange(deg); setShowDegreeDropdown(false); }}
                                        className={`w-full text-left px-3 py-2 rounded-xl text-[12px] font-bold transition-all ${eduDegree === deg ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white hover:bg-white/[0.06]'}`}
                                      >
                                        {deg}
                                      </button>
                                    ))}
                                  </div>
                                </motion.div>
                              </>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>

                      {/* Field of Study Command Palette */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-white/30 uppercase tracking-wider block px-0.5">Field of Study</label>
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => { setShowFieldDropdown(!showFieldDropdown); setShowDegreeDropdown(false); setShowEduLevelDropdown(false); }}
                            className="w-full flex items-center justify-between bg-white/[0.03] hover:bg-white/[0.06] text-white text-[13px] rounded-xl px-3 py-3 border border-white/[0.08] hover:border-white/20 outline-none font-semibold cursor-pointer transition-all"
                          >
                            <span className={eduField ? 'text-white text-[12px]' : 'text-white/30 text-[12px]'}>{eduField || 'Field'}</span>
                            <ChevronDown size={13} className={`text-white/30 transition-transform duration-200 ${showFieldDropdown ? 'rotate-180' : ''}`} />
                          </button>
                          <AnimatePresence>
                            {showFieldDropdown && (
                              <>
                                <div className="fixed inset-0 z-40" onClick={() => setShowFieldDropdown(false)} />
                                <motion.div
                                  initial={{ opacity: 0, y: -8, scale: 0.97 }}
                                  animate={{ opacity: 1, y: 0, scale: 1 }}
                                  exit={{ opacity: 0, y: -8, scale: 0.97 }}
                                  transition={{ duration: 0.15, ease: 'easeOut' }}
                                  className="absolute top-full mt-2 left-0 right-0 z-50 bg-[#111111]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.6)] overflow-hidden min-w-[170px]"
                                >
                                  <div 
                                    className="max-h-44 overflow-y-auto p-1.5 space-y-0.5"
                                    onWheel={(e) => e.stopPropagation()}
                                    onTouchMove={(e) => e.stopPropagation()}
                                  >
                                    {FIELDS_OF_STUDY.map(field => (
                                      <button
                                        key={field}
                                        type="button"
                                        onClick={() => { handleFieldChange(field); setShowFieldDropdown(false); }}
                                        className={`w-full text-left px-3 py-2 rounded-xl text-[12px] font-semibold transition-all ${eduField === field ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white hover:bg-white/[0.06]'}`}
                                      >
                                        {field}
                                      </button>
                                    ))}
                                  </div>
                                </motion.div>
                              </>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    </div>


                    {/* Institution Selector */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-white/30 uppercase tracking-wider block px-0.5">Institution / School</label>
                      <input
                        type="text"
                        value={eduInstitution}
                        onChange={(e) => {
                          setEduInstitution(e.target.value);
                          setInstitutionSearch(e.target.value);
                        }}
                        placeholder="Search or enter institution (e.g. Stanford)..."
                        className="w-full bg-white/[0.02] hover:bg-white/[0.04] focus:bg-white/[0.04] text-white text-[14px] rounded-xl px-4 py-3 border border-white/[0.06] focus:border-white/20 outline-none placeholder:text-white/15 font-semibold transition-all"
                      />
                      
                      {/* Search suggestions */}
                      {locCountry && activeInstitutions.length > 0 && institutionSearch.trim() && (
                        <div 
                          className="p-1.5 bg-[#0D0D0D] border border-white/5 rounded-xl flex flex-col gap-0.5 max-h-40 overflow-y-auto"
                          onWheel={(e) => e.stopPropagation()}
                          onTouchMove={(e) => e.stopPropagation()}
                        >
                          {activeInstitutions.map(inst => (
                            <button
                              key={inst}
                              type="button"
                              onClick={() => {
                                setEduInstitution(inst);
                                setInstitutionSearch('');
                              }}
                              className="w-full text-left px-3 py-2 text-xs font-bold text-white/60 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                            >
                              {inst}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Submit Actions */}
                    <div className="flex gap-2 justify-end pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setEducationEditMode(false);
                          setEduLevel('');
                          setEduDegree('');
                          setEduField('');
                          setEduInstitution('');
                        }}
                        className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-bold transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const hasDetails = eduLevel || eduDegree || eduField || eduInstitution.trim();
                          if (!hasDetails) {
                            setErrorMsg('Please enter or select at least one academic detail.');
                            return;
                          }
                          setEducation({
                            level: eduLevel || undefined,
                            degree: eduDegree || undefined,
                            fieldOfStudy: eduField || undefined,
                            institution: eduInstitution.trim() || undefined
                          });
                          setEducationEditMode(false);
                          setEduLevel('');
                          setEduDegree('');
                          setEduField('');
                          setEduInstitution('');
                        }}
                        className="px-4 py-2 rounded-lg bg-white text-black font-bold text-xs hover:bg-neutral-200 transition-colors"
                      >
                        Set Academic
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* ── NEW LOCATION SECTION ── */}
              <div ref={locationRef} className="p-4 rounded-xl bg-white/[0.01] border border-white/[0.04] space-y-4 transition-all">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <MapPin size={14} className="text-white/30" />
                    <span className="text-[11px] font-bold uppercase tracking-widest text-white/30">Location details</span>
                  </div>
                  <PrivacySelector 
                    value={privacySettings.location || 'public'} 
                    onChange={(val) => setPrivacySettings({ ...privacySettings, location: val as any })} 
                  />
                </div>

                {!locationEditMode && location ? (
                  <div className="flex items-center justify-between p-3.5 bg-white/[0.02] border border-white/[0.05] rounded-xl">
                    <div className="flex items-center gap-2.5">
                      <span className="text-lg leading-none select-none">
                        {COUNTRIES[location.country || '']?.flag || '📍'}
                      </span>
                      <div>
                        <p className="text-sm font-bold text-white/95">{compiledLocationString}</p>
                        <p className="text-[10px] text-white/30 font-bold uppercase tracking-wider leading-none mt-1">Country: {location.country}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setLocCountry(location.country || '');
                          setLocState(location.state || '');
                          setLocCity(location.city || '');
                          setLocationEditMode(true);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-xs font-bold transition-colors"
                      >
                        Change
                      </button>
                      <button
                        type="button"
                        onClick={() => setLocation(null)}
                        className="p-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Country Command Palette */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-white/30 uppercase tracking-wider block px-0.5">Country / Region</label>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => { setShowCountryDropdown(!showCountryDropdown); setShowStateDropdown(false); setShowCityDropdown(false); }}
                          className="w-full flex items-center justify-between bg-white/[0.03] hover:bg-white/[0.06] text-white text-[13px] rounded-xl px-4 py-3 border border-white/[0.08] hover:border-white/20 outline-none font-semibold cursor-pointer transition-all"
                        >
                          <span className="flex items-center gap-2">
                            {locCountry ? (
                              <><span className="text-base leading-none">{COUNTRIES[locCountry]?.flag}</span><span>{locCountry}</span></>
                            ) : (
                              <span className="text-white/30">Select Country</span>
                            )}
                          </span>
                          <ChevronDown size={14} className={`text-white/30 transition-transform duration-200 ${showCountryDropdown ? 'rotate-180' : ''}`} />
                        </button>
                        <AnimatePresence>
                          {showCountryDropdown && (
                            <>
                              <div className="fixed inset-0 z-40" onClick={() => setShowCountryDropdown(false)} />
                              <motion.div
                                initial={{ opacity: 0, y: -8, scale: 0.97 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -8, scale: 0.97 }}
                                transition={{ duration: 0.15, ease: 'easeOut' }}
                                className="absolute top-full mt-2 left-0 right-0 z-50 bg-[#111111]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.6)] overflow-hidden"
                              >
                                <div className="p-2 border-b border-white/[0.06]">
                                  <input
                                    autoFocus
                                    type="text"
                                    value={countrySearch}
                                    onChange={(e) => setCountrySearch(e.target.value)}
                                    placeholder="Search country..."
                                    className="w-full bg-white/[0.04] text-white text-[13px] rounded-xl px-3 py-2.5 outline-none placeholder:text-white/20 font-semibold border border-white/[0.06] focus:border-white/15"
                                  />
                                </div>
                                <div 
                                  className="max-h-52 overflow-y-auto p-1.5 space-y-0.5"
                                  onWheel={(e) => e.stopPropagation()}
                                  onTouchMove={(e) => e.stopPropagation()}
                                >
                                  {filteredCountries.map(name => (
                                    <button
                                      key={name}
                                      type="button"
                                      onClick={() => {
                                        setLocCountry(name);
                                        setLocState('');
                                        setLocCity('');
                                        setStateSearch('');
                                        setCitySearch('');
                                        setShowCountryDropdown(false);
                                        setCountrySearch('');
                                      }}
                                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-[13px] font-semibold transition-all ${locCountry === name ? 'bg-white/10 text-white' : 'text-white/60 hover:text-white hover:bg-white/[0.06]'}`}
                                    >
                                      <span className="text-base leading-none">{COUNTRIES[name].flag}</span>
                                      <span>{name}</span>
                                      <span className="ml-auto text-[10px] font-black text-white/20 tracking-wider">{COUNTRIES[name].code}</span>
                                    </button>
                                  ))}
                                  {countrySearch.trim() && !filteredCountries.includes(countrySearch.trim()) && (
                                    <div className="p-1 border-t border-white/[0.06] mt-0.5">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const customName = countrySearch.trim();
                                          setLocCountry(customName);
                                          setLocState('');
                                          setLocCity('');
                                          setCountrySearch('');
                                          setShowCountryDropdown(false);
                                        }}
                                        className="w-full text-left px-3 py-2 rounded-xl text-[12px] font-bold text-purple-400 hover:bg-white/[0.06] transition-all"
                                      >
                                        Use custom: "{countrySearch.trim()}"
                                      </button>
                                    </div>
                                  )}
                                </div>
                               </motion.div>
                            </>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>

                    {/* Cascading State & City */}
                    <div className="grid grid-cols-2 gap-3">
                      {/* State Command Palette */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-white/30 uppercase tracking-wider block px-0.5">State / Region</label>
                        <div className="relative">
                          <button
                            type="button"
                            disabled={!locCountry}
                            onClick={() => { setShowStateDropdown(!showStateDropdown); setShowCityDropdown(false); }}
                            className="w-full flex items-center justify-between bg-white/[0.03] hover:bg-white/[0.06] text-white text-[13px] rounded-xl px-3 py-3 border border-white/[0.08] hover:border-white/20 outline-none font-semibold cursor-pointer transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <span className={locState ? 'text-white' : 'text-white/30'}>{locState || 'State'}</span>
                            <ChevronDown size={13} className={`text-white/30 transition-transform duration-200 ${showStateDropdown ? 'rotate-180' : ''}`} />
                          </button>
                          <AnimatePresence>
                            {showStateDropdown && (
                              <>
                                <div className="fixed inset-0 z-40" onClick={() => setShowStateDropdown(false)} />
                                <motion.div
                                  initial={{ opacity: 0, y: -8, scale: 0.97 }}
                                  animate={{ opacity: 1, y: 0, scale: 1 }}
                                  exit={{ opacity: 0, y: -8, scale: 0.97 }}
                                  transition={{ duration: 0.15, ease: 'easeOut' }}
                                  className="absolute top-full mt-2 left-0 right-0 z-50 bg-[#111111]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.6)] overflow-hidden min-w-[180px]"
                                >
                                  <div className="p-2 border-b border-white/[0.06]">
                                    <input
                                      autoFocus
                                      type="text"
                                      value={stateSearch}
                                      onChange={(e) => setStateSearch(e.target.value)}
                                      placeholder="Search state..."
                                      className="w-full bg-white/[0.04] text-white text-[12px] rounded-xl px-3 py-2 outline-none placeholder:text-white/20 font-semibold border border-white/[0.06] focus:border-white/15"
                                    />
                                  </div>
                                  <div 
                                    className="max-h-44 overflow-y-auto p-1.5 space-y-0.5"
                                    onWheel={(e) => e.stopPropagation()}
                                    onTouchMove={(e) => e.stopPropagation()}
                                  >
                                    {activeStates.map(state => (
                                      <button
                                        key={state}
                                        type="button"
                                        onClick={() => {
                                          setLocState(state);
                                          setLocCity('');
                                          setCitySearch('');
                                          setStateSearch('');
                                          setShowStateDropdown(false);
                                        }}
                                        className={`w-full text-left px-3 py-2 rounded-xl text-[12px] font-semibold transition-all ${locState === state ? 'bg-white/10 text-white' : 'text-white/60 hover:text-white hover:bg-white/[0.06]'}`}
                                      >
                                        {state}
                                      </button>
                                    ))}
                                  {stateSearch.trim() && !activeStates.includes(stateSearch.trim()) && (
                                    <div className="p-1 border-t border-white/[0.06] mt-0.5">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setLocState(stateSearch.trim());
                                          setLocCity('');
                                          setCitySearch('');
                                          setStateSearch('');
                                          setShowStateDropdown(false);
                                        }}
                                        className="w-full text-left px-3 py-2 rounded-xl text-[12px] font-bold text-purple-400 hover:bg-white/[0.06] transition-all"
                                      >
                                        Use custom: "{stateSearch.trim()}"
                                      </button>
                                    </div>
                                  )}
                                  </div>
                                </motion.div>
                              </>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>

                      {/* City Command Palette */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-white/30 uppercase tracking-wider block px-0.5">City</label>
                        <div className="relative">
                          <button
                            type="button"
                            disabled={!locState}
                            onClick={() => { setShowCityDropdown(!showCityDropdown); setShowStateDropdown(false); }}
                            className="w-full flex items-center justify-between bg-white/[0.03] hover:bg-white/[0.06] text-white text-[13px] rounded-xl px-3 py-3 border border-white/[0.08] hover:border-white/20 outline-none font-semibold cursor-pointer transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <span className={locCity ? 'text-white' : 'text-white/30'}>{locCity || 'City'}</span>
                            <ChevronDown size={13} className={`text-white/30 transition-transform duration-200 ${showCityDropdown ? 'rotate-180' : ''}`} />
                          </button>
                          <AnimatePresence>
                            {showCityDropdown && (
                              <>
                                <div className="fixed inset-0 z-40" onClick={() => setShowCityDropdown(false)} />
                                <motion.div
                                  initial={{ opacity: 0, y: -8, scale: 0.97 }}
                                  animate={{ opacity: 1, y: 0, scale: 1 }}
                                  exit={{ opacity: 0, y: -8, scale: 0.97 }}
                                  transition={{ duration: 0.15, ease: 'easeOut' }}
                                  className="absolute top-full mt-2 left-0 right-0 z-50 bg-[#111111]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.6)] overflow-hidden min-w-[180px]"
                                >
                                  <div className="p-2 border-b border-white/[0.06]">
                                    <input
                                      autoFocus
                                      type="text"
                                      value={citySearch}
                                      onChange={(e) => setCitySearch(e.target.value)}
                                      placeholder="Search city..."
                                      className="w-full bg-white/[0.04] text-white text-[12px] rounded-xl px-3 py-2 outline-none placeholder:text-white/20 font-semibold border border-white/[0.06] focus:border-white/15"
                                    />
                                  </div>
                                  <div 
                                    className="max-h-44 overflow-y-auto p-1.5 space-y-0.5"
                                    onWheel={(e) => e.stopPropagation()}
                                    onTouchMove={(e) => e.stopPropagation()}
                                  >
                                    {activeCities.map(city => (
                                      <button
                                        key={city}
                                        type="button"
                                        onClick={() => {
                                          setLocCity(city);
                                          setCitySearch('');
                                          setShowCityDropdown(false);
                                        }}
                                        className={`w-full text-left px-3 py-2 rounded-xl text-[12px] font-semibold transition-all ${locCity === city ? 'bg-white/10 text-white' : 'text-white/60 hover:text-white hover:bg-white/[0.06]'}`}
                                      >
                                        {city}
                                      </button>
                                    ))}
                                  {citySearch.trim() && !activeCities.includes(citySearch.trim()) && (
                                    <div className="p-1 border-t border-white/[0.06] mt-0.5">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setLocCity(citySearch.trim());
                                          setCitySearch('');
                                          setShowCityDropdown(false);
                                        }}
                                        className="w-full text-left px-3 py-2 rounded-xl text-[12px] font-bold text-purple-400 hover:bg-white/[0.06] transition-all"
                                      >
                                        Use custom: "{citySearch.trim()}"
                                      </button>
                                    </div>
                                  )}
                                  </div>
                                </motion.div>
                              </>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    </div>

                    {/* Submit Actions */}
                    <div className="flex gap-2 justify-end pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setLocationEditMode(false);
                          setLocCountry('');
                          setLocState('');
                          setLocCity('');
                          setCountrySearch('');
                          setStateSearch('');
                          setCitySearch('');
                        }}
                        className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-bold transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={!locCountry}
                        onClick={() => {
                          setLocation({
                            country: locCountry || undefined,
                            state: locState || undefined,
                            city: locCity || undefined
                          });
                          setLocationEditMode(false);
                          setLocCountry('');
                          setLocState('');
                          setLocCity('');
                          setCountrySearch('');
                          setStateSearch('');
                          setCitySearch('');
                        }}
                        className="px-4 py-2 rounded-lg bg-white text-black font-bold text-xs hover:bg-neutral-200 transition-colors disabled:opacity-40"
                      >
                        Set Location
                      </button>
                    </div>
                  </div>
                )}

              </div>

              {/* ── PRONOUNS SECTION ── */}
              <div ref={pronounsRef} className="p-4 rounded-xl bg-white/[0.01] border border-white/[0.04] space-y-4 transition-all">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Link2 size={14} className="text-white/30" />
                    <span className="text-[11px] font-bold uppercase tracking-widest text-white/30">Pronouns</span>
                  </div>
                  <PrivacySelector 
                    value={privacySettings.pronouns || 'public'} 
                    onChange={(val) => setPrivacySettings({ ...privacySettings, pronouns: val as any })} 
                  />
                </div>

                {!pronounsEditMode && pronouns ? (
                  <div className="flex items-center justify-between p-3.5 bg-white/[0.02] border border-white/[0.05] rounded-xl">
                    <p className="text-sm font-bold text-white/90 lowercase">{pronouns}</p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setPronounSearch(pronouns);
                          setPronounsEditMode(true);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-xs font-bold transition-colors"
                      >
                        Change
                      </button>
                      <button
                        type="button"
                        onClick={() => setPronouns('')}
                        className="p-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {isCustomPronoun ? (
                      <input
                        type="text"
                        value={pronounSearch}
                        onChange={(e) => {
                          const val = e.target.value.toLowerCase();
                          if (val.includes(' ')) return;
                          if (val.length > 3) return;
                          const blocked = ['ass', 'fuk', 'fuc', 'sex', 'cum', 'dik', 'dic', 'vag', 'tit', 'gay', 'fag', 'hoe', 'xxx', 'kys', 'bch', 'wtx'];
                          if (blocked.includes(val)) return;
                          setPronounSearch(val);
                        }}
                        placeholder="Custom (e.g. sir)..."
                        className="w-full bg-white/[0.02] hover:bg-white/[0.04] focus:bg-white/[0.04] text-white text-[14px] rounded-xl px-4 py-3 border border-white/[0.06] focus:border-white/20 outline-none placeholder:text-white/15 font-semibold transition-all"
                      />
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {PRONOUNS.map(p => (
                          <button
                            key={p}
                            type="button"
                            onClick={() => {
                              setPronouns(p);
                              setPronounsEditMode(false);
                            }}
                            className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-white/80 border border-white/5 transition-colors"
                          >
                            {p}
                          </button>
                        ))}
                      </div>
                    )}

                    <div className="flex gap-2 justify-between pt-1">
                      <button
                        type="button"
                        onClick={() => setIsCustomPronoun(!isCustomPronoun)}
                        className="text-xs text-indigo-400 font-bold hover:underline"
                      >
                        {isCustomPronoun ? 'Use defaults' : 'Use custom'}
                      </button>
                      
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setPronounsEditMode(false);
                            setIsCustomPronoun(false);
                            setPronounSearch('');
                          }}
                          className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-bold transition-colors"
                        >
                          Cancel
                        </button>
                        {isCustomPronoun && (
                          <button
                            type="button"
                            disabled={!pronounSearch.trim()}
                            onClick={() => {
                              const cleanP = pronounSearch.trim().slice(0, 3);
                              setPronouns(cleanP);
                              setPronounsEditMode(false);
                              setIsCustomPronoun(false);
                              setPronounSearch('');
                            }}
                            className="px-4 py-2 rounded-lg bg-white text-black font-bold text-xs hover:bg-neutral-200 transition-colors disabled:opacity-40"
                          >
                            Save
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* ── CUSTOM WEBSITE LINK ── */}
              <div ref={websiteRef} className="p-4 rounded-xl bg-white/[0.01] border border-white/[0.04] space-y-4 transition-all">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Link2 size={14} className="text-white/30" />
                    <span className="text-[11px] font-bold uppercase tracking-widest text-white/30">Custom website link</span>
                  </div>
                  <PrivacySelector 
                    value={privacySettings.customLink || 'public'} 
                    onChange={(val) => setPrivacySettings({ ...privacySettings, customLink: val as any })} 
                  />
                </div>

                <input
                  type="text"
                  value={customLink}
                  onChange={(e) => setCustomLink(e.target.value)}
                  placeholder="e.g. github.com/shayan"
                  className="w-full bg-white/[0.02] hover:bg-white/[0.04] focus:bg-white/[0.04] text-white text-[14px] rounded-xl px-4 py-3.5 border border-white/[0.06] focus:border-white/20 outline-none transition-all placeholder:text-white/15 font-semibold"
                />
              </div>

              {/* Privacy Toggles */}
              <div className="space-y-3">
                <label className="block text-[11px] font-extrabold text-neutral-400 uppercase tracking-wider px-1">Privacy & Safety</label>
                
                {/* Account privacy toggle */}
                <button
                  type="button"
                  onClick={() => setIsPrivate(!isPrivate)}
                  className="w-full flex items-center justify-between p-4 bg-white/[0.02] rounded-xl border border-white/[0.06] hover:bg-white/[0.04] transition-colors text-left group"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${isPrivate ? 'bg-white/10 text-white' : 'bg-white/5 text-white/40'}`}>
                      {isPrivate ? <Lock size={15} /> : <Globe size={15} />}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white/90">
                        {isPrivate ? 'Private Profile' : 'Public Profile'}
                      </p>
                      <p className="text-[10px] text-white/30 mt-0.5 leading-none">
                        {isPrivate ? 'Only mutuals see archives' : 'Anyone can view archives'}
                      </p>
                    </div>
                  </div>
                  <div className={`w-8 h-5 rounded-full relative transition-colors ${isPrivate ? 'bg-white' : 'bg-white/10'}`}>
                    <motion.div
                      animate={{ x: isPrivate ? 14 : 2 }}
                      className={`absolute top-0.5 w-4 h-4 rounded-full ${isPrivate ? 'bg-black' : 'bg-white/40'}`}
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    />
                  </div>
                </button>

                {/* Birthday visibility toggle */}
                <button
                  type="button"
                  onClick={() => setBirthdayVisible(!birthdayVisible)}
                  className="w-full flex items-center justify-between p-4 bg-white/[0.02] rounded-xl border border-white/[0.06] hover:bg-white/[0.04] transition-colors text-left group"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${birthdayVisible ? 'bg-white/10 text-white' : 'bg-white/5 text-white/40'}`}>
                      <Calendar size={15} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white/90">
                        Birthday Visibility
                      </p>
                      <p className="text-[10px] text-white/30 mt-0.5 leading-none">
                        {birthdayVisible ? 'Visible on profile' : 'Hidden from everyone'}
                      </p>
                    </div>
                  </div>
                  <div className={`w-8 h-5 rounded-full relative transition-colors ${birthdayVisible ? 'bg-white' : 'bg-white/10'}`}>
                    <motion.div
                      animate={{ x: birthdayVisible ? 14 : 2 }}
                      className={`absolute top-0.5 w-4 h-4 rounded-full ${birthdayVisible ? 'bg-black' : 'bg-white/40'}`}
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    />
                  </div>
                </button>
              </div>

              {errorMsg && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-start gap-3 p-4 bg-rose-500/5 border border-rose-500/20 rounded-2xl"
                >
                  <AlertCircle size={14} className="text-rose-400 mt-0.5 shrink-0" />
                  <p className="text-[12.5px] text-rose-300 font-semibold leading-relaxed">
                    {errorMsg}
                  </p>
                </motion.div>
              )}
            </div>
          </div>

          {/* Action Footer */}
          <div className="p-4 border-t border-white/[0.06] bg-[#0A0A0A] shrink-0">
            <button
              type="button"
              onClick={validateAndSave}
              disabled={isSaving || savedOk || (usernameChanged && !canSaveUsername) || usernameState === 'checking'}
              className="w-full py-4 rounded-xl bg-white text-black text-[14px] font-bold hover:bg-neutral-200 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-xl"
            >
              {isSaving ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Saving Profile...
                </>
              ) : savedOk ? (
                <>
                  <Check size={16} />
                  Profile Updated
                </>
              ) : usernameState === 'checking' ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Validating Username...
                </>
              ) : (
                'Confirm Changes'
              )}
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>

    {/* ── Identity Guidelines Moderation Modal ── */}
    <AnimatePresence>
      {showModerationModal && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] bg-black/80 backdrop-blur-md"
            onClick={() => setShowModerationModal(false)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="fixed inset-0 z-[301] flex items-center justify-center p-6 pointer-events-none"
          >
            <div className="pointer-events-auto w-full max-w-sm bg-[#0F0F0F] border border-rose-500/20 rounded-3xl shadow-[0_0_80px_rgba(239,68,68,0.12)] overflow-hidden">
              {/* Glow bar */}
              <div className="h-px w-full bg-gradient-to-r from-transparent via-rose-500/60 to-transparent" />
              
              <div className="p-7 space-y-5">
                {/* Icon + Title */}
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0 mt-0.5">
                    <ShieldAlert size={18} className="text-rose-400" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-[15px] font-black text-white tracking-tight">Identity Guidelines</h3>
                    <p className="text-[11px] text-rose-400/80 font-bold uppercase tracking-widest">Content Policy Violation</p>
                  </div>
                </div>

                {/* Body */}
                <p className="text-[13px] text-white/60 leading-relaxed font-medium">
                  Please avoid offensive, explicit, or harmful language in public identity sections. Verlyn is designed to maintain a respectful and professional environment for everyone.
                </p>

                {/* Policy note */}
                <div className="p-3.5 bg-white/[0.02] border border-white/[0.05] rounded-2xl">
                  <p className="text-[11px] text-white/35 leading-relaxed font-medium">
                    Repeated violations may result in temporary edit restrictions or silent moderation review. Keep your identity clean, professional, and human.
                  </p>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowModerationModal(false)}
                    className="flex-1 py-3 rounded-2xl bg-rose-500/10 hover:bg-rose-500/15 border border-rose-500/20 text-rose-400 text-[13px] font-bold transition-all active:scale-[0.98]"
                  >
                    Edit Input
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowModerationModal(false)}
                    className="flex-1 py-3 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-white/60 text-[13px] font-bold transition-all active:scale-[0.98]"
                  >
                    Understand Policy
                  </button>
                </div>
              </div>

              {/* Bottom glow bar */}
              <div className="h-px w-full bg-gradient-to-r from-transparent via-rose-500/30 to-transparent" />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
    </>
  );
}

function PrivacySelector({
  value,
  onChange
}: {
  value: string;
  onChange: (val: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const options = [
    { key: 'public', label: 'Public', icon: Globe },
    { key: 'followers', label: 'Followers', icon: UserCheck },
    { key: 'mutuals', label: 'Mutuals', icon: Users },
    { key: 'private', label: 'Private', icon: EyeOff }
  ];
  const active = options.find(o => o.key === value) || options[0];
  const ActiveIcon = active.icon;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 text-[10px] font-bold text-white/50 hover:text-white/80 transition-colors"
      >
        <ActiveIcon size={11} />
        <span className="uppercase tracking-wider">{active.label}</span>
        <ChevronDown size={10} className={`opacity-60 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-1.5 z-50 bg-[#0F0F0F] border border-white/10 rounded-xl p-1 shadow-2xl w-32 flex flex-col gap-0.5">
            {options.map(opt => {
              const OptIcon = opt.icon;
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => {
                    onChange(opt.key);
                    setOpen(false);
                  }}
                  className={`flex items-center gap-2 w-full px-2.5 py-1.5 rounded-lg text-left text-xs font-semibold transition-colors ${
                    opt.key === value ? 'bg-white/10 text-white' : 'text-white/40 hover:bg-white/5 hover:text-white/70'
                  }`}
                >
                  <OptIcon size={12} />
                  {opt.label}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
