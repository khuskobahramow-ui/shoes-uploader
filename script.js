// ==========================================
// CLOUDINARY SOZLAMALARI
// ==========================================
const CLOUDINARY_CLOUD_NAME = "rrgqyrfw";
const CLOUDINARY_UPLOAD_PRESET = "the_watch";

let uploadedImageUrls = [];
let currentTab = "watch";

const imageInput = document.getElementById("imageInput");
const statusDiv = document.getElementById("status");
const previewContainer = document.getElementById("previewContainer");
const resultText = document.getElementById("resultText");
const watchIdInput = document.getElementById("watchId");

// REJIMLARNI ALMASHTIRISH
function switchTab(tab) {
  currentTab = tab;

  const tabs = {
    watch: document.getElementById("tabWatch"),
    auction: document.getElementById("tabAuction"),
  };

  const fields = {
    priceRow: document.getElementById("priceRow"),
    saleRow: document.getElementById("saleSelectRow"),
    auction: document.getElementById("auctionFields"),
  };

  Object.values(tabs).forEach((t) => {
    if (t) t.classList.remove("active");
  });

  if (fields.priceRow) fields.priceRow.classList.add("hidden");
  if (fields.saleRow) fields.saleRow.classList.add("hidden");
  if (fields.auction) fields.auction.classList.add("hidden");

  if (tabs[tab]) tabs[tab].classList.add("active");

  if (tab === "watch") {
    if (fields.priceRow) fields.priceRow.classList.remove("hidden");
    if (fields.saleRow) fields.saleRow.classList.remove("hidden");
  } else if (tab === "auction") {
    if (fields.auction) fields.auction.classList.remove("hidden");
  }

  updatePostText();
}

// ID GENERATOR
function generateNextId() {
  const STORAGE_KEY = "shoeshub_last_id";
  let lastNumber = parseInt(localStorage.getItem(STORAGE_KEY) || "0", 10);
  lastNumber += 1;
  localStorage.setItem(STORAGE_KEY, String(lastNumber));
  return "S-" + String(lastNumber).padStart(4, "0");
}

if (watchIdInput) {
  watchIdInput.value = generateNextId();
}

// INPUTLAR O'ZGARISHINI KUZATISH
document.querySelectorAll("input, select, textarea").forEach((el) => {
  if (el.id === "resultText" || el.id === "imageInput") return;
  el.addEventListener("input", updatePostText);
  el.addEventListener("change", updatePostText);
});

// CHECKBOX (RAZMERLAR) O'ZGARISHINI KUZATISH
document.querySelectorAll(".size-checkbox").forEach((cb) => {
  cb.addEventListener("change", updatePostText);
});

// RASMLARNI CLOUDINARY'GA YUKLASH
if (imageInput) {
  imageInput.addEventListener("change", async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (statusDiv) {
        statusDiv.innerText = `⏳ (${i + 1}/${files.length}) "${
          file.name
        }" yuklanmoqda...`;
        statusDiv.style.color = "#fbbf24";
      }

      try {
        const preparedFile = await convertImage(file, i);
        const formData = new FormData();

        formData.append("file", preparedFile);
        formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

        const res = await fetch(
          `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
          {
            method: "POST",
            body: formData,
          }
        );

        const data = await res.json();

        if (res.ok && data && data.secure_url) {
          const url = data.secure_url;
          uploadedImageUrls.push(url);
          addPreview(url, uploadedImageUrls.length);
          successCount++;
        } else {
          console.error("Cloudinary xatosi:", data);
          failCount++;
        }
      } catch (err) {
        console.error("Yuklashda xatolik:", err);
        failCount++;
      }
    }

    if (statusDiv) {
      if (failCount === 0) {
        statusDiv.innerText = "✅ Barcha rasmlar muvaffaqiyatli yuklandi!";
        statusDiv.style.color = "#4ade80";
      } else {
        statusDiv.innerText = `⚠️ ${successCount} ta yuklandi, ${failCount} ta xatolik bo'ldi.`;
        statusDiv.style.color = "#f87171";
      }
    }

    updatePostText();
    imageInput.value = "";
  });
}

