'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { checkUsernameExists } from '@/app/(main)/profile/actionsCore';
import { useAppStore } from '@/lib/store';
import { Loader2 } from 'lucide-react';

interface BioTextProps {
  bio: string;
  profileUsername?: string;
}

const FUNNY_MESSAGES = [
  "Clicking your own handle? Talk about self-obsession! 😂",
  "Plot twist: You clicked your own name. Did you forget who you were? 🧠",
  "Are you trying to follow yourself? That's next-level loneliness! 🤍",
  "Self-mentions in your bio... trying to increase your own view count, eh? 📈",
  "Nice try, but you can't escape your own profile. You're stuck with you! 🌌",
  "Infinite loop detected! Clicking yourself won't make you twice as cool. 🌀",
  "Error 404: New friends not found, so you clicked yourself. Ouch! 🥲",
  "Are you testing the developer's code or just checking yourself out in the mirror? 🪞",
  "High-fiving yourself in public? We won't tell anyone. 🤫✋",
  "If you click yourself again, I might have to start charging you rent! 🏠",
  "This profile belongs to a legend... in their own mind! 🏆",
  "Self-mentions? The absolute peak of 'source: trust me bro'. 💪",
  "Warning: Clicking yourself repeatedly is the digital equivalent of pacing in circles. 🤖",
  "Did you expect a secret animation? Best I can do is this roast. 🎟️",
  "You clicked yourself. Do you want a participation trophy? 🏆",
  "Poking your own tag? Please, save some clicks for other people! 🌍",
  "Stop clicking yourself, you're going to wear out your trackpad! 🖱️",
  "You have successfully traveled... zero pixels! Congratulations! 📍",
  "Congratulations, you found the 'I have no other profiles to click' button! 🤫",
  "You clicked your own handle. 0 points to Gryffindor for self-poking! 🦁",
  "Processing... Yep, you are still you. No upgrades detected. ⚡",
  "You just clicked yourself. Somewhere, a developer is shaking their head. 💻",
  "Double-checking your own existence? Still here, still clicking yourself. 🧠",
  "Rumor has it, if you click this 100 times, you still won't find anyone else. 🎟️",
  "Knock knock. Who's there? The person who just clicked their own name. 🚪",
  "Checking your own bio? Yep, you wrote it. Good job! 📝",
  "Clicking yourself is like calling your own phone number and getting mad it's busy. ☎️",
  "Self-referential click. Even the database is yawning. 🥱",
  "You're trying to sneak into your own profile. Sneak level: 0. 🎬",
  "Searching for your own profile? Spoiler: You're standing right in it. 🎪",
  "Did you think this was a portal? It's just a reminder you're still here. 🗝️",
  "That's a nice click, but maybe try making some actual connections? 🌍",
  "You clicked yourself. Gravity is still holding you, and you're still on your own page. 🍎",
  "Self-discovery complete: You are still clicking on yourself. 🧬",
  "You clicked your own tag. A round of applause for your number one fan—yourself! 👏"
];

