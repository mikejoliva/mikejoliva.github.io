$(document).ready(() => {
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
  const myDiv = $('#cool-div');
  while (true) {
    // For all the cool kids: https://github.com/Zikael <*((><
    myDiv.append(`<a style="text-decoration:none" href="https://uk.linkedin.com/in/michael-oliva-9bb11b117"><span style="color: ${getRandomColour()}; font-family: ${getRandomFont()}">PLEASE HIRE ME </span></a>`);
    await sleep(200);
  }
}

async function moveBackground() {
  const myBody = $('#body');
  let counter = 0;
  while (true) {
    if (counter >= 360) counter = 0;
    $(myBody).css('background-color', getColour(counter++));
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

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