function addPreview(url, index) {
  if (!previewContainer) return;
  const wrap = document.createElement("div");
  wrap.className = "preview-item";
  const img = document.createElement("img");
  img.src = url;
  wrap.appendChild(img);
  previewContainer.appendChild(wrap);
}

async function loadImage(file) {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file);
    } catch (err) {}
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Rasm yuklanmadi"));
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

function canvasToBlob(canvas, mime, quality) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), mime, quality);
  });
}

async function convertImage(file, index) {
  const img = await loadImage(file);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  const maxWidth = 1080;
  let scale = 1;

  if (img.width > maxWidth) {
    scale = maxWidth / img.width;
  }

  canvas.width = img.width * scale;
  canvas.height = img.height * scale;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  if (typeof img.close === "function") {
    img.close();
  }

  let blob = await canvasToBlob(canvas, "image/webp", 0.82);
  if (blob && blob.type === "image/webp") {
    return new File([blob], `photo_${Date.now()}_${index}.webp`, {
      type: "image/webp",
    });
  }

  blob = await canvasToBlob(canvas, "image/jpeg", 0.85);
  return new File([blob], `photo_${Date.now()}_${index}.jpg`, {
    type: "image/jpeg",
  });
}

// TANLANGAN RAZMERLARNI YIG'ISH
function getSelectedSizes() {
  const selected = [];
  document.querySelectorAll(".size-checkbox:checked").forEach((cb) => {
    selected.push(cb.value);
  });
  return selected.join(", ");
}

// POST MATNINI YANGILASH
function updatePostText() {
  const getValue = (id) => document.getElementById(id)?.value?.trim() || "";

  const id = getValue("watchId");
  const status = document.getElementById("watchStatus")?.value || "active";
  const brand = getValue("watchBrand");
  const cardTitle = getValue("watchCardTitle");
  const refCode = getValue("watchRefCode");

  const rate = Number(getValue("usdExchangeRate")) || 12800;

  const sizes = getSelectedSizes();
  const material = getValue("watchMaterial");
  const color = getValue("watchBracelet");
  const gender = getValue("watchGender");
  const season = getValue("watchGlass");

  const instagram = getValue("watchInstagram");
  const description = getValue("watchDescription");
  const date = new Date().toLocaleDateString("ru-RU");

  const lines = [];

  if (currentTab === "watch") {
    const isSaleValue =
      document.getElementById("shoeSaleType")?.value || "no-sale";
    const priceUzsum = Number(getValue("watchPriceUzsum")) || 0;
    const priceUsd = priceUzsum > 0 ? Math.round(priceUzsum / rate) : 0;

    lines.push(`Type: market`);
    lines.push(`IsSale: ${isSaleValue}`);
    if (id) lines.push(`ID: ${id}`);
    if (status) lines.push(`Status: ${status}`);
    if (brand) lines.push(`Brand: ${brand}`);
    if (cardTitle) lines.push(`Card Title: ${cardTitle}`);
    if (refCode) lines.push(`Ref. Code / Model: ${refCode}`);
    if (priceUsd > 0) {
      lines.push(`Price: $${priceUsd}`);
      lines.push(`Price UZS: ${priceUzsum.toLocaleString()} UZS`);
    }
  } else if (currentTab === "auction") {
    const startPriceUzsum = Number(getValue("aucStartPriceUzsum")) || 0;
    const bidStepUzsum = Number(getValue("aucBidStepUzsum")) || 0;
    const endTime = getValue("aucEndTime");

    const startPriceUsd =
      startPriceUzsum > 0 ? Math.round(startPriceUzsum / rate) : 0;
    const bidStepUsd = bidStepUzsum > 0 ? Math.round(bidStepUzsum / rate) : 0;

    lines.push(`Type: auction`);
    lines.push(`🔥 AUCTION POST 🔥`);
    if (id) lines.push(`ID: ${id}`);
    if (status) lines.push(`Status: ${status}`);
    if (brand) lines.push(`Brand: ${brand}`);
    if (cardTitle) lines.push(`Card Title: ${cardTitle}`);
    if (refCode) lines.push(`Ref. Code / Model: ${refCode}`);
    if (startPriceUsd > 0) {
      lines.push(`Start Price: $${startPriceUsd}`);
      lines.push(`Start Price UZS: ${startPriceUzsum.toLocaleString()} UZS`);
    }
    if (bidStepUsd > 0) {
      lines.push(`Bid Step: +$${bidStepUsd}`);
      lines.push(`Bid Step UZS: +${bidStepUzsum.toLocaleString()} UZS`);
    }
    if (endTime) lines.push(`End Time: ${endTime.replace("T", " ")}`);
  }

  lines.push(`--------------------`);
  if (sizes) lines.push(`Sizes: ${sizes}`);
  if (color) lines.push(`Color: ${color}`);
  if (material) lines.push(`Material: ${material}`);
  if (gender) lines.push(`Gender: ${gender}`);
  if (season) lines.push(`Season: ${season}`);

  lines.push(`--------------------`);
  lines.push(`Date: ${date}`);
  if (instagram) lines.push(`Instagram: ${instagram}`);
  if (description) lines.push(`Description: ${description}`);

  uploadedImageUrls.forEach((url, i) => {
    lines.push(`Image${i + 1}: ${url}`);
  });

  if (resultText) {
    resultText.value = lines.join("\n");
  }
}

