import { db } from "./firebase-config.js";

import {
  ref,
  set,
  update,
  get,
  onValue
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

/* ------------------------- */
/* ELEMENTS */
/* ------------------------- */

const screens = {
  home: document.getElementById("homeScreen"),
  waiting: document.getElementById("waitingScreen"),
  secret: document.getElementById("secretScreen"),
  game: document.getElementById("gameScreen")
};

const createBtn = document.getElementById("createBtn");
const joinBtn = document.getElementById("joinBtn");

const roomInput = document.getElementById("roomInput");

const roomCodeBox = document.getElementById("roomCodeBox");

const copyBtn = document.getElementById("copyBtn");

const secretInput = document.getElementById("secretInput");

const readyBtn = document.getElementById("readyBtn");

const readyStatus = document.getElementById("readyStatus");

const guessInput = document.getElementById("guessInput");

const guessBtn = document.getElementById("guessBtn");

const resultBox = document.getElementById("resultBox");

const turnBox = document.getElementById("turnBox");

const patternBox =
  document.getElementById(
    "patternBox"
  );

const myAttempts = document.getElementById("myAttempts");

const enemyAttempts = document.getElementById("enemyAttempts");

const mySecretNumber =
  document.getElementById(
    "mySecretNumber"
  );

const historyList = document.getElementById("historyList");

const resultModal = document.getElementById("resultModal");

const resultTitle = document.getElementById("resultTitle");

const resultText = document.getElementById("resultText");

const playAgainBtn = document.getElementById("playAgainBtn");


const leaveBtn =
  document.getElementById(
    "leaveBtn"
  );

/* ------------------------- */
/* VARIABLES */
/* ------------------------- */

let roomId = "";

let myRole = "";

let gameEnded = false;
const params =
  new URLSearchParams(
    window.location.search
  );

const inviteRoom =
  params.get("room");

/* ------------------------- */
/* SCREEN SYSTEM */
/* ------------------------- */

function showScreen(screenName){

  Object.values(screens).forEach(screen=>{
    screen.classList.remove("active");
  });

  screens[screenName].classList.add("active");
}

/* ------------------------- */
/* ROOM CODE */
/* ------------------------- */

function generateRoomCode(){

  return Math.random()
    .toString(36)
    .substring(2,7)
    .toUpperCase();
}

/* ------------------------- */
/* VALIDATION */
/* ------------------------- */

function isValidNumber(number){

  if(number.length !== 4){
    return false;
  }

  const uniqueDigits =
    new Set(number.split(""));

  return uniqueDigits.size === 4;
}

/* ------------------------- */
/* BULLS & COWS */
/* ------------------------- */

function generatePattern(
  guess,
  secret
){

  let pattern = [];

  for(let i=0; i<4; i++){

    if(guess[i] === secret[i]){

      pattern.push(
        guess[i]
      );
    }

    else{

      pattern.push("_");
    }
  }

  return pattern.join(" ");
}

function calculateResult(guess, secret){

  let bulls = 0;
  let cows = 0;

  for(let i=0; i<4; i++){

    if(guess[i] === secret[i]){

      bulls++;
    }

    else if(secret.includes(guess[i])){

      cows++;
    }
  }

  return { bulls, cows };
}

/* ------------------------- */
/* CREATE ROOM */
/* ------------------------- */

createBtn.onclick = async ()=>{

  roomId = generateRoomCode();

  myRole = "player1";
  localStorage.setItem(
  "bullsRoom",
  roomId
);

localStorage.setItem(
  "bullsRole",
  myRole
);

  await set(
    ref(db, "bullsRooms/" + roomId),
    {
      state:"waiting",

      turn:null,

      winner:null,

      history:[],

      player1:{
        ready:false,
        attempts:0,
        rematch:false
      }
    }
  );

  roomCodeBox.innerText = roomId;
const inviteLink =
  window.location.origin +
  "/guesswar/bulls-cows.html?room=" +
  roomId;

copyBtn.dataset.link =
  inviteLink;
  
  showScreen("waiting");

  listenRoom();
};

/* ------------------------- */
/* JOIN ROOM */
/* ------------------------- */

joinBtn.onclick = async ()=>{

  roomId =
    roomInput.value.toUpperCase();

  const snapshot = await get(
    ref(db, "bullsRooms/" + roomId)
  );

  if(!snapshot.exists()){

    alert("Room Not Found");

    return;
  }

  myRole = "player2";
localStorage.setItem(
  "bullsRoom",
  roomId
);

localStorage.setItem(
  "bullsRole",
  myRole
);
  
  await update(
    ref(db, "bullsRooms/" + roomId),
    {
      state:"choosing",

      player2:{
        ready:false,
        attempts:0,
        rematch:false
      }
    }
  );

  showScreen("secret");

  listenRoom();
};

/* ------------------------- */
/* COPY ROOM */
/* ------------------------- */

copyBtn.onclick = async ()=>{

  const inviteLink =
    copyBtn.dataset.link;

  const shareText =
    "Jaldi join karlo 🎮\n\n" +
    inviteLink;

  /* MOBILE SHARE */

  if(navigator.share){

    try{

      await navigator.share({

        title:"Bulls & Cows",

        text:shareText

      });

    }

    catch(error){

      console.log(error);
    }
  }

  /* FALLBACK */

  else{

    navigator.clipboard.writeText(
      inviteLink
    );

    copyBtn.innerText =
      "Link Copied!";

    setTimeout(()=>{

      copyBtn.innerText =
        "Share Invite";

    },1500);
  }
};

/* ------------------------- */
/* READY */
/* ------------------------- */

readyBtn.onclick = async ()=>{

  const secret =
    secretInput.value;

  if(!isValidNumber(secret)){

    alert(
      "Enter 4 unique digits"
    );

    return;
  }

  await update(
    ref(
      db,
      "bullsRooms/" +
      roomId +
      "/" +
      myRole
    ),
    {
      secret:secret,
      attempts:0,
      ready:true,
      online:true,
      rematch:false
    }
  );

  secretInput.value = "";

  secretInput.disabled = true;

  readyBtn.disabled = true;

  readyStatus.innerText =
    "Waiting for opponent...";
  mySecretNumber.innerText =
  secret;
};

/* ------------------------- */
/* GUESS */
/* ------------------------- */

guessBtn.onclick = async ()=>{

  if(gameEnded) return;

  const guess =
    guessInput.value;

  if(!isValidNumber(guess)){

    alert(
      "Enter 4 unique digits"
    );

    return;
  }

  const snapshot = await get(
    ref(db, "bullsRooms/" + roomId)
  );

  const data = snapshot.val();

  if(data.turn !== myRole){

    resultBox.innerText =
      "WAIT FOR YOUR TURN";

    return;
  }

  const opponentData =
  myRole === "player1"
  ? data.player2
  : data.player1;

if(opponentData){

  if(opponentData.online === false){

    turnBox.innerText =
      "Opponent Disconnected";
  }
}
  
  const opponent =
    myRole === "player1"
    ? data.player2
    : data.player1;

  const me =
    myRole === "player1"
    ? data.player1
    : data.player2;

  const attempts =
    (me.attempts || 0) + 1;

  const result =
    calculateResult(
      guess,
      opponent.secret
    );

  await update(
    ref(
      db,
      "bullsRooms/" +
      roomId +
      "/" +
      myRole
    ),
    {
      attempts:attempts
    }
  );

  myAttempts.innerText =
    attempts;

  const pattern =
  generatePattern(
    guess,
    opponent.secret
  );

patternBox.innerText =
  pattern;

if(result.cows > 0){

  resultBox.innerText =
    "🟧 " +
    result.cows +
    " Cow" +
    (result.cows > 1 ? "s" : "");

}

else{

  resultBox.innerText =
    "No Cows";
}

  const history =
    data.history || [];

  history.push({
    by:myRole,
    guess:guess,
    bulls:result.bulls,
    cows:result.cows
  });

  await update(
    ref(db, "bullsRooms/" + roomId),
    {
      history:history
    }
  );

  if(result.bulls === 4){

    gameEnded = true;

    await update(
      ref(db, "bullsRooms/" + roomId),
      {
        state:"ended",
        winner:myRole
      }
    );

    showResult(true, attempts);
  }

  else{

    await update(
      ref(db, "bullsRooms/" + roomId),
      {
        turn:
          myRole === "player1"
          ? "player2"
          : "player1"
      }
    );
  }

  guessInput.value = "";
};

/* ------------------------- */
/* RESULT MODAL */
/* ------------------------- */

function showResult(win, attempts=0){

  resultModal.classList.remove("hidden");

  if(win){

    resultTitle.innerText =
      "YOU WON";

    resultText.innerText =
      "Attempts Used: " +
      attempts;
  }

  else{

    resultTitle.innerText =
      "YOU LOST";

    resultText.innerText =
      "Opponent guessed correctly.";
  }
}

/* ------------------------- */
/* PLAY AGAIN */
/* ------------------------- */

playAgainBtn.onclick = async ()=>{

  await update(
    ref(
      db,
      "bullsRooms/" +
      roomId +
      "/" +
      myRole
    ),
    {
      rematch:true
    }
  );

  playAgainBtn.innerText =
    "Waiting...";
};

/* ------------------------- */
/* LISTENER */
/* ------------------------- */

function listenRoom(){

  onValue(
    ref(db, "bullsRooms/" + roomId),

    async (snapshot)=>{

      const data = snapshot.val();

      if(!data) return;

      /* PLAYER JOINED */

      if(
        data.state === "choosing" &&
        myRole === "player1"
      ){

        showScreen("secret");
      }

      /* START GAME */

      if(
        myRole === "player1" &&
        data.player1?.ready &&
        data.player2?.ready &&
        data.state === "choosing"
      ){

        const randomTurn =
          Math.random() < 0.5
          ? "player1"
          : "player2";

        await update(
          ref(
            db,
            "bullsRooms/" + roomId
          ),
          {
            state:"playing",
            turn:randomTurn
          }
        );
      }

      /* GAME START */

      if(data.state === "playing"){

        showScreen("game");
      }

      /* TURN */

      if(data.turn === myRole){

        turnBox.innerText =
          "YOUR TURN";

        guessBtn.disabled = false;
      }

      else{

        turnBox.innerText =
          "OPPONENT TURN";

        guessBtn.disabled = true;
      }

      /* ATTEMPTS */

      const opponent =
        myRole === "player1"
        ? data.player2
        : data.player1;

      if(opponent){

        enemyAttempts.innerText =
          opponent.attempts || 0;
      }

      /* HISTORY */

      historyList.innerHTML = "";

      if(data.history){

        data.history
  .filter(item => item.by === myRole)
  .slice()
  .reverse()
  .forEach(item=>{

            const div =
              document.createElement("div");

            div.classList.add(
              "history-item"
            );

            div.innerHTML = `

  <span class="guess-number">
    ${item.guess}
  </span>

  <span class="history-result">

    ${
      item.cows > 0
      ? "🟧 " + item.cows + " Cow" +
        (item.cows > 1 ? "s" : "")
      : "No Cows"
    }

  </span>

`;

            historyList.appendChild(div);
          });
      }

      /* GAME END */

      if(
        data.state === "ended" &&
        data.winner !== myRole &&
        !gameEnded
      ){

        gameEnded = true;

        showResult(false);
      }

      /* REMATCH */

      if(
        data.player1?.rematch &&
        data.player2?.rematch
      ){

        gameEnded = false;

        resultModal.classList.add(
          "hidden"
        );

        playAgainBtn.innerText =
          "PLAY AGAIN";

        resultBox.innerText =
          "Waiting for first move...";

        myAttempts.innerText = "0";

        enemyAttempts.innerText = "0";

        historyList.innerHTML = "";

        secretInput.disabled = false;

        readyBtn.disabled = false;

        readyStatus.innerText = "";

        await update(
          ref(
            db,
            "bullsRooms/" + roomId
          ),
          {
            state:"choosing",

            turn:null,

            winner:null,

            history:[],

            player1:{
              ready:false,
              attempts:0,
              rematch:false
            },

            player2:{
              ready:false,
              attempts:0,
              rematch:false
            }
          }
        );

        showScreen("secret");
      }

    }
  );
}
if(inviteRoom){

  roomInput.value =
    inviteRoom;

  setTimeout(()=>{

    joinBtn.click();

  },500);
}

window.addEventListener(
  "beforeunload",
  async ()=>{

    const savedRoom =
      localStorage.getItem(
        "bullsRoom"
      );

    const savedRole =
      localStorage.getItem(
        "bullsRole"
      );

    if(savedRoom && savedRole){

      await update(
        ref(
          db,
          "bullsRooms/" +
          savedRoom +
          "/" +
          savedRole
        ),
        {
          online:false
        }
      );
    }
  }
);

const savedRoom =
  localStorage.getItem(
    "bullsRoom"
  );

const savedRole =
  localStorage.getItem(
    "bullsRole"
  );

if(savedRoom && savedRole){

  roomId = savedRoom;

  myRole = savedRole;

  update(
    ref(
      db,
      "bullsRooms/" +
      roomId +
      "/" +
      myRole
    ),
    {
      online:true
    }
  );

  listenRoom();

  get(
    ref(
      db,
      "bullsRooms/" + roomId
    )
  ).then(snapshot=>{

    const data = snapshot.val();

    if(!data) return;

    if(
      data.state === "playing" ||
      data.state === "ended"
    ){

      showScreen("game");
    }

    else{

      showScreen("secret");
    }
  });
}


leaveBtn.onclick = async ()=>{

  if(roomId && myRole){

    await update(
      ref(
        db,
        "bullsRooms/" +
        roomId +
        "/" +
        myRole
      ),
      {
        online:false
      }
    );
  }

  localStorage.removeItem(
    "bullsRoom"
  );

  localStorage.removeItem(
    "bullsRole"
  );

  window.location.href =
    "/guesswar/bulls-cows.html";
};

