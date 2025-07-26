const axios = require("axios");
const fs = require("fs");

module.exports.config = {
  name: "caution",
  version: "1.0",
  role: 0,
  credits: "Vern",
  description: "Generate a caution image using text.",
  cooldown: 5,
  hasPrefix: false,
  usage: "caution <text>",
};

function applyFontMapping(text) {
  const fontMapping = {
    a: "𝖺", b: "𝖻", c: "𝖼", d: "𝖽", e: "𝖾", f: "𝖿", g: "𝗀", h: "𝗁", i: "𝗂", j: "𝗃", k: "𝗄", l: "𝗅", m: "𝗆",
    n: "𝗇", o: "𝗈", p: "𝗉", q: "𝗊", r: "𝗋", s: "𝗌", t: "𝗍", u: "𝗎", v: "𝗏", w: "𝗐", x: "𝗑", y: "𝗒", z: "𝗓",
    A: "𝖠", B: "𝖡", C: "𝖢", D: "𝖣", E: "𝖤", F: "𝖥", G: "𝖦", H: "𝖧", I: "𝖨", J: "𝖩", K: "𝖪", L: "𝖫", M: "𝖬",
    N: "𝖭", O: "𝖮", P: "𝖯", Q: "𝖰", R: "𝖱", S: "𝖲", T: "𝖳", U: "𝖴", V: "𝖵", W: "𝖶", X: "𝖷", Y: "𝖸", Z: "𝖹"
  };
  
  let formattedText = "";
  for (const char of text) {
    formattedText += fontMapping[char] || char;
  }
  return formattedText;
}

module.exports.run = async function ({ api, event, args }) {
  const tid = event.threadID;
  const mid = event.messageID;

  if (args.length === 0) {
    return api.sendMessage(applyFontMapping("❌ | Please provide text to generate the caution image!"), tid, (err, info) => {
    setTimeout(() => api.unsendMessage(info.messageID), 3000);
    }, mid);
  }

  const text = args.join(" ").trim();
  const outputPath = __dirname + `/cache/caution_${tid}_${mid}.png`;

  try {
    const apiUrl = `https://api.popcat.xyz/caution?text=${encodeURIComponent(text)}`;
    const response = await axios({
      method: 'get',
      url: apiUrl,
      responseType: 'stream',
    });

    const writer = fs.createWriteStream(outputPath);
    response.data.pipe(writer);

    writer.on("finish", () => {
      api.sendMessage({
        attachment: fs.createReadStream(outputPath),
      }, tid, () => {
        fs.unlinkSync(outputPath);
      }, mid);
    });

    writer.on("error", err => {
      api.sendMessage(applyFontMapping(`Error while saving image: ${err.message}`), tid, mid);
    });
  } catch (error) {
    api.sendMessage(applyFontMapping(`Failed to generate image: ${error.message}`), tid, mid);
  }
};