const PROFILE_OWNER_ROASTS = [
  "Why is @{name} mentioning themselves? Do they need a reminder of who they are? 🧐",
  "Clicking @{name}'s tag? There's already a whole profile about them right here! 🎪",
  "Looks like @{name} is their own biggest fan. Can't blame them! 📣",
  "Clicking @{name} inside @{name}'s bio. A monument of self-appreciation! 🏆",
  "Legend says @{name} clicks this button daily for a little dopamine hit. 😂",
  "You clicked @{name}. Yep, still the same person whose page you are currently viewing! 📍",
  "Error: Redirecting to @{name}... wait, you are already looking at them! 🌀",
  "Does @{name} think this bio link is a secret portal? Spoiler: It just loops! 🗝️",
  "Clicking @{name}? We get it, they are extremely popular in their own bio! 📈",
  "Plot twist: @{name} put this link here just to see who would click it. You fell for it! 🎣",
  "Double @{name} combo! You've reached peak profile navigation. 👾",
  "If you click @{name} one more time, they might get a notification that you're staring! 👁️",
  "Why click @{name} when you can send them a direct message and make their day? 💬",
  "Is @{name} trying to build backlinks to their own page? Bold SEO strategy! 💻",
  "You clicked @{name}. They appreciate the extra attention! 🤍",
  "Clicking @{name}'s own tag on @{name}'s own bio. Meta-level self-promotion! 🎬",
  "Did you expect @{name} to turn into a meme? They already are! 🎭",
  "Poking @{name} on their own territory. Brave! 🦁",
  "This link leads directly to... the exact page you are on. Revolutionary, @{name}! 👏",
  "You clicked @{name}. Somewhere, @{name} is smiling because their link worked. 😊",
  "Rumor has it @{name} added this tag because they like seeing their name in violet. 🎨",
  "You clicked @{name}. No upgrades or secret levels found for this user. ⚡",
  "Warning: Clicking @{name} on this page causes extreme recursion of vanity! 🤖",
  "Stop clicking @{name}, you'll wear out the follow button instead! 🖱️",
  "Self-referencing bio tags are @{name}'s specialty. Let's admire it. 🥇",
  "You just clicked @{name}. They are currently busy being awesome. 😎",
  "No matter how many times you click @{name}, they will still be the owner of this page. 🏡",
  "A round of applause for @{name} for pointing us back to @{name}! 👏👏",
  "You clicked @{name}. Did you think it would show their secret stash of posts? 🤫",
  "Is @{name} checking if their own bio link works? Yes, it works perfectly. 🧪",
  "Clicking @{name} is like looking at a mirror of a mirror. 🪞",
  "We hope @{name} bought you a coffee before you clicked their name. ☕",
  "You clicked @{name}. They are 100% verified to be themselves. 🧬",
  "Why is @{name} linking to themselves? Self-navigation is the future! 🗺️",
  "You clicked @{name}. They are still the main character of this page. 🎪",
  "Does @{name} get a royalty every time someone clicks their tag? 🪙",
  "Clicking @{name} on @{name}'s bio. A flawless exercise in self-referencing! 📖",
  "If @{name} was any more self-referential, they'd be a dictionary definition! 📚",
  "Congratulations, you successfully loaded @{name}. Again. 🔄",
  "You clicked @{name}. They are currently holding the record for bio self-mentions. 🏆",
  "Clicking @{name}? That's one small click for you, one giant ego boost for @{name}! 🚀",
  "Is @{name} trying to summon themselves by linking their name? 🧙‍♂️"
];

export default function BioText({ bio, profileUsername }: BioTextProps) {
  const router = useRouter();
  const currentUser = useAppStore(s => s.currentUser);
  const [loadingUsername, setLoadingUsername] = useState<string | null>(null);

  if (!bio) return null;

  // Split bio by username mentions like @username
  const parts = bio.split(/(@[a-zA-Z0-9_.]+)/g);

  const handleMentionClick = async (mention: string) => {
    const username = mention.replace('@', '').trim();
    if (!username) return;

    // Case 1: Logged-in user clicking their own handle
    if (currentUser?.username && currentUser.username.toLowerCase() === username.toLowerCase()) {
      const randomMsg = FUNNY_MESSAGES[Math.floor(Math.random() * FUNNY_MESSAGES.length)];
      window.dispatchEvent(
        new CustomEvent('verlyn:toast', {
          detail: {
            message: randomMsg,
            type: 'success',
          },
        })
      );
      return;
    }

    // Case 2: Visitor clicking profile owner's self-mention handle
    if (profileUsername && profileUsername.toLowerCase() === username.toLowerCase()) {
      const randomMsg = PROFILE_OWNER_ROASTS[Math.floor(Math.random() * PROFILE_OWNER_ROASTS.length)]
        .replace(/{name}/g, profileUsername);
      window.dispatchEvent(
        new CustomEvent('verlyn:toast', {
          detail: {
            message: randomMsg,
            type: 'success',
          },
        })
      );
      return;
    }

    setLoadingUsername(mention);
    try {
      const exists = await checkUsernameExists(username);
      if (exists) {
        router.push(`/profile/${username}`);
      } else {
        window.dispatchEvent(
          new CustomEvent('verlyn:toast', {
            detail: {
              message: `The profile @${username} does not exist on Verlyn Network.`,
              type: 'error',
            },
          })
        );
      }
    } catch (err) {
      console.error('Failed to resolve mention:', err);
    } finally {
      setLoadingUsername(null);
    }
  };

  return (
    <>
      {parts.map((part, index) => {
        const isMention = part.startsWith('@') && part.length > 1;
        if (isMention) {
          const isLoading = loadingUsername === part;
          return (
            <span
              key={index}
              onClick={() => !isLoading && handleMentionClick(part)}
              className="inline-flex items-center gap-1 text-violet-400 hover:text-violet-300 hover:underline cursor-pointer font-bold transition-colors select-none"
            >
              {part}
              {isLoading && <Loader2 size={10} className="animate-spin text-violet-400" />}
            </span>
          );
        }
        return <React.Fragment key={index}>{part}</React.Fragment>;
      })}
    </>
  );
}