updatePostText();

// NUSXALASH VA TOZALASH
function copyPost() {
  if (!resultText) return;
  resultText.select();
  document.execCommand("copy");
  const copyBtn = document.getElementById("copyBtn");
  if (copyBtn) {
    copyBtn.innerText = "✅ Copied!";
    setTimeout(() => {
      copyBtn.innerText = "📋 Copy Post";
    }, 2000);
  }
}

function resetForm() {
  document.querySelectorAll("input, textarea").forEach((el) => {
    if (el.id === "watchId") {
      el.value = generateNextId();
    } else if (el.id === "aucBidStepUzsum") {
      el.value = "50000";
    } else if (el.id === "usdExchangeRate") {
      el.value = "12800";
    } else if (el.id !== "resultText") {
      el.value = "";
    }
  });

  document.querySelectorAll(".size-checkbox").forEach((cb) => {
    cb.checked = false;
  });

  document.querySelectorAll("select").forEach((el) => {
    if (el.id === "watchStatus") {
      el.value = "active";
    } else if (el.id === "shoeSaleType") {
      el.value = "no-sale";
    } else {
      el.selectedIndex = 0;
    }
  });

  uploadedImageUrls = [];
  if (previewContainer) previewContainer.innerHTML = "";
  if (statusDiv) statusDiv.innerText = "";
  if (imageInput) imageInput.value = "";
  updatePostText();
}

// const IMGBB_API_KEY = "525f5b21013f284ac9306b4a99c30b7e";
// let uploadedImageUrls = [];
// let currentTab = "watch"; // Shoes rejimi uchun "watch" ID-si saqlandi

// const imageInput = document.getElementById("imageInput");
// const statusDiv = document.getElementById("status");
// const previewContainer = document.getElementById("previewContainer");
// const resultText = document.getElementById("resultText");
// const watchIdInput = document.getElementById("watchId");

// // REJIMLARNI ALMASHTIRISH (Faqat Shoes va Auction)
// function switchTab(tab) {
//   currentTab = tab;

//   const tabs = {
//     watch: document.getElementById("tabWatch"),
//     auction: document.getElementById("tabAuction"),
//   };

