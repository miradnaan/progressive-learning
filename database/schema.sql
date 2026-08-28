-- ============================================================
-- Progressive Learning Platform — MySQL Database Schema
-- ============================================================

DROP DATABASE IF EXISTS progressive_learning;
CREATE DATABASE progressive_learning CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE progressive_learning;

-- ── Users ────────────────────────────────────────────────────
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('student', 'instructor') DEFAULT 'student',
    avatar_url TEXT NULL,
    xp INT DEFAULT 0,
    streak INT DEFAULT 0,
    last_active DATE NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ── Courses ──────────────────────────────────────────────────
CREATE TABLE courses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    category VARCHAR(50),
    duration VARCHAR(50),
    image_url TEXT,
    lesson_count INT DEFAULT 0,
    xp_cost INT DEFAULT 0,
    published TINYINT DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ── Lessons ──────────────────────────────────────────────────
CREATE TABLE lessons (
    id INT AUTO_INCREMENT PRIMARY KEY,
    course_id INT NOT NULL,
    position INT NOT NULL,
    title VARCHAR(200) NOT NULL,
    duration_minutes INT DEFAULT 20,
    video_url VARCHAR(500) DEFAULT '',
    content LONGTEXT,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

-- ── Quiz Questions ───────────────────────────────────────────
CREATE TABLE quiz_questions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    course_id INT NOT NULL,
    lesson_id INT NULL,
    type ENUM('lesson', 'final') DEFAULT 'lesson',
    question TEXT NOT NULL,
    option_a VARCHAR(500) NOT NULL,
    option_b VARCHAR(500) NOT NULL,
    option_c VARCHAR(500) NOT NULL,
    option_d VARCHAR(500) NOT NULL,
    correct_option CHAR(1) NOT NULL,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE
);

