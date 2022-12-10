import * as dotenv from 'dotenv';
dotenv.config();
import { downloadUrl } from './util.mjs';


export async function saveWeixinArticle(article, path) {
  // Todo:
  // implement video link replacement
  const { url, accountId, titleChecksum } = article;

  const savedArticleLocation = `${path}/${accountId}/${titleChecksum}.html`;
  if (fs.pathExistsSync(savedArticleLocation)) {
    console.log(`${savedArticleLocation} already exists. Skip saving article.`);
    return false;
  }

  let isSuccess = false;
  try {
    let pageHtml = await downloadUrl(url, 3);
  
    pageHtml = await replaceCSSLinksWithLocalFiles(
      pageHtml,
      `${path}/styles`,
      '../styles');
    
    pageHtml = await replaceImgLinksWithLocalFiles(
      pageHtml,
      `${path}/${accountId}/${titleChecksum}_files`,
      `./${titleChecksum}_files`
      );
    
    pageHtml = sanitizeArticlePage(pageHtml);
  
    const articlePath = `${accountId}/${Date.now()}-${titleChecksum}.html`;
    fs.outputFileSync(`${path}/${articlePath}`, pageHtml);
    isSuccess = true;

    const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    const TELEGRAM_BOT_CHATID = process.env.TELEGRAM_BOT_CHATID;
    const TELEGRAM_MSG_ARTICLE_LOC = process.env.TELEGRAM_MSG_ARTICLE_LOC;
    console.log(TELEGRAM_BOT_TOKEN, TELEGRAM_BOT_CHATID, TELEGRAM_MSG_ARTICLE_LOC);
    if (TELEGRAM_BOT_TOKEN && TELEGRAM_BOT_TOKEN.length > 0 &&
      TELEGRAM_BOT_CHATID && TELEGRAM_BOT_CHATID.length > 0 &&
      TELEGRAM_MSG_ARTICLE_LOC && TELEGRAM_MSG_ARTICLE_LOC.length > 0) {
      const apiEndpoint = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
      const reqData = `chat_id=${TELEGRAM_BOT_CHATID}&text=${TELEGRAM_MSG_ARTICLE_LOC}/${articlePath}`;
      const response = await $`curl -X POST ${apiEndpoint} -d ${reqData}`;
      if (response._stdout.match(/"ok":true/)) {
        console.log(`Telegram message sent by bot at ${new Date()}.`);
      };
    }
  } catch(error) {
    isSuccess = false;
    console.log(error);
  }

  return isSuccess;
}


async function replaceCSSLinksWithLocalFiles(pageHtml, saveLocation, linkPath) {
  let updatedPageHtml = pageHtml;

  const cssLinks = pageHtml.match(/<link.*?rel="stylesheet".*?>/g);
  for (let i=0; i<cssLinks.length; i++) {
    const link = cssLinks[i];
    const url = link.replace(/^.*?href="/, 'https:')
      .replace(/".*$/, '')
      .replace(/https:https:/, 'https:');

    const fileName = url.substring(url.lastIndexOf('/')+1);
    if (!fs.pathExistsSync(`${saveLocation}/${fileName}`)) {
      await $`mkdir -p ${saveLocation}`;
      const cssFileContent = await downloadUrl(url, 3);
      try {
        fs.outputFileSync(`${saveLocation}/${fileName}`, cssFileContent);
      } catch (error) {
        console.log(error);
      }
    };

    updatedPageHtml = updatedPageHtml
      .replace(link, `<link href="${linkPath}/${fileName}" rel="stylesheet">`);
  }
  
  return updatedPageHtml;
}


async function replaceImgLinksWithLocalFiles(pageHtml, saveLocation, linkPath) {
  let updatedPageHtml = pageHtml
    .replace(/<span class="js_img_placeholder wx_widget_placeholder".*?<\/span><\/span><\/span>/g, '');

  const imgLinks = pageHtml.match(/<img class="rich_pages.*?>/g);
  for (let i=0; i<imgLinks.length; i++) {
    const link = imgLinks[i];
    const url = link.replace(/^.*?data-src="/, '').replace(/".*>/, '');
    if (!url.match(/wx_fmt/)) {
      continue;
    }
    const fileFormat = url.match(/^.*?wx_fmt=([a-z]+)/)[1];
    const urlWithoutFormat = url.replace(url.substring(url.lastIndexOf('/')), '');
    const fileName = urlWithoutFormat
      .substring(urlWithoutFormat.lastIndexOf('/')+1) + '.' + fileFormat;

    try {
      await $`mkdir -p ${saveLocation} && 
      cd ${saveLocation} && 
      rm -f ${fileName} && 
      curl -sS -o ${fileName} ${url} -q`;
    } catch (error) {
      console.log(error);
    }

    updatedPageHtml = updatedPageHtml.replace(link, `<img src="${linkPath}/${fileName}">`);
  };

  return updatedPageHtml;
}


function sanitizeArticlePage(pageHtml) {
  let result = pageHtml
    .replace(/rich_media_area_extra"/g, `rich_media_area_extra" style="display:none"`);

  return result;
}