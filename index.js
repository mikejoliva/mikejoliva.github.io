// <*((>< 
//  Welcome to my super cool website!
//  I'm sorry
// ><))*>

window.addEventListener('DOMContentLoaded', () => {
  generateText();
  moveBackground();
});

const fontList = [
  'Georgia, serif',
  'Palatino Linotype\', \'Book Antiqua\', Palatino, serif',
  '\'Times New Roman\', Times, serif',
  'Arial, Helvetica, sans-serif',
  '\'Arial Black\', Gadget, sans-serif',
  '\'Comic Sans MS\', cursive, sans-serif',
  'Impact, Charcoal, sans-serif',
  '\'Lucida Sans Unicode\', \'Lucida Grande\', sans-serif',
  'Tahoma, Geneva, sans-serif',
  '\'Trebuchet MS\', Helvetica, sans-serif',
  'Verdana, Geneva, sans-serif',
  '\'Courier New\', Courier, monospace',
  '\'Lucida Console\', Monaco, monospace'
]

async function generateText() {
  const myDiv = document.getElementById('cool-div');
  while (true) {
    let wrapper = document.createElement('a');
    wrapper.style.textDecoration = 'none';
    wrapper.href = getRandomLink();

    let span = document.createElement('SPAN');
    span.style.color = getRandomColour(); 
    span.style.fontFamily = getRandomFont();
    span.innerText = 'PLEASE HIRE ME ';

    wrapper.appendChild(span);
    myDiv.appendChild(wrapper);

    await sleep(200);
  }
}

async function moveBackground() {
  const myBody =  document.getElementById('body');
  let counter = 0;
  while (true) {
    if (counter >= 360) counter = 0;
    myBody.style.backgroundColor= getColour(counter++);
    await sleep(20);
  }
}

function getColour(num) {
  return `hsl(${num}, 80%, 50%)`;
}

function getRandomColour() {
  return `hsl(${Math.floor(Math.random() * 360)}, 100%, 50%)`;
}

function getRandomFont() {
  return fontList[Math.floor(Math.random() * fontList.length)];
}

function getRandomLink() {
  if (Math.floor(Math.random() * 2))
    return 'https://uk.linkedin.com/in/michael-oliva-9bb11b117';
  return 'https://github.com/Zikael';
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
