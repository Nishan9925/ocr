// the add to cart works fine also
// import puppeteer from 'puppeteer-extra';
// import StealthPlugin from 'puppeteer-extra-plugin-stealth';
// import axios from 'axios';
// import FormData from 'form-data';
// import * as dotenv from 'dotenv';
// import fs from 'fs';
// import path from 'path';
// import Tesseract from 'tesseract.js';

// dotenv.config();
// puppeteer.use(StealthPlugin());

// const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// const getRandomUserAgent = () => {
//   const userAgents = [
//     'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
//     'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.114 Safari/537.36'
//   ];
//   return userAgents[Math.floor(Math.random() * userAgents.length)];
// };

// const parseUserInput = async (userInput) => {
//   const response = await axios.post('https://api.openai.com/v1/chat/completions', {
//     model: 'gpt-3.5-turbo',
//     messages: [
//       {
//         role: 'system',
//         content: `You extract structured actions from natural language. Given a command like "Search headphones on Amazon", return:\n{\n  "website": "https://www.amazon.com",\n  "search": "headphones"\n}`
//       },
//       { role: 'user', content: userInput }
//     ],
//     temperature: 0.2
//   }, {
//     headers: {
//       'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
//       'Content-Type': 'application/json'
//     }
//   });
//   return JSON.parse(response.data.choices[0].message.content.trim());
// };

// const extractOCRText = async (imagePath) => {
//   const formData = new FormData();
//   formData.append('apikey', process.env.OCR_SPACE_API_KEY);
//   formData.append('language', 'eng');
//   formData.append('isOverlayRequired', 'false');
//   formData.append('file', fs.createReadStream(imagePath));

//   const response = await axios.post('https://api.ocr.space/parse/image', formData, {
//     headers: formData.getHeaders()
//   });

//   const parsed = response.data;
//   if (parsed && parsed.ParsedResults && parsed.ParsedResults[0]) {
//     return parsed.ParsedResults[0].ParsedText.trim();
//   }
//   return '';
// };

// // Use Tesseract.js for button OCR
// const extractWithTesseract = async (imagePath) => {
//   try {
//     const { data: { text } } = await Tesseract.recognize(imagePath, 'eng');
//     return text.trim();
//   } catch (err) {
//     console.error('Tesseract OCR error:', err);
//     return '';
//   }
// };

// const findSearchBoxWithOpenAI = async (page) => {
//   const inputs = await page.$$('input');
//   for (let i = 0; i < inputs.length; i++) {
//     const el = inputs[i];
//     const box = await el.boundingBox();
//     if (!box || box.width < 50 || box.height < 20) continue;

//     const margin = 40;
//     const clip = { x: box.x - margin, y: box.y - margin, width: box.width + margin * 2, height: box.height + margin * 2 };
//     const snapshot = `./input-${i}.png`;
//     try {
//       await page.screenshot({ path: snapshot, clip });
//       const text = await extractOCRText(snapshot);
//       if (text.length < 3) continue;

//       const prompt = `Text near input: "${text}"\nIs this a search bar on a shopping site? Reply yes or no.`;
//       const resp = await axios.post('https://api.openai.com/v1/chat/completions', {
//         model: 'gpt-3.5-turbo',
//         messages: [{ role: 'user', content: prompt }],
//         temperature: 0
//       }, {
//         headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' }
//       });
//       if (resp.data.choices[0].message.content.trim().toLowerCase().startsWith('yes')) return el;
//     } catch {}  
//   }
//   return null;
// };

// const showRedDot = async (page, x, y) => {
//   await page.evaluate(({ x, y }) => {
//     const dot = document.createElement('div');
//     Object.assign(dot.style, {
//       position: 'absolute', left: `${x}px`, top: `${y}px`, width: '20px', height: '20px',
//       backgroundColor: 'red', borderRadius: '50%', zIndex: '99999', pointerEvents: 'none',
//       transition: 'opacity 1s ease-in-out', opacity: '1'
//     });
//     document.body.appendChild(dot);
//     setTimeout(() => dot.style.opacity = '0', 1000);
//   }, { x, y });
// };

