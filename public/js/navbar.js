function getLevelInfo(xp) {
  const xpNum = Number(xp) || 0;
  if (xpNum >= 1000) {
    return {
      level: 'Expert',
      icon: 'sparkles',
      classes: 'bg-purple-50 dark:bg-purple-950/40 text-purple-800 dark:text-purple-200 border-purple-300/70 dark:border-purple-700/60',
      iconColor: 'text-purple-500 fill-purple-400'
    };
  } else if (xpNum >= 500) {
    return {
      level: 'Advanced',
      icon: 'award',
      classes: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-800 dark:text-indigo-200 border-indigo-300/70 dark:border-indigo-700/60',
      iconColor: 'text-indigo-500 fill-indigo-400'
    };
  } else if (xpNum >= 200) {
    return {
      level: 'Intermediate',
      icon: 'shield',
      classes: 'bg-teal-50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-200 border-teal-300/70 dark:border-teal-700/60',
      iconColor: 'text-teal-500 fill-teal-400'
    };
  } else {
    return {
      level: 'Beginner',
      icon: 'compass',
      classes: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border-emerald-300/70 dark:border-emerald-700/60',
      iconColor: 'text-emerald-500 fill-emerald-400'
    };
  }
}

function loadNavbar() {
  const user = getUser();
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  
  const nav = document.getElementById('navbar');
  if (!nav) return;
  
  if (!user) {
    nav.innerHTML = ''; // No navbar on login page
    return;
  }
  
  // Calculate level
  const levelInfo = getLevelInfo(user.xp);
  
  const isInstructor = user.role === 'instructor' || user.role === 'admin';

  const navLinks = [
    { href: isInstructor ? 'instructor.html' : 'dashboard.html', label: 'Dashboard', icon: 'layout-dashboard' },
    { href: 'courses.html', label: isInstructor ? 'Course Catalog' : 'Courses', icon: 'book-open' },
  ];

  if (isInstructor) {
    navLinks.push({ href: 'studio.html', label: 'Instructor Studio', icon: 'edit-3' });
  }
  
  nav.innerHTML = `
    <nav class="bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-b border-slate-200 dark:border-slate-700 sticky top-0 z-50">
      <div class="max-w-7xl mx-auto px-4 sm:px-6">
        <div class="flex items-center justify-between h-16">
          <a href="${isInstructor ? 'instructor.html' : 'dashboard.html'}" class="flex items-center gap-2.5">
            <div class="w-9 h-9 bg-[#1c1e24] text-white rounded-xl flex items-center justify-center shadow-md shadow-black/10">
              <i data-lucide="graduation-cap" class="w-5 h-5"></i>
            </div>
            <span class="font-extrabold text-lg text-slate-900 dark:text-white hidden sm:block tracking-tight">Progressive <span class="text-[#e03131]">Learning</span></span>
          </a>
          
          <div class="flex items-center gap-2 sm:gap-4">
            ${navLinks.map(l => `
              <a href="${l.href}" class="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all
                ${currentPage === l.href 
                  ? 'bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400' 
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}">
                <i data-lucide="${l.icon}" class="w-3.5 h-3.5"></i> <span>${l.label}</span>
              </a>
            `).join('')}
            
            <div class="flex items-center gap-2 ml-2 pl-2 sm:pl-4 border-l border-slate-200 dark:border-slate-700">
              <span id="nav-xp-badge" class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 border border-amber-300/70 dark:border-amber-700/60 shadow-xs transition-all duration-300">
                <i data-lucide="zap" class="w-3.5 h-3.5 text-amber-500 fill-amber-400"></i>
                <span id="nav-xp-value">${user.xp || 0}</span> <span class="text-[10px] font-extrabold text-amber-700/70 dark:text-amber-300/70 uppercase">XP</span>
              </span>
              <span id="nav-streak-badge" class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 border border-rose-300/70 dark:border-rose-700/60 shadow-xs hidden sm:inline-flex transition-all duration-300">
                <i data-lucide="flame" class="w-3.5 h-3.5 text-rose-500 fill-rose-400"></i>
                <span id="nav-streak-value">${user.streak || 0}</span>
              </span>
              <span id="nav-level-badge" class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold ${levelInfo.classes} border shadow-xs hidden md:inline-flex transition-all duration-300">
                <i data-lucide="${levelInfo.icon}" class="w-3.5 h-3.5 ${levelInfo.iconColor}"></i>
                <span>${levelInfo.level}</span>
              </span>
            </div>
            
            <div class="relative ml-2">
              <button id="nav-avatar-btn" onclick="toggleUserMenu()" class="w-9 h-9 bg-gradient-to-br from-indigo-400 to-violet-500 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md overflow-hidden ring-2 ring-transparent hover:ring-indigo-300 dark:hover:ring-indigo-700 transition-all">
                ${user.avatar_url ? `<img src="${escapeHtml(user.avatar_url)}" alt="${escapeHtml(user.name)}" class="w-full h-full object-cover">` : (user.name || 'U').charAt(0).toUpperCase()}
              </button>
              <div id="user-menu" class="hidden absolute right-0 top-12 w-56 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 py-2 z-50 overflow-hidden">
                <div class="px-4 py-3 border-b border-slate-100 dark:border-slate-700 flex items-center gap-3 bg-slate-50/50 dark:bg-slate-900/30">
                  <div class="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold overflow-hidden shrink-0 border border-slate-200 dark:border-slate-700">
                    ${user.avatar_url ? `<img src="${escapeHtml(user.avatar_url)}" alt="${escapeHtml(user.name)}" class="w-full h-full object-cover">` : (user.name || 'U').charAt(0).toUpperCase()}
                  </div>
                  <div class="min-w-0 flex-1">
                    <p class="text-sm font-semibold text-slate-900 dark:text-white truncate">${escapeHtml(user.name || 'User')}</p>
                    <p class="text-xs text-slate-500 truncate capitalize">${escapeHtml(user.role || 'Student')}</p>
                  </div>
                </div>

                <div class="py-1">
                  <a href="profile.html" class="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-colors ${currentPage === 'profile.html' ? 'text-indigo-600 dark:text-indigo-400 font-medium bg-indigo-50/50 dark:bg-indigo-900/20' : ''}">
                    <i data-lucide="user" class="w-4 h-4 text-indigo-500"></i> My Profile
                  </a>
                  ${(user.role === 'instructor' || user.role === 'admin') ? `
                    <a href="instructor.html" class="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/60"><i data-lucide="layout-dashboard" class="w-4 h-4 text-indigo-500"></i> Instructor Dashboard</a>
                    <a href="studio.html" class="flex items-center gap-2.5 px-4 py-2 text-sm text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20"><i data-lucide="edit-3" class="w-4 h-4"></i> Instructor Studio</a>
                  ` : `
                    <a href="dashboard.html" class="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/60"><i data-lucide="layout-dashboard" class="w-4 h-4 text-indigo-500"></i> Dashboard</a>
                  `}
                </div>

                <!-- Dark Mode Option in Profile (Above Logout) -->
                <div class="border-t border-slate-100 dark:border-slate-700 my-1"></div>
                <button type="button" onclick="toggleDarkMode()" class="w-full flex items-center justify-between px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-colors cursor-pointer">
                  <span class="flex items-center gap-2.5">
                    <i data-lucide="${isDarkMode() ? 'sun' : 'moon'}" class="w-4 h-4 ${isDarkMode() ? 'text-amber-400' : 'text-indigo-500'}" id="dark-mode-icon"></i>
                    <span id="dark-mode-label" class="font-medium">${isDarkMode() ? 'Light Mode' : 'Dark Mode'}</span>
                  </span>
                  <div id="dark-mode-track" class="w-8 h-4.5 ${isDarkMode() ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-600'} rounded-full transition-colors relative flex items-center px-0.5 pointer-events-none">
                    <div id="dark-mode-knob" class="w-3.5 h-3.5 bg-white rounded-full shadow-sm transform transition-transform ${isDarkMode() ? 'translate-x-3.5' : 'translate-x-0'}"></div>
                  </div>
                </button>
                <div class="border-t border-slate-100 dark:border-slate-700 my-1"></div>
                <button onclick="logout()" class="w-full flex items-center gap-2 text-left px-4 py-2 text-sm text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20"><i data-lucide="log-out" class="w-4 h-4"></i> Logout</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </nav>
  `;

  if (window.lucide) {
    lucide.createIcons();
  }

  // Asynchronously sync fresh profile & XP from server
  syncUserProfile();
}