-- ── Enrollments ──────────────────────────────────────────────
CREATE TABLE enrollments (
    user_id INT NOT NULL,
    course_id INT NOT NULL,
    enrolled_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_completed TINYINT DEFAULT 0,
    completed_at DATETIME NULL,
    PRIMARY KEY (user_id, course_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

-- ── Lesson Progress ──────────────────────────────────────────
CREATE TABLE lesson_progress (
    user_id INT NOT NULL,
    lesson_id INT NOT NULL,
    passed_quiz TINYINT DEFAULT 0,
    completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, lesson_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE
);

-- ── Quiz Attempts ────────────────────────────────────────────
CREATE TABLE quiz_attempts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    lesson_id INT NULL,
    course_id INT NULL,
    type ENUM('lesson', 'final') DEFAULT 'lesson',
    score INT NOT NULL,
    total INT NOT NULL,
    passed TINYINT NOT NULL,
    submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ── XP Transactions ─────────────────────────────────────────
CREATE TABLE xp_transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    amount INT NOT NULL,
    reason VARCHAR(255) NOT NULL,
    ref_id INT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);


-- ============================================================
-- SEED DATA
-- ============================================================

-- Password hash for 'password123' (bcrypt 10 rounds)
-- $2b$10$9aQUjcs73Fi0AbMdJX7lmOn.xlogdE./R3NEqI6IVHZs1KiMO9/fa

INSERT INTO users (name, email, password_hash, role, xp, streak, last_active) VALUES
('Alex Johnson', 'alex@example.com', '$2b$10$9aQUjcs73Fi0AbMdJX7lmOn.xlogdE./R3NEqI6IVHZs1KiMO9/fa', 'student', 240, 5, CURDATE()),
('Jordan Lee', 'instructor@example.com', '$2b$10$9aQUjcs73Fi0AbMdJX7lmOn.xlogdE./R3NEqI6IVHZs1KiMO9/fa', 'instructor', 0, 0, CURDATE());

-- ── Courses ──────────────────────────────────────────────────
INSERT INTO courses (title, description, category, duration, image_url, lesson_count, xp_cost) VALUES
('HTML & CSS Fundamentals', 'Master the building blocks of the web. Learn semantic HTML5 structure, CSS styling, Flexbox layouts, and responsive design from scratch.', 'Web Development', '6 weeks', '/images/courses/html-css.svg', 5, 0),
('JavaScript Essentials', 'Learn JavaScript from variables to async programming. Master DOM manipulation, events, functions, and the Fetch API.', 'Programming', '8 weeks', '/images/courses/javascript.svg', 5, 0),
('Python for Beginners', 'Start your programming journey with Python. Learn syntax, data structures, functions, and build real projects.', 'Programming', '10 weeks', '/images/courses/python.svg', 0, 100),
('React Development', 'Build modern single-page applications with React. Learn components, hooks, state management, and routing.', 'Web Development', '8 weeks', '/images/courses/react.svg', 0, 200);

-- ── Course 1: HTML & CSS Fundamentals — 5 Lessons ───────────

INSERT INTO lessons (course_id, position, title, duration_minutes, video_url, content) VALUES
(1, 1, 'Introduction to HTML5', 25, 'https://www.youtube.com/watch?v=kUMe1FH4CHE',
'<h2>Welcome to HTML5</h2>
<p>HyperText Markup Language (HTML) is the foundational skeleton of every website. HTML5 introduced <strong>semantic elements</strong> that describe the meaning of content to both browsers and search engines.</p>

<p>Every web page you visit — from Google to YouTube — is built on HTML. Understanding HTML is the first and most important step in becoming a web developer.</p>

<h3>The Basic HTML5 Document Structure</h3>
<p>Every HTML page follows this fundamental template:</p>

<pre><code>&lt;!DOCTYPE html&gt;
&lt;html lang="en"&gt;
&lt;head&gt;
    &lt;meta charset="UTF-8"&gt;
    &lt;meta name="viewport" content="width=device-width, initial-scale=1.0"&gt;
    &lt;title&gt;My First Page&lt;/title&gt;
&lt;/head&gt;
&lt;body&gt;
    &lt;header&gt;
        &lt;h1&gt;Hello World!&lt;/h1&gt;
    &lt;/header&gt;
    &lt;main&gt;
        &lt;p&gt;This is my first web page.&lt;/p&gt;
    &lt;/main&gt;
    &lt;footer&gt;
        &lt;p&gt;&amp;copy; 2024 My Website&lt;/p&gt;
    &lt;/footer&gt;
&lt;/body&gt;
&lt;/html&gt;</code></pre>

<div class="callout">
<h4>💡 Key Takeaways</h4>
<ul>
<li><code>&lt;!DOCTYPE html&gt;</code> tells the browser this is an HTML5 document</li>
<li><code>&lt;head&gt;</code> contains metadata (title, charset, viewport settings)</li>
<li><code>&lt;body&gt;</code> contains all visible content</li>
<li>Semantic tags like <code>&lt;header&gt;</code>, <code>&lt;main&gt;</code>, <code>&lt;footer&gt;</code> improve accessibility and SEO</li>
</ul>
</div>

<div class="resources">
<h4>📖 Resources</h4>
<ul>
<li><a href="https://developer.mozilla.org/en-US/docs/Web/HTML" target="_blank">MDN Web Docs — HTML Reference</a></li>
<li><a href="https://web.dev/learn/html/" target="_blank">web.dev — Learn HTML</a></li>
</ul>
</div>'),

(1, 2, 'Text, Links & Images', 20, 'https://www.youtube.com/watch?v=salY_Sm6mv4',
'<h2>Working with Text, Links & Images</h2>
<p>HTML provides a rich set of elements for structuring text content, creating hyperlinks between pages, and embedding images. These are the most commonly used elements on every website.</p>

<h3>Text Elements</h3>
<p>HTML offers six levels of headings (<code>&lt;h1&gt;</code> through <code>&lt;h6&gt;</code>) and paragraph tags for body text:</p>

<pre><code>&lt;h1&gt;Main Page Title&lt;/h1&gt;
&lt;h2&gt;Section Heading&lt;/h2&gt;
&lt;p&gt;This is a paragraph of text. You can make text &lt;strong&gt;bold&lt;/strong&gt; or &lt;em&gt;italic&lt;/em&gt;.&lt;/p&gt;

&lt;ul&gt;
    &lt;li&gt;Unordered list item&lt;/li&gt;
    &lt;li&gt;Another item&lt;/li&gt;
&lt;/ul&gt;

&lt;ol&gt;
    &lt;li&gt;First ordered item&lt;/li&gt;
    &lt;li&gt;Second ordered item&lt;/li&gt;
&lt;/ol&gt;</code></pre>

<h3>Hyperlinks</h3>
<p>The anchor tag <code>&lt;a&gt;</code> creates clickable links:</p>

<pre><code>&lt;a href="https://google.com" target="_blank"&gt;Visit Google&lt;/a&gt;
&lt;a href="about.html"&gt;About Page&lt;/a&gt;
&lt;a href="#section2"&gt;Jump to Section 2&lt;/a&gt;</code></pre>

<h3>Images</h3>
<p>The <code>&lt;img&gt;</code> tag embeds images. Always include an <code>alt</code> attribute for accessibility:</p>

<pre><code>&lt;img src="photo.jpg" alt="A beautiful sunset" width="600"&gt;</code></pre>

<div class="callout">
<h4>💡 Key Takeaways</h4>
<ul>
<li>Use headings (<code>&lt;h1&gt;</code>–<code>&lt;h6&gt;</code>) hierarchically for structure</li>
<li><code>&lt;a href="..."&gt;</code> creates hyperlinks; use <code>target="_blank"</code> to open in a new tab</li>
<li>Always add <code>alt</code> text to images for accessibility and SEO</li>
<li>Use <code>&lt;strong&gt;</code> for bold and <code>&lt;em&gt;</code> for italic emphasis</li>
</ul>
</div>'),

(1, 3, 'CSS Selectors & Box Model', 30, 'https://www.youtube.com/watch?v=1PnVor36_40',
'<h2>CSS Selectors & The Box Model</h2>
<p>Cascading Style Sheets (CSS) controls how HTML elements look. Understanding <strong>selectors</strong> (how you target elements) and the <strong>box model</strong> (how elements take up space) is essential.</p>

<h3>CSS Syntax & Selectors</h3>
<pre><code>/* Element Selector */
p { color: #333; font-size: 16px; }

/* Class Selector (reusable) */
.highlight { background-color: yellow; }

/* ID Selector (unique) */
#main-title { font-size: 2rem; font-weight: bold; }

/* Descendant Selector */
.card p { line-height: 1.6; }

/* Pseudo-class */
a:hover { color: blue; text-decoration: underline; }</code></pre>

<h3>The CSS Box Model</h3>
<p>Every HTML element is a rectangular box with four layers:</p>

<pre><code>.box {
    /* Content: The actual text/image */
    width: 300px;
    height: 200px;

    /* Padding: Space between content and border */
    padding: 20px;

    /* Border: The visible edge */
    border: 2px solid #333;

    /* Margin: Space outside the border */
    margin: 16px;

    /* Modern fix: include padding/border in width */
    box-sizing: border-box;
}</code></pre>

<div class="callout">
<h4>💡 Key Takeaways</h4>
<ul>
<li>Use <strong>classes</strong> (<code>.name</code>) for reusable styles, <strong>IDs</strong> (<code>#name</code>) for unique elements</li>
<li>The Box Model layers: Content → Padding → Border → Margin</li>
<li>Always use <code>box-sizing: border-box</code> for predictable sizing</li>
<li>CSS Specificity order: inline > ID > class > element</li>
</ul>
</div>'),

(1, 4, 'Flexbox Layout', 25, 'https://www.youtube.com/watch?v=u044iM9xsWU',
'<h2>Flexbox Layout Mastery</h2>
<p>Flexbox is the modern CSS layout system that makes it easy to align, distribute, and order elements. Before Flexbox, developers relied on floats and complex hacks.</p>

<h3>Enabling Flexbox</h3>
<pre><code>.container {
    display: flex;              /* Activates flexbox */
    flex-direction: row;        /* Default: horizontal */
    justify-content: space-between; /* Spacing on main axis */
    align-items: center;        /* Alignment on cross axis */
    gap: 1rem;                  /* Modern gap between items */
}

/* Vertical layout */
.sidebar {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}</code></pre>

<h3>Practical Example: Navigation Bar</h3>
<pre><code>&lt;nav class="navbar"&gt;
    &lt;div class="logo"&gt;MyBrand&lt;/div&gt;
    &lt;ul class="nav-links"&gt;
        &lt;li&gt;&lt;a href="#"&gt;Home&lt;/a&gt;&lt;/li&gt;
        &lt;li&gt;&lt;a href="#"&gt;About&lt;/a&gt;&lt;/li&gt;
        &lt;li&gt;&lt;a href="#"&gt;Contact&lt;/a&gt;&lt;/li&gt;
    &lt;/ul&gt;
&lt;/nav&gt;

&lt;style&gt;
.navbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 2rem;
    background: white;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}
.nav-links {
    display: flex;
    gap: 1.5rem;
    list-style: none;
}
&lt;/style&gt;</code></pre>

<div class="callout">
<h4>💡 Key Takeaways</h4>
<ul>
<li><code>display: flex</code> on the parent activates Flexbox for all children</li>
<li><code>justify-content</code> controls the main axis (horizontal by default)</li>
<li><code>align-items</code> controls the cross axis (vertical by default)</li>
<li><code>gap</code> replaces margin hacks for spacing between items</li>
<li><code>flex: 1</code> on a child makes it grow to fill available space</li>
</ul>
</div>'),

(1, 5, 'Responsive Design & Media Queries', 25, 'https://www.youtube.com/watch?v=x4u1yp3Msao',
'<h2>Responsive Web Design</h2>
<p>Responsive design ensures your website looks great on all devices — phones, tablets, and desktops. The key tool is <strong>media queries</strong>, which apply different CSS rules based on screen size.</p>

<h3>The Viewport Meta Tag</h3>
<p>Every responsive page needs this in the <code>&lt;head&gt;</code>:</p>
<pre><code>&lt;meta name="viewport" content="width=device-width, initial-scale=1.0"&gt;</code></pre>

<h3>Media Queries (Mobile-First)</h3>
<pre><code>/* Base styles (mobile) */
.grid {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

/* Tablet (768px and up) */
@media (min-width: 768px) {
    .grid {
        flex-direction: row;
        flex-wrap: wrap;
    }
    .grid-item {
        width: 48%;
    }
}

/* Desktop (1024px and up) */
@media (min-width: 1024px) {
    .grid-item {
        width: 32%;
    }
}</code></pre>

<h3>Common Breakpoints</h3>
<pre><code>/* Mobile:  0 – 767px   (default styles) */
/* Tablet:  768 – 1023px */
/* Desktop: 1024px+      */</code></pre>

<div class="callout">
<h4>💡 Key Takeaways</h4>
<ul>
<li>Always include the <code>viewport</code> meta tag</li>
<li>Mobile-first: write base styles for small screens, then add <code>@media (min-width: ...)</code> for larger ones</li>
<li>Use relative units (<code>rem</code>, <code>%</code>, <code>vw</code>) instead of fixed <code>px</code> for fluid layouts</li>
<li>Test on real devices or Chrome DevTools device simulator</li>
</ul>
</div>

<div class="resources">
<h4>📖 Resources</h4>
<ul>
<li><a href="https://web.dev/learn/design/" target="_blank">web.dev — Responsive Design Course</a></li>
<li><a href="https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_media_queries" target="_blank">MDN — CSS Media Queries</a></li>
</ul>
</div>');

-- ── Course 2: JavaScript Essentials — 5 Lessons ─────────────

INSERT INTO lessons (course_id, position, title, duration_minutes, video_url, content) VALUES
(2, 1, 'Variables, Data Types & Operators', 25, 'https://www.youtube.com/watch?v=W6NZfCJ0LCg',
'<h2>JavaScript Variables & Data Types</h2>
<p>JavaScript is the programming language of the web. Every interactive feature you see — dropdown menus, form validation, dynamic content — is powered by JavaScript.</p>

<h3>Declaring Variables</h3>
<pre><code>// Modern variable declarations
let age = 25;          // Can be reassigned
const name = "Alex";   // Cannot be reassigned (constant)
var score = 100;       // Old way (avoid in modern JS)

// Why const is preferred:
const API_URL = "https://api.example.com";  // Never changes
let currentPage = 1;   // Will change as user navigates</code></pre>

<h3>Data Types</h3>
<pre><code>// Primitives
const str = "Hello World";     // String
const num = 42;                // Number
const isActive = true;         // Boolean
const nothing = null;          // Null
let x;                         // Undefined

// Complex Types
const fruits = ["apple", "banana", "cherry"];  // Array
const user = {                                  // Object
    name: "Alex",
    age: 25,
    isStudent: true
};</code></pre>

<h3>Operators</h3>
<pre><code>// Arithmetic
let result = 10 + 5;    // 15
let product = 4 * 3;    // 12

// Comparison (use === for strict equality)
5 === 5      // true
5 === "5"    // false (different types)
5 == "5"     // true  (loose — avoid this!)

// Logical
true && false  // false (AND)
true || false  // true  (OR)
!true          // false (NOT)</code></pre>

<div class="callout">
<h4>💡 Key Takeaways</h4>
<ul>
<li>Use <code>const</code> by default, <code>let</code> only when reassignment is needed</li>
<li>JavaScript has 7 primitive types: string, number, boolean, null, undefined, symbol, bigint</li>
<li>Always use <code>===</code> (strict equality) instead of <code>==</code></li>
<li>Arrays and objects are reference types</li>
</ul>
</div>'),

(2, 2, 'Functions & Control Flow', 30, 'https://www.youtube.com/watch?v=xUI5Tsl2JpY',
'<h2>Functions & Control Flow</h2>
<p>Functions let you organize code into reusable blocks. Control flow structures (<code>if/else</code>, loops) let your program make decisions.</p>

<h3>Function Declarations</h3>
<pre><code>// Traditional function
function greet(name) {
    return "Hello, " + name + "!";
}

// Arrow function (modern)
const add = (a, b) => a + b;

// Arrow function with body
const calculateGrade = (score) => {
    if (score >= 90) return "A";
    if (score >= 80) return "B";
    if (score >= 70) return "C";
    return "F";
};</code></pre>

<h3>Control Flow</h3>
<pre><code>// If / Else
const age = 18;
if (age >= 18) {
    console.log("You can vote!");
} else {
    console.log("Too young to vote.");
}

// For Loop
for (let i = 0; i < 5; i++) {
    console.log("Count:", i);
}

// For...of (iterate arrays)
const colors = ["red", "green", "blue"];
for (const color of colors) {
    console.log(color);
}

// While Loop
let count = 0;
while (count < 3) {
    console.log(count);
    count++;
}</code></pre>

<div class="callout">
<h4>💡 Key Takeaways</h4>
<ul>
<li>Arrow functions (<code>=></code>) are shorter and commonly used in modern JS</li>
<li>Use <code>for...of</code> for arrays and <code>for...in</code> for object properties</li>
<li><code>return</code> exits the function and sends a value back</li>
<li>Functions are first-class citizens — they can be stored in variables and passed as arguments</li>
</ul>
</div>'),

(2, 3, 'DOM Manipulation', 30, 'https://www.youtube.com/watch?v=y17RuWkWdn8',
'<h2>DOM Manipulation</h2>
<p>The Document Object Model (DOM) is the browser''s live representation of your HTML page. JavaScript can read, modify, add, and remove elements dynamically.</p>

<h3>Selecting Elements</h3>
<pre><code>// By ID (returns single element)
const title = document.getElementById("main-title");

// By CSS selector (returns first match)
const btn = document.querySelector(".submit-btn");

// By CSS selector (returns ALL matches)
const items = document.querySelectorAll(".list-item");</code></pre>

<h3>Modifying Elements</h3>
<pre><code>// Change text content
title.textContent = "New Title";

// Change HTML inside element
title.innerHTML = "&lt;em&gt;Styled Title&lt;/em&gt;";

// Change CSS styles
title.style.color = "blue";
title.style.fontSize = "2rem";

// Add/remove CSS classes
title.classList.add("highlight");
title.classList.remove("old-class");
title.classList.toggle("active");</code></pre>

<h3>Creating New Elements</h3>
<pre><code>// Create and add a new paragraph
const newPara = document.createElement("p");
newPara.textContent = "I was created by JavaScript!";
newPara.classList.add("dynamic-text");
document.body.appendChild(newPara);</code></pre>

<div class="callout">
<h4>💡 Key Takeaways</h4>
<ul>
<li><code>querySelector</code> is the most versatile selector — works with any CSS selector</li>
<li>Use <code>textContent</code> for safe text, <code>innerHTML</code> when you need HTML</li>
<li><code>classList.add/remove/toggle</code> is cleaner than modifying <code>style</code> directly</li>
<li><code>createElement</code> + <code>appendChild</code> to dynamically build page content</li>
</ul>
</div>'),

(2, 4, 'Events & Form Handling', 25, 'https://www.youtube.com/watch?v=YiOlaiscqDY',
'<h2>Events & Form Handling</h2>
<p>Events are how JavaScript responds to user actions — clicks, key presses, form submissions, and more.</p>

<h3>Adding Event Listeners</h3>
<pre><code>const button = document.querySelector("#submit-btn");

// Click event
button.addEventListener("click", () => {
    alert("Button clicked!");
});

// With event parameter
button.addEventListener("click", (event) => {
    console.log("Clicked element:", event.target);
});</code></pre>

<h3>Form Handling</h3>
<pre><code>&lt;form id="login-form"&gt;
    &lt;input type="email" name="email" required&gt;
    &lt;input type="password" name="password" required&gt;
    &lt;button type="submit"&gt;Login&lt;/button&gt;
&lt;/form&gt;

&lt;script&gt;
const form = document.getElementById("login-form");

form.addEventListener("submit", (e) => {
    e.preventDefault();  // Stop page reload

    const email = form.email.value;
    const password = form.password.value;

    if (!email || !password) {
        alert("Please fill in all fields.");
        return;
    }

    console.log("Login:", { email, password });
});
&lt;/script&gt;</code></pre>

<div class="callout">
<h4>💡 Key Takeaways</h4>
<ul>
<li><code>addEventListener</code> is the modern way to attach event handlers</li>
<li><code>e.preventDefault()</code> stops the browser''s default behavior (e.g., form page reload)</li>
<li>Access form values with <code>form.fieldName.value</code></li>
<li>Always validate input on both client-side and server-side</li>
</ul>
</div>'),

(2, 5, 'Fetch API & Async JavaScript', 30, 'https://www.youtube.com/watch?v=cuEtnrL9-H0',
'<h2>Fetch API & Async JavaScript</h2>
<p>Modern web applications communicate with servers using the <code>fetch()</code> API. Understanding asynchronous JavaScript (<code>async/await</code>) is key to loading data without freezing the page.</p>

<h3>Basic Fetch Request</h3>
<pre><code>// GET request
fetch("https://jsonplaceholder.typicode.com/posts")
    .then(response => response.json())
    .then(data => {
        console.log("Posts:", data);
    })
    .catch(error => {
        console.error("Error:", error);
    });</code></pre>

<h3>Async/Await (Cleaner Syntax)</h3>
<pre><code>async function loadPosts() {
    try {
        const response = await fetch("/api/posts");
        const data = await response.json();
        console.log("Posts:", data);
    } catch (error) {
        console.error("Failed to load:", error);
    }
}

loadPosts();</code></pre>

<h3>POST Request (Sending Data)</h3>
<pre><code>async function login(email, password) {
    const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || "Login failed");
    }

    return data; // { token, user }
}</code></pre>

<div class="callout">
<h4>💡 Key Takeaways</h4>
<ul>
<li><code>fetch()</code> returns a Promise — use <code>.then()</code> chains or <code>async/await</code></li>
<li>Always call <code>response.json()</code> to parse the JSON body</li>
<li>Use <code>try/catch</code> with async/await for error handling</li>
<li>POST requests need <code>method</code>, <code>headers</code>, and <code>body</code> options</li>
</ul>
</div>

<div class="resources">
<h4>📖 Resources</h4>
<ul>
<li><a href="https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API" target="_blank">MDN — Fetch API</a></li>
<li><a href="https://javascript.info/async-await" target="_blank">javascript.info — Async/Await</a></li>
</ul>
</div>');


-- ── Update lesson counts ─────────────────────────────────────
UPDATE courses SET lesson_count = (SELECT COUNT(*) FROM lessons WHERE course_id = 1) WHERE id = 1;
UPDATE courses SET lesson_count = (SELECT COUNT(*) FROM lessons WHERE course_id = 2) WHERE id = 2;


-- ============================================================
-- QUIZ QUESTIONS — 5 per lesson (pool of 5, quiz picks 3)
-- ============================================================

-- Lesson 1: Introduction to HTML5
INSERT INTO quiz_questions (course_id, lesson_id, type, question, option_a, option_b, option_c, option_d, correct_option) VALUES
(1, 1, 'lesson', 'What does HTML stand for?', 'Hyper Text Markup Language', 'High Tech Modern Language', 'Hyper Transfer Markup Language', 'Home Tool Markup Language', 'a'),
(1, 1, 'lesson', 'Which tag is used for the largest heading?', '<h6>', '<heading>', '<h1>', '<head>', 'c'),
(1, 1, 'lesson', 'What is the correct HTML5 doctype declaration?', '<!DOCTYPE html>', '<!DOCTYPE HTML5>', '<doctype html>', '<!html>', 'a'),
(1, 1, 'lesson', 'Which element defines the main content of an HTML document?', '<main>', '<content>', '<section>', '<article>', 'a'),
(1, 1, 'lesson', 'Where should the <title> tag be placed?', 'Inside <body>', 'Inside <head>', 'Inside <footer>', 'After </html>', 'b');

-- Lesson 2: Text, Links & Images
INSERT INTO quiz_questions (course_id, lesson_id, type, question, option_a, option_b, option_c, option_d, correct_option) VALUES
(1, 2, 'lesson', 'Which tag creates a hyperlink?', '<link>', '<a>', '<href>', '<url>', 'b'),
(1, 2, 'lesson', 'What attribute is required for the <img> tag for accessibility?', 'src', 'title', 'alt', 'name', 'c'),
(1, 2, 'lesson', 'Which tag makes text bold?', '<b> or <strong>', '<bold>', '<heavy>', '<thick>', 'a'),
(1, 2, 'lesson', 'What does target="_blank" do in an anchor tag?', 'Opens link in the same tab', 'Opens link in a new tab', 'Downloads the link', 'Highlights the link', 'b'),
(1, 2, 'lesson', 'Which tag is used for an unordered (bullet) list?', '<ol>', '<list>', '<ul>', '<dl>', 'c');

-- Lesson 3: CSS Selectors & Box Model
INSERT INTO quiz_questions (course_id, lesson_id, type, question, option_a, option_b, option_c, option_d, correct_option) VALUES
(1, 3, 'lesson', 'Which CSS selector targets elements with a specific class?', '#className', '.className', '*className', '&className', 'b'),
(1, 3, 'lesson', 'What are the four layers of the CSS Box Model (inside to outside)?', 'Content, Padding, Border, Margin', 'Margin, Border, Padding, Content', 'Border, Content, Margin, Padding', 'Content, Border, Margin, Padding', 'a'),
(1, 3, 'lesson', 'What does box-sizing: border-box do?', 'Removes the border', 'Includes padding and border in the element width', 'Adds an automatic margin', 'Makes the box invisible', 'b'),
(1, 3, 'lesson', 'Which selector has the highest specificity?', 'Element selector (p)', 'Class selector (.name)', 'ID selector (#name)', 'Universal selector (*)', 'c'),
(1, 3, 'lesson', 'How do you add a comment in CSS?', '// comment', '<!-- comment -->', '/* comment */', '# comment', 'c');

-- Lesson 4: Flexbox Layout
INSERT INTO quiz_questions (course_id, lesson_id, type, question, option_a, option_b, option_c, option_d, correct_option) VALUES
(1, 4, 'lesson', 'Which CSS property activates Flexbox?', 'display: block', 'display: flex', 'display: grid', 'position: flex', 'b'),
(1, 4, 'lesson', 'What does justify-content control in Flexbox?', 'Alignment on the cross axis', 'Alignment on the main axis', 'The size of flex items', 'The order of items', 'b'),
(1, 4, 'lesson', 'What does align-items: center do?', 'Centers items horizontally', 'Centers items on the cross axis', 'Centers the flex container', 'Centers only the first item', 'b'),
(1, 4, 'lesson', 'What is the default flex-direction?', 'column', 'row', 'row-reverse', 'column-reverse', 'b'),
(1, 4, 'lesson', 'Which property adds spacing between flex items without margins?', 'spacing', 'padding', 'gap', 'gutter', 'c');

-- Lesson 5: Responsive Design & Media Queries
INSERT INTO quiz_questions (course_id, lesson_id, type, question, option_a, option_b, option_c, option_d, correct_option) VALUES
(1, 5, 'lesson', 'What meta tag is essential for responsive design?', '<meta charset="UTF-8">', '<meta name="viewport" content="width=device-width, initial-scale=1.0">', '<meta name="responsive" content="true">', '<meta http-equiv="mobile">', 'b'),
(1, 5, 'lesson', 'What does "mobile-first" design mean?', 'Designing only for mobile devices', 'Writing base CSS for mobile, then adding media queries for larger screens', 'Using only mobile frameworks', 'Hiding content on desktop', 'b'),
(1, 5, 'lesson', 'Which media query applies styles for screens 768px and wider?', '@media (max-width: 768px)', '@media (min-width: 768px)', '@media (width: 768px)', '@media screen 768px', 'b'),
(1, 5, 'lesson', 'Which unit is relative to the root font size?', 'px', 'em', 'rem', '%', 'c'),
(1, 5, 'lesson', 'What does vw stand for?', 'Variable width', 'Viewport width', 'Visual width', 'Vector width', 'b');

-- Lesson 6: Variables, Data Types & Operators (JS)
INSERT INTO quiz_questions (course_id, lesson_id, type, question, option_a, option_b, option_c, option_d, correct_option) VALUES
(2, 6, 'lesson', 'Which keyword declares a constant in JavaScript?', 'var', 'let', 'const', 'static', 'c'),
(2, 6, 'lesson', 'What is the result of typeof "hello"?', 'text', 'string', 'char', 'word', 'b'),
(2, 6, 'lesson', 'What does === check?', 'Value only', 'Value and type', 'Reference only', 'Type only', 'b'),
(2, 6, 'lesson', 'Which is NOT a primitive data type in JavaScript?', 'string', 'number', 'array', 'boolean', 'c'),
(2, 6, 'lesson', 'What is the value of let x; console.log(x)?', 'null', '0', 'undefined', 'error', 'c');

-- Lesson 7: Functions & Control Flow (JS)
INSERT INTO quiz_questions (course_id, lesson_id, type, question, option_a, option_b, option_c, option_d, correct_option) VALUES
(2, 7, 'lesson', 'What is the arrow function syntax for adding two numbers?', 'function add(a, b) => a + b', 'const add = (a, b) => a + b', 'const add = a, b -> a + b', 'add => (a, b) = a + b', 'b'),
(2, 7, 'lesson', 'Which loop is best for iterating over an array?', 'for...in', 'for...of', 'while', 'do...while', 'b'),
(2, 7, 'lesson', 'What does the return statement do?', 'Logs output to console', 'Exits the function and sends back a value', 'Restarts the function', 'Deletes the function', 'b'),
(2, 7, 'lesson', 'What will if (0) { "yes" } else { "no" } evaluate to?', 'yes', 'no', 'error', '0', 'b'),
(2, 7, 'lesson', 'Which is a valid function declaration?', 'function = greet() {}', 'def greet() {}', 'function greet() {}', 'func greet() {}', 'c');

-- Lesson 8: DOM Manipulation (JS)
INSERT INTO quiz_questions (course_id, lesson_id, type, question, option_a, option_b, option_c, option_d, correct_option) VALUES
(2, 8, 'lesson', 'Which method selects an element by its CSS selector?', 'document.getElement()', 'document.querySelector()', 'document.find()', 'document.select()', 'b'),
(2, 8, 'lesson', 'How do you change the text content of an element safely?', 'element.innerHTML = "text"', 'element.textContent = "text"', 'element.value = "text"', 'element.text = "text"', 'b'),
(2, 8, 'lesson', 'What does document.createElement("p") do?', 'Selects a p element', 'Creates a new paragraph element in memory', 'Deletes a paragraph', 'Styles a paragraph', 'b'),
(2, 8, 'lesson', 'How do you add a CSS class to an element?', 'element.class = "name"', 'element.classList.add("name")', 'element.addStyle("name")', 'element.css("name")', 'b'),
(2, 8, 'lesson', 'What does querySelectorAll return?', 'A single element', 'A NodeList of all matching elements', 'An error if multiple matches', 'The first match only', 'b');

-- Lesson 9: Events & Form Handling (JS)
INSERT INTO quiz_questions (course_id, lesson_id, type, question, option_a, option_b, option_c, option_d, correct_option) VALUES
(2, 9, 'lesson', 'Which method attaches an event handler in modern JavaScript?', 'element.onclick()', 'element.addEventListener()', 'element.attachEvent()', 'element.on()', 'b'),
(2, 9, 'lesson', 'What does e.preventDefault() do on a form submit?', 'Validates the form', 'Stops the page from reloading', 'Clears all form fields', 'Submits the form twice', 'b'),
(2, 9, 'lesson', 'How do you access the value of a form input named "email"?', 'form.email.text', 'form.email.value', 'form.getInput("email")', 'form.email.content', 'b'),
(2, 9, 'lesson', 'Which event fires when a user clicks a button?', 'hover', 'submit', 'click', 'change', 'c'),
(2, 9, 'lesson', 'What is event.target?', 'The parent element', 'The element that triggered the event', 'The event type', 'The default action', 'b');

-- Lesson 10: Fetch API & Async JavaScript
INSERT INTO quiz_questions (course_id, lesson_id, type, question, option_a, option_b, option_c, option_d, correct_option) VALUES
(2, 10, 'lesson', 'What does fetch() return?', 'A string', 'A Promise', 'An array', 'An object', 'b'),
(2, 10, 'lesson', 'Which method parses a JSON response body?', 'response.text()', 'response.json()', 'response.parse()', 'response.data()', 'b'),
(2, 10, 'lesson', 'What keyword pauses execution until a Promise resolves?', 'wait', 'pause', 'await', 'hold', 'c'),
(2, 10, 'lesson', 'Which is the correct way to handle errors in async/await?', 'if/else', 'try/catch', '.error()', 'onError()', 'b'),
(2, 10, 'lesson', 'What HTTP method is used to send data to a server?', 'GET', 'POST', 'FETCH', 'SEND', 'b');


-- ============================================================
-- FINAL EXAM QUESTIONS (5 per course, type = 'final')
-- ============================================================

-- Course 1: HTML & CSS Final Exam
INSERT INTO quiz_questions (course_id, lesson_id, type, question, option_a, option_b, option_c, option_d, correct_option) VALUES
(1, NULL, 'final', 'Which HTML element is used for the main navigation of a website?', '<nav>', '<menu>', '<navigation>', '<links>', 'a'),
(1, NULL, 'final', 'What is the difference between margin and padding?', 'They are the same', 'Margin is outside the border, padding is inside', 'Padding is outside the border, margin is inside', 'Margin is only for horizontal spacing', 'b'),
(1, NULL, 'final', 'How do you center a flex container''s children both horizontally and vertically?', 'text-align: center; vertical-align: middle', 'display: flex; justify-content: center; align-items: center', 'margin: auto', 'position: center', 'b'),
(1, NULL, 'final', 'Which approach is recommended for modern responsive design?', 'Desktop-first with max-width queries', 'Mobile-first with min-width queries', 'Using only fixed pixel widths', 'Separate CSS files for each device', 'b'),
(1, NULL, 'final', 'What does the alt attribute in an <img> tag provide?', 'A tooltip on hover', 'Alternative text for screen readers and when image fails to load', 'A caption below the image', 'The image file format', 'b');

-- Course 2: JavaScript Final Exam
INSERT INTO quiz_questions (course_id, lesson_id, type, question, option_a, option_b, option_c, option_d, correct_option) VALUES
(2, NULL, 'final', 'What is the difference between let and const?', 'let is global, const is local', 'let can be reassigned, const cannot', 'There is no difference', 'const is faster than let', 'b'),
(2, NULL, 'final', 'What does the DOM stand for?', 'Direct Object Model', 'Document Object Model', 'Data Output Manager', 'Dynamic Object Mapping', 'b'),
(2, NULL, 'final', 'Which method prevents a form from submitting and reloading the page?', 'event.stopPropagation()', 'event.preventDefault()', 'event.stopDefault()', 'form.cancel()', 'b'),
(2, NULL, 'final', 'What is the purpose of async/await in JavaScript?', 'To make code run faster', 'To handle asynchronous operations in a synchronous-looking style', 'To create multiple threads', 'To import modules', 'b'),
(2, NULL, 'final', 'How do you send a POST request with JSON data using fetch?', 'fetch(url, { method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify(data) })', 'fetch(url).post(data)', 'fetch.post(url, data)', 'fetch(url, data, "POST")', 'a');


-- ── Seed enrollment: Alex enrolled in HTML & CSS ─────────────
INSERT INTO enrollments (user_id, course_id) VALUES (1, 1);
