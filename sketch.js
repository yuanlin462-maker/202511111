// p5.js interactive quiz + CSV generator
let questionBank = [];
let csvText = '';
let selectedQs = [];
let currentQ = 0;
let userAnswers = [];
let particles = [];
let confettiActive = false;
// download/preview controls removed to simplify UI

function setup(){
  // create canvas inside the holder
  const holder = document.getElementById('canvasHolder');
  const cnv = createCanvas(420, 260);
  cnv.parent(holder);
  noStroke();

  // prepare question bank and UI handlers
  questionBank = buildQuestionBank();
  csvText = buildCSV(questionBank);
  // wire buttons

  document.getElementById('startQuiz').addEventListener('click', ()=>{
    startQuiz();
  });

  // initial render of question area
  showIntro();
}

function draw(){
  // animated background gradient
  background(6,12,24);
  for(let y=0;y<height;y+=20){
    let a = map(y,0,height,0,80);
    fill(8,20,40,a);
    rect(0,y,width,20);
  }

  // draw particles (confetti)
  if(confettiActive){
    for(let i=particles.length-1;i>=0;i--){
      particles[i].update();
      particles[i].draw();
      if(particles[i].isDead()) particles.splice(i,1);
    }
    if(particles.length===0) confettiActive=false;
  }
}

function showIntro(){
  const qb = document.getElementById('questionBox');
  qb.innerHTML = '';
  const card = document.createElement('div');
  card.className = 'qcard';
  card.innerHTML = `<div class="qtext">歡迎！按「開始測驗」將從題庫中隨機抽出 3 題，請作答。</div>`;
  qb.appendChild(card);
  const nav = document.getElementById('navButtons');
  nav.innerHTML = '';
}

function startQuiz(){
  // shuffle and pick 3
  const n = min(3, questionBank.length);
  const idxs = shuffle(Array.from(Array(questionBank.length).keys()));
  // copy and shuffle choices for each selected question so even same question appears with different option order
  selectedQs = idxs.slice(0,n).map(i=>shuffleQuestionChoices(questionBank[i]));
  userAnswers = new Array(n).fill(null);
  currentQ = 0;
  showQuestion(currentQ);
  document.getElementById('resultArea').innerHTML = '';
  // 如果 quizArea 是隱藏的，就把它顯示出來
  const quizArea = document.getElementById('quizArea');
  quizArea.classList.remove('quiz-hidden');
}

// return a shallow copy of a question with its choices shuffled and updated answer index
function shuffleQuestionChoices(q){
  const choices = q.choices.map((c,idx)=>({text:c, idx}));
  // shuffle
  for(let i=choices.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [choices[i], choices[j]] = [choices[j], choices[i]];
  }
  const newChoices = choices.map(c=>c.text);
  // find new index of original correct answer
  const newAnswerIndex = choices.findIndex(c=>c.idx === q.answer);
  return { question: q.question, choices: newChoices, answer: newAnswerIndex };
}

function showQuestion(i){
  const qb = document.getElementById('questionBox');
  qb.innerHTML = '';
  currentQ = i;

  // safety: if selectedQs not ready
  if(!selectedQs || selectedQs.length===0) return;

  const q = selectedQs[i];
  const card = document.createElement('div');
  card.className = 'qcard';
  const qnum = document.createElement('div');
  qnum.className = 'qtext';
  qnum.innerHTML = `<strong>第 ${i+1} 題：</strong> ${q.question}`;
  card.appendChild(qnum);

  const choices = document.createElement('div');
  choices.className = 'choices';
  q.choices.forEach((c, idx)=>{
    const b = document.createElement('button');
    b.className = 'choiceBtn';
    b.textContent = String.fromCharCode(65+idx)+'. '+c;
    if(userAnswers[i]===idx) b.classList.add('selected');
    b.addEventListener('click', ()=>{
      // unselect previous
      Array.from(choices.children).forEach(ch=>ch.classList.remove('selected'));
      b.classList.add('selected');
      userAnswers[i]=idx;
      // 延遲讓使用者看到選中狀態
      setTimeout(()=>{
        if(i < selectedQs.length - 1){
          showQuestion(i+1);
        }
      }, 220);
    });
    choices.appendChild(b);
  });

  card.appendChild(choices);
  qb.appendChild(card);

  // nav
  const nav = document.getElementById('navButtons');
  nav.innerHTML = '';

  const prev = document.createElement('button');
  prev.textContent = '上題';
  prev.disabled = (i===0);
  prev.addEventListener('click', ()=>{ showQuestion(Math.max(0,i-1)); });
  nav.appendChild(prev);

  if(i < selectedQs.length-1){
    const next = document.createElement('button');
    next.textContent = '下一題';
    next.addEventListener('click', ()=>{ showQuestion(Math.min(selectedQs.length-1,i+1)); });
    nav.appendChild(next);
  } else {
    const submit = document.createElement('button');
    submit.textContent = '提交並計分';
    submit.addEventListener('click', ()=>{ submitQuiz(); });
    nav.appendChild(submit);
  }

  const retry = document.createElement('button');
  retry.textContent = '重新抽題';
  retry.addEventListener('click', ()=>{ startQuiz(); });
  nav.appendChild(retry);
}