function toggleUserMenu() {
  const menu = document.getElementById('user-menu');
  if(menu) menu.classList.toggle('hidden');
}

// ── Immediately update user XP in the navbar and local storage ──
function updateUserXP(newXp) {
  const xpNum = Number(newXp);
  if (isNaN(xpNum)) return;

  // 1. Update localStorage user object
  const u = getUser();
  if (u) {
    u.xp = xpNum;
    localStorage.setItem('user', JSON.stringify(u));
  }

  // 2. Update navbar XP text and animate
  const xpVal = document.getElementById('nav-xp-value');
  const xpBadge = document.getElementById('nav-xp-badge');
  if (xpVal) {
    xpVal.textContent = xpNum;
  }
  if (xpBadge) {
    xpBadge.classList.add('scale-110', 'ring-2', 'ring-amber-400');
    setTimeout(() => {
      xpBadge.classList.remove('scale-110', 'ring-2', 'ring-amber-400');
    }, 600);
  }

  // 3. Update level calculation & badge
  const levelInfo = getLevelInfo(xpNum);
  const levelBadge = document.getElementById('nav-level-badge');
  if (levelBadge) {
    levelBadge.innerHTML = `<i data-lucide="${levelInfo.icon}" class="w-3.5 h-3.5 ${levelInfo.iconColor}"></i><span>${levelInfo.level}</span>`;
    levelBadge.className = `inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold ${levelInfo.classes} border shadow-xs hidden md:inline-flex transition-all duration-300`;
    if (window.lucide) lucide.createIcons();
  }

  // 4. Dispatch custom event for page components
  window.dispatchEvent(new CustomEvent('xpUpdated', { detail: { xp: xpNum } }));
}
window.updateUserXP = updateUserXP;

