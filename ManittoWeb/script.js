// Firebase 설정 (Firebase 콘솔에서 가져온 config 붙여넣기)
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT.firebaseio.com",
  projectId: "YOUR_PROJECT",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// 고정 참가 코드
const PARTICIPANT_CODE = "123456";

// 화면 요소
const joinScreen = document.getElementById('join-screen');
const waitingScreen = document.getElementById('waiting-screen');
const matchedScreen = document.getElementById('matched-screen');
const chatScreen = document.getElementById('chat-screen');
const adminScreen = document.getElementById('admin-screen');

const codeInput = document.getElementById('code-input');
const nameInput = document.getElementById('name-input');
const joinBtn = document.getElementById('join-btn');
const joinMsg = document.getElementById('join-msg');

const participantCountEl = document.getElementById('participant-count');
const matchedNameEl = document.getElementById('matched-name');
const openChatBtn = document.getElementById('open-chat-btn');

const receivedMessagesEl = document.getElementById('received-messages');
const sentMessagesEl = document.getElementById('sent-messages');
const chatInput = document.getElementById('chat-input');
const sendBtn = document.getElementById('send-btn');
const backBtn = document.getElementById('back-btn');

const runMatchingBtn = document.getElementById('run-matching-btn');
const resetBtn = document.getElementById('reset-btn');
const adminMsg = document.getElementById('admin-msg');

let myName = "";
let matchedTo = "";
let messagesSentToday = 0;

// 관리자 화면 자동 표시
if (window.location.search.includes("admin=true")) {
  adminScreen.style.display = "block";
  joinScreen.style.display = "none";
  waitingScreen.style.display = "none";
}

// 참가하기 버튼
joinBtn.addEventListener('click', () => {
  const code = codeInput.value.trim();
  const name = nameInput.value.trim();

  if (code !== PARTICIPANT_CODE) {
    joinMsg.textContent = "잘못된 코드입니다.";
    return;
  }
  if (!name) {
    joinMsg.textContent = "실명을 입력해주세요.";
    return;
  }

  myName = name;

  db.ref('participants/' + myName).set({
    name: myName,
    matchedTo: "",
    messages: [],
    sentCount: 0
  });

  joinScreen.style.display = "none";
  waitingScreen.style.display = "block";

  db.ref('participants').on('value', snapshot => {
    const participants = snapshot.val() || {};
    participantCountEl.textContent = Object.keys(participants).length;
  });

  db.ref('participants/' + myName + '/matchedTo').on('value', snapshot => {
    const match = snapshot.val();
    if (match) {
      matchedTo = match;
      waitingScreen.style.display = "none";
      matchedScreen.style.display = "block";
      matchedNameEl.textContent = matchedTo;
    }
  });
});

// 채팅 화면 열기
openChatBtn.addEventListener('click', () => {
  matchedScreen.style.display = "none";
  chatScreen.style.display = "block";

  db.ref('participants/' + matchedTo + '/messages').on('value', snapshot => {
    const messages = snapshot.val() || [];
    receivedMessagesEl.innerHTML = '';
    messages.forEach(msg => {
      const li = document.createElement('li');
      li.textContent = msg;
      receivedMessagesEl.appendChild(li);
    });
  });

  db.ref('participants/' + myName + '/messages').on('value', snapshot => {
    const messages = snapshot.val() || [];
    sentMessagesEl.innerHTML = '';
    messages.forEach(msg => {
      const li = document.createElement('li');
      li.textContent = msg;
      sentMessagesEl.appendChild(li);
    });
  });

  // 오늘 보낸 메시지 수 가져오기
  db.ref('participants/' + myName + '/sentCount').once('value', snap => {
    messagesSentToday = snap.val() || 0;
  });
});

// 메시지 보내기 (하루 3개 제한)
sendBtn.addEventListener('click', () => {
  if (messagesSentToday >= 3) {
    alert("오늘 보낼 수 있는 메시지 수를 모두 사용했습니다.");
    return;
  }
  const msg = chatInput.value.trim();
  if (!msg || !matchedTo) return;

  db.ref('participants/' + matchedTo + '/messages').push(msg);
  db.ref('participants/' + myName + '/messages').push(msg);

  messagesSentToday++;
  db.ref('participants/' + myName + '/sentCount').set(messagesSentToday);
  chatInput.value = '';
});

// 뒤로
backBtn.addEventListener('click', () => {
  chatScreen.style.display = "none";
  matchedScreen.style.display = "block";
});

// 관리자 강제 매칭
runMatchingBtn.addEventListener('click', () => {
  db.ref('participants').once('value').then(snapshot => {
    const participants = snapshot.val();
    if (!participants) return;
    let names = Object.keys(participants);
    if (names.length < 2) {
      adminMsg.textContent = "참가자가 너무 적습니다.";
      return;
    }

    names = shuffleArray(names);
    for (let i = 0; i < names.length; i++) {
      const giver = names[i];
      const receiver = names[(i + 1) % names.length];
      db.ref('participants/' + giver + '/matchedTo').set(receiver);
    }
    db.ref('matchingDone').set(true);
    adminMsg.textContent = "매칭 완료!";
  });
});

// 전체 초기화
resetBtn.addEventListener('click', () => {
  db.ref().set({ participants: {}, matchingDone: false });
  adminMsg.textContent = "전체 초기화 완료!";
});

// 배열 랜덤 섞기
function shuffleArray(array) {
  for (let i = array.length -1; i>0; i--){
    const j = Math.floor(Math.random()* (i+1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}