// const findAndClickAddToCart = async (page) => {
//   const candidates = await page.$$('button, a, div, span');
//   for (let el of candidates) {
//     const box = await el.boundingBox();
//     if (!box || box.width < 50 || box.height < 20) continue;

//     const shot = `./btn.png`;
//     await el.screenshot({ path: shot });
//     const text = await extractWithTesseract(shot);
//     if (!text) continue;

//     if (/add to cart/i.test(text)) {
//       const x = box.x + box.width / 2;
//       const y = box.y + box.height / 2;
//       await page.mouse.move(x, y);
//       await delay(200);
//       await showRedDot(page, x, y);
//       console.log(`🛒 Clicking 'Add to Cart' at ${x},${y}`);
//       await page.mouse.click(x, y);
//       return true;
//     }
//   }
//   console.log('❌ "Add to Cart" button not found');
//   return false;
// };

// const detectProductFromOCR = async (page, productElements) => {
//   for (let el of productElements) {
//     const box = await el.boundingBox();
//     if (!box || box.width < 100 || box.height < 100) continue;

//     const shot = `./product.png`;
//     await el.screenshot({ path: shot });

//     const text = await extractOCRText(shot);
//     if (!text || text.length < 20) continue;
//     if (!/\$|€|£|¥/.test(text)) continue;

//     console.log(`🛍️ Detected product: ${text.split('\n')[0]}`);
//     const x = box.x + box.width / 2, y = box.y + box.height / 2;
//     await page.mouse.move(x, y);
//     await delay(200);
//     await showRedDot(page, x, y);
//     console.log(`🖱️ Double-clicking product at ${x},${y}`);
//     await page.mouse.click(x, y, { clickCount: 2 });
//     // Wait for product page to load before Add to Cart
//     await delay(5000);

//     // Now OCR-detect Add to Cart and click
//     await findAndClickAddToCart(page);
//     return;
//   }
//   console.log('❌ No product found');
// };

// const handleSearchAndAction = async ({ website, search }) => {
//   const browser = await puppeteer.launch({ headless: false, defaultViewport: null });
//   const page = await browser.newPage();
//   await page.setUserAgent(getRandomUserAgent());

//   await page.goto(website, { waitUntil: 'domcontentloaded' });
//   console.log('🌐 Website loaded, waiting UI');
//   await delay(5000);

//   const searchBox = await findSearchBoxWithOpenAI(page);
//   if (!searchBox) return console.log('❌ Search box not found');

//   await searchBox.click({ clickCount: 3 });
//   await searchBox.type(search);
//   await page.keyboard.press('Enter');
//   await page.waitForNavigation({ waitUntil: 'domcontentloaded' });
//   await delay(3000);

//   const candidates = await page.$$('div, li, article, section');
//   await detectProductFromOCR(page, candidates);
// };

// (async () => {
//   const cmd = process.argv[2] || '';
//   const parsed = await parseUserInput(cmd);
//   console.log('Parsed:', parsed);
//   await handleSearchAndAction(parsed);
// })();



// imporved search box

// import puppeteer from 'puppeteer-extra';
// import StealthPlugin from 'puppeteer-extra-plugin-stealth';
// import axios from 'axios';
// import FormData from 'form-data';
// import * as dotenv from 'dotenv';
// import fs from 'fs';
// import Tesseract from 'tesseract.js';

// dotenv.config();
// puppeteer.use(StealthPlugin());

// const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// const getRandomUserAgent = () => {
//   const userAgents = [
//     'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
//     'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.114 Safari/537.36'
//   ];
//   return userAgents[Math.floor(Math.random() * userAgents.length)];
// };

// const parseUserInput = async (userInput) => {
//   const response = await axios.post('https://api.openai.com/v1/chat/completions', {
//     model: 'gpt-3.5-turbo',
//     messages: [
//       {
//         role: 'system',
//         content: `You extract structured actions from natural language. Given a command like "Search headphones on Amazon", return:\n{\n  "website": "https://www.amazon.com",\n  "search": "headphones"\n}`
//       },
//       { role: 'user', content: userInput }
//     ],
//     temperature: 0.2
//   }, {
//     headers: {
//       'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
//       'Content-Type': 'application/json'
//     }
//   });
//   return JSON.parse(response.data.choices[0].message.content.trim());
// };

