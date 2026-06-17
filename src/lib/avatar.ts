// Deterministic avatar generator based on nickname
export function getAvatarData(nickname: string) {
  const emojis = ["🎤", "🎵", "🎸", "🎧", "🎹", "🎶", "🌟", "🔥", "🦄", "🐼", "🦊", "🐱", "🦁", "🐨"];
  const gradients = [
    "from-purple-500 to-indigo-500",
    "from-blue-500 to-cyan-500",
    "from-pink-500 to-rose-500",
    "from-emerald-500 to-teal-500",
    "from-amber-500 to-orange-500",
    "from-red-500 to-pink-500",
  ];
  
  let hash = 0;
  for (let i = 0; i < nickname.length; i++) {
    hash = nickname.charCodeAt(i) + ((hash << 5) - hash);
  }
  hash = Math.abs(hash);
  
  const emoji = emojis[hash % emojis.length];
  const gradient = gradients[hash % gradients.length];
  const initials = nickname.replace(/[^a-zA-Z0-9]/g, "").slice(0, 2).toUpperCase() || "🎤";
  
  return { emoji, gradient, initials };
}
