import React, { useEffect, useState } from 'react';
import { User, Post } from '../types';
import { getPosts, getUserPosts } from '../utils/storage';

interface ProfileProps {
  user: User;
  onLogout: () => void;
  onBack: () => void;
  onCreate: () => void;
}

const Profile: React.FC<ProfileProps> = ({ user, onLogout, onBack, onCreate }) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [view, setView] = useState<'MINE' | 'FEED'>('MINE');
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);

  useEffect(() => {
    if (view === 'MINE') {
      setPosts(getUserPosts(user.username));
    } else {
      setPosts(getPosts());
    }
  }, [user.username, view]);

  // Helper to get extension
  const getExtension = (src: string, type: 'image' | 'video') => {
    if (src.includes('video/mp4')) return 'mp4';
    if (src.includes('video/webm')) return 'webm';
    if (src.includes('image/jpeg')) return 'jpg';
    if (src.includes('image/png')) return 'png';
    return type === 'video' ? 'webm' : 'png'; // Fallback
  };

  return (
    <div className="min-h-screen flex flex-col font-sans bg-canvas text-ink">
       {/* Nav Bar */}
       <header className="h-16 flex items-center justify-between px-6 border-b border-current sticky top-0 bg-canvas z-50">
          <button onClick={onBack} className="font-bold text-lg tracking-tighter hover:opacity-50 transition-opacity">
            SCREEN_
          </button>
          
          <div className="flex gap-4">
             <button 
               onClick={onBack} 
               className="uppercase text-xs font-bold border border-current px-4 py-2 hover:bg-current hover:text-canvas transition-colors"
             >
               Main Menu
             </button>
             <button 
               onClick={onLogout} 
               className="uppercase text-xs font-bold border border-current px-4 py-2 hover:bg-red-600 hover:text-white hover:border-red-600 transition-colors"
             >
               Logout
             </button>
          </div>
       </header>

       <div className="flex-grow max-w-6xl mx-auto w-full p-6 md:p-12 animate-in fade-in duration-500">
           {/* Profile Info */}
           <div className="flex flex-col md:flex-row gap-8 mb-12 items-center md:items-start justify-between">
              <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
                <div className="w-32 h-32 border border-current p-1 flex-shrink-0">
                    <img src={user.avatar} alt="avatar" className="w-full h-full object-cover bg-gray-100 dark:bg-gray-800" />
                </div>
                <div className="text-center md:text-left space-y-2">
                   <h1 className="text-5xl font-bold tracking-tighter">{user.username}</h1>
                   <p className="font-mono text-xs opacity-60 tracking-widest uppercase">
                      ID: {user.username.toUpperCase()} // JOINED {new Date(user.joinedAt).getFullYear()}
                   </p>
                   <div className="pt-2 flex justify-center md:justify-start gap-6 font-bold text-xs uppercase">
                      <div>
                         <span className="text-xl block">{getUserPosts(user.username).length}</span>
                         <span className="opacity-60">Screens</span>
                      </div>
                   </div>
                </div>
              </div>

              {/* Create Button */}
              <button 
                onClick={onCreate}
                className="group relative px-8 py-6 border border-current overflow-hidden bg-canvas hover:bg-current hover:text-canvas transition-colors"
              >
                 <span className="relative z-10 font-bold text-lg tracking-widest uppercase flex items-center gap-2">
                    <span>+ Create New Screen</span>
                 </span>
              </button>
           </div>

           {/* Tabs - Fixed Contrast */}
           <div className="flex border-b border-current mb-8">
              <button 
                onClick={() => setView('MINE')}
                className={`flex-1 py-4 text-center uppercase font-bold text-xs tracking-widest transition-colors ${
                  view === 'MINE' 
                    ? 'bg-black text-white dark:bg-white dark:text-black' 
                    : 'bg-transparent text-current hover:opacity-50'
                }`}
              >
                My Archive
              </button>
              <button 
                onClick={() => setView('FEED')}
                className={`flex-1 py-4 text-center uppercase font-bold text-xs tracking-widest transition-colors ${
                  view === 'FEED' 
                    ? 'bg-black text-white dark:bg-white dark:text-black' 
                    : 'bg-transparent text-current hover:opacity-50'
                }`}
              >
                Global Feed
              </button>
           </div>

           {/* Gallery */}
           <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 pb-10">
              {posts.map(post => (
                 <div 
                    key={post.id} 
                    onClick={() => setSelectedPost(post)}
                    className="border border-current group bg-canvas cursor-pointer hover:shadow-[4px_4px_0px_0px_currentColor] transition-shadow"
                 >
                    <div className="aspect-square bg-gray-100 dark:bg-gray-900 overflow-hidden border-b border-current relative">
                       {post.type === 'video' ? (
                           <video 
                             src={post.image} 
                             className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
                             muted 
                             loop 
                             playsInline
                             onMouseOver={e => e.currentTarget.play()}
                             onMouseOut={e => e.currentTarget.pause()}
                           />
                       ) : (
                           <img 
                              src={post.image} 
                              alt="post"
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 group-hover:filter group-hover:grayscale" 
                              loading="lazy" 
                           />
                       )}
                       
                       <div className="absolute inset-0 bg-current opacity-0 group-hover:opacity-10 transition-opacity pointer-events-none"></div>
                       {post.type === 'video' && (
                           <div className="absolute top-2 right-2 w-3 h-3 bg-red-500 rounded-full animate-pulse border border-white"></div>
                       )}
                    </div>
                    <div className="p-3">
                       <p className="font-bold text-xs truncate">{post.caption || "NO_DATA"}</p>
                       <div className="flex justify-between mt-2 text-[9px] font-mono opacity-60 uppercase">
                          <span>{post.username}</span>
                          <span>{new Date(post.timestamp).toLocaleDateString()}</span>
                       </div>
                    </div>
                 </div>
              ))}
              {posts.length === 0 && (
                 <div className="col-span-full py-20 text-center opacity-40 font-mono text-xs uppercase tracking-widest border border-dashed border-current">
                    No screens recorded yet
                 </div>
              )}
           </div>
       </div>

       {/* Lightbox Modal */}
       {selectedPost && (
         <div 
           className="fixed inset-0 z-[100] bg-canvas/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
           onClick={() => setSelectedPost(null)}
         >
            <div 
              className="relative max-w-5xl w-full max-h-[90vh] flex flex-col border-2 border-current bg-canvas shadow-[8px_8px_0px_0px_currentColor]" 
              onClick={(e) => e.stopPropagation()}
            >
               {/* Header / Close */}
               <div className="flex justify-between items-center p-4 border-b border-current bg-canvas">
                  <div className="flex flex-col">
                    <h2 className="font-bold uppercase text-sm tracking-widest">{selectedPost.caption || "UNTITLED"}</h2>
                    <span className="text-[10px] font-mono opacity-60">BY {selectedPost.username}</span>
                  </div>
                  <button 
                    onClick={() => setSelectedPost(null)}
                    className="w-8 h-8 flex items-center justify-center border border-current hover:bg-red-600 hover:text-white hover:border-red-600 transition-colors"
                  >
                    X
                  </button>
               </div>

               {/* Image/Video Container */}
               <div className="flex-grow overflow-auto bg-gray-100 dark:bg-gray-900 flex items-center justify-center p-2">
                  {selectedPost.type === 'video' ? (
                      <video 
                        src={selectedPost.image} 
                        className="max-w-full max-h-[70vh] shadow-lg"
                        controls
                        autoPlay
                        loop
                      />
                  ) : (
                      <img 
                        src={selectedPost.image} 
                        alt="Full size" 
                        className="max-w-full max-h-[70vh] object-contain shadow-lg"
                      />
                  )}
               </div>

               {/* Footer / Actions */}
               <div className="p-4 border-t border-current flex justify-between items-center bg-canvas">
                  <div className="font-mono text-[10px] opacity-60">
                     TIMESTAMP: {new Date(selectedPost.timestamp).toLocaleString()}
                  </div>
                  <a 
                    href={selectedPost.image} 
                    download={`screen_export_${selectedPost.id}.${getExtension(selectedPost.image, selectedPost.type)}`}
                    className="uppercase text-xs font-bold border border-current px-4 py-2 hover:bg-current hover:text-canvas transition-colors"
                  >
                    Download Original
                  </a>
               </div>
            </div>
         </div>
       )}
    </div>
  );
};

export default Profile;