// const extractOCRText = async (imagePath) => {
//   const formData = new FormData();
//   formData.append('apikey', process.env.OCR_SPACE_API_KEY);
//   formData.append('language', 'eng');
//   formData.append('isOverlayRequired', 'false');
//   formData.append('file', fs.createReadStream(imagePath));

//   const response = await axios.post('https://api.ocr.space/parse/image', formData, {
//     headers: formData.getHeaders()
//   });

//   const parsed = response.data;
//   if (parsed && parsed.ParsedResults && parsed.ParsedResults[0]) {
//     return parsed.ParsedResults[0].ParsedText.trim();
//   }
//   return '';
// };

// const extractWithTesseract = async (imagePath) => {
//   try {
//     const { data: { text } } = await Tesseract.recognize(imagePath, 'eng');
//     return text.trim();
//   } catch (err) {
//     console.error('Tesseract OCR error:', err);
//     return '';
//   }
// };

// const findSearchBoxWithOpenAI = async (page) => {
//   const selectors = [
//     'input[type="search"]',
//     'input[name*=search i]',
//     'input[id*=search i]',
//     'input[placeholder*=search i]',
//     'input[aria-label*=search i]'
//   ];
//   for (const sel of selectors) {
//     try {
//       const el = await page.$(sel);
//       if (el) return el;
//     } catch {}
//   }

//   const inputs = await page.$$('input');
//   for (let i = 0; i < inputs.length; i++) {
//     const el = inputs[i];
//     const box = await el.boundingBox();
//     if (!box || box.width < 50 || box.height < 20) continue;

//     const margin = 40;
//     const clip = {
//       x: Math.max(0, box.x - margin),
//       y: Math.max(0, box.y - margin),
//       width: box.width + margin * 2,
//       height: box.height + margin * 2
//     };
//     const snapshot = `./input-${Date.now()}.png`;
//     try {
//       await page.screenshot({ path: snapshot, clip });
//       const text = await extractOCRText(snapshot);
//       fs.unlinkSync(snapshot);
//       if (text.length < 3) continue;

//       const prompt = `Text near input: "${text}"\nIs this a search bar on a shopping site? Reply yes or no.`;
//       const resp = await axios.post('https://api.openai.com/v1/chat/completions', {
//         model: 'gpt-3.5-turbo',
//         messages: [{ role: 'user', content: prompt }],
//         temperature: 0
//       }, {
//         headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' }
//       });

//       if (resp.data.choices[0].message.content.trim().toLowerCase().startsWith('yes')) {
//         return el;
//       }
//     } catch {
//       if (fs.existsSync(snapshot)) fs.unlinkSync(snapshot);
//     }
//   }
//   return null;
// };

// const showRedDot = async (page, x, y) => {
//   await page.evaluate(({ x, y }) => {
//     const dot = document.createElement('div');
//     Object.assign(dot.style, {
//       position: 'absolute', left: `${x}px`, top: `${y}px`, width: '20px', height: '20px',
//       backgroundColor: 'red', borderRadius: '50%', zIndex: '99999', pointerEvents: 'none',
//       transition: 'opacity 1s ease-in-out', opacity: '1'
//     });
//     document.body.appendChild(dot);
//     setTimeout(() => dot.style.opacity = '0', 1000);
//   }, { x, y });
// };

// const findAndClickAddToCart = async (page) => {
//   const candidates = await page.$$('button, a, div, span');
//   for (let el of candidates) {
//     const box = await el.boundingBox();
//     if (!box || box.width < 50 || box.height < 20) continue;

//     const shot = `./btn.png`;
//     await el.screenshot({ path: shot });
//     const text = await extractWithTesseract(shot);
//     if (!text) continue;

