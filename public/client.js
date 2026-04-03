// client.js — front-end logic
const socket = io();
const chatArea = document.getElementById('chatArea');
const nameInput = document.getElementById('name');
const msgInput = document.getElementById('msg');
const sendBtn = document.getElementById('sendBtn');
const fileInput = document.getElementById('fileInput');
const fileQueue = document.getElementById('fileQueue');
const emojiBtn = document.getElementById('emojiBtn');
const emojiPicker = document.getElementById('emojiPicker');

// Generate a cute anon handle if no name
const anonTag = 'Anon#' + Math.random().toString(36).slice(2, 6);
nameInput.placeholder = `Name (optional, e.g., ${anonTag})`;

// Tell others you joined (only name, if set)
socket.emit('hello', { name: nameInput.value || null });

// Listen for chat messages
socket.on('chat', (data) => {
  addMessage(data.name, data.text, data.at);
});
// System join/leave
socket.on('system', (evt) => {
  if (evt.type === 'join') {
    addSystem(`Someone joined${evt.name ? ' as ' + safe(evt.name) : ''} ✨`);
  } else if (evt.type === 'leave') {
    addSystem('Someone left 👋');
  }
});
// File shares
socket.on('fileShared', (f) => {
  addFileMessage(f, f.at);
});

// Send message
document.getElementById('controls').addEventListener('submit', (e) => {
  e.preventDefault();
  const text = msgInput.value.trim();
  if (!text && fileInput.files.length === 0) return;

  const name = nameInput.value.trim() || null;

  // If there's a text message, send it
  if (text) {
    socket.emit('chat', { text, name });
    msgInput.value = '';
    msgInput.style.height = 'auto';
  }

  // If there are files, upload and then announce
  if (fileInput.files.length > 0) {
    const files = Array.from(fileInput.files);
    uploadFiles(files, name);
    fileInput.value = ''; // reset input
    fileQueue.innerHTML = '';
  }
});

// Auto-grow textarea
msgInput.addEventListener('input', () => {
  msgInput.style.height = 'auto';
  msgInput.style.height = Math.min(msgInput.scrollHeight, 160) + 'px';
});

// Enter to send (Shift+Enter for newline)
msgInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendBtn.click();
  }
});

// File input chip preview
fileInput.addEventListener('change', () => {
  fileQueue.innerHTML = '';
  const files = Array.from(fileInput.files);
  for (const f of files) {
    const chip = document.createElement('span');
    chip.className = 'file-chip';
    chip.textContent = `${f.name} (${fmtSize(f.size)})`;
    const x = document.createElement('span');
    x.textContent = '✕';
    x.className = 'x';
    x.onclick = () => {
      // remove from FileList is tricky — reset and re-add remaining
      const remain = Array.from(fileInput.files).filter(ff => ff !== f);
      const dt = new DataTransfer();
      remain.forEach(ff => dt.items.add(ff));
      fileInput.files = dt.files;
      chip.remove();
    };
    chip.appendChild(x);
    fileQueue.appendChild(chip);
  }
});

async function uploadFiles(files, name) {
  for (const file of files) {
    const form = new FormData();
    form.append('file', file, file.name);
    form.append('filename', file.name);
    const res = await fetch('/upload', { method: 'POST', body: form });
    if (!res.ok) {
      addSystem(`Upload failed for ${file.name} ❌`);
      continue;
    }
    const info = await res.json();
    const fileInfo = {
      link: info.link,
      filename: info.filename,
      size: info.size,
      mime: info.mime,
      ttlMinutes: info.ttlMinutes,
      name: name || null,
    };
    socket.emit('fileShared', fileInfo);
  }
}

// Emoji picker — small built-in set
const EMOJIS = ['😀','😁','😂','🤣','😊','🥰','😘','😎','🤓','🤩','😇','😉','🙂','🤗','🤭','🤫','🤔','🙃','😴','🤤','😜','🤪','😝','😏','😬','😐','😑','😶','🙄','😳','🥺','😤','😡','🤬','😱','😭','🥲','🤝','🙏','👏','🙌','👍','👎','🤙','👌','🤌','👀','💪','🫶','❤️','🩷','💖','✨','🔥','🎉','🎊','🫡','🍿','🍕','🍪','🧋','☕','🌶️','🧠','🦾','🧡','💙','💜','🤍','🤎'];
function buildEmojiPicker() {
  emojiPicker.innerHTML = '';
  EMOJIS.forEach(e => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = e;
    b.addEventListener('click', () => {
      const start = msgInput.selectionStart || msgInput.value.length;
      const end = msgInput.selectionEnd || msgInput.value.length;
      msgInput.value = msgInput.value.slice(0, start) + e + msgInput.value.slice(end);
      msgInput.focus();
      emojiPicker.classList.remove('open');
    });
    emojiPicker.appendChild(b);
  });
}
buildEmojiPicker();
emojiBtn.addEventListener('click', () => {
  emojiPicker.classList.toggle('open');
});

