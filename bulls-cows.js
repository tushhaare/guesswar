
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

const opponentPattern = document.getElementById( "opponentPattern" );

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

const myAttempts =
  document.getElementById(
    "myAttempts"
  );

const enemyAttempts =
  document.getElementById(
    "enemyAttempts"
  );

const mySecretNumber =
  document.getElementById(
    "mySecretNumber"
  );

const historyList =
  document.getElementById(
    "historyList"
  );

const resultModal =
  document.getElementById(
    "resultModal"
  );

const resultTitle =
  document.getElementById(
    "resultTitle"
  );

const resultText =
  document.getElementById(
    "resultText"
  );

const playAgainBtn =
  document.getElementById(
    "playAgainBtn"
  );

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

/* ------------------------- */
/* INVITE LINK */
/* ------------------------- */

const params =
  new URLSearchParams(
    window.location.search
  );

const inviteRoom =
  params.get("room");

if(inviteRoom){

  roomInput.value =
    inviteRoom;

  history.replaceState(
    {},
    "",
    window.location.pathname
  );
}

/* ------------------------- */
/* SCREEN SYSTEM */
/* ------------------------- */

function showScreen(screenName){

  Object.values(screens).forEach(
    screen=>{
      screen.classList.remove(
        "active"
      );
    }
  );

  screens[screenName]
    .classList.add("active");
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
/* PATTERN */
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

/* ------------------------- */
/* BULLS COWS */
/* ------------------------- */

function calculateResult(
  guess,
  secret
){

  let bulls = 0;
  let cows = 0;

  for(let i=0; i<4; i++){

    if(guess[i] === secret[i]){

      bulls++;
    }

    else if(
      secret.includes(guess[i])
    ){

      cows++;
    }
  }

  return {
    bulls,
    cows
  };
}

/* ------------------------- */
/* CREATE ROOM */
/* ------------------------- */

createBtn.onclick = async ()=>{

  gameEnded = false;

  roomId =
    generateRoomCode();

  myRole = "player1";

  await set(
    ref(
      db,
      "bullsRooms/" + roomId
    ),
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

  roomCodeBox.innerText =
    roomId;

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

  gameEnded = false;

  roomId =
    roomInput.value.toUpperCase();

  const snapshot =
    await get(
      ref(
        db,
        "bullsRooms/" + roomId
      )
    );

  if(!snapshot.exists()){

    alert("Room Not Found");

    return;
  }

  myRole = "player2";

  await update(
    ref(
      db,
      "bullsRooms/" + roomId
    ),
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
/* SHARE */
/* ------------------------- */

copyBtn.onclick = async ()=>{

  const inviteLink =
    copyBtn.dataset.link;

  const shareText =
    "Join my Bulls & Cows game 🎮\n\n" +
    inviteLink;

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

  else{

    navigator.clipboard.writeText(
      inviteLink
    );

    alert("Invite Link Copied");
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
      rematch:false
    }
  );

  mySecretNumber.innerText =
    secret;

  secretInput.value = "";

  secretInput.disabled = true;

  readyBtn.disabled = true;

  readyStatus.innerText =
    "Waiting for opponent...";
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

  const snapshot =
    await get(
      ref(
        db,
        "bullsRooms/" + roomId
      )
    );

  const data =
    snapshot.val();

  if(!data) return;

  /* TURN CHECK */

  if(data.turn !== myRole){

    resultBox.innerText =
      "WAIT FOR YOUR TURN";

    return;
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

const opponentProgressKey =
  myRole === "player1"
  ? "player2Progress"
  : "player1Progress";

const oldProgress =
  data[opponentProgressKey]
  || "_ _ _ _";

const currentReveal =
  oldProgress.split(" ");

for(let i=0; i<4; i++){

  if(
    guess[i] === opponent.secret[i]
  ){

    currentReveal[i] =
      guess[i];
  }
}

await update(
  ref(
    db,
    "bullsRooms/" + roomId
  ),
  {
    [opponentProgressKey]:
      currentReveal.join(" ")
  }
);
  
  /* UPDATE PATTERN */

  const pattern =
    generatePattern(
      guess,
      opponent.secret
    );

  const currentPattern =
    patternBox.innerText
      .split(" ");

  const newPattern =
    pattern.split(" ");

  for(let i=0; i<4; i++){

    if(newPattern[i] !== "_"){

      currentPattern[i] =
        newPattern[i];
    }
  }

  patternBox.innerText =
    currentPattern.join(" ");

  /* COWS RESULT */

  if(result.cows > 0){

    resultBox.innerText =
      "🟧 " +
      result.cows +
      " Cow" +
      (result.cows > 1
      ? "s"
      : "");

  }

  else{

    resultBox.innerText =
      "No Cows";
  }

  /* HISTORY */

  const history =
    data.history || [];

  history.push({

    by:myRole,

    guess:guess,

    cows:result.cows
  });

  /* WIN CONDITION */

  if(result.bulls === 4){

    gameEnded = true;

    await update(
      ref(
        db,
        "bullsRooms/" + roomId
      ),
      {
        history:history,

        winner:myRole,

        state:"ended",

        [`${myRole}/attempts`]:
          attempts
      }
    );

    myAttempts.innerText =
      attempts;

    showResult(
      true,
      attempts
    );

    return;
  }

  /* NORMAL TURN SWITCH */

  await update(
    ref(
      db,
      "bullsRooms/" + roomId
    ),
    {
      history:history,

      turn:
        myRole === "player1"
        ? "player2"
        : "player1"
    }
  );

  /* UPDATE ATTEMPTS SEPARATELY */

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

  guessInput.value = "";
};


/* ------------------------- */
/* RESULT */
/* ------------------------- */

function showResult(
  win,
  attempts = 0
){

  resultModal.classList.remove(
    "hidden"
  );

  if(win){

    resultTitle.innerText =
      "YOU WON";

    resultText.innerText =
      "Attempts: " +
      attempts;
  }

  else{

    resultTitle.innerText =
      "YOU LOST";

    resultText.innerText =
      "Opponent guessed first";
  }
}

/* ------------------------- */
/* REMATCH */
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
    ref(
      db,
      "bullsRooms/" + roomId
    ),

    async snapshot=>{

      const data =
        snapshot.val();

      if(!data) return;

if(myRole === "player1"){

  opponentPattern.innerText =
    data.player1Progress
    || "_ _ _ _";
}

else{

  opponentPattern.innerText =
    data.player2Progress
    || "_ _ _ _";
}
      
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

      /* GAME SCREEN */

      if(data.state === "playing"){

  showScreen("game");

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
}

      /* ATTEMPTS */

      const opponent =
        myRole === "player1"
        ? data.player2
        : data.player1;

      const me =
        myRole === "player1"
        ? data.player1
        : data.player2;

      if(opponent){

        enemyAttempts.innerText =
          opponent.attempts || 0;
      }

      if(me){

        myAttempts.innerText =
          me.attempts || 0;
      }

      /* HISTORY */

      historyList.innerHTML = "";

      if(data.history){

        data.history
          .filter(
            item =>
            item.by === myRole
          )
          .slice()
          .reverse()
          .forEach(item=>{

            const div =
              document.createElement(
                "div"
              );

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
                  ? "🟧 " +
                    item.cows +
                    " Cow" +
                    (item.cows > 1
                    ? "s"
                    : "")
                  : "No Cows"
                }

              </span>

            `;

            historyList.appendChild(
              div
            );
          });
      }

      /* LOSE */

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

        patternBox.innerText =
          "_ _ _ _";

        resultBox.innerText =
          "No guesses yet";

        historyList.innerHTML = "";

        myAttempts.innerText =
          "0";

        enemyAttempts.innerText =
          "0";

        mySecretNumber.innerText =
          "••••";

        secretInput.disabled =
          false;

        readyBtn.disabled =
          false;

        readyStatus.innerText =
          "";

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

/* ------------------------- */
/* LEAVE */
/* ------------------------- */

leaveBtn.onclick = ()=>{

  location.reload();
};
