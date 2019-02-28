$(document).ready(() => {
  doThing();
});

async function doThing() {
  const myDiv = $('#cool-div');
  const myBody = $('#body');
  while (true) {
    myDiv.append(`<span style="color: ${getRandomColor()}">Please hire me <span>`);
    $(myBody).css('background-color', getRandomColor());
    await sleep(200);
  }
}

function getRandomColor() {
  var letters = '0123456789ABCDEF';
  var color = '#';
  for (var i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