//     if (/add to cart/i.test(text)) {
//       const x = box.x + box.width / 2;
//       const y = box.y + box.height / 2;
//       await page.mouse.move(x, y);
//       await delay(200);
//       await showRedDot(page, x, y);
//       console.log(`🛒 Clicking 'Add to Cart' at ${x},${y}`);
//       await page.mouse.click(x, y);
//       return true;
//     }
//   }
//   console.log('❌ "Add to Cart" button not found');
//   return false;
// };

// const detectProductFromOCR = async (page, productElements) => {
//   for (let el of productElements) {
//     const box = await el.boundingBox();
//     if (!box || box.width < 100 || box.height < 100) continue;

//     const shot = `./product.png`;
//     await el.screenshot({ path: shot });

//     const text = await extractOCRText(shot);
//     if (!text || text.length < 20) continue;
//     if (!/\$|€|£|¥/.test(text)) continue;

//     console.log(`🛍️ Detected product: ${text.split('\n')[0]}`);
//     const x = box.x + box.width / 2, y = box.y + box.height / 2;
//     await page.mouse.move(x, y);
//     await delay(200);
//     await showRedDot(page, x, y);
//     console.log(`🖱️ Double-clicking product at ${x},${y}`);
//     await page.mouse.click(x, y, { clickCount: 2 });
//     await delay(5000);

//     await findAndClickAddToCart(page);
//     return;
//   }
//   console.log('❌ No product found');
// };

// const handleSearchAndAction = async ({ website, search }) => {
//   const browser = await puppeteer.launch({ headless: false, defaultViewport: null });
//   const page = await browser.newPage();
//   await page.setUserAgent(getRandomUserAgent());

//   await page.goto(website, { waitUntil: 'domcontentloaded' });
//   console.log('🌐 Website loaded, waiting UI');
//   await delay(5000);

//   const searchBox = await findSearchBoxWithOpenAI(page);
//   if (!searchBox) return console.log('❌ Search box not found');

//   await searchBox.click({ clickCount: 10 });
//   await searchBox.type(search);
//   await page.keyboard.press('Enter');
//   await page.waitForNavigation({ waitUntil: 'domcontentloaded' });
//   await delay(3000);

//   const candidates = await page.$$('div, li, article, section');
//   await detectProductFromOCR(page, candidates);
// };

// (async () => {
//   const cmd = process.argv[2] || '';
//   const parsed = await parseUserInput(cmd);
//   console.log('Parsed:', parsed);
//   await handleSearchAndAction(parsed);
// })();








// the clicking part works fine on amazon, alibaba and wildberries, the add to cart is done by teseeract, spaceocr failed to detect the add to cart button

// import puppeteer from 'puppeteer-extra';
// import StealthPlugin from 'puppeteer-extra-plugin-stealth';
// import axios from 'axios';
// import FormData from 'form-data';
// import * as dotenv from 'dotenv';
// import fs from 'fs';
// import Tesseract from 'tesseract.js';

// dotenv.config();
// puppeteer.use(StealthPlugin());

// const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// const getRandomUserAgent = () => {
//   const userAgents = [
//     'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
//     'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.114 Safari/537.36'
//   ];
//   return userAgents[Math.floor(Math.random() * userAgents.length)];
// };

// const parseUserInput = async (userInput) => {
//   const response = await axios.post('https://api.openai.com/v1/chat/completions', {
//     model: 'gpt-3.5-turbo',
//     messages: [
//       {
//         role: 'system',
//         content: `You extract structured actions from natural language. Given a command like "Search headphones on Amazon", return:\n{\n  "website": "https://www.amazon.com",\n  "search": "headphones"\n}`
//       },
//       { role: 'user', content: userInput }
//     ],
//     temperature: 0.2
//   }, {
//     headers: {
//       'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
//       'Content-Type': 'application/json'
//     }
//   });
//   return JSON.parse(response.data.choices[0].message.content.trim());
// };

// const extractOCRText = async (imagePath) => {
//   const formData = new FormData();
//   formData.append('apikey', process.env.OCR_SPACE_API_KEY);
//   formData.append('language', 'eng');
//   formData.append('isOverlayRequired', 'false');
//   formData.append('file', fs.createReadStream(imagePath));

