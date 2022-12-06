import * as dotenv from 'dotenv';
dotenv.config();
import playwright from 'playwright';
import 'zx/globals';
import { fetchWithProxy } from './src/util.mjs';
import { extractTitle, extractTitleChecksum, extractWeixinUrl } from './src/sogou-result.mjs';

const PUB_ACC_LOC = './pub-accounts.json';
const CSS_LOC = './data/styles';
const REL_CSS_LOC = '../styles';
const TITLE_MD5 = 'd9328d3f7071730e6db055f1fd5edb31';

const run = async () => {

  const accounts = fs.readJsonSync(PUB_ACC_LOC);
  for (let i=0; i<accounts.length; i++) {
    const sogouQueryUrl = process.env.SOGOU_WX_QUERY_BASE + accounts[i].wx_id;
    const pageHtml = await fetchWithProxy(sogouQueryUrl);
    if (pageHtml.length === 0) {
      continue;
    }
    
    const articleLinks = pageHtml.match(/<a.*?account_article_.*?<\/a>/g);
    if (!articleLinks || 
      !Array.isArray(articleLinks) ||
      articleLinks.length <= accounts[i].article_index ||
      !articleLinks[accounts[i].article_index]) {
      continue;
    }

    const anchorElement = articleLinks[accounts[i].article_index];
    console.log('✅', extractTitle(anchorElement), '㊙️', extractTitleChecksum(anchorElement));

    console.log(await extractWeixinUrl(anchorElement));
    

  }
  await $`exit 1`

  const browser = await playwright.chromium.launch({
  // const browser = await playwright.firefox.launch({
    headless: false // Show the browser.
  });
  const page = await browser.newPage();
 

 
  await page.waitForTimeout(32100);
  await browser.close();
  $`exit 1`  



  
  await page.goto('https://mp.weixin.qq.com/s?src=11&timestamp=1670204845&ver=4207&signature=AT-cxLFs4zB2zK*sXCeCaJw6HW8NQbskuaLOcefgCIm4RtF7xmHujXK8w9iBPb8cmNERNBRdsn*MKWzIAASSAOjf1zRsQ2EwDKkdV9NfN*SlTwy7j5r9PoGHVQG1wG58&new=1');
  
  let pageHtml = await page.content();
  pageHtml = await replaceCSSLinksWithLocalFiles(pageHtml, CSS_LOC, REL_CSS_LOC);
  pageHtml = await replaceImgLinksWithLocalFiles(pageHtml, `./data/bitsea/${TITLE_MD5}_files`, `./${TITLE_MD5}_files`);
  
  await fs.outputFileSync(`./data/bitsea/${TITLE_MD5}.html`, pageHtml);
  
  await page.waitForTimeout(1000);
  await browser.close();
};


async function replaceCSSLinksWithLocalFiles (pageHtml, savePath, linkPath) {
  let updatedPageHtml = pageHtml;

  const cssLinks = pageHtml.match(/<link.*?rel="stylesheet".*?>/g);
  for (let i=0; i<cssLinks.length; i++) {
    const link = cssLinks[i];
    const url = link.replace(/^.*?href="/, 'https:')
      .replace(/".*$/, '')
      .replace(/https:https:/, 'https:');
    // console.log(`${link}\n${url}`);

    const fileName = url.substring(url.lastIndexOf('/')+1);
    if (!fs.pathExistsSync(`${savePath}/${fileName}`)) {
      await $`mkdir -p ${savePath} && cd ${savePath} && wget ${url} -q`;
    }

    updatedPageHtml = updatedPageHtml
      .replace(link, `<link href="${linkPath}/${fileName}" rel="stylesheet">`);
  }
  
  return updatedPageHtml;
};


async function replaceImgLinksWithLocalFiles (pageHtml, savePath, linkPath) {
  let updatedPageHtml = pageHtml
    .replace(/<span class="js_img_placeholder wx_widget_placeholder".*?<\/span><\/span><\/span>/g, '');;

  const imgLinks = pageHtml.match(/<img class="rich_pages.*?>/g);
  for (let i=0; i<imgLinks.length; i++) {
    const link = imgLinks[i];
    const url = link.replace(/^.*?data-src="/, '').replace(/".*>/, '');
    const fileFormat = url.substring(url.lastIndexOf('wx_fmt=')+7);
    const urlWithoutFormat = url.replace(url.substring(url.lastIndexOf('/')), '');
    const fileName = urlWithoutFormat
      .substring(urlWithoutFormat.lastIndexOf('/')+1) + '.' + fileFormat;
    await $`mkdir -p ${savePath} && cd ${savePath} && rm -f ${fileName} && wget -O ${fileName} ${url} -q`;

    updatedPageHtml = updatedPageHtml.replace(link, `<img src="${linkPath}/${fileName}">`);
  };
  return updatedPageHtml;
};


await run();