function submitQuiz(){
  // compute score
  let correct = 0;
  selectedQs.forEach((q, i)=>{
    if(userAnswers[i]===q.answer) correct++;
  });
  const score = Math.round((correct/selectedQs.length)*100);
  showResult(correct, selectedQs.length, score);
}

function showResult(correct, total, score){
  const area = document.getElementById('resultArea');
  area.innerHTML = '';
  area.style.position = 'absolute';
  area.style.top = '20px';
  area.style.left = '50%';
  area.style.transform = 'translateX(-50%)';
  area.style.width = '100%';
  area.style.textAlign = 'center';
  area.style.zIndex = '100';
  
  // 隱藏題目區域
  document.getElementById('quizArea').classList.add('quiz-hidden');

  // result container centered
  const container = document.createElement('div');
  container.className = 'resultContainer';

  const s = document.createElement('div');
  s.className = 'score';
  s.style.fontSize = '24px';
  s.style.fontWeight = 'bold';
  s.style.marginBottom = '10px';
  s.textContent = `成績： ${score} / 100 （答對 ${correct} / ${total} 題）`;
  area.appendChild(s);
  // 清除底下的導航按鈕（避免被絕對定位的結果區蓋住）
  const nav = document.getElementById('navButtons');
  if(nav) nav.innerHTML = '';

  // 加入一個顯眼的重新抽題按鈕到結果區，方便使用者直接重新開始
  const retryBtn = document.createElement('button');
  retryBtn.textContent = '重新抽題';
  retryBtn.style.marginTop = '8px';
  retryBtn.style.padding = '8px 14px';
  retryBtn.style.borderRadius = '8px';
  retryBtn.addEventListener('click', ()=>{ startQuiz(); });
  area.appendChild(retryBtn);
  
  // 不立即顯示建議文字，等待查看答案時再顯示
  // const fb = document.createElement('div');
  // fb.className = 'feedback';
  // if(score>=90) fb.textContent = '太棒了！幾乎全對，持續保持。';
  // else if(score>=70) fb.textContent = '不錯！還有進步空間，稍微複習即可。';
  // else fb.textContent = '建議再加強基礎，多練習會有提升。';
  // container.appendChild(fb);

  // show all questions and selected answers (review)
  const reviewList = document.createElement('div');
  reviewList.className = 'reviewList';
  selectedQs.forEach((q,i)=>{
    const card = document.createElement('div');
    card.className = 'qcard reviewQ';
    const qh = document.createElement('div');
    qh.className = 'qtext';
    qh.innerHTML = `<strong>題 ${i+1}：</strong> ${q.question}`;
    card.appendChild(qh);

    const choices = document.createElement('div');
    choices.className = 'choices';
    q.choices.forEach((c, idx)=>{
      const ch = document.createElement('div');
      ch.className = 'choice-review';
      ch.textContent = String.fromCharCode(65+idx)+'. '+c;
      // mark selected and correctness
      if(userAnswers[i] === idx){
        if(idx === q.answer){
          ch.classList.add('selected-correct');
        } else {
          ch.classList.add('selected-wrong');
        }
      }
      // mark correct answer visually (if user did not select it, show dashed outline)
      if(idx === q.answer && userAnswers[i] !== idx){
        ch.classList.add('correct-answer');
      }
      choices.appendChild(ch);
    });
    card.appendChild(choices);
    reviewList.appendChild(card);
  });
  container.appendChild(reviewList);
  area.appendChild(container);

  // confetti / ribbon animation
  launchConfetti(score);
}