// Update local user profile state and re-render navbar instantly
function updateUserProfile(updatedUser) {
  if (!updatedUser) return;
  const localUser = getUser() || {};
  const merged = { ...localUser, ...updatedUser };
  localStorage.setItem('user', JSON.stringify(merged));
  loadNavbar();
  window.dispatchEvent(new CustomEvent('profileUpdated', { detail: { user: merged } }));
}
window.updateUserProfile = updateUserProfile;

// Background sync on navbar load to ensure XP and profile are always fresh from database
async function syncUserProfile() {
  try {
    if (!getToken()) return;
    const res = await apiFetch('/auth/me');
    if (res && res.user) {
      const localUser = getUser() || {};
      const merged = { ...localUser, ...res.user };
      localStorage.setItem('user', JSON.stringify(merged));
      updateUserXP(res.user.xp);

      const streakVal = document.getElementById('nav-streak-value');
      if (streakVal && res.user.streak !== undefined) {
        streakVal.textContent = res.user.streak;
      }

      // Update avatar if changed
      if (res.user.avatar_url !== localUser.avatar_url || res.user.name !== localUser.name) {
        const navAvatarBtn = document.getElementById('nav-avatar-btn');
        if (navAvatarBtn) {
          navAvatarBtn.innerHTML = res.user.avatar_url 
            ? `<img src="${escapeHtml(res.user.avatar_url)}" alt="${escapeHtml(res.user.name)}" class="w-full h-full object-cover">` 
            : (res.user.name || 'U').charAt(0).toUpperCase();
        }
      }
    }
  } catch (e) {
    // Ignore background sync errors
  }
}
window.syncUserProfile = syncUserProfile;

// Cross-tab synchronization
window.addEventListener('storage', (e) => {
  if (e.key === 'user' && e.newValue) {
    try {
      const parsed = JSON.parse(e.newValue);
      if (parsed) {
        if (parsed.xp !== undefined) {
          const xpVal = document.getElementById('nav-xp-value');
          if (xpVal) xpVal.textContent = parsed.xp;
        }
        // Update avatar across tabs
        const navAvatarBtn = document.getElementById('nav-avatar-btn');
        if (navAvatarBtn) {
          navAvatarBtn.innerHTML = parsed.avatar_url 
            ? `<img src="${escapeHtml(parsed.avatar_url)}" alt="${escapeHtml(parsed.name)}" class="w-full h-full object-cover">` 
            : (parsed.name || 'U').charAt(0).toUpperCase();
        }
      }
    } catch (err) {}
  }
});

// Dark mode state check
function isDarkMode() {
  return document.documentElement.classList.contains('dark');
}

// Toggle Dark Mode
function toggleDarkMode() {
  const isDark = document.documentElement.classList.toggle('dark');
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
  updateDarkModeUI(isDark);
}

// Update Dark Mode UI elements in profile menu
function updateDarkModeUI(isDark) {
  const icon = document.getElementById('dark-mode-icon');
  const label = document.getElementById('dark-mode-label');
  const knob = document.getElementById('dark-mode-knob');
  const track = document.getElementById('dark-mode-track');

  if (icon) {
    icon.setAttribute('data-lucide', isDark ? 'sun' : 'moon');
    icon.className = `w-4 h-4 ${isDark ? 'text-amber-400' : 'text-indigo-500'}`;
  }
  if (label) {
    label.textContent = isDark ? 'Light Mode' : 'Dark Mode';
  }
  if (knob) {
    if (isDark) {
      knob.classList.remove('translate-x-0');
      knob.classList.add('translate-x-3.5');
    } else {
      knob.classList.remove('translate-x-3.5');
      knob.classList.add('translate-x-0');
    }
  }
  if (track) {
    if (isDark) {
      track.classList.remove('bg-slate-200');
      track.classList.add('bg-indigo-600');
    } else {
      track.classList.remove('bg-indigo-600');
      track.classList.add('bg-slate-200');
    }
  }

  if (window.lucide) {
    lucide.createIcons();
  }
}

// Theme initial load
function initTheme() {
  const saved = localStorage.getItem('theme');
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  if (saved === 'dark' || (!saved && prefersDark)) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

// Run theme check immediately
initTheme();

function logout() {
  clearAuth();
  window.location.href = 'index.html';
}

// Close menu on outside click
document.addEventListener('click', (e) => {
  const menu = document.getElementById('user-menu');
  if (menu && !e.target.closest('#user-menu') && !e.target.closest('[onclick="toggleUserMenu()"]')) {
    menu.classList.add('hidden');
  }
});

// Auto-load navbar
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  loadNavbar();
  // Redirect to login if not authenticated (except on index.html)
  const page = window.location.pathname.split('/').pop() || 'index.html';
  if (page !== 'index.html' && !getToken()) {
    window.location.href = 'index.html';
  }
});