//   const response = await axios.post('https://api.ocr.space/parse/image', formData, {
//     headers: formData.getHeaders()
//   });

//   const parsed = response.data;
//   if (parsed && parsed.ParsedResults && parsed.ParsedResults[0]) {
//     return parsed.ParsedResults[0].ParsedText.trim();
//   }
//   return '';
// };

// const extractWithTesseract = async (imagePath) => {
//   try {
//     const { data: { text } } = await Tesseract.recognize(imagePath, 'eng');
//     return text.trim();
//   } catch (err) {
//     console.error('Tesseract OCR error:', err);
//     return '';
//   }
// };

// const findSearchBoxWithOpenAI = async (page) => {
//   const selectors = [
//     'input[type="search"]',
//     'input[name*=search i]',
//     'input[id*=search i]',
//     'input[placeholder*=search i]',
//     'input[aria-label*=search i]'
//   ];
//   for (const sel of selectors) {
//     try {
//       const el = await page.$(sel);
//       if (el) return el;
//     } catch {}
//   }

//   const inputs = await page.$$('input');
//   for (let i = 0; i < inputs.length; i++) {
//     const el = inputs[i];
//     const box = await el.boundingBox();
//     if (!box || box.width < 50 || box.height < 20) continue;

//     const margin = 40;
//     const clip = {
//       x: Math.max(0, box.x - margin),
//       y: Math.max(0, box.y - margin),
//       width: box.width + margin * 2,
//       height: box.height + margin * 2
//     };
//     const snapshot = `./input-${Date.now()}.png`;
//     try {
//       await page.screenshot({ path: snapshot, clip });
//       const text = await extractOCRText(snapshot);
//       fs.unlinkSync(snapshot);
//       if (text.length < 3) continue;

//       const prompt = `Text near input: "${text}"\nIs this a search bar on a shopping site? Reply yes or no.`;
//       const resp = await axios.post('https://api.openai.com/v1/chat/completions', {
//         model: 'gpt-3.5-turbo',
//         messages: [{ role: 'user', content: prompt }],
//         temperature: 0
//       }, {
//         headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' }
//       });

//       if (resp.data.choices[0].message.content.trim().toLowerCase().startsWith('yes')) {
//         return el;
//       }
//     } catch {
//       if (fs.existsSync(snapshot)) fs.unlinkSync(snapshot);
//     }
//   }
//   return null;
// };

// const showRedDot = async (page, x, y) => {
//   await page.evaluate(({ x, y }) => {
//     const dot = document.createElement('div');
//     Object.assign(dot.style, {
//       position: 'absolute', left: `${x}px`, top: `${y}px`, width: '20px', height: '20px',
//       backgroundColor: 'red', borderRadius: '50%', zIndex: '99999', pointerEvents: 'none',
//       transition: 'opacity 1s ease-in-out', opacity: '1'
//     });
//     document.body.appendChild(dot);
//     setTimeout(() => dot.style.opacity = '0', 1000);
//   }, { x, y });
// };

// const findAndClickAddToCart = async (page) => {
//   const candidates = await page.$$('button, a, div, span');
//   for (let el of candidates) {
//     const box = await el.boundingBox();
//     if (!box || box.width < 50 || box.height < 20) continue;

//     const shot = `./btn.png`;
//     await el.screenshot({ path: shot });
//     const text = await extractWithTesseract(shot);
//     if (!text) continue;

//     if (/add to cart/i.test(text)) {
//       const x = box.x + box.width / 2;
//       const y = box.y + box.height / 2;
//       await page.mouse.move(x, y);
//       await delay(200);
//       await showRedDot(page, x, y);
//       console.log(`🛒 Clicking 'Add to Cart' at ${x},${y}`);
//       await page.mouse.click(x, y);
//       return true;
//     }
//   }
//   console.log('❌ "Add to Cart" button not found');
//   return false;
// };