function launchConfetti(score){
  // 彩帶動畫：根據分數產生彩帶數量
  const count = 18 + Math.floor((score/100)*32);
  particles = [];
  for(let i=0;i<count;i++) particles.push(new RibbonParticle(random(width), random(-120, -20)));
  confettiActive = true;
}
// Ribbon particle (彩帶)
class RibbonParticle{
  constructor(x,y){
    this.x = x;
    this.y = y;
    this.vy = random(1.2,3.2);
    this.w = random(12,22);
    this.h = random(80,160);
    this.phase = random(TWO_PI);
    this.amp = random(20,60);
    this.freq = random(0.01,0.04);
    this.col = color(random(30,255), random(120,255), random(80,255), 220);
    this.life = 500 + Math.floor(random(-120,120));
    this.rotate = random(-0.6,0.6);
  }
  update(){
    this.y += this.vy;
    this.phase += this.freq;
    this.life--;
  }
  draw(){
    push();
    // compute wave offset based on progress along ribbon
    translate(this.x + sin(this.phase)*this.amp, this.y);
    rotate(sin(this.phase*1.5)*0.4 + this.rotate);
    noStroke();
    // draw ribbon as series of quads to emulate a flowing ribbon
    const segments = 6;
    for(let i=0;i<segments;i++){
      const t = i/(segments-1);
      const segY = t*this.h - this.h/2;
      const wobble = sin(this.phase + t*PI*2)*6;
      const alpha = map(i,0,segments-1,1,0.6);
      fill(red(this.col), green(this.col), blue(this.col), alpha*200);
      rectMode(CENTER);
      push();
      translate(wobble, segY);
      rotate(sin(this.phase + t*2.0)*0.3);
      rect(0,0,this.w, this.h/segments*1.4, 6);
      pop();
    }
    pop();
  }
  isDead(){
    return this.life<=0 || this.y - this.h/2 > height + 80;
  }
}

function downloadCSV(text){
  // fallback programmatic download (used if persistent link not available)
  const blob = new Blob([text], {type: 'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'question_bank.csv';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(()=>{ URL.revokeObjectURL(url); }, 1200);
}


function flashMessage(msg){
  const area = document.getElementById('resultArea');
  area.innerHTML = `<div class="qcard">${msg}</div>`;
  setTimeout(()=>{ area.innerHTML = '' }, 2500);
}

// Helpers: build sample question bank and CSV
function buildQuestionBank(){
  // 10 sample questions (中文)
  return [
    {question:'下列哪一個是 HTML 的標記用來建立連結？', choices:['<div>','<a>','<link>','<span>'], answer:1},
    {question:'CSS 中用來設定字體大小的屬性為何？', choices:['font-size','text-size','font-weight','letter-spacing'], answer:0},
    {question:'JavaScript 的哪個關鍵字可以宣告一個不可重新指派的變數？', choices:['let','var','const','static'], answer:2},
    {question:'HTTP 200 狀態碼代表什麼？', choices:['找不到頁面','伺服器錯誤','成功','未授權'], answer:2},
    {question:'在 p5.js 中，哪個函式會在每一個影格被呼叫？', choices:['setup()','draw()','init()','loop()'], answer:1},
    {question:'下列哪個選項是資料庫中的關聯式資料模型？', choices:['NoSQL','GraphQL','關聯式','REST'], answer:2},
    {question:'CSS 選擇器 .myClass 代表什麼？', choices:['id 選擇器','標籤選擇器','類別選擇器','屬性選擇器'], answer:2},
    {question:'哪一個協定常用於加密的安全網頁（有鎖頭）？', choices:['FTP','HTTP','HTTPS','SMTP'], answer:2},
    {question:'在程式設計中，迴圈用來做什麼？', choices:['重複執行','條件判斷','資料儲存','函式宣告'], answer:0},
    {question:'在版本控制系統中，commmit 的主要用途為何？', choices:['建立分支','暫存變更','儲存變更的快照','回復舊版'], answer:2},
    {question:'1+1=？', choices:['5','3','1','2'], answer:3}
  ];
}

function buildCSV(bank){
  const header = ['id','question','choice1','choice2','choice3','choice4','answer'];
  const rows = [header.join(',')];
  bank.forEach((q,i)=>{
    // escape quotes
    const esc = s => '"'+String(s).replace(/"/g,'""')+'"';
    const r = [i+1, q.question, q.choices[0]||'', q.choices[1]||'', q.choices[2]||'', q.choices[3]||'', String(q.answer)];
    rows.push(r.map(esc).join(','));
  });
  return rows.join('\n');
}

// small util: shuffle array
function shuffle(arr){
  // Fisher-Yates
  const a = arr.slice();
  for(let i=a.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [a[i],a[j]]=[a[j],a[i]];
  }
  return a;
}