//   const fields = {
//     priceRow: document.getElementById("priceRow"),
//     saleRow: document.getElementById("saleSelectRow"),
//     auction: document.getElementById("auctionFields"),
//   };

//   Object.values(tabs).forEach((t) => {
//     if (t) t.classList.remove("active");
//   });

//   if (fields.priceRow) fields.priceRow.classList.add("hidden");
//   if (fields.saleRow) fields.saleRow.classList.add("hidden");
//   if (fields.auction) fields.auction.classList.add("hidden");

//   if (tabs[tab]) tabs[tab].classList.add("active");

//   if (tab === "watch") {
//     if (fields.priceRow) fields.priceRow.classList.remove("hidden");
//     if (fields.saleRow) fields.saleRow.classList.remove("hidden");
//   } else if (tab === "auction") {
//     if (fields.auction) fields.auction.classList.remove("hidden");
//   }

//   updatePostText();
// }

// // ID GENERATOR (Oyoq kiyimlar uchun S-0001 formatida)
// function generateNextId() {
//   const STORAGE_KEY = "shoeshub_last_id";
//   let lastNumber = parseInt(localStorage.getItem(STORAGE_KEY) || "0", 10);
//   lastNumber += 1;
//   localStorage.setItem(STORAGE_KEY, String(lastNumber));
//   return "S-" + String(lastNumber).padStart(4, "0");
// }

// if (watchIdInput) {
//   watchIdInput.value = generateNextId();
// }

// // INPUTLAR O'ZGARISHINI KUZATISH
// document.querySelectorAll("input, select, textarea").forEach((el) => {
//   if (el.id === "resultText" || el.id === "imageInput") return;
//   el.addEventListener("input", updatePostText);
//   el.addEventListener("change", updatePostText);
// });

// // CHECKBOX (RAZMERLAR) O'ZGARISHINI KUZATISH
// document.querySelectorAll(".size-checkbox").forEach((cb) => {
//   cb.addEventListener("change", updatePostText);
// });

// // RASMLARNI IMGBB'GA YUKLASH
// if (imageInput) {
//   imageInput.addEventListener("change", async (e) => {
//     const files = Array.from(e.target.files);
//     if (!files.length) return;

//     let successCount = 0;
//     let failCount = 0;

//     for (let i = 0; i < files.length; i++) {
//       const file = files[i];
//       if (statusDiv) {
//         statusDiv.innerText = `⏳ (${i + 1}/${files.length}) "${
//           file.name
//         }" yuklanmoqda...`;
//         statusDiv.style.color = "#fbbf24";
//       }

//       try {
//         const preparedFile = await convertImage(file, i);
//         const formData = new FormData();
//         formData.append("image", preparedFile);

//         const res = await fetch(
//           `https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`,
//           {
//             method: "POST",
//             body: formData,
//           }
//         );

//         const data = await res.json();

//         if (data && data.success && data.data && data.data.url) {
//           const url = data.data.url;
//           uploadedImageUrls.push(url);
//           addPreview(url, uploadedImageUrls.length);
//           successCount++;
//         } else {
//           console.error("ImgBB xatosi:", data);
//           failCount++;
//         }
//       } catch (err) {
//         console.error("Yuklashda xatolik:", err);
//         failCount++;
//       }
//     }

//     if (statusDiv) {
//       if (failCount === 0) {
//         statusDiv.innerText =
//           "✅ Barcha rasmlar ImgBB'ga muvaffaqiyatli yuklandi!";
//         statusDiv.style.color = "#4ade80";
//       } else {
//         statusDiv.innerText = `⚠️ ${successCount} ta yuklandi, ${failCount} ta xatolik bo'ldi.`;
//         statusDiv.style.color = "#f87171";
//       }
//     }

//     updatePostText();
//     imageInput.value = "";
//   });
// }