// const detectProductFromOCR = async (page, productElements) => {
//   for (let el of productElements) {
//     const box = await el.boundingBox();
//     if (!box || box.width < 100 || box.height < 100) continue;

//     const shot = `./product.png`;
//     await el.screenshot({ path: shot });

//     const text = await extractOCRText(shot);
//     if (!text || text.length < 20) continue;
//     if (!/\$|€|£|¥/.test(text)) continue;

//     console.log(`🛍️ Detected product: ${text.split('\n')[0]}`);

//     // Try to find <img> inside the product container
//     const imgHandle = await el.$('img');
//     if (imgHandle) {
//       const imgBox = await imgHandle.boundingBox();
//       if (imgBox) {
//         const x = imgBox.x + imgBox.width / 2;
//         const y = imgBox.y + imgBox.height / 2;
//         await page.mouse.move(x, y);
//         await delay(200);
//         await showRedDot(page, x, y);
//         console.log(`🖱️ Double-clicking image at ${x},${y}`);
//         await page.mouse.click(x, y, { clickCount: 2 });
//         await delay(5000);

//         await findAndClickAddToCart(page);
//         return;
//       }
//     }

//     // Fallback to clicking the container if image not found
//     const x = box.x + box.width / 2;
//     const y = box.y + box.height / 2;
//     await page.mouse.move(x, y);
//     await delay(200);
//     await showRedDot(page, x, y);
//     console.log(`🖱️ Double-clicking container at ${x},${y}`);
//     await page.mouse.click(x, y, { clickCount: 2 });
//     await delay(5000);

//     await findAndClickAddToCart(page);
//     return;
//   }
//   console.log('❌ No product found');
// };


// const handleSearchAndAction = async ({ website, search }) => {
//   const browser = await puppeteer.launch({ headless: false, defaultViewport: null });
//   const page = await browser.newPage();
//   await page.setUserAgent(getRandomUserAgent());

//   await page.goto(website, { waitUntil: 'domcontentloaded' });
//   console.log('🌐 Website loaded, waiting UI');
//   await delay(5000);

//   const searchBox = await findSearchBoxWithOpenAI(page);
//   if (!searchBox) return console.log('❌ Search box not found');

//   await searchBox.click({ clickCount: 10 });
//   await searchBox.type(search);
//   await page.keyboard.press('Enter');
//   await page.waitForNavigation({ waitUntil: 'domcontentloaded' });
//   await delay(3000);

//   const candidates = await page.$$('div, li, article, section');
//   await detectProductFromOCR(page, candidates);
// };

// (async () => {
//   const cmd = process.argv[2] || '';
//   const parsed = await parseUserInput(cmd);
//   console.log('Parsed:', parsed);
//   await handleSearchAndAction(parsed);
// })();




// tring to fix the add to cart find button, the base code is the above one, works for amazon

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import axios from 'axios';
import FormData from 'form-data';
import * as dotenv from 'dotenv';
import fs from 'fs';
import Tesseract from 'tesseract.js';

dotenv.config();
puppeteer.use(StealthPlugin());

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const getRandomUserAgent = () => {
  const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64)...',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)...'
  ];
  return userAgents[Math.floor(Math.random() * userAgents.length)];
};
// { v- 1  }
const parseUserInput = async (userInput) => {
  const response = await axios.post('https://api.openai.com/v1/chat/completions', {
    model: 'gpt-3.5-turbo',
    messages: [
      {
        role: 'system',
        content: `You extract structured actions from natural language. Given a command like "Search headphones on Amazon", return:\n{\n  "website": "https://www.amazon.com",\n  "search": "headphones"\n}`
      },
      { role: 'user', content: userInput }
    ],
    temperature: 0.2
  }, {
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    }
  });
  return JSON.parse(response.data.choices[0].message.content.trim());
};