function addMessage(name, text, at) {
  const el = document.createElement('div');
  el.className = 'msg';
  const head = document.createElement('div');
  head.className = 'head';
  const nameEl = document.createElement('span');
  nameEl.className = 'name';
  nameEl.innerHTML = name ? safe(name) : 'Anon';
  const timeEl = document.createElement('span');
  timeEl.className = 'time';
  timeEl.textContent = ' · ' + new Date(at).toLocaleTimeString();
  const body = document.createElement('div');
  body.className = 'body';
  body.innerHTML = linkify(safe(text));

  el.appendChild(nameEl);
  el.appendChild(timeEl);
  el.appendChild(body);

  chatArea.appendChild(el);
  chatArea.scrollTop = chatArea.scrollHeight;
}

function addFileMessage(f, at) {
  const el = document.createElement('div');
  el.className = 'msg';
  const who = document.createElement('span');
  who.className = 'name';
  who.innerHTML = f.name ? safe(f.name) : 'Anon';
  const timeEl = document.createElement('span');
  timeEl.className = 'time';
  timeEl.textContent = ' · ' + new Date(at).toLocaleTimeString();
  const body = document.createElement('div');
  body.className = 'body';
  body.innerHTML = `📎 <strong>${safe(f.filename)}</strong> — ${fmtSize(f.size)} · <a href="${f.link}" download>Download</a> <span class="time"> (expires in ${f.ttlMinutes}m)</span>`;

  el.appendChild(who);
  el.appendChild(timeEl);
  el.appendChild(body);
  chatArea.appendChild(el);
  chatArea.scrollTop = chatArea.scrollHeight;
}

function addSystem(text) {
  const el = document.createElement('div');
  el.className = 'system';
  el.textContent = text;
  chatArea.appendChild(el);
  chatArea.scrollTop = chatArea.scrollHeight;
}

function safe(s) {
  return s.replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
}
function linkify(text) {
  // very simple linkifier
  return text.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');
}
function fmtSize(n) {
  const units = ['B','KB','MB','GB'];
  let i=0, v=n;
  while (v>=1024 && i<units.length-1) { v/=1024; i++; }
  return `${v.toFixed( (i===0)?0:1 )} ${units[i]}`;
}



const socket = io();

// UI Elements
const chatArea = document.getElementById('chatArea');
const msgForm = document.getElementById('controls');
const msgInput = document.getElementById('msgInput');
const nameInput = document.getElementById('userName');
const typingIndicator = document.getElementById('typingIndicator');
const muteBtn = document.getElementById('muteBtn');

// Audio setup
const popSound = new Audio('https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3');
let isMuted = false;

// Generate consistent colors for avatars
const getAvatarColor = (name) => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return `hsl(${hash % 360}, 60%, 55%)`;
};

// Toggle Mute
muteBtn.addEventListener('click', () => {
    isMuted = !isMuted;
    muteBtn.textContent = isMuted ? '' : '🔊';
});

// Handle Sending
msgForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const msg = msgInput.value.trim();
    const name = nameInput.value.trim() || 'Anon';

    if (msg) {
        socket.emit('chatMessage', { name, text: msg });
        msgInput.value = '';
        socket.emit('stopTyping');
    }
});

// Typing Logic
msgInput.addEventListener('input', () => {
    socket.emit('typing', nameInput.value || 'Someone');
});

// Receive Messages
socket.on('message', (data) => {
    const isSelf = data.name === (nameInput.value || 'Anon');
    
    const div = document.createElement('div');
    div.className = `msg-row ${isSelf ? 'self' : ''}`;
    
    const color = getAvatarColor(data.name);
    const initial = data.name.charAt(0).toUpperCase();

    div.innerHTML = `
        <div class="avatar" style="background: ${color}">${initial}</div>
        <div class="bubble">
            <span class="user-name">${data.name}</span>
            <div class="body">${data.text}</div>
        </div>
    `;

    chatArea.appendChild(div);
    chatArea.scrollTop = chatArea.scrollHeight;

    // Play sound
    if (!isMuted && !isSelf) {
        popSound.play().catch(() => {});
    }
});

// Receive Typing
let typingTimeout;
socket.on('displayTyping', (name) => {
    typingIndicator.textContent = `${name} is typing...`;
    typingIndicator.style.opacity = '1';
    
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
        typingIndicator.style.opacity = '0';
    }, 2000);
});