// function addPreview(url, index) {
//   if (!previewContainer) return;
//   const wrap = document.createElement("div");
//   wrap.className = "preview-item";
//   const img = document.createElement("img");
//   img.src = url;
//   wrap.appendChild(img);
//   previewContainer.appendChild(wrap);
// }

// // RASMNI OPTIMIZATSIYA QILISH (WebP / JPEG ga o'tkazish)
// async function loadImage(file) {
//   if (typeof createImageBitmap === "function") {
//     try {
//       return await createImageBitmap(file);
//     } catch (err) {}
//   }
//   return new Promise((resolve, reject) => {
//     const reader = new FileReader();
//     reader.onload = (e) => {
//       const img = new Image();
//       img.onload = () => resolve(img);
//       img.onerror = () => reject(new Error("Rasm yuklanmadi"));
//       img.src = e.target.result;
//     };
//     reader.readAsDataURL(file);
//   });
// }

// function canvasToBlob(canvas, mime, quality) {
//   return new Promise((resolve) => {
//     canvas.toBlob((blob) => resolve(blob), mime, quality);
//   });
// }

// async function convertImage(file, index) {
//   const img = await loadImage(file);
//   const canvas = document.createElement("canvas");
//   const ctx = canvas.getContext("2d");
//   const maxWidth = 1080;
//   let scale = 1;

//   if (img.width > maxWidth) {
//     scale = maxWidth / img.width;
//   }

//   canvas.width = img.width * scale;
//   canvas.height = img.height * scale;
//   ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

//   if (typeof img.close === "function") {
//     img.close();
//   }

//   let blob = await canvasToBlob(canvas, "image/webp", 0.82);
//   if (blob && blob.type === "image/webp") {
//     return new File([blob], `photo_${Date.now()}_${index}.webp`, {
//       type: "image/webp",
//     });
//   }

//   blob = await canvasToBlob(canvas, "image/jpeg", 0.85);
//   return new File([blob], `photo_${Date.now()}_${index}.jpg`, {
//     type: "image/jpeg",
//   });
// }

// // TANLANGAN RAZMERLARNI YIG'ISH
// function getSelectedSizes() {
//   const selected = [];
//   document.querySelectorAll(".size-checkbox:checked").forEach((cb) => {
//     selected.push(cb.value);
//   });
//   return selected.join(", ");
// }

// // POST MATNINI YANGILASH
// function updatePostText() {
//   const getValue = (id) => document.getElementById(id)?.value?.trim() || "";

//   const id = getValue("watchId");
//   const status = document.getElementById("watchStatus")?.value || "active";
//   const brand = getValue("watchBrand");
//   const cardTitle = getValue("watchCardTitle");
//   const refCode = getValue("watchRefCode");

//   const rate = Number(getValue("usdExchangeRate")) || 12800;

//   const sizes = getSelectedSizes();
//   const material = getValue("watchMaterial");
//   const color = getValue("watchBracelet");
//   const gender = getValue("watchGender");
//   const season = getValue("watchGlass");

//   const instagram = getValue("watchInstagram");
//   const description = getValue("watchDescription");
//   const date = new Date().toLocaleDateString("ru-RU");

//   const lines = [];

//   if (currentTab === "watch") {
//     const isSaleValue =
//       document.getElementById("shoeSaleType")?.value || "no-sale";
//     const priceUzsum = Number(getValue("watchPriceUzsum")) || 0;
//     const priceUsd = priceUzsum > 0 ? Math.round(priceUzsum / rate) : 0;

//     lines.push(`Type: market`);
//     lines.push(`IsSale: ${isSaleValue}`);
//     if (id) lines.push(`ID: ${id}`);
//     if (status) lines.push(`Status: ${status}`);
//     if (brand) lines.push(`Brand: ${brand}`);
//     if (cardTitle) lines.push(`Card Title: ${cardTitle}`);
//     if (refCode) lines.push(`Ref. Code / Model: ${refCode}`);
//     if (priceUsd > 0) {
//       lines.push(`Price: $${priceUsd}`);
//       lines.push(`Price UZS: ${priceUzsum.toLocaleString()} UZS`);
//     }
//   } else if (currentTab === "auction") {
//     const startPriceUzsum = Number(getValue("aucStartPriceUzsum")) || 0;
//     const bidStepUzsum = Number(getValue("aucBidStepUzsum")) || 0;
//     const endTime = getValue("aucEndTime");

