"use strict";

function sign_out() {
  const sign_out_btn = document.getElementById("sign_out_btn");
  sign_out_btn.style.display = "flex";
}

function sign_out_move() {
  const sign_out_btn = document.getElementById("sign_out_btn");
  sign_out_btn.style.display = "none";
}

// go back page
function goBack() {
  history.go(-1);
}

// Show Image
function handleImageSelect(event, showImage, imageCustom) {
  const file = event.target.files[0];
  const reader = new FileReader();

  reader.onload = function (event) {
    const img = document.getElementById(showImage)
    const img_lab = document.getElementById(imageCustom)
    img_lab.style.display = "none"
    img.style.display = "block"
    img.style.height = img.offsetHeight
    img.style.width = img.offsetWidth
    img.src = event.target.result;
  };
  reader.readAsDataURL(file);
}

function menu(icon) {
  if (icon.textContent == "menu") {
    icon.textContent = "close";
    document.getElementById("menu").style.display = "block";
  } else {
    icon.textContent = "menu";
    document.getElementById("menu").style.display = "none";
  }
}

// function noticeWindow() {
//   document.getElementById("notice_window").style.display = "none";
// }