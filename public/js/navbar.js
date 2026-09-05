function loadNavbar() {
  const user = getUser();
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  
  const nav = document.getElementById('navbar');
  if (!nav) return;
  
  if (!user) {
    nav.innerHTML = '';
    return;
  }
  
  let level = 'Beginner';
  let levelColor = 'text-emerald-600 bg-emerald-50';
  if (user.xp >= 1000) { level = 'Expert'; levelColor = 'text-purple-600 bg-purple-50'; }
  else if (user.xp >= 500) { level = 'Advanced'; levelColor = 'text-blue-600 bg-blue-50'; }
  else if (user.xp >= 200) { level = 'Intermediate'; levelColor = 'text-amber-600 bg-amber-50'; }

  const navLinks = [
    { href: 'dashboard.html', label: 'Dashboard', icon: 'layout-dashboard' },
    { href: 'courses.html', label: 'Courses', icon: 'book-open' },
  ];
  
  nav.innerHTML = `
    <nav class="bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-b border-slate-200 dark:border-slate-700 sticky top-0 z-50">
      <div class="max-w-7xl mx-auto px-4 sm:px-6">
        <div class="flex items-center justify-between h-16">
          <a href="dashboard.html" class="flex items-center gap-2.5">
            <div class="w-9 h-9 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <i data-lucide="graduation-cap" class="w-5 h-5 text-white"></i>
            </div>
            <span class="font-bold text-lg text-slate-900 dark:text-white hidden sm:block">Progressive <span class="text-indigo-600">Learning</span></span>
          </a>
          
          <div class="flex items-center gap-2 sm:gap-4">
            ${navLinks.map(l => `
              <a href="${l.href}" class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                ${currentPage === l.href 
                  ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300' 
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}">
                <i data-lucide="${l.icon}" class="w-4 h-4"></i> <span>${l.label}</span>
              </a>
            `).join('')}
            
            <div class="flex items-center gap-2 ml-2 pl-2 sm:pl-4 border-l border-slate-200 dark:border-slate-700">
              <span id="nav-xp-badge" class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border border-amber-200 dark:border-amber-800 transition-all duration-300">
                <i data-lucide="zap" class="w-3.5 h-3.5 text-amber-500"></i>
                <span id="nav-xp-value">${user.xp || 0}</span> XP
              </span>
              <span id="nav-streak-badge" class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 border border-orange-200 dark:border-orange-800 hidden sm:inline-flex transition-all duration-300">
                <i data-lucide="flame" class="w-3.5 h-3.5 text-orange-500"></i>
                <span id="nav-streak-value">${user.streak || 0}</span>
              </span>
              <span id="nav-level-badge" class="px-2.5 py-1 rounded-full text-xs font-bold ${levelColor} border hidden md:inline-flex transition-all duration-300">${level}</span>
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
                  <a href="dashboard.html" class="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/60"><i data-lucide="layout-dashboard" class="w-4 h-4 text-indigo-500"></i> Dashboard</a>
                </div>

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
}

function toggleUserMenu() {
  const menu = document.getElementById('user-menu');
  if(menu) menu.classList.toggle('hidden');
}

function updateUserXP(newXp) {
  const xpNum = Number(newXp);
  if (isNaN(xpNum)) return;

  const u = getUser();
  if (u) {
    u.xp = xpNum;
    localStorage.setItem('user', JSON.stringify(u));
  }

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

  let level = 'Beginner';
  let levelColor = 'text-emerald-600 bg-emerald-50';
  if (xpNum >= 1000) { level = 'Expert'; levelColor = 'text-purple-600 bg-purple-50'; }
  else if (xpNum >= 500) { level = 'Advanced'; levelColor = 'text-blue-600 bg-blue-50'; }
  else if (xpNum >= 200) { level = 'Intermediate'; levelColor = 'text-amber-600 bg-amber-50'; }

  const levelBadge = document.getElementById('nav-level-badge');
  if (levelBadge) {
    levelBadge.textContent = level;
    levelBadge.className = `px-2.5 py-1 rounded-full text-xs font-bold ${levelColor} border hidden md:inline-flex transition-all duration-300`;
  }
}
window.updateUserXP = updateUserXP;

function isDarkMode() {
  return document.documentElement.classList.contains('dark');
}

function toggleDarkMode() {
  const isDark = document.documentElement.classList.toggle('dark');
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
  updateDarkModeUI(isDark);
}

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

function initTheme() {
  const saved = localStorage.getItem('theme');
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  if (saved === 'dark' || (!saved && prefersDark)) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

initTheme();

function logout() {
  clearAuth();
  window.location.href = 'index.html';
}

document.addEventListener('click', (e) => {
  const menu = document.getElementById('user-menu');
  if (menu && !e.target.closest('#user-menu') && !e.target.closest('[onclick="toggleUserMenu()"]')) {
    menu.classList.add('hidden');
  }
});

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  loadNavbar();
  const page = window.location.pathname.split('/').pop() || 'index.html';
  if (page !== 'index.html' && !getToken()) {
    window.location.href = 'index.html';
  }
});
