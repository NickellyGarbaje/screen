import { User, Post } from '../types';

const KEYS = {
  USERS: 'screen_db_users',
  POSTS: 'screen_db_posts',
  CURRENT_USER: 'screen_session_user'
};

// --- Helpers ---

const getStorage = <T>(key: string, defaultVal: T): T => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultVal;
  } catch {
    return defaultVal;
  }
};

const setStorage = (key: string, value: any) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error("Storage Quota Exceeded usually", e);
    throw new Error("STORAGE_FULL_DELETE_OLD_POSTS");
  }
};

// --- Auth Service ---

export const loginUser = (username: string): User => {
  const users = getStorage<User[]>(KEYS.USERS, []);
  // Case insensitive search
  let user = users.find(u => u.username.toLowerCase() === username.toLowerCase());
  
  if (!user) {
    // Auto-create for this demo if doesn't exist, or throw error depending on desired UX
    // Let's implement strict "Sign Up" vs "Login" logic in UI, but here we check existence
    throw new Error("User not found");
  }

  // FIX: Save the canonical username from the database to ensure consistency
  localStorage.setItem(KEYS.CURRENT_USER, user.username);
  return user;
};

export const registerUser = (username: string): User => {
  const users = getStorage<User[]>(KEYS.USERS, []);
  if (users.find(u => u.username.toLowerCase() === username.toLowerCase())) {
    throw new Error("Username taken");
  }

  const newUser: User = {
    username,
    joinedAt: new Date().toISOString(),
    // Generate a simple blocky avatar
    avatar: `https://api.dicebear.com/7.x/shapes/svg?seed=${username}`
  };

  users.push(newUser);
  setStorage(KEYS.USERS, users);
  localStorage.setItem(KEYS.CURRENT_USER, username);
  return newUser;
};

export const getCurrentUser = (): User | null => {
  const username = localStorage.getItem(KEYS.CURRENT_USER);
  if (!username) return null;
  const users = getStorage<User[]>(KEYS.USERS, []);
  // Robust lookup: case insensitive match ensures session stays valid even if casing drifted
  return users.find(u => u.username.toLowerCase() === username.toLowerCase()) || null;
};

export const logoutUser = () => {
  localStorage.removeItem(KEYS.CURRENT_USER);
};

// --- Post Service ---

export const createPost = (user: User, mediaData: string, caption: string, type: 'image' | 'video' = 'image'): Post => {
  const posts = getStorage<Post[]>(KEYS.POSTS, []);
  
  const newPost: Post = {
    id: Date.now().toString(36) + Math.random().toString(36).substr(2),
    username: user.username,
    image: mediaData,
    type: type,
    caption,
    timestamp: Date.now(),
    likes: 0
  };

  // Prepend to array
  const updatedPosts = [newPost, ...posts];
  
  // Limit storage size for demo (keep last 15 posts global to avoid quota issues since video is heavy)
  if (updatedPosts.length > 15) {
    updatedPosts.length = 15; 
  }

  try {
    setStorage(KEYS.POSTS, updatedPosts);
  } catch (err: any) {
     if (err.message === "STORAGE_FULL_DELETE_OLD_POSTS") {
         // Try aggressive cleanup if video failed
         if (updatedPosts.length > 5) {
             updatedPosts.length = 5;
             setStorage(KEYS.POSTS, updatedPosts);
         } else {
             throw new Error("STORAGE FULL. DELETE POSTS.");
         }
     } else {
         throw err;
     }
  }
  return newPost;
};

export const getPosts = (): Post[] => {
  return getStorage<Post[]>(KEYS.POSTS, []);
};

export const getUserPosts = (username: string): Post[] => {
  const posts = getStorage<Post[]>(KEYS.POSTS, []);
  return posts.filter(p => p.username === username);
};