const extractOCRText = async (imagePath) => {
  const formData = new FormData();
  formData.append('apikey', process.env.OCR_SPACE_API_KEY);
  formData.append('language', 'eng');
  formData.append('isOverlayRequired', 'false');
  formData.append('file', fs.createReadStream(imagePath));

  const response = await axios.post('https://api.ocr.space/parse/image', formData, {
    headers: formData.getHeaders()
  });

  const parsed = response.data;
  if (parsed && parsed.ParsedResults && parsed.ParsedResults[0]) {
    return parsed.ParsedResults[0].ParsedText.trim();
  }
  return '';
};

const extractWithTesseract = async (imagePath) => {
  try {
    const { data: { text } } = await Tesseract.recognize(imagePath, 'eng');
    return text.trim();
  } catch (err) {
    console.error('Tesseract OCR error:', err);
    return '';
  }
};

const findSearchBoxWithOpenAI = async (page) => {
  const selectors = [
    'input[type="search"]',
    'input[name*=search i]',
    'input[id*=search i]',
    'input[placeholder*=search i]',
    'input[aria-label*=search i]'
  ];
  for (const sel of selectors) {
    try {
      const el = await page.$(sel);
      if (el) return el;
    } catch { }
  }

  const inputs = await page.$$('input');
  for (let el of inputs) {
    const box = await el.boundingBox();
    if (!box || box.width < 50 || box.height < 20) continue;

    const margin = 40;
    const clip = {
      x: Math.max(0, box.x - margin),
      y: Math.max(0, box.y - margin),
      width: box.width + margin * 2,
      height: box.height + margin * 2
    };
    const snapshot = `./input-${Date.now()}.png`;
    try {
      await page.screenshot({ path: snapshot, clip });
      const text = await extractOCRText(snapshot);
      fs.unlinkSync(snapshot);
      if (text.length < 3) continue;

      const prompt = `Text near input: "${text}"\nIs this a search bar on a shopping site? Reply yes or no.`;
      const resp = await axios.post('https://api.openai.com/v1/chat/completions', {
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0
      }, {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      if (resp.data.choices[0].message.content.trim().toLowerCase().startsWith('yes')) {
        return el;
      }
    } catch {
      if (fs.existsSync(snapshot)) fs.unlinkSync(snapshot);
    }
  }
  return null;
};

const showRedDot = async (page, x, y) => {
  await page.evaluate(({ x, y }) => {
    const dot = document.createElement('div');
    Object.assign(dot.style, {
      position: 'absolute', left: `${x}px`, top: `${y}px`, width: '20px', height: '20px',
      backgroundColor: 'red', borderRadius: '50%', zIndex: '99999', pointerEvents: 'none',
      transition: 'opacity 1s ease-in-out', opacity: '1'
    });
    document.body.appendChild(dot);
    setTimeout(() => dot.style.opacity = '0', 1000);
  }, { x, y });
};

const findAndClickAddToCart = async (page) => {
  const candidates = await page.$$('button, a, div, span');
  for (let i = 0; i < candidates.length; i++) {
    const el = candidates[i];
    const box = await el.boundingBox();
    if (!box || box.width < 50 || box.height < 20) continue;

    const shot = './btn.png'; // Overwrites each time
    try {
      await el.screenshot({ path: shot });
      const text = await extractWithTesseract(shot);
      if (!text) continue;

      if (/add to cart/i.test(text)) {
        const x = box.x + box.width / 2;
        const y = box.y + box.height / 2;
        await page.mouse.move(x, y);
        await delay(200);
        await showRedDot(page, x, y);
        console.log(`🛒 Clicking 'Add to Cart' at ${x},${y}`);
        await page.mouse.click(x, y);
        return true;
      }
    } catch (err) {
      console.error(`Error checking element ${i}:`, err);
    }
  }
  console.log('❌ "Add to Cart" button not found');
  return false;
};

// const detectProductFromOCR = async (page, productElements) => {
//   for (let el of productElements) {
//     const box = await el.boundingBox();
//     if (!box || box.width < 100 || box.height < 100) continue;

//     const shot = `./product.png`;
//     await el.screenshot({ path: shot });

//     const text = await extractOCRText(shot);
//     if (!text || text.length < 20) continue;
//     if (!/\$|€|£|¥/.test(text)) continue;

//     console.log(`🛍️ Detected product: ${text.split('\n')[0]}`);

//     const imgHandle = await el.$('img');
//     if (imgHandle) {
//       const imgBox = await imgHandle.boundingBox();
//       if (imgBox) {
//         const x = imgBox.x + imgBox.width / 2;
//         const y = imgBox.y + imgBox.height / 2;
//         await page.mouse.move(x, y);
//         await delay(200);
//         await showRedDot(page, x, y);
//         console.log(`🖱️ Double-clicking image at ${x},${y}`);
//         await page.mouse.click(x, y, { clickCount: 2 });
//         await delay(5000);

//         await findAndClickAddToCart(page);
//         return;
//       }
//     }

//     const x = box.x + box.width / 2;
//     const y = box.y + box.height / 2;
//     await page.mouse.move(x, y);
//     await delay(200);
//     await showRedDot(page, x, y);
//     console.log(`🖱️ Double-clicking container at ${x},${y}`);
//     await page.mouse.click(x, y, { clickCount: 2 });
//     await delay(5000);

//     await findAndClickAddToCart(page);
//     return;
//   }
//   console.log('❌ No product found');
// };

const detectProductFromOCR = async (page, productElements) => {
  for (let el of productElements) {
    const box = await el.boundingBox();
    if (!box || box.width < 100 || box.height < 100) continue;

    const shot = `./product.png`;
    await el.screenshot({ path: shot });

    const text = await extractOCRText(shot);
    if (!text || text.length < 20) continue;
    if (!/\$|€|£|¥/.test(text)) continue;

    console.log(`🛍️ Detected product: ${text.split('\n')[0]}`);

    const imgHandle = await el.$('img');
    const clickAndHandleAddToCart = async () => {
      const pagesBefore = await page.browser().pages();

      const x = box.x + box.width / 2;
      const y = box.y + box.height / 2;
      await page.mouse.move(x, y);
      await delay(200);
      await showRedDot(page, x, y);
      console.log(`🖱️ Double-clicking at ${x},${y}`);
      await page.mouse.click(x, y, { clickCount: 2 });
      await delay(5000);

      const pagesAfter = await page.browser().pages();

      let newPage = null;
      if (pagesAfter.length > pagesBefore.length) {
        newPage = pagesAfter.find(p => !pagesBefore.includes(p));
        if (newPage) {
          console.log('🆕 New tab detected');
          await newPage.bringToFront();
          await delay(3000);
          await findAndClickAddToCart(newPage);
          return;
        }
      }

      console.log('🔄 No new tab, staying on current page');
      await findAndClickAddToCart(page);
    };

    if (imgHandle) {
      const imgBox = await imgHandle.boundingBox();
      if (imgBox) {
        box.x = imgBox.x;
        box.y = imgBox.y;
        box.width = imgBox.width;
        box.height = imgBox.height;
      }
    }

    await clickAndHandleAddToCart();
    return;
  }
  console.log('❌ No product found');
};


const handleSearchAndAction = async ({ website, search }) => {
  const browser = await puppeteer.launch({ headless: false, defaultViewport: null });
  const page = await browser.newPage();
  await page.setUserAgent(getRandomUserAgent());

  await page.goto(website, { waitUntil: 'domcontentloaded' });
  console.log('🌐 Website loaded, waiting UI');
  await delay(5000);

  const searchBox = await findSearchBoxWithOpenAI(page);
  if (!searchBox) return console.log('❌ Search box not found');

  await searchBox.click({ clickCount: 10 });
  await searchBox.type(search);
  await page.keyboard.press('Enter');
  await page.waitForNavigation({ waitUntil: 'domcontentloaded' });
  await delay(3000);

  const candidates = await page.$$('div, li, article, section');
  await detectProductFromOCR(page, candidates);
};

(async () => {
  const cmd = process.argv[2] || '';
  const parsed = await parseUserInput(cmd);
  console.log('Parsed:', parsed);
  await handleSearchAndAction(parsed);
})();

// improving that when a new tab is opeend after clicking on the product just try to find the button on that tab for example webshops like alibaba