//     const startPriceUsd =
//       startPriceUzsum > 0 ? Math.round(startPriceUzsum / rate) : 0;
//     const bidStepUsd = bidStepUzsum > 0 ? Math.round(bidStepUzsum / rate) : 0;

//     lines.push(`Type: auction`);
//     lines.push(`🔥 AUCTION POST 🔥`);
//     if (id) lines.push(`ID: ${id}`);
//     if (status) lines.push(`Status: ${status}`);
//     if (brand) lines.push(`Brand: ${brand}`);
//     if (cardTitle) lines.push(`Card Title: ${cardTitle}`);
//     if (refCode) lines.push(`Ref. Code / Model: ${refCode}`);
//     if (startPriceUsd > 0) {
//       lines.push(`Start Price: $${startPriceUsd}`);
//       lines.push(`Start Price UZS: ${startPriceUzsum.toLocaleString()} UZS`);
//     }
//     if (bidStepUsd > 0) {
//       lines.push(`Bid Step: +$${bidStepUsd}`);
//       lines.push(`Bid Step UZS: +${bidStepUzsum.toLocaleString()} UZS`);
//     }
//     if (endTime) lines.push(`End Time: ${endTime.replace("T", " ")}`);
//   }

//   lines.push(`--------------------`);
//   if (sizes) lines.push(`Sizes: ${sizes}`);
//   if (color) lines.push(`Color: ${color}`);
//   if (material) lines.push(`Material: ${material}`);
//   if (gender) lines.push(`Gender: ${gender}`);
//   if (season) lines.push(`Season: ${season}`);

//   lines.push(`--------------------`);
//   lines.push(`Date: ${date}`);
//   if (instagram) lines.push(`Instagram: ${instagram}`);
//   if (description) lines.push(`Description: ${description}`);

//   uploadedImageUrls.forEach((url, i) => {
//     lines.push(`Image${i + 1}: ${url}`);
//   });

//   if (resultText) {
//     resultText.value = lines.join("\n");
//   }
// }

// updatePostText();

// // NUSXALASH VA TOZALASH
// function copyPost() {
//   if (!resultText) return;
//   resultText.select();
//   document.execCommand("copy");
//   const copyBtn = document.getElementById("copyBtn");
//   if (copyBtn) {
//     copyBtn.innerText = "✅ Copied!";
//     setTimeout(() => {
//       copyBtn.innerText = "📋 Copy Post";
//     }, 2000);
//   }
// }

// function resetForm() {
//   document.querySelectorAll("input, textarea").forEach((el) => {
//     if (el.id === "watchId") {
//       el.value = generateNextId();
//     } else if (el.id === "aucBidStepUzsum") {
//       el.value = "50000";
//     } else if (el.id === "usdExchangeRate") {
//       el.value = "12800";
//     } else if (el.id !== "resultText") {
//       el.value = "";
//     }
//   });

//   document.querySelectorAll(".size-checkbox").forEach((cb) => {
//     cb.checked = false;
//   });

//   document.querySelectorAll("select").forEach((el) => {
//     if (el.id === "watchStatus") {
//       el.value = "active";
//     } else if (el.id === "shoeSaleType") {
//       el.value = "no-sale";
//     } else {
//       el.selectedIndex = 0;
//     }
//   });

//   uploadedImageUrls = [];
//   if (previewContainer) previewContainer.innerHTML = "";
//   if (statusDiv) statusDiv.innerText = "";
//   if (imageInput) imageInput.value = "";
//   updatePostText();
// }
