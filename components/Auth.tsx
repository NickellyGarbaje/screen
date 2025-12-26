import React, { useState } from 'react';
import { loginUser, registerUser } from '../utils/storage';
import { User } from '../types';

interface AuthProps {
  onSuccess: (user: User) => void;
  onCancel: () => void;
}

const Auth: React.FC<AuthProps> = ({ onSuccess, onCancel }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim()) {
      setError("IDENTITY_REQUIRED");
      return;
    }

    try {
      if (isLogin) {
        const user = loginUser(username);
        onSuccess(user);
      } else {
        const user = registerUser(username);
        onSuccess(user);
      }
    } catch (err: any) {
      setError(err.message || "ACCESS_DENIED");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full w-full max-w-md mx-auto p-6 animate-in fade-in duration-500">
      <div className="w-full border border-current p-8 bg-canvas shadow-[8px_8px_0px_0px_rgba(0,0,0,0.5)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,0.2)]">
        <h2 className="text-4xl font-bold mb-2 tracking-tighter">
          {isLogin ? 'LOGIN' : 'INIT'}
        </h2>
        <p className="font-mono text-[10px] uppercase opacity-60 mb-8 tracking-widest">
          {isLogin ? 'RESUME SESSION' : 'CREATE NEW IDENTITY'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-[10px] uppercase font-bold tracking-wider mb-2">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-transparent border-b-2 border-current p-2 font-mono text-lg focus:outline-none placeholder:opacity-50 text-current"
              placeholder="USER_01"
              autoFocus
            />
          </div>

          {error && (
            <div className="text-red-500 font-mono text-xs border border-red-500 p-2 uppercase">
              // ERROR: {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full py-4 border border-current text-sm font-bold uppercase tracking-[0.2em] hover:bg-current hover:text-canvas transition-all active:translate-y-1"
          >
            {isLogin ? 'Connect' : 'Register'}
          </button>
        </form>

        <div className="mt-6 flex justify-between items-center text-[10px] font-mono uppercase">
          <button 
            onClick={() => { setIsLogin(!isLogin); setError(''); }}
            className="underline decoration-dotted hover:opacity-50"
          >
            {isLogin ? 'Need an account?' : 'Already have ID?'}
          </button>
          
          <button onClick={onCancel} className="opacity-50 hover:opacity-100">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default Auth;